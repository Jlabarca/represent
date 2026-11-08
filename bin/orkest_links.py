"""Cross-repo edges (submodules and similar): declaration and read-only state.

An edge is a consumer path pinned to a source repository. Edges come from `.orkest/links.json` (schema 1) or,
without it, from `.gitmodules`. State reads only the consumer's HEAD tree and the submodule's own git dir and
remote-tracking refs: nothing here fetches, checks out, stages or writes."""
import json
import re
import subprocess
import time
from pathlib import Path

KINDS = ('submodule', 'upm-file', 'git-dep')
PUSH = ('never', 'ask', 'auto')
ADVANCE = ('off', 'auto')
STATE_ORDER = ('NOT_CHECKED_OUT', 'PIN_UNREACHABLE', 'TRUNK_UNKNOWN', 'PIN_OFF_TRUNK', 'PIN_ON_TRUNK',
               'CHECKOUT_DRIFT', 'SOURCE_DIRTY', 'TRUNK_AHEAD')


def run_git(cwd, *args, timeout=20):
    try:
        result = subprocess.run(['git', '-C', str(cwd), *args], capture_output=True, text=True,
                                encoding='utf-8', errors='replace', timeout=timeout)
    except (OSError, subprocess.TimeoutExpired):
        return 1, ''
    return result.returncode, result.stdout.strip()


def gitlink(repo, path):
    """The commit a consumer's HEAD pins at `path`, or None when the path is not a gitlink."""
    code, out = run_git(repo, 'ls-tree', 'HEAD', '--', path)
    match = re.match(r'160000 commit ([0-9a-f]{40})\t', out)
    return match.group(1) if code == 0 and match else None


def gitmodules(repo):
    code, out = run_git(repo, 'config', '--file', '.gitmodules', '--get-regexp', r'^submodule\..*\.(path|branch)$')
    paths, branches = {}, {}
    for line in out.splitlines():
        key, _, value = line.partition(' ')
        name, _, field = key[len('submodule.'):].rpartition('.')
        (paths if field == 'path' else branches)[name] = value
    return {paths[name]: branches.get(name) for name in paths}


def derived(path, trunk):
    return dict(path=path, kind='submodule', trunk=trunk, source=None, gate=None, push='never', advance='off',
                declared=False)


def validate(repo, entry, index):
    """(edge or None, [errors]) for one declared entry; an invalid entry is never half-used."""
    where = 'links.json edges[%d]' % index
    if not isinstance(entry, dict) or not isinstance(entry.get('path'), str) or not entry['path']:
        return None, [where + ': needs a path']
    path = entry['path'].replace('\\', '/').strip('/')
    errors = []
    kind = entry.get('kind', 'submodule')
    if kind not in KINDS:
        errors.append('%s (%s): kind must be one of %s' % (where, path, ', '.join(KINDS)))
    if kind == 'submodule' and not gitlink(repo, path):
        errors.append('%s (%s): not a gitlink in HEAD' % (where, path))
    gate = entry.get('gate')
    if gate is not None and (not isinstance(gate, list) or not gate or not all(isinstance(a, str) and a for a in gate)):
        errors.append('%s (%s): gate must be an argv list of strings, never a shell string' % (where, path))
    push = entry.get('push', 'never')
    if push not in PUSH:
        errors.append('%s (%s): push must be one of %s' % (where, path, ', '.join(PUSH)))
    elif push == 'auto' and not (isinstance(entry.get('push_granted_by'), str) and entry['push_granted_by'].strip()):
        errors.append('%s (%s): push auto needs push_granted_by naming the person who granted it' % (where, path))
    advance = entry.get('advance', 'off')
    if advance not in ADVANCE:
        errors.append('%s (%s): advance must be one of %s' % (where, path, ', '.join(ADVANCE)))
    for key in ('trunk', 'source'):
        if entry.get(key) is not None and not isinstance(entry[key], str):
            errors.append('%s (%s): %s must be a string' % (where, path, key))
    if errors:
        return None, errors
    edge = dict(path=path, kind=kind, trunk=entry.get('trunk'), source=entry.get('source'), gate=gate, push=push,
                advance=advance, declared=True)
    if push == 'auto':
        edge['push_granted_by'] = entry['push_granted_by'].strip()
    return edge, []


