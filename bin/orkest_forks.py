"""Read-only git fork hygiene: which lanes (branches and worktrees) are finished, abandoned or still alive.

`orkest.py doctor git` runs this and nothing else (no docs scan). It reads every local branch of the repository,
of its submodules' real repositories and of configured siblings in a handful of batched git calls, joins them with
owner liveness and classifies each branch. Nothing is ever deleted here; REAP/PARK are proposals.

Classes
  REAP  merged into trunk, clean, owner gone (or no worktree), past the grace period
  PARK  unmerged and the owner is gone: tag parked/<branch>, then the branch can go (per-branch confirm)
  ASK   unmerged, owner idle for 1-7 days
  KEEP  owner live, worktree dirty or locked, inside the grace period, or checked out in the main checkout
"""
import concurrent.futures
import datetime
import fnmatch
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

GRACE_HOURS = 24
IDLE_DAYS = 7
PROTECTED = ('main', 'master', 'develop', 'trunk')
STAMP = 'orkest-owner.json'
SCRATCHPAD = re.compile(r'[/\\]Temp[/\\]claude[/\\][0-9a-f]+[/\\]([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})[/\\]scratchpad(?:[/\\]|$)', re.I)


def run_git(repo, *args, timeout=60):
    result = subprocess.run(['git', '-C', str(repo)] + list(args), capture_output=True, timeout=timeout,
                            env=dict(os.environ, GIT_OPTIONAL_LOCKS='0', GIT_TERMINAL_PROMPT='0'))
    return result.returncode, result.stdout.decode('utf-8', errors='replace')


def git_version():
    code, out = run_git('.', '--version')
    match = re.search(r'(\d+)\.(\d+)', out)
    return (int(match.group(1)), int(match.group(2))) if match else (0, 0)


def norm(path):
    return str(path).replace('\\', '/').rstrip('/').lower()


def read_json(path, default=None):
    try:
        return json.loads(Path(path).read_bytes().decode('utf-8-sig'))
    except (OSError, ValueError):
        return default


