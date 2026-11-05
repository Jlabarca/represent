#!/usr/bin/env python3
"""Scoped Git operations for workflow skills (stdlib only; never pushes).

Paths are exact repository-relative files or indexed gitlinks, never directory sweeps or pathspec patterns.
The caller must establish ownership, writer locks and verification before committing.
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def git(repo, *args, check=True):
    result = subprocess.run(['git', '-C', str(repo), '--literal-pathspecs', *args],
                            capture_output=True, text=True, encoding='utf-8', errors='replace')
    if check and result.returncode:
        raise ValueError(result.stderr.strip() or result.stdout.strip() or 'git failed')
    return result


def exact_paths(repo, values):
    paths = []
    for value in values:
        value = value.replace('\\', '/')
        p = Path(value)
        if (p.is_absolute() or ':' in value or '..' in p.parts or
                not p.parts or p.parts[0] == '.git' or '*' in value or '?' in value):
            raise ValueError('Expected exact repository-relative file: ' + value)
        target = repo / p
        try:
            target.resolve().relative_to(repo)
        except ValueError:
            raise ValueError('Path escapes repository: ' + value)
        if target.is_dir():
            entries = git(repo, 'ls-files', '--stage', '-z', '--', p.as_posix()).stdout.rstrip('\0').split('\0')
            fields = entries[0].split('\t', 1) if len(entries) == 1 else []
            metadata = fields[0].split() if fields else []
            if not (len(fields) == 2 and fields[1] == p.as_posix()
                    and len(metadata) == 3 and metadata[0] == '160000' and metadata[2] == '0'):
                raise ValueError('Directory scope is not allowed: ' + value)
        paths.append(p.as_posix())
    if not paths:
        raise ValueError('An explicit file scope is required')
    return list(dict.fromkeys(paths))


def preflight(repo, branch):
    actual = git(repo, 'symbolic-ref', '--quiet', '--short', 'HEAD').stdout.strip()
    if actual != branch:
        raise ValueError('Wrong branch: expected %s, got %s' % (branch, actual))
    if git(repo, 'diff', '--name-only', '--diff-filter=U').stdout:
        raise ValueError('Unresolved merge conflicts')
    return git(repo, 'rev-parse', 'HEAD').stdout.strip()


def index_file(repo):
    git_dir = Path(git(repo, 'rev-parse', '--absolute-git-dir').stdout.strip())
    return git_dir / 'index'


def run(args):
    repo = Path(args.repo).resolve()
    root = Path(git(repo, 'rev-parse', '--show-toplevel').stdout.strip()).resolve()
    if repo != root:
        raise ValueError('--repo must name the repository root')
    if args.action == 'preflight':
        return {'head': preflight(repo, args.branch), 'branch': args.branch}
    paths = exact_paths(repo, args.paths)
    if args.action == 'commit':
        before = preflight(repo, args.branch)
        message = (Path(args.message_file).read_text(encoding='utf-8')
                   if args.message_file else args.message)
        if not re.match(r'^(feat|fix|polish|refactor|docs|test)(\([^\n)]+\))?: .+', message):
            raise ValueError('Commit message must use the project commit taxonomy')
        status = git(repo, 'status', '--porcelain', '--untracked-files=all', '--', *paths).stdout
        if args.no_commit:
            return {'preview': True, 'head': before, 'status': status}
        if not status:
            return {'committed': False, 'head': before, 'reason': 'scope already committed'}
        # A rename's old path may already be absent from the index after git mv.
        stage = [p for p in paths if (repo / p).exists() or
                 git(repo, 'ls-files', '--error-unmatch', '--', p, check=False).returncode == 0]
        index = index_file(repo)
        backup = index.with_name(index.name + '.workflow-bak')
        shutil.copy2(index, backup)
        try:
            # Tracked paths go through -u: a plain add refuses a tracked file whose
            # directory matches an ignore rule, and -u never consults ignore rules.
            tracked = set(filter(None, git(repo, 'ls-files', '-z', '--', *stage).stdout.split('\0'))) if stage else set()
            if tracked:
                git(repo, 'add', '-u', '--', *sorted(tracked))
            fresh = [p for p in stage if p not in tracked]
            if fresh:
                git(repo, 'add', '--', *fresh)
            # Never place message text in command arguments: Windows launchers may
            # reinterpret multiline text or append cmd.exe control syntax to it.
            # Close the file before Git opens it (required on Windows).
            with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8',
                                             suffix='.txt', delete=False) as handle:
                handle.write(message)
                message_path = Path(handle.name)
            try:
                git(repo, 'commit', '--only', '--file', str(message_path), '--', *paths)
            finally:
                message_path.unlink(missing_ok=True)
        except Exception:
            if backup.exists():
                shutil.copy2(backup, index)
            raise
        finally:
            backup.unlink(missing_ok=True)
        after = git(repo, 'rev-parse', 'HEAD').stdout.strip()
        if before == after:
            raise ValueError('Commit did not advance HEAD')
        return {'committed': True, 'head': after}
    if args.action == 'audit-diff':
        base = git(repo, 'rev-parse', '--verify', args.base + '^{commit}').stdout.strip()
        head = git(repo, 'rev-parse', 'HEAD').stdout.strip()
        git(repo, 'merge-base', '--is-ancestor', base, head)
        return {'base': base, 'head': head,
                'committed_diff': git(repo, 'diff', base, head, '--', *paths).stdout,
                'working_diff': git(repo, 'diff', head, '--', *paths).stdout,
                'untracked': git(repo, 'ls-files', '--others', '--exclude-standard', '--', *paths).stdout.splitlines()}
    if args.no_commit:
        raise ValueError('An uncommitted preview cannot report promotion')
    head = git(repo, 'rev-parse', 'HEAD').stdout.strip()
    expected = git(repo, 'rev-parse', '--verify', args.commit + '^{commit}').stdout.strip()
    if head != expected:
        raise ValueError('HEAD no longer equals the promotion commit')
    status = git(repo, 'status', '--porcelain', '--untracked-files=all', '--', *paths).stdout
    if status:
        raise ValueError('Feature-owned changes remain: ' + status.strip())
    for path in exact_paths(repo, args.required):
        if path not in paths:
            raise ValueError('Required artifact must be included in --paths: ' + path)
        git(repo, 'cat-file', '-e', head + ':' + path)
    return {'complete': True, 'commit': head}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='action', required=True)
    for action in ('preflight', 'commit', 'audit-diff', 'check-complete'):
        p = sub.add_parser(action)
        p.add_argument('--repo', required=True)
        if action in ('preflight', 'commit'):
            p.add_argument('--branch', required=True)
        if action != 'preflight':
            p.add_argument('--paths', nargs='+', required=True)
        if action == 'commit':
            messages = p.add_mutually_exclusive_group(required=True)
            messages.add_argument('--message')
            messages.add_argument('--message-file')
        if action == 'audit-diff':
            p.add_argument('--base', required=True)
        if action == 'check-complete':
            p.add_argument('--commit', required=True)
            p.add_argument('--required', nargs='+', required=True)
        if action in ('commit', 'check-complete'):
            p.add_argument('--no-commit', action='store_true')
    try:
        print(json.dumps(run(parser.parse_args(argv)), ensure_ascii=False))
        return 0
    except (ValueError, OSError) as error:
        print(json.dumps({'error': str(error)}), file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
