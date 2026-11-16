import {authorizeUrl, createCaptureQueue, createPkce, expirationMillis, readCallback, serviceOrigin} from './auth.mjs';

const msg = (name, fallback) => chrome.i18n?.getMessage(name) || fallback;
const tokenKey = 'notcardsGrant';
const pendingQueue = createCaptureQueue(chrome.storage.local);
const captures = new Set();
let grantPromise;

async function readGrant() {
  const { [tokenKey]: grant } = await chrome.storage.session.get(tokenKey);
  const expiresAt=expirationMillis(grant?.expiresAt);
  if (grant?.accessToken && Number.isFinite(expiresAt) && expiresAt > Date.now() + 60_000) return {...grant,expiresAt};
  await chrome.storage.session.remove(tokenKey);
  return null;
}

async function authorize(interactive) {
  const redirectUri = chrome.identity.getRedirectURL('auth');
  const pkce = await createPkce();
  const authUrl = authorizeUrl({...pkce, redirectUri, extensionId: chrome.runtime.id});
  const callback = await chrome.identity.launchWebAuthFlow({url: authUrl, interactive});
  const code = readCallback(callback, pkce.state, redirectUri);
  const response = await fetch(`${serviceOrigin}/auth/extension/token`, {
    credentials: 'omit',
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({code, verifier: pkce.verifier, redirectUri}),
    signal: AbortSignal.timeout(15_000)
  });
  const result = await response.json().catch(() => ({}));
  const expiresAt=expirationMillis(result.expiresAt);
  if (!response.ok || typeof result.accessToken !== 'string' || result.tokenType !== 'Bearer' || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    throw new Error(result.error || msg('signInFailed', 'Sign-in could not be completed. Try again.'));
  }
  const grant = {accessToken: result.accessToken, expiresAt, user: result.user};
  await chrome.storage.session.set({[tokenKey]: grant});
  return grant;
}

async function grantFor(interactive = true) {
  const existing = await readGrant();
  if (existing) return existing;
  if (grantPromise) return grantPromise;
  grantPromise = (async () => {
    try { return await authorize(false); }
    catch (error) {
      if (!interactive) throw error;
      return authorize(true);
    }
  })();
  try { return await grantPromise; }
  finally { grantPromise = null; }
}

async function bindOwner(record, accountId) {
  await pendingQueue.bindOwner(record.captureId, accountId);
  record.ownerId ||= accountId;
}

async function renewedGrant(failedToken, interactive = true) {
  const current = await readGrant();
  if (current && current.accessToken !== failedToken) return current;
  await chrome.storage.session.remove(tokenKey);
  return grantFor(interactive);
}

async function postCapture(payload, interactive = true) {
  let grant = await grantFor(interactive);
  if (typeof grant.user?.id !== 'string' || !grant.user.id) throw new Error(msg('signInFailed', 'Sign-in could not be completed. Try again.'));
  await bindOwner(payload, grant.user.id);
  let response = await fetch(`${serviceOrigin}/api/capture`, {
    credentials: 'omit',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${grant.accessToken}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': payload.captureId
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000)
  });
  if (response.status === 401) {
    grant = await renewedGrant(grant.accessToken, interactive);
    if (typeof grant.user?.id !== 'string' || !grant.user.id) throw new Error(msg('signInFailed', 'Sign-in could not be completed. Try again.'));
    await bindOwner(payload, grant.user.id);
    response = await fetch(`${serviceOrigin}/api/capture`, {
      credentials: 'omit',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${grant.accessToken}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': payload.captureId
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000)
    });
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Notcards returned ${response.status}`);
  if (typeof result.id !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(result.id)) throw new Error('Notcards returned an invalid notebook');
  return result;
}

async function pendingCaptures() {
  return (await pendingQueue.list()).filter(record => record && /^[a-f0-9-]{36}$/.test(record.captureId));
}

async function sendPending(record, interactive = true) {
  return pendingQueue.deliver(record, async pending => {
    const result = await postCapture(pending, interactive);
    await chrome.tabs.create({url: `${serviceOrigin}/#note=${encodeURIComponent(result.id)}`});
    return result;
  });
}

async function resumePending(interactive = false) {
  for (const record of await pendingCaptures()) {
    try { await sendPending(record, interactive); }
    catch (error) {
      if (interactive) throw error;
      return;
    }
  }
}

