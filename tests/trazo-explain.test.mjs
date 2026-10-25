import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { snapshotFolder } from '../src/trazo/facts.mjs';
import { preview, explain, estimateUsd, vocabularyFor, cacheKey, MAX_CALL_USD } from '../src/trazo/explain.mjs';
import { renderInfographic, renderMermaid, wrap, fill, citationIndex } from '../src/trazo/compose.mjs';
import { buildRecord, validateRecord, artifactId, ARTIFACT_SCHEMA } from '../src/artifact/record.mjs';
import { Project, createServer } from '../src/trazo/server.mjs';
import { execFileSync } from 'node:child_process';

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'trazo-ex-'));
  const put = (rel, text) => { const abs = path.join(root, rel); fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, text); };
  put('README.md', '# Sync tool\n\nSyncs a kanban board with Plane. "Quoted" <b>bold</b>.\n\n## Current state\n\nThe sync runs on a timer and writes issues.\n\n## Next\n\nAdd rename support.\n');
  put('docs/CONTEXT.md', '# Context\n\n## Current state\n\nTimer sync implemented in src/sync.ts.\n\n## Next steps\n\nRename boxes.\n');
  put('src/sync.ts', "import { plane } from './plane';\nexport function syncIssues() { return plane.list(); }\nexport function renameBox(id: string) { return id; }\n");
  put('src/plane.ts', 'export const plane = { list() { return []; } };\n');
  put('.env', 'SECRET=never-send\n');
  // Discovery needs Git for the inventory.
  const git = args => execFileSync('git', ['-C', root, ...args], { stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } });
  git(['init', '-q']); git(['add', '-A']); git(['commit', '-q', '-m', 'init']);
  return root;
}

/** A Ghost double: records calls, returns a schema-valid six-chapter analysis citing the first excerpts. */
function fakeAnalyzer(log) {
  return async (ghost, { sources, vocabulary }) => {
    log.push({ sources: sources.map(s => s.path), vocabulary });
    const { buildAnalysisInput } = await import('../src/visu/analysis.mjs');
    const input = buildAnalysisInput(sources);
    const n = input.excerpts.length;
    const region = (i, state) => ({ id: `chapter-${i}`, label: `Chapter ${i} <b>`, summary: `Summary ${i} with "quotes" & ampersands.`, visual: 'A lighthouse.', visualChanged: false, currentState: state, intendedDesign: 'Rename support is planned.', nextSteps: i === 5 ? 'Unknown — nothing evidenced.' : 'Add rename support.', currentEvidence: /^Unknown/.test(state) ? [] : [i % n], designEvidence: [(i + 1) % n], nextEvidence: i === 5 ? [] : [(i + 2) % n], evidence: [i % n] });
    const regions = [0, 1, 2, 3, 4, 5].map(i => region(i, i >= 4 ? 'Unknown — not captured.' : 'Timer sync exists.'));
    const { default: _ } = { default: null };
    // Reuse Visu's validator by round-tripping through analyzeProject's shape is private; emulate its output.
    const cite = idx => idx.map(k => ({ path: input.excerpts[k].path, startLine: input.excerpts[k].startLine, quote: input.excerpts[k].text }));
    return { regions: regions.map(r => ({ ...r, currentEvidence: cite(r.currentEvidence), designEvidence: cite(r.designEvidence), nextEvidence: cite(r.nextEvidence), evidence: cite(r.evidence), paths: [...new Set([...r.currentEvidence, ...r.designEvidence, ...r.nextEvidence, ...r.evidence].map(k => input.excerpts[k].path))] })), warnings: ['chapter-5.nextSteps: unsupported claim withheld'], metrics: { costUsd: 0.0123, durationMs: 10, excerptCount: n, approxBytes: input.approxBytes, usage: { total_tokens: 100 }, callId: 'call-1' }, analysisVersion: 'visu-analysis/4' };
  };
}

const ghost = { url: 'http://127.0.0.1:4000', key: 'k', fetcher: () => { throw new Error('network must not be used'); }, analysisModel: 'fake-model' };

test('preview shows the exact excerpt set, never secrets, and sends nothing', async () => {
  const root = fixture();
  const { facts } = await snapshotFolder(root, { name: 'sync' });
  const p = await preview(root, { facts, ghost, store: null });
  assert.equal(p.available, true);
  assert.ok(p.excerptCount >= 3);
  assert.ok(p.excerpts.every(e => !e.path.startsWith('.env') && !e.text.includes('never-send')));
  assert.equal(p.estimateUsd, estimateUsd(p.approxBytes));
  assert.ok(p.estimateUsd > 0 && p.estimateUsd < MAX_CALL_USD);
  assert.equal(p.vocabulary, 'code');
  assert.equal(vocabularyFor({ summary: { languages: { md: 40, js: 2 } } }), 'docs');
  const off = await preview(root, { facts, ghost: null });
  assert.equal(off.available, false); assert.equal(off.cacheKey, null);
});

