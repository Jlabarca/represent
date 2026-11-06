"""Read-only harness diagnosis and separately authorized safe repairs."""
import json
import datetime
import copy
import importlib.util
import hashlib
import os
from pathlib import Path
import posixpath
import re
import shutil
import subprocess
import sys
import uuid
from urllib.parse import unquote, urlsplit


def finding(code, path, detail, severity='warn', fix=None):
    return dict(code=code, path=path, detail=detail, severity=severity, fix=fix)


def collapse(findings):
    """Identical findings (same code, path, detail, severity and fix) report once with a count."""
    seen = {}
    for item in findings:
        key = json.dumps(item, sort_keys=True, ensure_ascii=False)
        if key in seen:
            seen[key]['count'] += 1
        else:
            seen[key] = dict(item, count=1)
    return [{key: value for key, value in item.items() if key != 'count' or value > 1} for item in seen.values()]


def readonly_env():
    env = dict(os.environ, GIT_OPTIONAL_LOCKS='0', GIT_NO_LAZY_FETCH='1', PYTHONDONTWRITEBYTECODE='1')
    count = int(env.get('GIT_CONFIG_COUNT', '0'))
    env['GIT_CONFIG_KEY_' + str(count)] = 'core.fsmonitor'
    env['GIT_CONFIG_VALUE_' + str(count)] = 'false'
    env['GIT_CONFIG_COUNT'] = str(count + 1)
    return env


def git_read(repo, *args):
    env = readonly_env()
    result = subprocess.run(['git', '-C', str(repo), '--no-optional-locks', '-c', 'core.fsmonitor=false',
                             '--literal-pathspecs', *args], capture_output=True, text=True,
                            encoding='utf-8', errors='replace', env=env)
    if result.returncode:
        raise ValueError(result.stderr.strip() or 'Git inspection failed')
    return result.stdout.rstrip('\r\n')


def visible_lines(text):
    fence = None
    for line in text.splitlines(keepends=True):
        match = re.match(r'^\s{0,3}(`{3,}|~{3,})', line)
        if match:
            token = match.group(1)
            if fence is None:
                fence = token
            elif token[0] == fence[0] and len(token) >= len(fence):
                fence = None
            continue
        if fence is None:
            yield line


def documents(repo, runtime, findings):
    """Validate each directory before enumerating it; never traverse a junction out."""
    result, pending = {}, ['docs']
    # Ignored local files (handoffs, caches) are neither trackers nor layout evidence.
    try:
        ignored = set(git_read(repo, 'ls-files', '--others', '--ignored', '--exclude-standard', '-z', '--', 'docs').split('\0'))
    except ValueError:
        ignored = set()
    while pending:
        name = pending.pop()
        if name in ignored:
            continue
        try:
            path = runtime.migration.checked_path(repo, name)
            if not path.exists():
                continue
            if path.is_dir():
                pending.extend(child.relative_to(repo).as_posix() for child in sorted(path.iterdir(), reverse=True)
                               if child.name not in ('.git', 'node_modules', 'bin', 'obj'))
            elif path.suffix.lower() == '.md':
                result[name] = path.read_text(encoding='utf-8')
        except (ValueError, OSError, UnicodeError):
            findings.append(finding('unsafe-document', name, 'Document path/content cannot be safely inspected', 'error'))
    return result


