"""Cheap checks before an expensive run, and an honest account of what is dirty afterwards.

`preflight` refuses in seconds when a phase's declared prerequisites are missing (a skipped test is not a
green one). `dirty_report` separates this run's files from what was already dirty and what appeared meanwhile.
Everything here is read-only and stdlib only.
"""
import os
import re
import shutil
import socket
from pathlib import Path, PurePosixPath

KEYS = ('files', 'env', 'env_optional', 'ports', 'commands', 'skip_budget')


def parse_requires(section):
    """The `> requires:` block of a phase (or whole tracker) as {key: [values]}; {} when absent.

    > requires:
    >   files: [tests/fixtures/a.zip]
    >   env: [APP_DB_URL]
    >   ports: [5433]
    >   commands: [dotnet]
    >   skip_budget: 0
    """
    found, collecting = {}, False
    for line in (section or '').splitlines():
        stripped = line.strip()
        if re.match(r'^>\s*requires:\s*$', stripped):
            collecting = True
            continue
        if not collecting:
            continue
        match = re.match(r'^>\s+([a-z_]+):\s*(.*)$', stripped)
        if not match:
            break
        key, value = match.group(1), match.group(2).strip()
        if key not in KEYS:
            continue
        if value.startswith('[') and value.endswith(']'):
            value = value[1:-1]
        found[key] = [item.strip().strip('\'"') for item in value.split(',') if item.strip()]
    return found


def declared_skip_budget(requires):
    try:
        return max(0, int((requires.get('skip_budget') or ['0'])[0]))
    except ValueError:
        return 0


def check(repo, requires, connect=None):
    """{'ok', 'missing': [{'kind', 'name'}], 'checked'}; never prints or returns an environment value."""
    repo = Path(repo)
    missing, checked = [], 0
    for name in requires.get('files', []):
        checked += 1
        pure = PurePosixPath(name.replace('\\', '/'))
        target = repo / pure
        if pure.is_absolute() or '..' in pure.parts or not target.is_file() or target.stat().st_size == 0:
            missing.append(dict(kind='file', name=name))
    for name in requires.get('env', []):
        checked += 1
        if not os.environ.get(name):
            missing.append(dict(kind='env', name=name))
    for name in requires.get('ports', []):
        checked += 1
        try:
            port = int(name)
            if connect is not None:
                reachable = connect(port)
            else:
                with socket.create_connection(('127.0.0.1', port), timeout=1):
                    reachable = True
        except (ValueError, OSError):
            reachable = False
        if not reachable:
            missing.append(dict(kind='port', name=str(name)))
    for name in requires.get('commands', []):
        checked += 1
        if not shutil.which(name):
            missing.append(dict(kind='command', name=name))
    return dict(ok=not missing, missing=missing, checked=checked)


def refuse_unless_ready(repo, requires):
    result = check(repo, requires)
    if not result['ok']:
        raise ValueError('Prerequisites missing before the run: ' +
                         '; '.join('%s %s' % (m['kind'], m['name']) for m in result['missing']) +
                         '. Fix them (or declare them optional) before spending a full run.')
    return result


def append_metric(meta_dir, record):
    """One NDJSON line per helper call under the Git metadata directory; a failure never fails the step."""
    import json
    try:
        meta_dir = Path(meta_dir)
        meta_dir.mkdir(parents=True, exist_ok=True)
        with (meta_dir / 'metrics.ndjson').open('ab') as handle:
            handle.write((json.dumps(record, sort_keys=True) + '\n').encode('utf-8'))
    except OSError:
        pass


def summarize_metrics(meta_dir, harness=None):
    """Per-command call counts, wall time, rejected verifications and the longest silent gap."""
    import datetime
    import json
    rows = []
    try:
        for line in (Path(meta_dir) / 'metrics.ndjson').read_bytes().decode('utf-8', errors='replace').splitlines():
            try:
                rows.append(json.loads(line))
            except ValueError:
                continue
    except OSError:
        pass
    if harness:
        rows = [r for r in rows if r.get('harness') == harness]
    by_command = {}
    for r in rows:
        entry = by_command.setdefault(r.get('command'), dict(calls=0, seconds=0.0, failures=0))
        entry['calls'] += 1
        entry['seconds'] = round(entry['seconds'] + float(r.get('duration_s') or 0), 2)
        entry['failures'] += 1 if r.get('exit') else 0
    stamps = []
    for r in rows:
        try:
            stamps.append(datetime.datetime.fromisoformat(r['ts']))
        except (KeyError, ValueError):
            continue
    gaps = [(b - a).total_seconds() for a, b in zip(stamps, stamps[1:])]
    verifies = [r for r in rows if r.get('command') == 'verify']
    return dict(calls=len(rows), by_command=by_command, longest_gap_s=round(max(gaps), 1) if gaps else 0,
                verify_calls=len(verifies), verify_rejected=sum(1 for r in verifies if r.get('accepted') is False),
                note='Derived from helper calls only; transcript-based numbers would be estimates.')


def porcelain(text):
    """{path: status} from `git status --porcelain` text (rename targets only)."""
    entries = {}
    for line in (text or '').splitlines():
        if len(line) < 4:
            continue
        status, path = line[:2], line[3:]
        if ' -> ' in path:
            path = path.split(' -> ', 1)[1]
        entries[path.strip('"')] = status
    return entries


def dirty_report(current_status, baseline_status, owned):
    """Classify every dirty path: owned-uncommitted, preexisting, or foreign-new (appeared during the run)."""
    now, before = porcelain(current_status), porcelain(baseline_status)
    owned = set(owned or [])
    classes = dict(owned_uncommitted=[], preexisting=[], foreign_new=[])
    for path in sorted(now):
        item = dict(path=path, status=now[path].strip() or now[path])
        if path in owned:
            classes['owned_uncommitted'].append(item)
        elif path in before:
            classes['preexisting'].append(item)
        else:
            classes['foreign_new'].append(item)
    return dict(counts={k: len(v) for k, v in classes.items()}, total=len(now),
                note='Name every non-owned path in the final report; do not stage or revert them.', **classes)
