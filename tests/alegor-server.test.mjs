import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { createServer } from '../src/alegor/server.mjs';

const roots = [];
function repo() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'alegor-http-'));
  roots.push(dir);
  const root = path.join(dir, 'project');
  const storeDir = path.join(dir, 'tool-state');
  mkdirSync(root, { recursive: true });
  writeFileSync(path.join(root, 'README.md'), '# Safe project\nA local worker.\n');
  writeFileSync(path.join(root, 'TODO.md'), '## Active Sprint\n\n- [ ] Improve rate limit feedback.\n');
  const run = (...args) => execFileSync('git', ['-C', root, ...args], { stdio: 'ignore', windowsHide: true });
  run('init', '-b', 'main'); run('config', 'user.name', 'Alegor Test'); run('config', 'user.email', 'alegor@example.invalid'); run('add', '.'); run('commit', '-m', 'feat: first queue');
  return { project: { id: 'safe', name: 'Safe Project', root, color: '#426a58' }, storeDir };
}
after(() => { for (const dir of roots) rmSync(dir, { recursive: true, force: true, maxRetries: 4, retryDelay: 30 }); });

test('loopback API allowlists projects, protects GETs, validates snapshots and requires same-origin writes', async (t) => {
  const f = repo();
  const server = createServer({ projects: [f.project], storeDir: f.storeDir, port: 0 });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  const auth = { Authorization: `Bearer ${server.alegorToken}` };
  const home = await fetch(base);
  assert.equal(home.status, 200);
  const hostileHostStatus = await new Promise((resolve, reject) => {
    const request = httpRequest({ hostname: '127.0.0.1', port, path: '/', headers: { host: `attacker.test:${port}` } }, (response) => { response.resume(); resolve(response.statusCode); });
    request.on('error', reject);
    request.end();
  });
  assert.equal(hostileHostStatus, 421);
  assert.match(home.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.match(await home.text(), /Alegor/);
  assert.equal((await fetch(`${base}/api/projects`)).status, 403);
  assert.equal((await fetch(`${base}/api/projects`, { headers: auth })).status, 200);
  assert.equal((await fetch(`${base}/api/projects/other/snapshots`, { headers: auth })).status, 404);
  const captureResponse = await fetch(`${base}/api/projects/safe/capture`, { method: 'POST', headers: { ...auth, Origin: base, 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(captureResponse.status, 201);
  const { snapshot } = await captureResponse.json();
  assert.equal((await fetch(`${base}/api/projects/safe/capture`, { method: 'POST', headers: auth, body: '{}' })).status, 403);
  const invalidCurrent = await fetch(`${base}/api/projects/safe/brief?current=${encodeURIComponent(snapshot.id)}&baseline=../outside`, { headers: auth });
  assert.equal(invalidCurrent.status, 400);
  assert.match((await invalidCurrent.json()).error, /Baseline snapshot not found/);
  const sourceList = await fetch(`${base}/api/projects/safe/snapshots`, { headers: auth });
  assert.equal(sourceList.status, 200);
});
