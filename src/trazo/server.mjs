// Trazo viewer server: loopback only, per-process token, exact Origin, static UI.
// Week 1: sketch. Week 2: explanation through Ghost (confirmed, priced, cached), infographic, Mermaid, artifact record.
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { snapshotFolder, addSymbols, LEVELS } from './facts.mjs';
import { renderSketch } from './sketch.mjs';
import { projectSlug, assertStoreOutside } from './consent.mjs';
import { preview as previewExplain, explain as runExplain } from './explain.mjs';
import { renderInfographic, renderMermaid, citationIndex } from './compose.mjs';
import { buildRecord } from '../artifact/record.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(here, '../../web/trazo');
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";
export const TRAZO_VERSION = '0.2.0';

const readJson = (f, dflt) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return dflt; } };
const writeOnce = (f, data) => { if (!fs.existsSync(f)) fs.writeFileSync(f, data); };

export class Project {
  constructor({ root, store, name, ghost = null, analyzer = undefined }) {
    this.root = root; this.name = name ?? path.basename(root); this.slug = projectSlug(root);
    this.store = path.resolve(store); assertStoreOutside(this.store, root);
    this.dir = path.join(this.store, this.slug);
    this.ghost = ghost; this.analyzer = analyzer;
    this.facts = null; this.capture = null; this.svg = new Map(); this.symbolsPromise = null;
    this.explanation = null; this.composed = null; this.artifact = null; this.previewCache = null;
    this.ledger = readJson(path.join(this.dir, 'ledger.json'), { schema: 'trazo.ledger/v0', calls: [], costUsd: 0 });
  }
  get snapshotDir() { return path.join(this.dir, 'snapshots', this.facts.snapshot.id); }
  async snapshot() {
    const { facts, capture } = await snapshotFolder(this.root, { name: this.name });
    const unchanged = this.facts?.snapshot.id === facts.snapshot.id;
    this.facts = facts; this.capture = capture; this.svg.clear(); this.symbolsPromise = null; this.previewCache = null;
    if (!unchanged) this.composed = null;
    fs.mkdirSync(this.snapshotDir, { recursive: true });
    writeOnce(path.join(this.snapshotDir, 'facts.json'), JSON.stringify(facts));
    fs.writeFileSync(path.join(this.dir, 'current.json'), JSON.stringify({ snapshotId: facts.snapshot.id, capturedAt: facts.snapshot.capturedAt }) + '\n');
    writeOnce(path.join(this.dir, 'ledger.json'), JSON.stringify(this.ledger, null, 2) + '\n');
    if (!this.explanation) { const prior = readJson(path.join(this.snapshotDir, 'explanation.json'), null); if (prior) this.explanation = { ...prior, cacheHit: true }; }
    return { facts, unchanged };
  }
  async ensureSymbols() {
    if (this.facts.symbols) return this.facts;
    if (!this.symbolsPromise) this.symbolsPromise = (async () => { const t0 = performance.now(); const f = await addSymbols(this.facts, this.root, this.capture); f.timings = { ...this.facts.timings, symbolsMs: +(performance.now() - t0).toFixed(1) }; this.facts = f; this.svg.delete('3:'); return f; })();
    return this.symbolsPromise;
  }
  async sketch(level, focus) {
    const L = Math.max(0, Math.min(3, Number(level) || 0));
    if (L === 3) await this.ensureSymbols();
    const key = L === 3 ? `3:${focus ?? ''}` : String(L);
    if (!this.svg.has(key)) {
      const t0 = performance.now();
      const svg = renderSketch(this.facts, L, { focus });
      this.svg.set(key, { svg, renderMs: +(performance.now() - t0).toFixed(1) });
      writeOnce(path.join(this.snapshotDir, `sketch-${LEVELS[L]}${L === 3 && focus ? `-${focus.replace(/[^a-z0-9]+/gi, '_')}` : ''}.svg`), svg);
    }
    return this.svg.get(key);
  }
  recordCall(entry) {
    this.ledger.calls.push({ id: crypto.randomUUID(), at: new Date().toISOString(), ...entry });
    this.ledger.costUsd = +this.ledger.calls.reduce((n, c) => n + (c.costUsd ?? 0), 0).toFixed(6);
    fs.mkdirSync(this.dir, { recursive: true });
    fs.writeFileSync(path.join(this.dir, 'ledger.json'), JSON.stringify(this.ledger, null, 2) + '\n');
  }
  spentToday() { const day = new Date().toISOString().slice(0, 10); return +this.ledger.calls.filter(c => c.at.startsWith(day)).reduce((n, c) => n + (c.costUsd ?? 0), 0).toFixed(6); }
  async preview() {
    if (!this.previewCache) { const t0 = performance.now(); const p = await previewExplain(this.root, { facts: this.facts, ghost: this.ghost, store: this.dir }); p.previewMs = +(performance.now() - t0).toFixed(1); this.previewCache = p; }
    const { sources, input, ...rest } = this.previewCache; return rest;
  }
  async explain({ confirm = false } = {}) {
    const t0 = performance.now();
    try {
      const previous = this.explanation ? { regions: this.explanation.chapters.map(c => ({ id: c.id, label: c.label, visual: c.visual, summary: c.summary })) } : null;
      const { explanation, cacheHit, pre } = await runExplain(this.root, { facts: this.facts, ghost: this.ghost, store: this.dir, confirm, previous, ...(this.analyzer ? { analyzer: this.analyzer } : {}) });
      this.explanation = explanation; this.composed = null; this.previewCache = null;
      this.recordCall({ stage: 'explain', model: pre.model, status: 'success', cacheHit, costUsd: cacheHit ? 0 : explanation.cost.usd, costReported: explanation.cost.reported, estimateUsd: pre.estimateUsd, excerptCount: pre.excerptCount, approxBytes: pre.approxBytes, snapshotId: this.facts.snapshot.id, durationMs: +(performance.now() - t0).toFixed(1) });
      this.persistExplanation();
      return { explanation, cacheHit };
    } catch (e) {
      if (!e.status) this.recordCall({ stage: 'explain', model: this.ghost?.analysisModel ?? null, status: 'error', cacheHit: false, costUsd: e.metrics?.costUsd ?? null, error: e.message.slice(0, 200), snapshotId: this.facts.snapshot.id, durationMs: +(performance.now() - t0).toFixed(1) });
      throw e;
    }
  }
  compose() {
    if (!this.explanation) return null;
    if (!this.composed) { const t0 = performance.now(); this.composed = { svg: renderInfographic(this.facts, this.explanation), mermaid: renderMermaid(this.facts, this.explanation), renderMs: +(performance.now() - t0).toFixed(1) }; }
    return this.composed;
  }
  buildArtifact(port = null) {
    const ex = this.explanation; if (!ex) return null;
    const seen = new Set(); const evidence = [];
    for (const ch of ex.chapters) for (const field of ['current', 'design', 'next', 'topic']) for (const c of ch.cites[field]) { const k = `${c.path}:${c.startLine}:${c.endLine}`; if (seen.has(k)) continue; seen.add(k); evidence.push({ path: c.path, lines: [c.startLine, c.endLine], hash: c.hash }); }
    return buildRecord({
      tool: { name: 'trazo', version: TRAZO_VERSION },
      project: { hostId: this.name, repoRoot: this.root, remote: null },
      revision: { ref: this.facts.revision.branch, sha: this.facts.revision.sha, dirty: this.facts.revision.dirty, capturedAt: this.facts.snapshot.capturedAt },
      scope: { kind: 'explained-snapshot', summary: ex.chapters.map(c => c.label).join(' · ') },
      evidence,
      view: { url: port ? `http://127.0.0.1:${port}/#chapters` : null, static: 'infographic.svg' },
      provenance: { inference: 'model', model: ex.model, cost: ex.cost.usd, promptVersion: ex.promptVersion },
    });
  }
  persistExplanation(port = null) {
    const ex = this.explanation; if (!ex || ex.snapshotId !== this.facts.snapshot.id) return;
    const composed = this.compose(); const record = this.buildArtifact(port); this.artifact = record;
    const existing = readJson(path.join(this.snapshotDir, 'explanation.json'), null);
    const suffix = existing && existing.id !== ex.id ? `-${ex.id.slice(0, 12)}` : '';
    writeOnce(path.join(this.snapshotDir, `explanation${suffix}.json`), JSON.stringify(ex));
    writeOnce(path.join(this.snapshotDir, `infographic${suffix}.svg`), composed.svg);
    writeOnce(path.join(this.snapshotDir, `chapters${suffix}.mmd`), composed.mermaid);
    writeOnce(path.join(this.snapshotDir, `artifact${suffix}.json`), JSON.stringify(record, null, 2) + '\n');
  }
  state(consent) {
    const f = this.facts; const ex = this.explanation;
    return {
      schema: 'trazo.state/v0', version: TRAZO_VERSION, name: this.name, root: this.root, slug: this.slug, store: this.dir,
      snapshot: f ? { ...f.snapshot, root: undefined } : null, revision: f?.revision ?? null, summary: f?.summary ?? null,
      timings: f?.timings ?? null, levels: LEVELS, modules: f ? f.nodes.filter(n => n.kind === 'module').map(n => ({ id: n.id, label: n.label, files: n.files, weight: n.weight })).sort((a, b) => b.weight - a.weight) : [],
      symbols: f?.symbols ? (f.symbols.available ? 'ready' : 'unavailable') : 'pending',
      ledger: { calls: this.ledger.calls.length, costUsd: this.ledger.costUsd, spentTodayUsd: this.spentToday() },
      consent: consent ? { grantedAt: consent.grantedAt, budgetUsdPerDay: consent.budgetUsdPerDay } : null,
      explain: { available: Boolean(this.ghost), has: Boolean(ex), stale: Boolean(ex && f && ex.snapshotId !== f.snapshot.id), cost: ex?.cost ?? null, cacheHit: ex?.cacheHit ?? null, chapters: ex?.chapters.length ?? 0, warnings: ex?.warnings.length ?? 0, model: ex?.model ?? this.ghost?.analysisModel ?? null, createdAt: ex?.createdAt ?? null },
      modelCalls: this.ledger.calls.filter(c => c.stage === 'explain' && !c.cacheHit && c.status === 'success').length,
    };
  }
}

