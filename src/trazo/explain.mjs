// Trazo explain: one text call per snapshot through Ghost, cached by excerpt set, prompt version and model.
// Nothing is sent before preview() has shown the exact excerpts and an estimate; explain() needs confirm: true.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { discover } from '../visu/discovery.mjs';
import { ANALYSIS_VERSION, analyzeProject, buildAnalysisInput } from '../visu/analysis.mjs';
import { moduleOf, hash } from './facts.mjs';

export const EXPLANATION_SCHEMA = 'trazo.explanation/v0';
export const PROMPT_VERSION = `${ANALYSIS_VERSION}+trazo/1`;
/** Estimate from Visu's measured history: ~$0.067 for a 64 KB excerpt set on gemini-flash. The gateway reports the real cost. */
export const USD_PER_KB = Number(process.env.TRAZO_USD_PER_KB) > 0 ? Number(process.env.TRAZO_USD_PER_KB) : 0.001;
export const USD_BASE = 0.004;
export const MAX_CALL_USD = Number(process.env.TRAZO_MAX_CALL_USD) > 0 ? Number(process.env.TRAZO_MAX_CALL_USD) : 0.25;

export const VOCABULARIES = {
  code: null,
  docs: { note: 'This folder holds documents, not a code base: say "sections", "documents" and "topics" instead of "modules", "services" or "routes", and describe what the documents establish, decide and leave open.' },
};

export function estimateUsd(approxBytes) { return +(USD_BASE + (approxBytes / 1024) * USD_PER_KB).toFixed(4); }

export function vocabularyFor(facts) {
  const langs = facts.summary.languages ?? {};
  const docs = (langs.md ?? 0) + (langs.text ?? 0);
  const code = Object.entries(langs).filter(([k]) => !['md', 'text', 'config', 'html', 'css', 'other'].includes(k)).reduce((n, [, c]) => n + c, 0);
  return docs > code * 3 ? 'docs' : 'code';
}

export function cacheKey({ excerpts, model, vocabulary }) {
  return createHash('sha256').update(JSON.stringify({ e: excerpts.map(x => [x.path, x.startLine, x.text]), p: PROMPT_VERSION, m: model, v: vocabulary })).digest('hex');
}

/** Load the bounded line range of each discovered source, the way Visu's capture does. Secrets never reach discovery. */
export function loadSources(root, specs) {
  const out = []; let total = 0;
  for (const spec of specs) {
    const abs = path.join(root, spec.path);
    let st; try { st = fs.lstatSync(abs); } catch { continue; }
    if (!st.isFile() || st.isSymbolicLink() || st.size > 1048576) continue;
    const raw = fs.readFileSync(abs, 'utf8');
    if (raw.includes('\0')) continue;
    const lines = raw.replace(/\r\n/g, '\n').split('\n');
    const startLine = spec.startLine || 1;
    const text = lines.slice(startLine - 1, spec.endLine || lines.length).join('\n');
    total += Buffer.byteLength(text, 'utf8');
    if (total > 600000) break;
    out.push({ path: spec.path, role: spec.role, kind: spec.kind, startLine, endLine: Math.min(spec.endLine || lines.length, lines.length), hash: hash(text), text });
  }
  return out;
}

/** The exact excerpt set that would be sent, its size and a price estimate. Reads the folder; sends nothing. */
export async function preview(root, { facts, ghost = null, store = null } = {}) {
  const { sources: specs, report } = await discover(root);
  const sources = loadSources(root, specs);
  const input = buildAnalysisInput(sources);
  const model = ghost?.analysisModel ?? null;
  const vocabulary = vocabularyFor(facts);
  const key = model ? cacheKey({ excerpts: input.excerpts, model, vocabulary }) : null;
  const cached = Boolean(key && store && fs.existsSync(path.join(store, 'explanations', `${key}.json`)));
  return {
    available: Boolean(ghost), model, vocabulary, promptVersion: PROMPT_VERSION,
    excerpts: input.excerpts.map(e => ({ index: e.index, path: e.path, startLine: e.startLine, kind: e.kind, role: e.role, bytes: Buffer.byteLength(e.text, 'utf8'), text: e.text })),
    excerptCount: input.excerptCount, sourceCount: input.sourceCount, approxBytes: input.approxBytes,
    estimateUsd: cached ? 0 : estimateUsd(input.approxBytes), maxCallUsd: MAX_CALL_USD, cached, cacheKey: key,
    scope: { capped: report.scopeCapped, note: report.scopeNote, filesSeen: report.filesSeen, selected: report.selected },
    sources, input,
  };
}