def edges(repo):
    """([edges], [errors]). Declared entries replace the derived edge for the same path; invalid ones are dropped."""
    modules = gitmodules(repo)
    found = {path: derived(path, branch) for path, branch in modules.items()}
    errors = []
    config = Path(repo) / '.orkest/links.json'
    if config.is_file():
        try:
            data = json.loads(config.read_text(encoding='utf-8-sig'))
        except (ValueError, OSError, UnicodeError) as error:
            return list(found.values()), ['links.json cannot be read: %s' % error]
        if not isinstance(data, dict) or data.get('schema') != 1 or not isinstance(data.get('edges'), list):
            return list(found.values()), ['links.json needs schema 1 and an edges list']
        for index, entry in enumerate(data['edges']):
            edge, problems = validate(repo, entry, index)
            errors.extend(problems)
            if edge:
                if edge['trunk'] is None:
                    edge['trunk'] = modules.get(edge['path'])
                found[edge['path']] = edge
    return sorted(found.values(), key=lambda e: e['path']), errors


def count(cwd, spec):
    code, out = run_git(cwd, 'rev-list', '--count', spec)
    return int(out) if code == 0 and out.isdigit() else None


def trunk_ref_of(sub, trunk):
    if trunk:
        return 'origin/' + trunk
    code, out = run_git(sub, 'symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD')
    return out if code == 0 and out else None


def ref_age_s(sub, ref, now):
    code, out = run_git(sub, 'log', '-1', '-g', '--format=%ct', ref)
    if code != 0 or not out.strip().isdigit():
        code, out = run_git(sub, 'log', '-1', '--format=%ct', ref)
    return int(now - int(out)) if code == 0 and out.strip().isdigit() else None


def state(repo, edge, now=None):
    """Every state that holds for one edge, from in-repo facts only."""
    now = now or time.time()
    path = edge['path']
    sub = Path(repo) / path
    result = dict(path=path, kind=edge['kind'], pin=gitlink(repo, path), head=None, trunk_ref=None,
                  trunk_age_s=None, drift=None, trunk_ahead=None, states=[])
    states = result['states']
    if edge['kind'] != 'submodule':
        states.append('UNSUPPORTED_KIND')
        return result
    if not (sub / '.git').exists():
        states.append('NOT_CHECKED_OUT')
        return result
    pin = result['pin']
    code, head = run_git(sub, 'rev-parse', '--verify', '--quiet', 'HEAD')
    result['head'] = head if code == 0 else None
    pin_known = bool(pin) and run_git(sub, 'cat-file', '-e', pin + '^{commit}')[0] == 0
    if not pin_known:
        states.append('PIN_UNREACHABLE')
    trunk_ref = trunk_ref_of(sub, edge.get('trunk'))
    if trunk_ref and run_git(sub, 'rev-parse', '--verify', '--quiet', trunk_ref + '^{commit}')[0] != 0:
        trunk_ref = None
    result['trunk_ref'] = trunk_ref
    if not trunk_ref:
        states.append('TRUNK_UNKNOWN')
    else:
        result['trunk_age_s'] = ref_age_s(sub, trunk_ref, now)
    if pin_known and trunk_ref:
        on_trunk = run_git(sub, 'merge-base', '--is-ancestor', pin, trunk_ref)[0] == 0
        states.append('PIN_ON_TRUNK' if on_trunk else 'PIN_OFF_TRUNK')
        ahead = count(sub, pin + '..' + trunk_ref)
        result['trunk_ahead'] = ahead
        if ahead:
            states.append('TRUNK_AHEAD')
    if result['head'] and pin and result['head'] != pin:
        drift = dict(ahead=None, behind=None)
        if pin_known:
            drift = dict(ahead=count(sub, pin + '..HEAD'), behind=count(sub, 'HEAD..' + pin))
        result['drift'] = drift
        states.append('CHECKOUT_DRIFT')
    code, porcelain = run_git(sub, 'status', '--porcelain', '--untracked-files=no')
    if code == 0 and porcelain:
        states.append('SOURCE_DIRTY')
    states.sort(key=STATE_ORDER.index)
    return result


def report(repo, now=None):
    found, errors = edges(repo)
    return dict(edges=[dict(state(repo, edge, now), declared=edge['declared'], trunk=edge['trunk'],
                            push=edge['push'], advance=edge['advance']) for edge in found], errors=errors)
