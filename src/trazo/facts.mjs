// Trazo fact graph: files, modules, imports, docs sections and history from a consented folder.
// Deterministic, bounded, zero model calls. Symbols (JS/TS) are added lazily through Grafe's indexFiles.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { inventory, safeName } from '../visu/discovery.mjs';
import { readHistory } from '../alegor/core.mjs';

export const FACTS_SCHEMA = 'trazo.facts/v0';
export const LIMITS = { maxFiles: 2000, maxFileBytes: 1024 * 1024, maxTotalBytes: 32 * 1024 * 1024, maxSymbolFiles: 400, maxModules: 24, maxCommits: 40 };
export const LEVELS = ['poster', 'guide', 'engineer', 'deep'];

const LANG = { '.js': 'js', '.jsx': 'js', '.mjs': 'js', '.cjs': 'js', '.ts': 'ts', '.tsx': 'ts', '.mts': 'ts', '.cts': 'ts', '.vue': 'js', '.svelte': 'js', '.py': 'py', '.cs': 'cs', '.go': 'go', '.rs': 'rs', '.java': 'java', '.kt': 'kotlin', '.php': 'php', '.rb': 'ruby', '.md': 'md', '.mdx': 'md', '.txt': 'text', '.rst': 'text', '.adoc': 'text', '.json': 'config', '.yaml': 'config', '.yml': 'config', '.toml': 'config', '.ini': 'config', '.html': 'html', '.css': 'css', '.scss': 'css', '.sql': 'sql', '.sh': 'shell', '.ps1': 'shell' };
const CONTAINERS = new Set(['src', 'lib', 'app', 'apps', 'source', 'packages', 'pkg', 'cmd', 'internal', 'docs', 'web', 'server', 'client', 'services']);
const JS_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.mjs', '.cjs', '.vue', '.svelte'];

export function hash(value) { return createHash('sha256').update(value).digest('hex'); }
export function langOf(p) { return LANG[path.posix.extname(p).toLowerCase()] ?? 'other'; }
const weightOf = bytes => Math.max(1, Math.round(Math.log2(1 + bytes)));

