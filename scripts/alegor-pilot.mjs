import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBrief, capture, defaultStoreDir, loadProjects } from '../src/alegor/core.mjs';

const workspace = resolve(fileURLToPath(new URL('../', import.meta.url)));
const [configPath = 'examples/alegor/projects.example.json', storeArg, outArg] = process.argv.slice(2);
const storeDir = resolve(storeArg || defaultStoreDir(workspace));
const outPath = resolve(outArg || `${workspace}/experiments/alegor-mvp/real-pilot.json`);
const projects = loadProjects(resolve(configPath));
const results = [];
const git = (root, args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', windowsHide: true, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0' } }).trim();
for (const project of projects) {
  const beforeHead = git(project.root, ['rev-parse', 'HEAD']);
  const beforeStatus = git(project.root, ['status', '--porcelain=v1', '--untracked-files=all']);
  const first = capture(project, storeDir);
  const second = capture(project, storeDir);
  const afterHead = git(project.root, ['rev-parse', 'HEAD']);
  const afterStatus = git(project.root, ['status', '--porcelain=v1', '--untracked-files=all']);
  if (beforeHead !== afterHead || beforeStatus !== afterStatus || !second.reused || first.revision !== second.revision) throw new Error(`Read-only/no-op proof failed for ${project.name}.`);
  const brief = buildBrief(first);
  results.push({
    project: brief.project,
    root: project.root,
    capturedHead: first.git.head,
    branch: first.git.branch,
    commitCountInHistoryWindow: first.git.commits.length,
    boundedHistory: first.git.historyTruncated,
    snapshotId: first.id,
    revision: first.revision,
    noOpCaptureReused: second.reused,
    sourceHeadUnchanged: beforeHead === afterHead,
    sourceStatusUnchanged: beforeStatus === afterStatus,
    dirtyState: first.git.dirtyState,
    workingTreeFiles: first.git.status.map(({ code, path, hash }) => ({ code, path, contentHash: hash })),
    docs: first.discovery.docs.map(({ path, hash, excerpts }) => ({ path, hash, citations: excerpts.flatMap((excerpt) => excerpt.lines.map(({ line, text }) => ({ line, text }))) })),
    answers: {
      whatChanged: brief.observed.commits.map(({ date, subject, sha, paths }) => ({ date, subject, commit: sha.slice(0, 10), paths })),
      whereToResume: brief.next,
      declaredProjectContext: brief.declared,
      possibleDisagreement: brief.conflicts,
      uncertainty: brief.rangeNote ?? (brief.next[0]?.type === 'unknown' ? brief.next[0].text : null),
    },
  });
}
const report = { schema: 'alegor.real-pilot/v1', generatedAt: new Date().toISOString(), aiCalls: 0, sourceReposChanged: false, storeDir, projects: results };
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ outPath, projects: results.map(({ project, capturedHead, commitCountInHistoryWindow, docs, noOpCaptureReused }) => ({ name: project.name, head: capturedHead, commits: commitCountInHistoryWindow, selectedDocs: docs.length, noOpCaptureReused })) }, null, 2)}\n`);
