"""Local, ownership-aware startup transition. Never fetches or discovers other repositories."""
import sys
sys.dont_write_bytecode = True
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess


def digest(data):
    return hashlib.sha256(data).hexdigest() if data is not None else None


def version(value):
    match = re.fullmatch(r'v(\d+)\.(\d+)-(\d+)(?:-(?:\d+-)?g[0-9a-f]+)?', value or '')
    if not match:
        raise ValueError('Unsupported local release version')
    return tuple(map(int, match.groups()))


def files(root, relative, runtime):
    """Check each directory before enumerating, including Windows junctions."""
    pending, result = [relative], {}
    while pending:
        name = pending.pop()
        path = runtime.migration.checked_path(root, name)
        if path.is_dir():
            pending.extend(child.relative_to(root).as_posix() for child in path.iterdir()
                           if child.name != '__pycache__')
        elif path.is_file():
            result[name] = path.read_bytes()
    return result


def read(root, name, runtime, default=None):
    path = runtime.migration.checked_path(root, name)
    return json.loads(path.read_text(encoding='utf-8-sig')) if path.is_file() else default


def native_sources(registry):
    return {'harness-registry.json', registry['authoring'] + '/orkest/SKILL.md',
            '.claude/settings.example.json', '.codex/hooks.example.json', '.grok/hooks.example.json',
            *('bin/orkest-' + name + suffix for name in ('startup', 'hooks') for suffix in ('.py', '.ps1', '.sh'))}


def native_acceptance(template, manifest, registry, runtime):
    """Validate packaged native-wiring evidence offline; booleans cannot authorize cutover."""
    try:
        template = Path(template).resolve()
        names = {h['name'] for h in registry['harnesses']}
        entries = manifest.get('native_acceptance')
        if not isinstance(entries, dict) or set(entries) != names:
            return False
        path = runtime.migration.checked_path(template, 'orkest-native-acceptance.json')
        raw = path.read_bytes()
        bundle = json.loads(raw.decode('utf-8-sig'))
        if bundle.get('schema') != 1 or bundle.get('release') != manifest.get('release'):
            return False
        receipts = bundle.get('receipts')
        if not isinstance(receipts, dict) or set(receipts) != names:
            return False
        for name in names:
            entry, receipt = entries[name], receipts[name]
            if not isinstance(entry, dict) or not isinstance(receipt, dict):
                return False
            if entry.get('bundle') != path.name or entry.get('sha256') != digest(raw):
                return False
            encoded = json.dumps(receipt, sort_keys=True, separators=(',', ':')).encode('utf-8')
            if entry.get('receipt_sha256') != digest(encoded):
                return False
            commit = receipt.get('source_commit', '')
            if (not isinstance(commit, str) or not re.fullmatch('[0-9a-f]{40}', commit)
                    or entry.get('source_commit') != commit or receipt.get('harness') != name
                    or receipt.get('kind') != 'native-hook-dispatch'
                    or receipt.get('exact_wiring') is not True or receipt.get('discovery') is not True
                    or type(receipt.get('startup_exit')) is not int or receipt['startup_exit'] != 0
                    or not isinstance(receipt.get('cli_version'), str) or not receipt['cli_version']
                    or not isinstance(receipt.get('command'), str) or not receipt['command']):
                return False
            hashes = receipt.get('source_sha256')
            if not isinstance(hashes, dict) or not native_sources(registry).issubset(hashes):
                return False
            for relative, expected in hashes.items():
                source = runtime.migration.checked_path(template, relative)
                if expected != digest(source.read_bytes()):
                    return False
        return True
    except (ValueError, OSError, KeyError, TypeError, AttributeError):
        return False


def metadata_path(repo, name, runtime):
    base = runtime.metadata(repo)
    path = base / name
    try:
        path.resolve().relative_to(base.resolve())
    except ValueError:
        raise ValueError('Upgrade metadata escapes worktree')
    for part in (path, *path.parents):
        if part == base:
            break
        if part.is_symlink():
            raise ValueError('Symlink upgrade metadata is unsupported')
    return path


def report(status, **values):
    return dict(action='upgrade', status=status, changed=False, **values)


