// Trazo sketch: deterministic SVG from the fact graph, four levels, stable positions by identity.
// Colors come from CSS variables so the page theme applies; fallbacks keep an exported file readable.
import { LEVELS } from './facts.mjs';

export const W = 1000;
const PAD = 16;
const MAP_H = 520;
const STRIP_Y = 584;
const STRIP_H = 44;
const H = 680;

export function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
const clip = (s, n) => { s = String(s ?? ''); return s.length > n ? `${s.slice(0, Math.max(1, n - 1))}…` : s; };
const colorIndex = id => { let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % 8; };

/** Strip treemap in id order: rows of modules, widths by weight. Stable because order is by id and weight is log-bucketed. */
export function layoutModules(modules, { x = PAD, y = 64, width = W - 2 * PAD, height = MAP_H - 64, gap = 8 } = {}) {
  const items = [...modules].sort((a, b) => a.id.localeCompare(b.id, 'en'));
  if (!items.length) return [];
  const total = items.reduce((n, m) => n + m.weight, 0);
  const perRow = Math.max(1, Math.floor(width / 118));
  const rows = Math.max(1, Math.min(items.length, Math.max(Math.ceil(items.length / perRow), Math.round(Math.sqrt(items.length / 1.6)))));
  const target = total / rows;
  const groups = []; let cur = [], acc = 0;
  const maxPerRow = Math.ceil(items.length / rows) + 1;
  for (const m of items) { cur.push(m); acc += m.weight; if ((acc >= target || cur.length >= maxPerRow) && groups.length < rows - 1) { groups.push(cur); cur = []; acc = 0; } }
  if (cur.length) groups.push(cur);
  const rects = [];
  const rowH = (height - gap * (groups.length - 1)) / groups.length;
  groups.forEach((g, r) => {
    const gw = g.reduce((n, m) => n + m.weight, 0);
    let cx = x;
    g.forEach((m, i) => {
      const avail = width - gap * (g.length - 1);
      const w = Math.max(40, avail * (0.45 / g.length + 0.55 * (m.weight / gw)));
      rects.push({ id: m.id, x: +cx.toFixed(1), y: +(y + r * (rowH + gap)).toFixed(1), w: +w.toFixed(1), h: +rowH.toFixed(1), module: m });
      cx += w + gap;
    });
    const over = cx - gap - (x + width);
    if (over > 0.5) { const scale = width / (cx - gap - x); let sx = x; for (let i = rects.length - g.length; i < rects.length; i++) { rects[i].x = +sx.toFixed(1); rects[i].w = +(rects[i].w * scale).toFixed(1); sx += rects[i].w + gap; } }
  });
  return rects;
}

function style() {
  return `<style>
.t-bg{fill:var(--t-paper,#ffffff)}
.t-ink{fill:var(--t-ink,#1a2233)} .t-dim{fill:var(--t-ink-dim,#5b6677)} .t-faint{fill:var(--t-ink-faint,#98a2b3)}
.t-box{fill:var(--t-box,#f4f6f9);stroke:var(--t-line,#aeb8c6);stroke-width:1.4}
.t-box.poster{stroke-width:2}
.t-arrow{stroke:var(--t-accent,#2f6fed);fill:none;stroke-width:1.6}
.t-arrow.candidate{stroke-dasharray:5 4;opacity:.8}
.t-arrow-head{fill:var(--t-accent,#2f6fed)}
.t-mark{fill:var(--t-marker,#ffd23f)}
.c0{fill:var(--t-c0,#4f7cff)}.c1{fill:var(--t-c1,#2fb57c)}.c2{fill:var(--t-c2,#e0862b)}.c3{fill:var(--t-c3,#b958c4)}.c4{fill:var(--t-c4,#1fa8b8)}.c5{fill:var(--t-c5,#d9534f)}.c6{fill:var(--t-c6,#8a9a2d)}.c7{fill:var(--t-c7,#6c7a90)}
text{font-family:var(--t-mono,"IBM Plex Mono",Consolas,monospace)}
.lbl{font-size:14px;font-weight:600} .sub{font-size:11px} .big{font-size:20px;font-weight:700} .tiny{font-size:10px} .cap{font-size:12px}
</style>`;
}

