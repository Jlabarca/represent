"""Pure ORK tracker contracts. Filesystem and Git observations come from callers."""
import copy
import fnmatch
import json
import re
from pathlib import PurePosixPath

# Legacy ids are ORK- and six digits. A project that declares a key in KEY_FILE mints
# KEY-N instead: an unpadded number from the same counter, so ROM-82 aliases ORK-000082.
LEGACY_ID = r'ORK-[0-9]{6}'
KEY = r'(?!ORK\b)[A-Z][A-Z0-9]{1,5}'
ID = r'(?:' + LEGACY_ID + r'|' + KEY + r'-[1-9][0-9]*)'
KEY_FILE = 'docs/orkest/.key'
NAME = r'[A-Z][A-Z0-9_-]*'
SHA = r'[0-9a-fA-F]{40}'
LAYOUT_VERSION = 1
# Write format first; `-ORK.md` and legacy `-IMPL.md` remain readable, never rewritten in place.
TRACKER_SUFFIXES = ('.imp.md', '-ORK.md', '-IMPL.md')
WRITE_SUFFIX = TRACKER_SUFFIXES[0]
# Consumers must certify this before a migration may write WRITE_SUFFIX trackers.
WRITE_CAPABILITY = 'imp-layout-v1'
# Optional per-project branch layout: {"schema": 1, "integration": "develop", "also": ["codex/*"]}.
BRANCH_FILE = '.orkest/branches.json'
BRANCH_KEYS = ('schema', 'integration', 'also')


def parse_branch_policy(text):
    """Validate the optional branch layout. None (no file) keeps the inferred default."""
    if text is None:
        return dict(integration=None, also=[])

    def bad(why):
        return ValueError('%s: %s' % (BRANCH_FILE, why))

    try:
        data = json.loads(text)
    except ValueError:
        raise bad('not valid JSON')
    if not isinstance(data, dict):
        raise bad('must be a JSON object')
    if type(data.get('schema')) is not int or data['schema'] != 1:
        raise bad('schema must be 1')
    extra = sorted(set(data) - set(BRANCH_KEYS))
    if extra:
        raise bad('unknown key ' + ', '.join(extra))
    integration = data.get('integration')
    if integration is not None and (not isinstance(integration, str) or not integration.strip()):
        raise bad('integration must be a branch name')
    also = data.get('also', [])
    if not isinstance(also, list) or any(not isinstance(item, str) or not item.strip() for item in also):
        raise bad('also must be a list of branch name globs')
    return dict(integration=integration.strip() if integration else None, also=[item.strip() for item in also])


def branch_allowed(branch, integration, policy):
    """True on the integration branch or on a declared long-lived working branch."""
    return branch == integration or any(fnmatch.fnmatchcase(branch, glob) for glob in policy['also'])


def tracker_suffix(path):
    """The tracker filename suffix of a path, or None. Suffixes are case-sensitive."""
    name = PurePosixPath(str(path).replace('\\', '/')).name
    for suffix in TRACKER_SUFFIXES:
        if name.endswith(suffix) and len(name) > len(suffix):
            return suffix
    return None


def tracker_stem(path):
    """The description part of a tracker filename, as spelled on disk."""
    suffix = tracker_suffix(path)
    return PurePosixPath(str(path).replace('\\', '/')).name[:-len(suffix)] if suffix else None


def tracker_key(path):
    """Casefolded stem; equal keys collide across all suffixes and lifecycle folders."""
    stem = tracker_stem(path)
    return stem.casefold() if stem else None


def tracker_filename(description):
    """New trackers: lowercase DESCRIPTION_NAME; the H1 keeps the uppercase name."""
    return description.lower() + WRITE_SUFFIX


def _path(value):
    value = str(value).replace('\\', '/')
    if not value or ':' in value or value.startswith('/') or '..' in value.split('/'):
        raise ValueError('Expected repository-relative path')
    return PurePosixPath(value).as_posix()


def _lifecycle(path):
    parts = PurePosixPath(path).parts
    for state in ('planned', 'parked'):
        if state in parts[2:-1]:
            return state
    if len(parts) > 3 and parts[1:3] == ('orkest', 'done'):
        return 'done'
    if len(parts) > 2 and parts[1] == 'impl':
        return 'done'
    return 'live'


