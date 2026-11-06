"""Plan and apply a single-repository tracker layout migration; dry-run by default."""
import argparse
import datetime
import hashlib
import json
import os
import platform
from pathlib import Path, PurePosixPath
import posixpath
import re
import subprocess
import sys
import tempfile
from urllib.parse import quote, unquote, urlsplit, urlunsplit

sys.path.insert(0, str(Path(__file__).resolve().parent))  # python -I drops the script directory
from orkest_core import (ID, KEY_FILE, allocate_id, id_number, parse_tracker, read_key, tracker_filename, tracker_key,
                         tracker_stem, tracker_suffix)


def git(repo, *args):
    result = subprocess.run(['git', '-C', str(repo), '--literal-pathspecs', *args],
                            capture_output=True, text=True, encoding='utf-8', errors='replace')
    if result.returncode:
        raise ValueError(result.stderr.strip() or 'git failed')
    return result.stdout.rstrip('\r\n')


def repository(repo):
    root = Path(repo).resolve()
    if Path(git(root, 'rev-parse', '--show-toplevel')).resolve() != root:
        raise ValueError('Invoke migration at the repository root')
    return root


def checked_path(root, name):
    path = PurePosixPath(name)
    if (path.is_absolute() or '..' in path.parts or ':' in name or not path.parts
            or path.parts[0] == '.git'):
        raise ValueError('Unsafe migration path: ' + name)
    target = root / name
    try:
        target.resolve().relative_to(root)
    except ValueError:
        raise ValueError('Migration path escapes repository: ' + name)
    for part in (target, *target.parents):
        if part == root:
            break
        if part.is_symlink():
            raise ValueError('Symlink migration path: ' + name)
    return target


def digest(data):
    return hashlib.sha256(data).hexdigest()


def identity(text):
    if not text.startswith('---\n'):
        return None
    end = text.find('\n---', 4)
    if end < 0:
        raise ValueError('Unclosed tracker frontmatter')
    header = text[4:end]
    keys = re.findall(r'(?m)^id:.*$', header)
    if not keys:
        return None
    if len(keys) != 1:
        raise ValueError('Duplicate tracker id keys')
    match = re.fullmatch(r'id:\s*[\'\"]?(' + ID + r')[\'\"]?\s*', keys[0])
    if not match or id_number(match.group(1)) == 0:
        raise ValueError('Invalid tracker id')
    return match.group(1)


def tracker_content(text, tracker_id, name):
    if text.startswith('---\n'):
        end = text.find('\n---', 4)
        if end < 0:
            raise ValueError('Unclosed tracker frontmatter')
        header = re.sub(r'(?m)^id:.*\n?', '', text[4:end])
        text = '---\nid: ' + tracker_id + '\n' + header.rstrip() + '\n---' + text[end + 4:]
    else:
        text = '---\nid: ' + tracker_id + '\n---\n' + text
    text, count = re.subn(r'(?m)^# [^\n]+$', '# ' + tracker_id + ': ' + name, text, count=1)
    if not count:
        raise ValueError('Tracker needs an H1 before migration')
    return text


LOCK_STALE_HOURS = 8.0


def lock_info(lock, text, now=None):
    """Who holds a lock, how long it has shown no activity, and whether it may be recovered.

    Activity is the lock's heartbeat field, else its file time. A lock idle past the window
    (ORKEST_LOCK_STALE_HOURS, default 8) on this host is stale: its owner stopped working.
    A lock stamped by another host is never judged stale from here."""
    fields = dict(re.findall(r'(?m)^([a-z_]+):\s*(\S+)', text))
    now = now or datetime.datetime.now(datetime.timezone.utc)
    stamp = None
    try:
        stamp = datetime.datetime.fromisoformat(fields['heartbeat'])
    except (KeyError, ValueError):
        pass
    if stamp is None:
        stamp = datetime.datetime.fromtimestamp(lock.stat().st_mtime, datetime.timezone.utc)
    if stamp.tzinfo is None:
        stamp = stamp.replace(tzinfo=datetime.timezone.utc)
    try:
        hours = float(os.environ.get('ORKEST_LOCK_STALE_HOURS') or LOCK_STALE_HOURS)
    except ValueError:
        hours = LOCK_STALE_HOURS
    idle = max(0.0, (now - stamp).total_seconds())
    foreign_host = bool(fields.get('host')) and fields['host'] != platform.node().replace(' ', '_')
    return dict(fields=fields, idle=idle, hours=hours, foreign_host=foreign_host,
                stale=idle > hours * 3600 and not foreign_host)