function header(facts, level, extra = '') {
  const rev = facts.revision.sha ? `${facts.revision.sha.slice(0, 7)}${facts.revision.dirty ? ' +dirty' : ''}` : 'no git';
  return `<text class="t-ink big" x="${PAD}" y="34">${esc(clip(facts.snapshot.name, 40))}</text>
<text class="t-dim sub" x="${PAD}" y="52">${esc(`${LEVELS[level]} · ${facts.snapshot.files} files · ${facts.summary.modules} modules · ${rev}${extra}`)}</text>`;
}

function arrows(rects, edges, levelFilter) {
  const by = new Map(rects.map(r => [r.id, r]));
  let out = '';
  for (const e of edges.filter(e => e.kind === 'imports' && e.from.startsWith('mod:') && e.to.startsWith('mod:') && levelFilter(e))) {
    const a = by.get(e.from), b = by.get(e.to); if (!a || !b || a === b) continue;
    const ax = a.x + a.w / 2, ay = a.y + a.h / 2, bx = b.x + b.w / 2, by_ = b.y + b.h / 2;
    const dx = bx - ax, dy = by_ - ay; const len = Math.hypot(dx, dy) || 1;
    const sx = ax + (dx / len) * Math.min(a.w, a.h) * 0.42, sy = ay + (dy / len) * Math.min(a.w, a.h) * 0.42;
    const ex = bx - (dx / len) * Math.min(b.w, b.h) * 0.42, ey = by_ - (dy / len) * Math.min(b.w, b.h) * 0.42;
    const cand = e.candidates && e.candidates === e.count ? ' candidate' : '';
    const bend = Math.min(60, len * 0.18); const nx = -dy / len, ny = dx / len;
    const cx = (sx + ex) / 2 + nx * bend, cy = (sy + ey) / 2 + ny * bend;
    out += `<path class="t-arrow${cand}" d="M${sx.toFixed(1)} ${sy.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" marker-end="url(#t-arr)"/>`;
    if (e.count > 1) out += `<text class="t-dim tiny" x="${((sx + ex) / 2 + nx * bend * 0.6).toFixed(1)}" y="${((sy + ey) / 2 + ny * bend * 0.6 - 3).toFixed(1)}" text-anchor="middle">${e.count}</text>`;
  }
  return out;
}

function historyStrip(facts) {
  const commits = facts.nodes.filter(n => n.kind === 'commit').sort((a, b) => a.at.localeCompare(b.at));
  if (!commits.length) return `<text class="t-faint sub" x="${PAD}" y="${STRIP_Y + 28}">no git history in scope</text>`;
  const touches = new Map(); for (const e of facts.edges) if (e.kind === 'touches') { const t = touches.get(e.from) ?? []; t.push(e); touches.set(e.from, t); }
  const total = commits.reduce((n, c) => n + c.weight, 0);
  const width = W - 2 * PAD - 70; let x = PAD + 70; let out = `<text class="t-faint sub" x="${PAD}" y="${STRIP_Y + 27}">history</text>`;
  commits.forEach((c, i) => {
    const w = Math.max(6, (width - 2 * (commits.length - 1)) * (c.weight / total));
    const top = (touches.get(c.id) ?? []).sort((a, b) => b.count - a.count)[0];
    const cls = top ? `c${colorIndex(top.to)}` : 'c7';
    const last = i === commits.length - 1;
    out += `<rect class="${last ? 't-mark' : cls}" x="${x.toFixed(1)}" y="${STRIP_Y}" width="${w.toFixed(1)}" height="${STRIP_H}" rx="2"><title>${esc(`${c.sha.slice(0, 7)} ${c.at.slice(0, 10)} ${c.label}`)}</title></rect>`;
    x += w + 2;
  });
  const last = commits.at(-1);
  out += `<text class="t-dim tiny" x="${PAD + 70}" y="${STRIP_Y + STRIP_H + 16}">${esc(`${commits.length} commits · latest ${last.at.slice(0, 10)} · ${clip(last.label, 60)}`)}</text>`;
  return out;
}