def tracker_facts(repo, docs, runtime, findings):
    claims, trackers = {}, []
    subjects = None  # One history read for every box, not one full-history grep per box.
    for name, text in docs.items():
        if not runtime.tracker_suffix(name):
            continue
        tracker = runtime.parse_tracker(text, name)
        trackers.append(tracker)
        if tracker['errors']:
            findings.append(finding('tracker-invalid', name, '; '.join(tracker['errors']), 'error'))
        identities = set()
        try:
            front = runtime.migration.identity(text.lstrip('\ufeff'))
            if front:
                identities.add(front)
        except ValueError:
            pass  # The invalid-tracker finding already retains the disagreement.
        for line in visible_lines(text):
            match = re.match(r'^# (' + runtime.ID + r'):', line)
            if match:
                identities.add(match.group(1))
        for value in identities:
            claims.setdefault(value, set()).add(name)
        if tracker['errors'] and any('outside' in error for error in tracker['errors']):
            findings.append(finding('orphan-tracker', name, 'Tracker is outside supported lifecycle directories'))
        # Done, planned and parked trackers are history; their claims are reported, not errors.
        severity = 'error' if tracker['lifecycle'] == 'live' else 'info'
        for box in tracker['boxes']:
            if box['checked'] and not box['done']:
                findings.append(finding('checked-without-evidence', name, box['id'] + ' is checked without evidence', severity))
            elif box['checked']:
                if subjects is None:
                    subjects = git_read(repo, 'log', '--format=%s').splitlines()
                exact = re.compile(r'(?<![\w.-])' + re.escape(box['id']) + r'(?![\w.-])')
                if not any(box['id'] in line and exact.search(line) for line in subjects):
                    findings.append(finding('evidence-commit-missing', name, box['id'] + ' has no local Git commit reference'))
    # ORK-000082 and ROM-82 are one number: a legacy id and its keyed alias collide too.
    numbers = {}
    for identity, paths in claims.items():
        entry = numbers.setdefault(runtime.id_number(identity), (set(), set()))
        entry[0].add(identity)
        entry[1].update(paths)
    for _, (identities, paths) in sorted(numbers.items()):
        if len(paths) > 1:
            findings.append(finding('id-collision', ', '.join(sorted(paths)), ' / '.join(sorted(identities)) +
                                    ' is claimed by multiple trackers', 'error'))
    return trackers, claims


def layout_facts(repo, docs, claims, runtime, findings):
    marker = runtime.migration.checked_path(repo, 'docs/orkest/.layout')
    version = None
    if marker.exists():
        try:
            raw = marker.read_text(encoding='utf-8').strip()
        except (OSError, UnicodeError):
            raw = ''
        if re.fullmatch(r'[1-9][0-9]*', raw):
            version = int(raw)
        else:
            findings.append(finding('layout-version-invalid', 'docs/orkest/.layout', 'Layout marker is not a positive integer', 'error'))
    layout = runtime.detect_layout(docs, version)
    if not layout['supported']:
        findings.append(finding('layout-version-unsupported', 'docs/orkest/.layout', 'A newer layout requires a compatible release', 'error'))
    if layout['layout'] == 'mixed':
        findings.append(finding('layout-mixed', 'docs', 'Legacy harness documents remain alongside the new layout', 'error'))
        if 'docs/LOGBOOK.md' in docs and 'docs/orkest/LOGBOOK.md' in docs:
            findings.append(finding('logbook-split', 'docs/LOGBOOK.md',
                'Two logbooks: entries in docs/LOGBOOK.md belong in docs/orkest/LOGBOOK.md; the next migration folds them in '
                'without losing a byte (or append them by hand and git rm the legacy file)', 'warn'))
    elif layout['needs_migration']:
        findings.append(finding('layout-migration-pending', 'docs', 'Validated migration is required before layout completion'))
    key = None
    try:
        key = runtime.project_key(repo)
    except (OSError, UnicodeError, ValueError) as error:
        findings.append(finding('key-invalid', runtime.KEY_FILE, str(error), 'error'))
    if key:
        foreign = sorted(i for i in claims if not i.startswith(('ORK-', key + '-')))
        if foreign:
            findings.append(finding('id-key-mismatch', runtime.KEY_FILE, 'Trackers use another project key: ' +
                                    ', '.join(foreign)))
    counter = runtime.migration.checked_path(repo, 'docs/orkest/.next-id')
    if version or any(runtime.tracker_layout(name) == 'new' for name in docs):
        try:
            raw = counter.read_text(encoding='utf-8').strip() if counter.is_file() else ''
        except (OSError, UnicodeError):
            raw = ''
        # Keyed numbers grow without padding; only the legacy six-digit space can run out.
        if not re.fullmatch(r'[1-9][0-9]*', raw) or not key and int(raw) > 1000000:
            findings.append(finding('counter-invalid', 'docs/orkest/.next-id', 'Next-id counter is missing, invalid or exhausted', 'error'))
        elif not key and int(raw) == 1000000:
            findings.append(finding('id-space-exhausted', 'docs/orkest/.next-id', 'Local identity space is exhausted; declare a project key', 'error'))
        elif claims and int(raw) <= max(runtime.id_number(identity) for identity in claims):
            findings.append(finding('counter-drift', 'docs/orkest/.next-id', 'Counter does not advance beyond known identity claims'))
    return layout