async function capturePage(wantTranscript, expectedId) {
  const player = document.querySelector('#movie_player');
  const data = player?.getPlayerResponse?.() || {};
  const pageUrl = new URL(location.href);
  const currentId = pageUrl.pathname === '/watch' ? pageUrl.searchParams.get('v') : pageUrl.pathname.split('/')[2];
  if (currentId !== expectedId || (data.videoDetails?.videoId && data.videoDetails.videoId !== expectedId)) throw new Error('Video is still changing. Try again when it finishes loading.');
  const title = data.videoDetails?.title || document.querySelector('meta[property="og:title"]')?.content || document.title.replace(/ - YouTube$/, '');
  const channel = data.videoDetails?.author || document.querySelector('#owner #channel-name a')?.textContent?.trim() || '';
  if (!wantTranscript) return {title, channel, videoId: currentId};
  const tracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  const sorted = [...tracks].sort((a, b) => Number(b.languageCode?.startsWith('en')) - Number(a.languageCode?.startsWith('en')) || Number(a.kind === 'asr') - Number(b.kind === 'asr'));
  for (const track of sorted.slice(0, 2)) {
    try {
      const url = new URL(track.baseUrl);
      if (url.origin !== 'https://www.youtube.com' || url.pathname !== '/api/timedtext') continue;
      url.searchParams.set('fmt', 'json3');
      const response = await fetch(url, {credentials: 'include', redirect: 'error', signal: AbortSignal.timeout(12_000)});
      if (!response.ok) continue;
      const text = await response.text();
      if (text.length > 800_000) throw new Error('Captions exceed supported size');
      const json = JSON.parse(text);
      if (json.events?.some(event => event.segs?.some(segment => segment.utf8?.trim()))) return {transcript: json, source: `youtube-captions:${track.languageCode || 'unknown'}`};
    } catch { /* Fall back to the visible transcript. */ }
  }
  const readRows = () => [...document.querySelectorAll('ytd-transcript-segment-renderer')].map(row => {
    const text = row.querySelector('.segment-text')?.textContent?.trim();
    const parts = (row.querySelector('.segment-timestamp')?.textContent || '0').trim().split(':').map(Number);
    return {text, start: parts.reduce((total, part) => total * 60 + part, 0)};
  }).filter(row => row.text);
  let transcript = readRows();
  if (!transcript.length) {
    const button = [...document.querySelectorAll('button,ytd-button-renderer')].find(item => /^(show transcript|mostrar transcripci[oÃ³]n)$/i.test(item.textContent?.trim() || ''));
    button?.click();
    if (button) for (let attempt = 0; attempt < 12 && !transcript.length; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 250));
      transcript = readRows();
    }
  }
  return transcript.length ? {transcript, source: 'youtube-transcript-panel'} : {error: 'YouTube captions were unavailable. The card was saved without them.'};
}

async function saveFromTab(tab) {
  if (!tab?.id || !tab.url) throw new Error(msg('openVideo', 'Open a YouTube video first.'));
  const url = new URL(tab.url);
  const id = url.pathname === '/watch' ? url.searchParams.get('v') : url.pathname.split('/')[2];
  if (url.origin !== 'https://www.youtube.com' || !['/watch', `/shorts/${id}`, `/live/${id}`].includes(url.pathname) || !/^[A-Za-z0-9_-]{11}$/.test(id || '')) throw new Error(msg('openVideo', 'Open a YouTube video first.'));
  if (captures.has(id)) throw new Error(msg('alreadySaving', 'This video is already being saved.'));
  captures.add(id);
  try {
    try { await resumePending(false); } catch { /* Keep previous captures pending and continue this save. */ }
    const [{result: metadata}] = await chrome.scripting.executeScript({target: {tabId: tab.id}, world: 'MAIN', func: capturePage, args: [false, id]});
    if (metadata?.videoId !== id) throw new Error(msg('videoChanged', 'Video changed before capture. Try again.'));
    const [{result: captured}] = await chrome.scripting.executeScript({target: {tabId: tab.id}, world: 'MAIN', func: capturePage, args: [true, id]});
    const current = await chrome.tabs.get(tab.id);
    const currentUrl = new URL(current.url);
    const currentId = currentUrl.pathname === '/watch' ? currentUrl.searchParams.get('v') : currentUrl.pathname.split('/')[2];
    if (currentId !== id) throw new Error(msg('videoChanged', 'Video changed before capture. Try again.'));
    const record = {
      captureId: crypto.randomUUID(),
      url: `https://www.youtube.com/watch?v=${id}`,
      title: String(metadata.title || '').slice(0, 500),
      channel: String(metadata.channel || '').slice(0, 160),
      transcript: captured?.transcript || '',
      source: captured?.source || 'youtube-captions-unavailable'
    };
    await pendingQueue.enqueue(record);
    const result = await sendPending(record, true);
    return {ok: true, needsTranscript: !record.transcript, message: record.transcript ? msg('saved', 'Saved to Notcards') : msg('noTranscript', 'Card saved. You can add a transcript in Notcards.')};
  } finally {
    captures.delete(id);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'notcards.status') {
    Promise.all([readGrant(), pendingCaptures()]).then(([grant, pending]) => sendResponse({user: grant?.user || null, pending: pending.length}));
    return true;
  }
  if (message?.type === 'notcards.signin') {
    grantFor(true).then(grant => sendResponse({ok: true, user: grant.user}), error => sendResponse({ok: false, error: error.message || msg('signInFailed', 'Sign-in could not be completed. Try again.')}));
    return true;
  }
  if (message?.type === 'notcards.signout') {
    chrome.storage.session.remove(tokenKey).then(() => sendResponse({ok: true}));
    return true;
  }
  if (message?.type !== 'notcards.capture') return false;
  saveFromTab(sender.tab).then(sendResponse, error => sendResponse({ok: false, error: error.message || msg('captureFailed', 'Notcards could not save this video.')}));
  return true;
});

chrome.action.onClicked.addListener(() => chrome.tabs.create({url: serviceOrigin}));
chrome.runtime.onStartup.addListener(() => { void resumePending(false); });