def tracker_layout(path):
    """'old', 'new' or None for a repository-relative path."""
    parts = PurePosixPath(path).parts
    suffix = tracker_suffix(path)
    if (suffix == '-IMPL.md' and parts[0] == 'docs' and
            (len(parts) == 2 or (len(parts) >= 3 and parts[1] == 'impl'))):
        return 'old'
    if (suffix in ('-ORK.md', '.imp.md') and parts[:2] == ('docs', 'orkest') and
            (len(parts) == 3 or (len(parts) == 4 and parts[2] in ('done', 'planned', 'parked')))):
        return 'new'
    return None


def _content_lines(text):
    """Ignore fenced examples, including fences within checklist sections."""
    fence = None
    for line in text.splitlines():
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


# Migrated trackers spell phases `### Phase 1`, `### Phase 2a`, `### P0 — …`, `### CR.0 — …`
# or `### Phase R-0`; the heading label keys the phase. A box ID is NAME segments, then the
# label (or its digits, as P1 → 1), then one or more numeric segments: MN.P0.1, SPLIT.1.1, F0.1.
# Without the word "Phase" a separator must follow, so `### P0 evidence …` stays prose.
PHASE_LABEL = r'[A-Z]{0,2}-?\d+[a-z]?'
PHASE_HEADING = re.compile(r'^### (?:Phase (?:' + NAME + r'\.)?(' + PHASE_LABEL + r')(?=\s|$|[:—–])|(?:' +
                           NAME + r'\.)?(' + PHASE_LABEL + r')(?=\s*$|\s*:|\s+[—–-]\s|\s+\())')
BOX_ID = re.compile(r'^(?:\*\*)?([A-Z0-9][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+)+)')


def phase_label(line):
    """The phase label a `###` heading declares, or None."""
    match = PHASE_HEADING.match(line)
    return (match.group(1) or match.group(2)) if match else None


def _box_in_phase(box_id, label):
    parts = box_id.split('.')
    labels = {label, re.sub(r'^[A-Z]+-?(?=\d)', '', label)}
    return any(part in labels and all(re.fullmatch(NAME, p) for p in parts[:i]) and
               all(re.fullmatch(r'\d+[a-z]?', p) for p in parts[i + 1:])
               for i, part in enumerate(parts[:-1]))


def phase_section(text, label):
    """The body under the `###` heading declaring phase `label`, up to the next phase heading."""
    body = None
    for line in text.splitlines():
        found = phase_label(line)
        if found is not None:
            if body is not None:
                break
            if found == label:
                body = []
            continue
        if body is not None:
            body.append(line)
    return None if body is None else '\n'.join(body)