def session_title(session):
    """The Claude Code title of a session id, when its transcript folder is on this machine."""
    try:
        for found in (Path.home() / '.claude' / 'projects').glob('*/' + session + '/custom-title.json'):
            return json.loads(found.read_text(encoding='utf-8')).get('customTitle')
    except (OSError, ValueError):
        pass
    return None


def lock_tracker(lock):
    """The tracker stem a legacy `.<name>-IMPL.lock` / `-ORK.lock` guards, casefolded."""
    name = lock.name[1:-len('.lock')]
    return re.sub(r'(?i)-(impl|ork)$', '', name).casefold()


def writer_locks(root, session=None, target=None):
    """Foreign writer locks that apply to `target` (None: every lock), as (path, info) pairs.

    The repository run lock always applies. A tracker lock applies to its own tracker, to
    structural work with no tracker, and to repository-wide work (target None)."""
    session = session or os.environ.get('CODEX_SESSION_ID') or os.environ.get('CLAUDE_CODE_SESSION_ID')
    stem = tracker_stem(target) if target else None
    locks = []
    for pattern in ('.*-IMPL.lock', '.*-ORK.lock'):
        locks.extend(root.glob(pattern))
        if (root / 'docs').is_dir():
            locks.extend((root / 'docs').rglob(pattern))
    git_dir = Path(git(root, 'rev-parse', '--absolute-git-dir')).resolve()
    run_lock = git_dir / 'orkest/run.lock'
    if run_lock.exists():
        try:
            run_lock.resolve().relative_to(git_dir)
        except ValueError:
            raise ValueError('Run lock escapes worktree metadata')
        locks.append(run_lock)
    found = []
    for lock in locks:
        if lock != run_lock:
            lock = checked_path(root, lock.relative_to(root).as_posix())
            if stem and lock_tracker(lock) != stem.casefold():
                continue
        text = lock.read_text(encoding='utf-8')
        owner = re.search(r'(?m)^session:\s*(\S+)', text)
        if session and owner and owner.group(1) == session:
            continue
        found.append((lock, lock_info(lock, text)))
    return found


def recover_lock(root, lock, info, reason):
    """Remove an abandoned lock and leave a record of whose it was and why it went."""
    git_dir = Path(git(root, 'rev-parse', '--absolute-git-dir')).resolve()
    log = git_dir / 'orkest/recovered-locks.log'
    log.parent.mkdir(parents=True, exist_ok=True)
    holder = ' '.join(key + '=' + info['fields'][key] for key in ('session', 'target', 'started', 'heartbeat')
                      if key in info['fields'])
    with log.open('a', encoding='utf-8') as handle:
        handle.write(datetime.datetime.now(datetime.timezone.utc).isoformat() + ' recovered ' + lock.name +
                     ' idle=' + str(int(info['idle'] / 60)) + 'm ' + reason + ' ' + holder + '\n')
    lock.unlink()


def check_writer_locks(root, session=None, target=None, recover=False):
    """Refuse while another live writer holds a lock; a stale one is recovered (writes) or ignored (reads)."""
    for lock, info in writer_locks(root, session, target):
        if info['stale']:
            if recover:
                recover_lock(root, lock, info, 'stale')
            continue
        fields = info['fields']
        holder = ', '.join(key + ' ' + fields[key] for key in ('session', 'target', 'started') if key in fields)
        title = session_title(fields['session']) if 'session' in fields else None
        if title:
            holder += ', titled "' + title + '"'
        raise ValueError('Another writer lock is held: ' + str(lock) + (' (' + holder + ')' if holder else '') +
                         '; last activity ' + str(int(info['idle'] / 60)) + ' min ago' +
                         (' on host ' + fields['host'] if info['foreign_host'] else '') +
                         '. If that session is still running, wait for it. A lock idle over ' + format(info['hours'], 'g') +
                         ' h is recovered automatically; if you know the owner is gone, run: python bin/orkest.py '
                         '--repo . recover-lock --confirm-inactive')


