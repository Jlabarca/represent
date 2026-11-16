import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {authorizeUrl, captureBelongsTo, createCaptureQueue, createPkce, readCallback, serviceOrigin} from '../extensions/notcards/auth.mjs';
import {buildPackage, extensionId} from '../scripts/notcards-extension.mjs';

const redirectUri = 'https://aimdojafaddgpjhiejbfihfljeacolmk.chromiumapp.org/auth';

async function temporary(t) {
  const directory = await mkdtemp(join(tmpdir(), 'notcards-extension-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  return directory;
}

function archiveEntries(archive) {
  const entries = new Map();
  let cursor = 0;
  while (archive.readUInt32LE(cursor) === 0x04034b50) {
    const size = archive.readUInt32LE(cursor + 18);
    const nameLength = archive.readUInt16LE(cursor + 26);
    const extraLength = archive.readUInt16LE(cursor + 28);
    const name = archive.toString('utf8', cursor + 30, cursor + 30 + nameLength);
    const dataStart = cursor + 30 + nameLength + extraLength;
    entries.set(name, archive.subarray(dataStart, dataStart + size));
    cursor = dataStart + size;
  }
  assert.equal(archive.readUInt32LE(cursor), 0x02014b50);
  return entries;
}

function archiveMembers(archive) { return [...archiveEntries(archive).keys()]; }

test('Notcards OAuth flow uses PKCE and checks state, code, and its pinned callback origin', async () => {
  const pkce = await createPkce();
  assert.match(pkce.verifier, /^[a-f0-9]{96}$/);
  assert.match(pkce.challenge, /^[A-Za-z0-9_-]{43}$/);
  assert.match(pkce.state, /^[a-f0-9]{48}$/);
  const auth = new URL(authorizeUrl({...pkce, redirectUri}));
  assert.equal(auth.origin, serviceOrigin);
  assert.equal(auth.pathname, '/auth/extension/authorize');
  assert.equal(auth.searchParams.get('challenge'), pkce.challenge);
  assert.equal(auth.searchParams.get('state'), pkce.state);
  assert.equal(auth.searchParams.get('redirectUri'), redirectUri);
  const callback = `${redirectUri}?code=${'a'.repeat(43)}&state=${pkce.state}`;
  assert.equal(readCallback(callback, pkce.state, redirectUri), 'a'.repeat(43));
  assert.throws(() => readCallback(`${redirectUri}?code=${'a'.repeat(43)}&state=wrong`, pkce.state, redirectUri), /state/);
  assert.throws(() => readCallback(`https://example.com/auth?code=${'a'.repeat(43)}&state=${pkce.state}`, pkce.state, redirectUri), /return to this extension/);
  assert.throws(() => readCallback(`${redirectUri}?code=bad&state=${pkce.state}`, pkce.state, redirectUri), /not completed/);
  assert.throws(() => authorizeUrl({...pkce, redirectUri: 'https://example.com/auth'}), /Unexpected/);
});

test('pending captures cannot be replayed through a different account grant', () => {
  assert.equal(captureBelongsTo(undefined, 'account-a'), true);
  assert.equal(captureBelongsTo('account-a', 'account-a'), true);
  assert.equal(captureBelongsTo('account-a', 'account-b'), false);
  assert.equal(captureBelongsTo('account-a', undefined), false);
});

test('serialized capture queue preserves simultaneous tabs, deduplicates sends, and retries failures', async () => {
  const data = {};
  const storage = {
    async get(key) {
      await new Promise(resolve => setTimeout(resolve, 2));
      return {[key]: structuredClone(data[key] || [])};
    },
    async set(values) {
      await new Promise(resolve => setTimeout(resolve, 2));
      Object.assign(data, structuredClone(values));
    }
  };
  const queue = createCaptureQueue(storage);
  const first = {captureId: '11111111-1111-4111-8111-111111111111', url: 'https://www.youtube.com/watch?v=aaaaaaaaaaa', title: 'First video', transcript: 'First transcript'};
  const second = {captureId: '22222222-2222-4222-8222-222222222222', url: 'https://www.youtube.com/watch?v=bbbbbbbbbbb', title: 'Second video', transcript: 'Second transcript'};

  await Promise.all([queue.enqueue(first), queue.enqueue(second)]);
  assert.deepEqual((await queue.list()).map(item => item.captureId), [first.captureId, second.captureId]);

  let firstAttempts = 0;
  let secondAttempts = 0;
  const [failed, duplicate, succeeded] = await Promise.allSettled([
    queue.deliver(first, async () => {
      firstAttempts++;
      await new Promise(resolve => setTimeout(resolve, 8));
      throw new Error('temporary network failure');
    }),
    queue.deliver(first, async () => { throw new Error('duplicate send should not run'); }),
    queue.deliver(second, async () => {
      secondAttempts++;
      await new Promise(resolve => setTimeout(resolve, 8));
      return {id: 'bbbbbbbbbbb'};
    })
  ]);
  assert.equal(failed.status, 'rejected');
  assert.equal(duplicate.status, 'rejected');
  assert.equal(succeeded.status, 'fulfilled');
  assert.equal(firstAttempts, 1);
  assert.equal(secondAttempts, 1);
  assert.deepEqual((await queue.list()).map(item => item.captureId), [first.captureId]);

  await queue.bindOwner(first.captureId, 'account-a');
  await assert.rejects(queue.bindOwner(first.captureId, 'account-b'), /belongs to another Notcards account/);
  await queue.deliver((await queue.list())[0], async record => {
    assert.equal(record.ownerId, 'account-a');
    firstAttempts++;
    return {id: 'aaaaaaaaaaa'};
  });
  assert.equal(firstAttempts, 2);
  assert.deepEqual(await queue.list(), []);
});

test('hosted package is deterministic, localized, and restricted to the Notcards origins', async t => {
  const directory = await temporary(t);
  const output = join(directory, 'build');
  const source = new URL('../extensions/notcards/', import.meta.url);
  const first = await buildPackage({source, output, writeUnpacked: false});
  const second = await buildPackage({source, output, writeUnpacked: false});
  assert.equal(first.sha256, second.sha256);
  assert.equal(first.extensionId, 'aimdojafaddgpjhiejbfihfljeacolmk');
  const entries = archiveEntries(await readFile(first.path));
  const manifest = JSON.parse(entries.get('manifest.json').toString('utf8'));
  assert.equal(extensionId(manifest.key), first.extensionId);
  assert.deepEqual(manifest.host_permissions, ['https://www.youtube.com/*', 'https://not.maremoto.dev/*']);
  assert.deepEqual(manifest.permissions, ['storage', 'scripting', 'identity']);
  assert.equal(manifest.host_permissions.some(origin => origin.includes('127.0.0.1')), false);
  assert.equal(manifest.permissions.includes('cookies'), false);
  assert.equal(first.locales.length, 10);
  const messages = JSON.parse(entries.get('_locales/es/messages.json').toString('utf8'));
  assert.equal(messages.extName.message.includes('Notcards'), true);
  assert.equal(messages.signIn.message, 'Continuar con Google');
  assert.doesNotMatch(JSON.stringify(messages), /Clay Notes|pairing|127\.0\.0\.1|local service/i);
  assert.deepEqual(archiveMembers(await readFile(first.path)), first.members);
  assert.equal(first.credentialsIncluded, false);
});

test('package builder rejects local pairing hosts and extra permissions', async t => {
  const directory = await temporary(t);
  const source = join(directory, 'source');
  await mkdir(source);
  const manifestPath = join(source, 'manifest.json');
  const manifest = JSON.parse(await readFile(new URL('../extensions/notcards/manifest.json', import.meta.url), 'utf8'));
  manifest.host_permissions.push('http://127.0.0.1/*');
  await writeFile(manifestPath, JSON.stringify(manifest));
  await assert.rejects(buildPackage({source, output: join(directory, 'bad-host'), writeUnpacked: false}), /Unexpected extension host permission/);
  manifest.host_permissions.pop();
  manifest.permissions.push('cookies');
  await writeFile(manifestPath, JSON.stringify(manifest));
  await assert.rejects(buildPackage({source, output: join(directory, 'bad-permission'), writeUnpacked: false}), /Unexpected extension permission/);
});