def parse_tracker(text, path):
    """Parse tracker content without opening its path."""
    path = _path(path)
    errors, boxes, phases = [], [], []
    if tracker_layout(path) is None:
        errors.append('Tracker is outside supported docs layout')
    lines = list(_content_lines(text))
    headings = [line[2:].strip() for line in lines if line.startswith('# ')]
    title = headings[0] if headings else ''
    if len(headings) != 1:
        errors.append('Expected exactly one H1')
    identity = None
    suffix = tracker_suffix(path)
    if suffix in ('-ORK.md', '.imp.md'):
        front = re.match(r'\A\ufeff?---\s*\n(.*?)\n---\s*(?:\n|$)', text, re.S)
        ids = re.findall(r'^id:\s*[\'\"]?('+ID+r')[\'\"]?\s*$',
                         front.group(1), re.M) if front else []
        id_keys = re.findall(r'^id:', front.group(1), re.M) if front else []
        match = re.fullmatch('('+ID+'): ('+NAME+')', title)
        if len(ids) != 1 or len(id_keys) != 1 or not match or ids[0] != match.group(1):
            errors.append('Frontmatter and H1 identity must agree')
        elif ids[0] == 'ORK-000000':
            errors.append('ID must be positive')
        else:
            identity, title = match.groups()
            stem = tracker_stem(path)
            if stem != title if suffix == '-ORK.md' else stem.casefold() != title.casefold():
                errors.append('Filename and H1 description must agree')
    elif suffix != '-IMPL.md':
        errors.append('Unsupported tracker filename')
    in_checklist, phase = False, None
    seen_boxes = set()
    for line in lines:
        if line.startswith('## '):
            in_checklist = line.strip() == '## Checklist'
            phase = None
        if not in_checklist:
            continue
        label = phase_label(line)
        if label is not None:
            phase = label
            if phase in phases:
                errors.append('Duplicate phase: ' + phase)
            phases.append(phase)
        match = re.match(r'^- \[([ xX])\]\s+(.+)$', line)
        if not match:
            continue
        checked, body = match.groups()
        box_match = BOX_ID.match(body)
        if not box_match or not phase or not _box_in_phase(box_match.group(1), phase):
            errors.append('Box must have an ID matching its phase')
            continue
        box_id = box_match.group(1)
        if box_id in seen_boxes:
            errors.append('Duplicate box: ' + box_id)
        seen_boxes.add(box_id)
        human = bool(re.search(r'\bhuman:', body, re.I))
        # `evidence: …` and the qualified `evidence (live, Editor, 2026-10-05): …` sessions also write.
        evidence_match = re.search(r'\bevidence\s*(?:\([^)\n]{0,120}\))?\s*:\s*(.*)', body, re.I)
        evidence = evidence_match.group(1).strip() if evidence_match else ''
        if evidence.lower().strip('`<>. ') in ('', 'none', 'tbd', 'pending'):
            evidence = ''
        if human and not evidence:
            receipt = re.search(r'\bdone \d{4}-\d{2}-\d{2} by the operator\b', body)
            evidence = receipt.group(0) if receipt else ''
        boxes.append(dict(id=box_id, phase=phase, checked=checked.lower() == 'x',
                          human=human, evidence=evidence,
                          done=checked.lower() == 'x' and bool(evidence)))
    if not phases or not boxes:
        errors.append('Expected phases and checklist boxes')
    for number in phases:
        if not any(box['phase'] == number for box in boxes):
            errors.append('Phase has no boxes: ' + number)
    return dict(id=identity, title=title, path=path, lifecycle=_lifecycle(path),
                phases=phases, boxes=boxes, errors=errors)


def detect_layout(paths, marker_version=None):
    """Classify supplied repository-relative paths."""
    if marker_version is not None and (type(marker_version) is not int or marker_version < 1):
        raise ValueError('Layout version must be a positive integer')
    old, new = False, marker_version is not None
    for value in paths:
        path = _path(value)
        old |= tracker_layout(path) == 'old'
        old |= path == 'docs/LOGBOOK.md' or path.startswith('docs/handoffs/')
        new |= tracker_layout(path) == 'new'
    layout = 'mixed' if old and new else 'old' if old else 'new' if new else 'empty'
    return dict(layout=layout, version=marker_version,
                supported=marker_version is None or marker_version <= LAYOUT_VERSION,
                needs_migration=old or (new and marker_version != LAYOUT_VERSION))


def read_key(raw):
    """The project key from KEY_FILE content; None when no key is declared."""
    if raw is None:
        return None
    key = raw.strip()
    if not re.fullmatch(KEY, key):
        raise ValueError('Project key must be 2-6 capitals or digits, start with a letter and not be ORK')
    return key


def id_number(identity):
    return int(identity.rsplit('-', 1)[1])


def same_id(query, identity, key=None):
    """Exact, or a legacy ORK id and the project's keyed id with the same number."""
    query, identity = query.upper(), identity.upper()
    if query == identity:
        return True
    if not key or not re.fullmatch(ID, query) or not re.fullmatch(ID, identity):
        return False
    return ({query.split('-')[0], identity.split('-')[0]} == {'ORK', key} and
            id_number(query) == id_number(identity))