async function walkFallback(root) {
  const paths = [];
  const stack = [''];
  while (stack.length && paths.length < LIMITS.maxFiles * 2) {
    const rel = stack.pop();
    let entries; try { entries = fs.readdirSync(path.join(root, rel), { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const p = rel ? `${rel}/${e.name}` : e.name;
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) { if (safeName(`${p}/x.md`)) stack.push(p); continue; }
      if (e.isFile() && safeName(p)) paths.push(p);
    }
  }
  return { root, mode: 'walk', paths: paths.sort(), truncated: paths.length > LIMITS.maxFiles, excluded: 0 };
}

/** Bounded capture of the folder's text files. Git-aware when possible, plain walk otherwise. */
export async function captureFiles(root) {
  let inv;
  try { inv = await inventory(root); } catch { inv = await walkFallback(root); }
  const files = []; const skipped = []; let total = 0;
  for (const p of inv.paths) {
    if (files.length >= LIMITS.maxFiles) { skipped.push({ path: p, reason: 'file-count-limit' }); continue; }
    const abs = path.join(root, p);
    let st; try { st = fs.lstatSync(abs); } catch { skipped.push({ path: p, reason: 'missing' }); continue; }
    if (!st.isFile() || st.isSymbolicLink()) { skipped.push({ path: p, reason: 'not-regular-file' }); continue; }
    if (st.size === 0) continue;
    if (st.size > LIMITS.maxFileBytes) { skipped.push({ path: p, reason: 'file-size-limit', bytes: st.size }); continue; }
    if (total + st.size > LIMITS.maxTotalBytes) { skipped.push({ path: p, reason: 'total-size-limit', bytes: st.size }); continue; }
    const raw = fs.readFileSync(abs);
    if (raw.includes(0)) { skipped.push({ path: p, reason: 'binary' }); continue; }
    total += raw.length;
    files.push({ path: p, bytes: raw.length, hash: hash(raw), text: raw.toString('utf8') });
  }
  return { files, skipped, mode: inv.mode, truncated: inv.truncated || files.length >= LIMITS.maxFiles, totalBytes: total, excluded: inv.excluded };
}

/** Import specifiers per language. Regex only: it finds module relationships, never types or calls. */
export function scanImports(p, text, lang = langOf(p)) {
  const out = []; const push = (spec, kind) => { if (spec && out.length < 400) out.push({ spec, kind }); };
  const src = lang === 'js' && /\.(vue|svelte)$/i.test(p) ? [...text.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).join('\n') : text;
  if (lang === 'js' || lang === 'ts') {
    for (const m of src.matchAll(/(?:^|[\s;])(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,$]+?\s+from\s+)?['"]([^'"\n]+)['"]/g)) push(m[1], m[1].startsWith('.') ? 'relative' : 'package');
    for (const m of src.matchAll(/\brequire\(\s*['"]([^'"\n]+)['"]\s*\)/g)) push(m[1], m[1].startsWith('.') ? 'relative' : 'package');
    for (const m of src.matchAll(/\bimport\(\s*['"]([^'"\n]+)['"]\s*\)/g)) push(m[1], m[1].startsWith('.') ? 'relative' : 'package');
  } else if (lang === 'py') {
    for (const m of src.matchAll(/^\s*from\s+([.\w]+)\s+import\b/gm)) push(m[1], m[1].startsWith('.') ? 'relative' : 'package');
    for (const m of src.matchAll(/^\s*import\s+([\w.]+(?:\s*,\s*[\w.]+)*)/gm)) for (const s of m[1].split(',')) push(s.trim(), 'package');
  } else if (lang === 'cs') {
    for (const m of src.matchAll(/^\s*using\s+(?:static\s+)?([\w.]+)\s*;/gm)) push(m[1], 'namespace');
  } else if (lang === 'go') {
    for (const m of src.matchAll(/^\s*import\s+(?:\w+\s+)?"([^"\n]+)"/gm)) push(m[1], 'package');
    for (const block of src.matchAll(/^\s*import\s*\(([\s\S]*?)\)/gm)) for (const m of block[1].matchAll(/"([^"\n]+)"/g)) push(m[1], 'package');
  } else if (lang === 'rs') {
    for (const m of src.matchAll(/^\s*(?:pub(?:\([^)]*\))?\s+)?mod\s+(\w+)\s*;/gm)) push(`mod:${m[1]}`, 'relative');
    for (const m of src.matchAll(/^\s*(?:pub(?:\([^)]*\))?\s+)?use\s+((?:crate|super|self)(?:::\w+)*)/gm)) push(m[1], 'relative');
    for (const m of src.matchAll(/^\s*(?:pub(?:\([^)]*\))?\s+)?use\s+(\w+)(?:::|;)/gm)) if (!/^(crate|super|self|std|core|alloc)$/.test(m[1])) push(m[1], 'package');
  } else if (lang === 'java' || lang === 'kotlin') {
    for (const m of src.matchAll(/^\s*import\s+(?:static\s+)?([\w.]+)(?:\.\*)?\s*;?/gm)) push(m[1], 'namespace');
  }
  return out;
}

