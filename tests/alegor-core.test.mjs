import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { buildBrief, capture, compare, hash, loadProjects, listSnapshots } from '../src/alegor/core.mjs';

const tempRoots = [];
function fixture() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'alegor-test-'));
  tempRoots.push(dir);
  const root = path.join(dir, 'repo');
  const store = path.join(dir, 'store');
  mkdirSync(path.join(root, 'docs'), { recursive: true });
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { stdio: 'ignore', windowsHide: true });
  writeFileSync(path.join(root, 'README.md'), '# Project\n\nAn offline job queue for reports.\n');
  writeFileSync(path.join(root, 'docs', 'CONTEXT.md'), '## Current State\n\nThe worker runs in batches.\n\n## Current Sprint\n\nFocus: make retry behavior visible.\n');
  writeFileSync(path.join(root, 'docs', 'TODO.md'), '## Active Sprint\n\n- [ ] Add retry panel for failed jobs.\n- [x] Keep existing queue stable.\n\n## Historical Sprint\n\n- [ ] Rewrite all systems in Rust.\n');
  writeFileSync(path.join(root, 'src.mjs'), 'export const queue = true;\n');
  writeFileSync(path.join(root, '.gitignore'), 'ignored/\n');
  mkdirSync(path.join(root, 'ignored'), { recursive: true });
  writeFileSync(path.join(root, 'ignored', 'README.md'), '# Ignored private note\n\nDo not include this file.\n');
  mkdirSync(path.join(root, '.private'), { recursive: true });
  writeFileSync(path.join(root, '.private', 'README.md'), '# Hidden note\n\nDo not include hidden paths.\n');
  git('init', '-b', 'main');
  git('config', 'user.name', 'Alegor Test');
  git('config', 'user.email', 'alegor-test@example.invalid');
  git('add', '.');
  git('add', '-f', 'ignored/README.md');
  git('commit', '-m', 'feat: add report queue');
  return { dir, root, store, git, project: { id: 'fixture', name: 'Report Queue', root, color: '#617553' } };
}
after(() => { for (const dir of tempRoots) rmSync(dir, { recursive: true, force: true, maxRetries: 4, retryDelay: 30 }); });

test('manual snapshots are immutable, reused on no-op and leave the source repository untouched', () => {
  const f = fixture();
  const before = hash(readFileSync(path.join(f.root, 'docs', 'TODO.md')));
  const first = capture(f.project, f.store);
  const second = capture(f.project, f.store);
  assert.equal(first.reused, false);
  assert.equal(second.reused, true);
  assert.equal(second.id, first.id);
  assert.equal(listSnapshots(f.project, f.store).length, 1);
  assert.equal(hash(readFileSync(path.join(f.root, 'docs', 'TODO.md'))), before);
  assert.deepEqual(first.evidence.filter((x) => x.type === 'next').map((x) => x.text), ['- [ ] Add retry panel for failed jobs.']);
  assert.ok(first.evidence.every((x) => !x.text.includes('Rewrite all systems in Rust')), JSON.stringify(first.evidence, null, 2));
  assert.ok(!first.discovery.docs.some((doc) => doc.path.includes('ignored') || doc.path.includes('.private')));
});

test('a docs-only refresh reports changed evidence, selected next work and retains historical quotes after deletion', () => {
  const f = fixture();
  const base = capture(f.project, f.store);
  writeFileSync(path.join(f.root, 'docs', 'TODO.md'), '## Active Sprint\n\n- [ ] Add a project-specific retry panel and test its failed-job state.\n');
  const current = capture(f.project, f.store);
  assert.notEqual(current.id, base.id);
  const result = compare(f.project, f.store, current.id, base.id);
  assert.equal(result.observed.commits.length, 0);
  assert.ok(result.observed.worktreeChanges.some((item) => item.path.endsWith('docs/TODO.md')));
  assert.match(result.next[0].text, /retry panel/);
  assert.equal(result.next[0].line, 3);
  rmSync(path.join(f.root, 'docs', 'TODO.md'));
  const afterDelete = capture(f.project, f.store);
  const historical = compare(f.project, f.store, current.id, base.id);
  assert.ok(historical.next[0].text.includes('project-specific retry panel'));
  assert.ok(afterDelete.git.status.some((item) => item.path.endsWith('docs/TODO.md')));
  rmSync(f.root, { recursive: true, force: true });
  assert.ok(compare(f.project, f.store, current.id, base.id).next[0].text.includes('project-specific retry panel'));
});

