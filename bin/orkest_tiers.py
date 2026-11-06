"""Ordered verification tiers: cheap guards first, every failure of a tier in one pass, no wasted reruns.

A gate file declares ordered tiers and per-project commands. `tiers run` executes them (usually inside
`orkest.py gate run`, which makes the whole thing durable) and prints a unittest-shaped aggregate so the
ordinary test-count reader and the gate verdict classify it. Reuse and rerun-only-failed are opt-in.
"""
import concurrent.futures
import fnmatch
import hashlib
import json
import os
import re
import subprocess
import sys
import threading
import time
import uuid
from pathlib import Path


def load_plan(path):
    data = json.loads(Path(path).read_bytes().decode('utf-8-sig'))
    tiers, projects = data.get('tiers'), data.get('projects')
    if not isinstance(tiers, list) or not tiers or not isinstance(projects, dict) or not projects:
        raise ValueError('Gate file needs "tiers" (ordered list) and "projects" (name -> definition)')
    seen = set()
    for tier in tiers:
        if not isinstance(tier, dict) or not re.fullmatch(r'[a-z0-9][a-z0-9-]*', str(tier.get('name', ''))):
            raise ValueError('Each tier needs a lowercase name')
        if not tier.get('projects') or any(p not in projects for p in tier['projects']):
            raise ValueError('Tier %s names a project that is not defined' % tier.get('name'))
        if tier['name'] in seen:
            raise ValueError('Duplicate tier ' + tier['name'])
        seen.add(tier['name'])
    for name, project in projects.items():
        command = project.get('command')
        if not isinstance(command, list) or not command or any(not isinstance(a, str) or not a for a in command):
            raise ValueError('Project %s needs a command as a nonempty argument list' % name)
        for key in ('watch', 'rerun_args'):
            if key in project and (not isinstance(project[key], list) or any(not isinstance(v, str) for v in project[key])):
                raise ValueError('Project %s: %s must be a list of strings' % (name, key))
    return dict(tiers=sorted(tiers, key=lambda t: t.get('order', tiers.index(t))), projects=projects)


def select_tiers(plan, upto=None):
    """Tiers to run: everything without `when`, or, naming one, every tier up to and including it."""
    tiers = plan['tiers']
    if upto:
        names = [t['name'] for t in tiers]
        if upto not in names:
            raise ValueError('Unknown tier ' + upto)
        return tiers[:names.index(upto) + 1]
    return [t for t in tiers if not t.get('when')]


def expand_env(env, project, index, run):
    expanded = {}
    for key, value in (env or {}).items():
        text = str(value).replace('{run}', run).replace('{project}', project).replace('{index}', str(index))
        text = re.sub(r'\{port:(\d+)\}', lambda m: str(int(m.group(1)) + index * 10), text)
        expanded[str(key)] = text
    return expanded


def watch_hash(repo, patterns):
    """Hash of the content of every tracked or untracked file a project watches; None when Git cannot say.

    Content, not history: an edit that was tested and then reverted hashes the same as the code that was tested."""
    result = subprocess.run(['git', '-C', str(repo), 'ls-files', '-z', '--cached', '--others', '--exclude-standard'],
                            capture_output=True)
    if result.returncode != 0:
        return None
    digest = hashlib.sha256()
    for name in sorted(set(filter(None, result.stdout.decode('utf-8', errors='replace').split('\0')))):
        if any(fnmatch.fnmatchcase(name, pattern) for pattern in patterns):
            try:
                body = (Path(repo) / name).read_bytes()
            except OSError:
                body = b'<missing>'
            digest.update(name.encode('utf-8') + b'\0' + hashlib.sha256(body).digest())
    return digest.hexdigest()


def head_of(repo):
    result = subprocess.run(['git', '-C', str(repo), 'rev-parse', 'HEAD'], capture_output=True, text=True)
    return result.stdout.strip() if result.returncode == 0 else ''


def run_project(repo, name, project, index, run, extra_args, logdir, runtime):
    started = time.time()
    env = dict(os.environ, **expand_env(project.get('env'), name, index, run))
    argv = list(project['command']) + list(extra_args)
    cwd = Path(repo) / project.get('cwd', '.')
    log = logdir / (name + '.log')
    try:
        with log.open('wb') as handle:
            code = subprocess.run(argv, cwd=str(cwd), env=env, stdin=subprocess.DEVNULL, stdout=handle,
                                  stderr=subprocess.STDOUT, timeout=project.get('timeout_s') or None).returncode
    except subprocess.TimeoutExpired:
        code = 124
    except OSError as error:
        log.write_bytes(('could not start: %s\n' % error).encode('utf-8'))
        code = 127
    text = log.read_bytes().decode('utf-8', errors='replace')
    counts = runtime.test_counts(text)
    return dict(project=name, exit=code, counts=counts, seconds=round(time.time() - started, 2), log=str(log),
                tail='\n'.join(text.splitlines()[-15:]))


def project_failed(result):
    return result['exit'] != 0 or result['counts'].get('failed', 0) or result['counts'].get('errors', 0)