def link_facts(repo, docs, runtime, findings):
    # Committed files only: an untracked scratch copy with the same basename must never become a fix.
    known = {}
    for name in git_read(repo, 'ls-files', '--cached', '-z').split('\0'):
        if name:
            known.setdefault(posixpath.basename(name), []).append(name)
    for name, text in docs.items():
        base = 'docs' if name.startswith(('docs/impl/planned/', 'docs/impl/parked/')) else posixpath.dirname(name)
        for line in visible_lines(text):
            mask = re.sub(r'(`+).*?\1', lambda match: ' ' * len(match.group()), line)
            links = re.findall(r'\]\((<[^>]+>|[^\s)]+)', mask)
            links += re.findall(r'^\[[^]\n]+\]:\s*(<[^>]+>|\S+)', mask)
            for value in links:
                try:
                    parsed = urlsplit(value.strip('<>'))
                except ValueError:
                    findings.append(finding('malformed-link', name, 'Link URI cannot be parsed safely'))
                    continue
                if parsed.scheme or parsed.netloc or not parsed.path:
                    continue
                target = posixpath.normpath(unquote(parsed.path).lstrip('/') if parsed.path.startswith('/') else
                                             posixpath.join(base, unquote(parsed.path)))
                if target == '..' or target.startswith('../'):
                    continue  # Explicit cross-repository references are outside this report's ownership.
                try:
                    path = runtime.migration.checked_path(repo, target)
                except ValueError:
                    findings.append(finding('unsafe-link', name, 'Local link escapes or crosses a symlink', 'error'))
                    continue
                if path.exists():
                    continue
                candidates = []
                for candidate in known.get(posixpath.basename(target), ()):
                    try:
                        if runtime.migration.checked_path(repo, candidate).is_file():
                            candidates.append(candidate)
                    except ValueError:
                        continue
                fix = dict(kind='link', source=target, destination=candidates[0]) if len(candidates) == 1 else None
                findings.append(finding('broken-link', name, 'Missing local target: ' + target, fix=fix))


def registry_facts(repo, template, runtime, findings):
    try:
        path = runtime.migration.checked_path(repo, 'harness-registry.json')
        source = path if path.is_file() else runtime.migration.checked_path(template, 'harness-registry.json')
        registry = json.loads(source.read_text(encoding='utf-8'))
        if (not isinstance(registry, dict) or not isinstance(registry.get('authoring'), str) or
                not isinstance(registry.get('harnesses'), list) or not registry['harnesses']):
            raise ValueError('Invalid registry schema')
        for item in registry['harnesses']:
            if (not isinstance(item, dict) or not isinstance(item.get('name'), str) or
                    not isinstance(item.get('roots'), list) or not item['roots'] or
                    any(not isinstance(root, str) or not root for root in item['roots'])):
                raise ValueError('Invalid registry roots')
        authoring = runtime.migration.checked_path(template, registry['authoring'])
        roots = list(dict.fromkeys(root for item in registry['harnesses'] for root in item['roots']))
        if not authoring.is_dir():
            raise ValueError('Canonical catalog is unavailable')
        canonical, pending = {}, [authoring]
        while pending:
            item = pending.pop()
            item = runtime.migration.checked_path(template, item.relative_to(template).as_posix())
            if item.is_dir():
                pending.extend(item.iterdir())
            else:
                canonical[item.relative_to(authoring).as_posix()] = hashlib.sha256(item.read_bytes()).hexdigest()
        if not canonical:
            raise ValueError('Canonical catalog is empty')
        for root in roots:
            runtime.migration.checked_path(repo, root)
            for name, expected in canonical.items():
                target = runtime.migration.checked_path(repo, root + '/' + name)
                if not target.is_file():
                    findings.append(finding('skill-missing', root + '/' + name, 'Canonical suite file is absent'))
                elif hashlib.sha256(target.read_bytes()).hexdigest() != expected:
                    findings.append(finding('skill-drift', root + '/' + name, 'Local skill bytes differ; preserve and review customization'))
        return roots
    except (ValueError, OSError, KeyError, TypeError):
        findings.append(finding('registry-invalid', 'harness-registry.json', 'Registry or canonical skill source cannot be safely inspected', 'error'))
        return []