def hook_plans(repo, template, manifest, runtime):
    """Merge canonical wiring and remove only exact historically-owned handlers."""
    path = runtime.migration.checked_path(template, 'bin/orkest-hooks.py')
    if not path.is_file():
        return {}
    spec = importlib.util.spec_from_file_location('orkest_upgrade_hooks', path)
    adapter = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(adapter)
    result = {}
    for name in ('.orkest/hooks.json', '.ghostdev/hooks.json'):
        runtime.migration.checked_path(repo, name)
    disables = adapter.load_disables(str(repo))
    retained = {'tdd-test-gate', 'session-fingerprint', 'orkest-startup'}
    for engine, info in adapter.ENGINES.items():
        live = runtime.migration.checked_path(repo, info['live'])
        runtime.migration.checked_path(template, info['example'])
        original = json.loads(live.read_text(encoding='utf-8-sig')) if live.is_file() else None
        if original is not None:
            if not isinstance(original, dict) or not isinstance(original.get('hooks', {}), dict):
                raise ValueError('Malformed local hook configuration: ' + info['live'])
            for groups in original.get('hooks', {}).values():
                if not isinstance(groups, list):
                    raise ValueError('Malformed local hook groups: ' + info['live'])
        classified, new = adapter.plan_engine(str(repo), str(template), engine, disables)
        if classified['outcome'] == 'disabled':
            continue
        if classified['outcome'] == 'conflict':
            raise ValueError('Local hook wiring cannot be merged: ' + info['live'])
        merged = new if new is not None else original
        if merged is None:
            continue
        approved = manifest.get('legacy_handlers', {}).get(info['example'], [])
        hooks = merged.get('hooks', {})
        for event, groups in list(hooks.items()):
            # An explicit [] is a durable opt-out; never turn it back into an event.
            if not groups:
                continue
            kept_groups = []
            for group in groups:
                if not isinstance(group, dict) or not isinstance(group.get('hooks'), list):
                    kept_groups.append(group)
                    continue
                kept = []
                for handler in group['hooks']:
                    proof = dict(event=event, matcher=group.get('matcher'), handler=handler)
                    if (adapter.hook_name(handler.get('command')) not in retained and proof in approved):
                        continue
                    kept.append(handler)
                if kept:
                    cloned = dict(group, hooks=kept)
                    kept_groups.append(cloned)
            if kept_groups:
                hooks[event] = kept_groups
            elif engine + ':*' not in disables:
                del hooks[event]
        if merged != original:
            result[info['live']] = (json.dumps(merged, indent=2, ensure_ascii=False) + '\n').encode('utf-8')
    # Grok's native project hook has a separate schema and trust boundary.
    native = '.grok/hooks/orkest.json'
    source = runtime.migration.checked_path(template, '.grok/hooks.example.json')
    if source.is_file():
        target = runtime.migration.checked_path(repo, native)
        canonical = json.loads(source.read_text(encoding='utf-8'))
        current = json.loads(target.read_text(encoding='utf-8-sig')) if target.is_file() else None
        if 'grok:*' not in disables and 'grok:orkest-startup' not in disables and 'orkest-startup' not in disables:
            if current is None:
                result[native] = source.read_bytes()
            elif not isinstance(current, dict) or not isinstance(current.get('hooks', {}), dict):
                raise ValueError('Malformed local Grok hooks; preserve and review ' + native)
            elif 'SessionStart' not in current.get('hooks', {}):
                current.setdefault('hooks', {})['SessionStart'] = canonical['hooks']['SessionStart']
                result[native] = (json.dumps(current, indent=2) + '\n').encode('utf-8')
            elif current['hooks']['SessionStart']:
                groups = current['hooks']['SessionStart']
                if not isinstance(groups, list):
                    raise ValueError('Malformed local Grok SessionStart; preserve and review')
                if not any(adapter.hook_name(h.get('command')) == 'orkest-startup'
                           for g in groups if isinstance(g, dict) for h in g.get('hooks', []) if isinstance(h, dict)):
                    groups.extend(canonical['hooks']['SessionStart'])
                    result[native] = (json.dumps(current, indent=2) + '\n').encode('utf-8')
            # An explicit [] remains disabled; custom handlers stay byte-for-byte as values.
    return result


