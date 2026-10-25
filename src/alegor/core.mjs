import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, linkSync, mkdirSync, readFileSync, readdirSync, realpathSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { dirname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path';

export const SCHEMA = 'alegor.snapshot/v1';
const MAX_DOCS = 12;
const MAX_DOC_BYTES = 80_000;
const MAX_TOTAL_DOC_BYTES = 240_000;
const MAX_HISTORY_COMMITS = 40;
const MAX_DIRTY_FILES = 500;
const MAX_DIRTY_BYTES = 20_000_000;
const DOC_NAME = /^(readme|context|todo|backlog|logbook|changelog|contributing|project|architecture|roadmap)(\.[^.]+)?$|^[a-z0-9._-]*(?:-impl|-roadmap)\.md$/i;
const DENY = /(^|\/)(\.git|\.represent|\.alegor|node_modules|vendor|dist|build|coverage|\.next|\.venv|venv|\.idea|\.vscode|secrets?|credentials?)(\/|$)|(^|\/)(\.env[^/]*|id_rsa|.*\.(pem|key|p12|pfx))$/i;
const GIT_TIMEOUT_MS = 10_000;

export function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function defaultStoreDir(workspace) {
  if (process.env.REPRESENT_ALEGOR_STORE) return resolve(process.env.REPRESENT_ALEGOR_STORE);
  if (platform() === 'win32' && process.env.LOCALAPPDATA) return join(process.env.LOCALAPPDATA, 'Represent', 'alegor');
  if (platform() === 'darwin') return join(homedir(), 'Library', 'Application Support', 'Represent', 'alegor');
  return join(homedir(), '.local', 'share', 'represent', 'alegor');
}

function git(root, args, { maxBuffer = 8 * 1024 * 1024 } = {}) {
  return execFileSync('git', ['-C', root, ...args], {
    encoding: 'buffer', windowsHide: true, maxBuffer, timeout: GIT_TIMEOUT_MS, stdio: ['ignore', 'pipe', 'ignore'],
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0' },
  });
}

function text(buf) { return buf.toString('utf8').replace(/^\uFEFF/, ''); }
function nulList(buf) { return text(buf).split('\0').filter(Boolean); }

/** Library seam (Trazo): bounded first-parent history for a folder (repository root or subfolder), paths relative to the repository root. */
export function readHistory(root, { limit = MAX_HISTORY_COMMITS } = {}) {
  const folder = resolve(root);
  const n = Math.max(1, Math.min(limit, MAX_HISTORY_COMMITS));
  let top, head, branch, prefix;
  try {
    top = text(git(folder, ['rev-parse', '--show-toplevel'])).trim();
    prefix = text(git(folder, ['rev-parse', '--show-prefix'])).trim().replace(/\/$/, '');
    head = text(git(folder, ['rev-parse', 'HEAD'])).trim();
    branch = text(git(folder, ['branch', '--show-current'])).trim() || 'detached';
  } catch { return { git: false, head: null, branch: null, prefix: '', commits: [], truncated: false }; }
  const tokens = nulList(git(folder, ['log', '-n', String(n + 1), '--first-parent', '--date=iso-strict', '--format=%H%x09%ad%x09%s%x00', '--name-only', '-z', '--', '.']));
  const commits = []; let current = null;
  for (const raw of tokens) {
    const token = raw.replace(/^\r?\n/, '');
    if (/^[\da-f]{40,64}\t/.test(token)) { if (current) commits.push(current); const [sha, date, ...subject] = token.split('\t'); current = { sha, date, subject: subject.join('\t').slice(0, 240), paths: [] }; }
    else if (current && token && !isSensitivePath(token) && !hasHiddenSegment(token)) current.paths.push(token.replaceAll('\\', '/'));
  }
  if (current) commits.push(current);
  const truncated = commits.length > n; commits.length = Math.min(commits.length, n);
  let dirty = false; try { dirty = nulList(git(folder, ['status', '--porcelain=v1', '-z', '--', '.'])).length > 0; } catch {}
  return { git: true, top, prefix, head, branch, dirty, commits, truncated };
}

export function loadProjects(configPath) {
  const fullPath = resolve(configPath);
  const config = JSON.parse(readFileSync(fullPath, 'utf8'));
  if (!Array.isArray(config.projects) || config.projects.length === 0) throw new Error('Config needs a non-empty projects array.');
  const ids = new Set();
  return config.projects.map((project) => {
    if (!/^[a-z0-9][a-z0-9-]{0,47}$/i.test(project.id ?? '') || ids.has(project.id)) throw new Error(`Invalid or repeated project id: ${project.id}`);
    ids.add(project.id);
    if (typeof project.name !== 'string' || !project.name.trim()) throw new Error(`Project ${project.id} needs a name.`);
    if (typeof project.root !== 'string' || !isAbsolute(project.root)) throw new Error(`Project ${project.id} root must be an absolute path.`);
    const rootInput = resolve(project.root);
    assertNoSymlinkPath(rootInput);
    const root = realpathSync(rootInput);
    const color = /^#[\da-f]{6}$/i.test(project.color ?? '') ? project.color : '#5d7554';
    return { ...project, id: project.id, name: project.name.trim(), root, color };
  });
}

function assertNoSymlinkPath(path) {
  const parsed = parse(path);
  let cursor = parsed.root;
  for (const part of path.slice(parsed.root.length).split(sep).filter(Boolean)) {
    cursor = join(cursor, part);
    if (lstatSync(cursor).isSymbolicLink()) throw new Error(`Symlink or junction path is not allowed: ${cursor}`);
  }
}

function repoMetadata(root) {
  const top = realpathSync(resolve(text(git(root, ['rev-parse', '--show-toplevel'])).trim()));
  if (text(git(root, ['rev-parse', '--show-prefix'])).trim()) throw new Error(`Configured project root must be the Git repository root; subdirectory scopes are not supported yet: ${root}`);
  const head = text(git(top, ['rev-parse', 'HEAD'])).trim();
  const branch = text(git(top, ['branch', '--show-current'])).trim() || 'detached';
  const statusRaw = git(top, ['status', '--porcelain=v1', '-z', '--untracked-files=all']);
  const rows = nulList(statusRaw);
  const status = [];
  let dirtyFilesSeen = 0;
  let dirtyBytesHashed = 0;
  let dirtyStateIncomplete = false;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const code = row.slice(0, 2);
    let path = row.slice(3).replaceAll('\\', '/');
    let sourcePath = path;
    if (code.includes('R') || code.includes('C')) {
      const oldPath = (rows[++i] ?? '').replaceAll('\\', '/');
      path = `${oldPath} → ${sourcePath}`;
    }
    if (isSensitivePath(path) || isSensitivePath(sourcePath) || hasHiddenSegment(path) || hasHiddenSegment(sourcePath)) continue;
    let fileHash = null;
    try {
      const absolute = resolve(top, sourcePath);
      if (isWithin(top, absolute)) {
        assertNoSymlinkPath(absolute);
        if (!isWithin(top, realpathSync(absolute))) throw new Error('Path escaped project root.');
        const stat = lstatSync(absolute);
        if (stat.isFile()) {
          dirtyFilesSeen++;
          if (stat.size <= 2_000_000 && dirtyBytesHashed + stat.size <= MAX_DIRTY_BYTES && dirtyFilesSeen <= MAX_DIRTY_FILES) {
            fileHash = hash(readFileSync(absolute));
            dirtyBytesHashed += stat.size;
          } else dirtyStateIncomplete = true;
        }
      }
    } catch { /* deleted paths remain as status evidence without content */ }
    status.push({ code, path, hash: fileHash });
  }
  const logTokens = nulList(git(top, ['log', '-n', String(MAX_HISTORY_COMMITS + 1), '--first-parent', '--date=iso-strict', '--format=%H%x09%ad%x09%s%x00', '--name-only', '-z']));
  const commits = [];
  let currentCommit = null;
  for (const raw of logTokens) {
    const token = raw.replace(/^\r?\n/, '');
    if (/^[\da-f]{40,64}\t/.test(token)) {
      if (currentCommit) commits.push(currentCommit);
      const [sha, date, ...subject] = token.split('\t');
      currentCommit = { sha, date, subject: subject.join('\t').slice(0, 240), paths: [] };
    } else if (currentCommit && token && !isSensitivePath(token) && !hasHiddenSegment(token)) {
      currentCommit.paths.push(token.replaceAll('\\', '/'));
    }
  }
  if (currentCommit) commits.push(currentCommit);
  const historyTruncated = commits.length > MAX_HISTORY_COMMITS;
  commits.length = Math.min(commits.length, MAX_HISTORY_COMMITS);
  const remotes = text(git(top, ['remote', '-v'])).split(/\r?\n/).filter(Boolean).map((line) => line.split(/\s+/)[0]).filter(Boolean);
  return { root: top, head, branch, status, commits, historyTruncated, hasRemote: remotes.length > 0,
    dirtyState: { complete: !dirtyStateIncomplete, filesHashed: Math.min(dirtyFilesSeen, MAX_DIRTY_FILES), bytesHashed: dirtyBytesHashed,
      note: dirtyStateIncomplete ? 'Some changed-file contents were not hashed because the bounded dirty-worktree capture limit was reached.' : null } };
}