def hook_facts(repo, template, runtime, findings):
    for name in ('.claude/settings.json', '.codex/hooks.json', '.ghostdev/hooks.json'):
        runtime.migration.checked_path(repo, name)
    for name in ('.claude/settings.example.json', '.codex/hooks.example.json'):
        runtime.migration.checked_path(template, name)
    command = runtime.migration.checked_path(template, 'bin/ghostdev-hooks.py')
    if not command.is_file():
        findings.append(finding('hook-check-unavailable', 'bin', 'Configured adapter check is unavailable', 'info'))
        return {}
    result = subprocess.run([sys.executable, '-B', str(command), 'check', '--target', str(repo),
                             '--template', str(template), '--json'], capture_output=True, text=True,
                            encoding='utf-8', errors='replace', env=readonly_env(), timeout=60)
    try:
        engines = json.loads(result.stdout)['engines']
    except (ValueError, KeyError, TypeError):
        findings.append(finding('hook-check-unavailable', 'bin', 'Adapter did not return a readable check result', 'warn'))
        return {}
    summary = {}
    for engine, data in engines.items():
        summary[engine] = dict(status=data['status'], disabled=sum(item['state'] == 'disabled' for item in data['items']))
        if data['status'] not in ('ok', 'partial', 'off', 'disabled', 'customized'):
            fix = dict(kind='hooks') if not data['missing_scripts'] else None
            findings.append(finding('hook-drift', data['file'], 'Owned ' + engine + ' wiring needs reconciliation', fix=fix))
    return summary


def promotion_facts(repo, template, trackers, runtime, findings):
    checker = runtime.migration.checked_path(template, 'bin/promote-check.py')
    if not checker.is_file():
        findings.append(finding('promotion-check-unavailable', 'bin', 'Promotion checker is unavailable', 'info'))
        return []
    candidates = []
    for tracker in trackers:
        if (tracker['errors'] or tracker['lifecycle'] != 'live' or not tracker['boxes'] or
                any(not box['done'] for box in tracker['boxes'])):
            continue
        feature = tracker['id'] or runtime.tracker_stem(tracker['path'])
        result = subprocess.run([sys.executable, '-B', str(checker), '--repo', str(repo), '--suite', feature, '--json'],
            capture_output=True, text=True, encoding='utf-8', errors='replace', env=readonly_env(), timeout=60)
        try:
            data = json.loads(result.stdout)
            rows = [[item['level'], item['text']] for item in data['rows']]
            candidates.append(dict(target=tracker['path'], status='blocked' if data['exit'] == 2 else
                                   'warnings' if data['exit'] == 1 else 'ready', rows=rows, diagnostic_only=True))
        except (ValueError, KeyError, TypeError):
            findings.append(finding('promotion-check-unavailable', tracker['path'], 'Checker output is unavailable', 'info'))
    return candidates


def policy_facts(repo, runtime, findings):
    """A malformed or unknown branch layout is reported here, before Update or a run refuses on it."""
    try:
        runtime.integration_branch(repo)
    except ValueError as error:
        if runtime.BRANCH_FILE in str(error):
            findings.append(finding('branch-policy-invalid', runtime.BRANCH_FILE, str(error)))
            return
        # Without a declared layout, an unknown inferred default is not a policy problem.


def lock_facts(repo, runtime, findings):
    """Report writer locks held by other sessions: live ones to wait for, stale ones the next write recovers."""
    try:
        held = runtime.migration.writer_locks(repo, os.environ.get('CODEX_SESSION_ID') or os.environ.get('CLAUDE_CODE_SESSION_ID'))
    except (ValueError, OSError):
        return
    for lock, info in held:
        fields = info['fields']
        title = runtime.migration.session_title(fields.get('session', ''))
        text = ('session ' + fields.get('session', '?') + (' "' + title + '"' if title else '') + ', idle ' +
                str(int(info['idle'] / 60)) + ' min' + ('; abandoned, the next write recovers it' if info['stale']
                                                       else '; wait for it, or recover-lock --confirm-inactive once it is gone'))
        findings.append(finding('writer-lock-stale' if info['stale'] else 'writer-lock-held', lock.name, text))


