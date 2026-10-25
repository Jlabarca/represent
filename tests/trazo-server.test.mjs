import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { Project, createServer } from '../src/trazo/server.mjs';

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'trazo-srv-'));
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'README.md'), '# Srv\n\nServer fixture.\n');
  fs.writeFileSync(path.join(root, 'src/index.js'), 'export const x = 1;\n');
  fs.writeFileSync(path.join(root, '.env'), 'TOKEN=never\n');
  return root;
}

async function start() {
  const root = fixture(); const store = fs.mkdtempSync(path.join(os.tmpdir(), 'trazo-srv-store-'));
  const project = new Project({ root, store, name: 'srv' });
  await project.snapshot();
  const server = createServer({ project, token: 'tok-test', port: 0 });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port; const base = `http://127.0.0.1:${port}`;
  const get = (p, headers = {}, method = 'GET') => fetch(base + p, { method, headers });
  return { project, server, port, base, get, store, root };
}

test('project store refuses to live inside the consented root', () => {
  const root = fixture();
  assert.throws(() => new Project({ root, store: path.join(root, 'store') }), /outside/);
});

test('viewer page carries the token in a meta tag and the api requires it', async () => {
  const { server, get, base } = await start();
  try {
    const page = await get('/');
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.ok(html.includes('<meta name="trazo-token" content="tok-test">'));
    assert.ok(!html.includes('__TRAZO_TOKEN__'));
    assert.match(page.headers.get('content-security-policy'), /script-src 'self'/);
    assert.equal((await get('/api/state')).status, 401);
    assert.equal((await get('/api/state', { authorization: 'Bearer wrong' })).status, 401);
    const state = await (await get('/api/state', { authorization: 'Bearer tok-test' })).json();
    assert.equal(state.schema, 'trazo.state/v0');
    assert.equal(state.modelCalls, 0);
    assert.equal(state.ledger.calls, 0);
    assert.equal(state.snapshot.files, 2);
    const facts = await (await get('/api/facts', { authorization: 'Bearer tok-test' })).json();
    assert.ok(!JSON.stringify(facts).includes('never'), 'secrets never reach the facts');
    assert.ok(base.startsWith('http://127.0.0.1:'));
  } finally { server.close(); }
});

test('host and origin checks reject anything that is not this loopback port', async () => {
  const { server, get, port } = await start();
  try {
    const raw = host => new Promise((resolve, reject) => { const r = http.request({ host: '127.0.0.1', port, path: '/api/state', headers: { authorization: 'Bearer tok-test', host } }, res => { res.resume(); resolve(res.statusCode); }); r.on('error', reject); r.end(); });
    assert.equal(await raw('evil.example:80'), 403);
    assert.equal(await raw(`127.0.0.1:${port + 1}`), 403);
    assert.equal(await raw(`localhost:${port}`), 200);
    assert.equal((await get('/api/state', { authorization: 'Bearer tok-test', origin: 'http://127.0.0.1:9' })).status, 403);
    assert.equal((await get('/api/state', { authorization: 'Bearer tok-test', origin: 'https://127.0.0.1:' + port })).status, 403);
    assert.equal((await get('/api/state', { authorization: 'Bearer tok-test', origin: `http://localhost:${port}` })).status, 200);
  } finally { server.close(); }
});

test('sketch endpoint validates level and focus, snapshots are immutable on disk', async () => {
  const { server, get, project } = await start();
  try {
    const h = { authorization: 'Bearer tok-test' };
    const svg = await get('/api/sketch?level=1', h);
    assert.equal(svg.status, 200);
    assert.match(svg.headers.get('content-type'), /image\/svg\+xml/);
    assert.ok(Number(svg.headers.get('x-trazo-render-ms')) >= 0);
    assert.ok((await svg.text()).startsWith('<svg'));
    assert.equal((await get('/api/sketch?level=9', h)).status, 400);
    assert.equal((await get('/api/sketch?level=3&focus=../x', h)).status, 400);
    const deep = await get('/api/sketch?level=3&focus=mod:src', h);
    assert.equal(deep.status, 200);
    const snap = await (await get('/api/snapshot', h, 'POST')).json();
    assert.equal(snap.unchanged, true);
    assert.equal(snap.modelCalls, 0);
    const dir = path.join(project.dir, 'snapshots', snap.snapshotId);
    const before = fs.statSync(path.join(dir, 'facts.json')).mtimeMs;
    await get('/api/snapshot', h, 'POST');
    assert.equal(fs.statSync(path.join(dir, 'facts.json')).mtimeMs, before, 'existing snapshot files are never rewritten');
    assert.ok(fs.existsSync(path.join(dir, 'sketch-guide.svg')));
    assert.equal((await get('/nope', h)).status, 404);
  } finally { server.close(); }
});