function isWithin(root, candidate) {
  const rel = relative(root, candidate);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}

function hasHiddenSegment(path) { return path.replaceAll('\\', '/').split('/').some((part) => part.startsWith('.')); }
function isSensitivePath(path) {
  const normalized = path.replaceAll('\\', '/');
  const name = normalized.split(' → ').at(-1).split('/').at(-1);
  return DENY.test(normalized) || /^(?:credentials?|secrets?|tokens?)(?:\.[^.]+)?$/i.test(name)
    || /(?:credentials?|private[_-]?key|secret|token)[_-]?(?:backup|dump|export)?\.(?:json|ya?ml|toml|txt|db|sqlite)$/i.test(name);
}

function discoverDocs(root) {
  const tracked = nulList(git(root, ['ls-files', '-z', '--cached', '--others', '--exclude-standard']));
  const ignoredTracked = new Set(nulList(git(root, ['ls-files', '-z', '-ci', '--exclude-standard'])).map((path) => path.replaceAll('\\', '/')));
  const eligible = tracked.map((path) => path.replaceAll('\\', '/'))
    .filter((path) => !isSensitivePath(path) && !hasHiddenSegment(path) && !/(^|\/)(impl|legacy|archive|archived|deprecated|history)(\/|$)/i.test(path) && !ignoredTracked.has(path) && DOC_NAME.test(path.split('/').at(-1)))
    .sort((a, b) => docScore(a) - docScore(b) || a.localeCompare(b));
  const chosen = [];
  let bytes = 0;
  for (const path of eligible) {
    if (chosen.length >= MAX_DOCS || bytes >= MAX_TOTAL_DOC_BYTES) break;
    const absolute = resolve(root, path);
    if (!isWithin(root, absolute)) continue;
    let content;
    try {
      assertNoSymlinkPath(absolute);
      if (!isWithin(root, realpathSync(absolute))) continue;
      const stat = lstatSync(absolute);
      if (!stat.isFile() || stat.size > MAX_DOC_BYTES || bytes + stat.size > MAX_TOTAL_DOC_BYTES) continue;
      const raw = readFileSync(absolute);
      if (raw.includes(0)) continue;
      content = raw.toString('utf8');
    } catch { continue; }
    const lines = content.split(/\r?\n/);
    const entry = { path, hash: hash(content), lineCount: lines.length, excerpts: selectExcerpts(path, lines) };
    chosen.push(entry);
    bytes += Buffer.byteLength(content);
  }
  return { docs: chosen, candidates: eligible.length, bytes };
}