def resolve_target(query, trackers, active_tracker=None, key=None):
    """Resolve a live tracker or return bootstrap/ask."""
    live = [t for t in trackers if t['lifecycle'] == 'live' and not t['errors']]
    query = (query or '').strip()

    def result(action, matches=(), reason=''):
        return dict(action=action, target=copy.deepcopy(matches[0]) if action == 'run' else None,
                    candidates=sorted(t['path'] for t in matches), reason=reason)

    def choose(matches, reason):
        if len(matches) == 1:
            identity = matches[0]['id']
            if identity and sum(t['id'] == identity for t in live) > 1:
                matches = [t for t in live if t['id'] == identity]
        return result('run' if len(matches) == 1 else 'ask', matches, reason)

    # An id-shaped query is an identity unless it names a live tracker (`cache-2`); a malformed
    # ORK id still asks rather than bootstraps.
    upper = query.upper()
    names = {name.casefold() for t in live for name in (t['title'], tracker_stem(t['path']) or '')}
    if upper.startswith('ORK-') and upper[4:5].isdigit() or re.fullmatch(ID, upper) and upper.casefold() not in names:
        matches = [t for t in live if t['id'] and same_id(query, t['id'], key)]
        return choose(matches, 'Exact identity or unknown/ambiguous id')
    if query:
        def words(value):
            return re.findall(r'[a-z0-9]+', value.lower())
        query_words = words(query)
        ranked = []
        for tracker in live:
            names = [tracker['title'], tracker_stem(tracker['path']) or '']
            score = 0.0
            for name in names:
                tokens = words(name)
                union = set(query_words) | set(tokens)
                overlap = len(set(query_words) & set(tokens)) / len(union) if union else 0
                score = max(score, 2.0 if tokens == query_words else overlap)
            ranked.append((score, tracker))
        best = max((s for s, _ in ranked), default=0)
        if best >= 0.5:
            return choose([t for s, t in ranked if s == best], 'Description match')
        return result('bootstrap', reason='Unmatched description')
    matches = [t for t in live if active_tracker is not None and
               active_tracker in (t['id'], t['path'])]
    return choose(matches, 'Active tracker or mandatory target question')