def inspect(repo, template, options, runtime):
    manifest = read(template, 'orkest-upgrade.json', runtime, {})
    if (not isinstance(manifest, dict) or type(manifest.get('schema')) is not int or
            manifest['schema'] != 1 or type(manifest.get('ready')) is not bool):
        raise ValueError('Invalid upgrade manifest schema')
    if not manifest['ready']:
        return report('development', reason='This local release is not enabled for cutover')
    shipping, minimum = version(manifest.get('release')), version(manifest.get('minimum'))
    if shipping < minimum:
        raise ValueError('Release is older than its cutover threshold')
    marker = read(repo, '.orkest/version.json', runtime) or read(repo, '.ghostdev/version.json', runtime, {})
    if not marker and options.get('initialize'):
        import datetime
        marker = dict(schema=1, methodology=manifest['release'], adopted=datetime.date.today().isoformat())
    installed = version(marker.get('methodology'))
    if installed < minimum and not options.get('update'):
        pending = runtime.read_json(metadata_path(repo, 'upgrade/journal.json', runtime), {})
        if pending.get('release') != manifest['release'] or 'complete' in pending.get('completed', []):
            return report('below-threshold', reason='Install the qualifying local release through normal Update first')
    if installed > shipping:
        return report('unsupported-version', reason='A newer installed release requires its own reconciler')
    registry = read(template, 'harness-registry.json', runtime, {})
    if not isinstance(registry.get('authoring'), str) or not isinstance(registry.get('harnesses'), list):
        raise ValueError('Invalid harness registry')
    names = [h.get('name') for h in registry['harnesses'] if isinstance(h, dict)]
    if sorted(names) != ['claude-code', 'codex', 'grok']:
        raise ValueError('Registry must name all three harnesses exactly once')
    roots = []
    for harness in registry['harnesses']:
        if not isinstance(harness.get('roots'), list) or not harness['roots']:
            raise ValueError('Harness has no configured skill roots')
        for root in harness['roots']:
            if not isinstance(root, str):
                raise ValueError('Invalid skill root')
            runtime.migration.checked_path(repo, root)
            if root not in roots:
                roots.append(root)
    if not native_acceptance(template, manifest, registry, runtime):
        return report('native-acceptance-required', reason='All three native startup/discovery checks must pass before live cutover')
    canonical_root = registry['authoring'] + '/orkest'
    canonical = files(template, canonical_root, runtime)
    if canonical_root + '/SKILL.md' not in canonical:
        raise ValueError('The single canonical skill is absent')
    aliases = registry.get('aliases', [])
    if not isinstance(aliases, list) or any(not isinstance(a, str) or not re.fullmatch(r'[a-z][a-z0-9-]*', a)
                                            or a == 'orkest' or a in manifest.get('legacy_skills', {}) for a in aliases):
        raise ValueError('Registry aliases must be short unique names that are neither the suite skill nor a retired skill')
    for alias in aliases:
        alias_root = registry['authoring'] + '/' + alias
        alias_files = files(template, alias_root, runtime)
        if alias_root + '/SKILL.md' not in alias_files:
            raise ValueError('Alias skill is absent: ' + alias)
        canonical.update(alias_files)
    desired = {}
    for source, data in canonical.items():
        suffix = source[len(registry['authoring']):]
        for root in roots:
            desired[root + suffix] = data
        desired[source] = data
    for name in manifest.get('managed', {}):
        path = runtime.migration.checked_path(template, name)
        data = path.read_bytes()
        if digest(data) != manifest['managed'][name]:
            raise ValueError('Managed release bytes do not match the manifest: ' + name)
        desired[name] = data
    for name, expected in manifest.get('configuration', {}).items():
        if digest(runtime.migration.checked_path(template, name).read_bytes()) != expected:
            raise ValueError('Native configuration bytes differ from release: ' + name)
    preserved = []
    # Local documentation is deliberately preserved during Update. Once installed,
    # it is adopter content, not an immutable copy of the distribution's seed.
    seed_inputs = manifest.get('seeds', {}) if Path(template).resolve() != Path(repo).resolve() else {}
    for name, expected in seed_inputs.items():
        source = runtime.migration.checked_path(template, name)
        data = source.read_bytes()
        if digest(data) != expected:
            raise ValueError('Seed release bytes differ: ' + name)
        legacy_record = (name.replace('docs/orkest/', 'docs/', 1)
                         if name == 'docs/orkest/LOGBOOK.md' or name.startswith('docs/orkest/handoffs/') else None)
        if legacy_record and runtime.migration.checked_path(repo, legacy_record).exists():
            # Migration owns this existing record. Seeding its destination first
            # would collide with git mv and could discard customized content.
            preserved.append(legacy_record)
            continue
        target = runtime.migration.checked_path(repo, name)
        if not target.exists() or digest(target.read_bytes()) in manifest.get('legacy_files', {}).get(name, []):
            desired[name] = data
        else:
            preserved.append(name)
    desired['harness-registry.json'] = runtime.migration.checked_path(template, 'harness-registry.json').read_bytes()
    # Startup runs from the installed repository, not the update distribution.
    # The manifest is self-bound by identity and therefore excluded from managed hashes.
    desired['orkest-upgrade.json'] = runtime.migration.checked_path(template, 'orkest-upgrade.json').read_bytes()
    if options.get('update'):
        # The legacy pack fields (source, components, surface, pack) describe the pre-Orkest
        # updater and nothing reads them here; `updated` is when this release was installed.
        import datetime
        installed_on = marker.get('updated')
        if marker.get('methodology') != manifest['release'] or not installed_on:
            installed_on = datetime.date.today().isoformat()
        marker = {key: marker[key] for key in ('schema', 'adopted') if key in marker}
        marker.update(schema=1, methodology=manifest['release'], updated=installed_on)
        desired['.orkest/version.json'] = (json.dumps(marker, indent=2) + '\n').encode('utf-8')
    # Bind the local distribution, never target-specific marker fields/seed selections.
    # Update, init and startup must resolve the same transaction identity.
    identity = digest(json.dumps(manifest, sort_keys=True).encode('utf-8') +
        desired['harness-registry.json'] + b''.join(
        name.encode('utf-8') + b'\0' + data for name, data in sorted(canonical.items())))
    # Update installs the suite skill into an adopter's authoring catalog too (desired[source]),
    # so retirement covers that catalog as well as every harness discovery root.
    retire_roots = list(dict.fromkeys(roots + [registry['authoring']]))
    return dict(action='upgrade', status='qualified', changed=False, manifest=manifest,
                roots=roots, retire_roots=retire_roots, canonical=canonical_root, desired=desired,
                identity=identity, preserved=preserved)


