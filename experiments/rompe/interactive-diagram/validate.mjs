import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=dirname(fileURLToPath(import.meta.url));
const app=JSON.parse(readFileSync(resolve(root,'explainer.config.json'),'utf8'));
assert.equal(app.tabs.length,10);
let count=0;
for(const t of app.tabs){const ids=new Set(t.blocks.map(b=>b.id));assert.equal(ids.size,t.blocks.length);for(const b of t.blocks){assert(b.label.split('\n').length<=2);assert(b.responsibilities.some(r=>r.includes('sources.html#')));count++;}for(const e of t.edges){assert(ids.has(e.from));assert(ids.has(e.to));}}
const risks=app.tabs.find(t=>t.id==='risk');assert(risks.blocks.find(b=>b.id==='red').description.includes('if flagged'));assert(risks.blocks.find(b=>b.id==='abyss').description.includes('vanilla'));
assert.equal(app.tabs.find(t=>t.id==='events').blocks.length,7);
const poster=JSON.parse(readFileSync(resolve(root,'poster.config.json'),'utf8'));
for(const band of poster.bands)for(const b of band.blocks)for(const s of [b.title,...b.lines])assert(s.split(/\s+/).length<=6,`Poster label too long: ${s}`);
for(const name of ['explainer','poster']){const s=readFileSync(resolve(root,`${name}.html`),'utf8');for(const m of s.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);assert(!/<script[^>]+src=/i.test(s));}
console.log(`PASS: 10 views, ${count} cards, 7 events, source links, <=2 authored label lines, <=6-word poster labels, valid edge IDs, JS syntax, no external scripts. Browser layout is NOT validated.`);