test('branch and commit history are reported as observed changes while status stays out of causal claims', () => {
  const f = fixture();
  const base = capture(f.project, f.store);
  writeFileSync(path.join(f.root, 'src.mjs'), 'export const queue = true;\nexport const retry = "bounded";\n');
  f.git('add', 'src.mjs');
  f.git('commit', '-m', 'feat: bound retry attempts');
  writeFileSync(path.join(f.root, 'src.mjs'), 'export const queue = true;\nexport const retry = "bounded";\nexport const retryLog = true;\n');
  f.git('add', 'src.mjs');
  f.git('commit', '-m', 'feat: record retry history');
  f.git('checkout', '-b', 'work/retry-copy');
  writeFileSync(path.join(f.root, 'docs', 'CONTEXT.md'), '## Current State\n\nRetry attempts are now bounded.\n');
  const current = capture(f.project, f.store);
  const result = compare(f.project, f.store, current.id, base.id);
  assert.equal(current.git.branch, 'work/retry-copy');
  assert.equal(result.observed.commits.length, 2);
  assert.match(result.observed.commits[0].subject, /bound retry attempts/);
  assert.match(result.observed.commits[1].subject, /record retry history/);
  assert.ok(result.observed.changedPaths.includes('src.mjs'));
});

test('similar open and checked checklist lines are flagged only as a possible disagreement with citations', () => {
  const f = fixture();
  writeFileSync(path.join(f.root, 'docs', 'CONTEXT.md'), '## Current Sprint\n\n- [x] Add a project-specific retry panel for failed jobs.\n');
  writeFileSync(path.join(f.root, 'docs', 'TODO.md'), '## Active Sprint\n\n- [ ] Add a project-specific retry panel for failed jobs.\n');
  const snapshot = capture(f.project, f.store);
  assert.equal(snapshot.conflicts.length, 1, JSON.stringify({ docs: snapshot.discovery.docs.map((d) => ({ path: d.path, excerpts: d.excerpts })), evidence: snapshot.evidence }, null, 2));
  assert.equal(snapshot.conflicts[0].kind, 'possible-disagreement');
  assert.equal(snapshot.conflicts[0].evidence.length, 2);
  assert.ok(snapshot.conflicts[0].evidence.every((item) => item.path && item.line));
});

test('a baseline outside the stored first-parent window reports unavailable instead of guessing or reading the live repo', () => {
  const baseline = { id: 'old', git: { head: 'b'.repeat(40), branch: 'main', status: [] } };
  const current = { projectId: 'fixture', projectName: 'Fixture', color: '#617553', id: 'new', revision: 'c'.repeat(64), generatedAt: '2026-01-01T00:00:00Z', root: 'Z:/not-present', discovery: { docs: [], candidates: 0, bytes: 0 }, evidence: [], conflicts: [], git: { head: 'c'.repeat(40), branch: 'main', status: [], commits: [{ sha: 'c'.repeat(40), date: '2026-01-01T00:00:00Z', subject: 'head', paths: [] }] } };
  const result = buildBrief(current, baseline);
  assert.equal(result.rangeStatus, 'unavailable');
  assert.match(result.rangeNote, /outside the captured first-parent history window/);
  assert.equal(result.observed.commits.length, 0);
});

test('unknown next step stays explicit when only old or completed checklist content exists', () => {
  const f = fixture();
  writeFileSync(path.join(f.root, 'docs', 'TODO.md'), '## Historical Sprint\n\n- [ ] Rewrite the report queue from scratch.\n\n## Completed Work\n\n- [x] Ship first worker.\n');
  const snapshot = capture(f.project, f.store);
  const result = compare(f.project, f.store, snapshot.id);
  assert.equal(result.next[0].type, 'unknown');
  assert.match(result.next[0].text, /No explicit open next step/);
});