def migration_handover(repo, moves, runtime, after_each=None):
    """Preserve run ledgers and original report locations across path/identity changes."""
    for move in moves:
        if not move.get('id'):
            continue
        old, new = move['source'], move['destination']
        old_key = runtime.tracker_stem(old)
        old_file = runtime.state_path(repo, old_key)
        state = runtime.read_json(old_file)
        if not state or state.get('target') != old:
            continue
        new_file = runtime.state_path(repo, move['id'])
        for phase, record in state.get('phases', {}).items():
            if record.get('bookkeeping'):
                record.setdefault('report_path', 'docs/orkest/qa/' + Path(old).stem + '-' + phase + '.json')
            if 'tracker_sha256' in record:
                record['tracker_sha256'] = digest((repo / new).read_bytes())
        state['target'], state['migration_pending'] = new, False
        if new_file.exists() and runtime.read_json(new_file) != state:
            raise ValueError('New identity already has a distinct run ledger')
        runtime.save_json(new_file, state)
        if after_each:
            after_each('ledger-written')
        active = runtime.read_json(runtime.metadata(repo) / 'active.json', {})
        if active.get('target') == old:
            runtime.save_json(runtime.metadata(repo) / 'active.json', dict(target=new, key=move['id']))
        if after_each:
            after_each('active-written')
        # The retired key remains as recoverable historical metadata, never preferred.