/** Resolve a specifier to a captured file. Returns {target, quality} or null. */
export function resolveImport(from, spec, lang, known, dirs) {
  const dir = path.posix.dirname(from);
  const first = cands => { for (const c of cands) { const n = path.posix.normalize(c); if (known.has(n)) return n; } return null; };
  if (lang === 'js' || lang === 'ts') {
    if (!spec.startsWith('.')) return null;
    const base = path.posix.normalize(path.posix.join(dir, spec));
    const swapped = base.replace(/\.js$/, '.ts').replace(/\.mjs$/, '.mts').replace(/\.jsx$/, '.tsx');
    const t = first([base, swapped, ...JS_EXTS.map(e => base + e), ...JS_EXTS.map(e => `${base}/index${e}`)]);
    return t ? { target: t, quality: 'resolved' } : null;
  }
  if (lang === 'py') {
    let modPath, baseDir = dir;
    if (spec.startsWith('.')) { const dots = spec.match(/^\.+/)[0].length; for (let i = 1; i < dots; i++) baseDir = path.posix.dirname(baseDir); modPath = spec.slice(dots).replaceAll('.', '/'); }
    else modPath = spec.replaceAll('.', '/');
    const bases = spec.startsWith('.') ? [path.posix.join(baseDir, modPath)] : [modPath, `src/${modPath}`, path.posix.join(dir, modPath)];
    const t = first(bases.flatMap(b => [`${b}.py`, `${b}/__init__.py`]));
    return t ? { target: t, quality: spec.startsWith('.') ? 'resolved' : 'candidate' } : null;
  }
  if (lang === 'rs') {
    if (spec.startsWith('mod:')) { const name = spec.slice(4); const t = first([`${dir}/${name}.rs`, `${dir}/${name}/mod.rs`]); return t ? { target: t, quality: 'resolved' } : null; }
    const parts = spec.split('::'); const head = parts.shift();
    const base = head === 'crate' ? 'src' : head === 'super' ? path.posix.dirname(dir) : dir;
    for (let n = parts.length; n >= 1; n--) { const seg = parts.slice(0, n).join('/'); const t = first([`${base}/${seg}.rs`, `${base}/${seg}/mod.rs`]); if (t) return { target: t, quality: 'resolved' }; }
    return null;
  }
  if (lang === 'go' || lang === 'cs' || lang === 'java' || lang === 'kotlin') {
    const segs = spec.split(lang === 'go' ? '/' : '.').map(s => s.toLowerCase());
    for (let n = Math.min(segs.length, 4); n >= 1; n--) { const suffix = segs.slice(-n).join('/'); const d = [...dirs].find(x => x.toLowerCase().endsWith(suffix)); if (d) return { target: d, quality: 'candidate', directory: true }; }
    return null;
  }
  return null;
}

export function moduleOf(p) {
  const parts = p.split('/');
  if (parts.length === 1) return '(root)';
  if (CONTAINERS.has(parts[0].toLowerCase()) && parts.length > 2) return `${parts[0]}/${parts[1]}`;
  return parts[0];
}

