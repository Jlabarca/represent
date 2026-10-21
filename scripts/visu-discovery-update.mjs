import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {configured,repo} from '../src/visu/cli.mjs';
import {Visu,digest} from '../src/visu/core.mjs';

const original=await configured(),id=process.argv[2]||'luz',m=original.manifest(id);
await original.scan(id); // Apply any zero-cost presentation/schema revision first.
const state=await original.state(id);
const snapshot=state.snapshots.find(s=>s.id===state.latestSnapshotId),view=state.views.find(v=>v.id===state.latestViewId);
assert.equal(view.analysisStatus,'ready');assert.ok(view.art);
const run=path.join(repo,'.represent',`update-proof-${Date.now()}`),root=path.join(run,'source'),store=path.join(run,'store');
await fs.mkdir(root,{recursive:true});execFileSync('git',['init','-q',root]);
const hashes={};
for(const source of snapshot.sources){
  const bytes=await fs.readFile(path.join(m.root,source.path));hashes[source.path]=digest(bytes);
  const target=path.join(root,source.path);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes);
}
await fs.mkdir(path.join(store,id),{recursive:true});await fs.writeFile(path.join(store,id,'state.json'),JSON.stringify(state));
let imageAttempts=0;const ghost=original.ghost;
if(!ghost)throw new Error('This paid text update proof requires Ghost');
ghost.generate=async()=>{imageAttempts++;throw new Error('This test forbids image requests');};
const v=new Visu({store,manifests:[{id,name:m.name,root}],ghost,analysisModel:original.analysisModel,maxCalls:6,maxAnalysisCalls:20});
const initialIDs=new Set(state.ledger.map(l=>l.id)),observations=[];
let b=await v.scan(id);assert.equal(b.latestSnapshotId,snapshot.id);assert.equal(b.result.classification,'unchanged');observations.push({case:'unchanged capture',...b.result});
b=await v.analyze(id);assert.equal(b.result.aiCalls,0);observations.push({case:'unchanged explanation',...b.result});
b=await v.generate(id);assert.equal(b.result.imageCalls,0);observations.push({case:'unchanged illustration',...b.result});
await fs.writeFile(path.join(root,'.visu-outside-scope.md'),'Benign ignored test note.');
b=await v.scan(id);assert.equal(b.result.classification,'unchanged');observations.push({case:'excluded file',...b.result});
const statusFile=snapshot.sources.find(s=>/(?:^|\/)CONTEXT\.md$/i.test(s.path)).path;
const target=path.join(root,statusFile),before=await fs.readFile(target,'utf8');
await fs.writeFile(target,'# Controlled-copy update proof\n\n## Current state update — test fixture only\nA manual accessibility review of the existing checkout is now complete in this disposable copy. This updates verification status only; the product design, chapter concepts and visual identity are unchanged. This is a test observation, not a claim about the original project.\n\n'+before);
b=await v.scan(id);assert.equal(b.views.find(w=>w.id===b.latestViewId).analysisStatus,'pending');observations.push({case:'status capture',...b.result});
b=await v.analyze(id);const changed=b.views.find(w=>w.id===b.latestViewId);observations.push({case:'status explanation',...b.result,artHash:changed.art.hash,artReused:changed.art.hash===view.art.hash,artFreshness:changed.freshness,chapterIdentityStable:changed.regions.map(r=>r.id).join('|')===view.regions.map(r=>r.id).join('|')});
assert.equal(changed.art.hash,view.art.hash);assert.equal(imageAttempts,0);
assert.equal(changed.freshness,'fresh');assert.deepEqual(changed.regions.map(r=>r.id),view.regions.map(r=>r.id));
const ledger=b.ledger.filter(l=>!initialIDs.has(l.id));
const preserved={};for(const [file,hash]of Object.entries(hashes))preserved[file]=digest(await fs.readFile(path.join(m.root,file)))===hash;
assert.ok(Object.values(preserved).every(Boolean));
const report={at:new Date().toISOString(),project:id,notice:'Paid text analysis of a disposable copy; original source files were never written. No image request permitted.',observations,ledger,measuredNewCostUsd:ledger.reduce((sum,l)=>sum+(l.costUsd||0),0),imageAttempts,originalSourcesUnchanged:preserved};
await fs.writeFile(path.join(repo,'experiments/visu-discovery/update-proof.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
