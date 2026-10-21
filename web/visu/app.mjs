const token = window.VISU_TOKEN || '';
const $ = (s, root = document) => root.querySelector(s);
const state = { projects: [], bundle: null, projectId: null, selectedViewId: null, selectedRegionId: null, page: 'overview', imageUrl: null, imageRequest: 0, thumbUrls: [], suppressNextPinFocus: false, busy: false, style: 'auto' };
const esc = (v) => String(v ?? '');
const api = async (path, options = {}) => {
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (options.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(path, { ...options, headers });
  if (!response.ok) throw new Error((await response.text()).slice(0, 400) || `${response.status} ${response.statusText}`);
  return response;
};
const json = async (path, options) => (await api(path, options)).json();
const projectPath = (suffix = '') => `/api/projects/${encodeURIComponent(state.projectId)}${suffix}`;
const currentView = () => state.bundle?.views?.find(v => v.id === state.selectedViewId) || null;
const snapshotFor = (id) => state.bundle?.snapshots?.find(s => s.id === id) || null;
const shortId = id => id ? String(id).slice(0, 8) : '—';
const dateLabel = value => { if (!value) return 'Date unknown'; const d = new Date(value); return Number.isNaN(+d) ? String(value) : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(d); };
function toast(message, error = false) { const el = $('#toast'); el.textContent = message; el.classList.toggle('error', error); el.classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('visible'), 4200); }
function setBusy(kind) { state.busy = Boolean(kind); for(const id of ['project-switch','style-select','export-button']) document.getElementById(id).disabled=state.busy; $('#scan-button').disabled = state.busy; $('#generate-button').disabled = state.busy || !state.bundle?.capabilities?.generateEnabled; $('#scan-button').innerHTML = kind === 'scan' ? '<span class="loader loader-small"></span> Scanning…' : '<span aria-hidden="true">⟳</span> Scan for changes'; $('#generate-button').innerHTML = kind === 'generate' ? '<span class="loader loader-small"></span> Creating…' : '<span aria-hidden="true">✳</span> Create overview'; $('#loading-art').hidden = kind !== 'generate'; }
function paintStyle() {
  const view = currentView(), snap = snapshotFor(view?.snapshotId) || state.bundle?.snapshots?.at(-1), style = view?.style || snap?.style || {};
  const profile = style.profile || 'neutral'; document.body.dataset.style = profile;
  const confidence = style.confidence ? ` · ${style.confidence} confidence` : '';
  $('#style-title').textContent = `${profile[0]?.toUpperCase()}${profile.slice(1)} direction${confidence}`;
  const signals = style.signals || [];
  $('#style-evidence').textContent = signals.length ? signals.slice(0, 3).map(s => `${s.path}${s.line ? `:${s.line}` : ''} — ${s.reason}`).join(' · ') : 'A neutral base keeps the overview readable while style evidence is gathered.';
  state.style = state.bundle?.styleOverride || 'auto'; $('#style-select').value = state.style;
}
function paintHeader() {
  const b = state.bundle, p = b.project, view = currentView(), snap = snapshotFor(view?.snapshotId);
  $('#project-name').textContent = p.name; $('#project-description').textContent = p.description || 'A living portrait of this project.';
  $('#snapshot-count').textContent = String(b.snapshots?.length || 0);
  $('#snapshot-label').textContent = snap ? `Snapshot ${shortId(snap.id)} · ${dateLabel(snap.createdAt)}` : 'No source snapshot yet';
  const fresh = view?.freshness || 'missing'; const f = $('#freshness'); f.className = `freshness ${fresh}`; f.textContent = fresh === 'fresh' ? 'Matches captured inputs' : fresh === 'stale' ? 'Overview needs refresh' : 'No overview yet';
  $('#generate-button').disabled = state.busy || !b.capabilities?.generateEnabled;
  if (!b.capabilities?.generateEnabled && b.capabilities?.message) $('#generate-button').title = b.capabilities.message;
  const ledger = b.ledger || [], latestRun = [...ledger].reverse().find(item => item.status === 'success' || item.status === 'succeeded');
  $('#activity-text').textContent = latestRun ? `Latest image run · ${latestRun.model || 'model unknown'} · ${latestRun.costUsd == null ? 'cost unknown' : `$${Number(latestRun.costUsd).toFixed(4)}`} · ${latestRun.durationMs == null ? 'duration unknown' : `${(latestRun.durationMs / 1000).toFixed(1)}s`}${latestRun.cacheHit ? ' · cache hit' : ''}` : 'Snapshots stay local. Generation sends selected evidence through Ghost.';
  paintStyle();
  const usage=$('#usage-records');usage.replaceChildren();
  const scope=document.createElement('p');scope.textContent=`Selected scope: ${p.scope.map(s=>`${s.path} (${s.role})`).join(' · ')}`;usage.append(scope);
  for(const row of b.ledger||[]){const line=document.createElement('p');line.textContent=`${dateLabel(row.at)} · ${row.stage||'image'} · ${row.model} · ${row.status} · ${typeof row.costUsd==='number'?`$${row.costUsd.toFixed(6)}`:'cost unknown'} · ${row.durationMs?`${(row.durationMs/1000).toFixed(1)}s`:'duration unknown'}`;usage.append(line);}
}
async function loadImage() {
  const view = currentView(), img = $('#art-image'), placeholder = $('#art-placeholder'), requestId = ++state.imageRequest;
  if (state.imageUrl) URL.revokeObjectURL(state.imageUrl); state.imageUrl = null; img.hidden = true; img.removeAttribute('src');
  if (!view?.art?.url) { placeholder.hidden = false; return; }
  placeholder.hidden = false;
  try { const res = await api(view.art.url); const blob = await res.blob(); if (requestId !== state.imageRequest) return; state.imageUrl = URL.createObjectURL(blob); img.src = state.imageUrl; img.hidden = false; placeholder.hidden = true; }
  catch (e) { toast(`Could not load overview art: ${e.message}`, true); }
}
function regionButton(region, index, selected) {
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = `pin ${selected ? 'selected' : ''}`; const x = region.x == null ? [22, 45, 70, 32, 62, 82][index % 6] / 100 : Number(region.x) * 100; const y = region.y == null ? [27, 62, 38, 78, 72, 17][index % 6] / 100 : Number(region.y) * 100; btn.style.left = `${Math.min(96, Math.max(4, x))}%`; btn.style.top = `${Math.min(94, Math.max(6, y))}%`;
  btn.setAttribute('aria-label', `${region.label || 'Region'}: ${region.summary || 'Open details'}`); btn.setAttribute('aria-pressed', String(selected)); btn.dataset.regionId = region.id; btn.textContent = String(index + 1).padStart(2, '0');
  if($('#progress-toggle').checked&&region.progress?.length){const progress=document.createElement('small');progress.className='pin-progress';progress.textContent=region.progress.map(p=>`${p.done}/${p.total} checklist`).join(' · ');btn.append(progress);}
  btn.addEventListener('focus', () => { if (state.suppressNextPinFocus) { state.suppressNextPinFocus = false; return; } showRegion(region.id, false); }); btn.addEventListener('mouseenter', () => showRegion(region.id, false)); btn.addEventListener('click', () => showRegion(region.id, true)); return btn;
}
function paintPins() {
  const pins = $('#pins'); pins.replaceChildren(); const regions = currentView()?.regions || [];
  const hasArt = Boolean(currentView()?.art?.url); pins.hidden = !hasArt; $('#art-frame').classList.toggle('has-regions', hasArt && regions.length > 0);
  regions.slice(0, 12).forEach((region, i) => pins.append(regionButton(region, i, region.id === state.selectedRegionId)));
}
function sourceCard(source) {
  const card = document.createElement('details'); card.className = 'source-card';
  const label = document.createElement('summary'); label.textContent = `${esc(source.path)}${source.startLine ? ` · line ${source.startLine}${source.endLine && source.endLine !== source.startLine ? `–${source.endLine}` : ''}` : ''}`;
  const excerpt = document.createElement('p'); excerpt.textContent = source.text || 'Captured source location'; card.append(label, excerpt); return card;
}
function showRegion(id, focusPanel = false) {
  const region = currentView()?.regions?.find(r => r.id === id); if (!region) return;
  state.selectedRegionId = id; $('#pins').querySelectorAll('.pin').forEach(pin => { const selected = pin.dataset.regionId === id; pin.classList.toggle('selected', selected); pin.setAttribute('aria-pressed', String(selected)); }); const box = $('#inspector-content'); box.replaceChildren(); box.hidden = false; $('.inspector-empty').hidden = true;
  const close = document.createElement('button'); close.type = 'button'; close.className = 'inspector-close icon-button'; close.setAttribute('aria-label', 'Close region details'); close.textContent = '×'; close.addEventListener('click', () => closeInspector(true));
  const num = currentView().regions.indexOf(region) + 1; const eyebrow = document.createElement('span'); eyebrow.className = 'eyebrow'; eyebrow.textContent = `REGION ${String(num).padStart(2, '0')}`;
  const title = document.createElement('h2'); title.textContent = region.label || 'Project region'; const summary = document.createElement('p'); summary.className = 'region-summary'; summary.textContent = region.summary || 'No short explanation has been recorded.';
  const status = document.createElement('span'); status.className = `status-chip ${String(region.status || 'observed').toLowerCase().replace(/[^a-z0-9-]/g, '-')}`; status.textContent = region.status || 'Status unknown';
  const detail = document.createElement('p'); detail.className = 'region-detail'; detail.textContent = region.detail || 'No additional technical detail was captured for this region.';
  const sourcesTitle = document.createElement('h3'); sourcesTitle.className = 'source-title'; sourcesTitle.textContent = `Evidence · ${region.sources?.length || 0}`;
  const sources = document.createElement('div'); sources.className = 'source-list'; (region.sources || []).forEach(s => sources.append(sourceCard(s)));
  const origin=document.createElement('p');origin.className='region-detail';origin.textContent=region.summaryOrigin||'Saved editorial interpretation';
  const citations=document.createElement('div');
  for(const e of region.storyEvidence||[]){const c=document.createElement('details');c.className='source-card';const s=document.createElement('summary');s.textContent=`Summary evidence · ${e.path}:${e.startLine||1}`;const q=document.createElement('p');q.textContent=e.quote;c.append(s,q);citations.append(c);}
  const progress=document.createElement('p');progress.className='region-detail';progress.textContent=(region.progress||[]).map(p=>`${p.done} of ${p.total} captured checklist items checked in ${p.path}. This is a selected excerpt, not overall project completion.`).join(' ');
  box.append(close, eyebrow, title, summary, status, detail, progress, origin, citations, sourcesTitle, sources); if (focusPanel) close.focus();
}
function closeInspector(returnFocus = false) { const previous = state.selectedRegionId; state.selectedRegionId = null; $('#inspector-content').hidden = true; $('.inspector-empty').hidden = false; $('#pins').querySelectorAll('.pin').forEach(pin => { pin.classList.remove('selected'); pin.setAttribute('aria-pressed', 'false'); }); if (returnFocus && previous) { const pin = [...$('#pins').querySelectorAll('.pin')].find(el => el.dataset.regionId === previous); if (pin) { state.suppressNextPinFocus = true; pin.focus(); } } }
function paintOverview() {
  const view = currentView(); paintHeader(); paintPins(); loadImage();
  if (state.selectedRegionId && view?.regions?.some(r => r.id === state.selectedRegionId)) showRegion(state.selectedRegionId, false); else closeInspector();
  const hasArt = Boolean(view?.art?.url); $('#art-status').textContent = view?.freshness === 'stale' ? 'This portrait reflects an earlier snapshot' : hasArt ? `Portrait · ${shortId(view.art.sourceSnapshotId || view.snapshotId)}` : '';
  $('#art-caption-text').textContent = view?.regions?.length ? 'Region markers are navigation aids. Evidence and source lines live in the detail panel.' : 'The picture is a guide; scan the project to prepare its evidence layer.';
  paintOutline();
}
function paintOutline() {
  const list = $('#outline-list'); list.replaceChildren(); const regions = currentView()?.regions || [];
  if (!regions.length) { const p = document.createElement('p'); p.textContent = 'No regions have been prepared yet. Scan the project, then create an overview.'; list.append(p); return; }
  regions.forEach((r, i) => { const row = document.createElement('button'); row.type = 'button'; row.className = 'outline-row'; const n = document.createElement('span'); n.className = 'outline-number'; n.textContent = String(i + 1).padStart(2, '0'); const copy = document.createElement('span'); copy.className = 'outline-copy'; const b = document.createElement('b'); b.textContent = r.label || 'Project region'; const p = document.createElement('small'); p.textContent = r.summary || ''; copy.append(b, p); const arrow = document.createElement('span'); arrow.textContent = '↗'; row.append(n, copy, arrow); row.addEventListener('click', () => { $('#outline').hidden = true; showRegion(r.id, true); }); list.append(row); });
}
function paintHistory() {
  const b = state.bundle, timeline = $('#timeline'); timeline.replaceChildren(); state.thumbUrls.forEach(url => URL.revokeObjectURL(url)); state.thumbUrls = []; const views = [...(b.views || [])].sort((a, c) => new Date(c.createdAt) - new Date(a.createdAt));
  const select = $('#compare-select'); select.replaceChildren(new Option('Choose a snapshot', ''));
  (b.snapshots || []).slice().sort((a, c) => new Date(c.createdAt) - new Date(a.createdAt)).forEach(s => { const option = new Option(`${dateLabel(s.createdAt)} · ${shortId(s.id)}`, s.id); select.add(option); });
  if (!b.snapshots?.length) { const p = document.createElement('p'); p.className = 'empty-history'; p.textContent = 'Your first scan will create an immutable source snapshot. New scans add a chapter only when project evidence changes.'; timeline.append(p); return; }
  b.snapshots.slice().sort((a, c) => new Date(c.createdAt) - new Date(a.createdAt)).forEach((snap, i) => {
    const candidates = views.filter(v => v.snapshotId === snap.id); const view = candidates.find(v => v.id === state.bundle.latestViewId) || candidates.find(v => v.art?.url) || candidates.at(-1); const item = document.createElement('article'); item.className = `timeline-item ${snap.id === currentView()?.snapshotId ? 'current' : ''}`;
    const dot = document.createElement('span'); dot.className = 'timeline-dot'; const card = document.createElement('button'); card.type = 'button'; card.className = 'snapshot-card'; card.setAttribute('aria-label', `Open snapshot ${dateLabel(snap.createdAt)}`);
    const art = document.createElement('span'); art.className = `snapshot-art ${snap.style?.profile || 'neutral'}`; if (view?.art?.hash) { const im = document.createElement('img'); im.alt = ''; im.dataset.authHash = view.art.hash; art.append(im); }
    const body = document.createElement('span'); body.className = 'snapshot-copy'; const date = document.createElement('b'); date.textContent = dateLabel(snap.createdAt); const desc = document.createElement('small'); desc.textContent = `${snap.classification || 'Source snapshot'} · ${snap.changedFiles?.length || 0} changed files`; const id = document.createElement('small'); id.textContent = `${shortId(snap.id)}${snap.gitRevision ? ` · ${shortId(snap.gitRevision)}` : ''}`; body.append(date, desc, id); card.append(art, body); card.addEventListener('click', () => selectSnapshot(snap.id)); item.append(dot, card); timeline.append(item);
    if (i === 0 && snap.id === b.latestSnapshotId) item.classList.add('latest');
  });
  timeline.querySelectorAll('img[data-auth-hash]').forEach(async img => { const hash = img.dataset.authHash; try { const r = await api(`/api/assets/${encodeURIComponent(hash)}`); const objectUrl = URL.createObjectURL(await r.blob()); if (!img.isConnected) { URL.revokeObjectURL(objectUrl); return; } state.thumbUrls.push(objectUrl); img.src = objectUrl; } catch { img.remove(); } });
  if (select.value) $('#compare-panel').hidden = true;
}
function selectSnapshot(snapshotId, preferredViewId = null) {
  const candidates = (state.bundle.views?.filter(v => v.snapshotId === snapshotId) || []).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); const view = candidates.find(v => v.id === preferredViewId) || candidates.find(v => v.id === state.bundle.latestViewId) || [...candidates].reverse().find(v => v.art?.url) || candidates.at(-1); if (!view) { toast('This source snapshot has no saved overview yet.'); return; }
  state.selectedViewId = view.id; state.selectedRegionId = null; paintOverview(); paintHistory(); $('#history-detail').replaceChildren();
  const card = document.createElement('div'); card.className = 'history-selected'; const eyebrow = document.createElement('span'); eyebrow.className = 'eyebrow'; eyebrow.textContent = 'SELECTED SNAPSHOT'; const h = document.createElement('h2'); h.textContent = dateLabel(snapshotFor(snapshotId)?.createdAt); const p = document.createElement('p'); p.textContent = `Snapshot ${shortId(snapshotId)} · ${view.freshness === 'stale' ? 'its overview is marked stale' : view.freshness === 'fresh' ? 'overview is up to date' : 'overview has not been generated'}.`;
  const open = document.createElement('button'); open.className = 'button button-quiet'; open.type = 'button'; open.textContent = 'Open this overview'; open.addEventListener('click', () => switchPage('overview')); card.append(eyebrow, h, p, open);
  if (candidates.length > 1) { const label = document.createElement('label'); label.className = 'revision-label'; label.textContent = 'Portrait revision'; const picker = document.createElement('select'); picker.className = 'revision-select'; candidates.forEach((candidate, index) => picker.add(new Option(`Revision ${index + 1} · ${dateLabel(candidate.createdAt)}`, candidate.id))); picker.value = view.id; picker.addEventListener('change', () => selectSnapshot(snapshotId, picker.value)); label.append(picker); card.append(label); }
  const changes = snapshotFor(snapshotId)?.changedFiles || []; const title = document.createElement('h3'); title.className = 'source-title'; title.textContent = `Changed paths · ${changes.length}`; const ul = document.createElement('ul'); ul.className = 'changed-list'; changes.forEach(f => { const li = document.createElement('li'); li.textContent = typeof f === 'string' ? f : `${f.status || 'changed'} · ${f.path}`; ul.append(li); }); card.append(title, ul); $('#history-detail').append(card); $('#compare-select').value = snapshotId; $('#compare-panel').hidden = true;
}
function paintCompare(snapshotId) {
  const panel = $('#compare-panel'); if (!snapshotId) { panel.hidden = true; return; }
  const selected = snapshotFor(snapshotId), latest = snapshotFor(state.bundle.latestSnapshotId); if (!selected || !latest) return;
  panel.replaceChildren(); const head = document.createElement('div'); head.className = 'compare-head'; const h = document.createElement('h3'); h.textContent = 'Source changes'; const p = document.createElement('p'); p.textContent = `${shortId(selected.id)} compared with latest ${shortId(latest.id)}. This is the recorded changed-path evidence, not a reconstructed line diff.`; head.append(h, p); panel.append(head);
  const before = selected.fileHashes || {}, after = latest.fileHashes || {}, paths = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort(); const changes = selected.id === latest.id ? [] : paths.filter(path => before[path] !== after[path]).map(path => ({ path, status: !(path in before) ? 'added' : !(path in after) ? 'removed' : 'changed' })); const ul = document.createElement('ul'); ul.className = 'changed-list'; changes.forEach(f => { const li = document.createElement('li'); li.textContent = `${f.status} · ${f.path}`; ul.append(li); }); if (!changes.length) { const none = document.createElement('p'); none.className = 'compare-empty'; none.textContent = selected.id === latest.id ? 'This is already the latest snapshot.' : 'No file hash differences are recorded between these snapshots.'; panel.append(none); } else panel.append(ul); panel.hidden = false;
}
function switchPage(page) { state.page = page; $('#overview-page').hidden = page !== 'overview'; $('#history-page').hidden = page !== 'history'; document.querySelectorAll('.tab').forEach(t => { const active = t.dataset.page === page; t.classList.toggle('active', active); if (active) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current'); }); }
function paintBundle(bundle, result = null) {
  state.bundle = bundle; state.selectedViewId = bundle.latestViewId || bundle.views?.at(-1)?.id || null; state.selectedRegionId = null;
  $('#welcome').hidden = true; $('#workspace').hidden = false; paintHeader(); paintOverview(); paintHistory();
  if (result) { const n = result.changedFiles?.length ?? result.metrics?.changedFiles ?? 0; toast(result.classification === 'unchanged' ? 'No source changes. Your overview and its cache are unchanged.' : `Scan complete · ${n} changed path${n === 1 ? '' : 's'}.`); }
}
async function openProject(id) { if(state.busy)return; const previous=state.projectId;state.projectId = id;$('#project-switch').value=id;switchPage('overview');setBusy('load'); try { const bundle=await json(projectPath());if(state.projectId===id)paintBundle(bundle); } catch (e) {state.projectId=previous;$('#project-switch').value=previous||'';toast(`Could not open project: ${e.message}`, true); }finally{setBusy(null);} }
async function refreshProjects() {
  try { const data = await json('/api/projects'); state.projects = data.projects || []; if (!state.projects.length) { $('#welcome').hidden = false; $('#workspace').hidden = true; $('#project-list').innerHTML = '<div class="empty-project"><span class="eyebrow">READY WHEN YOU ARE</span><h2>No projects connected</h2><p>Start the local Visu service with a configured project scope to see its first overview here.</p></div>'; return; }
    $('#project-switch').replaceChildren(new Option('Choose project',''));state.projects.forEach(p=>$('#project-switch').add(new Option(p.name,p.id)));
    if (state.projects.length === 1) return openProject(state.projects[0].id);
    $('#welcome').hidden = false; $('#workspace').hidden = true; const list = $('#project-list'); list.replaceChildren(); state.projects.forEach(p => { const button = document.createElement('button'); button.type = 'button'; button.className = 'project-choice'; const glyph = document.createElement('span'); glyph.className = 'project-glyph'; glyph.textContent = (p.name || 'P').slice(0, 1).toUpperCase(); const info = document.createElement('span'); info.className = 'project-choice-copy'; const b = document.createElement('b'); b.textContent = p.name; const small = document.createElement('small'); small.textContent = p.description || 'Open project'; info.append(b, small); button.append(glyph, info, document.createTextNode('↗')); button.addEventListener('click', () => openProject(p.id)); list.append(button); });
  } catch (e) { $('#welcome').hidden = false; $('#workspace').hidden = true; $('#project-list').innerHTML = '<div class="empty-project"><span class="eyebrow">LOCAL SERVICE</span><h2>Visu could not connect</h2><p>Keep this page open and check that the local Visu service is running.</p></div>'; toast(`Connection error: ${e.message}`, true); }
}
async function runScan() { setBusy('scan'); try { const b = await json(projectPath('/scan'), { method: 'POST', body: '{}' }); paintBundle(b, b.result); } catch (e) { toast(`Scan failed: ${e.message}`, true); } finally { setBusy(null); } }
async function runGenerate() { if (!state.bundle?.capabilities?.generateEnabled) return toast(state.bundle?.capabilities?.message || 'Image generation is not configured for this workspace.'); setBusy('generate'); try { const b = await json(projectPath('/generate'), { method: 'POST', body: '{}' }); paintBundle(b); toast('Overview updated. Its source snapshot and generation record are saved.'); } catch (e) { toast(`Generation failed. Your saved overview is unchanged. ${e.message}`, true); } finally { setBusy(null); } }
async function setStyle(profile) { if(state.busy)return;state.style = profile;setBusy('style');try { paintBundle(await json(projectPath('/style'), { method: 'POST', body: JSON.stringify({ profile }) })); toast(profile === 'auto' ? 'Using detected project style.' : `Using ${profile} direction.`); } catch (e) {$('#style-select').value=state.bundle?.styleOverride||'auto';toast(`Could not update visual direction: ${e.message}`, true); }finally{setBusy(null);} }
async function exportHistory() { try { const response = await api(projectPath('/export')); const data = await response.json(); const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${(state.bundle?.project?.name || 'represent').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-history.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast('Project history exported.'); } catch (e) { toast(`Export failed: ${e.message}`, true); } }
$('#scan-button').addEventListener('click', runScan); $('#generate-button').addEventListener('click', runGenerate); $('#export-button').addEventListener('click', exportHistory);
$('#project-switch').addEventListener('change',e=>{if(e.target.value)openProject(e.target.value);});
$('.brand').addEventListener('click',e=>{e.preventDefault();if(!state.busy)refreshProjects();});
$('#progress-toggle').addEventListener('change',paintPins);
$('#style-select').addEventListener('change', e => setStyle(e.target.value)); document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => switchPage(t.dataset.page)));
$('#outline-button').addEventListener('click', () => { $('#outline').hidden = !$('#outline').hidden; if (!$('#outline').hidden) $('#outline').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'nearest' }); }); $('#outline-close').addEventListener('click', () => $('#outline').hidden = true);
$('#compare-select').addEventListener('change', e => paintCompare(e.target.value)); $('#activity-action').addEventListener('click', () => toast('Visu reads only the configured paths. Details use captured evidence; opening them never calls AI.'));
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!$('#inspector-content').hidden) closeInspector(true); else if (!$('#outline').hidden) { $('#outline').hidden = true; $('#outline-button').focus(); } } });
window.addEventListener('beforeunload', () => { if (state.imageUrl) URL.revokeObjectURL(state.imageUrl); state.thumbUrls.forEach(url => URL.revokeObjectURL(url)); });
refreshProjects();