def next_action(tracker=None, facts=None, options=None):
    """Propose one action from explicit evidence and invocation facts."""
    facts, options = facts or {}, options or {}
    migration_pending = False

    def answer(action, reason, phase=None, box=None):
        if options.get('stop_at') == action:
            action, reason = 'stopped', 'Explicit stop_at reached: ' + action
        result = dict(action=action, reason=reason)
        if migration_pending:
            result['migration_pending'] = True
        if phase is not None:
            result['phase'] = phase
        if box is not None:
            result['box'] = box
        return result

    def receipt(value):
        return isinstance(value, str) and re.fullmatch(SHA, value) is not None

    if options.get('dry_run'):
        return answer('stopped', 'Dry run; no mutations')
    lane = options.get('lane', 'interactive')
    if lane not in ('interactive', 'unattended'):
        return answer('blocked', 'Unknown execution lane')
    if not all(facts.get(key) is True for key in ('lock_owned', 'branch_ok', 'worktree_ok')):
        return answer('blocked', 'Require owned lock, allowed branch and worktree')
    if tracker and tracker['errors']:
        return answer('blocked', 'Invalid tracker: ' + '; '.join(tracker['errors']))
    if tracker and tracker['lifecycle'] != 'live':
        return answer('blocked', 'Target must be live')
    if lane == 'unattended' and (facts.get('agent_blocked') or
            (tracker and any(b['human'] and not b['checked'] for b in tracker['boxes']))):
        return answer('blocked', 'Rule 24: agent-blocked or unchecked human gate')
    layout = facts.get('layout', {})
    if not layout.get('supported') or layout.get('layout') not in ('old', 'new', 'mixed', 'empty'):
        return answer('blocked', 'Unknown or unsupported layout version')
    if layout.get('needs_migration'):
        if (lane == 'interactive' and options.get('person_invoked') is True and tracker
                and tracker['id'] is None and facts.get('compatibility_verified') is True):
            migration_pending = True
        else:
            return answer('migration-required', 'Migrate only in a person-invoked interactive run')
    if tracker is None:
        if lane == 'unattended' or not options.get('person_invoked'):
            return answer('blocked', 'Bootstrap needs a person-invoked target description')
        return answer('bootstrap', 'Create tracker from resolved description')
    if options.get('one_phase') and options.get('target_phase') not in tracker['phases']:
        return answer('blocked', 'One-phase invocation requires its selected target_phase')
    for phase in tracker['phases']:
        boxes = [b for b in tracker['boxes'] if b['phase'] == phase]
        count = facts.get('source_counts', {}).get(phase)
        if type(count) is not int or count < 0:
            return answer('blocked', 'Source-file scope must be established', phase)
        commits = facts.get('commits', {})
        pending = [b for b in boxes if not b['done'] or not receipt(commits.get(b['id']))]
        if pending:
            if count >= 2 and not receipt(facts.get('plans', {}).get(phase)):
                return answer('plan', 'Rule 14: commit plan before source edits', phase)
            box = pending[0]
            if box['human'] and not box['done']:
                return answer('ask', 'Human evidence is required; never infer it', phase, box['id'])
            if not box['done']:
                return answer('tdd', 'Box needs implementation and evidence', phase, box['id'])
            if options.get('no_commit'):
                return answer('stopped', 'No-commit preview cannot checkpoint', phase, box['id'])
            return answer('commit-box', 'Evidence exists; exact-path commit required', phase, box['id'])
        verification = facts.get('verification', {}).get(phase, {})
        tier = facts.get('verify_tiers', {}).get(phase, 'unit')
        counts = [verification.get(key) for key in ('passed', 'total', 'skipped')]
        valid_counts = all(type(n) is int and n >= 0 for n in counts)
        pinned = (receipt(verification.get('commit')) and
                  verification.get('commit') == facts.get('phase_heads', {}).get(phase))
        behavioral = (tier in ('unit', 'integration', 'e2e') and valid_counts and
                      counts[0] > 0 and counts[0] + counts[2] == counts[1])
        nonbehavioral = (tier in ('docs', 'build') and verification.get('tier') == tier
                         and type(verification.get('exit_code')) is int
                         and verification['exit_code'] == 0
                         and not facts.get('test_changes', {}).get(phase)
                         and (tier != 'docs' or count == 0))
        verified = pinned and (behavioral or nonbehavioral)
        if not verified:
            return answer('verify', 'Require declared verify tier pinned to phase source head', phase)
        for key, action in (('qa', 'qa-pass'), ('logbook', 'logbook'),
                            ('bookkeeping', 'commit-phase')):
            if not receipt(facts.get(key, {}).get(phase)):
                if options.get('no_commit') and action == 'commit-phase':
                    return answer('stopped', 'No-commit preview cannot checkpoint', phase)
                return answer(action, 'Missing committed phase checkpoint: ' + key, phase)
        if options.get('one_phase') and phase == options['target_phase']:
            return answer('stopped', 'Explicit one-phase boundary', phase)
    if lane == 'unattended':
        return answer('stopped', 'Rule 24: checkpoint only; never promote')
    if options.get('no_commit') or options.get('no_promote') or options.get('stop_at'):
        return answer('stopped', 'Invocation limits withhold promotion')
    if not options.get('person_invoked') or not options.get('default_run'):
        return answer('stopped', 'No person-invoked default promotion decision')
    if migration_pending:
        return answer('blocked', 'Complete the pending layout migration before promotion')
    missing = [key for key in ('reference_exists', 'bugs_clear', 'all_gates_green')
               if facts.get(key) is not True]
    if missing:
        return answer('blocked', 'Promotion gates: ' + ', '.join(missing))
    if not receipt(facts.get('final_audit')):
        return answer('audit', 'Final independent gate audit required')
    if receipt(facts.get('promotion_commit')):
        return answer('done' if facts.get('feature_clean') is True else 'blocked',
                      'Promotion requires committed artifacts and no owned changes')
    return answer('promote', 'Person decided; apply verified gates without a second prompt')


def allocate_id(counter, existing_ids, key=None):
    """Allocate locally without persisting the counter. Numbers are unique across key spellings."""
    if key is not None and not re.fullmatch(KEY, key):
        raise ValueError('Invalid project key')
    limit = 999999 if key is None else None
    if type(counter) is not int or counter < 1 or limit and counter > limit:
        raise ValueError('Counter must be a positive integer' + (' up to 999999' if limit else ''))
    used = set()
    for identity in existing_ids:
        if not isinstance(identity, str) or not re.fullmatch(ID, identity) or id_number(identity) == 0:
            raise ValueError('Invalid existing ID')
        if id_number(identity) in used:
            raise ValueError('Duplicate existing ID number: ' + identity)
        used.add(id_number(identity))
    while counter in used and not (limit and counter > limit):
        counter += 1
    if limit and counter > limit:
        raise ValueError('ID space exhausted')
    return dict(id=key + '-' + str(counter) if key else 'ORK-%06d' % counter, next_counter=counter + 1)