def branch_facts(repo, template, runtime, findings):
    names = git_read(repo, 'for-each-ref', '--format=%(refname:short)', 'refs/heads').splitlines()
    configured = os.environ.get('ORKEST_AGENT_BRANCH_PREFIX') or os.environ.get('GHOSTDEV_AGENT_BRANCH_PREFIX')
    prefixes = [configured] if configured else ['ghostdev/', 'codex/', 'orkest/']
    prefixes = [prefix for prefix in prefixes if any(name.startswith(prefix) for name in names)]
    if not prefixes:
        return []
    pwsh = shutil.which('pwsh')
    if pwsh:
        runner = [pwsh, '-NoProfile', '-File', str(runtime.migration.checked_path(template, 'bin/branch-reaper.ps1'))]
    else:
        bash = os.environ.get('ORKEST_BASH') or os.environ.get('GHOSTDEV_BASH')
        if not bash and os.name != 'nt':
            bash = shutil.which('bash')
        if not bash:
            findings.append(finding('branch-check-unavailable', 'refs/heads', 'Verified report shell is unavailable', 'info'))
            return []
        runner = [bash, str(runtime.migration.checked_path(template, 'bin/branch-reaper.sh'))]
    rows = []
    for prefix in prefixes:
        args = ['-Repo', str(repo), '-Prefix', prefix] if pwsh else ['--repo', str(repo), '--prefix', prefix]
        result = subprocess.run(runner + args, capture_output=True, text=True, encoding='utf-8', errors='replace',
                                env=readonly_env(), timeout=60)
        if result.returncode:
            findings.append(finding('branch-check-unavailable', 'refs/heads', 'Branch report could not complete', 'info'))
            continue
        for line in result.stdout.splitlines():
            match = re.match(r'^\s+(A(?:-young)?|C|U|W)\s+(\d+)\s+(-?\d+)d\s+(\S+)\s*$', line)
            if match:
                status, ahead, age, name = match.groups()
                rows.append(dict(branch=name, **{'class': status}, ahead=int(ahead), age_days=int(age), prefix=prefix))
    return sorted(rows, key=lambda row: row['branch'])


def session_facts(repo, options, runtime, findings):
    """Consume an existing scoped export; current harvesters have write side effects."""
    unavailable = dict(status='unavailable', diagnostic_only=True,
        reason='No existing current-project session report; live harvesters write state and are not called')
    name = options.get('session_report')
    if not name:
        return unavailable
    try:
        path = runtime.migration.checked_path(repo, name)
        if path.stat().st_size > 2 * 1024 * 1024:
            raise ValueError('Report is too large')
        data = json.loads(path.read_text(encoding='utf-8'))
        if (type(data.get('schema')) is not int or data['schema'] != 1 or
                data.get('source') not in ('methrep-cache', 'digest-cache') or
                Path(data.get('repo', '')).resolve() != repo or
                not isinstance(data.get('scannedAt'), str) or not data['scannedAt'] or
                not isinstance(data.get('sessions'), list)):
            raise ValueError('Invalid report scope/schema')
        validate_timestamp(data['scannedAt'])
        rows = []
        for row in data['sessions']:
            if not isinstance(row, dict) or any(not isinstance(row.get(key), str)
                                                for key in ('id', 'state', 'stateEvidence')):
                raise ValueError('Invalid session row')
            rows.append({key: row[key] for key in ('id', 'state', 'stateEvidence')})
        return dict(status='supplied-snapshot', diagnostic_only=True, claimed_source=data['source'],
                    scannedAt=data['scannedAt'], rows=rows, historical=True, provenance_verified=False)
    except (ValueError, OSError, TypeError, AttributeError):
        findings.append(finding('session-report-invalid', name, 'Existing session report has invalid scope or schema'))
        return unavailable


def validate_timestamp(value):
    stamp = datetime.datetime.fromisoformat(value.replace('Z', '+00:00'))
    if stamp.tzinfo is None:
        raise ValueError('Diagnostic timestamp needs a timezone')


def native_facts(repo, options, runtime, findings):
    unavailable = dict(status='unavailable', diagnostic_only=True,
        reason='Native /doctor must be invoked by the active Claude harness when that capability exists')
    name = options.get('native_doctor_report')
    if options.get('harness') != 'claude-code' or not name:
        return unavailable
    try:
        path = runtime.migration.checked_path(repo, name)
        if path.stat().st_size > 256 * 1024:
            raise ValueError('Report is too large')
        data = json.loads(path.read_text(encoding='utf-8'))
        if (data.get('harness') != 'claude-code' or Path(data.get('repo', '')).resolve() != repo or
                not isinstance(data.get('output'), str) or not data['output'] or
                not isinstance(data.get('observedAt'), str) or not data['observedAt']):
            raise ValueError('Invalid native observation')
        validate_timestamp(data['observedAt'])
        return dict(status='supplied-snapshot', diagnostic_only=True, quoted_output=data['output'],
                    observedAt=data['observedAt'], historical=True, provenance_verified=False)
    except (ValueError, OSError, TypeError, AttributeError):
        findings.append(finding('native-doctor-report-invalid', name, 'Native observation cannot be safely read'))
        return unavailable


