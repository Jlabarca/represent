import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Visu,capture,detectStyle,validateManifest} from '../src/visu/core.mjs';
import {Ghost,imageInfo} from '../src/visu/ghost.mjs';
import {serve} from '../src/visu/server.mjs';

async function fixture(t) {
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'visu-test-')),root=path.join(dir,'source'),store=path.join(dir,'store');await fs.mkdir(root);
  t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  await fs.writeFile(path.join(root,'design.md'),'# Story\nA documented retro pixel-art world.\n');
  await fs.writeFile(path.join(root,'progress.md'),'Plan pending.\n');
  const manifest={id:'test',name:'Test',description:'Fixture',root,sources:[{path:'design.md',role:'art'},{path:'progress.md',role:'detail'}],regions:[{id:'story',label:'Story',paths:['design.md','progress.md']}]};
  let calls=0;
  const ghost={model:'test-double',generate:async()=>{calls++;return {bytes:Buffer.from(`test-double-art-${calls}`),mime:'image/png',width:512,height:512,metrics:{costUsd:null}};}};
  const create=opts=>new Visu({store,manifests:[manifest],ghost,maxCalls:3,...opts});
  return {root,store,manifest,create,visu:create(),calls:()=>calls};
}

test('capture/no-op/generate/cache/restart/overlay/stale form one coherent history',async t=>{
  const f=await fixture(t);let b=await f.visu.scan('test');assert.equal(b.result.classification,'initial');
  const id=b.latestSnapshotId;assert.equal(b.views.at(-1).style.profile,'retro');
  await f.visu.generate('test');const saved=await fs.readFile(f.visu.file('test'),'utf8');
  b=await f.create().scan('test');assert.equal(b.latestSnapshotId,id);assert.equal(b.result.classification,'unchanged');assert.equal(await fs.readFile(f.visu.file('test'),'utf8'),saved);
  assert.equal((await f.create().generate('test')).result.imageCalls,0);assert.equal(f.calls(),1);
  await fs.writeFile(path.join(f.root,'progress.md'),'Plan complete, source reported.\n');
  b=await f.visu.scan('test');assert.equal(b.result.classification,'details-only');assert.equal(b.views.at(-1).freshness,'fresh');assert.equal(b.views.at(-1).art.sourceSnapshotId,id);assert.equal(f.calls(),1);
  assert.match(b.views.at(-1).regions[0].sources[1].text,/complete/);
  const exported=await f.visu.export('test');assert.equal(Object.keys(exported.assets).length,1);assert.match(exported.snapshots[0].sources.find(s=>s.path==='progress.md').text,/pending/);
  await fs.writeFile(path.join(f.root,'design.md'),'# New story\nA changed retro pixel-art world.\n');
  b=await f.visu.scan('test');assert.equal(b.result.classification,'art-changed');assert.equal(b.views.at(-1).freshness,'stale');
  await f.visu.generate('test');assert.equal(f.calls(),2);assert.equal((await f.visu.bundle('test')).views.at(-1).freshness,'fresh');
  const events=(await fs.readFile(path.join(f.store,'test/events.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(new Set(events.map(e=>e.id)).size,events.length);assert.ok(events.length>=5);
});

test('style and recipe revisions keep source identity but invalidate depicted art',async t=>{
  const f=await fixture(t);await f.visu.scan('test');await f.visu.generate('test');const before=await f.visu.bundle('test');
  const changed=await f.visu.style('test','editorial');assert.equal(changed.latestSnapshotId,before.latestSnapshotId);assert.equal(changed.views.at(-1).freshness,'stale');assert.equal(changed.views.at(-1).style.confidence,'override');
  const reverted=await f.visu.style('test','auto');assert.equal(reverted.views.find(v=>v.id===reverted.latestViewId).freshness,'fresh');
  f.manifest.regions[0].label='Changed chapter';const recipe=await f.visu.scan('test');assert.equal(recipe.latestSnapshotId,before.latestSnapshotId);assert.equal(recipe.result.classification,'view-changed');assert.equal(recipe.views.at(-1).freshness,'stale');
});

test('outside-scope changes do nothing; removed depicted source becomes stale',async t=>{
  const f=await fixture(t);await f.visu.scan('test');await f.visu.generate('test');await fs.writeFile(path.join(f.root,'ignored.md'),'ignore me');
  assert.equal((await f.visu.scan('test')).result.classification,'unchanged');await fs.unlink(path.join(f.root,'design.md'));
  const b=await f.visu.scan('test');assert.equal(b.views.at(-1).freshness,'stale');assert.equal(b.views.at(-1).regions[0].status,'Missing evidence');
});

test('scope rejects traversal, secrets, binaries, symlinks and oversized input',async t=>{
  const f=await fixture(t);
  for(const p of ['../secret.md','.env','keys/a.pem','C:/thing','a\\b']) assert.throws(()=>validateManifest({...f.manifest,sources:[{path:p,role:'art'}]}));
  await fs.writeFile(path.join(f.root,'design.md'),Buffer.from([0,1,2]));await assert.rejects(capture(f.manifest),/Binary/);
  await fs.writeFile(path.join(f.root,'design.md'),'a'.repeat(300001));await assert.rejects(capture(f.manifest),/bounded/);
  const other=path.join(path.dirname(f.root),'other');await fs.mkdir(other);await fs.writeFile(path.join(other,'x.md'),'outside');
  await fs.symlink(other,path.join(f.root,'link'),'junction');
  await assert.rejects(capture({...f.manifest,sources:[{path:'link/x.md',role:'art'}],regions:[]}),/symlink|junction/);
  assert.throws(()=>f.create({store:path.join(f.root,'store')}),/outside/);
});

test('neutral fallback, conflicting evidence and override are explicit',()=>{
  const s=text=>[{path:'style.txt',role:'style',text,startLine:1}];
  assert.equal(detectStyle(s('unrelated')).profile,'neutral');assert.equal(detectStyle(s('retro pixel-art and Cormorant')).profile,'neutral');
  assert.equal(detectStyle(s('Cormorant Garamond and 247 244 239')).confidence,'high');assert.equal(detectStyle(s('nothing'),'retro').confidence,'override');
});

test('role changes invalidate art; absent evidence prevents generation; source alias cannot be store',async t=>{
  const f=await fixture(t);await f.visu.scan('test');await f.visu.generate('test');f.manifest.sources[0].role='style';
  const b=await f.visu.scan('test');assert.equal(b.views.at(-1).freshness,'stale');
  await fs.unlink(path.join(f.root,'design.md'));await f.visu.scan('test');await assert.rejects(f.visu.generate('test'),/missing/);
  const alias=path.join(path.dirname(f.root),'alias');await fs.symlink(f.root,alias,'junction');assert.throws(()=>f.create({store:path.join(alias,'output')}),/outside/);
  if(process.platform==='win32')assert.throws(()=>f.create({store:f.root.toUpperCase()}),/outside/);
});

test('truncated PNG headers are not accepted as generated art',()=>{
  const bytes=Buffer.alloc(24);Buffer.from([137,80,78,71,13,10,26,10]).copy(bytes);bytes.writeUInt32BE(256,16);bytes.writeUInt32BE(256,20);assert.throws(()=>imageInfo(bytes,'image/png'));
});

test('story citations are captured excerpts and invalid model references fail closed',async()=>{
  const source={path:'story.md',role:'art',startLine:10,text:'A world where communities gather, craft, and trade.'};
  const region={id:'a',label:'World',sources:[source]};
  const adapter=index=>new Ghost({key:'fake',fetcher:async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({regions:[{id:'a',summary:'A world of trade.',evidenceIndex:index}]})}}]}),{status:200})});
  const valid=await adapter(0).summarize([region],[source]);assert.equal(valid.regions[0].evidence[0].quote,source.text);assert.equal(valid.regions[0].evidence[0].startLine,10);
  await assert.rejects(adapter(99).summarize([region],[source]),/outside/);
});

