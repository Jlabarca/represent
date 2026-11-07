"""Durable verification gates: a detached run, an atomic verdict, nothing to poll.

A long check is started with `orkest.py gate run` and finishes into `verdict.json` even when the
session that started it dies or compacts. The agent waits with one blocking `gate wait` and reports the
verdict. Stdlib only; verdict and run files are written as bytes through an atomic replace.
"""
import datetime
import hashlib
import json
import os
import re
import subprocess
import sys
import time
import uuid
from pathlib import Path

BIN = Path(__file__).resolve().parent
HEARTBEAT_S = 5
LOST_AFTER_S = 15
DEFAULT_DEADLINE_S = 1800
DEFAULT_WAIT_S = 240
NAME = re.compile(r'[a-z0-9][a-z0-9-]{0,40}')
OUTCOMES = ('pass', 'fail', 'not-qualifying', 'timeout', 'idle-timeout', 'killed', 'supervisor-lost', 'spawn-error')


def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def write_atomic(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + '.' + uuid.uuid4().hex[:6] + '.tmp')
    temp.write_bytes(data)
    os.replace(str(temp), str(path))


def write_json(path, value):
    write_atomic(path, (json.dumps(value, indent=2, sort_keys=True) + '\n').encode('utf-8'))


def load(path):
    try:
        return json.loads(Path(path).read_bytes().decode('utf-8'))
    except (OSError, ValueError):
        return None


def gates_root(repo, runtime):
    return runtime.metadata(repo) / 'gates'


def proc_start(pid):
    """An opaque creation stamp of a process, or None when unknown: the same pid with another stamp is another process."""
    if not isinstance(pid, int) or pid <= 0:
        return None
    if os.name == 'nt':
        try:
            import ctypes
            from ctypes import wintypes
            handle = ctypes.windll.kernel32.OpenProcess(0x1000, False, pid)
            if not handle:
                return None
            created, exited, kernel, user = (wintypes.FILETIME() for _ in range(4))
            ok = ctypes.windll.kernel32.GetProcessTimes(handle, ctypes.byref(created), ctypes.byref(exited),
                                                        ctypes.byref(kernel), ctypes.byref(user))
            ctypes.windll.kernel32.CloseHandle(handle)
            return (created.dwHighDateTime << 32) | created.dwLowDateTime if ok else None
        except (OSError, AttributeError):
            return None
    try:
        return int(Path('/proc/%d/stat' % pid).read_text().rsplit(')', 1)[1].split()[19])
    except (OSError, ValueError, IndexError):
        return None


def pid_alive(pid, start=None):
    if not isinstance(pid, int) or pid <= 0:
        return False
    if start is not None and proc_start(pid) not in (None, start):
        return False  # the pid now belongs to a different process
    if os.name == 'nt':
        # os.kill(pid, 0) would terminate the process on Windows; ask the OS instead.
        import ctypes
        handle = ctypes.windll.kernel32.OpenProcess(0x1000, False, pid)
        if not handle:
            return False
        code = ctypes.c_ulong()
        ok = ctypes.windll.kernel32.GetExitCodeProcess(handle, ctypes.byref(code))
        ctypes.windll.kernel32.CloseHandle(handle)
        return bool(ok) and code.value == 259
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def kill_tree(pid, start=None):
    if not isinstance(pid, int) or pid <= 0:
        return
    if start is not None and proc_start(pid) not in (None, start):
        return  # never signal a recycled pid
    if os.name == 'nt':
        subprocess.run(['taskkill', '/T', '/F', '/PID', str(pid)], capture_output=True)
        return
    import signal
    for target in (lambda: os.killpg(pid, signal.SIGKILL), lambda: os.kill(pid, signal.SIGKILL)):
        try:
            target()
            return
        except (ProcessLookupError, PermissionError, OSError):
            continue


def diff_hash(repo):
    """Hash of tracked changes against HEAD: moves when source is edited during a run."""
    result = subprocess.run(['git', '-C', str(repo), 'diff', 'HEAD', '--no-ext-diff', '--binary'], capture_output=True)
    return hashlib.sha256(result.stdout).hexdigest() if result.returncode == 0 else ''


