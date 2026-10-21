const $ = (id) => document.getElementById(id);
const token = window.ALEGOR_TOKEN;
const state = { projects: [], project: null, snapshots: [], current: null, baseline: null, brief: null };
const headers = { Authorization: `Bearer ${token}` };

function node(tag, className, content) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (content !== undefined) el.textContent = content;
  return el;
}

async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { ...headers, ...(options.headers ?? {}) } });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? `Request failed (${response.status}).`);
  return payload;
}

function showStatus(message, kind = '') {
  const el = $('capture-status');
  el.textContent = message;
  el.dataset.kind = kind;
}

function formatDate(iso) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

function lineButton(path, line) {
  const button = node('button', 'evidence-link', `${path}:${line}`);
  button.type = 'button';
  button.dataset.path = path;
  button.dataset.line = String(line);
  button.addEventListener('click', () => openEvidence(path, line));
  return button;
}

function openEvidence(path, line) {
  const drawer = $('evidence-drawer');
  drawer.open = true;
  const target = document.getElementById(`e-${encodeURIComponent(path)}-${line}`);
  target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (target) {
    target.classList.add('highlight');
    window.setTimeout(() => target.classList.remove('highlight'), 1800);
  }
}

function card(title, icon, caption = '') {
  const article = node('section', 'card');
  const heading = node('div', 'card-heading');
  heading.append(node('span', 'card-icon', icon), node('h2', '', title));
  article.append(heading);
  if (caption) article.append(node('p', 'card-caption', caption));
  return { article, body: article };
}

function appendSources(parent, item) {
  if (item.path && Number.isInteger(item.line)) {
    parent.append(document.createTextNode(' '));
    parent.append(lineButton(item.path, item.line));
  }
}

function renderEvents(parent, brief) {
  if (brief.rangeStatus === 'unavailable') {
    const notice = node('div', 'range-unavailable', `Change range unavailable · ${brief.rangeNote}`);
    notice.setAttribute('role', 'status');
    parent.append(notice);
  }
  if (brief.snapshot?.dirtyState?.complete === false) {
    const notice = node('div', 'range-unavailable', brief.snapshot.dirtyState.note || 'Some changed-file contents were not hashed; local change detail may be incomplete.');
    notice.setAttribute('role', 'status');
    parent.append(notice);
  }
  const list = node('ul', 'event-list');
  const commits = brief.observed.commits;
  if (!commits.length && !brief.observed.worktreeChanges.length) {
    const empty = node('p', 'no-evidence', brief.rangeStatus === 'unavailable' ? 'Alegor cannot verify whether this checkpoint changed from the selected baseline.' : brief.baseline ? 'No Git or worktree change is recorded since this checkpoint.' : 'This checkpoint is the first saved view of the project.');
    parent.append(empty);
    return;
  }
  for (const commit of commits.slice(0, 10)) {
    const li = node('li', 'event-item');
    li.append(node('time', 'event-date', commit.date ? commit.date.slice(0, 10) : 'Git'));
    const text = node('div');
    const title = node('div', 'event-subject', commit.subject);
    title.title = `${commit.sha.slice(0, 10)} · observed commit subject`;
    text.append(title);
    const paths = (commit.paths ?? []).slice(0, 4);
    if (paths.length) text.append(node('div', 'event-paths', `${paths.join(' · ')}${commit.paths.length > paths.length ? ` · +${commit.paths.length - paths.length} more` : ''}`));
    li.append(text);
    list.append(li);
  }
  const localChanges = brief.observed.worktreeChanges;
  for (const change of localChanges.slice(0, 5)) {
    const li = node('li', 'event-item');
    li.append(node('span', 'event-date', 'Local'));
    const content = node('div');
    const code = change.after === 'clean' ? '' : change.after.slice(0, 2).trim();
    const stateLabel = change.after === 'clean' ? 'No longer modified' : code === '??' ? 'Untracked' : code.includes('D') ? 'Deleted' : code.includes('A') ? 'Added' : 'Modified';
    content.append(node('div', 'event-subject', `${stateLabel} · ${change.path}`));
    const fingerprint = change.after.match(/:([\da-f]{64})$/i)?.[1];
    if (fingerprint) {
      const detail = document.createElement('details');
      detail.className = 'fingerprint-detail';
      detail.append(node('summary', '', 'Content fingerprint'));
      detail.append(node('code', '', fingerprint));
      content.append(detail);
    }
    li.append(content);
    list.append(li);
  }
  if (localChanges.length > 5) {
    const li = node('li', 'more-row');
    const detail = document.createElement('details');
    detail.append(node('summary', '', `Show ${localChanges.length - 5} more local changes`));
    const more = node('ul', 'event-list');
    for (const change of localChanges.slice(5, 30)) {
      const row = node('li', 'event-item');
      const code = change.after === 'clean' ? '' : change.after.slice(0, 2).trim();
      row.append(node('span', 'event-date', 'Local'), node('div', 'event-subject', `${code === '??' ? 'Untracked' : code.includes('D') ? 'Deleted' : 'Modified'} · ${change.path}`));
      more.append(row);
    }
    detail.append(more);
    li.append(detail);
    list.append(li);
  }
  parent.append(list);
}