export function createServer({ project, consent = null, token = crypto.randomBytes(32).toString('hex'), port = 8875 }) {
  const send = (res, status, body, type = 'application/json; charset=utf-8') => { res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'content-security-policy': CSP }); res.end(type.startsWith('application/json') ? JSON.stringify(body) : body); };
  const readBody = req => new Promise((resolve, reject) => { let data = ''; req.on('data', c => { data += c; if (data.length > 64 * 1024) { reject(new Error('body too large')); req.destroy(); } }); req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); } }); req.on('error', reject); });
  const server = http.createServer(async (req, res) => {
    try {
      const address = server.address(); const boundPort = typeof address === 'object' && address ? address.port : port;
      let hostUrl; try { hostUrl = new URL(`http://${req.headers.host || ''}`); } catch { return send(res, 403, { error: 'Local host only' }); }
      if (!['127.0.0.1', 'localhost'].includes(hostUrl.hostname) || Number(hostUrl.port || 80) !== boundPort) return send(res, 403, { error: 'Local host only' });
      const origin = req.headers.origin;
      if (origin) { let o; try { o = new URL(origin); } catch { return send(res, 403, { error: 'Origin not allowed' }); } if (o.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(o.hostname) || Number(o.port || 80) !== boundPort) return send(res, 403, { error: 'Origin not allowed' }); }
      const url = new URL(req.url, 'http://127.0.0.1');
      if (req.method === 'GET' && url.pathname === '/') { const html = fs.readFileSync(path.join(WEB, 'index.html'), 'utf8').replace('__TRAZO_TOKEN__', token); return send(res, 200, html, 'text/html; charset=utf-8'); }
      if (req.method === 'GET' && ['/app.mjs', '/style.css'].includes(url.pathname)) return send(res, 200, fs.readFileSync(path.join(WEB, url.pathname.slice(1)), 'utf8'), url.pathname.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8');
      if (req.headers.authorization !== `Bearer ${token}`) return send(res, 401, { error: 'Local session token required' });
      if (req.method === 'GET' && url.pathname === '/api/state') return send(res, 200, project.state(consent));
      if (!project.facts) return send(res, 404, { error: 'No snapshot yet' });
      if (req.method === 'GET' && url.pathname === '/api/facts') return send(res, 200, project.facts);
      if (req.method === 'GET' && url.pathname === '/api/sketch') {
        const level = Number(url.searchParams.get('level') ?? 1); if (!Number.isInteger(level) || level < 0 || level > 3) return send(res, 400, { error: 'level must be 0..3' });
        const focus = url.searchParams.get('focus'); if (focus && !/^mod:[\w./()@-]{1,120}$/.test(focus)) return send(res, 400, { error: 'bad focus id' });
        const { svg, renderMs } = await project.sketch(level, focus);
        res.setHeader('x-trazo-render-ms', String(renderMs));
        return send(res, 200, svg, 'image/svg+xml; charset=utf-8');
      }
      if (req.method === 'POST' && url.pathname === '/api/snapshot') { const { facts, unchanged } = await project.snapshot(); return send(res, 200, { snapshotId: facts.snapshot.id, unchanged, timings: facts.timings, modelCalls: 0 }); }
      if (req.method === 'GET' && url.pathname === '/api/explain/preview') return send(res, 200, await project.preview());
      if (req.method === 'POST' && url.pathname === '/api/explain') {
        const body = await readBody(req);
        try { const { explanation, cacheHit } = await project.explain({ confirm: body.confirm === true }); project.persistExplanation(boundPort); return send(res, 200, { id: explanation.id, cacheHit, cost: explanation.cost, chapters: explanation.chapters.length, warnings: explanation.warnings, ledger: { calls: project.ledger.calls.length, costUsd: project.ledger.costUsd } }); }
        catch (e) { if (e.status) return send(res, e.status, { error: e.message, estimateUsd: e.pre?.estimateUsd ?? null }); return send(res, 502, { error: `Explanation failed: ${e.message.slice(0, 160)}`, costUsd: e.metrics?.costUsd ?? null }); }
      }
      if (req.method === 'GET' && url.pathname === '/api/explanation') return project.explanation ? send(res, 200, project.explanation) : send(res, 404, { error: 'Not explained yet' });
      if (req.method === 'GET' && url.pathname === '/api/citations') return project.explanation ? send(res, 200, citationIndex(project.explanation).list) : send(res, 404, { error: 'Not explained yet' });
      if (req.method === 'GET' && url.pathname === '/api/infographic') { const c = project.compose(); if (!c) return send(res, 404, { error: 'Not explained yet' }); res.setHeader('x-trazo-render-ms', String(c.renderMs)); return send(res, 200, c.svg, 'image/svg+xml; charset=utf-8'); }
      if (req.method === 'GET' && url.pathname === '/api/mermaid') { const c = project.compose(); return c ? send(res, 200, c.mermaid, 'text/plain; charset=utf-8') : send(res, 404, { error: 'Not explained yet' }); }
      if (req.method === 'GET' && url.pathname === '/api/artifact') { const r = project.buildArtifact(boundPort); return r ? send(res, 200, r) : send(res, 404, { error: 'Not explained yet' }); }
      if (req.method === 'GET' && url.pathname === '/api/ledger') return send(res, 200, project.ledger);
      return send(res, 404, { error: 'Not found' });
    } catch (e) { if (!res.headersSent) send(res, 500, { error: 'Trazo request failed safely.' }); else res.destroy(); }
  });
  server.port = port; server.token = token;
  return server;
}