def repair_plan(repo, template, docs, claims, report, runtime):
    writes, skipped = {}, []
    dirty = set(git_read(repo, 'diff', '--name-only', 'HEAD', '-z').split('\0'))
    tracked = set(git_read(repo, 'ls-files', '-z').split('\0'))

    def offer(name, text):
        path = runtime.migration.checked_path(repo, name)
        if name in dirty or (path.exists() and name not in tracked):
            skipped.append(dict(path=name, reason='Existing edits or untracked local content; kept'))
        elif not path.exists() or path.read_bytes() != text.encode('utf-8'):
            writes[name] = text.encode('utf-8')

    mappings = {}
    for item in report['findings']:
        fix = item.get('fix')
        if fix and fix['kind'] == 'link':
            mappings.setdefault(item['path'], {})[fix['source']] = fix['destination']
    for name, mapping in mappings.items():
        # Only visible Markdown outside inline code. Never alter fenced examples.
        original = docs[name]
        lines, fence = [], None
        for line in original.splitlines(keepends=True):
            token = re.match(r'^\s{0,3}(`{3,}|~{3,})', line)
            if token:
                value = token.group(1)
                if fence is None:
                    fence = value
                elif value[0] == fence[0] and len(value) >= len(fence):
                    fence = None
                lines.append(line)
                continue
            if fence is None:
                parts = re.split(r'(`+.*?`+)', line)
                line = ''.join(part if index % 2 else runtime.migration.rewrite_links(part, name, name, mapping)
                               for index, part in enumerate(parts))
            lines.append(line)
        offer(name, ''.join(lines))
    for name, text in docs.items():
        if runtime.tracker_suffix(name) not in ('-ORK.md', '.imp.md'):
            continue
        try:
            identity = runtime.migration.identity(text)
        except ValueError:
            continue
        # The H1 carries the uppercase description; a .imp.md filename is its lowercase.
        stem = runtime.tracker_stem(name)
        stem = stem.upper() if runtime.tracker_suffix(name) == '.imp.md' else stem
        if not identity or claims.get(identity) != {name} or not re.fullmatch(r'[A-Z][A-Z0-9_-]*', stem):
            continue
        headings = [line.rstrip('\r\n') for line in visible_lines(text) if line.startswith('# ')]
        if headings != ['# ' + stem]:
            continue  # Conflicting IDs/titles, duplicate headings and guesses are manual.
        replacement = text.replace('# ' + stem + '\n', '# ' + identity + ': ' + stem + '\n', 1)
        if not runtime.parse_tracker(replacement, name)['errors']:
            offer(name, replacement)
    # Reuse the adapter's pure planner; do not call its write/backup lifecycle.
    if any(item.get('fix', {}).get('kind') == 'hooks' for item in report['findings'] if item.get('fix')):
        adapter_path = runtime.migration.checked_path(template, 'bin/ghostdev-hooks.py')
        spec = importlib.util.spec_from_file_location('orkest_doctor_hook_plan', adapter_path)
        adapter = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(adapter)
        runtime.migration.checked_path(repo, '.ghostdev/hooks.json')
        disables = adapter.load_disables(str(repo))
        for engine, info in adapter.ENGINES.items():
            live = runtime.migration.checked_path(repo, info['live'])
            runtime.migration.checked_path(template, info['example'])
            if live.is_file():
                config = json.loads(live.read_text(encoding='utf-8'))
                hooks = config.get('hooks', {})
                if not isinstance(hooks, dict) or any(not isinstance(groups, list) for groups in hooks.values()):
                    skipped.append(dict(path=info['live'], reason='Malformed local hook groups; kept'))
                    continue
            result, new = adapter.plan_engine(str(repo), str(template), engine, disables)
            if new is not None:
                offer(info['live'], json.dumps(new, indent=2, ensure_ascii=False) + '\n')
    branches = [row for row in report['branches'] if row['class'] == 'A' and row['ahead'] == 0 and row['age_days'] >= 7]
    return writes, branches, skipped