function docScore(path) {
  const name = path.split('/').at(-1).toLowerCase();
  const depth = path.split('/').length;
  const priority = name.startsWith('context') ? 0 : name.startsWith('todo') ? 1 : name.endsWith('-impl.md') ? 2 : name.startsWith('readme') ? 3 : name.startsWith('roadmap') ? 4 : name.startsWith('backlog') ? 5 : name.startsWith('project') ? 6 : name.startsWith('architecture') ? 7 : name.startsWith('contributing') ? 8 : name.startsWith('changelog') ? 9 : name.startsWith('logbook') ? 10 : 11;
  return priority * 20 + depth;
}

function selectExcerpts(path, lines) {
  const ranges = [];
  const selected = new Set();
  const baseName = path.split('/').at(-1).toLowerCase();
  const headingStack = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
    let sectionBlocked = headingStack.at(-1)?.blocked ?? false;
    let inCurrentSection = headingStack.at(-1)?.active ?? false;
    let headingDepth = headingStack.at(-1)?.depth ?? 0;
    if (h) {
      headingDepth = h[0].match(/^\s*(#+)/)[1].length;
      while (headingStack.length && headingStack.at(-1).depth >= headingDepth) headingStack.pop();
      const parent = headingStack.at(-1);
      sectionBlocked = parent?.blocked ?? false;
      const headingText = h[1].replace(/\*|`/g, '').trim();
      const obsolete = /historical|superseded|archive|deprecated|backlog|deferred|completed|bootstrap/i.test(headingText);
      const implementationChecklist = /-impl\.md$/i.test(path) && /checklist|implementation status/i.test(headingText);
      const explicitlyCurrent = /current|active|next|open|in progress|sprint|status|project state/i.test(headingText) || implementationChecklist;
      const blocked = sectionBlocked || obsolete;
      inCurrentSection = !blocked && (explicitlyCurrent || (parent?.active ?? false));
      sectionBlocked = blocked;
      headingStack.push({ depth: headingDepth, active: inCurrentSection, blocked });
    }
    const checkbox = line.trimStart().slice(0, 6).toLowerCase();
    const isAction = ['- [ ] ', '* [ ] ', '+ [ ] '].some((prefix) => checkbox.startsWith(prefix));
    const isDone = ['- [x] ', '* [x] ', '+ [x] '].some((prefix) => checkbox.startsWith(prefix));
    const heading = /^\s{0,3}#{1,4}\s+/.test(line);
    const stateHeading = /current state|current sprint|active sprint|next steps|open questions|project status|project state|overview|architecture decisions/i.test(line);
    const readmeIntro = baseName.startsWith('readme') && i < 24 && i < lines.findIndex((item, index) => index > 0 && /^\s{0,3}#{1,3}\s+/.test(item));
    const actionable = isAction && inCurrentSection;
    const completedAction = isDone && inCurrentSection;
    if (!(actionable || completedAction || (heading && stateHeading && !sectionBlocked) || readmeIntro)) continue;
    let start = actionable || completedAction || readmeIntro ? i : i + 1;
    let end = Math.min(lines.length - 1, start + (actionable || completedAction ? 0 : 8));
    if (heading && stateHeading) {
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j].match(/^\s{0,3}(#{1,6})\s+/);
        if (next) { end = Math.min(end, j - 1); break; }
      }
    }
    while (end > start && !lines[end].trim()) end--;
    const maxEnd = Math.min(end, start + 8);
    for (let j = start; j <= maxEnd; j++) selected.add(j);
    ranges.push({ startLine: start + 1, endLine: maxEnd + 1, kind: actionable || completedAction ? 'open-item' : readmeIntro ? 'project-intro' : 'state-section', done: completedAction });
    if (selected.size >= 80) break;
  }
  return ranges.map((range) => ({ ...range, lines: Array.from(selected).filter((i) => i + 1 >= range.startLine && i + 1 <= range.endLine).map((i) => ({ line: i + 1, text: lines[i].slice(0, 500) })) }));
}

function docEvidence(docs) {
  const isChecked = (value) => ['- [x]', '* [x]', '+ [x]'].some((prefix) => value.trimStart().toLowerCase().startsWith(prefix));
  return docs.flatMap((doc) => doc.excerpts.flatMap((excerpt) => excerpt.lines.map(({ line, text: value }) => ({
    type: isChecked(value) ? 'completed' : excerpt.kind === 'open-item' ? 'next' : 'declared',
    path: doc.path, line, text: value.trim(),
  })))).filter((item) => item.text);
}

function detectConflicts(evidence) {
  const statements = [...new Map(evidence.filter((item) => /^\s*[-*+]\s+\[[ xX]\]/.test(item.text)).map((item) => [`${item.path}:${item.line}`, item])).values()];
  const groups = new Map();
  for (const item of statements) {
    const checked = /^\s*[-*+]\s+\[[xX]\]/.test(item.text);
    const title = item.text.replace(/^\s*[-*+]\s+\[[ xX]\]\s*/, '').replace(/https?:\/\/\S+/g, '').toLowerCase();
    const key = [...new Set(title.match(/[a-z0-9]{4,}/g) ?? [])].sort().join(' ');
    if (key.length < 12) continue;
    const list = groups.get(key) ?? [];
    list.push({ ...item, checked });
    groups.set(key, list);
  }
  return [...groups.values()].filter((items) => new Set(items.map((item) => item.path)).size > 1 && items.some((x) => x.checked) && items.some((x) => !x.checked))
    .map((items) => ({ kind: 'possible-disagreement', label: 'Similar checklist text has different status markers; review the cited sources.', evidence: items.map(({ path, line, text, checked }) => ({ path, line, text, status: checked ? 'complete' : 'open' })) }));
}

function snapshotStore(storeDir, id) {
  if (!/^[a-z0-9][a-z0-9-]{0,47}$/i.test(id ?? '')) throw new Error('Snapshot project id is invalid.');
  return join(storeDir, 'projects', id);
}

export function validateStore(storeDir, projects) {
  const store = resolve(storeDir);
  let canonicalStore = store;
  const parsed = parse(store);
  let cursor = parsed.root;
  const unresolved = [];
  for (const part of store.slice(parsed.root.length).split(sep).filter(Boolean)) {
    cursor = join(cursor, part);
    if (!existsSync(cursor)) { unresolved.push(part); continue; }
    if (lstatSync(cursor).isSymbolicLink()) throw new Error(`Snapshot store cannot traverse a symlink or junction: ${cursor}`);
    canonicalStore = join(realpathSync(cursor), ...unresolved);
    unresolved.length = 0;
  }
  canonicalStore = join(canonicalStore, ...unresolved);
  for (const project of projects) {
    const root = resolve(project.root);
    const canonicalRoot = realpathSync(root);
    if (isWithin(canonicalRoot, canonicalStore)) throw new Error(`Snapshot store must be outside configured project roots: ${canonicalStore}`);
  }
}

function atomicJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${randomUUID()}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
  try { linkSync(tmp, path); return true; }
  catch (error) { if (error.code === 'EEXIST') return false; throw error; }
  finally { try { unlinkSync(tmp); } catch { /* already moved or unavailable */ } }
}

export function capture(project, storeDir) {
  validateStore(storeDir, [project]);
  const repo = repoMetadata(project.root);
  const discovered = discoverDocs(repo.root);
  const evidence = docEvidence(discovered.docs);
  const changed = repo.status.map((item) => ({ ...item }));
  const keyMaterial = JSON.stringify({ id: project.id, head: repo.head, branch: repo.branch, changed, dirtyState: repo.dirtyState,
    docs: discovered.docs.map(({ path, hash: digest, excerpts }) => [path, digest, excerpts]), evidence, conflicts: detectConflicts(evidence) });
  const revision = hash(keyMaterial);
  const generatedAt = new Date().toISOString();
  const previous = listSnapshots(project, storeDir);
  const duplicate = previous.find((item) => item.revision === revision);
  if (duplicate) return { ...duplicate, reused: true };
  const snapshot = {
    schema: SCHEMA, id: `${project.id}-${revision.slice(0, 16)}`, projectId: project.id,
    projectName: project.name, color: project.color, root: repo.root,
    revision, generatedAt, git: repo, discovery: { docs: discovered.docs, candidates: discovered.candidates, bytes: discovered.bytes },
    evidence, conflicts: detectConflicts(evidence),
  };
  const dir = snapshotStore(storeDir, project.id);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${revision}.json`);
  const created = !existsSync(file) && atomicJson(file, snapshot);
  return { ...JSON.parse(readFileSync(file, 'utf8')), reused: !created };
}

export function listSnapshots(project, storeDir) {
  const dir = snapshotStore(storeDir, project.id);
  if (!existsSync(dir)) return [];
  try { assertNoSymlinkPath(dir); } catch { return []; }
  return readdirSync(dir).filter((name) => /^[\da-f]{64}\.json$/.test(name)).map((name) => {
    try {
      const path = join(dir, name);
      if (lstatSync(path).isSymbolicLink() || !lstatSync(path).isFile()) return null;
      return JSON.parse(readFileSync(path, 'utf8'));
    } catch { return null; }
  }).filter((snapshot) => snapshot?.schema === SCHEMA && snapshot.projectId === project.id && /^[\da-f]{64}$/.test(snapshot.revision ?? '') && snapshot.id === `${project.id}-${snapshot.revision.slice(0, 16)}` && isAbsolute(snapshot.root)).sort((a, b) => a.generatedAt.localeCompare(b.generatedAt));
}

export function getSnapshot(project, storeDir, id) {
  const snapshots = listSnapshots(project, storeDir);
  return snapshots.find((item) => item.id === id || item.revision === id) ?? null;
}

export function buildBrief(current, baseline = null) {
  const baseHead = baseline?.git?.head ?? null;
  let rangeStatus = 'recent-history';
  let rangeNote = null;
  const changes = baseHead && current.git.head === baseHead
    ? []
    : baseHead ? (() => {
      const baselineIndex = current.git.commits.findIndex((commit) => commit.sha === baseHead);
      if (baselineIndex < 0) {
        rangeStatus = 'unavailable';
        rangeNote = baseline.git.branch !== current.git.branch
          ? 'The baseline is on a different branch or outside the captured first-parent history window; Alegor cannot safely claim a commit range.'
          : 'The baseline is outside the captured first-parent history window; Alegor cannot safely claim a commit range.';
        return [];
      }
      return current.git.commits.slice(0, baselineIndex).reverse().slice(-20);
    })() : current.git.commits.slice(0, 8).reverse();
  const baselineStatus = new Map((baseline?.git?.status ?? []).map((item) => [item.path, `${item.code}:${item.hash ?? ''}`]));
  const currentStatus = new Map(current.git.status.map((item) => [item.path, `${item.code}:${item.hash ?? ''}`]));
  const worktreeChanges = [...new Set([...baselineStatus.keys(), ...currentStatus.keys()])]
    .filter((path) => baselineStatus.get(path) !== currentStatus.get(path))
    .map((path) => ({ path, before: baselineStatus.get(path) ?? 'clean', after: currentStatus.get(path) ?? 'clean' }));
  const docs = current.evidence.filter((item) => item.type === 'next').slice(0, 8);
  const declared = current.evidence.filter((item) => item.type === 'declared').slice(0, 12);
  const complete = current.evidence.filter((item) => item.type === 'completed').slice(0, 8);
  return {
    project: { id: current.projectId, name: current.projectName, color: current.color },
    snapshot: { id: current.id, revision: current.revision, generatedAt: current.generatedAt, head: current.git.head, branch: current.git.branch, dirtyState: current.git.dirtyState },
    baseline: baseline ? { id: baseline.id, revision: baseline.revision, head: baseline.git.head } : null,
    rangeStatus, rangeNote,
    observed: { commits: changes.map(({ sha, date, subject, paths }) => ({ sha, date, subject, paths })), worktreeChanges, changedPaths: [...new Set([...changes.flatMap((item) => item.paths ?? []), ...worktreeChanges.map((item) => item.path)])] },
    declared: declared.map((item) => ({ ...item, type: 'declared' })),
    completed: complete.map((item) => ({ ...item, type: 'completed' })),
    next: docs.length ? docs : [{ type: 'unknown', text: 'No explicit open next step was found in the selected project documents.', path: null, line: null }],
    conflicts: current.conflicts,
    evidence: { documents: current.discovery.docs.map((doc) => ({ path: doc.path, hash: doc.hash, excerpts: doc.excerpts })), totalCandidates: current.discovery.candidates, selectedBytes: current.discovery.bytes },
  };
}

export function compare(project, storeDir, currentId, baselineId = null) {
  const current = getSnapshot(project, storeDir, currentId);
  if (!current) throw new Error(`Snapshot not found: ${currentId}`);
  const baseline = baselineId ? getSnapshot(project, storeDir, baselineId) : null;
  if (baselineId && !baseline) throw new Error(`Baseline snapshot not found: ${baselineId}`);
  return buildBrief(current, baseline);
}
