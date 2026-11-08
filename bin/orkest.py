"""Deterministic helpers for the single /orkest agent workflow."""
import argparse
import datetime
import hashlib
import importlib.util
import json
import os
import platform
from pathlib import Path
import re
import subprocess
import sys
import time
import uuid

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))  # python -I drops the script directory

from orkest_core import (BRANCH_FILE, ID, KEY_FILE, WRITE_CAPABILITY, allocate_id, branch_allowed, detect_layout,
                         id_number, next_action, parse_branch_policy, parse_tracker, phase_section, read_key, resolve_target, tracker_filename, tracker_key,
                         tracker_layout, tracker_stem, tracker_suffix)

BIN = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location('orkest_migration_runtime', BIN / 'orkest-migrate.py')
migration = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(migration)


def git(repo, *args, optional=False):
    result = subprocess.run(['git', '-C', str(repo), '--literal-pathspecs', *args],
                            capture_output=True, text=True, encoding='utf-8', errors='replace')
    if result.returncode and not optional:
        raise ValueError(result.stderr.strip() or 'Git operation failed')
    return result.stdout.strip() if result.returncode == 0 else ''


def status_raw(repo):
    """`git status --porcelain` exactly as printed: git() strips, which would eat the first line's leading space."""
    result = subprocess.run(['git', '-C', str(repo), 'status', '--porcelain', '--untracked-files=all'], capture_output=True,
                            text=True, encoding='utf-8', errors='replace')
    return result.stdout if result.returncode == 0 else ''


def metadata(repo):
    git_dir = Path(git(repo, 'rev-parse', '--absolute-git-dir')).resolve()
    result = git_dir / 'orkest'
    try:
        result.resolve().relative_to(git_dir)
    except ValueError:
        raise ValueError('Run metadata escapes this worktree')
    if result.is_symlink():
        raise ValueError('Symlink run metadata is not supported')
    return result


def state_path(repo, key):
    path = metadata(repo) / 'runs' / (key + '.json')
    try:
        path.resolve().relative_to(metadata(repo))
    except ValueError:
        raise ValueError('Run state escapes this worktree')
    return path


def read_json(path, default=None):
    return json.loads(path.read_text(encoding='utf-8')) if path.is_file() else default


def save_json(path, value):
    migration.atomic_write(path, (json.dumps(value, indent=2, ensure_ascii=False) + '\n').encode('utf-8'))


def session_id(options):
    return (options.get('session') or os.environ.get('CODEX_SESSION_ID') or
            os.environ.get('CLAUDE_CODE_SESSION_ID') or os.environ.get('GROK_SESSION_ID'))


def lane(options):
    if os.environ.get('GHOST_AFK_RUN') or os.environ.get('ORKEST_AFK_RUN'):
        return 'unattended'
    return options.get('lane', 'interactive')


def branch_policy(repo):
    path = migration.checked_path(repo, BRANCH_FILE)
    return parse_branch_policy(path.read_text(encoding='utf-8') if path.is_file() else None)