def rewrite_links(text, old_file, new_file, mapping, tracked=None):
    """Rebase incoming and outgoing Markdown links, preserving anchors and URL data.

    With `tracked`, a link that names no tracked file from its own folder but names a moved
    file from the repository root (the roadmap convention) follows the move in that form."""
    def rewrite(value):
        parsed = urlsplit(value)
        if parsed.scheme or parsed.netloc or not parsed.path:
            return value
        rooted = parsed.path.startswith('/')
        target = posixpath.normpath(unquote(parsed.path).lstrip('/') if rooted else
                                    posixpath.join(posixpath.dirname(old_file), unquote(parsed.path)))
        from_root = posixpath.normpath(unquote(parsed.path))
        if (tracked is not None and not rooted and target not in mapping and target not in tracked and
                from_root in mapping):
            return urlunsplit(('', '', quote(mapping[from_root], safe='/._~-'), parsed.query, parsed.fragment))
        destination = mapping.get(target, target)
        if old_file == new_file and destination == target:
            return value
        relative = '/' + destination if rooted else posixpath.relpath(destination, posixpath.dirname(new_file) or '.')
        return urlunsplit(('', '', quote(relative, safe='/._~-'), parsed.query, parsed.fragment))

    def inline(match):
        value = match.group(1)
        if value.startswith('<') and '>' in value:
            end = value.index('>')
            return '](' + '<' + rewrite(value[1:end]) + '>' + value[end + 1:] + ')'
        pieces = value.split(' ', 1)
        return '](' + rewrite(pieces[0]) + (' ' + pieces[1] if len(pieces) > 1 else '') + ')'
    text = re.sub(r'\]\(([^)\n]+)\)', inline, text)
    text = re.sub(r'(?m)^(\[[^]\n]+\]:\s*)(\S+)',
                  lambda m: m.group(1) + rewrite(m.group(2)), text)
    # Roadmap node fields (`impl:`, `ref:`) always name files from the repository root.
    return re.sub(r'(?m)^(\s*(?:-\s+)?(?:impl|ref):\s*)(\S+)\s*$',
                  lambda m: m.group(1) + mapping.get(posixpath.normpath(m.group(2)), m.group(2)), text)