function renderResume(parent, brief) {
  const renderItem = (item, destination) => {
    const box = node('div', 'resume-callout');
    const text = item.text.replace(/^\s*[-*+]\s+\[ \]\s*/, '').replace(/^\s*[-*+]\s+\[[xX]\]\s*/, '');
    box.append(node('p', item.type === 'unknown' ? 'no-evidence' : '', text));
    if (item.type === 'unknown') box.append(node('p', 'no-evidence', 'Alegor will leave the next step unanswered until the project records one.'));
    appendSources(box, item);
    destination.append(box);
  };
  brief.next.slice(0, 4).forEach((item) => renderItem(item, parent));
  if (brief.next.length > 4) {
    const more = document.createElement('details');
    more.className = 'more-claims';
    more.append(node('summary', '', `Show ${brief.next.length - 4} more next steps`));
    brief.next.slice(4).forEach((item) => renderItem(item, more));
    parent.append(more);
  }
}

function renderClaims(parent, claims, empty) {
  if (!claims.length) { parent.append(node('p', 'no-evidence', empty)); return; }
  const visible = [];
  const tableHeaders = new Map();
  for (let i = 0; i < claims.length; i++) {
    const item = claims[i];
    const cells = item.text.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
    const next = claims[i + 1];
    const nextCells = next?.text.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim()) ?? [];
    if (cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
    if (cells.length > 1 && nextCells.length === cells.length && nextCells.every((cell) => /^:?-{3,}:?$/.test(cell))) {
      tableHeaders.set(item.path, cells);
      continue;
    }
    const headers = tableHeaders.get(item.path);
    const displayText = cells.length > 1 && headers?.length === cells.length
      ? cells.map((value, index) => `${headers[index]}: ${value}`).join(' · ')
      : item.text;
    visible.push({ ...item, displayText });
  }
  const renderOne = (item, list) => {
    const box = node('article', 'claim');
    const head = node('div', 'claim-head');
    head.append(node('span', '', item.path ?? 'Project record'), node('span', `status-chip${item.type === 'unknown' ? ' unknown' : ''}`, item.status ?? item.type ?? 'source'));
    box.append(head, node('p', '', item.displayText));
    appendSources(box, item);
    list.append(box);
  };
  const list = node('div', 'claim-list');
  visible.slice(0, 5).forEach((item) => renderOne(item, list));
  parent.append(list);
  if (visible.length > 5) {
    const more = document.createElement('details');
    more.className = 'more-claims';
    more.append(node('summary', '', `Show ${visible.length - 5} more statements`));
    const moreList = node('div', 'claim-list');
    visible.slice(5).forEach((item) => renderOne(item, moreList));
    more.append(moreList);
    parent.append(more);
  }
}