test('configured paths are explicit and saved snapshot identity is stable for repeated captures', () => {
  const f = fixture();
  const config = path.join(f.dir, 'projects.json');
  writeFileSync(config, JSON.stringify({ projects: [{ id: 'fixture', name: 'Fixture', root: f.root }] }));
  assert.equal(loadProjects(config)[0].root, f.root);
  writeFileSync(config, JSON.stringify({ projects: [{ id: 'fixture', name: 'Fixture', root: '.' }] }));
  assert.throws(() => loadProjects(config), /absolute path/);
});

test('captures completed active checklist evidence but excludes stale child sections and sensitive changed filenames', () => {
  const f = fixture();
  writeFileSync(path.join(f.root, 'docs', 'CONTEXT.md'), '## Current State\n\nRunning retry worker.\n\n### Historical rollout\n\nOld migration should remain hidden.\n');
  writeFileSync(path.join(f.root, 'docs', 'TODO.md'), '## Active Sprint\n\n- [ ] Add retry metrics panel.\n- [x] Add bounded retry policy.\n\n## Completed Bootstrap\n\n- [ ] Rebuild the whole product.\n');
  writeFileSync(path.join(f.root, 'credentials.json'), '{"token":"private"}');
  const snapshot = capture(f.project, f.store);
  assert.ok(snapshot.evidence.some((item) => item.type === 'completed' && item.text.includes('bounded retry policy')), JSON.stringify(snapshot.evidence, null, 2));
  assert.ok(!snapshot.evidence.some((item) => item.text.includes('Old migration')));
  assert.ok(!snapshot.evidence.some((item) => item.text.includes('Rebuild the whole product')));
  assert.ok(!snapshot.git.status.some((item) => item.path.includes('credentials.json')));
});

test('checked task beyond the state excerpt stays one line and cannot reactivate historical work', () => {
  const f = fixture();
  const filler = Array.from({ length: 12 }, (_, index) => `Progress note ${index + 1}.`).join('\n');
  writeFileSync(path.join(f.root, 'docs', 'TODO.md'), `## Active Sprint\n\n${filler}\n- [x] Ship the bounded retry probe.\n\n## Historical Sprint\n\n- [ ] Rewrite the entire queue.\n`);
  const snapshot = capture(f.project, f.store);
  const done = snapshot.evidence.filter((item) => item.type === 'completed');
  assert.equal(done.length, 1, JSON.stringify(snapshot.discovery.docs.find((doc) => doc.path.endsWith('TODO.md'))?.excerpts, null, 2));
  assert.match(done[0].text, /bounded retry probe/);
  assert.ok(!snapshot.evidence.some((item) => item.text.includes('Rewrite the entire queue')));
});

test('rejects configured subdirectory roots instead of widening capture to sibling project files', () => {
  const f = fixture();
  mkdirSync(path.join(f.root, 'packages', 'one'), { recursive: true });
  assert.throws(() => capture({ ...f.project, root: path.join(f.root, 'packages', 'one') }, f.store), /subdirectory scopes are not supported/);
});

test('renames hash the destination content and a later edit produces a new snapshot identity', () => {
  const f = fixture();
  const original = path.join(f.root, 'src.mjs');
  const moved = path.join(f.root, 'src-renamed.mjs');
  const baseline = capture(f.project, f.store);
  f.git('mv', 'src.mjs', 'src-renamed.mjs');
  writeFileSync(moved, 'export const queue = false;\n');
  const afterRename = capture(f.project, f.store);
  assert.notEqual(afterRename.id, baseline.id);
  const rename = afterRename.git.status.find((item) => item.path.includes('src.mjs'));
  assert.match(rename.path, /src\.mjs → src-renamed\.mjs/);
  assert.equal(rename.hash, hash(readFileSync(moved)));
  writeFileSync(moved, 'export const queue = true;\n');
  const editedAgain = capture(f.project, f.store);
  assert.notEqual(editedAgain.id, afterRename.id);
});