def reconcile(repo, template, options=None, runtime=None):
    options = options or {}
    if runtime is None:
        import orkest as runtime
    repo, template = runtime.migration.repository(repo), Path(template).resolve()
    facts = inspect(repo, template, options, runtime)
    if facts['status'] != 'qualified':
        return facts
    if (not options.get('execute') or options.get('dry') or options.get('no_commit') or
            options.get('doctor') or runtime.lane(options) == 'unattended'):
        return report('preview', roots=facts['roots'], reason='This invocation does not authorize upgrade writes')
    runtime.preflight(repo, None, options)
    session = runtime.session_id(options)
    if not session:
        return report('session-required', reason='Startup needs the actual native session identity')
    runtime.migration.check_writer_locks(repo, session, recover=True)
    if runtime.lock_fields(repo):
        return report('writer-active', reason='Finish the active target before startup upgrade')
    for name in ('scheduler.json', '.orkest/scheduler.json'):
        config = read(repo, name, runtime, {})
        import datetime
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        if any(s.get('enabled') is True and s.get('targetImpls') and s.get('enabledUntil', '') > now
               for s in config.get('shifts', [])):
            return report('armed-target', reason='Startup upgrade defers while scheduler targets are armed')
    # No installed skill is removed until both runtime call sites and native readers are compatible.
    consumers = runtime.consumer_readiness(repo)
    if not consumers['ready']:
        return report('consumer-readiness-required', reason=consumers['reason'], roots=facts['roots'])
    runtime.acquire(repo, None, options)
    try:
        return apply_stages(repo, template, options, runtime, facts, session)
    finally:
        runtime.release(repo, dict(options, session=session))


