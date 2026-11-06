#!/usr/bin/env python3
"""Advisory pin and stale-path scanner for a box about to change source.

Run before the first source edit: it lists tests that pin a count, an
inventory, a route table, a snapshot or an enum, and test string literals that
point at repo paths which no longer exist. Everything is advisory except the
stale paths (exit 2). Stdlib only, Python 3.8 compatible, never writes to the
repository and never reads or prints environment values.
"""
import argparse
import json
import os
import re
import subprocess
import sys

CHANGE_KINDS = ('route', 'file', 'tool', 'migration', 'enum', 'dependency',
                'response-shape', 'rename')
MAX_BYTES = 512 * 1024
SNIPPET = 160

# Source extensions whose literals and assertions are worth reading.
CODE_EXT = {'.py', '.cs', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.java',
            '.go', '.rb', '.rs', '.kt', '.ps1', '.sh', '.php', '.swift', '.vb'}

TEST_PATH = re.compile(
    r'(^|/)([Tt]ests?|__tests__|[Ss]pecs?)/'
    r'|(^|/)[^/]*Tests?/'
    r'|(^|/)test_[^/]*$'
    r'|_test\.[^/]+$'
    r'|\.(test|spec)\.[^/]+$'
    r'|Tests?\.cs$')

SNAPSHOT_PATH = re.compile(
    r'\.snap$|(^|/)__snapshots__/|\.approved\.|(^|/)golden[^/]*(/|$)'
    r'|/golden/|(^|/)openapi[^/]*\.json$', re.I)

NOUNS = {
    'route': ('route', 'endpoint', 'handler', 'controller'),
    'tool': ('tool', 'adapter', 'handler', 'catalog', 'registry'),
    'file': ('file', 'glob', 'directory', 'folder'),
    'migration': ('migration', 'schema'),
    'enum': ('enum',),
    'dependency': ('dependency', 'dependencies', 'package', 'requirement'),
    'response-shape': ('response', 'payload', 'shape', 'schema'),
    'rename': ('file', 'path', 'name'),
}

COUNT_RE = re.compile(
    r'(Count|Length|len\(|\.size\b|toHaveLength|HaveCount|Assert\.Equal|'
    r'assertEqual|expect\()[^\n]{0,40}\b\d{2,}\b'
    r'|\b\d{2,}\b[^\n]{0,20}(len\(|\.Count|\.Length|\.size\b)')
SIZE_TOKEN = re.compile(r'len\(|\.Length|\.Count|\bCount\b|HaveCount|toHaveLength|\.size\b'
                        r'|\bset\(|HashSet|SetEquals|assertCountEqual|Distinct\(')
ASSERT_TOKEN = re.compile(r'assert|expect\(|Should|toBe|toEqual|toHaveLength|HaveCount', re.I)
ENUMERATE_RE = re.compile(
    r'glob\(|Directory\.(Get|Enumerate)Files|Directory\.(Get|Enumerate)Directories'
    r'|os\.listdir|readdirSync|rglob|iterdir|os\.walk')
ROUTE_RE = re.compile(r'MapGet|MapPost|MapPut|MapDelete|app\.(get|post|put|delete)\b|@(Get|Post|Put|Delete)\(')
ENUM_RE = re.compile(r'Enum\.(GetValues|GetNames)|list\(\w*Enum\w*\)|len\(\w*Enum\w*\)')
MIGRATION_COUNT_RE = re.compile(r'len\(|\.Count|\.Length|HaveCount|toHaveLength|iterdir|glob|GetFiles|listdir')
SHAPE_CONSUMER_RE = re.compile(
    r'localStorage|sessionStorage|JSON\.parse|\.json\(\)|Deserialize|persist|saved|deeplink|conversation|fixture',
    re.I)
SHAPE_PATH_RE = re.compile(r'(^|/)(fixtures?|__snapshots__|snapshots?|testdata)/|\.snap$|\.json$', re.I)