function confidenceOf(r) {
  const unknown = ['currentState', 'intendedDesign', 'nextSteps'].filter(k => /^Unknown\b/i.test(r[k])).length;
  return unknown === 0 ? 'high' : unknown === 1 ? 'medium' : 'low';
}

function lineCount(text) { return text.split('\n').length; }

/** Attach six chapters to fact-graph modules, hash every citation, and return the explanation document. */
export function materialize({ regions, warnings, metrics, analysisVersion }, { facts, pre, cacheHit = false, createdAt = new Date().toISOString() }) {
  const fileHash = new Map(facts.nodes.filter(n => n.kind === 'file').map(n => [n.path, n.hash]));
  const moduleIds = new Set(facts.nodes.filter(n => n.kind === 'module').map(n => n.id));
  const chapters = regions.map(r => {
    const cite = c => ({ path: c.path, startLine: c.startLine, endLine: c.startLine + lineCount(c.quote) - 1, quote: c.quote, hash: hash(c.quote), fileHash: fileHash.get(c.path) ?? null });
    const counts = new Map();
    for (const p of r.paths) { const m = `mod:${moduleOf(p)}`; if (moduleIds.has(m)) counts.set(m, (counts.get(m) ?? 0) + 1); }
    const modules = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'en')).map(([m]) => m);
    return {
      id: r.id, label: r.label, summary: r.summary, visual: r.visual, node: modules[0] ?? null, modules,
      confidence: confidenceOf(r), currentState: r.currentState, intendedDesign: r.intendedDesign, nextSteps: r.nextSteps,
      cites: { current: r.currentEvidence.map(cite), design: r.designEvidence.map(cite), next: r.nextEvidence.map(cite), topic: r.evidence.map(cite) },
      paths: r.paths,
    };
  });
  const cost = metrics?.costUsd ?? null;
  return {
    schema: EXPLANATION_SCHEMA, id: pre.cacheKey, snapshotId: facts.snapshot.id, excerptSetHash: hash(JSON.stringify(pre.excerpts.map(e => [e.path, e.startLine, e.text]))),
    analysisVersion, promptVersion: PROMPT_VERSION, model: pre.model, vocabulary: pre.vocabulary, createdAt, cacheHit,
    cost: { usd: cacheHit ? 0 : cost, reported: !cacheHit && cost !== null, estimateUsd: pre.estimateUsd },
    metrics: metrics ? { durationMs: metrics.durationMs, excerptCount: metrics.excerptCount, approxBytes: metrics.approxBytes, usage: metrics.usage ?? null, callId: metrics.callId ?? null } : null,
    chapters, warnings: warnings ?? [],
    excerpts: pre.excerpts.map(e => ({ index: e.index, path: e.path, startLine: e.startLine, bytes: e.bytes })),
  };
}

/**
 * Explain a snapshot. Returns { explanation, cacheHit }. Requires confirm === true; refuses without a Ghost client,
 * and refuses an estimate above MAX_CALL_USD. A cache hit never touches the network and costs nothing.
 */
export async function explain(root, { facts, ghost, store, confirm = false, previous = null, analyzer = analyzeProject } = {}) {
  if (!ghost) throw Object.assign(new Error('Explanation needs a Ghost gateway key (TRAZO_GHOST_KEY); nothing was sent.'), { status: 409 });
  const pre = await preview(root, { facts, ghost, store });
  const dir = path.join(store, 'explanations'); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${pre.cacheKey}.json`);
  if (fs.existsSync(file)) {
    const cached = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { explanation: { ...cached, cacheHit: true, snapshotId: facts.snapshot.id, cost: { ...cached.cost, usd: 0 } }, cacheHit: true, pre };
  }
  if (confirm !== true) throw Object.assign(new Error(`Confirmation required: this call would send ${pre.excerptCount} excerpts (${pre.approxBytes} bytes) for about $${pre.estimateUsd}.`), { status: 428, pre });
  if (pre.estimateUsd > MAX_CALL_USD) throw Object.assign(new Error(`Estimated $${pre.estimateUsd} exceeds the per-call cap of $${MAX_CALL_USD} (TRAZO_MAX_CALL_USD).`), { status: 402, pre });
  const result = await analyzer(ghost, { name: facts.snapshot.name, sources: pre.sources, previous, vocabulary: VOCABULARIES[pre.vocabulary] });
  const explanation = materialize(result, { facts, pre });
  fs.writeFileSync(file, JSON.stringify(explanation));
  return { explanation, cacheHit: false, pre };
}