test('captured checklist counts are detail-only and scene uses the shared envelope',async t=>{
  const f=await fixture(t);await fs.writeFile(path.join(f.root,'progress.md'),'- [x] Done\n- [ ] Pending\n');await f.visu.scan('test');await f.visu.generate('test');
  await fs.writeFile(path.join(f.root,'progress.md'),'- [x] Done\n- [x] Pending\n');const b=await f.visu.scan('test');assert.equal(b.result.classification,'details-only');assert.deepEqual(b.views.at(-1).regions[0].progress,[{path:'progress.md',done:2,total:2}]);assert.equal(f.calls(),1);
  const scene=JSON.parse(await fs.readFile(path.join(f.store,'test/scene.yaml'),'utf8'));assert.equal(scene.schema,'represent.scene/v0');assert.equal(scene.view,'specific');assert.equal(scene.nodes[0].type,'Workspace');assert.equal(scene.scope.snapshot,b.latestSnapshotId);
});

test('failure ledger preserves unknown cost and limits retries; corruption is not erased',async t=>{
  const f=await fixture(t);const failed=f.create({maxCalls:1,ghost:{generate:async()=>{const e=new Error('bad image');e.metrics={costUsd:0.04};throw e;}}});
  await failed.scan('test');await assert.rejects(failed.generate('test'),/bad image/);const b=await failed.bundle('test');assert.equal(b.ledger[0].status,'failed');assert.equal(b.ledger[0].costUsd,0.04);
  await assert.rejects(failed.generate('test'),/limit/);assert.equal((await failed.bundle('test')).ledger.length,1);
  await fs.writeFile(failed.file('test'),'broken');await assert.rejects(failed.state('test'));assert.equal(await fs.readFile(failed.file('test'),'utf8'),'broken');
});

