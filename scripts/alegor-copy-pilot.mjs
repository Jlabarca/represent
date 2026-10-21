import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { capture, compare, hash } from '../src/alegor/core.mjs';

const workspace = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const source = path.resolve(process.argv[2] || 'D:/ware/plane-sync');
const git = (root, args) => execFileSync('git', ['-C', root, ...args], {
  encoding: 'utf8', windowsHide: true, timeout: 30_000,
  env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0' },
}).trim();
const before = { head: git(source, ['rev-parse', 'HEAD']), status: git(source, ['status', '--porcelain=v1', '--untracked-files=all']) };
const trial = fs.mkdtempSync(path.join(os.tmpdir(), 'alegor-real-copy-'));
const root = path.join(trial, 'repo');
const store = path.join(trial, 'store');
const timed = (run) => { const start = performance.now(); const result = run(); return { result, ms: +(performance.now() - start).toFixed(2) }; };
try {
  execFileSync('git', ['clone', '--quiet', '--no-hardlinks', source, root], { windowsHide: true, timeout: 30_000 });
  assert.equal(git(root, ['rev-parse', 'HEAD']), before.head);
  const project = { id: 'plane-sync-copy', name: 'Plane Sync controlled copy', root, color: '#3775a8' };
  const first = timed(() => capture(project, store));
  const noOp = timed(() => capture(project, store));
  assert.equal(noOp.result.reused, true);
  assert.equal(first.result.revision, noOp.result.revision);
  const copiedDocuments = first.result.discovery.docs.map(({ path: file, hash: digest }) => ({ path: file, hash: digest }));
  for (const document of copiedDocuments) assert.equal(hash(fs.readFileSync(path.join(source, document.path), 'utf8')), document.hash);
  const file = path.join(root, 'docs', 'TODO.md');
  assert.equal(fs.existsSync(file), false, 'The controlled trial must not overwrite an existing TODO.');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '# Controlled trial\n\n## Active Sprint\n\n- [ ] Verify the sync retry behavior in this disposable trial.\n');
  const update = timed(() => capture(project, store));
  assert.notEqual(update.result.revision, first.result.revision);
  assert.equal(update.result.git.head, first.result.git.head);
  const brief = compare(project, store, update.result.id, first.result.id);
  assert.equal(brief.observed.commits.length, 0);
  assert.ok(brief.observed.worktreeChanges.some(item => item.path === 'docs/TODO.md'));
  const task = brief.next.find(item => item.path === 'docs/TODO.md' && item.line === 5);
  assert.ok(task?.text.includes('disposable trial'));
  fs.unlinkSync(file);
  const historical = compare(project, store, update.result.id, first.result.id);
  assert.deepEqual(historical.next, brief.next);
  assert.equal(git(source, ['rev-parse', 'HEAD']), before.head);
  assert.equal(git(source, ['status', '--porcelain=v1', '--untracked-files=all']), before.status);
  for (const document of copiedDocuments) assert.equal(hash(fs.readFileSync(path.join(source, document.path), 'utf8')), document.hash);
  const report = {
    schema: 'alegor.real-copy-pilot/1', capturedAt: new Date().toISOString(), source, sourceHead: before.head,
    copiedDocuments, sourceHeadStatusAndDocumentHashesPreserved: true, modelApiCalls: 0,
    measurementsMs: { firstCapture: first.ms, noOp: noOp.ms, docsOnlyUpdate: update.ms },
    baselineRevision: first.result.revision, noOpRevision: noOp.result.revision, updatedRevision: update.result.revision,
    noOpReused: true, docUpdatePreservedHead: true, newCommitCount: brief.observed.commits.length,
    observedChanges: brief.observed.worktreeChanges, declaredTrialTask: task, citationSurvivesSourceDeletion: true,
    limitation: 'The added task is a deliberately authored test marker in a disposable copy, not a real Plane Sync requirement.',
  };
  const output = path.join(workspace, 'experiments/alegor-mvp/controlled-copy.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally {
  const resolved = path.resolve(trial);
  assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
  assert.ok(path.basename(resolved).startsWith('alegor-real-copy-'));
  fs.rmSync(resolved, { recursive: true, force: true });
}