def build_plan(repo, session=None):
    root = repository(repo)
    check_writer_locks(root, session)
    if git(root, 'status', '--porcelain', '--untracked-files=all'):
        raise ValueError('Migration requires a clean tree, including the index and untracked files')
    tracked = sorted(filter(None, git(root, 'ls-files', '-z').split('\0')))
    # Check boundaries before reading any candidate, including directory junctions.
    for name in tracked:
        if name.endswith('.md') or name.startswith('docs/orkest/'):
            checked_path(root, name)
    marker = root / 'docs/orkest/.layout'
    if marker.exists():
        value = marker.read_text(encoding='utf-8').strip()
        if value != '1':
            raise ValueError('Unsupported or invalid layout version: ' + value)
    key_path = root / KEY_FILE
    key = read_key(key_path.read_text(encoding='utf-8')) if key_path.exists() else None
    counter_path = root / 'docs/orkest/.next-id'
    counter = 1
    if counter_path.exists():
        raw = counter_path.read_text(encoding='utf-8').strip()
        if not raw.isdigit() or int(raw) < 1 or key is None and int(raw) > 1000000:
            raise ValueError('Invalid next-id counter')
        counter = int(raw)
    documents = {name: checked_path(root, name).read_text(encoding='utf-8')
                 for name in tracked if name.endswith('.md')}
    old = [name for name in documents if tracker_suffix(name) == '-IMPL.md' and
           (len(PurePosixPath(name).parts) == 2 and name.startswith('docs/') or
            name.startswith('docs/impl/'))]
    existing = [name for name in documents if name.startswith('docs/orkest/') and
                tracker_suffix(name) in ('-ORK.md', '.imp.md')]
    mapping, moves, deletions, writes, assigned = {}, [], [], {}, {}
    used = set()
    stubs = {}
    for name in old[:]:
        match = re.fullmatch(r'> Moved to \[[^]]+\]\(([^)]+)\)[^\n]*\n?\s*', documents[name])
        if match:
            target = posixpath.normpath(posixpath.join(posixpath.dirname(name), match.group(1)))
            if target not in old:
                raise ValueError('Unresolved legacy tracker stub: ' + name)
            stubs[name] = target
            old.remove(name)
    for name in existing + old:
        tracker_id = identity(documents[name])
        if name in existing:
            parsed = parse_tracker(documents[name], name)
            if parsed['errors']:
                raise ValueError('Invalid existing ORK tracker: ' + name + ': ' + '; '.join(parsed['errors']))
        if tracker_id:
            if any(id_number(other) == id_number(tracker_id) for other in used):
                raise ValueError('Duplicate tracker id: ' + tracker_id)
            used.add(tracker_id)
            assigned[name] = tracker_id
            counter = max(counter, id_number(tracker_id) + 1)
    for name in old:
        description = re.sub(r'[^A-Z0-9_-]', '_', tracker_stem(name).upper())
        if not re.fullmatch(r'[A-Z][A-Z0-9_-]*', description):
            raise ValueError('Invalid tracker description: ' + name)
        parts = PurePosixPath(name).parts
        lifecycle = ('planned' if 'planned' in parts[2:-1] else
                     'parked' if 'parked' in parts[2:-1] else
                     'done' if name.startswith('docs/impl/') else '')
        folder = 'docs/orkest/' + (lifecycle + '/' if lifecycle else '')
        destination = folder + tracker_filename(description)
        checked_path(root, destination)
        # A same-folder tracker with any suffix and the same casefolded description collides.
        taken = [other for other in [*existing, *mapping.values()]
                 if posixpath.dirname(other) + '/' == folder and tracker_key(other) == tracker_key(destination)]
        if destination in tracked or taken or (root / destination).exists():
            raise ValueError('Migration destination collision: ' + destination)
        if name not in assigned:
            allocation = allocate_id(counter, used, key)
            assigned[name], counter = allocation['id'], allocation['next_counter']
            used.add(assigned[name])
        mapping[name] = destination
        moves.append(dict(source=name, destination=destination, kind='tracker', id=assigned[name]))
        writes[destination] = tracker_content(documents[name], assigned[name], description)
    for name in tracked:
        if name == 'docs/LOGBOOK.md' or name.startswith('docs/handoffs/'):
            destination = name.replace('docs/', 'docs/orkest/', 1)
            checked_path(root, destination)
            if name == 'docs/LOGBOOK.md' and destination in tracked and destination in documents \
                    and destination not in mapping.values():
                # A session on an older layout appended to the legacy logbook after the layout moved:
                # fold its entries into the real one instead of refusing, and keep every byte.
                stray = documents[name]
                body = re.sub(r'\A#[^\n]*\n+', '', stray, count=1).strip('\n')
                kept = documents[destination].rstrip('\n')
                writes[destination] = kept + ('\n\n' + body if body else '') + '\n'
                mapping[name] = destination
                deletions.append(name)
                continue
            if destination in tracked or destination in mapping.values() or (root / destination).exists():
                raise ValueError('Migration destination collision: ' + destination)
            mapping[name] = destination
            moves.append(dict(source=name, destination=destination, kind='record'))
    for name, target in stubs.items():
        mapping[name] = mapping[target]
        deletions.append(name)
    link_mapping = dict(mapping)
    registry_path = checked_path(root, 'harness-registry.json')
    upgrade_path = checked_path(root, 'orkest-upgrade.json')
    if registry_path.is_file() and upgrade_path.is_file():
        registry = json.loads(registry_path.read_text(encoding='utf-8-sig'))
        upgrade = json.loads(upgrade_path.read_text(encoding='utf-8-sig'))
        projections = [registry['authoring']] + [p for h in registry['harnesses'] for p in h['roots']]
        for projection in dict.fromkeys(projections):
            destination = projection + '/orkest/SKILL.md'
            if not checked_path(root, destination).is_file():
                continue
            for retired in upgrade.get('legacy_skills', {}):
                source = projection + '/' + retired + '/SKILL.md'
                if not checked_path(root, source).exists():
                    link_mapping[source] = destination
    tracked_set = set(tracked)
    for name, text in documents.items():
        if name in deletions:
            continue
        destination = mapping.get(name, name)
        # Rule 10's parked/planned legacy bodies deliberately retain docs-root links.
        link_base = ('docs/' + PurePosixPath(name).name if name in old and
                     any(name.startswith('docs/impl/' + state + '/') for state in ('planned', 'parked'))
                     else name)
        content = rewrite_links(writes.get(destination, text), link_base, destination, link_mapping, tracked_set)
        if destination != name or content != text:
            writes[destination] = content
    local_moves = []
    if old or existing or moves:
        for name, content in [('docs/orkest/.next-id', str(counter) + '\n'),
                              ('docs/orkest/.layout', '1\n')]:
            checked_path(root, name)
            if not (root / name).is_file() or (root / name).read_text(encoding='utf-8') != content:
                writes[name] = content
        # Ignored local handoffs follow the layout outside the commit, and the ignore rules
        # follow them; otherwise they are stranded as legacy documents or surface as untracked.
        if '.gitignore' in tracked:
            text = checked_path(root, '.gitignore').read_bytes().decode('utf-8')
            lines = text.splitlines(keepends=True)
            present = {line.strip() for line in lines}
            kept = []
            for line in lines:
                moved = re.sub(r'^(!?/?)docs/handoffs(?=/|[ \t\r\n]*$)', r'\1docs/orkest/handoffs', line)
                if moved == line or moved.strip() not in present:
                    kept.append(moved)
            rewritten = ''.join(kept)
            if rewritten != text:
                writes['.gitignore'] = rewritten
        ignored = git(root, 'ls-files', '--others', '--ignored', '--exclude-standard', '-z', '--', 'docs/handoffs')
        for name in sorted(filter(None, ignored.split('\0'))):
            destination = name.replace('docs/', 'docs/orkest/', 1)
            checked_path(root, name)
            checked_path(root, destination)
            if destination in tracked or destination in mapping.values() or (root / destination).exists():
                raise ValueError('Local handoff destination collision: ' + destination)
            local_moves.append(dict(source=name, destination=destination))
    scope = sorted(set(writes) | set(mapping) | set(mapping.values()) | set(deletions))
    if not scope:
        local_moves = []
    before = {name: digest((root / name).read_bytes()) if (root / name).is_file() else None
              for name in scope}
    plan = dict(schema=1, repo=str(root), base=git(root, 'rev-parse', 'HEAD'),
                branch=git(root, 'symbolic-ref', '--short', 'HEAD'), moves=moves,
                deletions=deletions, writes=writes, before=before, paths=scope,
                local_moves=local_moves, next_counter=counter)
    plan['transaction'] = digest(json.dumps(plan, sort_keys=True).encode('utf-8'))[:20]
    return plan