function firstParagraph(text) {
  const lines = text.replace(/\r/g, '').split('\n');
  let i = 0; while (i < lines.length && (/^\s*$/.test(lines[i]) || /^#/.test(lines[i]) || /^\s*[>!|<\[-]/.test(lines[i]))) i++;
  const para = []; while (i < lines.length && lines[i].trim()) para.push(lines[i].trim()), i++;
  return para.join(' ').replace(/<[^>]*>/g, '').replace(/[*_`>#]/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ').slice(0, 220);
}

function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40); }

/** Build the fact graph from a capture and a history read. Pure given its inputs. */
export function buildFacts(root, capture, history, { capturedAt = new Date().toISOString(), name = path.basename(root) } = {}) {
  const files = capture.files;
  const known = new Set(files.map(f => f.path));
  const dirs = new Set(); for (const f of files) { let d = path.posix.dirname(f.path); while (d && d !== '.') { dirs.add(d); d = path.posix.dirname(d); } }
  const nodes = new Map(); const edges = [];
  const addNode = n => { if (!nodes.has(n.id)) nodes.set(n.id, n); return nodes.get(n.id); };
  const modAgg = new Map();
  for (const f of files) {
    const mod = moduleOf(f.path); const lang = langOf(f.path);
    const m = modAgg.get(mod) ?? { id: `mod:${mod}`, kind: 'module', label: mod === '(root)' ? name : mod.split('/').pop(), path: mod, weight: 0, files: 0, bytes: 0, langs: {}, externals: new Map() };
    m.weight += weightOf(f.bytes); m.files++; m.bytes += f.bytes; m.langs[lang] = (m.langs[lang] ?? 0) + 1; modAgg.set(mod, m);
    const exportsCount = lang === 'js' || lang === 'ts' ? (f.text.match(/^\s*export\b/gm) ?? []).length : lang === 'py' ? (f.text.match(/^(?:def|class)\s+\w/gm) ?? []).length : lang === 'cs' || lang === 'java' || lang === 'kotlin' ? (f.text.match(/\b(?:public|internal)\s+(?:static\s+|sealed\s+|abstract\s+|partial\s+)*(?:class|interface|record|struct|enum|fun|object)\b/g) ?? []).length : lang === 'go' ? (f.text.match(/^func\s+(?:\([^)]*\)\s*)?[A-Z]\w*/gm) ?? []).length : lang === 'rs' ? (f.text.match(/^\s*pub\s+(?:fn|struct|enum|trait|mod|type)\b/gm) ?? []).length : 0;
    addNode({ id: `file:${f.path}`, kind: 'file', label: path.posix.basename(f.path), path: f.path, module: `mod:${mod}`, level: 2, weight: weightOf(f.bytes), bytes: f.bytes, lang, hash: f.hash, exports: exportsCount });
    if (lang === 'md') {
      let count = 0;
      for (const h of f.text.matchAll(/^(#{1,3})\s+(.+?)\s*#*\s*$/gm)) { if (++count > 40) break; const title = h[2].replace(/[*_`]/g, '').trim(); addNode({ id: `sec:${f.path}#${slug(title)}-${count}`, kind: 'section', label: title.slice(0, 80), path: f.path, module: `mod:${mod}`, level: h[1].length === 1 ? 1 : 2, depth: h[1].length }); edges.push({ from: `file:${f.path}`, to: `sec:${f.path}#${slug(title)}-${count}`, kind: 'contains', level: 2 }); }
    }
  }
  const fileEdges = new Map();
  for (const f of files) {
    const lang = langOf(f.path); if (!['js', 'ts', 'py', 'cs', 'go', 'rs', 'java', 'kotlin'].includes(lang)) continue;
    const fromMod = `mod:${moduleOf(f.path)}`;
    for (const imp of scanImports(f.path, f.text, lang)) {
      const r = resolveImport(f.path, imp.spec, lang, known, dirs);
      if (!r) { if (imp.kind === 'package' || imp.kind === 'namespace') { const m = modAgg.get(moduleOf(f.path)); const key = imp.spec.split(/[/.:]/)[0].replace(/^@/, '') || imp.spec; m.externals.set(key, (m.externals.get(key) ?? 0) + 1); } continue; }
      const toMod = r.directory ? `mod:${moduleOf(`${r.target}/x`)}` : `mod:${moduleOf(r.target)}`;
      const key = `${f.path}→${r.target}`;
      if (!fileEdges.has(key)) fileEdges.set(key, { from: `file:${f.path}`, to: r.directory ? toMod : `file:${r.target}`, kind: 'imports', level: 2, quality: r.quality, count: 0, fromModule: fromMod, toModule: toMod });
      fileEdges.get(key).count++;
    }
  }
  const modEdges = new Map();
  for (const e of fileEdges.values()) {
    edges.push(e);
    if (e.fromModule !== e.toModule) { const k = `${e.fromModule}→${e.toModule}`; const m = modEdges.get(k) ?? { from: e.fromModule, to: e.toModule, kind: 'imports', level: 1, count: 0, candidates: 0 }; m.count += e.count; if (e.quality === 'candidate') m.candidates += e.count; modEdges.set(k, m); }
  }
  const modules = [...modAgg.values()].sort((a, b) => a.id.localeCompare(b.id, 'en'));
  const byWeight = [...modules].sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id, 'en'));
  const posterSet = new Set(byWeight.slice(0, 5).map(m => m.id));
  for (const m of modules) {
    addNode({ id: m.id, kind: 'module', label: m.label, path: m.path, level: posterSet.has(m.id) ? 0 : 1, weight: m.weight, files: m.files, bytes: m.bytes, langs: m.langs, externals: [...m.externals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n, c]) => ({ name: n, count: c })) });
    for (const f of files) if (`mod:${moduleOf(f.path)}` === m.id) edges.push({ from: m.id, to: `file:${f.path}`, kind: 'contains', level: 2 });
  }
  for (const e of modEdges.values()) edges.push(e);
  const prefix = history?.prefix ? `${history.prefix}/` : '';
  const commits = (history?.commits ?? []).slice(0, LIMITS.maxCommits);
  for (const c of commits) {
    const id = `commit:${c.sha.slice(0, 12)}`;
    const touched = new Map();
    for (const p of c.paths) { const rel = p.startsWith(prefix) ? p.slice(prefix.length) : null; if (!rel) continue; const mod = `mod:${moduleOf(rel)}`; if (nodes.has(mod)) touched.set(mod, (touched.get(mod) ?? 0) + 1); }
    addNode({ id, kind: 'commit', label: c.subject.slice(0, 72), sha: c.sha, at: c.date, level: 1, paths: c.paths.length, weight: Math.max(1, Math.min(12, c.paths.length)) });
    for (const [mod, n] of touched) edges.push({ from: id, to: mod, kind: 'touches', level: 1, count: n });
  }
  const readme = files.find(f => /^readme(\.[^/]*)?$/i.test(f.path));
  const langMix = {}; for (const f of files) langMix[langOf(f.path)] = (langMix[langOf(f.path)] ?? 0) + 1;
  const snapshotId = hash(JSON.stringify({ files: files.map(f => [f.path, f.hash]).sort(), head: history?.head ?? null, schema: FACTS_SCHEMA }));
  return {
    schema: FACTS_SCHEMA,
    snapshot: { id: snapshotId, root, name, capturedAt, mode: capture.mode, truncated: capture.truncated, files: files.length, bytes: capture.totalBytes, skipped: capture.skipped.length, excluded: capture.excluded ?? 0 },
    revision: { git: Boolean(history?.git), sha: history?.head ?? null, branch: history?.branch ?? null, dirty: Boolean(history?.dirty), prefix: history?.prefix ?? '' },
    summary: { sentence: readme ? firstParagraph(readme.text) : `${name}: ${files.length} text files in ${modules.length} modules.`, languages: langMix, modules: modules.length, commits: commits.length, historyTruncated: Boolean(history?.truncated) },
    nodes: [...nodes.values()],
    edges,
    symbols: null,
  };
}