test('explain needs a client and a confirmation, then caches by excerpt set for $0', async () => {
  const root = fixture(); const store = fs.mkdtempSync(path.join(os.tmpdir(), 'trazo-ex-store-'));
  const { facts } = await snapshotFolder(root, { name: 'sync' });
  const log = [];
  await assert.rejects(explain(root, { facts, ghost: null, store }), e => e.status === 409);
  await assert.rejects(explain(root, { facts, ghost, store, analyzer: fakeAnalyzer(log) }), e => e.status === 428 && /Confirmation required/.test(e.message));
  assert.equal(log.length, 0, 'nothing is analysed before confirmation');
  const first = await explain(root, { facts, ghost, store, confirm: true, analyzer: fakeAnalyzer(log) });
  assert.equal(first.cacheHit, false); assert.equal(log.length, 1);
  assert.equal(log[0].vocabulary, null);
  const ex = first.explanation;
  assert.equal(ex.schema, 'trazo.explanation/v0'); assert.equal(ex.chapters.length, 6); assert.equal(ex.cost.usd, 0.0123); assert.equal(ex.cost.reported, true);
  assert.deepEqual(ex.chapters.map(c => c.confidence), ['high', 'high', 'high', 'high', 'medium', 'low']);
  assert.ok(ex.chapters[0].cites.current[0].hash.length === 64 && ex.chapters[0].cites.current[0].endLine >= ex.chapters[0].cites.current[0].startLine);
  assert.ok(ex.chapters.every(c => c.node === null || facts.nodes.some(n => n.id === c.node)));
  const second = await explain(root, { facts, ghost, store, analyzer: fakeAnalyzer(log) });
  assert.equal(second.cacheHit, true); assert.equal(second.explanation.cost.usd, 0); assert.equal(log.length, 1, 'cache hit makes no call');
  assert.equal(second.explanation.id, first.explanation.id);
  assert.equal(cacheKey({ excerpts: [{ path: 'a', startLine: 1, text: 'x' }], model: 'm', vocabulary: 'code' }), cacheKey({ excerpts: [{ path: 'a', startLine: 1, text: 'x' }], model: 'm', vocabulary: 'code' }));
  assert.notEqual(cacheKey({ excerpts: [], model: 'm', vocabulary: 'code' }), cacheKey({ excerpts: [], model: 'other', vocabulary: 'code' }));
});

test('infographic and mermaid are escaped, cite clickable excerpts and mark freshness', async () => {
  const root = fixture(); const store = fs.mkdtempSync(path.join(os.tmpdir(), 'trazo-ex-store-'));
  const { facts } = await snapshotFolder(root, { name: 'sync' });
  const { explanation } = await explain(root, { facts, ghost, store, confirm: true, analyzer: fakeAnalyzer([]) });
  const svg = renderInfographic(facts, explanation);
  assert.ok(svg.startsWith('<svg') && svg.includes('</svg>'));
  assert.ok(!svg.includes('<b>') && svg.includes('Chapter 0 &lt;b&gt;'), 'labels escaped');
  assert.ok(svg.includes('&quot;quotes&quot; &amp; ampersands'), 'captions escaped');
  assert.ok(svg.includes('data-cite="chapter-0/current/0"'), 'citations link to a stable index');
  assert.ok(svg.includes('$0.0123'));
  assert.ok(!svg.includes('STALE'));
  const stale = renderInfographic({ ...facts, snapshot: { ...facts.snapshot, id: 'other' } }, explanation);
  assert.ok(stale.includes('STALE'));
  assert.ok(svg.includes('{{') === false, 'all template slots filled');
  const idx = citationIndex(explanation);
  assert.ok(idx.list.some(c => c.id === 'chapter-0/current/0' && c.quote.length > 0));
  const mmd = renderMermaid(facts, explanation);
  assert.ok(mmd.startsWith('flowchart LR'));
  assert.ok(mmd.includes('ch0["Chapter 0 '), 'mermaid nodes per chapter');
  assert.ok(!mmd.includes('<b>') && mmd.includes('#quot;'));
  assert.ok(mmd.includes('ch5:::low'));
  assert.deepEqual(wrap('one two three four five', 9, 2), ['one two', 'three…']);
  assert.equal(fill('a {{x}} b {{y}}', { x: 1 }), 'a 1 b ');
});