function moduleBox(r, { poster = false, files = [], showExternals = false } = {}) {
  const m = r.module; const cls = `c${colorIndex(r.id)}`;
  const langs = Object.entries(m.langs ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([l]) => l).join(' ');
  let out = `<g data-node="${esc(r.id)}"><rect class="t-box${poster ? ' poster' : ''}" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="4"/><rect class="${cls}" x="${r.x}" y="${r.y}" width="6" height="${r.h}" rx="2"/>`;
  const maxChars = Math.max(4, Math.floor((r.w - 20) / (poster ? 11 : 8.5)));
  out += `<text class="t-ink ${poster ? 'big' : 'lbl'}" x="${r.x + 14}" y="${r.y + (poster ? 30 : 22)}">${esc(clip(m.label, maxChars))}</text>`;
  if (r.h > 44) out += `<text class="t-dim sub" x="${r.x + 14}" y="${r.y + (poster ? 50 : 38)}">${esc(clip(`${m.files} files · ${langs}`, maxChars + 2))}</text>`;
  let y = r.y + 56;
  for (const f of files) { if (y + 12 > r.y + r.h - 6) break; out += `<text class="t-dim cap" x="${r.x + 14}" y="${y}">${esc(clip(f.label, maxChars))}${f.exports ? `<tspan class="t-faint"> ·${f.exports}</tspan>` : ''}</text>`; y += 15; }
  if (showExternals && m.externals?.length && y + 12 <= r.y + r.h - 6) out += `<text class="t-faint tiny" x="${r.x + 14}" y="${y}">${esc(clip(`uses ${m.externals.slice(0, 3).map(e => e.name).join(', ')}`, maxChars + 4))}</text>`;
  return out + '</g>';
}