LITERAL_RE = re.compile(r'''(["'])([^"'\r\n]{3,200}?)\1''')
PATH_EXT = re.compile(r'\.(md|json|ya?ml|csproj|sln|cs|py|ts|zip|xlsx|sql)$')
TRACKER_NAME = re.compile(r'(-IMPL\.md|-ORK\.md|\.imp\.md|^CONTEXT\.md|^TODO\.md)$')
SKIP_LITERAL_CHARS = set('*?[]{}$%<>|^ \t')
CREATES_RE = re.compile(
    r'write|create|mkdir|makedirs|touch|save|dump|copy|move|rename|not\s*exist|'
    r'doesnotexist|assertfalse|assert not|shouldnot|tobe\(false\)', re.I)
ROOT_WALK_RE = re.compile(r'FindUpwards|find_repo_root|find_root|FindRepoRoot|while\s+not\b.*exist')
DOC_LITERAL_RE = re.compile(r'''["'][^"']+\.(md|json|ya?ml|toml|txt)["']''')
GIT_ANCHOR_RE = re.compile(r'''["']\.git["']|\.slnx?\b''')
GUARD_RE = re.compile(r'Guard|Architecture|Inventory|Pinned', re.I)
TEST_DEF_RE = re.compile(r'\bdef\s+\w+|\bclass\s+\w+|\bit\(|\btest\(|\bdescribe\(|\bvoid\s+\w+|\bTask\s+\w+|\[Fact|\[Theory')


class ScanError(Exception):
    pass


def _git(repo, *args):
    cmd = ['git', '-C', repo, '--literal-pathspecs'] + list(args)
    try:
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                              encoding='utf-8', errors='replace')
    except OSError as exc:
        raise ScanError('git unavailable: %s' % exc)
    return proc.returncode, proc.stdout


def _tracked(repo):
    code, out = _git(repo, 'ls-files', '-z')
    if code != 0:
        raise ScanError('not a git repository: %s' % repo)
    return sorted(p for p in out.split('\0') if p)


def _read(repo, rel):
    path = os.path.join(repo, rel)
    try:
        if not os.path.isfile(path) or os.path.getsize(path) > MAX_BYTES:
            return None
        with open(path, 'rb') as handle:
            data = handle.read()
    except OSError:
        return None
    if b'\0' in data:
        return None
    return data.decode('utf-8', 'replace')


def _is_comment(line):
    stripped = line.lstrip()
    return stripped.startswith(('#', '//', '*', '/*'))


def _snip(line):
    line = line.strip()
    return line if len(line) <= SNIPPET else line[:SNIPPET - 3] + '...'


def _is_test_code(rel):
    return bool(TEST_PATH.search(rel)) and os.path.splitext(rel)[1].lower() in CODE_EXT


def _touched_dirs(paths):
    names = set()
    for item in paths or ():
        folder = os.path.basename(os.path.dirname(item.replace('\\', '/').rstrip('/')))
        if len(folder) >= 3:
            names.add(folder.lower())
    return names


def _suffixes(tracked):
    found = set()
    for rel in tracked:
        parts = rel.split('/')
        for i in range(len(parts)):
            found.add('/'.join(parts[i:]))
    return found


def _stale_candidate(lit):
    if any(ch in SKIP_LITERAL_CHARS for ch in lit):
        return None
    if '://' in lit or lit.startswith(('/', '\\', '~')) or re.match(r'^[A-Za-z]:', lit):
        return None
    norm = lit.replace('\\', '/')
    while norm.startswith('./'):
        norm = norm[2:]
    base = norm.rsplit('/', 1)[-1]
    if not (PATH_EXT.search(norm) or TRACKER_NAME.search(base)):
        return None
    if '/' not in norm and not TRACKER_NAME.search(base):
        return None
    return norm


def _exists(repo, rel_test, norm, suffixes):
    if norm in suffixes or os.path.normpath(norm).replace('\\', '/') in suffixes:
        return True
    if os.path.exists(os.path.join(repo, norm)):
        return True
    return os.path.exists(os.path.join(repo, os.path.dirname(rel_test), norm))