def run(repo, plan, options, runtime, out=sys.stdout):
    """Execute the selected tiers. Returns the process exit code (0 only when nothing failed)."""
    repo = Path(repo)
    meta = runtime.metadata(repo) / 'tiers'
    meta.mkdir(parents=True, exist_ok=True)
    run_id = uuid.uuid4().hex[:8]
    logdir = meta / run_id
    logdir.mkdir()
    previous = {}
    try:
        previous = json.loads((meta / 'last.json').read_bytes().decode('utf-8'))
    except (OSError, ValueError):
        pass
    reuse = bool(options.get('reuse') or options.get('only_failed'))
    if reuse and options.get('tier') and any(t['name'] == options['tier'] and t.get('when') == 'promote' for t in plan['tiers']):
        raise ValueError('A promote tier always runs in full: --reuse and --only-failed are not allowed with it')
    partial = False
    head = head_of(repo)
    jobs = max(1, int(options.get('jobs') or 1))
    locks, guard = {}, threading.Lock()
    results, stopped_at, total_seconds, extra_used = {}, None, 0.0, {}
    began = time.time()
    index_of = {name: i for i, name in enumerate(plan['projects'])}

    def lock_for(tag):
        with guard:
            return locks.setdefault(tag, threading.Lock())

    for tier in select_tiers(plan, options.get('tier')):
        tier_began = time.time()
        pending, reused = [], []
        for name in tier['projects']:
            project = plan['projects'][name]
            last = previous.get('projects', {}).get(name)
            extra = []
            if reuse and last and not last.get('failed') and not last.get('partial') and project.get('watch') \
                    and last.get('watch_hash') and watch_hash(repo, project['watch']) == last['watch_hash']:
                reused.append((name, last))
                partial = True
                continue
            if options.get('only_failed') and last and last.get('failed'):
                extra = project.get('rerun_args', [])
                partial = partial or bool(extra)
            pending.append((name, project, extra))
        for name, last in reused:
            results[name] = dict(project=name, exit=0, counts=last['counts'], seconds=0.0, log=last.get('log', ''), reused=True, tail='')
            print('[%s/%s] reused: watched files are byte-identical to the last green run' % (tier['name'], name), file=out)

        def work(item):
            name, project, extra = item
            extra_used[name] = bool(extra)
            tag = project.get('exclusive')
            if tag:
                with lock_for(tag):
                    return run_project(repo, name, project, index_of[name], run_id, extra, logdir, runtime)
            return run_project(repo, name, project, index_of[name], run_id, extra, logdir, runtime)

        with concurrent.futures.ThreadPoolExecutor(max_workers=jobs) as pool:
            for result in pool.map(work, pending):
                results[result['project']] = result
                c = result['counts']
                print('[%s/%s] exit %s pass %s fail %s err %s skip %s in %ss log %s' % (
                    tier['name'], result['project'], result['exit'], c.get('passed', 0), c.get('failed', 0),
                    c.get('errors', 0), c.get('skipped', 0), result['seconds'], result['log']), file=out)
                if project_failed(result):
                    print('--- failing section of %s (last lines) ---\n%s\n---' % (result['project'], result['tail']), file=out)
        seconds = round(time.time() - tier_began, 1)
        budget = tier.get('budget_s')
        print('tier %s: %ss%s' % (tier['name'], seconds, (' OVER BUDGET %ss: split or parallelize this tier' % budget)
                                   if budget and seconds > budget else ''), file=out)
        if any(project_failed(results[n]) for n in tier['projects']):
            stopped_at = tier['name']
            print('tier %s failed: later tiers were not started' % tier['name'], file=out)
            break
    counts = dict(passed=0, failed=0, errors=0, skipped=0)
    for result in results.values():
        for key in counts:
            counts[key] += result['counts'].get(key, 0)
        if result['exit'] != 0 and not result['counts'].get('failed', 0) and not result['counts'].get('errors', 0):
            counts['errors'] += 1  # a crash or timeout with no parsable failure still counts as one
    total = counts['passed'] + counts['failed'] + counts['errors'] + counts['skipped']
    ok = not counts['failed'] and not counts['errors']
    ran_with_extra = {n for n in results if not results[n].get('reused') and extra_used.get(n)}
    saved = dict(head=head, projects={
        name: dict(head=head, failed=bool(project_failed(r)), counts=r['counts'], log=r['log'],
                   partial=name in ran_with_extra, watch_hash=watch_hash(repo, plan['projects'][name].get('watch') or [])
                   if plan['projects'][name].get('watch') else None)
        for name, r in results.items() if not r.get('reused')})
    for name, r in results.items():
        if r.get('reused') and name in previous.get('projects', {}):
            saved['projects'][name] = previous['projects'][name]
    (meta / 'last.json').write_bytes((json.dumps(saved, indent=2, sort_keys=True) + '\n').encode('utf-8'))
    if partial:
        print('TIERS PARTIAL: some results were reused or are from a rerun subset; a promotion needs a full run', file=out)
    print('', file=out)
    print('Ran %d tests in %.3fs' % (total, time.time() - began), file=out)
    print('', file=out)
    print('%s (failures=%d, errors=%d, skipped=%d)' % ('OK' if ok else 'FAILED', counts['failed'], counts['errors'],
                                                       counts['skipped']), file=out)
    return 0 if ok and not stopped_at else 1