function defs() { return `<defs><marker id="t-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="t-arrow-head"/></marker></defs>`; }
function frame(body, h = H) { return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${h}" width="100%" role="img" aria-label="Trazo sketch">${style()}${defs()}<rect class="t-bg" x="0" y="0" width="${W}" height="${h}"/>${body}</svg>`; }

export function renderSketch(facts, level = 1, { focus = null } = {}) {
  const L = Math.max(0, Math.min(3, Number(level) || 0));
  const modules = facts.nodes.filter(n => n.kind === 'module');
  if (L === 0) {
    const top = [...modules].sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id, 'en'));
    const shown = top.slice(0, 5); const rest = top.slice(5);
    const items = rest.length ? [...shown, { id: 'mod:(other)', label: `${rest.length} more`, weight: Math.max(1, Math.round(rest.reduce((n, m) => n + m.weight, 0) * 0.6)), files: rest.reduce((n, m) => n + m.files, 0), langs: {} }] : shown;
    const rects = layoutModules(items, { y: 96, height: MAP_H - 96 - 20 });
    const sentence = clip(facts.summary.sentence, 118);
    const body = header(facts, 0) + `<text class="t-ink cap" x="${PAD}" y="80">${esc(sentence)}</text>` + rects.map(r => moduleBox(r, { poster: true })).join('') + historyStrip(facts);
    return frame(body);
  }
  const sorted = [...modules].sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id, 'en'));
  const shown = sorted.slice(0, 24); const rest = sorted.slice(24);
  const items = rest.length ? [...shown, { id: 'mod:(other)', label: `${rest.length} more`, weight: Math.max(1, Math.round(rest.reduce((n, m) => n + m.weight, 0) * 0.5)), files: rest.reduce((n, m) => n + m.files, 0), langs: {} }] : shown;
  if (L === 1) {
    const rects = layoutModules(items);
    const body = header(facts, 1) + rects.map(r => moduleBox(r)).join('') + arrows(rects, facts.edges, () => true) + historyStrip(facts);
    return frame(body);
  }
  if (L === 2) {
    const rects = layoutModules(items, { height: MAP_H - 64 });
    const filesOf = new Map();
    for (const n of facts.nodes) if (n.kind === 'file') { const l = filesOf.get(n.module) ?? []; l.push(n); filesOf.set(n.module, l); }
    const body = header(facts, 2, ` · ${facts.edges.filter(e => e.kind === 'imports' && e.from.startsWith('file:')).length} file imports`) + rects.map(r => {
      const fl = (filesOf.get(r.id) ?? []).sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id, 'en'));
      const cap = Math.max(0, Math.floor((r.h - 62) / 15));
      const files = fl.slice(0, cap); if (fl.length > cap && cap > 0) files[cap - 1] = { label: `+${fl.length - cap + 1} more`, exports: 0 };
      return moduleBox(r, { files, showExternals: true });
    }).join('') + arrows(rects, facts.edges, () => true) + historyStrip(facts);
    return frame(body);
  }
  // Level 3: deep. Symbols of the focused module (or the heaviest), with calls among them.
  const target = focus && modules.find(m => m.id === focus) ? focus : sorted[0]?.id;
  const sym = facts.symbols;
  let body = header(facts, 3, ` · ${esc(target ?? '')}`);
  if (!sym?.available) {
    body += `<text class="t-dim cap" x="${PAD}" y="96">${esc(sym?.reason ?? 'Symbols are computed on demand for JavaScript and TypeScript scopes.')}</text>`;
    body += `<text class="t-faint sub" x="${PAD}" y="118">Modules, files and imports are still shown at the engineer level.</text>`;
    return frame(body, 160);
  }
  const list = (sym.byModule[target] ?? []).sort((a, b) => Number(b.exported) - Number(a.exported) || a.name.localeCompare(b.name, 'en')).slice(0, 28);
  const ids = new Set(list.map(s => s.id));
  const calls = sym.calls.filter(c => ids.has(c.to) || ids.has(c.from));
  const inbound = new Map(); for (const c of calls) if (ids.has(c.to)) inbound.set(c.to, (inbound.get(c.to) ?? 0) + 1);
  const tests = new Map(); for (const t of sym.tests) if (ids.has(t.to)) tests.set(t.to, (tests.get(t.to) ?? 0) + 1);
  const colW = 470; let x = PAD, y = 96, i = 0;
  body += `<text class="t-dim cap" x="${PAD}" y="76">${esc(`${list.length} of ${(sym.byModule[target] ?? []).length} symbols · ${calls.length} calls in scope · exported first`)}</text>`;
  for (const s of list) {
    if (i === 14) { x += colW; y = 96; }
    const tag = `${s.kind}${s.exported ? ' export' : ''}`;
    body += `<rect class="${inbound.get(s.id) ? 'c1' : 'c7'}" x="${x}" y="${y - 9}" width="4" height="12" rx="1"/>`;
    body += `<text class="t-ink cap" x="${x + 10}" y="${y}">${esc(clip(s.name, 34))}<tspan class="t-faint tiny"> ${esc(tag)} · ${esc(s.file.split('/').pop())}:${s.line}</tspan></text>`;
    body += `<text class="t-dim tiny" x="${x + colW - 20}" y="${y}" text-anchor="end">${inbound.get(s.id) ? `← ${inbound.get(s.id)}` : ''}${tests.get(s.id) ? ` · ${tests.get(s.id)} test` : ''}</text>`;
    y += 22; i++;
  }
  const h = 96 + 22 * Math.min(14, list.length) + 40;
  return frame(body, Math.max(160, h));
}