def head_of(repo, attempts=5):
    """HEAD, or '' when Git cannot answer. A loaded machine can fail one spawn; never read that as a move."""
    for attempt in range(attempts):
        try:
            result = subprocess.run(['git', '-C', str(repo), 'rev-parse', 'HEAD'], capture_output=True, text=True,
                                    timeout=60)
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()
        except (OSError, subprocess.TimeoutExpired):
            pass
        time.sleep(0.2 * (attempt + 1))
    return ''


def skips_of(counts):
    """Skips charged to the budget: native skips, not expected failures (an xfail is a known state)."""
    return counts.get('native_skipped', counts.get('skipped', 0))


def classify(code, counts, strict, skip_budget, deadline_hit=False, idle_hit=False, killed=False,
             head_moved=False, tree_moved=False, partial=False, head_unknown=False):
    """(outcome, qualifying, reasons). Only `pass` qualifies; a skip beyond the budget never does."""
    if killed:
        return 'killed', False, ['cancelled']
    if deadline_hit:
        return 'timeout', False, ['wall-deadline']
    if idle_hit:
        return 'idle-timeout', False, ['no-output-within-idle-limit']
    if code != 0 or counts.get('failed', 0) or counts.get('errors', 0):
        reasons = []
        if code != 0:
            reasons.append('exit-code-%s' % code)
        return 'fail', False, reasons
    reasons = []
    if strict:
        if counts.get('passed', 0) <= 0:
            reasons.append('no-passing-tests')
        if skips_of(counts) > skip_budget:
            reasons.append('skipped-%d-over-budget-%d' % (skips_of(counts), skip_budget))
        if partial:
            reasons.append('partial-run-reused-or-subset-results')
    if head_unknown:
        reasons.append('head-unreadable-at-end')  # unproven, not moved: rerun the gate
    elif head_moved:
        reasons.append('head-moved')
    if tree_moved:
        reasons.append('source-changed-during-run')
    if reasons:
        return 'not-qualifying', False, reasons
    return 'pass', True, []


def read_log(rundir, limit=8 * 1024 * 1024):
    path = rundir / 'output.log'
    try:
        size = path.stat().st_size
        with path.open('rb') as handle:
            if size > limit:
                handle.seek(size - limit)
            return handle.read().decode('utf-8', errors='replace')
    except OSError:
        return ''


def log_digest(rundir):
    digest = hashlib.sha256()
    try:
        with (rundir / 'output.log').open('rb') as handle:
            for chunk in iter(lambda: handle.read(1 << 20), b''):
                digest.update(chunk)
    except OSError:
        pass
    return digest.hexdigest()