def journal_path(root):
    # Git supplies the per-worktree metadata directory, including linked worktrees.
    return Path(git(root, 'rev-parse', '--absolute-git-dir')) / 'orkest-migration.json'


def atomic_write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=str(path.parent), prefix='.orkest-', delete=False) as handle:
        temporary = Path(handle.name)
        handle.write(data)
    try:
        os.replace(str(temporary), str(path))
    finally:
        temporary.unlink(missing_ok=True)


def changed_paths(root):
    values = git(root, 'status', '--porcelain=v1', '-z', '--untracked-files=all').split('\0')
    result, index = set(), 0
    while index < len(values):
        value = values[index]
        index += 1
        if not value:
            continue
        result.add(value[3:])
        if 'R' in value[:2] or 'C' in value[:2]:
            if index < len(values):
                result.add(values[index])
                index += 1
    return result


def validate_transaction(root, plan, resuming):
    if plan.get('schema') != 1 or plan.get('repo') != str(root):
        raise ValueError('Migration plan belongs to another repository or schema')
    scope = set(plan['paths'])
    required = set(plan['writes']) | set(plan['deletions'])
    for move in plan['moves']:
        required.update((move['source'], move['destination']))
    if required != scope or set(plan['before']) != scope:
        raise ValueError('Migration plan scope is inconsistent')
    if git(root, 'rev-parse', 'HEAD') != plan['base']:
        raise ValueError('HEAD changed since migration planning')
    if git(root, 'symbolic-ref', '--short', 'HEAD') != plan['branch']:
        raise ValueError('Branch changed since migration planning')
    dirty = changed_paths(root)
    local = {move[end] for move in plan.get('local_moves', []) for end in ('source', 'destination')}
    if dirty and (not resuming or not dirty <= scope | local):
        raise ValueError('Migration requires a clean tree; recovery cannot absorb unrelated changes')
    sources = {move['source'] for move in plan['moves']} | set(plan['deletions'])
    destinations = {move['destination']: move['source'] for move in plan['moves']}
    for name in scope:
        path = checked_path(root, name)
        current = digest(path.read_bytes()) if path.is_file() else None
        allowed = {plan['before'][name]}
        if name in sources:
            allowed.add(None)
        if name in destinations:
            allowed.add(plan['before'][destinations[name]])
        if name in plan['writes']:
            allowed.add(digest(plan['writes'][name].encode('utf-8')))
        if current not in allowed:
            raise ValueError('Content conflict during migration recovery: ' + name)
    for move in plan['moves']:
        source, destination = root / move['source'], root / move['destination']
        if source.exists() == destination.exists():
            raise ValueError('Migration move has missing or conflicting endpoints: ' + move['source'])


