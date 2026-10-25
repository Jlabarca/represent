// trazo viewer: dial, themes, status strip. Reads only its own loopback API with the injected token.
const token = document.querySelector('meta[name="trazo-token"]')?.content ?? '';
const $ = s => document.querySelector(s);
const headers = { authorization: `Bearer ${token}` };
let level = 1, focus = null, state = null;
const THEMES = ['light', 'dark', 'mono'];

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 1800); }
function theme(next) {
  const root = document.documentElement;
  if (next) { root.dataset.theme = next; try { localStorage.setItem('trazo.theme', next); } catch {} }
  return root.dataset.theme || '';
}
function cycleTheme() { const cur = theme() || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); theme(THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length]); toast(`theme: ${theme()}`); }
try { const saved = localStorage.getItem('trazo.theme'); if (THEMES.includes(saved)) theme(saved); } catch {}

async function api(path, init = {}) { const r = await fetch(path, { ...init, headers: { ...headers, ...(init.headers || {}) } }); if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText); return r; }

function renderState() {
  const s = state; if (!s) return;
  $('#project-name').textContent = s.name;
  $('#project-rev').textContent = s.revision?.sha ? `${s.revision.sha.slice(0, 7)}${s.revision.dirty ? ' +dirty' : ''}` : 'no git';
  $('#project-chip').title = `${s.root}\n${s.revision?.branch ? `branch ${s.revision.branch}` : ''}`;
  const snap = s.snapshot;
  $('#read-list').innerHTML = snap ? [
    ['files', `${snap.files}${snap.truncated ? ' (capped)' : ''}`], ['size', `${(snap.bytes / 1024).toFixed(0)} KiB`], ['modules', s.summary.modules], ['commits', `${s.summary.commits}${s.summary.historyTruncated ? '+' : ''}`],
    ['mode', snap.mode === 'git' ? 'git-tracked text' : 'folder walk'], ['skipped', snap.skipped], ['captured', new Date(snap.capturedAt).toLocaleTimeString()],
  ].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('') : '';
  $('#calls').textContent = String(s.ledger?.calls ?? 0);
  $('#cost').textContent = `$${(s.ledger?.costUsd ?? 0).toFixed(2)}`;
  const t = s.timings || {};
  $('#timings').innerHTML = Object.entries(t).map(([k, v]) => `<dt>${k.replace('Ms', '')}</dt><dd>${v} ms</dd>`).join('');
  $('#summary').textContent = s.summary?.sentence || '';
  const sel = $('#focus'); const prev = sel.value;
  sel.innerHTML = s.modules.map(m => `<option value="${m.id}">${m.label} · ${m.files}</option>`).join('');
  if ([...sel.options].some(o => o.value === prev)) sel.value = prev; else focus = sel.value || null;
}

async function loadState() { state = await (await api('/api/state')).json(); renderState(); }
async function loadSketch() {
  const el = $('#sketch'); el.setAttribute('aria-busy', 'true');
  const q = new URLSearchParams({ level: String(level) }); if (level === 3 && focus) q.set('focus', focus);
  const t0 = performance.now();
  try {
    const r = await api(`/api/sketch?${q}`);
    const svg = await r.text();
    el.innerHTML = svg;
    const ms = r.headers.get('x-trazo-render-ms');
    $('#render-ms').textContent = `render ${ms} ms · shown in ${(performance.now() - t0).toFixed(0)} ms`;
    if (level === 3 && state?.symbols !== 'ready') await loadState();
  } catch (e) { el.innerHTML = `<div class="empty">${e.message}</div>`; }
  el.removeAttribute('aria-busy');
}
function setLevel(n) {
  level = Math.max(0, Math.min(3, n));
  document.querySelectorAll('.level').forEach(b => b.setAttribute('aria-checked', String(Number(b.dataset.level) === level)));
  $('#focus-wrap').hidden = level !== 3;
  loadSketch();
}
document.querySelectorAll('.level').forEach(b => b.addEventListener('click', () => setLevel(Number(b.dataset.level))));
$('#focus').addEventListener('change', e => { focus = e.target.value || null; loadSketch(); });
$('#theme').addEventListener('click', cycleTheme);
$('#recapture').addEventListener('click', async () => { toast('capturing…'); try { const r = await (await api('/api/snapshot', { method: 'POST' })).json(); await loadState(); await loadSketch(); toast(r.unchanged ? `unchanged · ${r.timings.totalMs} ms · 0 model calls` : `new snapshot · ${r.timings.totalMs} ms · 0 model calls`); } catch (e) { toast(e.message); } });
addEventListener('keydown', e => { if (e.target.matches('input,select,textarea')) return; if (/^[1-4]$/.test(e.key)) setLevel(Number(e.key) - 1); else if (e.key === 't') cycleTheme(); else if (e.key === 'r') $('#recapture').click(); });

await loadState();
focus = state?.modules?.[0]?.id ?? null;
setLevel(1);