def _scan_test_file(rel, text, kind, nouns, pins):
    lines = text.split('\n')
    low = text.lower()
    relevant = any(n in low for n in nouns)
    last_anchor = -100
    for i, raw in enumerate(lines):
        line = raw.rstrip('\r')
        if not line.strip() or _is_comment(line):
            continue
        no = i + 1
        if relevant and COUNT_RE.search(line):
            pins.append(dict(test_file=rel, line=no, kind='count', snippet=_snip(line),
                             why='asserts a collection size against a literal; the %s change moves it' % kind))
        if ENUMERATE_RE.search(line):
            window = lines[max(0, i - 6):i + 7]
            if any(SIZE_TOKEN.search(w) and ASSERT_TOKEN.search(w) for w in window):
                pins.append(dict(test_file=rel, line=no, kind='inventory', snippet=_snip(line),
                                 why='filesystem enumeration next to a size or set assertion'))
        if kind == 'route' and ROUTE_RE.search(line):
            pins.append(dict(test_file=rel, line=no, kind='route-table', snippet=_snip(line),
                             why='test references a route registration'))
        if kind == 'enum' and ENUM_RE.search(line):
            pins.append(dict(test_file=rel, line=no, kind='enum', snippet=_snip(line),
                             why='test enumerates enum members; a new value changes it'))
        if kind == 'migration' and re.search('migration', line, re.I) and MIGRATION_COUNT_RE.search(line):
            pins.append(dict(test_file=rel, line=no, kind='migration-count', snippet=_snip(line),
                             why='test counts or lists migrations; a new one changes it'))
        if ROOT_WALK_RE.search(line):
            window = '\n'.join(lines[max(0, i - 1):i + 7])
            if (no - last_anchor > 7 and DOC_LITERAL_RE.search(window)
                    and not GIT_ANCHOR_RE.search(window)):
                last_anchor = no
                pins.append(dict(test_file=rel, line=no, kind='repo-root-anchor', snippet=_snip(line),
                                 why='repo root located through a document; anchor on .git or the solution file'))


def _scan_stale(repo, rel, text, suffixes, stale):
    for i, raw in enumerate(text.split('\n')):
        line = raw.rstrip('\r')
        if not line.strip() or _is_comment(line) or CREATES_RE.search(line):
            continue
        for match in LITERAL_RE.finditer(line):
            norm = _stale_candidate(match.group(2))
            if norm and not _exists(repo, rel, norm, suffixes):
                stale.append(dict(test_file=rel, line=i + 1, literal=match.group(2),
                                  why='path literal exists neither in git ls-files nor on disk'))


def _grep(repo, patterns, limit):
    """Fixed-string git grep over tracked files; returns [(path, line, text)]."""
    args = ['grep', '-n', '-I', '--no-color']
    for pattern in patterns:
        args += ['-F', '-e', pattern]
    code, out = _git(repo, *args)
    hits = []
    for row in out.split('\n'):
        match = re.match(r'^(.*?):(\d+):(.*)$', row)
        if match:
            hits.append((match.group(1), int(match.group(2)), match.group(3).rstrip('\r')))
    hits.sort(key=lambda h: (h[0], h[1]))
    return hits[:limit]


def _symbol_pins(repo, kind, symbols, paths, limit):
    pins = []
    if kind == 'rename':
        names = [os.path.basename(p.replace('\\', '/')) for p in (paths or ())] + list(symbols or ())
        for name in sorted(set(n for n in names if n)):
            for rel, no, text in _grep(repo, [name], limit):
                pins.append(dict(test_file=rel, line=no, kind='rename-ref', snippet=_snip(text),
                                 why='still references the old name "%s"' % name))
        return pins
    for sym in symbols or ():
        patterns = [sym]
        if kind == 'response-shape':
            patterns = ['"%s"' % sym, "'%s'" % sym]
        for rel, no, text in _grep(repo, patterns, limit):
            if kind == 'response-shape':
                if not (SHAPE_PATH_RE.search(rel) or SHAPE_CONSUMER_RE.search(text)):
                    continue
                pins.append(dict(test_file=rel, line=no, kind='shape-consumer', snippet=_snip(text),
                                 why='consumes the key "%s" from a fixture, snapshot or stored payload' % sym))
            elif TEST_PATH.search(rel):
                pins.append(dict(test_file=rel, line=no, kind='symbol', snippet=_snip(text),
                                 why='test references "%s"' % sym))
            else:
                pins.append(dict(test_file=rel, line=no, kind='registration', snippet=_snip(text),
                                 why='registration or reference site of "%s"' % sym))
    return pins