def apply_plan(repo, plan=None, lane='interactive', fail_after=None, session=None):
    if lane != 'interactive':
        raise ValueError('Rule 24: unattended migration is read-only')
    root = repository(repo)
    check_writer_locks(root, session, recover=True)
    journal = journal_path(root)
    resuming = journal.is_file()
    if resuming:
        saved = json.loads(journal.read_text(encoding='utf-8'))
        if plan is not None and plan['transaction'] != saved['transaction']:
            raise ValueError('A different migration transaction is pending')
        plan = saved
        # Recover a crash after Git committed but before the journal was removed.
        if git(root, 'rev-parse', 'HEAD') != plan['base']:
            message = git(root, 'log', '-1', '--format=%B')
            if ('Migration-Id: ' + plan['transaction'] not in message or
                    git(root, 'rev-parse', 'HEAD^') != plan['base']):
                raise ValueError('HEAD changed outside the pending migration')
            for name, text in plan['writes'].items():
                path = checked_path(root, name)
                if not path.is_file() or path.read_bytes() != text.encode('utf-8'):
                    raise ValueError('Committed migration output has changed: ' + name)
            for move in plan['moves']:
                if checked_path(root, move['source']).exists():
                    raise ValueError('Legacy source reappeared after migration: ' + move['source'])
                destination = checked_path(root, move['destination'])
                if (move['destination'] not in plan['writes'] and
                        (not destination.is_file() or digest(destination.read_bytes()) != plan['before'][move['source']])):
                    raise ValueError('Committed migrated record changed: ' + move['destination'])
            if any(checked_path(root, name).exists() for name in plan['deletions']):
                raise ValueError('Retired migration stub reappeared')
            journal.unlink()
            return dict(committed=True, recovered=True, head=git(root, 'rev-parse', 'HEAD'))
    elif plan is None:
        plan = build_plan(root, session=session)
    validate_transaction(root, plan, resuming)
    if not plan['paths']:
        return dict(committed=False, head=plan['base'], reason='Layout already current')
    if not resuming:
        atomic_write(journal, json.dumps(plan, sort_keys=True).encode('utf-8'))
    operations = 0

    def checkpoint():
        nonlocal operations
        operations += 1
        if fail_after is not None and operations == fail_after:
            raise RuntimeError('Injected interruption after migration operation %d' % operations)

    for move in plan['moves']:
        source = checked_path(root, move['source'])
        destination = checked_path(root, move['destination'])
        if source.exists():
            destination.parent.mkdir(parents=True, exist_ok=True)
            git(root, 'mv', '--', move['source'], move['destination'])
            checkpoint()
    for name in plan['deletions']:
        if checked_path(root, name).exists():
            git(root, 'rm', '--', name)
            checkpoint()
    for move in plan.get('local_moves', []):
        source = checked_path(root, move['source'])
        destination = checked_path(root, move['destination'])
        if source.exists():
            if destination.exists():
                raise ValueError('Local handoff destination appeared during migration: ' + move['destination'])
            destination.parent.mkdir(parents=True, exist_ok=True)
            os.replace(str(source), str(destination))
            checkpoint()
    legacy = checked_path(root, 'docs/handoffs')
    if plan.get('local_moves') and legacy.is_dir():
        for folder in sorted((p for p in legacy.rglob('*') if p.is_dir()), reverse=True) + [legacy]:
            try:
                folder.rmdir()
            except OSError:
                pass
    # A current .layout is the final write, never proof of a partial operation.
    names = sorted(plan['writes'], key=lambda value: (value == 'docs/orkest/.layout', value))
    for name in names:
        path = checked_path(root, name)
        data = plan['writes'][name].encode('utf-8')
        if not path.is_file() or path.read_bytes() != data:
            atomic_write(path, data)
            checkpoint()
    helper = Path(__file__).with_name('workflow-git.py')
    session = session or os.environ.get('CODEX_SESSION_ID') or os.environ.get('CLAUDE_CODE_SESSION_ID') or 'unknown'
    message = ('refactor(orkest): migrate tracker layout to version 1\n\n'
               'Validated single-repository migration; owned docs moved with git mv and links rebased.\n\n'
               'Orkest-Migration: layout-1\nMigration-Id: ' + plan['transaction'] + '\nSession-Id: ' + session)
    result = subprocess.run([sys.executable, '-X', 'utf8', str(helper), 'commit', '--repo', str(root),
                             '--branch', plan['branch'], '--message', message, '--paths', *plan['paths']],
                            capture_output=True, text=True, encoding='utf-8', errors='replace')
    if result.returncode:
        raise ValueError('Migration commit failed; retain journal for recovery: ' + result.stderr.strip())
    receipt = json.loads(result.stdout)
    if not receipt.get('committed'):
        raise ValueError('Migration did not produce its dedicated commit')
    journal.unlink()
    return dict(committed=True, head=receipt['head'], transaction=plan['transaction'])


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', default='.')
    parser.add_argument('--json', action='store_true')
    parser.add_argument('--apply', action='store_true', help='Apply the validated single-repo transaction')
    parser.add_argument('--unattended', action='store_true', help='Read-only scheduler/AFK lane')
    args = parser.parse_args(argv)
    try:
        if args.apply:
            result = apply_plan(args.repo, lane='unattended' if args.unattended else 'interactive')
            print(json.dumps(result))
            return 0
        plan = build_plan(args.repo)
        if args.json:
            print(json.dumps(plan, indent=2, ensure_ascii=False))
        else:
            print('Migration dry-run: ' + plan['repo'])
            for move in plan['moves']:
                print('  %s -> %s%s' % (move['source'], move['destination'],
                      ' (' + move['id'] + ')' if move.get('id') else ''))
            for name in plan['deletions']:
                print('  retire moved-tracker stub: ' + name)
            print('  %d content/metadata writes; no files changed' % len(plan['writes']))
        return 0
    except (ValueError, OSError) as error:
        print(str(error), file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
