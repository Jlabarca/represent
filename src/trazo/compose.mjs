// Trazo compose: the explanation laid out as a chapter infographic (SVG templates with slots) and as Mermaid text.
// Captions are the model's words with citations attached; nothing precise goes into raster.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, colorIndex } from './sketch.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const TPL = path.join(here, '../../web/trazo/templates');
const templates = { infographic: fs.readFileSync(path.join(TPL, 'infographic.svg'), 'utf8'), chapter: fs.readFileSync(path.join(TPL, 'chapter.svg'), 'utf8') };

export function fill(template, slots) { return template.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in slots ? String(slots[k]) : '')); }

/** Greedy word wrap by character count; returns at most maxLines lines, the last one clipped with an ellipsis. */
export function wrap(text, maxChars, maxLines) {
  const words = String(text ?? '').replace(/\s+/g, ' ').trim().split(' ');
  const lines = []; let cur = '';
  for (const w of words) {
    if (!cur) cur = w; else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w; else { lines.push(cur); cur = w; if (lines.length === maxLines) break; }
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  if (lines.length === maxLines && (words.join(' ').length > lines.join(' ').length)) lines[maxLines - 1] = lines[maxLines - 1].slice(0, Math.max(1, maxChars - 1)) + '…';
  return lines;
}

const style = () => `<style>
.t-bg{fill:var(--t-paper,#ffffff)} .t-ink{fill:var(--t-ink,#1a2233)} .t-dim{fill:var(--t-ink-dim,#5b6677)} .t-faint{fill:var(--t-ink-faint,#98a2b3)}
.t-box{fill:var(--t-box,#f4f6f9);stroke:var(--t-line,#aeb8c6);stroke-width:1.4} .t-mark{fill:var(--t-marker,#ffd23f)}
.t-arrow{stroke:var(--t-accent,#2f6fed);fill:none;stroke-width:1.4;opacity:.75} .t-arrow-head{fill:var(--t-accent,#2f6fed)}
.c0{fill:var(--t-c0,#4f7cff)}.c1{fill:var(--t-c1,#2fb57c)}.c2{fill:var(--t-c2,#e0862b)}.c3{fill:var(--t-c3,#b958c4)}.c4{fill:var(--t-c4,#1fa8b8)}.c5{fill:var(--t-c5,#d9534f)}.c6{fill:var(--t-c6,#8a9a2d)}.c7{fill:var(--t-c7,#6c7a90)}
text{font-family:var(--t-mono,"IBM Plex Mono",Consolas,monospace)} .lbl{font-size:14px;font-weight:600} .sub{font-size:11px} .big{font-size:20px;font-weight:700} .tiny{font-size:10px} .cap{font-size:12px}
a.cite text{fill:var(--t-accent,#2f6fed);text-decoration:underline} a.cite:hover text{fill:var(--t-ink,#1a2233)}
</style>`;
const defs = () => `<defs><marker id="i-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="t-arrow-head"/></marker></defs>`;

const COLS = 2, CARD_W = 476, CARD_H = 196, GAP = 16, TOP = 68, LEFT = 16;

function cardSlots(ch, i, citeIndex) {
  const col = i % COLS, row = Math.floor(i / COLS);
  const x = LEFT + col * (CARD_W + GAP), y = TOP + row * (CARD_H + GAP), tx = x + 16;
  const dots = ['high', 'medium', 'low'].indexOf(ch.confidence);
  const dotSvg = [0, 1, 2].map(k => `<circle class="${k < 3 - dots ? 't-mark' : 't-faint'}" cx="${x + CARD_W - 40 + k * 10}" cy="${y + 20}" r="3"${k < 3 - dots ? '' : ' fill-opacity=".35"'}><title>${esc(`confidence ${ch.confidence}`)}</title></circle>`).join('');
  const summary = wrap(ch.summary, 60, 4).map((l, k) => `<text class="t-ink cap" x="${tx}" y="${y + 66 + k * 16}">${esc(l)}</text>`).join('');
  const current = /^Unknown\b/i.test(ch.currentState) ? 'current: unknown from the captured evidence' : `current: ${ch.currentState}`;
  const state = wrap(current, 62, 2).map((l, k) => `<text class="t-dim sub" x="${tx}" y="${y + 138 + k * 14}">${esc(l)}</text>`).join('');
  const seen = new Set(); const cites = [];
  for (const c of [...ch.cites.current, ...ch.cites.design, ...ch.cites.next, ...ch.cites.topic]) { const key = `${c.path}:${c.startLine}`; if (seen.has(key)) continue; seen.add(key); cites.push(c); if (cites.length === 3) break; }
  let cx = tx; let citeSvg = '';
  for (const c of cites) {
    const label = `${path.posix.basename(c.path)}:${c.startLine}`; const w = label.length * 6.2 + 10;
    if (cx + w > x + CARD_W - 12) break;
    const idx = citeIndex(ch.id, c);
    citeSvg += `<a class="cite" href="#cite/${esc(idx)}" data-cite="${esc(idx)}"><text class="tiny" x="${cx}" y="${y + CARD_H - 12}">${esc(label)}<title>${esc(`${c.path} lines ${c.startLine}–${c.endLine}`)}</title></text></a>`;
    cx += w;
  }
  if (seen.size > cites.length || ch.cites.topic.length + ch.cites.current.length > 3) citeSvg += `<text class="t-faint tiny" x="${cx}" y="${y + CARD_H - 12}">${esc(`+${Math.max(0, seen.size - cites.length)} more`)}</text>`;
  return { id: ch.id, node: ch.node ?? '', x, y, w: CARD_W, h: CARD_H, tx, ty: y + 26, moduleY: y + 42, color: `c${colorIndex(ch.node ?? ch.id)}`, label: esc(ch.label.slice(0, 48)), module: esc(ch.node ? ch.node.replace(/^mod:/, '') : 'no module match'), dots: dotSvg, summary, state, cites: citeSvg, cx: x + CARD_W / 2, cy: y + CARD_H / 2 };
}

/** Arrows between chapters whose modules import each other (module-level import edges in the facts). */
function chapterArrows(cards, chapters, facts) {
  const byModule = new Map(); chapters.forEach((ch, i) => { for (const m of ch.modules) if (!byModule.has(m)) byModule.set(m, i); });
  const drawn = new Set(); let out = '';
  for (const e of facts.edges) {
    if (e.kind !== 'imports' || !e.from.startsWith('mod:')) continue;
    const a = byModule.get(e.from), b = byModule.get(e.to);
    if (a === undefined || b === undefined || a === b || drawn.has(`${a}-${b}`)) continue;
    drawn.add(`${a}-${b}`);
    const A = cards[a], B = cards[b]; const dx = B.cx - A.cx, dy = B.cy - A.cy, len = Math.hypot(dx, dy) || 1;
    const sx = A.cx + (dx / len) * 120, sy = A.cy + (dy / len) * 70, ex = B.cx - (dx / len) * 120, ey = B.cy - (dy / len) * 70;
    const nx = -dy / len, ny = dx / len, bend = 24;
    out += `<path class="t-arrow" d="M${sx.toFixed(1)} ${sy.toFixed(1)} Q${((sx + ex) / 2 + nx * bend).toFixed(1)} ${((sy + ey) / 2 + ny * bend).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" marker-end="url(#i-arr)"><title>${esc(`${e.from} imports ${e.to} (${e.count})`)}</title></path>`;
  }
  return out;
}

/** A stable index for a citation inside the explanation, resolvable by the viewer: chapter/field/position. */
export function citationIndex(explanation) {
  const map = new Map(); const list = [];
  for (const ch of explanation.chapters) for (const field of ['current', 'design', 'next', 'topic']) ch.cites[field].forEach((c, k) => { const id = `${ch.id}/${field}/${k}`; list.push({ id, chapter: ch.id, field, ...c }); const key = `${ch.id}|${c.path}:${c.startLine}`; if (!map.has(key)) map.set(key, id); });
  return { list, lookup: (chapterId, c) => map.get(`${chapterId}|${c.path}:${c.startLine}`) ?? '' };
}

export function renderInfographic(facts, explanation) {
  const chapters = explanation.chapters.slice(0, 6);
  const { lookup } = citationIndex(explanation);
  const cards = chapters.map((ch, i) => cardSlots(ch, i, lookup));
  const rows = Math.ceil(cards.length / COLS);
  const legendY = TOP + rows * (CARD_H + GAP) + 10;
  const height = legendY + 36;
  const rev = facts.revision.sha ? `${facts.revision.sha.slice(0, 7)}${facts.revision.dirty ? ' +dirty' : ''}` : 'no git';
  const cost = explanation.cacheHit ? 'cached · $0' : explanation.cost.reported ? `$${explanation.cost.usd.toFixed(4)}` : `cost not reported (est. $${explanation.cost.estimateUsd})`;
  const stale = explanation.snapshotId !== facts.snapshot.id ? ' · STALE: folder changed since this explanation' : '';
  const meta = `${chapters.length} chapters · ${explanation.model} · ${cost} · ${explanation.excerpts.length} excerpts${explanation.warnings.length ? ` · ${explanation.warnings.length} withheld claims` : ''}`;
  const freshness = `snapshot ${rev} captured ${facts.snapshot.capturedAt.slice(0, 16).replace('T', ' ')} · explained ${explanation.createdAt.slice(0, 16).replace('T', ' ')} · prompt ${explanation.promptVersion}${stale}`;
  return fill(templates.infographic, {
    height, style: style(), defs: defs(), title: esc(facts.snapshot.name), meta: esc(meta),
    arrows: chapterArrows(cards, chapters, facts), cards: cards.map(c => fill(templates.chapter, c)).join('\n'),
    legendY, legendDotY: legendY - 3, freshY: legendY + 22, freshness: esc(freshness),
  });
}

const mmq = s => String(s ?? '').replace(/"/g, '#quot;').replace(/[<>]/g, '');

/** Mermaid flowchart: chapters as nodes, module imports as edges. Agent-readable; rendered by whoever wants to. */
export function renderMermaid(facts, explanation) {
  const chapters = explanation.chapters.slice(0, 6);
  const lines = ['flowchart LR', `  %% ${mmq(facts.snapshot.name)} · ${explanation.model} · snapshot ${facts.snapshot.id.slice(0, 12)}`];
  chapters.forEach((ch, i) => lines.push(`  ch${i}["${mmq(ch.label)}<br/><small>${mmq(wrap(ch.summary, 48, 2).join(' '))}</small>"]`));
  const byModule = new Map(); chapters.forEach((ch, i) => { for (const m of ch.modules) if (!byModule.has(m)) byModule.set(m, i); });
  const drawn = new Set();
  for (const e of facts.edges) {
    if (e.kind !== 'imports' || !e.from.startsWith('mod:')) continue;
    const a = byModule.get(e.from), b = byModule.get(e.to);
    if (a === undefined || b === undefined || a === b || drawn.has(`${a}-${b}`)) continue;
    drawn.add(`${a}-${b}`); lines.push(`  ch${a} -->|${mmq(e.from.replace(/^mod:/, ''))} → ${mmq(e.to.replace(/^mod:/, ''))}| ch${b}`);
  }
  chapters.forEach((ch, i) => { if (ch.confidence === 'low') lines.push(`  ch${i}:::low`); });
  if (chapters.some(ch => ch.confidence === 'low')) lines.push('  classDef low stroke-dasharray: 4 3');
  return lines.join('\n') + '\n';
}