def trunk_of(repo, hint=None):
    """(local trunk name, comparison ref) for a repository. A hint (--trunk, .orkest/forks.json, the
    submodule's declared branch) wins over .orkest/branches.json, then origin/HEAD, then develop/main/master."""
    policy = read_json(Path(repo) / '.orkest/branches.json', {}) or {}
    names = [hint] if hint else []
    if isinstance(policy.get('integration'), str):
        names.append(policy['integration'])
    code, out = run_git(repo, 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD')
    if code == 0 and out.strip().startswith('origin/'):
        names.append(out.strip()[len('origin/'):])
    names += ['develop', 'main', 'master']
    for name in names:
        for ref in ('refs/remotes/origin/' + name, 'refs/heads/' + name):
            if run_git(repo, 'rev-parse', '--verify', '-q', ref)[0] == 0:
                return name, (('origin/' + name) if ref.startswith('refs/remotes') else name)
    return None, None


def protected(name, trunk):
    return name == trunk or name in PROTECTED or name.startswith('release/')


def reflog_times(common, name):
    """(created, last) epoch seconds from the branch's reflog file, without a subprocess."""
    path = Path(common) / 'logs/refs/heads' / name
    try:
        lines = path.read_bytes().decode('utf-8', errors='replace').splitlines()
    except OSError:
        return None, None
    found = [int(m.group(1)) for m in (re.search(r'> (\d{9,11}) [+-]\d{4}', line) for line in lines) if m]
    return (found[0], found[-1]) if found else (None, None)


def read_refs(repo, trunk_ref, modern):
    fields = ['%(refname:short)', '%(objectname)', '%(committerdate:unix)', '%(worktreepath)', '%(upstream:short)']
    if modern:
        fields.append('%(ahead-behind:' + trunk_ref + ')')
    code, out = run_git(repo, 'for-each-ref', '--format=' + '\t'.join(fields), 'refs/heads')
    rows = {}
    for line in out.splitlines():
        parts = line.split('\t')
        if len(parts) < len(fields):
            continue
        row = dict(branch=parts[0], sha=parts[1], tip_time=int(parts[2] or 0), worktree=parts[3] or None,
                   upstream=parts[4] or None, ahead=None)
        if modern and parts[5].strip():
            ahead = parts[5].split()
            row['ahead'], row['behind'] = int(ahead[0]), int(ahead[1])
        rows[parts[0]] = row
    if not modern:
        code, merged = run_git(repo, 'for-each-ref', '--merged', trunk_ref, '--format=%(refname:short)', 'refs/heads')
        merged = set(merged.split())
        for name, row in rows.items():
            row['ahead'] = 0 if name in merged else 1  # exact count is not needed; only merged or not
    return rows


def read_worktrees(repo):
    code, out = run_git(repo, 'worktree', 'list', '--porcelain')
    trees, current = [], None
    for line in out.splitlines() + ['']:
        if not line:
            if current:
                trees.append(current)
            current = None
            continue
        key, _, value = line.partition(' ')
        if key == 'worktree':
            current = dict(path=value, branch=None, locked=False, prunable=False, bare=False)
        elif current is not None:
            if key == 'branch':
                current['branch'] = value[len('refs/heads/'):] if value.startswith('refs/heads/') else value
            elif key == 'locked':
                current['locked'] = True
            elif key == 'prunable':
                current['prunable'] = True
            elif key == 'bare':
                current['bare'] = True
    return trees


def admin_dir(worktree_path):
    """The worktree's admin directory (inside the common git dir), read from its .git file."""
    marker = Path(worktree_path) / '.git'
    try:
        if marker.is_file():
            text = marker.read_bytes().decode('utf-8', errors='replace').strip()
            if text.startswith('gitdir:'):
                return Path(text[len('gitdir:'):].strip())
    except OSError:
        pass
    return None


def read_stamp(worktree_path):
    admin = admin_dir(worktree_path)
    return read_json(admin / STAMP) if admin else None


def stamp_owner(worktree_path, session, harness, branch=None, tracker=None):
    """Record who made a worktree, inside git's own admin dir (git worktree remove deletes it too)."""
    admin = admin_dir(worktree_path)
    if admin is None or not admin.is_dir():
        raise ValueError('Not a linked worktree: ' + str(worktree_path))
    if not session:
        raise ValueError('An owner stamp needs a session id')
    data = dict(schema=1, session_id=session, harness=harness or '', branch=branch or '', tracker=tracker or '',
                created_at=datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'))
    (admin / STAMP).write_bytes((json.dumps(data, indent=2, sort_keys=True) + '\n').encode('utf-8'))
    return data


def load_snapshot(path):
    """The agent-written list_sessions snapshot: {schema:1, source:'ccd-list-sessions', sessions:[...]}."""
    if not path:
        return None
    if Path(path).stat().st_size > 4 * 1024 * 1024:
        raise ValueError('Session snapshot is too large')
    data = read_json(path)
    if (not isinstance(data, dict) or data.get('schema') != 1 or data.get('source') != 'ccd-list-sessions'
            or not isinstance(data.get('sessions'), list)):
        raise ValueError('Session snapshot needs schema 1, source ccd-list-sessions and a sessions list')
    rows = []
    for row in data['sessions']:
        if isinstance(row, dict) and isinstance(row.get('sessionId'), str):
            stamp = row.get('lastActivityAt')
            rows.append(dict(session=row['sessionId'], cwd=norm(row.get('cwd') or ''), branch=row.get('branch') or '',
                             archived=bool(row.get('isArchived')), running=bool(row.get('isRunning')),
                             last=parse_time(stamp)))
    return rows


def parse_time(value):
    if isinstance(value, (int, float)):
        return float(value) / (1000.0 if value > 1e11 else 1.0)
    if isinstance(value, str) and value:
        try:
            return datetime.datetime.fromisoformat(value.replace('Z', '+00:00')).timestamp()
        except ValueError:
            return None
    return None


def transcript_time(session, claude_home):
    projects = Path(claude_home) / 'projects'
    try:
        for folder in projects.iterdir():
            candidate = folder / (session + '.jsonl')
            if candidate.is_file():
                return candidate.stat().st_mtime
    except OSError:
        pass
    return None


def liveness(branch, worktree, snapshot, claude_home, now, roots=()):
    """Evidence about the owner of one branch/worktree, strongest source first.

    `roots` are this repository's checkouts; a session elsewhere on a same-named branch is not this lane's owner."""
    evidence, last, gone, live = [], [], False, False
    stamp = read_stamp(worktree) if worktree else None
    sessions = set()
    admin = admin_dir(worktree) if worktree else None
    if admin is not None:
        # Any harness touching the worktree (Codex, a terminal, an IDE) refreshes its index; the scan itself
        # runs with GIT_OPTIONAL_LOCKS=0, so it never does.
        try:
            last.append((admin / 'index').stat().st_mtime)
            evidence.append('worktree-index')
        except OSError:
            pass
    if stamp and stamp.get('session_id'):
        sessions.add(stamp['session_id'])
        evidence.append('stamp:' + stamp['session_id'][:8])
    if worktree:
        match = SCRATCHPAD.search(worktree)
        if match:
            sessions.add(match.group(1))
            scratch = Path(worktree)
            parent = scratch
            while parent.name and parent.name != 'scratchpad':
                parent = parent.parent
            if not parent.parent.exists():
                gone = True
                evidence.append('scratchpad-gone')
    for row in snapshot or []:
        in_repo = not row['cwd'] or not roots or any(row['cwd'] == r or row['cwd'].startswith(r + '/') for r in roots)
        here = branch and row['branch'] == branch and in_repo
        cwd =worktree and row['cwd'] and (norm(worktree) == row['cwd'] or row['cwd'].startswith(norm(worktree) + '/'))
        if here or cwd or row['session'] in sessions:
            if row['running']:
                live = True
                evidence.append('running:' + row['session'][:8])
            elif row['archived']:
                gone = True
                evidence.append('archived:' + row['session'][:8])
            if row['last']:
                last.append(row['last'])
    for session in sessions:
        stamp_time = transcript_time(session, claude_home)
        if stamp_time:
            last.append(stamp_time)
            evidence.append('transcript:' + session[:8])
    if live:
        gone = False
    return dict(live=live, gone=gone, last_activity=max(last) if last else None, evidence=evidence)


def dirty_state(path):
    """('clean'|'dirty'|'unknown') for a worktree; a timeout or error is never read as clean."""
    try:
        code, out = run_git(path, 'status', '--porcelain', '--untracked-files=normal', timeout=30)
    except (subprocess.TimeoutExpired, OSError):
        return 'unknown'
    return 'unknown' if code else ('dirty' if out.strip() else 'clean')


def classify(row, owner, wt, now, grace_s, idle_s, checked_out_here):
    """Returns (class, reason). Pure: all facts are in the arguments."""
    ahead = row['ahead']
    merged = ahead == 0
    last = max(filter(None, [row.get('tip_time'), row.get('reflog_last'), owner['last_activity']])) if (
        row.get('tip_time') or row.get('reflog_last') or owner['last_activity']) else None
    age = (now - last) if last else None
    if checked_out_here:
        return 'KEEP', 'checked out in the main checkout'
    if owner['live']:
        return 'KEEP', 'owner is live (' + ', '.join(owner['evidence']) + ')'
    if wt and wt['locked']:
        return 'KEEP', 'worktree is locked'
    if wt and row.get('dirty') not in ('clean', 'unchecked'):
        return 'KEEP', 'worktree is ' + str(row.get('dirty', 'unknown')) + ': nothing is removed'
    created = row.get('reflog_created')
    if (created and now - created < grace_s) or (age is not None and age < grace_s):
        return 'KEEP', 'inside the %dh grace period' % (grace_s // 3600)
    if merged:
        if wt and not owner['gone'] and owner['last_activity'] and now - owner['last_activity'] < idle_s:
            return 'KEEP', 'merged but its owner was active within %d days' % (idle_s // 86400)
        return 'REAP', 'merged into trunk' + (', owner gone' if owner['gone'] else '') + (
            ', worktree clean' if wt else ', no worktree')
    if owner['gone']:
        return 'PARK', 'unmerged (+%d) and the owner is gone' % ahead
    if age is not None and age >= idle_s:
        return 'PARK', 'unmerged (+%d) and idle for %d days' % (ahead, int(age // 86400))
    return 'ASK', 'unmerged (+%d), owner idle %.1f days' % (ahead, (age or 0) / 86400.0)


def submodule_paths(repo):
    code, out = run_git(repo, 'config', '--file', '.gitmodules', '--get-regexp', r'^submodule\..*\.(path|branch)$')
    paths, branches = {}, {}
    for line in out.splitlines():
        key, _, value = line.partition(' ')
        name, _, field = key[len('submodule.'):].rpartition('.')
        (paths if field == 'path' else branches)[name] = value
    return [dict(path=paths[name], branch=branches.get(name)) for name in paths]


PIN_PROBLEMS = {
    'PIN_OFF_TRUNK': 'the pinned commit is not on %(trunk)s',
    'PIN_UNREACHABLE': 'the pinned commit is missing from the submodule',
    'CHECKOUT_DRIFT': 'the checkout is not the pinned commit (%(ahead)s ahead, %(behind)s behind)',
}


def pin_check(repo, module):
    """One `doctor git` pin row from the cross-repo edge state, or None when the pin needs nothing."""
    import orkest_links
    sub = Path(repo) / module['path']
    if not (sub / '.git').exists():
        return None
    trunk = module.get('branch') or trunk_of(sub)[0]
    edge = dict(path=module['path'], kind='submodule', trunk=trunk)
    facts = orkest_links.state(repo, edge)
    problems = [name for name in facts['states'] if name in PIN_PROBLEMS]
    if not facts['pin'] or not problems:
        return None
    drift = facts['drift'] or {}
    values = dict(trunk=facts['trunk_ref'] or 'the trunk', ahead=drift.get('ahead', '?'), behind=drift.get('behind', '?'))
    return dict(path=module['path'], pin=facts['pin'][:12], pin_full=facts['pin'], trunk=facts['trunk_ref'],
                states=facts['states'], detail='; '.join(PIN_PROBLEMS[name] % values for name in problems))


def lane_merges(repo, trunk, count=200):
    code, out = run_git(repo, 'log', '--all', '--merges', '-n', str(count), '--format=%h%x09%s')
    found = []
    for line in out.splitlines():
        sha, _, subject = line.partition('\t')
        match = re.match(r"Merge (?:remote-tracking )?branch '([^']+)' into (\S+)", subject)
        if match and not protected(match.group(2), trunk) and not protected(re.sub(r'^origin/', '', match.group(1)), trunk):
            found.append(dict(commit=sha, merged=match.group(1), into=match.group(2)))
    return found


def scan_repo(repo, hint, snapshot, options, now, modern, claude_home):
    started = time.time()
    repo = Path(repo)
    result = dict(repo=str(repo), trunk=hint, rows=[], stale_worktrees=[], pins=[], lane_merges=[],
                  upstream_mismatch=[], seconds=0.0, note=None)
    code, listing = run_git(repo, 'for-each-ref', '--format=%(refname:short)', 'refs/heads')
    if len(listing.split()) <= 1 and len(read_worktrees(repo)) <= 1:
        result['note'] = 'one branch, no linked worktrees: nothing to classify'
        result['seconds'] = round(time.time() - started, 2)
        return result
    trunk, trunk_ref = trunk_of(repo, hint)
    result['trunk'] = trunk
    if not trunk:
        result['note'] = 'no trunk branch found; nothing classified'
        return result
    code, common = run_git(repo, 'rev-parse', '--git-common-dir')
    common = (repo / common.strip()).resolve() if code == 0 else repo / '.git'
    code, top = run_git(repo, 'rev-parse', '--show-toplevel')
    main_checkout = norm(top.strip())
    refs = read_refs(repo, trunk_ref, modern)
    trees = read_worktrees(repo)
    by_branch = {tree['branch']: tree for tree in trees if tree['branch']}
    roots = {norm(tree['path']) for tree in trees} | {main_checkout}
    for tree in trees:
        if tree['prunable']:
            result['stale_worktrees'].append(dict(path=tree['path'], branch=tree['branch'],
                                                  detail='the worktree folder is gone (git worktree prune)'))
    candidates = []
    for name, row in refs.items():
        if protected(name, trunk):
            continue
        tree = by_branch.get(name)
        row['reflog_created'], row['reflog_last'] = reflog_times(common, name)
        if tree is None and row['worktree']:
            tree = dict(path=row['worktree'], locked=False, prunable=False)
        row['_tree'] = tree
        if tree and not tree['prunable'] and norm(tree['path']) != main_checkout and Path(tree['path']).is_dir():
            candidates.append(name)
    # `git status` on a large worktree costs ~0.6 s, so the default pass skips it; --verify runs it in parallel
    # and --fix (a later release) always re-proves cleanliness right before it acts.
    for name in candidates:
        refs[name]['dirty'] = 'unchecked'
    if options.get('verify'):
        workers = int(options.get('jobs') or 8)
        with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
            for name, state in zip(candidates, pool.map(lambda n: dirty_state(refs[n]['_tree']['path']), candidates)):
                refs[name]['dirty'] = state
    for name, row in sorted(refs.items()):
        if protected(name, trunk):
            continue
        tree = row['_tree']
        owner_path = tree['path'] if tree else None  # a vanished worktree still tells who owned it
        if tree and tree['prunable']:
            tree = None
        owner = liveness(name, owner_path, snapshot, claude_home, now, roots)
        if tree and 'dirty' not in row:
            row['dirty'] = 'clean'  # the main checkout or a missing folder has nothing to remove
        in_main = bool(tree) and norm(tree['path']) == main_checkout
        if row['ahead'] is None:
            row['ahead'] = 1  # unknown is never read as merged
        klass, reason = classify(row, owner, tree, now, options['grace_s'], options['idle_s'], in_main)
        if klass in ('REAP', 'PARK') and row.get('dirty') == 'unchecked':
            reason += '; worktree not yet checked clean (--verify)'
        result['rows'].append(dict(branch=name, **{'class': klass}, reason=reason, ahead=row['ahead'],
                                   worktree=tree['path'] if tree else None, dirty=row.get('dirty'),
                                   evidence=owner['evidence'], archived=owner['gone'] and any(e.startswith('archived') for e in owner['evidence']),
                                   last_activity=int(max(filter(None, [row['tip_time'], row.get('reflog_last'), owner['last_activity']]), default=0))))
        if row['upstream'] and row['upstream'] == trunk_ref:
            result['upstream_mismatch'].append(dict(branch=name, upstream=row['upstream'],
                                                    detail='a lane tracks the trunk: pushes and pulls hit it by accident'))
    result['lane_merges'] = lane_merges(repo, trunk)
    result['rows'].sort(key=lambda r: ({'REAP': 0, 'PARK': 1, 'ASK': 2, 'KEEP': 3}[r['class']], not r['archived'], r['branch']))
    result['seconds'] = round(time.time() - started, 2)
    return result


def repo_set(repo, options):
    """[(path, trunk hint)] for the repo, every submodule's real repo and the configured siblings."""
    config = read_json(Path(repo) / '.orkest/forks.json', {}) or {}
    repos = [(Path(repo), options.get('trunk') or config.get('trunk'))]
    for module in submodule_paths(repo):
        sub = Path(repo) / module['path']
        if (sub / '.git').exists():
            repos.append((sub, module['branch']))
    for name in list(config.get('siblings', [])) + list(options.get('sibling') or []):
        path = Path(name)
        path = path if path.is_absolute() else (Path(repo) / path).resolve()
        if (path / '.git').exists() or path.name.endswith('.git'):
            repos.append((path, None))
    seen, unique = set(), []
    for path, hint in repos:
        key = norm(path.resolve())
        if key not in seen:
            seen.add(key)
            unique.append((path, hint))
    return unique


def run(repo, options):
    started = time.time()
    now = float(options.get('now') or time.time())
    options = dict(options)
    options['grace_s'] = int(float(options.get('grace_hours') if options.get('grace_hours') is not None else GRACE_HOURS) * 3600)
    options['idle_s'] = IDLE_DAYS * 86400
    claude_home = options.get('claude_home') or os.environ.get('ORKEST_CLAUDE_HOME') or str(Path.home() / '.claude')
    snapshot = load_snapshot(options.get('session_report'))
    modern = git_version() >= (2, 41) and not options.get('no_ahead_behind')
    repos = repo_set(repo, options)
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(4, len(repos))) as pool:
        reports = list(pool.map(lambda item: scan_repo(item[0], item[1], snapshot, options, now, modern, claude_home), repos))
    for report, (path, hint) in zip(reports, repos):
        if path != Path(repo):
            continue
        for module in submodule_paths(path):
            problem = pin_check(path, module)
            if problem:
                report['pins'].append(problem)
    counts = {name: sum(1 for report in reports for row in report['rows'] if row['class'] == name)
              for name in ('REAP', 'PARK', 'ASK', 'KEEP')}
    stale = sum(len(report['stale_worktrees']) for report in reports)
    return dict(action='doctor-git', read_only=True, repos=reports, summary=dict(counts, stale_worktrees=stale,
                pins=sum(len(r['pins']) for r in reports), lane_merges=sum(len(r['lane_merges']) for r in reports),
                upstream_mismatch=sum(len(r['upstream_mismatch']) for r in reports)),
                liveness_source='ccd-list-sessions' if snapshot is not None else 'stamps, scratchpads and reflog only',
                grace_hours=options['grace_s'] // 3600, git_ahead_behind=modern, verified_clean=bool(options.get('verify')), seconds=round(time.time() - started, 2))


def table(result):
    lines = []
    for report in result['repos']:
        lines.append('%s  trunk=%s  %.2fs%s' % (report['repo'], report['trunk'], report['seconds'],
                                                '  (' + report['note'] + ')' if report['note'] else ''))
        for row in report['rows']:
            if row['class'] != 'KEEP':
                lines.append('  %-4s %-48s %s' % (row['class'], row['branch'], row['reason']))
        for item in report['stale_worktrees']:
            lines.append('  STALE %s' % item['path'])
        for item in report['pins']:
            lines.append('  PIN  %s %s: %s' % (item['path'], item['pin'], item['detail']))
    summary = result['summary']
    lines.append('git: %d REAP, %d PARK, %d ASK, %d KEEP, %d stale worktrees, %d pins off trunk' % (
        summary['REAP'], summary['PARK'], summary['ASK'], summary['KEEP'], summary['stale_worktrees'], summary['pins']))
    return lines


def main(argv=None):
    import argparse
    parser = argparse.ArgumentParser(description='Owner stamp for hand-made worktrees')
    sub = parser.add_subparsers(dest='command', required=True)
    stamp = sub.add_parser('stamp')
    stamp.add_argument('worktree')
    stamp.add_argument('--session', required=True)
    stamp.add_argument('--harness', default='')
    stamp.add_argument('--branch', default='')
    stamp.add_argument('--tracker', default='')
    args = parser.parse_args(argv)
    print(json.dumps(stamp_owner(args.worktree, args.session, args.harness, args.branch, args.tracker)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