function renderBrief() {
  const root = $('brief');
  root.replaceChildren();
  if (!state.brief) { root.append(node('p', 'loading', 'Choose a saved checkpoint to see the project re-entry brief.')); return; }
  const brief = state.brief;
  const main = node('div', 'brief-main');
  const side = node('div', 'brief-side');
  const changed = card('What changed', '↗', brief.rangeStatus === 'unavailable' ? 'The selected baseline is outside the captured history or on a different branch.' : brief.baseline ? `Observed since ${brief.baseline.head.slice(0, 8)} · ${brief.observed.commits.length} commits` : 'Recent recorded activity · commit titles describe changes, not why they happened');
  renderEvents(changed.body, brief);
  main.append(changed.article);
  const resume = card('Where to resume', '→', 'Next steps come from the project’s own open checklist items.');
  renderResume(resume.body, brief);
  side.append(resume.article);
  const declared = card('Project state', '“', 'Statements copied from current project notes, with their source lines.');
  renderClaims(declared.body, brief.declared, 'No current-state note was found in the selected documents.');
  main.append(declared.article);
  const complete = card('Recently marked complete', '✓', 'Declared checklist status; Alegor does not verify completion.');
  renderClaims(complete.body, brief.completed, 'No recent completed checklist statements were selected.');
  side.append(complete.article);
  if (brief.conflicts.length) {
    const review = card('Possible disagreement', '!', 'Matching checklist text has different status markers. Review both citations before deciding.');
    review.article.classList.add('conflict');
    for (const conflict of brief.conflicts) {
      renderClaims(review.body, conflict.evidence, conflict.label);
    }
    side.append(review.article);
  }
  root.append(main, side);
  $('revision-label').textContent = `${brief.snapshot.revision.slice(0, 12)} · ${brief.evidence.selectedBytes.toLocaleString()} doc bytes reviewed`;
  renderEvidence(brief);
}

function renderEvidence(brief) {
  const root = $('evidence-list');
  root.replaceChildren();
  const docs = brief.evidence?.documents ?? [];
  $('evidence-count').textContent = `${docs.length} ${docs.length === 1 ? 'file' : 'files'}`;
  for (const doc of docs) {
    const section = node('section', 'doc-evidence');
    section.id = `doc-${encodeURIComponent(doc.path)}`;
    section.append(node('div', 'doc-title', `${doc.path} · captured source`));
    for (const excerpt of doc.excerpts ?? []) for (const line of excerpt.lines ?? []) {
      const row = node('div', 'doc-line');
      row.id = `e-${encodeURIComponent(doc.path)}-${line.line}`;
      row.append(node('span', 'line-no', String(line.line)), node('span', '', line.text));
      section.append(row);
    }
    if (!doc.excerpts?.length) section.append(node('p', 'no-evidence', 'No current state excerpt selected from this document.'));
    root.append(section);
  }
}

function renderTimeline() {
  const timeline = $('timeline');
  timeline.replaceChildren();
  $('empty-state').hidden = state.snapshots.length > 0;
  $('timeline-title').textContent = state.project ? `${state.project.name} timeline` : 'Project timeline';
  const baseline = $('baseline-select');
  const previousBaseline = baseline.value;
  baseline.replaceChildren();
  const latestOption = document.createElement('option');
  latestOption.value = '';
  latestOption.textContent = 'Latest available context';
  baseline.append(latestOption);
  for (const snapshot of state.snapshots) {
    const opt = document.createElement('option');
    opt.value = snapshot.id;
    opt.textContent = `${formatDate(snapshot.generatedAt)} · ${snapshot.git.head.slice(0, 8)}`;
    baseline.append(opt);
  }
  baseline.value = state.snapshots.some((item) => item.id === previousBaseline) ? previousBaseline : '';
  for (const snapshot of [...state.snapshots].reverse()) {
    const button = node('button', 'snapshot');
    button.type = 'button';
    button.setAttribute('role', 'listitem');
    button.setAttribute('aria-current', String(snapshot.id === state.current));
    button.append(node('span', 'snapshot-mark', `◉ ${snapshot.git.branch}`));
    button.append(node('strong', '', formatDate(snapshot.generatedAt)));
    button.append(node('span', '', `${snapshot.git.head.slice(0, 8)} · ${snapshot.git.status.length} local changes`));
    if (snapshot.id === baseline.value) button.append(node('span', 'status-chip', 'compare point'));
    button.addEventListener('click', () => { state.current = snapshot.id; refreshBrief(); });
    timeline.append(button);
  }
}

