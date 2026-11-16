const HOST = 'https://not.maremoto.dev';
const DEVELOPMENT_EXTENSION_ID = 'aimdojafaddgpjhiejbfihfljeacolmk';
const EXTENSION_ID = /^[a-p]{32}$/;

const randomToken = (length = 32) => {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
};

const base64Url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)))
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '');

export async function createPkce() {
  const verifier = randomToken(48);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return {verifier, challenge: base64Url(digest), state: randomToken(24)};
}

export function authorizeUrl({challenge, state, redirectUri, extensionId = DEVELOPMENT_EXTENSION_ID}) {
  if (!EXTENSION_ID.test(extensionId || '')) throw new Error('Unexpected Notcards extension ID');
  const callback = new URL(redirectUri);
  if (callback.href !== `https://${extensionId}.chromiumapp.org/auth` || callback.protocol !== 'https:' || callback.hostname !== `${extensionId}.chromiumapp.org` || callback.pathname !== '/auth' || callback.search || callback.hash) {
    throw new Error('Unexpected Notcards sign-in redirect');
  }
  if (!/^[A-Za-z0-9_-]{43}$/.test(challenge) || !/^[a-f0-9]{48}$/.test(state)) throw new Error('Invalid sign-in request');
  const url = new URL('/auth/extension/authorize', HOST);
  url.searchParams.set('challenge', challenge);
  url.searchParams.set('state', state);
  url.searchParams.set('redirectUri', redirectUri);
  return url.href;
}

export function readCallback(resultUrl, expectedState, redirectUri) {
  const result = new URL(resultUrl);
  const expected = new URL(redirectUri);
  if (result.origin !== expected.origin || result.pathname !== expected.pathname || result.hash) throw new Error('Notcards sign-in did not return to this extension');
  if (result.searchParams.get('state') !== expectedState) throw new Error('Notcards sign-in state did not match');
  const code = result.searchParams.get('code');
  if (result.searchParams.getAll('state').length !== 1 || result.searchParams.getAll('code').length !== 1 || !/^[A-Za-z0-9_-]{32,128}$/.test(code || '') || result.searchParams.has('error')) throw new Error(result.searchParams.get('error_description') || 'Notcards sign-in was not completed');
  return code;
}

export function expirationMillis(value) {
  const numeric=typeof value==='number'?value:(typeof value==='string'&&/^\d{10,13}$/.test(value)?Number(value):NaN);
  if(Number.isFinite(numeric))return numeric<1_000_000_000_000?numeric*1000:numeric;
  const parsed=typeof value==='string'?Date.parse(value):NaN;
  return Number.isFinite(parsed)?parsed:NaN;
}

export function captureBelongsTo(ownerId, accountId) {
  return !ownerId || (typeof accountId === 'string' && accountId.length > 0 && ownerId === accountId);
}

export function createCaptureQueue(storage, key = 'notcardsPendingCaptures') {
  let writeTail = Promise.resolve();
  const deliveries = new Map();

  function exclusive(work) {
    const result = writeTail.then(work, work);
    writeTail = result.catch(() => {});
    return result;
  }

  async function read() {
    const value = await storage.get(key);
    return Array.isArray(value?.[key]) ? value[key] : [];
  }

  async function update(change) {
    return exclusive(async () => {
      const current = await read();
      const next = change(current);
      await storage.set({[key]: next});
      return next;
    });
  }

  return {
    list() {
      return exclusive(read);
    },
    enqueue(record) {
      return update(current => {
        const existing = current.find(item => item.captureId === record.captureId);
        if (existing) {
          if (JSON.stringify(existing) !== JSON.stringify(record)) throw new Error('Capture id was reused with different video data');
          return current;
        }
        return [...current, record];
      });
    },
    bindOwner(captureId, accountId) {
      return update(current => {
        const record = current.find(item => item.captureId === captureId);
        if (!record) throw new Error('Pending capture was removed before it was sent');
        if (!captureBelongsTo(record.ownerId, accountId)) throw new Error('This saved capture belongs to another Notcards account. Sign in to its original account to retry it.');
        return current.map(item => item.captureId === captureId ? {...item, ownerId: item.ownerId || accountId} : item);
      });
    },
    remove(captureId) {
      return update(current => current.filter(item => item.captureId !== captureId));
    },
    deliver(record, send) {
      const active = deliveries.get(record.captureId);
      if (active) return active;
      const delivery = Promise.resolve().then(() => send(record)).then(async result => {
        await this.remove(record.captureId);
        return result;
      }).finally(() => deliveries.delete(record.captureId));
      deliveries.set(record.captureId, delivery);
      return delivery;
    }
  };
}

export const serviceOrigin = HOST;