def apply_repairs(repo, template, options, report, runtime):
    # No writeful preflight, migration, lock or cache in these preview lanes.
    if options.get('dry') or options.get('no_commit') or runtime.lane(options) == 'unattended':
        report.update(committed=False, repair_status='preview', reason='Dry/no-commit/unattended doctor never mutates')
        return report
    if not report['layout']['supported']:
        report.update(committed=False, repair_status='deferred', reason='Unsupported layout; use a compatible release')
        return report
    if report['layout']['layout'] == 'empty':
        report.update(committed=False, repair_status='deferred', reason='Initialize the harness layout before doctor repairs')
        return report
    runtime.preflight(repo, None, options)
    session = runtime.session_id(options)
    if not session:
        raise ValueError('Doctor repair requires the actual harness session identity')
    runtime.migration.check_writer_locks(repo, session)
    if runtime.lock_fields(repo):
        raise ValueError('An active run owns the writer lock; finish or release that run before doctor fixes')
    # Scheduler arming is repo-scoped for repairs, rather than matching an empty target.
    for name in ('scheduler.json', '.orkest/scheduler.json'):
        config = runtime.read_json(runtime.migration.checked_path(repo, name), {})
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        if any(shift.get('enabled') is True and shift.get('targetImpls') and
               shift.get('enabledUntil', '') > now for shift in config.get('shifts', [])):
            raise ValueError('Doctor repair refuses a repository with armed scheduler targets')
    runtime.acquire(repo, None, options)
    try:
        migrations = []
        if report['layout']['needs_migration']:
            if not runtime.compatibility_verified(repo) or not runtime.consumer_readiness(repo)['ready']:
                report.update(committed=False, repair_status='deferred', reason='Layout migration compatibility/readiness is unavailable')
                return report
            # The migrator independently enforces clean-tree/transaction recovery.
            migrations.append(runtime.migration.apply_plan(repo, session=session))
            refreshed = dict(options, fix=False)
            report = run(repo, refreshed, runtime)
        docs = documents(repo, runtime, [])
        _, claims = tracker_facts(repo, docs, runtime, [])
        writes, branches, skipped = repair_plan(repo, template, docs, claims, report, runtime)
        report.update(repair_status='no-safe-changes', committed=False, skipped_repairs=skipped, migrations=migrations)
        if not writes and not branches:
            return report
        # Bookkeeping participates in exactly the same clean-file ownership gate.
        context, log = 'docs/CONTEXT.md', 'docs/orkest/LOGBOOK.md'
        for name in (context, log):
            path = runtime.migration.checked_path(repo, name)
            if git_read(repo, 'status', '--porcelain', '--untracked-files=all', '--', name):
                report.update(repair_status='deferred', reason='Bookkeeping has local edits: ' + name)
                return report
        report_name = 'docs/orkest/reports/doctor-' + str(uuid.uuid4()) + '.json'
        date = datetime.date.today().isoformat()
        repairs = sorted(writes)
        summary = 'Safe doctor repairs: ' + ', '.join(repairs + [row['branch'] for row in branches])
        old_context = (repo / context).read_text(encoding='utf-8') if (repo / context).is_file() else '# Context\n'
        old_log = (repo / log).read_text(encoding='utf-8') if (repo / log).is_file() else '# Logbook\n'
        writes[context] = (old_context + '\nDoctor ' + date + ': ' + summary + '.\n').encode('utf-8')
        writes[log] = (old_log + '\n## ' + date + ' — Orkest doctor\n\n### Accomplished\n\n- ' + summary +
            '\n\n### Decisions\n\n- Preserved local/custom content and disabled handlers.\n\n### Blockers\n\n- Remaining findings stay diagnostic; no disputed repair inferred.\n\n### Next\n\n- Review remaining findings.\n').encode('utf-8')
        persisted = copy.deepcopy(report)
        for key in ('sessions', 'native_doctor'):
            diagnostic = persisted.pop(key, {})
            persisted[key] = dict(status=diagnostic.get('status'), diagnostic_only=True,
                provenance_verified=False, content_omitted=True)
        writes[report_name] = (json.dumps(dict(schema=1, repairs=repairs, branches=branches,
            skipped=skipped, before=persisted), indent=2, ensure_ascii=False) + '\n').encode('utf-8')
        before = {name: (runtime.migration.checked_path(repo, name).read_bytes() if (repo / name).is_file() else None)
                  for name in writes}
        deleted, applied, created_dirs = {}, [], []
        try:
            for name in [context] + sorted(name for name in writes if name != context):
                path = runtime.migration.checked_path(repo, name)
                if (path.read_bytes() if path.is_file() else None) != before[name]:
                    raise ValueError('Concurrent edit detected: ' + name)
                parent = path.parent
                while not parent.exists():
                    created_dirs.append(parent)
                    parent = parent.parent
                runtime.migration.atomic_write(path, writes[name])
                applied.append(name)
            for row in branches:
                name = row['branch']
                # Fresh proof at the point of deletion; class C never reaches here.
                if (git_read(repo, 'rev-list', '--count', runtime.integration_branch(repo) + '..' + name) != '0' or
                        'branch refs/heads/' + name in git_read(repo, 'worktree', 'list', '--porcelain').splitlines()):
                    raise ValueError('Branch proof changed: ' + name)
                head = git_read(repo, 'rev-parse', 'refs/heads/' + name)
                stamp = int(git_read(repo, 'log', '-1', '--format=%ct', head))
                now = datetime.datetime.now(datetime.timezone.utc).timestamp()
                if now - stamp < 7 * 86400:
                    raise ValueError('Branch became too young to delete: ' + name)
                runtime.git(repo, 'branch', '-d', '--', name)
                deleted[name] = head
            commit = runtime.scoped_commit(repo, options, 'fix(orkest): repair verified doctor findings', sorted(writes), session)
        except (ValueError, OSError):
            for name in reversed(applied):
                path = runtime.migration.checked_path(repo, name)
                if path.is_file() and path.read_bytes() == writes[name]:
                    if before[name] is None:
                        path.unlink()
                    else:
                        runtime.migration.atomic_write(path, before[name])
            for name, head in deleted.items():
                runtime.git(repo, 'update-ref', 'refs/heads/' + name, head, '0' * len(head))
            for path in sorted(set(created_dirs), key=lambda value: len(value.parts), reverse=True):
                if path.is_dir() and not any(path.iterdir()):
                    path.rmdir()
            raise
        after = run(repo, dict(options, fix=False), runtime)
        after.update(read_only=False, committed=True, commit=commit, repaired=repairs,
                     deleted_branches=sorted(deleted), repair_status='committed', skipped_repairs=skipped, migrations=migrations)
        return after
    finally:
        runtime.release(repo, options)


