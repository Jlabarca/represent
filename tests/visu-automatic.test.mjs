import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {Visu,validateManifest,detectStyle} from '../src/visu/core.mjs';

async function fixture(t, options={}) {
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'visu-auto-')),root=path.join(dir,'source'),store=path.join(dir,'store');
  await fs.mkdir(root);execFileSync('git',['init','-q',root]);
  await fs.writeFile(path.join(root,'README.md'),'# Widget workshop\nA workshop that assembles widgets.\n');
  await fs.mkdir(path.join(root,'docs'));
  await fs.writeFile(path.join(root,'docs/CONTEXT.md'),'# Current state\nWidget inspection is pending.\n');
  t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const manifest={id:'widget',name:'Widget',root};let images=0,analyses=0;
  const ghost={model:'fixture',generate:async()=>({bytes:Buffer.from(`art-${++images}`),mime:'image/png',width:512,height:512,metrics:{costUsd:0.01}})};
  const analyzer=async(_,{sources})=>{analyses++;const text=sources.find(s=>s.path==='docs/CONTEXT.md').text;return {regions:Array.from({length:6},(_,i)=>({id:`part-${i}`,label:`Part ${i}`,summary:'Widget assembly',visual:`Widget station ${i}`,currentState:text,intendedDesign:'Build inspected widgets',nextSteps:'Review captured progress',paths:['README.md','docs/CONTEXT.md'],evidence:[],currentEvidence:[],designEvidence:[],nextEvidence:[]})),metrics:{costUsd:0.001}};};
  const create=(opts={})=>new Visu({store,manifests:[manifest],ghost,analyzer,...options,...opts});
  return {root,store,manifest,create,visu:create(),counts:()=>({images,analyses})};
}

test('root-only manual capture/explain/illustrate caches independently and preserves history',async t=>{
  const f=await fixture(t);let b=await f.visu.scan('widget');
  assert.equal(b.views.at(-1).analysisStatus,'pending');assert.ok(b.project.scope.length);assert.deepEqual(f.counts(),{images:0,analyses:0});
  await assert.rejects(f.visu.generate('widget'),/Explain/);
  b=await f.visu.analyze('widget');assert.equal(b.views.at(-1).regions.length,6);const oldView=b.latestViewId;
  await f.visu.generate('widget');const s1=b.latestSnapshotId,art=(await f.visu.bundle('widget')).views.at(-1).art;
  const saved=await fs.readFile(f.visu.file('widget'),'utf8');
  assert.equal((await f.create().scan('widget')).result.classification,'unchanged');
  assert.equal((await f.create().analyze('widget')).result.aiCalls,0);
  assert.equal((await f.create().generate('widget')).result.imageCalls,0);
  assert.equal(await fs.readFile(f.visu.file('widget'),'utf8'),saved);
  await fs.writeFile(path.join(f.root,'docs/CONTEXT.md'),'# Current state\nWidget inspection is implemented in source, not runtime tested.\n');
  b=await f.visu.scan('widget');assert.notEqual(b.latestSnapshotId,s1);assert.equal(b.views.at(-1).analysisStatus,'pending');assert.equal(b.views.at(-1).freshness,'stale');
  b=await f.visu.analyze('widget');assert.match(b.views.at(-1).regions[0].currentState,/implemented/);assert.equal(b.views.at(-1).art.hash,art.hash);assert.equal(b.views.at(-1).freshness,'fresh');
  assert.equal((await f.visu.generate('widget')).result.imageCalls,0);assert.deepEqual(f.counts(),{images:1,analyses:2});
  assert.match(b.views.find(v=>v.id===oldView).regions[0].currentState,/pending/);
  await fs.writeFile(path.join(f.root,'docs/design.md'),'# New target\nWidgets now grow wings.\n');
  b=await f.visu.scan('widget');assert.ok(b.result.changedFiles.includes('docs/design.md'));
  const newer=f.create({analyzer:async(g,input)=>{const result=await f.visu.analyzer(g,input);result.regions[0].visual='Flying widget';return result;}});
  b=await newer.analyze('widget');assert.equal(b.views.at(-1).freshness,'stale');assert.notEqual(b.views.at(-1).chapterSignature,art.chapterSignature);
});

test('analysis failure is billed, bounded and never silently retried or replaces a saved explanation',async t=>{
  const f=await fixture(t,{maxAnalysisCalls:1});await f.visu.scan('widget');
  const fail=f.create({analyzer:async()=>{const e=new Error('invalid evidence');e.metrics={costUsd:0.002};throw e;}});
  await assert.rejects(fail.analyze('widget'),/invalid evidence/);
  const b=await fail.bundle('widget');assert.equal(b.ledger[0].status,'failed');assert.equal(b.ledger[0].costUsd,0.002);assert.equal(b.views.at(-1).analysisStatus,'pending');
  await assert.rejects(fail.analyze('widget'),/call limit/);assert.equal((await fail.bundle('widget')).ledger.length,1);
});

test('analysis calls do not consume the image limit and cached calls survive exhausted limits',async t=>{
  const f=await fixture(t,{maxCalls:1});await f.visu.scan('widget');await f.visu.analyze('widget');await f.visu.generate('widget');
  assert.equal((await f.visu.generate('widget')).result.imageCalls,0);
  assert.equal((await f.create({maxAnalysisCalls:0}).analyze('widget')).result.aiCalls,0);
  assert.throws(()=>validateManifest({...f.manifest,regions:[]}),/handcrafted/);
});

test('analysis spend stop is enforced before dispatch and state survives failed attempts',async t=>{
  const f=await fixture(t,{maxCostUsd:0});await f.visu.scan('widget');await assert.rejects(f.visu.analyze('widget'),/cost limit/);assert.equal((await f.visu.bundle('widget')).ledger.length,0);
});

test('offline capture retains the configured text-model cache identity',async t=>{
  const f=await fixture(t,{analysisModel:'configured-route'});await f.visu.scan('widget');await f.visu.analyze('widget');
  const before=f.counts();const b=await f.create({ghost:null}).scan('widget');assert.equal(b.result.classification,'unchanged');assert.equal(b.views.find(v=>v.id===b.latestViewId).analysisStatus,'ready');assert.deepEqual(f.counts(),before);
});

test('a tool producing retro assets is not assigned a retro identity from references alone',()=>{
  const reference={path:'docs/reference/studio.md',kind:'reference',role:'art',startLine:1,text:'This image tool can generate retro pixel-art Ragnarok assets.'};
  assert.equal(detectStyle([reference]).profile,'neutral');
  assert.equal(detectStyle([reference,{path:'README.md',kind:'identity',role:'art',startLine:1,text:'A Ragnarok MMO project.'}]).profile,'retro');
});