/** Lazily add JS/TS symbols and call edges through Grafe's indexer (TypeScript program; slower). */
export async function addSymbols(facts, root, capture) {
  const jsFiles = capture.files.filter(f => ['js', 'ts'].includes(langOf(f.path)) && !/\.(vue|svelte)$/i.test(f.path)).slice(0, LIMITS.maxSymbolFiles);
  if (!jsFiles.length) return { ...facts, symbols: { available: false, reason: 'No JavaScript or TypeScript files in scope.' } };
  let grafe; try { grafe = await import('../grafe/core.mjs'); } catch (e) { return { ...facts, symbols: { available: false, reason: `Grafe indexer unavailable: ${e.message}` } }; }
  const index = grafe.indexFiles(root, jsFiles.map(f => ({ path: f.path, text: f.text, hash: f.hash })));
  const byModule = {};
  for (const s of index.symbols) { const mod = `mod:${moduleOf(s.file)}`; (byModule[mod] ??= []).push({ id: s.id, name: s.qualifiedName, kind: s.kind, file: s.file, line: s.startLine, exported: s.exported }); }
  const calls = index.edges.filter(e => e.kind === 'call' && e.fromSymbol && e.toSymbol).map(e => ({ from: e.fromSymbol, to: e.toSymbol, file: e.fromFile, line: e.line }));
  const tests = index.edges.filter(e => e.kind === 'test-reference' && e.toSymbol).map(e => ({ to: e.toSymbol, file: e.fromFile, line: e.line, quality: e.quality ?? 'resolved' }));
  return { ...facts, symbols: { available: true, indexer: grafe.INDEXER_VERSION, files: jsFiles.length, truncated: jsFiles.length < capture.files.filter(f => ['js', 'ts'].includes(langOf(f.path))).length, count: index.symbols.length, byModule, calls, tests } };
}

/** Facts visible at a level: nodes and edges whose floor is at or below it. */
export function atLevel(facts, level) {
  const L = Math.max(0, Math.min(3, level));
  return { nodes: facts.nodes.filter(n => n.level <= L), edges: facts.edges.filter(e => e.level <= L) };
}

/** Capture, history and facts in one call, with timings in milliseconds. */
export async function snapshotFolder(root, { name } = {}) {
  const t0 = performance.now();
  const capture = await captureFiles(root);
  const t1 = performance.now();
  let history = null; try { history = readHistory(root, { limit: LIMITS.maxCommits }); } catch { history = null; }
  const t2 = performance.now();
  const facts = buildFacts(root, capture, history, { name });
  const t3 = performance.now();
  facts.timings = { captureMs: +(t1 - t0).toFixed(1), historyMs: +(t2 - t1).toFixed(1), factsMs: +(t3 - t2).toFixed(1), totalMs: +(t3 - t0).toFixed(1) };
  return { facts, capture };
}