def integration_branch(repo):
    declared = branch_policy(repo)['integration']
    if declared:
        if declared not in git(repo, 'for-each-ref', '--format=%(refname:short)', 'refs/heads').splitlines():
            raise ValueError('%s: integration names no local branch: %s' % (BRANCH_FILE, declared))
        return declared
    remote = git(repo, 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD', optional=True)
    default = remote.split('/', 1)[-1] if remote else ''
    branches = git(repo, 'for-each-ref', '--format=%(refname:short)', 'refs/heads').splitlines()
    if not default:
        default = next((name for name in ('main', 'master') if name in branches), '')
    if not default and len(branches) == 1:
        default = branches[0]
    if not default:
        raise ValueError('Cannot establish the integration branch')
    for candidate in ('develop', 'development'):
        if candidate in branches and git(repo, 'rev-list', '--count', candidate + '..' + default) == '0':
            return candidate
    return default


def discover(repo):
    paths = sorted(path for pattern in ('docs/*.md', 'docs/orkest/*.md') for path in repo.glob(pattern)
                   if tracker_layout(path.relative_to(repo).as_posix()))
    trackers = []
    for path in paths:
        name = path.relative_to(repo).as_posix()
        path = migration.checked_path(repo, name)
        if path.is_file():
            trackers.append(parse_tracker(path.read_text(encoding='utf-8'), name))
    return trackers


def layout(repo):
    paths = git(repo, 'ls-files', '--cached', '--others', '--exclude-standard', '-z').split('\0')
    marker = migration.checked_path(repo, 'docs/orkest/.layout')
    version = None
    if marker.exists():
        raw = marker.read_text(encoding='utf-8').strip()
        if not raw.isdigit():
            raise ValueError('Malformed layout marker')
        version = int(raw)
    return detect_layout(filter(None, paths), version)


def compatibility_verified(repo):
    manifest = read_json(BIN.parent / 'orkest-compatibility.json', {})
    if manifest.get('schema') != 1 or not manifest.get('files'):
        return False
    for name, expected in manifest['files'].items():
        path = migration.checked_path(repo, name)
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            return False
    return True


# The write format's capability is required: a reader certified only for older
# filenames would silently miss trackers written after migration.
CONSUMER_CAPABILITIES = ('ork-layout-v1', WRITE_CAPABILITY, 'orkest-skill-v1')


def consumer_readiness(repo):
    """Missing registration is unknown; a tracker or a boolean is not deployment proof."""
    config = read_json(migration.checked_path(repo, '.orkest/consumers.json'), {})
    if (not isinstance(config, dict) or type(config.get('schema')) is not int or
            config['schema'] != 1 or not isinstance(config.get('required'), list)):
        return dict(ready=False, reason='Consumer requirements are not explicitly registered')
    if not config['required']:
        return dict(ready=True, reason='Project explicitly declares no external consumer requirements')
    seen = set()
    try:
        for required in config['required']:
            name, revision = required['name'], required['revision']
            if not isinstance(name, str) or not name or name in seen or not re.fullmatch(r'[0-9a-f]{40,64}', revision):
                raise ValueError('Invalid or duplicate consumer identity')
            seen.add(name)
            def artifact(relative, expected):
                if not isinstance(relative, str) or not relative.startswith('.orkest/receipts/'):
                    raise ValueError('Consumer evidence must be project-local receipts')
                data = migration.checked_path(repo, relative).read_bytes()
                if hashlib.sha256(data).hexdigest() != expected:
                    raise ValueError('Consumer evidence bytes changed')
                return data
            receipt = json.loads(artifact(required['receipt'], required['sha256']))
            if (type(receipt.get('schema')) is not int or receipt['schema'] != 1 or receipt.get('consumer') != name or
                    receipt.get('revision') != revision or not isinstance(receipt.get('capabilities', []), list)):
                raise ValueError('Consumer receipt does not certify the required revision and capabilities')
            missing = [token for token in CONSUMER_CAPABILITIES if token not in receipt.get('capabilities', [])]
            if missing:
                raise ValueError(name + ' receipt lacks required capabilities: ' + ', '.join(missing))
            tests, deployed = receipt['tests'], receipt['deployment']
            if (tests.get('revision') != revision or type(tests.get('exit_code')) is not int or
                    tests['exit_code'] != 0 or type(tests.get('passed')) is not int or
                    tests['passed'] <= 0 or type(tests.get('total')) is not int or
                    tests['passed'] != tests['total'] or deployed.get('revision') != revision or
                    deployed.get('verified') is not True):
                raise ValueError('Consumer tests or deployment are incomplete or revision-mismatched')
            for stage in (tests, deployed):
                artifact(stage['evidence'], stage['sha256'])
    except (AttributeError, KeyError, TypeError, ValueError, OSError) as error:
        return dict(ready=False, reason='Consumer compatibility evidence rejected: ' + str(error))
    return dict(ready=True, reason='All registered consumers have matching test and deployment receipts')


def preflight(repo, tracker, options):
    branch = git(repo, 'symbolic-ref', '--short', 'HEAD')
    if git(repo, 'diff', '--name-only', '--diff-filter=U'):
        raise ValueError('Unresolved merge conflicts')
    if lane(options) == 'unattended':
        if not tracker:
            raise ValueError('Rule 24: unattended runs require their explicit existing target')
        if branch != options.get('own_branch') or branch == integration_branch(repo):
            raise ValueError('Rule 24: unattended run must remain on its own branch')
        if any(box['human'] and not box['checked'] for box in tracker['boxes']):
            raise ValueError('Rule 24: unchecked human box blocks the whole tracker')
        text = (repo / tracker['path']).read_text(encoding='utf-8')
        if re.search(r'(?im)^>\s*agent-blocked\b', text):
            raise ValueError('Rule 24: repo-scope agent-blocked tracker')
    elif not branch_allowed(branch, integration_branch(repo), branch_policy(repo)):
        raise ValueError('Wrong branch: use the live integration branch %s, or declare this branch in %s' % (
            integration_branch(repo), BRANCH_FILE))
    if tracker:
        text = (repo / tracker['path']).read_text(encoding='utf-8')
        if tracker['errors']:
            raise ValueError('Invalid tracker: ' + '; '.join(tracker['errors']))
        if re.search(r'(?m)^\s*\*\*Resolution:\*\*\s*(?:___\s*)?$', text):
            raise ValueError('Open Questions must be resolved before running')
    for name in ('scheduler.json', '.orkest/scheduler.json'):
        config = read_json(repo / name, {})
        for shift in config.get('shifts', []):
            target = tracker['path'] if tracker else ''
            if (shift.get('enabled') is True and target in shift.get('targetImpls', []) and
                    shift.get('enabledUntil', '') > datetime.datetime.now(datetime.timezone.utc).isoformat()):
                raise ValueError('Tracker is an armed scheduler target: ' + shift.get('setupId', 'unknown'))


def run_key(tracker):
    value = tracker['id'] or tracker_stem(tracker['path'])
    if not re.fullmatch(r'[A-Za-z][A-Za-z0-9_-]*', value):
        raise ValueError('Invalid tracker state key')
    return value


def lock_fields(repo):
    path = metadata(repo) / 'run.lock'
    if not path.is_file():
        return {}
    return dict(re.findall(r'(?m)^([a-z_]+):\s*([^\n]*)$', path.read_text(encoding='utf-8')))


def acquire(repo, tracker, options):
    session = session_id(options) or str(uuid.uuid4())
    if not re.fullmatch(r'[A-Za-z0-9_.:-]{1,128}', session):
        raise ValueError('Session identity must be a single safe token')
    target = tracker['path'] if tracker else '<bootstrap>'
    migration.check_writer_locks(repo, session, target, recover=True)
    existing = lock_fields(repo)
    if existing:
        if existing.get('session') != session or existing.get('target') != target:
            raise ValueError('Another writer owns the run lock: ' + existing.get('session', 'unknown'))
        touch_lock(repo, session)
        return session
    parent = metadata(repo)
    parent.mkdir(parents=True, exist_ok=True)
    with (parent / 'run.lock').open('x', encoding='utf-8') as handle:
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        handle.write('session: ' + session + '\ntarget: ' + target + '\nbranch: ' +
                     git(repo, 'symbolic-ref', '--short', 'HEAD') + '\nstarted: ' + now +
                     '\nhost: ' + platform.node().replace(' ', '_') + '\nheartbeat: ' + now + '\n')
    return session


def retake_lock(repo, session, target, branch):
    """Re-create this session's own run lock after it was cleared; lose quietly to any other writer."""
    migration.check_writer_locks(repo, session, target, recover=True)  # a legacy or foreign lock still blocks
    parent = metadata(repo)
    parent.mkdir(parents=True, exist_ok=True)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    try:
        with (parent / 'run.lock').open('x', encoding='utf-8') as handle:
            handle.write('session: ' + session + '\ntarget: ' + target + '\nbranch: ' + branch + '\nstarted: ' + now +
                         '\nhost: ' + platform.node().replace(' ', '_') + '\nheartbeat: ' + now + '\n')
    except FileExistsError:
        pass  # another session took it between the check and now; the ownership check reports it


def touch_lock(repo, session):
    """Show the owner is still working: refresh the heartbeat of this session's own run lock."""
    path = metadata(repo) / 'run.lock'
    fields = lock_fields(repo)
    if fields.get('session') != session:
        return
    fields['heartbeat'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    migration.atomic_write(path, ''.join(key + ': ' + value + '\n' for key, value in fields.items()).encode('utf-8'))


def migrate_aside(repo, session):
    """Migrate the layout in a clean temporary worktree and fast-forward this checkout to it.

    Local edits stay exactly where they are: Git refuses the fast-forward if one overlaps a file the
    migration touches, and then nothing changes. Returns the migration plan."""
    repo = migration.repository(repo)
    git(repo, 'symbolic-ref', '--short', 'HEAD')  # a detached HEAD cannot be fast-forwarded safely
    token = uuid.uuid4().hex[:8]
    root = metadata(repo) / ('aside-' + token)
    temp_branch = 'orkest-aside-' + token
    root.parent.mkdir(parents=True, exist_ok=True)
    git(repo, 'worktree', 'add', '-b', temp_branch, str(root), 'HEAD')
    try:
        plan = migration.build_plan(root, session=session)
        outcome = migration.apply_plan(root, plan, session=session)
        if not outcome.get('committed'):
            raise ValueError('Nothing to migrate aside')
        head = git(root, 'rev-parse', 'HEAD')
        merged = subprocess.run(['git', '-C', str(repo), 'merge', '--ff-only', head], capture_output=True, text=True,
                                encoding='utf-8', errors='replace')
        if merged.returncode:
            raise ValueError('Cannot fast-forward over local changes: ' + (merged.stderr or merged.stdout).strip()[:300])
        import orkest_upgrade
        orkest_upgrade.migration_handover(repo, plan['moves'], sys.modules[__name__])
        return plan
    finally:
        subprocess.run(['git', '-C', str(repo), 'worktree', 'remove', '--force', str(root)], capture_output=True)
        subprocess.run(['git', '-C', str(repo), 'worktree', 'prune'], capture_output=True)
        subprocess.run(['git', '-C', str(repo), 'branch', '-D', temp_branch], capture_output=True)


def recover_locks(repo, options):
    """List the foreign writer locks; with --confirm-inactive remove them, recording each."""
    repo = migration.repository(repo)
    found = migration.writer_locks(repo, session_id(options))
    rows = [dict(info['fields'], lock=str(lock), stale=info['stale'], idle_minutes=int(info['idle'] / 60),
                 title=migration.session_title(info['fields'].get('session', '')))
            for lock, info in found]
    if not options.get('confirm_inactive'):
        return dict(action='locks', locks=rows, note='Nothing removed. Re-run with --confirm-inactive once you know '
                    'every listed owner is gone; a running session must be waited for.')
    for lock, info in found:
        migration.recover_lock(repo, lock, info, 'confirmed-inactive')
    return dict(action='recovered', locks=rows)


def release(repo, options=None):
    repo = migration.repository(repo)
    options = options or {}
    fields = lock_fields(repo)
    if fields and fields.get('session') != session_id(options):
        raise ValueError('Only the owning session can release its writer lock')
    if fields:
        (metadata(repo) / 'run.lock').unlink()
    return dict(action='released')


def project_key(repo):
    """The declared project key, or None; an invalid key file is an error, never a silent fallback."""
    path = migration.checked_path(repo, KEY_FILE)
    return read_key(path.read_text(encoding='utf-8')) if path.exists() else None


def writer_lock_report(repo):
    """Every writer lock (the run lock under the Git dir and legacy tracker locks), for tools that preview
    an update or a run without taking a lock themselves. A lock that cannot be read is listed as such."""
    try:
        found = migration.writer_locks(repo, include_own=True)
    except (ValueError, OSError, UnicodeError) as error:
        return [dict(path=None, unreadable=str(error))]
    report = []
    for lock, info in found:
        try:
            shown = lock.relative_to(repo).as_posix()
        except ValueError:
            shown = 'git-dir:orkest/' + lock.name  # a linked worktree's run lock lives outside the tree
        fields = info['fields']
        report.append(dict(path=shown, session=fields.get('session'), target=fields.get('target'),
                           branch=fields.get('branch'), started=fields.get('started'), host=fields.get('host'),
                           idle_min=int(info['idle'] / 60), stale=bool(info['stale']),
                           foreign_host=bool(info['foreign_host'])))
    return report


def inspect(repo, query='', options=None):
    options = options or {}
    repo = migration.repository(repo)
    trackers = discover(repo)
    active = read_json(metadata(repo) / 'active.json', {}).get('target')
    resolution = resolve_target(query, trackers, active, project_key(repo))
    # A malformed existing document must not become an overwriteable bootstrap target.
    for tracker in trackers:
        if tracker['errors'] and query and query.casefold() in (tracker_key(tracker['path']),
                                                              (tracker['id'] or '').casefold()):
            raise ValueError('Matching tracker is invalid; repair its metadata first')
    result = dict(resolution=resolution, layout=layout(repo),
                  compatibility_verified=compatibility_verified(repo),
                  consumer_readiness=consumer_readiness(repo),
                  branch=git(repo, 'symbolic-ref', '--short', 'HEAD'),
                  dirty=bool(git(repo, 'status', '--porcelain', '--untracked-files=all')),
                  writer_locks=writer_lock_report(repo))
    if resolution['action'] == 'run':
        preflight(repo, resolution['target'], options)
    return result


def start(repo, query='', options=None):
    options = options or {}
    repo = migration.repository(repo)
    result = inspect(repo, query, options)
    if options.get('dry'):
        result.update(action='stopped', reason='Dry run; no writes, locks or migration')
        return result
    resolution = result['resolution']
    if resolution['action'] == 'ask':
        return dict(result, action='ask', reason=resolution['reason'])
    target = resolution['target']
    preflight(repo, target, options)
    import orkest_budget
    budget = orkest_budget.check(repo, options, sys.modules[__name__])
    if budget['action'] == 'stop':
        return dict(result, action='stopped', reason=budget['reason'], budget=budget)
    if not result['layout']['supported']:
        raise ValueError('Unsupported layout version')
    upgrade_deferred = False
    if (repo / 'orkest-upgrade.json').is_file():
        import orkest_upgrade
        upgrade_options = dict(options, execute=lane(options) == 'interactive' and not options.get('no_commit'),
                               session=session_id(options), lane=lane(options))
        upgrade_result = orkest_upgrade.reconcile(repo, repo, upgrade_options, sys.modules[__name__])
        owned = lock_fields(repo)
        if (upgrade_result['status'] == 'writer-active' and owned
                and owned.get('session') == session_id(options)):
            # Resume existing owned work, but never migrate around the shared writer gate.
            upgrade_deferred = True
        elif upgrade_result['status'] not in ('complete', 'layout-deferred', 'preview'):
            return dict(result, action='stopped', reason=upgrade_result.get('reason', upgrade_result['status']), upgrade=upgrade_result)
        resolved_query = (target['id'] or tracker_stem(target['path'])) if target else query
        result = inspect(repo, resolved_query, options)
        if result['resolution']['action'] == 'ask':
            return dict(result, action='ask', reason=result['resolution']['reason'])
        target = result['resolution']['target']
    pending = upgrade_deferred and result['layout']['needs_migration']
    if result['layout']['needs_migration']:
        if lane(options) == 'unattended' or not result['compatibility_verified']:
            return dict(result, action='migration-required', reason='Install verified compatibility before migration')
        if result['dirty'] and not options.get('no_commit') and result['consumer_readiness']['ready']:
            # Dirty tree: migrate in a clean temporary worktree instead of refusing new work.
            try:
                migration.check_writer_locks(repo, session_id(options), recover=True)
                migrate_aside(repo, session_id(options) or str(uuid.uuid4()))
                result = inspect(repo, query, options)
                target = result['resolution']['target']
                pending = False
            except (ValueError, OSError, RuntimeError):
                pass  # Fall through to the original deferral; nothing was changed.
        if result['layout']['needs_migration'] and (result['dirty'] or options.get('no_commit') or
                                                    not result['consumer_readiness']['ready']):
            if not target or target['id'] is not None:
                return dict(result, action='migration-required',
                            reason='Pending migration only permits existing legacy work. The migration needs a clean '
                                   'tree: commit or move aside local changes, or run `python bin/orkest-migrate.py '
                                   '--repo <root> --apply` in a clean checkout or worktree of this branch as its own '
                                   'commit, then start the new work')
            pending = True
    session = acquire(repo, target, options)
    options['session'] = session
    if result['layout']['needs_migration'] and not pending:
        try:
            plan = migration.build_plan(repo, session=session)
            migration.apply_plan(repo, plan, session=session)
            resolved_query = query
            if target:
                moved = next((move for move in plan['moves'] if move['source'] == target['path']), None)
                resolved_query = moved['id'] if moved else target['id'] or query
            result = inspect(repo, resolved_query, options)
            target = result['resolution']['target']
            path = metadata(repo) / 'run.lock'
            fields = lock_fields(repo)
            fields['target'] = target['path'] if target else '<bootstrap>'
            migration.atomic_write(path, ''.join(key + ': ' + value + '\n' for key, value in fields.items()).encode('utf-8'))
        except Exception:
            release(repo, dict(options, session=session))
            raise
    saved_options = {key: options.get(key) for key in
                     ('no_commit', 'no_promote', 'stop_at', 'own_branch')}
    saved_options.update(lane=lane(options), person_invoked=lane(options) == 'interactive', default_run=True)
    state = dict(schema=1, session=session, target=target['path'] if target else None,
                 query=query, branch=result['branch'], base=git(repo, 'rev-parse', 'HEAD'),
                 options=saved_options, facts={'compatibility_verified': result['compatibility_verified']},
                 migration_pending=pending, baseline_status=status_raw(repo),
                 staged_diff_hash=hashlib.sha256(git(repo, 'diff', '--cached').encode('utf-8')).hexdigest(),
                 unstaged_diff_hash=hashlib.sha256(git(repo, 'diff').encode('utf-8')).hexdigest())
    if budget.get('snapshot'):
        state['budget_snapshot'] = budget['snapshot']
    saved_options['harness'] = options.get('harness') or ('codex' if os.environ.get('CODEX_SESSION_ID') else None)
    if target:
        key = run_key(target)
        previous = read_json(state_path(repo, key), {})
        if previous.get('target') == target['path'] and previous.get('branch') == state['branch']:
            state['phases'] = previous.get('phases', {})
            state['base'] = previous.get('base', state['base'])
        state['facts'].update(previous.get('facts', {}))
        state['facts']['compatibility_verified'] = result['compatibility_verified']
        save_json(state_path(repo, key), state)
        save_json(metadata(repo) / 'active.json', dict(target=target['path'], key=key))
    else:
        save_json(metadata(repo) / 'pending.json', state)
    initial = 'plan' if target else 'bootstrap'
    if options.get('stop_at') == initial:
        release(repo, dict(options, session=session))
        return dict(result, action='stopped', session=session, reason='Explicit stop before ' + initial)
    return dict(result, action=initial, session=session, migration_pending=pending, budget=budget,
                reason='Establish exact phase scope before source edits' if target else 'Draft grounded phases from repository context')


def bootstrap(repo, options):
    """Persist an agent-grounded draft; never invent architecture or acceptance proof."""
    repo = migration.repository(repo)
    pending = read_json(metadata(repo) / 'pending.json', {})
    owner = lock_fields(repo)
    session = session_id(options)
    if not session or owner.get('session') != session or owner.get('target') != '<bootstrap>':
        raise ValueError('Bootstrap requires the owning pending run')
    saved = pending.get('options', {})
    if lane(options) == 'unattended' or saved.get('lane') == 'unattended':
        raise ValueError('Rule 24: unattended bootstrap is forbidden')
    preflight(repo, None, saved)
    if git(repo, 'rev-parse', 'HEAD') != pending.get('base'):
        raise ValueError('Repository advanced since bootstrap preflight; restart discovery')
    name = options.get('name') or ''
    if not re.fullmatch(r'[A-Z][A-Z0-9_]*(?:-[A-Z0-9_]+)*', name):
        raise ValueError('Name must be an uppercase description token')
    if not options.get('input_file'):
        raise ValueError('A repository-grounded draft is required')
    draft = migration.checked_path(repo, options['input_file']).read_text(encoding='utf-8')
    sections = ('AI Continuation Prompt', 'Open Questions', 'Architecture', 'Current State',
                'Known Bugs', 'What Needs Testing', 'Implementation Status', 'Checklist',
                'Key Files Reference', 'Architecture Notes')
    if any('## ' + section not in draft.splitlines() for section in sections):
        raise ValueError('Draft is missing a required protocol section')
    if re.search(r'<TBD>|___|Replace with|YYYY-MM-DD|^- \[[xX]\]', draft, re.M):
        raise ValueError('Draft contains placeholders or unearned checked boxes')
    if re.search(r'(?m)^\s*\*\*Resolution:\*\*\s*$', draft):
        raise ValueError('Draft has unresolved Open Questions')
    identities = []
    # Descriptions collide casefolded across every tracker suffix and lifecycle folder.
    legacy = [*repo.glob('docs/*.md'), *(repo / 'docs/impl').rglob('*.md')]
    for path in sorted(legacy):
        if tracker_suffix(path.name) == '-IMPL.md' and tracker_key(path.name) == name.casefold():
            raise ValueError('Description collides with an existing or archived tracker')
    for path in sorted((repo / 'docs/orkest').rglob('*.md')):
        if tracker_suffix(path.name) not in ('-ORK.md', '.imp.md'):
            continue
        relative = path.relative_to(repo).as_posix()
        body = migration.checked_path(repo, relative).read_text(encoding='utf-8')
        # Lifecycle directories do not change the identity contract.
        parsed = parse_tracker(body, 'docs/orkest/' + path.name)
        # Allocation needs only a valid identity; box/phase shape drift in older trackers is doctor's finding.
        if parsed['id'] is None:
            raise ValueError('Invalid existing tracker: ' + relative)
        identities.append(parsed['id'])
        if tracker_key(path.name) == name.casefold():
            raise ValueError('Description collides with an existing or archived tracker')
    counter_path = migration.checked_path(repo, 'docs/orkest/.next-id')
    raw = counter_path.read_text(encoding='utf-8').strip() if counter_path.exists() else '1'
    if not raw.isdigit():
        raise ValueError('Invalid next-id counter')
    allocation = allocate_id(int(raw), identities, project_key(repo))
    identity = allocation['id']
    target = 'docs/orkest/' + tracker_filename(name)
    body = migration.tracker_content(draft, identity, name).replace('ORK-PENDING', identity)
    date = datetime.date.today().isoformat()
    if re.search(r'(?m)^> Updated:', body):
        body = re.sub(r'(?m)^> Updated:.*$', '> Updated: ' + date, body)
    else:
        body = body.replace('# ' + identity + ': ' + name + '\n',
                            '# ' + identity + ': ' + name + '\n\n> Updated: ' + date + '\n', 1)
    parsed = parse_tracker(body, target)
    if parsed['errors'] or not parsed['boxes'] or not 1 <= len(parsed['phases']) <= 6:
        raise ValueError('Invalid draft phases/boxes: ' + '; '.join(parsed['errors']))
    if any(not box['id'].startswith(identity + '.') for box in parsed['boxes']):
        raise ValueError('New tracker boxes must use ORK-PENDING identity')
    preview = bool(saved.get('no_commit'))
    link = '[' + identity + ': ' + name + '](orkest/' + tracker_filename(name) + ')'
    writes = {}
    for filename, heading in [('docs/CONTEXT.md', 'Active implementation'),
                              ('docs/TODO.md', 'Implementation queue'),
                              ('docs/README.md', 'Implementation trackers')]:
        path = migration.checked_path(repo, filename)
        old = path.read_text(encoding='utf-8') if path.exists() else '# ' + Path(filename).stem + '\n'
        writes[filename] = old.rstrip() + '\n\n## ' + heading + '\n\n- ' + link + ' — plan-only' + (' preview' if preview else '') + '.\n'
    log = 'docs/orkest/LOGBOOK.md'
    old_log = migration.checked_path(repo, log)
    prefix = old_log.read_text(encoding='utf-8') if old_log.exists() else '# Logbook\n'
    writes[log] = prefix.rstrip() + ('\n\n## ' + date + ' — ' + identity + ': ' + name + '\n\n'
        '### Accomplished\n\n- Created a grounded plan-only tracker.\n\n'
        '### Decisions\n\n- Allocate identity locally; implementation evidence remains unclaimed.\n\n'
        '### Blockers\n\n- See tracker questions and dependencies; implementation is still unverified.\n\n'
        '### Next\n\n- Execute the first runnable phase under the Orkest workflow.\n')
    writes.update({target: body, 'docs/orkest/.next-id': str(allocation['next_counter']) + '\n',
                   'docs/orkest/.layout': '1\n'})
    # Existing dirty bookkeeping is an ownership ambiguity, not a whole-tree clean gate.
    dirty = set(git(repo, 'diff', '--name-only').splitlines()) | set(git(repo, 'diff', '--cached', '--name-only').splitlines())
    dirty |= set(git(repo, 'ls-files', '--others', '--exclude-standard').splitlines())
    overlap = dirty.intersection(writes)
    if overlap:
        raise ValueError('Bootstrap would mix existing edits in: ' + ', '.join(sorted(overlap)))
    if options.get('dry'):
        return dict(action='stopped', id=identity, paths=list(writes), committed=False, reason='Dry bootstrap preview')
    before = {name: (repo / name).read_bytes() if (repo / name).exists() else None for name in writes}
    try:
        for filename, content in writes.items():
            migration.atomic_write(migration.checked_path(repo, filename), content.encode('utf-8'))
        commit = None
        if not preview:
            commit = scoped_commit(repo, saved, 'docs(orkest): bootstrap ' + identity + ': ' + name,
                                   list(writes), session)
    except (ValueError, OSError):
        if git(repo, 'rev-parse', 'HEAD') == pending['base']:
            for filename, content in before.items():
                path = repo / filename
                if path.is_file() and path.read_bytes() == writes[filename].encode('utf-8'):
                    if content is None:
                        path.unlink()
                    else:
                        migration.atomic_write(path, content)
        raise
    pending.update(target=target, bootstrap_commit=commit, bootstrap_preview=preview)
    save_json(state_path(repo, identity), pending)
    save_json(metadata(repo) / 'active.json', dict(target=target, key=identity))
    lock = (metadata(repo) / 'run.lock').read_text(encoding='utf-8')
    migration.atomic_write(metadata(repo) / 'run.lock', lock.replace('target: <bootstrap>', 'target: ' + target).encode('utf-8'))
    (metadata(repo) / 'pending.json').unlink()
    return dict(action='plan', id=identity, target=target, committed=bool(commit), commit=commit, preview=preview)


def scoped_commit(repo, options, message, paths, session):
    helper = BIN / 'workflow-git.py'
    target = lock_fields(repo).get('target')
    tracker = next((t for t in discover(repo) if t['path'] == target), None)
    preflight(repo, tracker, options)
    branch = git(repo, 'symbolic-ref', '--short', 'HEAD')
    for command in [['preflight', '--branch', branch],
                    ['commit', '--branch', branch, '--message', message + '\n\nSession-Id: ' + session,
                     '--paths', *paths]]:
        result = subprocess.run([sys.executable, '-X', 'utf8', str(helper), *command, '--repo', str(repo)],
                                capture_output=True, text=True, encoding='utf-8', errors='replace')
        if result.returncode:
            raise ValueError(result.stdout.strip() + result.stderr.strip())
    return git(repo, 'rev-parse', 'HEAD')


def run_step(repo, options):
    repo = migration.repository(repo)
    active = read_json(metadata(repo) / 'active.json', {})
    if not active.get('key'):
        raise ValueError('Start a resolved target before running a step')
    state_file = state_path(repo, active['key'])
    state = read_json(state_file, {})
    tracker = next((t for t in discover(repo) if t['path'] == state.get('target')), None)
    if not tracker:
        raise ValueError('Active live tracker is missing')
    saved = state['options']
    if lane(options) != saved['lane']:
        raise ValueError('Execution lane changed; restart through preflight')
    preflight(repo, tracker, saved)
    if state['session'] == session_id(options) and not options.get('dry') and not lock_fields(repo):
        # The lock was cleared under this live session (recover-lock, an Update). Nothing else holds the
        # repository, so take it back and carry on instead of failing the run.
        retake_lock(repo, session_id(options), tracker['path'], state['branch'])
    if (lock_fields(repo).get('session') != session_id(options) or
            lock_fields(repo).get('target') != tracker['path'] or state['session'] != session_id(options)):
        held = lock_fields(repo).get('session')
        raise ValueError('The current session does not own this target' +
                         ('; the run lock is held by session ' + held + '. Wait for it, or ask the operator to run '
                          'recover-lock --confirm-inactive' if held and held != session_id(options) else ''))
    if git(repo, 'symbolic-ref', '--short', 'HEAD') != state['branch']:
        raise ValueError('Run branch changed')
    if options.get('dry'):
        return dict(action='stopped', reason='Dry step preview; no writes')
    touch_lock(repo, session_id(options))
    def with_budget(value):
        if state.get('budget_decision'):
            value['budget'] = state['budget_decision']
        return value
    if options['command'] in ('next', 'plan', 'qa-pass', 'logbook', 'commit-phase', 'audit', 'promote'):
        import orkest_budget
        budget = orkest_budget.check(repo, dict(options, harness=saved.get('harness')), sys.modules[__name__], state)
        if budget.get('snapshot'):
            state['budget_decision'] = {key: value for key, value in budget.items() if key != 'snapshot'}
            state['budget_decision']['observed_at'] = budget['snapshot']['observed_at']
            save_json(state_file, state)
        if budget['action'] == 'stop':
            state['budget_stop'] = dict(reason=budget['reason'], at=datetime.datetime.now(datetime.timezone.utc).isoformat())
            save_json(state_file, state)
            release(repo, options)
            return dict(action='stopped', reason=budget['reason'], budget=budget)
    if options['command'] == 'next':
        facts = dict(lock_owned=True, branch_ok=True, worktree_ok=True, layout=layout(repo),
                     compatibility_verified=compatibility_verified(repo), source_counts={}, plans={},
                     commits={}, verification={}, phase_heads={}, verify_tiers={}, test_changes={})
        for number in tracker['phases']:
            record = state.get('phases', {}).get(number)
            if adopted_phase(tracker, number):
                continue
            if not record:
                return dict(action='plan', phase=number, reason='Establish exact phase scope and existing commit evidence', budget=budget)
            facts['source_counts'][number] = len([p for p in record['paths'] if not p.startswith('docs/') and not p.endswith(('.md', '.txt'))])
            facts['verify_tiers'][number] = record['tier']
            facts['test_changes'][number] = any('test' in p.lower() for p in record['paths'])
            facts['phase_heads'][number] = record['source_head']
            if valid_commit(repo, record.get('plan_commit')):
                facts['plans'][number] = record['plan_commit']
            for box_id, commit in record['commits'].items():
                if valid_commit(repo, commit) and box_id in git(repo, 'show', '-s', '--format=%s', commit):
                    facts['commits'][box_id] = commit
            current = source_fingerprint(repo, record['paths'])
            try:
                proof = historical_phase_proof(repo, record, tracker, number) if valid_commit(repo, record.get('bookkeeping')) else phase_proof(repo, record)
                by_project = {r['project']: r for r in proof}
            except ValueError:
                by_project = {}
            if by_project:
                facts['verification'][number] = dict(commit=record['source_head'], tier=record['tier'], exit_code=0,
                    **{key: sum(r[key] for r in by_project.values()) for key in ('passed', 'total', 'skipped')})
            for key in ('qa', 'logbook', 'bookkeeping'):
                if valid_commit(repo, record.get(key)):
                    facts.setdefault(key, {})[number] = record[key]
        if (all(state.get('phases', {}).get(n, {}).get('bookkeeping') for n in tracker['phases'] if not adopted_phase(tracker, n)) and
                saved.get('lane') == 'interactive' and not any(saved.get(k) for k in ('no_commit', 'no_promote', 'stop_at'))):
            try:
                gates = final_gates(repo, state, tracker)
            except ValueError as error:
                return with_budget(dict(action='blocked', reason=str(error)))
            facts.update(reference_exists=True, bugs_clear=True, all_gates_green=True)
            audit = state.get('final_audit', {})
            if audit.get('head') == gates['head'] and audit.get('fingerprint') == source_fingerprint(repo, gates['owned']):
                facts['final_audit'] = audit['head']
        result = next_action(tracker, facts, saved)
        if result['action'] == 'qa-pass':
            record = state['phases'][result['phase']]
            if record.get('pending_qa'):
                result['action'] = 'commit-phase' if record.get('pending_logbook') else 'logbook'
        if saved.get('stop_at') == result['action']:
            result = dict(action='stopped', reason='Explicit stop before ' + result['action'])
        if result['action'] in ('stopped', 'done', 'ask'):
            release(repo, options)
        result['budget'] = budget
        return with_budget(result)
    phase = options.get('phase')
    if phase not in tracker['phases']:
        raise ValueError('Name an existing tracker phase')
    action = {'checkpoint': 'commit-box'}.get(options['command'], options['command'])
    if saved.get('stop_at') == action:
        release(repo, options)
        return with_budget(dict(action='stopped', reason='Explicit step limit; no step writes'))
    phases = state.setdefault('phases', {})
    if options['command'] == 'plan':
        paths = sorted(set(options.get('paths') or []))
        if not paths or not options.get('input_file'):
            raise ValueError('Plan requires exact owned source paths and a grounded plan draft')
        for name in paths:
            migration.checked_path(repo, name)
            if saved['lane'] == 'unattended' and tracker_suffix(name):
                raise ValueError('Rule 24: unattended source scope cannot author peer trackers')
            if name == tracker['path'] or name.endswith('/') or '*' in name or (repo / name).is_dir():
                raise ValueError('Plan requires exact source files, excluding tracker bookkeeping')
        draft = migration.checked_path(repo, options['input_file']).read_text(encoding='utf-8').strip()
        if len(draft) < 20 or '<TBD>' in draft:
            raise ValueError('Plan draft is incomplete')
        old = (repo / tracker['path']).read_text(encoding='utf-8')
        section = phase_section(old, phase)
        tier = re.search(r'(?m)^> verify:\s*(docs|build|unit|integration|e2e)\s*$', section) if section is not None else None
        if not tier:
            raise ValueError('Phase must declare its actual verify tier')
        batched = sorted(set(options.get('batched') or []))
        if not set(batched) <= set(options['projects']) or set(batched) == set(options['projects']):
            raise ValueError('Batched projects must be a strict subset of the declared projects')
        source_dirty = set(git(repo, 'diff', '--name-only').splitlines()) | set(git(repo, 'diff', '--cached', '--name-only').splitlines())
        source_dirty |= set(git(repo, 'ls-files', '--others', '--exclude-standard').splitlines())
        if source_dirty.intersection(paths):
            raise ValueError('Commit a multi-file plan before editing its source paths')
        if tracker['path'] in source_dirty:
            raise ValueError('Plan would mix existing tracker edits; establish their ownership first')
        base = phases.get(phase, {}).get('base', git(repo, 'rev-parse', 'HEAD'))
        text = old.rstrip() + '\n\n## Plan — ' + phase + '\n\n' + draft + '\n\nExact owned files: ' + ', '.join('`' + p + '`' for p in paths) + '.\n'
        migration.atomic_write(repo / tracker['path'], text.encode('utf-8'))
        commit = None if saved.get('no_commit') else scoped_commit(repo, saved,
            'docs(orkest): plan ' + active['key'] + '.' + phase, [tracker['path']], state['session'])
        phases[phase] = dict(paths=paths, projects=options['projects'], batched=batched, base=base, plan_commit=commit,
                             tier=tier.group(1), tests=[], commits={}, source_head=commit or base,
                             tracker_sha256=hashlib.sha256(text.encode('utf-8')).hexdigest())
        save_json(state_file, state)
        return with_budget(dict(action='tdd', committed=bool(commit), commit=commit, preview=bool(saved.get('no_commit'))))
    record = phases.get(phase)
    if not record or (not record.get('plan_commit') and not saved.get('no_commit')):
        raise ValueError('Establish and commit the phase plan/source inventory first')
    current = source_fingerprint(repo, record['paths'])
    if options['command'] in ('qa-pass', 'logbook', 'commit-phase', 'audit', 'promote'):
        return with_budget(boundary_step(repo, options, state, state_file, tracker, record))
    if options['command'] == 'verify':
        project = options['project']
        if project not in record['projects']:
            raise ValueError('Verification project is outside the declared inventory')
        import orkest_gate
        import orkest_prep
        requires = orkest_prep.parse_requires(phase_section((repo / tracker['path']).read_text(encoding='utf-8'), phase) or '')
        skip_budget = options.get('skip_budget')
        if skip_budget is None:
            skip_budget = orkest_prep.declared_skip_budget(requires)
        started_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
        began = time.time()
        gate_id, gate_note = options.get('gate'), None
        if gate_id:
            verdict, output = orkest_gate.ingest(repo, gate_id, sys.modules[__name__])
            command, code = verdict['argv'], verdict['exit_code']
            if str(verdict.get('project')) != str(project) or str(verdict.get('phase')) != str(phase):
                gate_note = 'gate was run for project %s / phase %s, not %s / %s' % (
                    verdict.get('project'), verdict.get('phase'), project, phase)
            elif options['expect'] == 'red' and verdict['outcome'] != 'fail':
                gate_note = 'a red needs a gate that failed on its own (outcome fail), not %s' % verdict['outcome']
            elif verdict['head_at_start'] != git(repo, 'rev-parse', 'HEAD'):
                gate_note = 'gate ran on different source (HEAD moved since it started); rerun it'
            elif not verdict.get('phase_fingerprint'):
                gate_note = 'gate was not started with --phase, so its source cannot be matched; rerun it with --phase'
            elif verdict['phase_fingerprint'] != current:
                gate_note = 'gate ran on different source than the current tree; rerun it'
            elif options['expect'] != 'red' and not verdict['qualifying']:
                gate_note = 'gate verdict is not qualifying: ' + ', '.join(verdict['reasons'] or [verdict['outcome']])
        else:
            orkest_prep.refuse_unless_ready(repo, requires)
            command = json.loads(options.get('command_json') or 'null')
            if not isinstance(command, list) or not command or any(not isinstance(a, str) or not a for a in command):
                raise ValueError('Verification requires a nonempty JSON argument vector')
            if options['timeout'] < 1 or options['timeout'] > 3600:
                raise ValueError('Verification timeout must be 1..3600 seconds')
            try:
                result = subprocess.run(command, cwd=str(repo), capture_output=True, text=True,
                    encoding='utf-8', errors='replace', timeout=options['timeout'], shell=False)
                output, code = result.stdout + result.stderr, result.returncode
            except subprocess.TimeoutExpired as error:
                output, code = str(error), 124
        counts = test_counts(output)
        red = options['expect'] == 'red'
        behavioral = record['tier'] in ('unit', 'integration', 'e2e') or any('test' in p.lower() for p in record['paths'])
        why = []
        if red:
            if not (code != 0 and counts['failed'] > 0 and counts['errors'] == 0 and
                    any(marker in output for marker in ('AssertionError', 'FAIL:', 'assert ', 'Assert.', 'expect('))):
                why.append('red needs a failing assertion, not an error or a crash')
            elif options.get('reason_pattern') and not re.search(options['reason_pattern'], output):
                why.append('red failed, but not for the declared reason (pattern %s did not match)' % options['reason_pattern'])
        else:
            if code != 0:
                why.append('exit code %s' % code)
            if behavioral and counts['passed'] <= 0:
                why.append('no passing tests')
            if counts['failed'] or counts['errors']:
                why.append('%d failed, %d errors' % (counts['failed'], counts['errors']))
            skipped = counts.get('native_skipped', counts['skipped'])
            if skipped > skip_budget:
                why.append('%d skipped exceeds the skip budget %d; name allowed skips with `skip_budget` in the phase '
                           'requires block or pass --skip-budget' % (skipped, skip_budget))
        if gate_note:
            why.append(gate_note)
        if source_fingerprint(repo, record['paths']) != current:
            why.append('phase source changed during verification')
        accepted = not why
        receipt = dict(id=str(uuid.uuid4()), phase=phase, box=options.get('box'), project=project,
            command=command, expected=options['expect'], exit_code=code, accepted=accepted,
            fingerprint=current, commit=git(repo, 'rev-parse', 'HEAD'), skip_budget=skip_budget,
            started_at=started_at, duration_s=round(time.time() - began, 1), **counts)
        if gate_id:
            receipt['gate_id'] = verdict['id']
        if why:
            receipt['reject_reason'] = '; '.join(why)
        receipt['output_sha256'] = hashlib.sha256(output.encode('utf-8')).hexdigest()
        save_json(metadata(repo) / 'receipts' / (receipt['id'] + '.json'), dict(receipt, output=output))
        record['tests'].append(receipt)
        save_json(state_file, state)
        return with_budget(dict(action='tdd' if red else 'commit-box', **receipt))
    box = next((b for b in tracker['boxes'] if b['id'] == options.get('box') and b['phase'] == phase), None)
    if not box:
        raise ValueError('Checkpoint requires an existing box in this phase')
    if box['checked']:
        if not box['done']:
            raise ValueError('Checked box is missing evidence; never infer its completion')
        candidate = options.get('existing_commit') or record['commits'].get(box['id'])
        if not candidate:
            candidates = [sha for sha in git(repo, 'log', '--format=%H', '--fixed-strings', '--grep=' + box['id']).splitlines()
                          if re.search(r'(?<![A-Z0-9_.-])' + re.escape(box['id']) + r'(?![A-Z0-9_.-])',
                                       git(repo, 'show', '-s', '--format=%s', sha))]
            if len(candidates) != 1:
                raise ValueError('Existing box commit is ambiguous; supply its actual full --existing-commit SHA')
            candidate = candidates[0]
        if not valid_commit(repo, candidate) or not re.search(r'(?<![A-Z0-9_.-])' + re.escape(box['id']) + r'(?![A-Z0-9_.-])',
                                                          git(repo, 'show', '-s', '--format=%s', candidate)):
            raise ValueError('Existing commit must be an ancestor with this exact box ID in its subject')
        changed = set(git(repo, 'diff-tree', '--no-commit-id', '--name-only', '-r', candidate).splitlines())
        if not changed.intersection(record['paths']):
            raise ValueError('Existing box commit does not change declared phase source files')
        record['commits'][box['id']] = candidate
        record['source_head'] = git(repo, 'rev-parse', 'HEAD')
        parent = git(repo, 'rev-parse', candidate + '^', optional=True)
        if parent and subprocess.run(['git', '-C', str(repo), 'merge-base', '--is-ancestor', parent, record['base']], capture_output=True).returncode == 0:
            record['base'] = parent
        save_json(state_file, state)
        return with_budget(dict(action='continue', committed=False, imported=True, commit=candidate))
    if box['human']:
        raise ValueError('Checkpoint requires an existing non-human box in this phase')
    recent = {r['project']: r for r in record['tests'] if r['fingerprint'] == current}
    green = [r for r in recent.values() if r['accepted'] and r['expected'] == 'green' and r['box'] == box['id']]
    # Batched (expensive) projects are proven once per phase by phase_proof, never skipped.
    required = set(record['projects']) - set(record.get('batched', []))
    if not required <= set(r['project'] for r in green):
        raise ValueError('Missing fresh green verification for every declared per-box project')
    if record['tier'] in ('unit', 'integration', 'e2e'):
        red = [r for r in record['tests'] if r['accepted'] and r['expected'] == 'red' and r['box'] == box['id']]
        if not red or not any(r['command'] == g['command'] and r['project'] == g['project'] and
                              record['tests'].index(r) < record['tests'].index(g) for r in red for g in green):
            raise ValueError('Behavior checkpoint needs an executed assertion red before green')
    paths = sorted(set(options.get('paths') or []))
    if not paths or not set(paths).issubset(record['paths']):
        raise ValueError('Checkpoint paths must be exact files from the phase ownership inventory')
    dirty = set(git(repo, 'diff', '--name-only').splitlines()) | set(git(repo, 'diff', '--cached', '--name-only').splitlines())
    dirty |= set(git(repo, 'ls-files', '--others', '--exclude-standard').splitlines())
    if (dirty.intersection(record['paths']) - set(paths)):
        raise ValueError('Verified phase source changes are missing from this checkpoint scope')
    if saved.get('no_commit'):
        release(repo, options)
        return with_budget(dict(action='stopped', committed=False, preview=True, reason='No-commit cannot earn a checked checkpoint'))
    path = repo / tracker['path']
    old = path.read_text(encoding='utf-8')
    if hashlib.sha256(old.encode('utf-8')).hexdigest() != record['tracker_sha256']:
        raise ValueError('Tracker changed outside this checkpoint; review ownership before committing')
    proof = '; '.join(' '.join(r['command']) + ': ' + str(r['passed']) + '/' + str(r['total']) +
                      ' passed, skipped=' + str(r['skipped']) + ', output sha256=' + r['output_sha256'] for r in green)
    text, count = re.subn(r'(?m)^- \[ \] (' + re.escape(box['id']) + r'\b[^\n]*)',
        lambda match: '- [x] ' + match.group(1) + ' — evidence: ' + proof, old)
    if count != 1:
        raise ValueError('Box identity is not an unambiguous unchecked line')
    text = re.sub(r'(?m)^> Updated:.*$', '> Updated: ' + datetime.date.today().isoformat(), text)
    migration.atomic_write(path, text.encode('utf-8'))
    try:
        commit = scoped_commit(repo, saved, ('docs' if record['tier'] == 'docs' else 'feat') + '(orkest): ' + box['id'] + ' verified checkpoint\n\n' + proof,
                               paths + [tracker['path']], state['session'])
    except (ValueError, OSError):
        migration.atomic_write(path, old.encode('utf-8'))
        raise
    record['commits'][box['id']] = commit
    record['source_head'] = commit
    record['tracker_sha256'] = hashlib.sha256(text.encode('utf-8')).hexdigest()
    save_json(state_file, state)
    return with_budget(dict(action='continue', committed=True, commit=commit, box=box['id']))


def source_fingerprint(repo, paths):
    return {name: hashlib.sha256(migration.checked_path(repo, name).read_bytes()).hexdigest()
            if (repo / name).is_file() else None for name in paths}


def valid_commit(repo, commit):
    if not isinstance(commit, str) or not re.fullmatch(r'[0-9a-f]{40}', commit):
        return False
    result = subprocess.run(['git', '-C', str(repo), 'merge-base', '--is-ancestor', commit, 'HEAD'], capture_output=True)
    return result.returncode == 0


def phase_proof(repo, record, head=None):
    current = source_fingerprint(repo, record['paths'])
    by_project = {}
    for receipt in record['tests']:
        if receipt['fingerprint'] == current and receipt['commit'] == (head or record['source_head']):
            by_project[receipt['project']] = receipt
    if (set(by_project) != set(record['projects']) or
            any(not r['accepted'] or r['expected'] != 'green' for r in by_project.values())):
        raise ValueError('Require fresh committed-source verification for every touched project')
    return list(by_project.values())


def historical_phase_proof(repo, record, tracker, phase):
    """Completed phases keep their committed QA snapshot as later phases evolve files."""
    path = record.get('report_path') or 'docs/orkest/qa/' + (tracker['id'] or Path(tracker['path']).stem) + '-' + phase + '.json'
    report = json.loads(git(repo, 'show', record['bookkeeping'] + ':' + path))
    tests = report.get('tests', [])
    if (report.get('source_head') != record['source_head'] or
            set(r.get('project') for r in tests) != set(record['projects']) or
            any(not r.get('accepted') or r.get('expected') != 'green' or r.get('commit') != record['source_head'] for r in tests)):
        raise ValueError('Committed historical phase report is incomplete')
    return tests


def logbook_draft(repo, name):
    draft = read_json(migration.checked_path(repo, name or ''), {})
    for key in ('accomplished', 'decisions', 'blockers', 'next'):
        entries = draft.get(key)
        if not isinstance(entries, list) or not entries or any(not isinstance(v, str) or not v.strip() or '<TBD>' in v for v in entries):
            raise ValueError('Logbook draft requires four grounded nonempty section lists')
    return draft


def logbook_path(repo):
    """Legacy logbook stays in use until the layout move commits (Rule 1)."""
    facts = layout(repo)
    if facts['layout'] == 'mixed' and tracked_logbook(repo):
        return 'docs/orkest/LOGBOOK.md'  # the real history is already there; a stray legacy file must not grow
    return 'docs/LOGBOOK.md' if facts['layout'] in ('old', 'mixed') else 'docs/orkest/LOGBOOK.md'


def tracked_logbook(repo):
    return bool(git(repo, 'ls-files', '--', 'docs/orkest/LOGBOOK.md').strip())


def simple(repo, options):
    """Genuinely simple work: no tracker, yet executed verification, exact-path commit and logbook."""
    repo = migration.repository(repo)
    if lane(options) == 'unattended':
        raise ValueError('Rule 24: the simple route is a person-invoked interactive action')
    title = re.sub(r'\s+', ' ', options.get('title') or '').strip()
    if not 3 <= len(title) <= 120:
        raise ValueError('Simple work needs a one-line title of 3-120 characters')
    paths = sorted(set(options.get('paths') or []))
    if not paths or not options.get('input_file') or not options.get('command_json'):
        raise ValueError('Simple route requires exact paths, a logbook draft and a verification command')
    for name in paths:
        migration.checked_path(repo, name)
        if (name.endswith(('-IMPL.md', '-ORK.md')) or name.startswith('docs/orkest/') or name in ('docs/LOGBOOK.md', 'docs/CONTEXT.md')
                or name.endswith('/') or '*' in name or (repo / name).is_dir()):
            raise ValueError('Simple route takes exact source/document files; tracker or state work needs a tracker run')
    source = [p for p in paths if not p.startswith('docs/') and not p.endswith(('.md', '.txt'))]
    if len(source) > 2:
        raise ValueError('More than two source files is not simple work; bootstrap a tracker')
    tier = options.get('tier') or ('docs' if not source else 'unit')
    if tier == 'docs' and source:
        raise ValueError('Docs tier cannot cover source changes')
    behavioral = tier in ('unit', 'integration', 'e2e')
    if any('test' in p.lower() for p in paths) and not behavioral:
        raise ValueError('Test changes require executed behavioral verification')
    kind = 'docs' if tier == 'docs' else (options.get('type') or 'fix')
    draft = logbook_draft(repo, options.get('input_file'))
    command = json.loads(options['command_json'])
    if not isinstance(command, list) or not command or any(not isinstance(a, str) or not a for a in command):
        raise ValueError('Verification requires a nonempty JSON argument vector')
    timeout = options.get('timeout') or 600
    if timeout < 1 or timeout > 3600:
        raise ValueError('Verification timeout must be 1..3600 seconds')
    preflight(repo, None, options)
    import orkest_budget
    budget = orkest_budget.check(repo, options, sys.modules[__name__])
    if budget['action'] == 'stop':
        return dict(action='stopped', reason=budget['reason'], budget=budget)
    if options.get('dry'):
        return dict(action='stopped', reason='Dry run; no verification, writes or locks', paths=paths)
    log = logbook_path(repo)
    dirty = set(git(repo, 'diff', '--name-only').splitlines()) | set(git(repo, 'diff', '--cached', '--name-only').splitlines())
    dirty |= set(git(repo, 'ls-files', '--others', '--exclude-standard').splitlines())
    if log in dirty:
        raise ValueError('Existing logbook edits need ownership first: ' + log)
    session = acquire(repo, dict(path='<simple>'), options)
    options['session'] = session
    try:
        result = subprocess.run(command, cwd=str(repo), capture_output=True, text=True,
            encoding='utf-8', errors='replace', timeout=timeout, shell=False)
        output, code = result.stdout + result.stderr, result.returncode
    except subprocess.TimeoutExpired as error:
        output, code = str(error), 124
    counts = test_counts(output)
    accepted = code == 0 and counts['failed'] == 0 and counts['errors'] == 0 and (not behavioral or counts['passed'] > 0)
    receipt = dict(id=str(uuid.uuid4()), route='simple', title=title, paths=paths, tier=tier, command=command,
        expected='green', exit_code=code, accepted=accepted, fingerprint=source_fingerprint(repo, paths),
        commit=git(repo, 'rev-parse', 'HEAD'), **counts)
    receipt['output_sha256'] = hashlib.sha256(output.encode('utf-8')).hexdigest()
    save_json(metadata(repo) / 'receipts' / (receipt['id'] + '.json'), dict(receipt, output=output))
    if not accepted:
        raise ValueError('Verification did not pass (exit ' + str(code) + '); nothing committed, receipt ' + receipt['id'])
    proof = (' '.join(command) + ': ' + str(counts['passed']) + '/' + str(counts['total']) + ' passed, skipped=' +
             str(counts['skipped']) + ', exit 0, output sha256=' + receipt['output_sha256'])
    if options.get('no_commit'):
        release(repo, options)
        return dict(action='stopped', committed=False, preview=True, receipt=receipt,
                    reason='No-commit preview; verification executed, nothing written')
    date = datetime.date.today().isoformat()
    path = migration.checked_path(repo, log)
    before = path.read_bytes() if path.is_file() else None
    text = (before.decode('utf-8') if before is not None else '# Logbook\n').rstrip() + '\n\n## ' + date + ' — simple: ' + title + '\n'
    sections = dict(draft)
    sections['accomplished'] = list(draft['accomplished']) + ['Verified: ' + proof]
    for key in ('accomplished', 'decisions', 'blockers', 'next'):
        text += '\n### ' + key.capitalize() + '\n\n' + ''.join('- ' + item + '\n' for item in sections[key])
    try:
        migration.atomic_write(path, text.encode('utf-8'))
        commit = scoped_commit(repo, options, kind + '(orkest): simple — ' + title + '\n\n' + proof, paths + [log], session)
    except (ValueError, OSError):
        if before is None:
            path.unlink(missing_ok=True)
        else:
            migration.atomic_write(path, before)
        raise
    release(repo, options)
    return dict(action='done', committed=True, commit=commit, receipt=receipt, logbook=log, budget=budget)


def adopted_phase(tracker, phase):
    boxes = [b for b in tracker['boxes'] if b['phase'] == phase]
    return bool(boxes) and all(b['adopted'] for b in boxes)


def adopt_evidence(repo, ref):
    """One evidence reference: a commit that is an ancestor of HEAD, or a tracked file (optionally #anchor)."""
    ref = ref.strip()
    if not ref or ';' in ref or '\n' in ref:
        raise ValueError('Evidence must be a git sha or a repository path, one per --evidence')
    if re.fullmatch(r'[0-9a-fA-F]{7,40}', ref):
        full = git(repo, 'rev-parse', '--verify', '--quiet', ref + '^{commit}', optional=True)
        if full:
            if subprocess.run(['git', '-C', str(repo), 'merge-base', '--is-ancestor', full, 'HEAD'],
                              capture_output=True).returncode:
                raise ValueError('Evidence commit is not an ancestor of HEAD: ' + ref)
            return full
    name = ref.split('#', 1)[0]
    path = migration.checked_path(repo, name)
    if not path.is_file() or not git(repo, 'ls-files', '--', name):
        raise ValueError('Evidence is neither an ancestor commit nor a tracked file: ' + ref)
    return ref


def adopt_green(repo, receipt_id):
    """A saved verify receipt that is an accepted green on the current source of the files it fingerprinted."""
    if not re.fullmatch(r'[0-9a-f-]{8,36}', receipt_id or ''):
        raise ValueError('--green needs a verify receipt id')
    folder = metadata(repo) / 'receipts'
    found = sorted(folder.glob(receipt_id + '*.json')) if folder.is_dir() else []
    if len(found) != 1:
        raise ValueError('No single verify receipt matches --green ' + receipt_id)
    receipt = json.loads(found[0].read_text(encoding='utf-8'))
    if not receipt.get('accepted') or receipt.get('expected') != 'green' or not receipt.get('box'):
        raise ValueError('--green ' + receipt_id + ' is not an accepted per-box green verification')
    fingerprint = receipt.get('fingerprint') or {}
    if not fingerprint or source_fingerprint(repo, list(fingerprint)) != fingerprint:
        raise ValueError('--green ' + receipt_id + ' ran on different source than the current tree; rerun verify')
    return receipt


def adopt(repo, options):
    """Accept boxes that shipped before the helper existed: a person's act, never new work. A ticked box needs
    evidence; an unticked one also needs a fresh accepted green verify receipt for that exact box (--green)."""
    if lane(options) == 'unattended':
        raise ValueError('Rule 24: adopt is a person-invoked interactive action; the unattended lane never adopts')
    repo = migration.repository(repo)
    query = ' '.join(options.get('query') or []).strip()
    who = (options.get('accepted_by') or '').strip()
    if not query:
        raise ValueError('adopt needs the tracker path or id')
    if not re.fullmatch(r'[A-Za-z0-9_.-]{1,64}', who):
        raise ValueError('adopt needs --accepted-by <operator handle>: the person who accepts this work')
    refs = options.get('evidence') or []
    if not refs:
        raise ValueError('adopt needs --evidence <git sha | tracked receipt/audit path> (repeatable)')
    if sum([bool(options.get('box')), bool(options.get('phase')), bool(options.get('all'))]) != 1:
        raise ValueError('adopt needs exactly one of --box <ID>, --phase <N>, --all')
    reason = (options.get('reason') or '').strip()
    if ';' in reason or '\n' in reason:
        raise ValueError('--reason must be one line without semicolons')
    evidence = ', '.join(dict.fromkeys(adopt_evidence(repo, r) for r in refs))
    query = query.replace('\\', '/')
    tracker = next((t for t in discover(repo) if query in (t['path'], t['id']) or Path(t['path']).name == query
                    or t['path'].endswith('/' + query)), None)
    if not tracker or tracker['lifecycle'] != 'live':
        raise ValueError('adopt target is not a live tracker: ' + query)
    if tracker['errors']:
        raise ValueError('Invalid tracker: ' + '; '.join(tracker['errors']))
    greens = {}
    for receipt_id in options.get('green') or []:
        receipt = adopt_green(repo, receipt_id)
        if receipt['box'] in greens:
            raise ValueError('Two --green receipts for one box: ' + receipt['box'])
        greens[receipt['box']] = receipt
    by_id = {b['id']: b for b in tracker['boxes']}
    for box_id in greens:
        if box_id not in by_id:
            raise ValueError('--green receipt is for a box this tracker does not have: ' + box_id)
        if by_id[box_id]['checked'] or by_id[box_id]['human']:
            raise ValueError('--green is only for an unticked non-human box: ' + box_id)
    if options.get('box'):
        box = by_id.get(options['box'])
        if not box:
            raise ValueError('No such box: ' + options['box'])
        if not box['checked'] and box['id'] not in greens:
            raise ValueError('Refusing to adopt an unticked box without a fresh green: ' + box['id'] +
                             ' (run `verify --box ' + box['id'] + ' --expect green`, then pass --green <receipt id>)')
        if box['done']:
            raise ValueError('Box already carries ' + ('adoption' if box['adopted'] else 'helper evidence') + ': ' + box['id'])
        chosen = [box]
    else:
        scope = [b for b in tracker['boxes'] if options.get('all') or b['phase'] == options['phase']]
        if not scope:
            raise ValueError('No boxes in the selected phase')
        chosen = [b for b in scope if (b['checked'] or b['id'] in greens) and not b['done']]
        if not chosen:
            raise ValueError('No ticked box without evidence in the selection')
    if set(greens) - set(b['id'] for b in chosen):
        raise ValueError('--green receipt outside the selection: ' + ', '.join(sorted(set(greens) - set(b['id'] for b in chosen))))
    preflight(repo, tracker, options)
    date = datetime.date.today().isoformat()
    def suffix_for(box_id):
        green = greens.get(box_id)
        extra = (', green receipt %s (%s/%s passed)' % (green['id'][:8], green.get('passed'), green.get('total'))
                 if green else '')
        return (' — adopted ' + date + ' by ' + who + ': shipped before the helper; evidence ' + evidence + extra +
                ('; reason: ' + reason if reason else ''))
    suffix = suffix_for(None)
    ids = [b['id'] for b in chosen]
    if options.get('dry'):
        return dict(action='stopped', reason='Dry run; adopt writes nothing', would_adopt=ids, suffix=suffix,
                    would_tick=sorted(greens))
    log = logbook_path(repo)
    dirty = git(repo, 'status', '--porcelain', '--untracked-files=all', '--', tracker['path'], log)
    if dirty:
        raise ValueError('Adopt would mix existing edits: ' + dirty)
    path = migration.checked_path(repo, tracker['path'])
    old = path.read_text(encoding='utf-8')
    text = old
    for box_id in ids:
        mark = r'[ ]' if box_id in greens else r'[xX]'
        text, count = re.subn(r'(?m)^- \[' + mark + r'\] (' + re.escape(box_id) + r'\b[^\n]*?)[ \t]*$',
                              lambda m: '- [x] ' + m.group(1) + suffix_for(box_id), text)
        if count != 1:
            raise ValueError('Box identity is not an unambiguous ' + ('unticked' if box_id in greens else 'ticked') +
                             ' line: ' + box_id)
    text = re.sub(r'(?m)^> Updated:.*$', '> Updated: ' + date, text)
    reparsed = parse_tracker(text, tracker['path'])
    if reparsed['errors'] or any(not b['adopted'] for b in reparsed['boxes'] if b['id'] in ids):
        raise ValueError('Adopted suffix did not round-trip through the tracker parser')
    logpath = migration.checked_path(repo, log)
    before = logpath.read_bytes() if logpath.is_file() else None
    entry = ('\n\n## ' + date + ' — Adopt ' + (tracker['id'] or tracker['title']) + ' (' + str(len(ids)) + ' boxes)\n\n'
             '### Accomplished\n\n- Adopted ' + str(len(ids)) + ' boxes that shipped before the helper: ' +
             ', '.join(ids) + ('; ticked on a fresh green: ' + ', '.join(sorted(greens)) if greens else '') + '.\n\n'
             '### Decisions\n\n- ' + who + ' accepted them; evidence ' + evidence + ('; reason: ' + reason if reason else '') +
             '. Adopt never applies to new work.\n\n'
             '### Blockers\n\n- None.\n\n### Next\n\n- Promote only after the remaining boxes are earned and audited.\n')
    session = acquire(repo, tracker, options)
    options['session'] = session
    try:
        migration.atomic_write(path, text.encode('utf-8'))
        migration.atomic_write(logpath, ((before.decode('utf-8') if before is not None else '# Logbook\n').rstrip() + entry).encode('utf-8'))
        commit = scoped_commit(repo, options, 'docs(orkest): adopt ' + str(len(ids)) + ' boxes in ' +
                               (tracker['id'] or tracker['title']) + '\n\nAccepted by ' + who + '; evidence ' + evidence +
                               '\nBoxes: ' + ', '.join(ids), [tracker['path'], log], session)
    except (ValueError, OSError):
        migration.atomic_write(path, old.encode('utf-8'))
        if before is None:
            logpath.unlink(missing_ok=True)
        else:
            migration.atomic_write(logpath, before)
        release(repo, options)
        raise
    release(repo, options)
    return dict(action='done', committed=True, commit=commit, adopted=ids, evidence=evidence, logbook=log)


def boundary_step(repo, options, state, state_file, tracker, record):
    command, phase = options['command'], options['phase']
    saved, session = state['options'], state['session']
    if command in ('audit', 'promote'):
        return final_step(repo, options, state, state_file, tracker)
    boxes = [b for b in tracker['boxes'] if b['phase'] == phase]
    if any(not b['done'] or not (b['adopted'] or valid_commit(repo, record['commits'].get(b['id']))) for b in boxes):
        raise ValueError('Phase boundary requires evidenced boxes and actual source commits')
    proof = phase_proof(repo, record)
    if command == 'qa-pass':
        helper = subprocess.run([sys.executable, '-X', 'utf8', str(BIN / 'workflow-git.py'), 'audit-diff',
            '--repo', str(repo), '--base', record['base'], '--paths', *record['paths'], tracker['path']],
            capture_output=True, text=True, encoding='utf-8', errors='replace')
        if helper.returncode:
            raise ValueError(helper.stdout + helper.stderr)
        diff = json.loads(helper.stdout)
        findings = []
        if not any('test' in path.lower() for path in record['paths']) and record['tier'] in ('unit', 'integration', 'e2e'):
            findings.append('No test file appears in the declared source inventory; review regression coverage.')
        report = dict(schema=1, phase=phase, base=record['base'], source_head=record['source_head'],
            audited_head=git(repo, 'rev-parse', 'HEAD'), source_fingerprint=source_fingerprint(repo, record['paths']),
            diff_sha256=hashlib.sha256(helper.stdout.encode('utf-8')).hexdigest(),
            owned_paths=record['paths'], tests=proof, findings=findings,
            working_diff_present=bool(diff['working_diff']), untracked=diff['untracked'])
        if diff['working_diff'] or diff['untracked']:
            raise ValueError('Phase-owned source or tracker edits remain before QA')
        record['pending_qa'] = report
        save_json(state_file, state)
        return dict(action='logbook', findings=findings, committed=False)
    report = record.get('pending_qa')
    if (not report or report['source_head'] != record['source_head'] or
            report['source_fingerprint'] != source_fingerprint(repo, record['paths'])):
        raise ValueError('Run QA on the current committed phase source first')
    if command == 'logbook':
        draft = logbook_draft(repo, options.get('input_file'))
        record['pending_logbook'] = draft
        save_json(state_file, state)
        return dict(action='commit-phase', committed=False)
    if command != 'commit-phase':
        raise ValueError('Final audit and promotion require the final-gate procedure')
    draft = record.get('pending_logbook')
    if not draft:
        raise ValueError('Append-only phase logbook draft is missing')
    date = datetime.date.today().isoformat()
    title = (tracker['id'] or Path(tracker['path']).stem) + '.' + phase
    state_label = 'Executed, unverified preview' if saved.get('no_commit') else 'Shipped'
    writes = {}
    for name, text in [('docs/CONTEXT.md', state_label + ' ' + title + '; source ' + record['source_head'] + ', executed tests and QA recorded.'),
                       ('docs/TODO.md', title + ' — ' + state_label + '; continue the next runnable phase.')]:
        path = migration.checked_path(repo, name)
        old = path.read_text(encoding='utf-8') if path.exists() else '# ' + Path(name).stem + '\n'
        writes[name] = old.rstrip() + '\n\n- ' + text + '\n'
    target = tracker['path']
    old = (repo / target).read_text(encoding='utf-8')
    text = re.sub(r'(?m)^(\|\s*[^|\n]+\.' + re.escape(phase) + r'\s*\|)[^|\n]*',
                  lambda match: match.group(1) + ' ' + state_label + ' ', old)
    text = re.sub(r'(?m)^> Updated:.*$', '> Updated: ' + date, text)
    writes[target] = text.rstrip() + '\n\n### Phase ' + phase + ' QA — ' + date + '\n\n' + (
        'Advisory findings: ' + '; '.join(report['findings']) if report['findings'] else 'No mechanical QA findings.') + '\n'
    log = 'docs/LOGBOOK.md' if state.get('migration_pending') and not tracked_logbook(repo) else 'docs/orkest/LOGBOOK.md'
    path = migration.checked_path(repo, log)
    prefix = path.read_text(encoding='utf-8') if path.exists() else '# Logbook\n'
    writes[log] = prefix.rstrip() + '\n\n## ' + date + ' — ' + title + '\n'
    for key in ('accomplished', 'decisions', 'blockers', 'next'):
        writes[log] += '\n### ' + key.capitalize() + '\n\n' + ''.join('- ' + item + '\n' for item in draft[key])
    report_path = record.get('report_path') or 'docs/orkest/qa/' + (tracker['id'] or Path(target).stem) + '-' + phase + '.json'
    writes[report_path] = json.dumps(report, indent=2, ensure_ascii=False) + '\n'
    dirty = set(git(repo, 'diff', '--name-only').splitlines()) | set(git(repo, 'diff', '--cached', '--name-only').splitlines())
    dirty |= set(git(repo, 'ls-files', '--others', '--exclude-standard').splitlines())
    if dirty.intersection(writes):
        raise ValueError('Phase bookkeeping would mix existing edits: ' + ', '.join(sorted(dirty.intersection(writes))))
    before = {name: (repo / name).read_bytes() if (repo / name).is_file() else None for name in writes}
    try:
        for name, content in writes.items():
            migration.atomic_write(migration.checked_path(repo, name), content.encode('utf-8'))
        commit = None if saved.get('no_commit') else scoped_commit(repo, saved,
            'docs(orkest): ' + title + ' QA and phase bookkeeping', list(writes), session)
    except (ValueError, OSError):
        for name, content in before.items():
            if content is None:
                (repo / name).unlink(missing_ok=True)
            else:
                migration.atomic_write(repo / name, content)
        raise
    if commit:
        record.update(qa=commit, logbook=commit, bookkeeping=commit, report_path=report_path,
                      tracker_sha256=hashlib.sha256(writes[target].encode('utf-8')).hexdigest())
    save_json(state_file, state)
    return dict(action='continue' if commit else 'stopped', committed=bool(commit), commit=commit)


def final_gates(repo, state, tracker):
    if state.get('migration_pending') or layout(repo)['needs_migration']:
        raise ValueError('Complete the pending layout migration before promotion')
    if any(not box['done'] for box in tracker['boxes']):
        raise ValueError('Promotion requires every box evidenced and complete')
    head = git(repo, 'rev-parse', 'HEAD')
    proofs, owned, earned_phases = [], {tracker['path']}, []
    for phase in tracker['phases']:
        if adopted_phase(tracker, phase):
            continue  # every box accepted by a person; no phase record exists to demand
        earned_phases.append(phase)
        record = state.get('phases', {}).get(phase, {})
        if not record or any(not valid_commit(repo, record.get(key)) for key in ('qa', 'logbook', 'bookkeeping')):
            raise ValueError('Every phase needs committed QA/logbook/bookkeeping')
        for box in (b for b in tracker['boxes'] if b['phase'] == phase and not b['adopted']):
            commit = record['commits'].get(box['id'])
            if not valid_commit(repo, commit) or box['id'] not in git(repo, 'show', '-s', '--format=%s', commit):
                raise ValueError('Missing actual checkpoint commit for ' + box['id'])
        proofs.extend(phase_proof(repo, record, head=head))
        owned.update(record['paths'])
    spec = importlib.util.spec_from_file_location('orkest_promotion_runtime', BIN / 'promote-check.py')
    checker = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(checker)
    payload = (dict(commit=head, **{key: sum(r[key] for r in proofs) for key in ('passed', 'total', 'skipped')})
               if proofs else None)  # an all-adopted tracker has no fresh run; use the rail, never fake counts
    feature = tracker_stem(tracker['path'])
    rows = checker.promote_check(repo, tracker['id'] or feature, verify_payload=payload)
    blocks = [text for level, text in rows if level == 'block']
    if blocks:
        raise ValueError('; '.join(blocks))
    reference = 'docs/reference/' + feature.lower() + '.md'
    owned.update(['docs/CONTEXT.md', 'docs/TODO.md', 'docs/README.md', 'docs/CAPABILITIES.md',
                  'docs/orkest/LOGBOOK.md', reference])
    owned.update(state['phases'][phase].get('report_path') or 'docs/orkest/qa/' + (tracker['id'] or Path(tracker['path']).stem) + '-' + phase + '.json'
                 for phase in earned_phases)
    dirty = git(repo, 'status', '--porcelain', '--untracked-files=all', '--', *sorted(owned))
    if dirty:
        raise ValueError('Commit feature-owned implementation/reference/bookkeeping before final audit: ' + dirty)
    adopted = sum(1 for b in tracker['boxes'] if b['adopted'])
    return dict(head=head, owned=sorted(owned), reference=reference, rows=rows, proofs=proofs,
                adopted=adopted, earned=len(tracker['boxes']) - adopted)


def final_step(repo, options, state, state_file, tracker):
    saved = state['options']
    if (saved.get('lane') == 'unattended' or saved.get('no_commit') or saved.get('no_promote') or
            not saved.get('person_invoked') or not saved.get('default_run')):
        release(repo, options)
        return dict(action='stopped', committed=False, reason='Invocation/lane withholds promotion')
    gates = final_gates(repo, state, tracker)
    if options['command'] == 'audit':
        draft = migration.checked_path(repo, options.get('input_file') or '').read_text(encoding='utf-8').strip()
        if len(draft) < 80 or '<TBD>' in draft or '___' in draft:
            raise ValueError('Final audit requires a grounded source/reference review, delegated when available')
        state['final_audit'] = dict(head=gates['head'], report=draft,
            fingerprint=source_fingerprint(repo, gates['owned']))
        save_json(state_file, state)
        return dict(action='promote', committed=False, gates=gates['rows'], adopted=gates['adopted'], earned=gates['earned'])
    audit = state.get('final_audit', {})
    if audit.get('head') != gates['head'] or audit.get('fingerprint') != source_fingerprint(repo, gates['owned']):
        raise ValueError('Final audit is missing or stale; audit the final committed state')
    source = tracker['path']
    destination = 'docs/orkest/done/' + Path(source).name
    if migration.checked_path(repo, destination).exists():
        raise ValueError('Archived tracker destination already exists')
    mapping = {source: destination}
    writes = {}
    for name in git(repo, 'ls-files').splitlines():
        if name.endswith('.md'):
            text = migration.checked_path(repo, name).read_text(encoding='utf-8')
            new_name = mapping.get(name, name)
            rewritten = migration.rewrite_links(text, name, new_name, mapping)
            if rewritten != text or new_name != name:
                writes[new_name] = rewritten
    name = tracker['title'] if tracker['id'] else tracker_stem(source)
    link = '[' + (tracker['id'] or name) + ': ' + name + '](orkest/done/' + Path(source).name + ')'
    for path, heading in [('docs/CONTEXT.md', 'Completed implementation'), ('docs/TODO.md', 'Completed'),
                          ('docs/README.md', 'Completed trackers'), ('docs/CAPABILITIES.md', 'Verified capability')]:
        target = migration.checked_path(repo, path)
        old = writes.get(path, target.read_text(encoding='utf-8') if target.exists() else '# ' + Path(path).stem + '\n')
        writes[path] = old.rstrip() + '\n\n## ' + heading + '\n\n- ' + link + ' — implemented, tested and promoted.\n'
    log = 'docs/orkest/LOGBOOK.md'
    old = writes.get(log, (repo / log).read_text(encoding='utf-8'))
    writes[log] = old.rstrip() + '\n\n## ' + datetime.date.today().isoformat() + ' — Promote ' + name + '\n\n' + (
        '### Accomplished\n\n- Archived the evidenced tracker after fresh tests and final audit.\n'
        '- Boxes: ' + str(gates['earned']) + ' earned by the helper, ' + str(gates['adopted']) +
        ' adopted (shipped before the helper, accepted by a person).\n\n'
        '### Decisions\n\n- The person-invoked default run authorized this promotion.\n\n'
        '### Blockers\n\n- No remaining promotion gate.\n\n'
        '### Next\n\n- Review the promotion commit and reference when needed.\n')
    audit_path = 'docs/orkest/audits/' + (tracker['id'] or name) + '.md'
    writes[audit_path] = audit['report'] + '\n'
    scope = sorted(set(gates['owned']) | set(writes) | {source, destination})
    dirty = git(repo, 'status', '--porcelain', '--untracked-files=all', '--', *scope)
    if dirty:
        raise ValueError('Promotion would mix existing edits: ' + dirty)
    before = {path: (repo / path).read_bytes() if (repo / path).is_file() else None for path in writes}
    original_source = (repo / source).read_bytes()
    (repo / destination).parent.mkdir(parents=True, exist_ok=True)
    git(repo, 'mv', '--', source, destination)
    try:
        for path, text in writes.items():
            migration.atomic_write(migration.checked_path(repo, path), text.encode('utf-8'))
        commit = scoped_commit(repo, saved, 'docs(orkest): promote ' + (tracker['id'] or name) + ': ' + name +
                               '\n\nBoxes: ' + str(gates['earned']) + ' earned, ' + str(gates['adopted']) + ' adopted',
                               sorted(set(writes) | {source, destination}), state['session'])
    except (ValueError, OSError):
        # workflow-git restores the incoming index; undo only our own move/writes.
        git(repo, 'mv', '--', destination, source)
        migration.atomic_write(repo / source, original_source)
        for path, content in before.items():
            if path == destination:
                continue
            if content is None:
                (repo / path).unlink(missing_ok=True)
            else:
                migration.atomic_write(repo / path, content)
        raise
    required = [destination, gates['reference'], 'docs/CONTEXT.md', 'docs/TODO.md',
                'docs/README.md', 'docs/CAPABILITIES.md', log, audit_path]
    result = subprocess.run([sys.executable, '-X', 'utf8', str(BIN / 'workflow-git.py'), 'check-complete',
        '--repo', str(repo), '--commit', commit, '--paths', *scope, '--required', *required],
        capture_output=True, text=True, encoding='utf-8', errors='replace')
    if result.returncode:
        raise ValueError('Promotion commit exists but completeness failed: ' + result.stdout + result.stderr)
    state['promotion_commit'] = commit
    save_json(state_file, state)
    release(repo, options)
    import orkest_prep
    dirty = orkest_prep.dirty_report(status_raw(repo), state.get('baseline_status', ''), owned_paths(state, tracker['path']))
    return dict(action='done', committed=True, commit=commit, complete=True, earned=gates['earned'],
                adopted=gates['adopted'], dirty_files=dirty['counts'],
                dirty_note=dirty['note'] if dirty['total'] else None)


def test_counts(output):
    """Read actual runner summaries; an unrecognized success is never test proof."""
    result = dict(total=0, passed=0, skipped=0, failed=0, errors=0)
    unit = re.search(r'Ran (\d+) tests? in ', output)
    if unit:
        result['total'] = int(unit.group(1))
        labels = {label.strip(): int(number) for label, number in re.findall(r'([a-z][a-z ]*)=(\d+)', output)}
        result['native_skipped'] = labels.get('skipped', 0)
        result['expected_failed'] = labels.get('expected failures', 0)
        result['unexpected_successes'] = labels.get('unexpected successes', 0)
        result['failed'] = labels.get('failures', 0) + result['unexpected_successes']
        result['errors'] = labels.get('errors', 0)
        # Verification exclusions include expected failures; retain native categories too.
        result['skipped'] = result['native_skipped'] + result['expected_failed']
        result['passed'] = max(0, result['total'] - sum(result[k] for k in ('failed', 'errors', 'skipped')))
        # Python 3.12.1+ leaves skipped tests out of "Ran N", so the subtraction above undercounts passes.
        # Per-test marks mean the same on every version: the progress line (. s F E x u) or verbose "... ok".
        head = output[:unit.start()]
        marks = ''.join(re.findall(r'(?m)^([.sFExu]+)\s*$', head))
        verbose_ok = len(re.findall(r'(?m) \.\.\. ok\s*$', head))
        if marks and marks.count('s') == result['native_skipped']:
            result['passed'] = marks.count('.')
            result['total'] = max(result['total'], len(marks))
        elif verbose_ok:
            result['passed'] = verbose_ok
            result['total'] = max(result['total'], sum(result[k] for k in ('passed', 'failed', 'errors', 'skipped')))
    else:
        for source, target in [('passed', 'passed'), ('failed', 'failed'), ('skipped', 'skipped'), ('errors?', 'errors')]:
            match = re.search(r'(\d+) ' + source + r'\b', output)
            result[target] = int(match.group(1)) if match else 0
        result['native_skipped'] = result['skipped']
        for source, target in [('xfailed', 'expected_failed'), ('xpassed', 'unexpected_passed')]:
            match = re.search(r'(\d+) ' + source + r'\b', output)
            result[target] = int(match.group(1)) if match else 0
        result['skipped'] += result['expected_failed']
        result['passed'] += result['unexpected_passed']
        result['total'] = sum(result[k] for k in ('passed', 'failed', 'skipped', 'errors'))
        dotnet = re.search(r'Failed:\s*(\d+),\s*Passed:\s*(\d+),\s*Skipped:\s*(\d+),\s*Total:\s*(\d+)', output)
        if dotnet:
            result = dict(zip(('failed', 'passed', 'skipped', 'total'), map(int, dotnet.groups())), errors=0)
    return result


CONTINUE = ('plan', 'bootstrap', 'tdd', 'commit-box', 'verify', 'qa-pass', 'logbook', 'commit-phase', 'audit', 'promote')


def guide(repo, command, result):
    """Say the exact next helper call, so an agent cannot mistake `start` for the whole run."""
    action = result.get('action')
    if command not in ('start', 'next') or action not in CONTINUE:
        return result
    base = 'python -X utf8 ' + str(Path(__file__).resolve()) + ' --repo ' + str(migration.repository(repo))
    if action == 'bootstrap':
        call = base + ' bootstrap --input-file <draft.json>'
    elif action == 'plan' and result.get('phase'):
        call = base + ' plan --phase ' + str(result['phase'])
    else:
        call = base + ' next'
    note = ('Run next_command. Edits, plain git commits and ticked boxes outside the plan, checkpoint, verify '
            'and commit-phase steps leave this run with no evidence.')
    return dict(result, next_command=call, note=note)


def record_metric(args, started, code, result):
    """Best-effort NDJSON line for this helper call; never raises and never writes the working tree."""
    if args.command == 'metrics' or args.dry:
        return
    try:
        import orkest_prep
        repo = migration.repository(args.repo)
        if not metadata(repo).is_dir():
            return  # a refused or read-only call on a repo with no run state writes nothing at all
        orkest_prep.append_metric(metadata(repo), dict(
            ts=datetime.datetime.now(datetime.timezone.utc).isoformat(), command=args.command,
            duration_s=round(time.time() - started, 2), exit=code, phase=args.phase, box=args.box,
            session=session_id(vars(args)), harness=args.harness,
            accepted=result.get('accepted') if isinstance(result, dict) else None))
    except Exception:
        pass


def owned_paths(state, tracker_path):
    owned = {tracker_path, 'docs/orkest/LOGBOOK.md', 'docs/CONTEXT.md', 'docs/TODO.md'} if tracker_path else set()
    for record in (state.get('phases') or {}).values():
        owned.update(record.get('paths', []))
    return owned


def active_state(repo):
    active = read_json(metadata(repo) / 'active.json', {})
    return read_json(state_path(repo, active['key']), {}) if active.get('key') else {}


def dirty_command(repo):
    import orkest_prep
    repo = migration.repository(repo)
    state = active_state(repo)
    report = orkest_prep.dirty_report(status_raw(repo), state.get('baseline_status', ''), owned_paths(state, state.get('target')))
    return dict(action='dirty-report', run_recorded=bool(state), **report)


def prerequisites(repo, options):
    import orkest_prep
    repo = migration.repository(repo)
    state = active_state(repo)
    path = options.get('input_file') or state.get('target')
    if not path:
        raise ValueError('Name the tracker with --input-file or start a run first')
    text = migration.checked_path(repo, path).read_text(encoding='utf-8')
    section = phase_section(text, options['phase']) if options.get('phase') else text
    requires = orkest_prep.parse_requires(section or text)
    if not requires:
        return dict(action='preflight', ok=True, missing=[], checked=0, note='No requires block declared')
    return dict(orkest_prep.check(repo, requires), action='preflight')


def report_command(repo):
    """The verdict-first skeleton for the final report; every line derives from a recorded fact."""
    import orkest_gate
    repo = migration.repository(repo)
    runtime = sys.modules[__name__]
    gates = orkest_gate.listing(repo, runtime)
    last = gates[-1] if gates else None
    if last is None:
        head = 'VERDICT: NONE (no gate recorded; say which commands were executed and their counts)'
    elif last['state'] == 'running':
        head = 'VERDICT: PENDING gate %s; run: %s' % (last['id'], last['next_command'])
    else:
        counts = last.get('counts') or {}
        head = 'VERDICT: %s gate %s qualifying=%s passed %s / failed %s / errors %s / skipped %s reasons: %s' % (
            last['outcome'].upper(), last['id'], 'yes' if last['qualifying'] else 'no', counts.get('passed'),
            counts.get('failed'), counts.get('errors'), counts.get('skipped'), ', '.join(last.get('reasons') or []) or 'none')
    dirty = dirty_command(repo)
    lines = [head, 'dirty_files: %d owned-uncommitted, %d pre-existing, %d appeared during the run' % (
        dirty['counts']['owned_uncommitted'], dirty['counts']['preexisting'], dirty['counts']['foreign_new']),
        'unresolved: <failing gates, human boxes, pending inputs>', '---', 'PROGRESS (not evidence): <free text>',
        'NEXT: <one exact command>']
    return dict(action='report', skeleton='\n'.join(lines), gates=gates, dirty=dirty['counts'])


def attach_gates(repo, command, result):
    """Live gates and unacknowledged verdicts ride along on startup and `next`, so a resumed session sees them."""
    if command not in ('inspect', 'start', 'next') or not isinstance(result, dict):
        return result
    try:
        import orkest_gate
        live = orkest_gate.live_summary(migration.repository(repo), sys.modules[__name__])
    except (ValueError, OSError):
        return result
    if not live:
        return result
    result = dict(result, gates=live)
    if command == 'next' and result.get('action') in ('verify', 'tdd', 'commit-box', 'qa-pass'):
        for gate in live:
            if gate.get('state') == 'running' and gate.get('phase') == result.get('phase'):
                return dict(result, action='wait-gate', gate=gate['id'], next_command=gate['next_command'],
                            reason='A gate for this phase is running; wait for its verdict instead of starting another run')
    return result


def summary(result):
    """Short view of an inspect/start result; the full document stays the default."""
    target = (result.get('resolution') or {}).get('target') or {}
    resolution = result.get('resolution') or {}
    keep = {key: result[key] for key in ('action', 'reason', 'session', 'branch', 'dirty', 'next_command', 'note')
            if key in result}
    keep['resolution'] = dict(action=resolution.get('action'), reason=resolution.get('reason'),
                              target={key: target.get(key) for key in ('id', 'path', 'status') if key in target})
    layout_info = result.get('layout') or {}
    keep['layout'] = {key: layout_info[key] for key in ('supported', 'needs_migration') if key in layout_info}
    return keep


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['inspect', 'start', 'release', 'bootstrap', 'plan', 'verify', 'checkpoint', 'next',
                                          'qa-pass', 'logbook', 'commit-phase', 'audit', 'promote', 'doctor', 'budget', 'simple', 'recover-lock',
                                          'gate', 'preflight', 'dirty-report', 'report', 'tiers', 'pinscan', 'metrics', 'adopt'])
    parser.add_argument('query', nargs='*')
    parser.add_argument('--repo', default='.')
    parser.add_argument('--summary', action='store_true', help='short inspect/start output (default is the full document)')
    parser.add_argument('--dry', action='store_true')
    parser.add_argument('--no-commit', action='store_true')
    parser.add_argument('--no-promote', action='store_true')
    parser.add_argument('--stop-at', choices=['bootstrap', 'plan', 'tdd', 'commit-box', 'verify',
                        'qa-pass', 'logbook', 'commit-phase', 'audit', 'promote'])
    parser.add_argument('--lane', choices=['interactive', 'unattended'], default='interactive')
    parser.add_argument('--own-branch')
    parser.add_argument('--session')
    parser.add_argument('--name')
    parser.add_argument('--input-file')
    parser.add_argument('--phase')
    parser.add_argument('--all', action='store_true', help='adopt: every ticked box without evidence')
    parser.add_argument('--evidence', action='append', help='adopt: ancestor git sha or tracked receipt/audit path (repeatable)')
    parser.add_argument('--accepted-by', help='adopt: the operator handle accepting this work')
    parser.add_argument('--reason', help='adopt: one-line reason recorded with the adoption')
    parser.add_argument('--green', action='append', help='adopt: accepted fresh green verify receipt id for an unticked box '
                        '(repeatable; from `verify --box ID --expect green`)')
    parser.add_argument('--box')
    parser.add_argument('--existing-commit')
    parser.add_argument('--paths', nargs='+')
    parser.add_argument('--projects', nargs='+', default=['.'])
    parser.add_argument('--batched', nargs='*', default=[])
    parser.add_argument('--project', default='.')
    parser.add_argument('--expect', choices=['red', 'green'], default='green')
    parser.add_argument('--command-json')
    parser.add_argument('--timeout', type=int, default=600)
    parser.add_argument('--reason-pattern', help='verify --expect red: the failure output must match this regex')
    parser.add_argument('--gate-json', help='tiers: the ordered tiers and projects file')
    parser.add_argument('--jobs', type=int, default=1, help='tiers: projects run in parallel inside a tier')
    parser.add_argument('--only-failed', action='store_true', help='tiers: rerun only what failed last time')
    parser.add_argument('--reuse', action='store_true', help='tiers: carry forward projects whose watched paths are unchanged')
    parser.add_argument('--change-kind', choices=['route', 'file', 'tool', 'migration', 'enum', 'dependency',
                                                  'response-shape', 'rename'], help='pinscan: what the box changes')
    parser.add_argument('--symbols', help='pinscan: comma-separated identifiers the box adds or removes')
    parser.add_argument('--list-guards', action='store_true', help='pinscan: enumerate guard-class tests')
    parser.add_argument('--gate', help='verify: ingest this finished gate verdict instead of running a command')
    parser.add_argument('--skip-budget', type=int, default=None,
                        help='verify/gate: skipped tests allowed (default 0, or the phase requires block)')
    parser.add_argument('--strict', action='store_true', help='gate: passed>0 and skips within budget')
    parser.add_argument('--live', action='store_true', help='gate list: only running or unacknowledged')
    parser.add_argument('--replace', action='store_true', help='gate run: cancel a live run of the same name')
    parser.add_argument('--deadline-s', type=int, default=None)
    parser.add_argument('--idle-s', type=int, default=None)
    parser.add_argument('--max-s', type=float, default=None, help='gate wait: longest block in seconds (default 240)')
    parser.add_argument('--max-wait', type=float, default=240, help='gate run: foreground wait before returning running')
    parser.add_argument('--title')
    parser.add_argument('--type', choices=['feat', 'polish', 'fix', 'refactor', 'docs', 'test'])
    parser.add_argument('--tier', choices=['docs', 'build', 'unit', 'integration', 'e2e'])
    parser.add_argument('--tier-name', help='tiers: run up to and including this tier (default: all tiers without "when")')
    parser.add_argument('--fix', action='store_true')
    parser.add_argument('--confirm-inactive', action='store_true')
    parser.add_argument('--template')
    parser.add_argument('--harness', choices=['claude-code', 'codex', 'grok'])
    parser.add_argument('--session-report')
    parser.add_argument('--native-doctor-report')
    parser.add_argument('--grace-hours', type=float, help='doctor git: how long a finished lane is left alone (default 24)')
    parser.add_argument('--sibling', action='append', help='doctor git: another repository to include')
    parser.add_argument('--skip-link', action='append', metavar='FILE',
                        help='doctor --fix: leave every link proposal in FILE alone (repeatable)')
    parser.add_argument('--accept-link', action='append', metavar='FILE=DESTINATION',
                        help='doctor --fix: also apply the reported (not automatic) proposal for FILE (repeatable)')
    parser.add_argument('--trunk', help='doctor git: the integration branch lanes are measured against')
    parser.add_argument('--verify', action='store_true', help='doctor git: also prove each worktree clean (slow on large trees)')
    argv = list(sys.argv[1:] if argv is None else argv)
    gate_command = []
    if 'gate' in argv and '--' in argv and argv.index('gate') < argv.index('--'):  # after -- is the gated command
        split = argv.index('--')
        argv, gate_command = argv[:split], argv[split + 1:]
    args = parser.parse_args(argv)
    args.gate_command = gate_command
    started_clock = time.time()
    if (args.fix or args.template or args.session_report or args.native_doctor_report) and args.command != 'doctor':
        parser.error('--fix, --template and diagnostic report options are doctor options')
    git_scope = args.command == 'doctor' and args.query == ['git']
    if args.command == 'doctor' and args.query and not git_scope:
        parser.error('doctor does not accept a feature description (only the scope: doctor git)')
    if (args.grace_hours is not None or args.sibling or args.trunk or args.verify) and not git_scope:
        parser.error('--grace-hours, --sibling, --trunk and --verify are doctor git options')
    if git_scope and args.fix:
        parser.error('doctor git is report-only in this release; --fix does not apply to it')
    if args.summary and args.command not in ('inspect', 'start', 'doctor'):
        parser.error('--summary applies to inspect, start and doctor')
    if (args.skip_link or args.accept_link) and (args.command != 'doctor' or git_scope):
        parser.error('--skip-link and --accept-link are doctor options')
    if (args.title or args.type or args.tier) and args.command != 'simple':
        parser.error('--title, --type and --tier are simple-route options')
    try:
        if git_scope:
            import orkest_forks
            result = orkest_forks.run(migration.repository(args.repo), vars(args))
            result['table'] = orkest_forks.table(result)
        elif args.command == 'doctor':
            import orkest_doctor
            result = orkest_doctor.run(args.repo, vars(args), sys.modules[__name__])
        elif args.command == 'budget':
            import orkest_budget
            result = orkest_budget.check(migration.repository(args.repo), vars(args), sys.modules[__name__])
        elif args.command == 'release':
            result = release(args.repo, vars(args))
        elif args.command == 'recover-lock':
            result = recover_locks(args.repo, vars(args))
        elif args.command == 'gate':
            import orkest_gate
            result = orkest_gate.command(migration.repository(args.repo), vars(args), sys.modules[__name__])
        elif args.command == 'preflight':
            result = prerequisites(args.repo, vars(args))
        elif args.command == 'tiers':
            import orkest_tiers
            sub = args.query[0] if args.query else 'run'
            if not args.gate_json:
                raise ValueError('tiers needs --gate-json <file>')
            repo = migration.repository(args.repo)
            plan = orkest_tiers.load_plan(migration.checked_path(repo, args.gate_json))
            if sub == 'plan':
                result = dict(action='tiers-plan', tiers=[dict(name=t['name'], projects=t['projects'], budget_s=t.get('budget_s'),
                                                                 when=t.get('when')) for t in plan['tiers']],
                              selected=[t['name'] for t in orkest_tiers.select_tiers(plan, args.tier_name)])
            elif sub == 'run':
                return orkest_tiers.run(repo, plan, dict(tier=args.tier_name, jobs=args.jobs, only_failed=args.only_failed,
                                                        reuse=args.reuse), sys.modules[__name__])
            else:
                raise ValueError('tiers subcommands: plan, run')
        elif args.command == 'pinscan':
            import orkest_pinscan
            repo = migration.repository(args.repo)
            if args.list_guards:
                result = dict(action='pinscan-guards', **orkest_pinscan.list_guards(repo))
            else:
                if not args.change_kind:
                    raise ValueError('pinscan needs --change-kind')
                result = dict(action='pinscan', **orkest_pinscan.scan(
                    repo, args.change_kind, paths=args.paths, symbols=[s for s in (args.symbols or '').split(',') if s],
                    summary=args.summary))
        elif args.command == 'metrics':
            import orkest_prep
            result = dict(action='metrics', **orkest_prep.summarize_metrics(metadata(migration.repository(args.repo)), args.harness))
        elif args.command == 'dirty-report':
            result = dirty_command(args.repo)
        elif args.command == 'report':
            result = report_command(args.repo)
        elif args.command == 'bootstrap':
            result = bootstrap(args.repo, vars(args))
        elif args.command == 'simple':
            result = simple(args.repo, vars(args))
        elif args.command == 'adopt':
            result = adopt(args.repo, vars(args))
        elif args.command in ('plan', 'verify', 'checkpoint', 'next', 'qa-pass', 'logbook', 'commit-phase', 'audit', 'promote'):
            result = run_step(args.repo, vars(args))
        else:
            operation = start if args.command == 'start' else inspect
            result = operation(args.repo, ' '.join(args.query), vars(args))
        result = guide(args.repo, args.command, result)
        result = attach_gates(args.repo, args.command, result)
        if args.summary and args.command in ('inspect', 'start'):
            result = summary(result)
        elif args.summary and args.command == 'doctor' and not git_scope:
            import orkest_doctor
            result = orkest_doctor.summarize(result)
        record_metric(args, started_clock, 0, result)
        print(json.dumps(result, ensure_ascii=False))
        if args.command == 'pinscan' and result.get('stale'):
            return 2
        return 2 if args.command == 'preflight' and not result.get('ok') else 0
    except (ValueError, OSError) as error:
        if args.command not in ('inspect', 'release', 'doctor', 'budget', 'recover-lock', 'gate', 'preflight',
                                'dirty-report', 'report', 'tiers', 'pinscan', 'metrics', 'adopt') and not args.dry \
                and not (args.command == 'verify' and args.gate):
            try:
                release(args.repo, vars(args))
            except (ValueError, OSError):
                pass  # A failed preflight never releases somebody else's writer lock.
        record_metric(args, started_clock, 2, None)
        print(json.dumps(dict(action='blocked', reason=str(error))))
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