test('one concurrent operation per project; duplicate generation never bills twice',async t=>{
  const f=await fixture(t);let release;const gate=new Promise(r=>release=r);
  const v=f.create({ghost:{generate:async()=>{await gate;return {bytes:Buffer.from('fake'),mime:'image/png',width:512,height:512,metrics:{}};}}});
  await v.scan('test');const first=v.generate('test');
  for(let i=0;i<50;i++){try{await fs.access(path.join(f.store,'test/write.lock'));break;}catch{await new Promise(r=>setTimeout(r,5));}}
  await assert.rejects(v.generate('test'),/running/);release();await first;assert.equal((await v.generate('test')).result.imageCalls,0);
});

test('Ghost uses one authenticated request, refuses remote URLs and retains failure cost',async()=>{
  let calls=0;const ghost=new Ghost({key:'test-key',fetcher:async(url,opts)=>{calls++;assert.equal(url,'http://127.0.0.1:4000/v1/chat/completions');assert.equal(opts.headers.Authorization,'Bearer test-key');return new Response(JSON.stringify({choices:[{message:{images:[{image_url:{url:'https://remote/image.png'}}]}}]}),{status:200,headers:{'x-litellm-response-cost':'0.03'}});}});
  await assert.rejects(ghost.generate('test'),e=>e.metrics.costUsd===0.03&&/inline PNG/.test(e.message));assert.equal(calls,1);
  assert.throws(()=>new Ghost({url:'https://api.provider.com',key:'test'}),/loopback/);
  const absent=new Ghost({key:'test',fetcher:async()=>new Response('{}',{status:200})});await assert.rejects(absent.generate('x'),e=>e.metrics.costUsd===null);
});

test('local API authenticates reads and writes and rejects cross-origin access',async t=>{
  const f=await fixture(t);const webRoot=path.join(path.dirname(f.root),'web');await fs.mkdir(webRoot);await fs.writeFile(path.join(webRoot,'index.html'),'<!doctype html><!--VISU_CONFIG-->');const server=await serve(f.visu,{port:18871,webRoot});t.after(()=>new Promise(r=>server.close(r)));
  const base='http://127.0.0.1:18871';const html=await(await fetch(base)).text();const token=/window.VISU_TOKEN="([a-f0-9]+)"/.exec(html)[1];
  assert.equal((await fetch(`${base}/api/projects`)).status,401);
  const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
  assert.equal((await fetch(`${base}/api/projects`,{headers:{...headers,Origin:'http://evil.example'}})).status,403);
  assert.equal((await fetch(`${base}/api/projects/test/scan`,{method:'POST',headers,body:'{}'})).status,200);
  const b=await(await fetch(`${base}/api/projects/test`,{headers})).json();assert.equal(b.snapshots.length,1);assert.ok(!JSON.stringify(b).includes(f.root));
  assert.equal((await fetch(`${base}/api/projects/test/scan`,{method:'GET',headers})).status,405);
});