def write_verdict(rundir, verdict):
    """Write verdict.json exactly once. False when another writer got there first."""
    target = rundir / 'verdict.json'
    if target.exists():
        return False
    lock = rundir / 'verdict.json.lock'
    try:
        handle = os.open(str(lock), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        try:
            if time.time() - lock.stat().st_mtime > 10 and not target.exists():
                lock.unlink()  # a writer died between taking the lock and writing
                return write_verdict(rundir, verdict)
        except OSError:
            pass
        return False
    try:
        os.close(handle)
        if target.exists():
            return False
        write_json(target, verdict)
        return True
    finally:
        try:
            lock.unlink()
        except OSError:
            pass


def release_active(root, meta):
    active = root / (meta['name'] + '.active')
    held = load(active)
    if held and held.get('id') == meta['id']:
        try:
            active.unlink()
        except OSError:
            pass


def build_verdict(repo, rundir, meta, runtime, code, outcome_hint=None, started_at=None):
    text = read_log(rundir)
    counts = runtime.test_counts(text)
    head_end = head_of(repo)
    flags = outcome_hint or {}
    outcome, qualifying, reasons = classify(
        code, counts, meta['strict'], meta['skip_budget'], deadline_hit=flags.get('deadline', False),
        idle_hit=flags.get('idle', False), killed=flags.get('killed', False),
        partial='TIERS PARTIAL' in text, head_moved=bool(meta['head_at_start']) and head_end != meta['head_at_start'],
        head_unknown=bool(meta['head_at_start']) and not head_end,
        tree_moved=(phase_fingerprint(repo, meta.get('phase'), runtime) != meta['phase_fingerprint']
                    if meta.get('phase_fingerprint') else
                    bool(meta.get('source_fingerprint')) and diff_hash(repo) != meta['source_fingerprint']))
    if flags.get('lost'):
        outcome, qualifying, reasons = 'supervisor-lost', False, ['supervisor-died-before-verdict']
    if flags.get('spawn_error'):
        outcome, qualifying, reasons = 'spawn-error', False, [flags['spawn_error']]
    started = datetime.datetime.fromisoformat(meta['started'])
    finished = datetime.datetime.now(datetime.timezone.utc)
    duration = round((finished - started).total_seconds(), 1)
    budget = meta.get('budget_s')
    return dict(
        schema=1, id=meta['id'], name=meta['name'], state='final', outcome=outcome, qualifying=qualifying,
        exit_code=code, counts=counts, strict=meta['strict'], skip_budget=meta['skip_budget'], reasons=reasons,
        started=meta['started'], finished=finished.isoformat(), duration_s=duration, budget_s=budget,
        over_budget=bool(budget) and duration > budget, tier=meta.get('tier'), phase=meta.get('phase'),
        box=meta.get('box'), project=meta.get('project'), head_at_start=meta['head_at_start'], head_at_end=head_end,
        source_fingerprint=meta.get('source_fingerprint'), phase_fingerprint=meta.get('phase_fingerprint'),
        argv=meta['argv'], log='output.log',
        log_sha256=log_digest(rundir), log_tail='\n'.join(text.splitlines()[-40:]), host=meta.get('host'),
        detached=meta.get('detached'), supersedes=meta.get('supersedes'), superseded_by=None)


def reconcile(repo, rundir, runtime):
    """The verdict of a run, synthesizing `supervisor-lost` when its supervisor died without writing one."""
    verdict = load(rundir / 'verdict.json')
    if verdict:
        return verdict
    meta = load(rundir / 'run.json')
    if not meta:
        return None
    try:
        age = time.time() - (rundir / 'heartbeat').stat().st_mtime
    except OSError:
        age = time.time() - datetime.datetime.fromisoformat(meta['started']).timestamp()
    alive = pid_alive(meta.get('supervisor_pid'), meta.get('supervisor_start'))
    if (not alive and age > LOST_AFTER_S) or age > meta.get('deadline_s', DEFAULT_DEADLINE_S) + 300:
        kill_tree(meta.get('child_pid'), meta.get('child_start'))
        write_verdict(rundir, build_verdict(repo, rundir, meta, runtime, -1, dict(lost=True)))
        release_active(rundir.parent, meta)
        return load(rundir / 'verdict.json')
    return None


def supervise(rundir, runtime):
    """Run the child, keep the heartbeat, enforce deadlines and always leave a verdict behind."""
    meta = load(rundir / 'run.json')
    repo = Path(meta['cwd'])
    log = (rundir / 'output.log').open('wb')
    kwargs = {}
    if os.name == 'nt':
        kwargs['creationflags'] = 0x00000200  # CREATE_NEW_PROCESS_GROUP
    else:
        kwargs['start_new_session'] = True
    flags = {}
    code = -1
    try:
        child = subprocess.Popen(meta['argv'], cwd=str(repo), stdin=subprocess.DEVNULL, stdout=log,
                                 stderr=subprocess.STDOUT, **kwargs)
    except OSError as error:
        log.close()
        write_verdict(rundir, build_verdict(repo, rundir, meta, runtime, 127, dict(spawn_error=str(error)[:200])))
        release_active(rundir.parent, meta)
        return 127
    started = time.time()
    last_beat = 0
    last_size, last_change = -1, time.time()
    try:
        meta = dict(meta, child_pid=child.pid, child_start=proc_start(child.pid))
        write_json(rundir / 'run.json', meta)
        while True:
            code = child.poll()
            if code is not None:
                break
            tick = time.time()
            if tick - last_beat >= HEARTBEAT_S:
                (rundir / 'heartbeat').write_bytes(str(int(tick)).encode('ascii'))
                last_beat = tick
            if (rundir / 'cancel').exists():
                flags['killed'] = True
            elif meta['deadline_s'] and tick - started > meta['deadline_s']:
                flags['deadline'] = True
            elif meta['idle_s']:
                try:
                    size = (rundir / 'output.log').stat().st_size
                except OSError:
                    size = 0
                if size != last_size:
                    last_size, last_change = size, tick
                elif tick - last_change > meta['idle_s']:
                    flags['idle'] = True
            if flags:
                kill_tree(child.pid)
                code = child.wait()
                break
            time.sleep(0.2)
    finally:
        if child.poll() is None:  # an error in the loop must not leave the check running behind a verdict
            kill_tree(child.pid, meta.get('child_start'))
            try:
                code = child.wait(timeout=10)
            except subprocess.TimeoutExpired:
                code = -1
        log.close()
        try:
            verdict = build_verdict(repo, rundir, meta, runtime, code if code is not None else -1, flags)
        except Exception as error:  # a verdict is always written, even if building the full one fails
            verdict = dict(schema=1, id=meta['id'], name=meta['name'], state='final', outcome='fail', qualifying=False,
                           exit_code=code if code is not None else -1, counts={}, reasons=['verdict-build-failed: %s' % error],
                           started=meta['started'], finished=now(), argv=meta['argv'], log='output.log',
                           head_at_start=meta.get('head_at_start'), head_at_end='', phase=meta.get('phase'),
                           project=meta.get('project'), strict=meta.get('strict'), skip_budget=meta.get('skip_budget'))
        write_verdict(rundir, verdict)
        release_active(rundir.parent, meta)
    return 0


def resolve(root, ident):
    """A gate directory from an exact id, a unique id prefix or a name (its latest run)."""
    if not ident:
        raise ValueError('Name a gate id or name')
    if not root.is_dir():
        raise ValueError('No gate runs recorded')
    names = sorted(p.name for p in root.iterdir() if p.is_dir())
    if ident in names:
        return root / ident
    prefixed = [n for n in names if n.startswith(ident)]
    if len(prefixed) == 1:
        return root / prefixed[0]
    named = [n for n in names if (load(root / n / 'run.json') or {}).get('name') == ident]
    if named:
        return root / named[-1]
    raise ValueError('No unique gate matches ' + ident)


def row(repo, rundir, runtime):
    meta = load(rundir / 'run.json') or {}
    verdict = reconcile(repo, rundir, runtime)
    command = 'python -X utf8 %s --repo %s gate wait %s' % (Path(BIN / 'orkest.py').as_posix(),
                                                              Path(repo).as_posix(), rundir.name)
    entry = dict(id=rundir.name, name=meta.get('name'), state='final' if verdict else 'running',
                 started=meta.get('started'), deadline_s=meta.get('deadline_s'), phase=meta.get('phase'),
                 tier=meta.get('tier'), log=str(rundir / 'output.log'), acknowledged=(rundir / 'ack').exists())
    if verdict:
        entry.update(outcome=verdict['outcome'], qualifying=verdict['qualifying'], counts=verdict['counts'],
                     reasons=verdict['reasons'], duration_s=verdict['duration_s'], verdict=str(rundir / 'verdict.json'))
    else:
        entry.update(next_command=command + ' # ')
    return entry


def listing(repo, runtime, live_only=False):
    root = gates_root(repo, runtime)
    if not root.is_dir():
        return []
    rows = [row(repo, root / p.name, runtime) for p in sorted(root.iterdir()) if p.is_dir()]
    if live_only:
        rows = [r for r in rows if r['state'] == 'running' or not r['acknowledged']]
    return rows


def live_summary(repo, runtime):
    """Compact facts for startup, `next` and the compaction handoff: live gates and unacknowledged verdicts."""
    try:
        return [dict((k, r[k]) for k in ('id', 'name', 'state', 'phase', 'outcome', 'next_command', 'verdict') if k in r)
                for r in listing(repo, runtime, live_only=True)]
    except (OSError, ValueError):
        return []


def start_supervisor(rundir, repo, meta):
    command = [sys.executable, '-X', 'utf8', str(Path(__file__).resolve()), 'supervise', str(rundir)]
    kwargs = dict(cwd=str(repo), stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, close_fds=True)
    if os.name == 'nt':
        try:
            return subprocess.Popen(command, creationflags=0x00000008 | 0x00000200 | 0x01000000, **kwargs), True
        except OSError:
            return subprocess.Popen(command, creationflags=0x00000008 | 0x00000200, **kwargs), False
    return subprocess.Popen(command, start_new_session=True, **kwargs), True


def run(repo, options, runtime):
    argv = list(options.get('gate_command') or [])
    if not argv or any(not isinstance(a, str) or not a for a in argv):
        raise ValueError('gate run needs a command after --')
    name = options.get('name') or re.sub(r'[^a-z0-9-]+', '-', Path(argv[0]).stem.lower()).strip('-')[:40] or 'gate'
    if not NAME.fullmatch(name):
        raise ValueError('Gate name must be lowercase letters, digits and dashes')
    if options.get('phase') and not options.get('dry'):
        requires = phase_requires(repo, options['phase'], runtime)
        if requires:
            import orkest_prep
            orkest_prep.refuse_unless_ready(repo, requires)
    root = gates_root(repo, runtime)
    root.mkdir(parents=True, exist_ok=True)
    active = root / (name + '.active')
    supersedes = None
    held = load(active)
    if not held and active.exists():
        try:
            if time.time() - active.stat().st_mtime > 10:
                active.unlink()  # unreadable and old: a starter died before recording its id
        except OSError:
            pass
    if held:
        prior = root / held.get('id', '')
        if prior.is_dir() and not reconcile(repo, prior, runtime):
            if not options.get('replace'):
                meta = load(prior / 'run.json') or {}
                raise ValueError('A gate run is live: %s (pid %s, started %s). Wait for it with `gate wait %s`, or '
                                 'cancel it with `gate cancel %s`, or pass --replace.' % (
                                     held['id'], meta.get('supervisor_pid'), meta.get('started'), held['id'], held['id']))
            supersede(repo, prior, runtime)
            supersedes = held['id']
        else:
            try:
                active.unlink()
            except OSError:
                pass
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    gate_id = '%s-%s-%s' % (stamp, name, uuid.uuid4().hex[:8])
    try:
        handle = os.open(str(active), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.write(handle, json.dumps(dict(id=gate_id)).encode('utf-8'))
        os.close(handle)
    except FileExistsError:
        raise ValueError('Another gate run for ' + name + ' started at the same moment; use `gate list --live`.')
    rundir = root / gate_id
    rundir.mkdir(parents=True)
    meta = dict(
        schema=1, id=gate_id, name=name, argv=argv, cwd=str(repo), head_at_start=head_of(repo),
        source_fingerprint=diff_hash(repo), phase_fingerprint=phase_fingerprint(repo, options.get('phase'), runtime), session=options.get('session'), phase=options.get('phase'),
        box=options.get('box'), project=options.get('project'), tier=options.get('tier'),
        strict=bool(options.get('strict')), skip_budget=int(options.get('skip_budget') or 0),
        deadline_s=int(options.get('deadline_s') or DEFAULT_DEADLINE_S), idle_s=int(options.get('idle_s') or 0),
        budget_s=options.get('budget_s'), started=now(), supersedes=supersedes,
        host=os.environ.get('COMPUTERNAME') or os.environ.get('HOSTNAME') or '', supervisor_pid=None, child_pid=None)
    if options.get('dry'):
        release_active(root, meta)
        rundir.rmdir()
        return dict(action='gate-dry', preview=meta)
    write_json(rundir / 'run.json', meta)
    (rundir / 'heartbeat').write_bytes(str(int(time.time())).encode('ascii'))
    process, detached = start_supervisor(rundir, repo, meta)
    meta = dict(meta, supervisor_pid=process.pid, supervisor_start=proc_start(process.pid), detached=detached)
    write_json(rundir / 'run.json', meta)
    return wait(repo, gate_id, options.get('max_wait', DEFAULT_WAIT_S), runtime)


def phase_requires(repo, phase, runtime):
    """The phase's `> requires:` block from the active tracker, or {} when there is none."""
    try:
        import orkest_prep
        state = runtime.active_state(repo)
        path = state.get('target')
        if not path:
            return {}
        text = (Path(repo) / path).read_text(encoding='utf-8')
        return orkest_prep.parse_requires(runtime.phase_section(text, str(phase)) or '')
    except (OSError, ValueError):
        return {}


def phase_fingerprint(repo, phase, runtime):
    """Content hashes of the active run's owned phase files, so a verdict can prove it ran on that source."""
    if not phase:
        return None
    try:
        record = (runtime.active_state(repo).get('phases') or {}).get(str(phase))
        return runtime.source_fingerprint(repo, record['paths']) if record else None
    except (ValueError, OSError, KeyError):
        return None


def supersede(repo, rundir, runtime):
    cancel(repo, rundir.name, runtime, wait_s=10)


def wait(repo, ident, max_s, runtime):
    root = gates_root(repo, runtime)
    rundir = resolve(root, ident)
    deadline = time.time() + max(0, float(max_s))
    while True:
        verdict = reconcile(repo, rundir, runtime)
        if verdict:
            return dict(action='gate-verdict', **gate_view(rundir, verdict))
        if time.time() >= deadline:
            entry = row(repo, rundir, runtime)
            return dict(action='gate-running', **entry)
        time.sleep(0.25)


def gate_view(rundir, verdict):
    keys = ('id', 'name', 'outcome', 'qualifying', 'exit_code', 'counts', 'reasons', 'duration_s', 'budget_s',
            'over_budget', 'tier', 'head_at_start', 'head_at_end', 'strict', 'skip_budget', 'log_tail', 'detached')
    view = {k: verdict.get(k) for k in keys}
    view['verdict'] = str(rundir / 'verdict.json')
    view['log'] = str(rundir / 'output.log')
    return view


def cancel(repo, ident, runtime, wait_s=10):
    root = gates_root(repo, runtime)
    rundir = resolve(root, ident)
    existing = load(rundir / 'verdict.json')
    if existing:
        return dict(action='gate-verdict', **gate_view(rundir, existing))
    write_atomic(rundir / 'cancel', now().encode('ascii'))
    deadline = time.time() + wait_s
    while time.time() < deadline:
        verdict = reconcile(repo, rundir, runtime)
        if verdict:
            return dict(action='gate-verdict', **gate_view(rundir, verdict))
        time.sleep(0.25)
    meta = load(rundir / 'run.json') or {}
    kill_tree(meta.get('child_pid'), meta.get('child_start'))
    kill_tree(meta.get('supervisor_pid'), meta.get('supervisor_start'))
    write_verdict(rundir, build_verdict(repo, rundir, meta, runtime, -1, dict(killed=True)))
    release_active(root, meta)
    verdict = None
    for _ in range(40):  # a slower writer may still be finishing its own verdict
        verdict = load(rundir / 'verdict.json')
        if verdict:
            break
        time.sleep(0.25)
    if not verdict:
        raise ValueError('Gate %s was cancelled but no verdict could be written; check %s' % (rundir.name, rundir))
    return dict(action='gate-verdict', **gate_view(rundir, verdict))


def acknowledge(repo, ident, runtime):
    rundir = resolve(gates_root(repo, runtime), ident)
    if not reconcile(repo, rundir, runtime):
        raise ValueError('Gate is still running; wait for its verdict before acknowledging it')
    write_atomic(rundir / 'ack', now().encode('ascii'))
    return dict(action='gate-acknowledged', id=rundir.name)


def ingest(repo, ident, runtime):
    """A qualifying verdict as (command, exit code, output, extra) for an ordinary verify receipt."""
    root = gates_root(repo, runtime)
    rundir = resolve(root, ident)
    verdict = reconcile(repo, rundir, runtime)
    if not verdict:
        raise ValueError('Gate is still running; `gate wait` first')
    return verdict, read_log(rundir)


def handoff_markdown(repo, runtime):
    """Markdown for the compaction handoff: the run lock, live gates and verdicts nobody has reported yet."""
    lines = []
    try:
        fields = runtime.lock_fields(repo)
    except (ValueError, OSError):
        fields = {}
    if fields:
        lines.append('- Run lock: session %s, target %s, host %s, heartbeat %s' % (
            fields.get('session', '?'), fields.get('target', '?'), fields.get('host', '?'), fields.get('heartbeat', '?')))
    base = 'python -X utf8 %s --repo %s' % (Path(BIN / 'orkest.py').as_posix(), Path(repo).as_posix())
    for entry in listing(repo, runtime, live_only=True):
        if entry['state'] == 'running':
            lines.append('- gate %s (%s) RUNNING since %s, deadline %ss, log %s' % (
                entry['id'], entry['name'], entry['started'], entry['deadline_s'], entry['log']))
            lines.append('  - wait with: `%s gate wait %s` #' % (base, entry['id']))
        else:
            lines.append('- gate %s (%s) finished %s (qualifying=%s), verdict %s - not yet acknowledged: report it, then '
                         '`%s gate ack %s` #' % (entry['id'], entry['name'], entry['outcome'], entry['qualifying'],
                                                 entry['verdict'], base, entry['id']))
    if not lines:
        return ''
    lines.append('- Resume rules: never relaunch a command that a gate above is running; wait for its verdict. Report any '
                 'unacknowledged verdict before anything else.')
    return '## Live gates and run lock\n' + '\n'.join(lines) + '\n'


def command(repo, options, runtime):
    query = list(options.get('query') or [])
    sub = query[0] if query else ''
    rest = query[1:]
    if sub == 'run':
        return run(repo, dict(options, gate_command=options.get('gate_command') or rest), runtime)
    if sub in ('status', 'list'):
        live = bool(options.get('live'))
        if sub == 'status' and rest:
            return dict(action='gate-status', gates=[row(repo, resolve(gates_root(repo, runtime), rest[0]), runtime)])
        return dict(action='gate-list', gates=listing(repo, runtime, live_only=live))
    if sub == 'wait':
        if not rest:
            raise ValueError('gate wait needs an id or name')
        return wait(repo, rest[0], options.get('max_s') if options.get('max_s') is not None else DEFAULT_WAIT_S, runtime)
    if sub == 'cancel':
        if not rest:
            raise ValueError('gate cancel needs an id or name')
        return cancel(repo, rest[0], runtime)
    if sub == 'ack':
        if not rest:
            raise ValueError('gate ack needs an id or name')
        return acknowledge(repo, rest[0], runtime)
    raise ValueError('gate subcommands: run, status, wait, list, cancel, ack')


if __name__ == '__main__':
    if len(sys.argv) == 3 and sys.argv[1] == 'supervise':
        sys.path.insert(0, str(BIN))
        import orkest as _runtime
        raise SystemExit(supervise(Path(sys.argv[2]), _runtime))
    if len(sys.argv) == 3 and sys.argv[1] == 'handoff':  # best effort for the compaction hook; always exits 0
        try:
            sys.path.insert(0, str(BIN))
            import orkest as _runtime
            sys.stdout.write(handoff_markdown(_runtime.migration.repository(sys.argv[2]), _runtime))
        except Exception:
            pass
        raise SystemExit(0)
    print('orkest_gate.py is started through `orkest.py gate`', file=sys.stderr)
    raise SystemExit(2)
