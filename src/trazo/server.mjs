// Trazo viewer server: loopback only, per-process token, exact Origin, static UI, zero model calls.
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { snapshotFolder, addSymbols, LEVELS } from './facts.mjs';
import { renderSketch } from './sketch.mjs';
import { projectSlug, assertStoreOutside } from './consent.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(here, '../../web/trazo');
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";

export class Project {
  constructor({ root, store, name }) {
    this.root = root; this.name = name ?? path.basename(root); this.slug = projectSlug(root);
    this.store = path.resolve(store); assertStoreOutside(this.store, root);
    this.dir = path.join(this.store, this.slug);
    this.facts = null; this.capture = null; this.svg = new Map(); this.symbolsPromise = null;
    this.ledger = this.loadLedger();
  }
  loadLedger() { try { return JSON.parse(fs.readFileSync(path.join(this.dir, 'ledger.json'), 'utf8')); } catch { return { schema: 'trazo.ledger/v0', calls: [], costUsd: 0 }; } }
  async snapshot() {
    const { facts, capture } = await snapshotFolder(this.root, { name: this.name });
    const unchanged = this.facts?.snapshot.id === facts.snapshot.id;
    this.facts = facts; this.capture = capture; this.svg.clear(); this.symbolsPromise = null;
    const dir = path.join(this.dir, 'snapshots', facts.snapshot.id);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'facts.json');
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(facts));
    fs.writeFileSync(path.join(this.dir, 'current.json'), JSON.stringify({ snapshotId: facts.snapshot.id, capturedAt: facts.snapshot.capturedAt }) + '\n');
    if (!fs.existsSync(path.join(this.dir, 'ledger.json'))) fs.writeFileSync(path.join(this.dir, 'ledger.json'), JSON.stringify(this.ledger, null, 2) + '\n');
    return { facts, unchanged };
  }
  async ensureSymbols() {
    if (this.facts.symbols) return this.facts;
    if (!this.symbolsPromise) this.symbolsPromise = (async () => { const t0 = performance.now(); const f = await addSymbols(this.facts, this.root, this.capture); f.timings = { ...this.facts.timings, symbolsMs: +(performance.now() - t0).toFixed(1) }; this.facts = f; this.svg.delete('3'); return f; })();
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
      const dir = path.join(this.dir, 'snapshots', this.facts.snapshot.id);
      const file = path.join(dir, `sketch-${LEVELS[L]}${L === 3 && focus ? `-${focus.replace(/[^a-z0-9]+/gi, '_')}` : ''}.svg`);
      if (!fs.existsSync(file)) fs.writeFileSync(file, svg);
    }
    return this.svg.get(key);
  }
  state(consent) {
    const f = this.facts;
    return {
      schema: 'trazo.state/v0', name: this.name, root: this.root, slug: this.slug, store: this.dir,
      snapshot: f ? { ...f.snapshot, root: undefined } : null, revision: f?.revision ?? null, summary: f?.summary ?? null,
      timings: f?.timings ?? null, levels: LEVELS, modules: f ? f.nodes.filter(n => n.kind === 'module').map(n => ({ id: n.id, label: n.label, files: n.files, weight: n.weight })).sort((a, b) => b.weight - a.weight) : [],
      symbols: f?.symbols ? (f.symbols.available ? 'ready' : 'unavailable') : 'pending',
      ledger: { calls: this.ledger.calls.length, costUsd: this.ledger.costUsd },
      consent: consent ? { grantedAt: consent.grantedAt, budgetUsdPerDay: consent.budgetUsdPerDay } : null,
      modelCalls: 0,
    };
  }
}

export function createServer({ project, consent = null, token = crypto.randomBytes(32).toString('hex'), port = 8875 }) {
  const send = (res, status, body, type = 'application/json; charset=utf-8') => { res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'content-security-policy': CSP }); res.end(type.startsWith('application/json') ? JSON.stringify(body) : body); };
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
      if (req.method === 'GET' && url.pathname === '/api/facts') return project.facts ? send(res, 200, project.facts) : send(res, 404, { error: 'No snapshot yet' });
      if (req.method === 'GET' && url.pathname === '/api/sketch') {
        if (!project.facts) return send(res, 404, { error: 'No snapshot yet' });
        const level = Number(url.searchParams.get('level') ?? 1); if (!Number.isInteger(level) || level < 0 || level > 3) return send(res, 400, { error: 'level must be 0..3' });
        const focus = url.searchParams.get('focus'); if (focus && !/^mod:[\w./()@-]{1,120}$/.test(focus)) return send(res, 400, { error: 'bad focus id' });
        const { svg, renderMs } = await project.sketch(level, focus);
        res.setHeader('x-trazo-render-ms', String(renderMs));
        return send(res, 200, svg, 'image/svg+xml; charset=utf-8');
      }
      if (req.method === 'POST' && url.pathname === '/api/snapshot') { const { facts, unchanged } = await project.snapshot(); return send(res, 200, { snapshotId: facts.snapshot.id, unchanged, timings: facts.timings, modelCalls: 0 }); }
      return send(res, 404, { error: 'Not found' });
    } catch (e) { if (!res.headersSent) send(res, 500, { error: 'Trazo request failed safely.' }); else res.destroy(); }
  });
  server.port = port; server.token = token;
  return server;
}