def apply_stages(repo, template, options, runtime, facts, session):
    journal_path = metadata_path(repo, 'upgrade/journal.json', runtime)
    journal = runtime.read_json(journal_path)
    if journal and 'complete' in journal['completed']:
        if journal.get('identity') != facts['identity']:
            if version(journal.get('release')) >= version(facts['manifest']['release']):
                raise ValueError('Completed release bytes changed without a newer release identity')
        elif (all((repo / name).is_file() and (repo / name).read_bytes() == data for name, data in facts['desired'].items())
              and not hook_plans(repo, template, facts['manifest'], runtime) and not runtime.layout(repo)['needs_migration']
              and not any(files(repo, root + '/' + name, runtime) for root in facts['retire_roots']
                          for name in facts['manifest'].get('legacy_skills', {}))):
            return report('complete', roots=facts['roots'], commits=journal['commits'], preserved=facts['preserved'])
        archived = metadata_path(repo, 'upgrade/history/' + journal['identity'] + '.json', runtime)
        if archived.exists() and runtime.read_json(archived) != journal:
            archived = metadata_path(repo, 'upgrade/history/' + digest(journal_path.read_bytes()) + '.json', runtime)
        runtime.save_json(archived, journal)
        journal = None
    elif journal and journal.get('identity') != facts['identity']:
        raise ValueError('Pending upgrade belongs to different release bytes; recover that transaction first')
    if not journal:
        journal = dict(schema=1, identity=facts['identity'], release=facts['manifest']['release'],
                       operations=[], completed=[], commits=[], conflicts=[])
    dirty = set(runtime.git(repo, 'diff', '--name-only', 'HEAD', '-z').split('\0'))
    tracked = set(runtime.git(repo, 'ls-files', '-z').split('\0'))
    owned_path = metadata_path(repo, 'upgrade/owned.json', runtime)
    owned = runtime.read_json(owned_path, {})
    count = 0

    def save():
        runtime.save_json(journal_path, journal)

    def checkpoint(stage):
        nonlocal count
        save()
        count += 1
        if options.get('fail_after') == count or options.get('fail_stage') == stage:
            raise ValueError('Injected interruption after ' + stage)

    def image(data):
        if data is None:
            return None
        sha = digest(data)
        path = metadata_path(repo, 'upgrade/images/' + sha, runtime)
        if not path.exists():
            runtime.migration.atomic_write(path, data)
        if digest(path.read_bytes()) != sha:
            raise ValueError('Upgrade backup/image is corrupt')
        return sha

    def mutate(stage, name, desired, accepted):
        path = runtime.migration.checked_path(repo, name)
        actual = path.read_bytes() if path.is_file() else None
        before, after = digest(actual), digest(desired)
        if before == after:
            return
        op = next((op for op in journal['operations'] if op['path'] == name and op['stage'] == stage), None)
        if op:
            if before not in (op['before'], op['after']):
                raise ValueError('Local edit after interrupted upgrade: ' + name)
        else:
            if name in dirty or (actual is not None and before not in accepted):
                journal['conflicts'].append(dict(path=name, reason='Local/custom bytes or existing staged edits preserved'))
                return
            op = dict(stage=stage, path=name, before=image(actual), after=image(desired))
            journal['operations'].append(op)
            save()  # Write-ahead record precedes the first mutation.
            if options.get('fail_stage') == 'prepared:' + stage:
                raise ValueError('Injected interruption before ' + stage)
        if desired is None:
            path.unlink()
        else:
            runtime.migration.atomic_write(path, desired)
        checkpoint(stage)

    # Replay every write-ahead operation before planning later stages.
    for op in list(journal['operations']):
        path = runtime.migration.checked_path(repo, op['path'])
        current = digest(path.read_bytes() if path.is_file() else None)
        if current == op['after']:
            continue
        if current != op['before']:
            raise ValueError('Interrupted upgrade conflicts with local content: ' + op['path'])
        data = None
        if op['after']:
            data = metadata_path(repo, 'upgrade/images/' + op['after'], runtime).read_bytes()
            if digest(data) != op['after']:
                raise ValueError('Recorded upgrade image changed')
        mutate(op['stage'], op['path'], data, [op['before']])
    journal['conflicts'] = []
    for name, data in sorted(facts['desired'].items()):
        accepted = [owned.get(name)] + facts['manifest'].get('legacy_files', {}).get(name, [])
        mutate('install', name, data, accepted)
    missing = [name for name, data in facts['desired'].items()
               if not (repo / name).is_file() or (repo / name).read_bytes() != data]
    if missing:
        save()
        return report('conflict', roots=facts['roots'], conflicts=journal['conflicts'], pending=missing)
    if 'install-verified' not in journal['completed']:
        journal['completed'].append('install-verified')
        checkpoint('install-verified')
    # Validate structured/local native wiring before retiring anything; apply it later.
    configuration = hook_plans(repo, template, facts['manifest'], runtime)
    if set(configuration) & dirty:
        return report('conflict', roots=facts['roots'], conflicts=[
            dict(path=name, reason='Uncommitted local hook changes preserved') for name in sorted(set(configuration) & dirty)])
    # Customized legacy directories stay entirely intact, including owned siblings.
    for root in facts['retire_roots']:
        for name, approved in sorted(facts['manifest'].get('legacy_skills', {}).items()):
            if name == 'orkest' or not re.fullmatch(r'[a-z][a-z0-9-]*', name):
                raise ValueError('Unsafe retired skill name')
            prefix = root + '/' + name
            existing = files(repo, prefix, runtime)
            unknown = [path for path, data in existing.items() if digest(data) not in approved.get(path[len(prefix) + 1:], [])
                       or path in dirty or (path not in tracked and owned.get(path) != digest(data))]
            if unknown:
                journal['conflicts'].append(dict(path=prefix, reason='Customized legacy skill preserved', files=unknown))
                continue
            for path in sorted(existing):
                mutate('retire', path, None, [digest(existing[path])])
            for op in journal['operations']:
                if op['stage'] == 'retire' and op['path'].startswith(prefix + '/'):
                    parent = (repo / op['path']).parent
                    while parent != repo / root and parent.is_dir() and not any(parent.iterdir()):
                        parent.rmdir()
                        parent = parent.parent
    save()
    if journal['conflicts']:
        return report('conflict', roots=facts['roots'], conflicts=journal['conflicts'])
    for name, data in configuration.items():
        current = (repo / name).read_bytes() if (repo / name).is_file() else None
        mutate('configure', name, data, [digest(current)])
    # Commit only actual transaction changes; recover a crash after Git commit without a duplicate.
    paths = sorted(set(op['path'] for op in journal['operations']) | set(facts['desired']))
    # Machine-local hooks/markers may deliberately be ignored by the adopter.
    # Preserve that policy: install/journal them, but do not force them into Git.
    ignore = subprocess.run(['git', '-C', str(repo), 'check-ignore', '-z', '--stdin'],
        input=('\0'.join(paths) + '\0').encode('utf-8'), capture_output=True,
        env=dict(os.environ, GIT_LITERAL_PATHSPECS='0'))
    if ignore.returncode not in (0, 1):
        raise ValueError('Cannot establish ignored-path policy for the upgrade commit')
    ignored = set(ignore.stdout.decode('utf-8').split('\0'))
    paths = [name for name in paths if name in tracked or name not in ignored]
    changed = [name for name in paths if runtime.git(repo, 'diff', 'HEAD', '--', name)]
    new = [name for name in paths if (repo / name).exists() and not runtime.git(repo, 'ls-files', '--', name)]
    if changed or new:
        journal['commit_base'] = runtime.git(repo, 'rev-parse', 'HEAD')
        save()
        commit = runtime.scoped_commit(repo, options, 'refactor(orkest): upgrade harness to ' + facts['manifest']['release'] +
                                       '\n\nUpgrade-Id: ' + facts['identity'],
                                       sorted(set(changed + new)), session)
        if options.get('fail_stage') == 'committed-before-receipt':
            raise ValueError('Injected interruption after commit before receipt')
        journal['commits'].append(commit)
        checkpoint('upgrade-commit')
    elif journal.get('commit_base') and not journal['commits']:
        head = runtime.git(repo, 'rev-parse', 'HEAD')
        message = runtime.git(repo, 'log', '-1', '--format=%B')
        if (runtime.git(repo, 'rev-parse', 'HEAD^') != journal['commit_base'] or
                'Upgrade-Id: ' + facts['identity'] not in message):
            raise ValueError('Upgrade commit receipt cannot be recovered from this HEAD')
        journal['commits'].append(head)
        save()
    for name, data in facts['desired'].items():
        owned[name] = digest(data)
    runtime.save_json(owned_path, owned)
    # Metadata progress is not a layout marker. Migration independently checks tree cleanliness.
    if journal.get('migration') or runtime.layout(repo)['needs_migration']:
        if runtime.git(repo, 'status', '--porcelain', '--untracked-files=all'):
            save()
            return report('layout-deferred', roots=facts['roots'], commits=journal['commits'], reason='Working tree has local changes')
        if not runtime.compatibility_verified(repo):
            return report('layout-deferred', roots=facts['roots'], commits=journal['commits'], reason='Dual-read release bytes are not verified')
        if not journal.get('migration'):
            journal['migration'] = runtime.migration.build_plan(repo, session=session)
            save()  # The move map survives the migration commit/marker boundary.
        plan = journal['migration']
        if runtime.layout(repo)['needs_migration'] or runtime.migration.journal_path(repo).exists():
            runtime.migration.apply_plan(repo, plan, session=session)
        else:
            for name, text in plan['writes'].items():
                if runtime.migration.checked_path(repo, name).read_bytes() != text.encode('utf-8'):
                    raise ValueError('Committed migration content changed before handover: ' + name)
            commits = runtime.git(repo, 'log', '--format=%H', '--fixed-strings', '--grep=Migration-Id: ' + plan['transaction'])
            if not commits:
                raise ValueError('Missing migration commit while resuming handover')
        checkpoint('migration-committed')
        if not journal.get('handover_complete'):
            migration_handover(repo, plan['moves'], runtime, checkpoint)
            journal['handover_complete'] = True
            checkpoint('layout')
    if 'complete' not in journal['completed']:
        journal['completed'].append('complete')
        checkpoint('complete')
    return dict(action='upgrade', status='complete', changed=bool(changed or new), roots=facts['roots'],
                commits=journal['commits'], preserved=facts['preserved'], backups=str(journal_path.parent / 'images'))