def run(repo, options, runtime):
    repo = runtime.migration.repository(repo)
    findings = []
    docs = documents(repo, runtime, findings)
    trackers, claims = tracker_facts(repo, docs, runtime, findings)
    def collect(code, callback, default):
        try:
            return callback()
        except (ValueError, OSError, UnicodeError, subprocess.TimeoutExpired):
            findings.append(finding(code, '', 'Inspection unavailable; preserve state and review this component', 'error'))
            return default
    layout = collect('layout-check-unavailable', lambda: layout_facts(repo, docs, claims, runtime, findings),
                     dict(layout='unknown', supported=False, needs_migration=True))
    collect('link-check-unavailable', lambda: link_facts(repo, docs, runtime, findings), None)
    template = Path(options.get('template') or runtime.BIN.parent).resolve()
    roots = collect('registry-check-unavailable', lambda: registry_facts(repo, template, runtime, findings), [])
    hooks = collect('hook-check-unavailable', lambda: hook_facts(repo, template, runtime, findings), {})
    promotions = collect('promotion-check-unavailable', lambda: promotion_facts(repo, template, trackers, runtime, findings), [])
    branches = collect('branch-check-unavailable', lambda: branch_facts(repo, template, runtime, findings), [])
    policy_facts(repo, runtime, findings)
    lock_facts(repo, runtime, findings)
    consumers = collect('consumer-registration-invalid', lambda: runtime.consumer_readiness(repo),
                        dict(ready=False, reason='Consumer registration cannot be read'))
    sessions = session_facts(repo, options, runtime, findings)
    native = native_facts(repo, options, runtime, findings)
    findings.sort(key=lambda item: (item['code'], item['path']))
    summary = {level: sum(item['severity'] == level for item in findings) for level in ('error', 'warn', 'info')}
    findings = collapse(findings)
    report = dict(action='doctor', read_only=True, findings=findings, summary=summary,
                trackers=len(trackers), identity_count=len(claims), layout=layout, skill_roots=roots, hooks=hooks,
                consumer_readiness=consumers, promotion_candidates=promotions, branches=branches,
                sessions=sessions, native_doctor=native)
    return apply_repairs(repo, template, options, report, runtime) if options.get('fix') else report
