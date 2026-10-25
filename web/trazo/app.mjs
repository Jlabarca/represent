// trazo viewer: dial, views, themes, status strip, explain flow. Talks only to its own loopback API with the injected token.
const token = document.querySelector('meta[name="trazo-token"]')?.content ?? '';
const $ = s => document.querySelector(s);
const headers = { authorization: `Bearer ${token}` };
let level = 1, focus = null, state = null, view = 'sketch', citations = null, previewData = null;
const THEMES = ['light', 'dark', 'mono'];
const money = n => (n === null || n === undefined) ? '—' : `$${Number(n).toFixed(n < 0.01 && n > 0 ? 4 : 2)}`;

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 2200); }
function theme(next) { const root = document.documentElement; if (next) { root.dataset.theme = next; try { localStorage.setItem('trazo.theme', next); } catch {} } return root.dataset.theme || ''; }
function cycleTheme() { const cur = theme() || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); theme(THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length]); toast(`theme: ${theme()}`); }
try { const saved = localStorage.getItem('trazo.theme'); if (THEMES.includes(saved)) theme(saved); } catch {}

async function api(path, init = {}) { const r = await fetch(path, { ...init, headers: { ...headers, ...(init.headers || {}) } }); if (!r.ok) { const body = await r.json().catch(() => ({})); throw Object.assign(new Error(body.error || r.statusText), { status: r.status, body }); } return r; }
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

function renderExplain() {
  const box = $('#explain'); box.replaceChildren();
  const ex = state.explain;
  if (!ex.available) {
    box.append(el('p', 'small', 'No gateway key in this shell, so nothing can be sent. Set TRAZO_GHOST_KEY and restart to enable a priced explanation.'));
  } else if (!ex.has || ex.stale) {
    box.append(el('p', 'small', ex.stale ? 'The folder changed since the last explanation.' : `I can explain this folder with one text call through ${ex.model}. You see the exact excerpts and a price first.`));
    const b = el('button', 'button primary', ex.stale ? 'Preview and re-explain' : 'Preview what I will send'); b.addEventListener('click', openPreview); box.append(b);
  }
  if (ex.has) {
    const dl = el('dl', 'kv');
    const rows = [['chapters', String(ex.chapters)], ['model', ex.model], ['cost', ex.cacheHit ? 'cached · $0' : ex.cost?.reported ? money(ex.cost.usd) : `not reported (est. ${money(ex.cost?.estimateUsd)})`], ['withheld', String(ex.warnings)], ['explained', ex.createdAt ? new Date(ex.createdAt).toLocaleString() : '—']];
    for (const [k, v] of rows) { dl.append(el('dt', null, k), el('dd', null, v)); }
    box.append(dl);
    if (!ex.stale) { const b = el('button', 'button', 'Re-explain (cached if unchanged)'); b.addEventListener('click', openPreview); box.append(b); }
  }
  for (const b of document.querySelectorAll('.view[data-view="chapters"],.view[data-view="mermaid"]')) b.disabled = !ex.has;
}

function renderState() {
  const s = state; if (!s) return;
  $('#project-name').textContent = s.name;
  $('#project-rev').textContent = s.revision?.sha ? `${s.revision.sha.slice(0, 7)}${s.revision.dirty ? ' +dirty' : ''}` : 'no git';
  $('#project-chip').title = `${s.root}\n${s.revision?.branch ? `branch ${s.revision.branch}` : ''}`;
  const snap = s.snapshot;
  const read = $('#read-list'); read.replaceChildren();
  if (snap) for (const [k, v] of [['files', `${snap.files}${snap.truncated ? ' (capped)' : ''}`], ['size', `${(snap.bytes / 1024).toFixed(0)} KiB`], ['modules', s.summary.modules], ['commits', `${s.summary.commits}${s.summary.historyTruncated ? '+' : ''}`], ['mode', snap.mode === 'git' ? 'git-tracked text' : 'folder walk'], ['skipped', snap.skipped], ['captured', new Date(snap.capturedAt).toLocaleTimeString()]]) read.append(el('dt', null, k), el('dd', null, String(v)));
  $('#calls').textContent = String(s.modelCalls ?? 0); $('#calls-top').textContent = String(s.modelCalls ?? 0);
  $('#cost').textContent = money(s.ledger?.costUsd ?? 0); $('#today').textContent = money(s.ledger?.spentTodayUsd ?? 0);
  $('#network').textContent = s.explain?.available ? 'gateway on loopback, only after a confirmed click' : 'none';
  const t = $('#timings'); t.replaceChildren(); for (const [k, v] of Object.entries(s.timings || {})) t.append(el('dt', null, k.replace('Ms', '')), el('dd', null, `${v} ms`));
  $('#summary').textContent = s.summary?.sentence || '';
  const sel = $('#focus'); const prev = sel.value; sel.replaceChildren();
  for (const m of s.modules) { const o = el('option', null, `${m.label} · ${m.files}`); o.value = m.id; sel.append(o); }
  if ([...sel.options].some(o => o.value === prev)) sel.value = prev; else focus = sel.value || null;
  renderExplain();
}

async function loadState() { state = await (await api('/api/state')).json(); renderState(); }