test('artifact record v0 is content-addressed, validated and ignores task and view url', () => {
  const base = { tool: { name: 'trazo', version: '0.2.0' }, project: { hostId: 'sync', repoRoot: 'D:/x' }, revision: { ref: 'main', sha: 'abc', dirty: false, capturedAt: '2026-10-25T10:00:00Z' }, scope: { kind: 'explained-snapshot', summary: 'A · B' }, evidence: [{ path: 'src/sync.ts', lines: [1, 3], hash: 'a'.repeat(64) }], view: { url: 'http://127.0.0.1:1/#x', static: 'infographic.svg' }, provenance: { inference: 'model', model: 'm', cost: 0.01 } };
  const a = buildRecord(base);
  assert.equal(a.schema, ARTIFACT_SCHEMA);
  assert.deepEqual(validateRecord(a), []);
  const b = buildRecord({ ...base, task: { hostId: 'orkest', issue: 'WARE-1' }, view: { ...base.view, url: 'http://127.0.0.1:2/#y' } });
  assert.equal(a.id, b.id, 'task and view.url are outside the id');
  const c = buildRecord({ ...base, scope: { kind: 'explained-snapshot', summary: 'changed' } });
  assert.notEqual(a.id, c.id);
  assert.ok(validateRecord({ ...a, id: 'sha256:' + '0'.repeat(64) }).includes('id does not match content'));
  assert.throws(() => buildRecord({ ...base, evidence: [{ path: 'x', lines: [3, 1], hash: 'zz' }] }), /evidence/);
  assert.throws(() => buildRecord({ ...base, provenance: { inference: 'model', model: null } }), /provenance.model/);
  assert.equal(artifactId(a), a.id);
});

test('server: preview is free, explain needs confirm, then infographic, mermaid, artifact and ledger exist', async () => {
  const root = fixture(); const store = fs.mkdtempSync(path.join(os.tmpdir(), 'trazo-ex-store-'));
  const log = [];
  const project = new Project({ root, store, name: 'sync', ghost, analyzer: fakeAnalyzer(log) });
  await project.snapshot();
  const server = createServer({ project, token: 'tok', port: 0 });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`; const h = { authorization: 'Bearer tok' };
  const get = (p, init = {}) => fetch(base + p, { ...init, headers: { ...h, ...(init.headers || {}) } });
  try {
    for (const p of ['/api/explanation', '/api/infographic', '/api/mermaid', '/api/artifact']) assert.equal((await get(p)).status, 404);
    const pre = await (await get('/api/explain/preview')).json();
    assert.ok(pre.excerptCount > 0 && pre.estimateUsd > 0 && pre.cached === false && !('sources' in pre));
    assert.equal(log.length, 0);
    assert.equal((await get('/api/explain', { method: 'POST', body: '{}' })).status, 428);
    assert.equal(log.length, 0);
    const r = await (await get('/api/explain', { method: 'POST', body: JSON.stringify({ confirm: true }) })).json();
    assert.equal(r.cacheHit, false); assert.equal(r.chapters, 6); assert.equal(r.ledger.calls, 1); assert.equal(r.ledger.costUsd, 0.0123);
    const state = await (await get('/api/state')).json();
    assert.equal(state.modelCalls, 1); assert.equal(state.explain.has, true); assert.equal(state.explain.stale, false);
    const again = await (await get('/api/explain', { method: 'POST', body: JSON.stringify({ confirm: true }) })).json();
    assert.equal(again.cacheHit, true); assert.equal(again.ledger.calls, 2); assert.equal(again.ledger.costUsd, 0.0123, 'cache hit adds no cost');
    assert.equal(log.length, 1);
    const svg = await get('/api/infographic'); assert.match(svg.headers.get('content-type'), /svg/); assert.ok((await svg.text()).includes('data-cite='));
    assert.ok((await (await get('/api/mermaid')).text()).startsWith('flowchart'));
    const art = await (await get('/api/artifact')).json();
    assert.deepEqual(validateRecord(art), []); assert.equal(art.tool.name, 'trazo'); assert.equal(art.provenance.inference, 'model'); assert.ok(art.evidence.length > 0);
    const cites = await (await get('/api/citations')).json(); assert.ok(cites.length > 0);
    const dir = path.join(project.dir, 'snapshots', project.facts.snapshot.id);
    for (const f of ['explanation.json', 'infographic.svg', 'chapters.mmd', 'artifact.json']) assert.ok(fs.existsSync(path.join(dir, f)), f);
    const ledger = JSON.parse(fs.readFileSync(path.join(project.dir, 'ledger.json'), 'utf8'));
    assert.equal(ledger.calls.length, 2); assert.equal(ledger.calls[1].cacheHit, true);
    // A fresh process finds the explanation on disk without any call.
    const reopened = new Project({ root, store, name: 'sync', ghost: null });
    await reopened.snapshot();
    assert.equal(reopened.explanation?.id, r.id); assert.equal(reopened.state(null).explain.available, false);
  } finally { server.close(); }
});
