"""Native SessionStart observer and explicit local lifecycle upgrade entry."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import uuid

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))  # python -I drops the script directory
import orkest
import orkest_upgrade


def main(argv=None):
    # Native hook payloads are UTF-8 even when Windows' redirected Python default is CP1252.
    for stream in (sys.stdin, sys.stdout, sys.stderr):
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo')
    parser.add_argument('--template')
    parser.add_argument('--harness', choices=['claude-code', 'codex', 'grok'])
    parser.add_argument('--update', action='store_true')
    parser.add_argument('--initialize', action='store_true')
    parser.add_argument('--execute', action='store_true')
    parser.add_argument('--dry', action='store_true')
    parser.add_argument('--session')
    args = parser.parse_args(argv)
    native = not (args.update or args.initialize)
    root = None
    try:
        payload = {}
        if native and not sys.stdin.isatty():
            raw = sys.stdin.read()
            payload = json.loads(raw) if raw.strip() else {}
        cwd = args.repo or payload.get('workspaceRoot') or payload.get('cwd') or os.getcwd()
        root = subprocess.check_output(['git', '-C', cwd, 'rev-parse', '--show-toplevel'],
            text=True, encoding='utf-8', stderr=subprocess.PIPE).strip()
        session = (args.session or payload.get('session_id') or payload.get('sessionId') or
                   orkest.session_id({}))
        if not native and not session:
            # This is a real lifecycle transaction ID, never a claimed native agent session.
            session = 'update-' + str(uuid.uuid4())
        options = dict(session=session, execute=(native or args.execute) and not args.dry,
                       dry=args.dry, update=args.update or args.initialize, initialize=args.initialize, lane='interactive')
        result = orkest_upgrade.reconcile(root, args.template or Path(__file__).resolve().parent.parent,
                                          options, orkest)
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        result = dict(action='upgrade', status='blocked', changed=False, reason=str(error))
    if not native:
        print(json.dumps(result))
        return 0 if result['status'] in ('complete', 'preview') else 2
    harness = args.harness or os.environ.get('ORKEST_ENGINE') or os.environ.get('GHOSTDEV_ENGINE')
    if harness == 'claude':
        harness = 'claude-code'
    context = 'Orkest startup: ' + result['status']
    if result.get('reason'):
        context += ' — ' + result['reason']
    if result.get('conflicts'):
        context += '; preserved local conflicts: ' + ', '.join(row['path'] for row in result['conflicts'])
    if root:
        pointers = []
        for name in ('docs/orkest/handoffs', 'docs/handoffs'):
            try:
                directory = orkest.migration.checked_path(Path(root), name)
                if directory.is_dir():
                    for item in directory.iterdir():
                        relative = item.relative_to(Path(root)).as_posix()
                        checked = orkest.migration.checked_path(Path(root), relative)
                        if checked.is_file() and checked.suffix == '.md' and checked.name not in ('README.md', 'precompact-backstop.md'):
                            pointers.append((checked.stat().st_mtime, relative))
            except (ValueError, OSError):
                continue
        if pointers:
            context += '; Freshest handoff: ' + max(pointers)[1] + ' (pointer only; verify against Git when resuming)'
    if result['status'] == 'complete' and harness != 'claude-code':
        context += '; use the native refresh or next session if the current skill cache has not refreshed'
    if harness == 'grok':
        output = dict(systemMessage=context)
    else:
        specific = dict(hookEventName='SessionStart', additionalContext=context)
        if harness == 'claude-code':
            specific['reloadSkills'] = True
        output = dict(hookSpecificOutput=specific)
    print(json.dumps(output))
    return 0  # SessionStart is an observer, never a permission or feature-run gate.


if __name__ == '__main__':
    raise SystemExit(main())