async function refreshBrief() {
  if (!state.project || !state.current) { state.brief = null; renderBrief(); return; }
  try {
    const baseline = $('baseline-select').value;
    const path = `/api/projects/${encodeURIComponent(state.project.id)}/brief?current=${encodeURIComponent(state.current)}${baseline ? `&baseline=${encodeURIComponent(baseline)}` : ''}`;
    const { brief } = await api(path);
    state.brief = brief;
    const snap = state.snapshots.find((item) => item.id === state.current);
    $('branch-label').textContent = snap?.git.branch ?? 'Branch unknown';
    $('head-label').textContent = snap ? snap.git.head.slice(0, 12) : '';
    $('project-dot').style.background = state.project.color;
    renderTimeline();
    renderBrief();
    showStatus(snap ? `Saved ${formatDate(snap.generatedAt)}` : '', 'ok');
  } catch (error) { showStatus(error.message, 'error'); }
}

async function loadProject(projectId) {
  state.project = state.projects.find((item) => item.id === projectId) ?? null;
  state.current = null;
  state.baseline = null;
  state.brief = null;
  if (!state.project) return;
  document.documentElement.style.setProperty('--project-accent', state.project.color);
  $('project-dot').style.background = state.project.color;
  showStatus('Loading saved checkpoints…');
  const { snapshots } = await api(`/api/projects/${encodeURIComponent(state.project.id)}/snapshots`);
  state.snapshots = snapshots;
  state.current = snapshots.at(-1)?.id ?? null;
  renderTimeline();
  if (state.current) await refreshBrief();
  else {
    $('branch-label').textContent = 'No snapshot captured yet';
    $('head-label').textContent = '';
    renderBrief();
    renderEvidence({ snapshot: { id: '' } });
    showStatus('Capture once to start a project history.');
  }
}

async function captureNow() {
  if (!state.project) return;
  const button = $('capture-button');
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  showStatus('Reading the configured project…');
  try {
    const { snapshot } = await api(`/api/projects/${encodeURIComponent(state.project.id)}/capture`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const { snapshots } = await api(`/api/projects/${encodeURIComponent(state.project.id)}/snapshots`);
    state.snapshots = snapshots;
    state.current = snapshot.id;
    await refreshBrief();
    showStatus(snapshot.reused ? 'No changes found · existing snapshot reused.' : `Snapshot saved · ${snapshot.git.head.slice(0, 8)}.`, 'ok');
  } catch (error) { showStatus(error.message, 'error'); }
  finally { button.disabled = false; button.removeAttribute('aria-busy'); }
}

async function init() {
  const storedTheme = localStorage.getItem('alegor-theme');
  if (storedTheme) document.documentElement.dataset.theme = storedTheme;
  $('theme-toggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('alegor-theme', next);
  });
  $('capture-button').addEventListener('click', captureNow);
  $('baseline-select').addEventListener('change', refreshBrief);
  const { projects } = await api('/api/projects');
  state.projects = projects;
  const select = $('project-select');
  for (const project of projects) {
    const option = document.createElement('option');
    option.value = project.id;
    option.textContent = project.name;
    select.append(option);
  }
  select.addEventListener('change', () => loadProject(select.value).catch((error) => showStatus(error.message, 'error')));
  if (projects.length) await loadProject(projects[0].id);
}

init().catch((error) => { showStatus(error.message, 'error'); $('brief').replaceChildren(node('p', 'loading', error.message)); });