def scan(repo, change_kind, paths=None, symbols=None, summary=False, limit=40):
    if change_kind not in CHANGE_KINDS:
        raise ScanError('unknown change kind: %s' % change_kind)
    repo = os.path.abspath(repo)
    tracked = _tracked(repo)
    suffixes = _suffixes(tracked)
    nouns = list(NOUNS[change_kind]) + sorted(_touched_dirs(paths))
    pins, stale = [], []
    for rel in tracked:
        if _is_test_code(rel):
            text = _read(repo, rel)
            if text is None:
                continue
            _scan_test_file(rel, text, change_kind, nouns, pins)
            _scan_stale(repo, rel, text, suffixes, stale)
        elif change_kind in ('route', 'response-shape') and SNAPSHOT_PATH.search(rel):
            pins.append(dict(test_file=rel, line=1, kind='snapshot', snippet=rel,
                             why='snapshot or golden file may need regeneration'))
    pins.extend(_symbol_pins(repo, change_kind, symbols, paths, limit))
    seen, unique = set(), []
    for pin in sorted(pins, key=lambda p: (p['test_file'], p['line'], p['kind'], p['snippet'])):
        key = (pin['test_file'], pin['line'], pin['kind'])
        if key not in seen:
            seen.add(key)
            unique.append(pin)
    stale.sort(key=lambda s: (s['test_file'], s['line'], s['literal']))
    total = len(unique) + len(stale)
    truncated = len(unique) > limit or len(stale) > limit
    unique, stale = unique[:limit], stale[:limit]
    if summary:
        by_kind = {}
        for pin in unique:
            by_kind[pin['kind']] = by_kind.get(pin['kind'], 0) + 1
        unique = [dict(test_file=p['test_file'], line=p['line'], kind=p['kind']) for p in unique]
        stale = [dict(test_file=s['test_file'], line=s['line'], literal=s['literal']) for s in stale]
        return dict(change_kind=change_kind, pins=unique, stale=stale, truncated=truncated,
                    count=total, by_kind=by_kind)
    return dict(change_kind=change_kind, pins=unique, stale=stale, truncated=truncated, count=total)


def list_guards(repo):
    repo = os.path.abspath(repo)
    guards = []
    for rel in _tracked(repo):
        if not _is_test_code(rel):
            continue
        if GUARD_RE.search(os.path.basename(rel)):
            guards.append(dict(test_file=rel, line=1, name=os.path.basename(rel)))
            continue
        text = _read(repo, rel)
        if text is None:
            continue
        for i, line in enumerate(text.split('\n')):
            if TEST_DEF_RE.search(line) and GUARD_RE.search(line):
                guards.append(dict(test_file=rel, line=i + 1, name=_snip(line)))
    guards.sort(key=lambda g: (g['test_file'], g['line']))
    return dict(guards=guards, count=len(guards))


def main(argv=None):
    parser = argparse.ArgumentParser(prog='orkest pinscan', description=__doc__)
    parser.add_argument('--repo', default='.')
    parser.add_argument('--change-kind', choices=CHANGE_KINDS)
    parser.add_argument('--paths', nargs='*', default=[])
    parser.add_argument('--symbols', default='')
    parser.add_argument('--summary', action='store_true')
    parser.add_argument('--limit', type=int, default=40)
    parser.add_argument('--list-guards', action='store_true')
    try:
        args = parser.parse_args(argv)
    except SystemExit as exc:
        return exc.code if isinstance(exc.code, int) else 2
    try:
        if args.list_guards:
            result = list_guards(args.repo)
            print(json.dumps(result))
            return 0
        if not args.change_kind:
            raise ScanError('--change-kind is required')
        if args.limit < 1:
            raise ScanError('--limit must be positive')
        symbols = [s.strip() for s in args.symbols.split(',') if s.strip()]
        result = scan(args.repo, args.change_kind, args.paths, symbols, args.summary, args.limit)
    except ScanError as exc:
        print(json.dumps(dict(error=str(exc))))
        return 2
    print(json.dumps(result))
    return 2 if result['stale'] else 0


if __name__ == '__main__':
    sys.exit(main())