async function showSvg(path) {
  const box = $('#sketch'); box.setAttribute('aria-busy', 'true');
  const t0 = performance.now();
  try { const r = await api(path); box.innerHTML = await r.text(); $('#render-ms').textContent = `render ${r.headers.get('x-trazo-render-ms')} ms · shown in ${(performance.now() - t0).toFixed(0)} ms`; }
  catch (e) { box.replaceChildren(el('div', 'empty', e.message)); }
  box.removeAttribute('aria-busy');
}
async function loadSketch() {
  const q = new URLSearchParams({ level: String(level) }); if (level === 3 && focus) q.set('focus', focus);
  await showSvg(`/api/sketch?${q}`);
  if (level === 3 && state?.symbols !== 'ready') await loadState();
}
async function loadView() {
  $('#sketch').hidden = view === 'mermaid'; $('#mermaid').hidden = view !== 'mermaid'; $('#levels').hidden = view !== 'sketch'; $('#cite').hidden = true;
  document.querySelectorAll('.view').forEach(b => b.setAttribute('aria-checked', String(b.dataset.view === view)));
  if (view === 'sketch') return loadSketch();
  if (view === 'chapters') { citations = null; return showSvg('/api/infographic'); }
  try { $('#mermaid').textContent = await (await api('/api/mermaid')).text(); $('#render-ms').textContent = 'mermaid text · copy it into any renderer'; } catch (e) { $('#mermaid').textContent = e.message; }
}
function setView(v) { if (v !== 'sketch' && !state?.explain?.has) return toast('explain the folder first'); view = v; loadView(); }
function setLevel(n) { level = Math.max(0, Math.min(3, n)); document.querySelectorAll('.level').forEach(b => b.setAttribute('aria-checked', String(Number(b.dataset.level) === level))); $('#focus-wrap').hidden = level !== 3; if (view !== 'sketch') { view = 'sketch'; loadView(); } else loadSketch(); }

async function showCitation(id) {
  if (!citations) citations = await (await api('/api/citations')).json();
  const c = citations.find(x => x.id === id); if (!c) return;
  $('#cite-where').textContent = `${c.path}:${c.startLine}–${c.endLine} · ${c.chapter} · ${c.field}`; $('#cite-quote').textContent = c.quote; $('#cite').hidden = false; $('#cite').scrollIntoView({ block: 'nearest' });
}
$('#sketch').addEventListener('click', e => { const a = e.target.closest('a.cite'); if (!a) return; e.preventDefault(); showCitation(a.dataset.cite); });
$('#cite-close').addEventListener('click', () => { $('#cite').hidden = true; });

async function openPreview() {
  toast('reading the excerpt set…');
  try { previewData = await (await api('/api/explain/preview')).json(); } catch (e) { return toast(e.message); }
  const p = previewData;
  $('#preview-meta').textContent = `${p.excerptCount} excerpts from ${p.sourceCount} files · ${(p.approxBytes / 1024).toFixed(1)} KB · model ${p.model} · ${p.vocabulary} vocabulary · ${p.cached ? 'already explained: cached, $0' : `about ${money(p.estimateUsd)} (estimate from measured history; the gateway reports the real cost)`} · per-call cap ${money(p.maxCallUsd)}${p.scope.capped ? ' · scope is a ranked sample' : ''}`;
  const list = $('#preview-list'); list.replaceChildren();
  for (const e of p.excerpts) { const li = el('li'); li.append(el('code', 'mono', `${e.path}:${e.startLine}`), el('span', 'small', ` ${e.bytes} B · ${e.kind}`), el('pre', 'excerpt', e.text)); list.append(li); }
  $('#preview-explain').textContent = p.cached ? 'Use the cached explanation ($0)' : `Explain once for about ${money(p.estimateUsd)}`;
  $('#preview').hidden = false; $('#preview-explain').focus();
}
function closePreview() { $('#preview').hidden = true; }
$('#preview-close').addEventListener('click', closePreview); $('#preview-cancel').addEventListener('click', closePreview);
$('#preview').addEventListener('click', e => { if (e.target === $('#preview')) closePreview(); });
$('#preview-explain').addEventListener('click', async () => {
  const b = $('#preview-explain'); b.disabled = true; b.textContent = 'Explaining…';
  try {
    const r = await (await api('/api/explain', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirm: true }) })).json();
    closePreview(); await loadState(); view = 'chapters'; await loadView();
    toast(r.cacheHit ? 'cached explanation · $0 · 0 new calls' : `explained · ${r.cost.reported ? money(r.cost.usd) : 'cost not reported'} · 1 call${r.warnings.length ? ` · ${r.warnings.length} claims withheld` : ''}`);
  } catch (e) { toast(e.body?.error || e.message); }
  b.disabled = false;
});

document.querySelectorAll('.level').forEach(b => b.addEventListener('click', () => setLevel(Number(b.dataset.level))));
document.querySelectorAll('.view').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
$('#focus').addEventListener('change', e => { focus = e.target.value || null; loadSketch(); });
$('#theme').addEventListener('click', cycleTheme);
$('#recapture').addEventListener('click', async () => { toast('capturing…'); try { const r = await (await api('/api/snapshot', { method: 'POST' })).json(); await loadState(); await loadView(); toast(r.unchanged ? `unchanged · ${r.timings.totalMs} ms · 0 model calls` : `new snapshot · ${r.timings.totalMs} ms · 0 model calls`); } catch (e) { toast(e.message); } });
addEventListener('keydown', e => {
  if (e.target.matches('input,select,textarea,button') && e.key !== 'Escape') return;
  if (e.key === 'Escape') { closePreview(); $('#cite').hidden = true; return; }
  if (/^[1-4]$/.test(e.key)) setLevel(Number(e.key) - 1); else if (e.key === 't') cycleTheme(); else if (e.key === 'r') $('#recapture').click(); else if (e.key === 's') setView('sketch'); else if (e.key === 'c') setView('chapters'); else if (e.key === 'm') setView('mermaid');
});

await loadState();
focus = state?.modules?.[0]?.id ?? null;
if (location.hash === '#chapters' && state?.explain?.has) { view = 'chapters'; loadView(); } else setLevel(1);
