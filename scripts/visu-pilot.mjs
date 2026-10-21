import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Visu,capture,digest,atomic} from '../src/visu/core.mjs';
import {configured,repo} from '../src/visu/cli.mjs';

// Reuses real captured art/ledger; mutates ONLY a new disposable copy under .represent.
const live=await configured(),run=path.join(repo,'.represent',`pilot-${Date.now()}`),results=[];
await fs.mkdir(run,{recursive:true});
for(const original of live.manifests){
  const before=await capture(original),root=path.join(run,'inputs',original.id),store=path.join(run,'state');
  const rawBefore={};
  for(const s of original.sources){const bytes=await fs.readFile(path.join(original.root,s.path));rawBefore[s.path]=digest(bytes);const dest=path.join(root,s.path);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,bytes);}
  const manifest={...structuredClone(original),root};let calls=0;
  const v=new Visu({store,manifests:[manifest],ghost:{generate:async()=>{calls++;throw new Error('Pilot must not generate images');}}});
  await fs.mkdir(path.join(store,original.id),{recursive:true});await fs.copyFile(live.file(original.id),v.file(original.id));
  const observations=[];
  async function scan(name,expected){const bundle=await v.scan(original.id);if(expected)assert.equal(bundle.result.classification,expected);const view=bundle.views.find(x=>x.id===bundle.latestViewId);observations.push({case:name,...bundle.result,snapshotId:bundle.latestSnapshotId,viewId:bundle.latestViewId,artHash:view.art?.hash,freshness:view.freshness});return bundle;}
  await scan('baseline-current-recipe');
  const baseline=await scan('unchanged','unchanged'),baselineView=baseline.views.find(x=>x.id===baseline.latestViewId);
  const stateBefore=await fs.readFile(v.file(original.id),'utf8');
  const restarted=new Visu({store,manifests:[manifest]});assert.equal((await restarted.scan(original.id)).result.classification,'unchanged');assert.equal(await fs.readFile(v.file(original.id),'utf8'),stateBefore);
  await fs.writeFile(path.join(root,'outside-scope.md'),'Excluded pilot change');await scan('outside-scope','unchanged');
  const detail=manifest.sources.find(s=>s.role==='detail'),detailPath=path.join(root,detail.path),detailRaw=await fs.readFile(detailPath,'utf8');
  await fs.writeFile(detailPath,'- [x] Controlled pilot checklist item; not a real project change.\n'+detailRaw);
  const overlay=await scan('detail-only','details-only'),overlayView=overlay.views.find(x=>x.id===overlay.latestViewId);
  assert.equal(overlayView.art.hash,baselineView.art.hash);assert.equal(overlayView.freshness,'fresh');
  const source=manifest.sources.find(s=>s.role==='art'),sourcePath=path.join(root,source.path),raw=await fs.readFile(sourcePath,'utf8');
  await fs.writeFile(sourcePath,'# Controlled pilot: a depicted concept changed\n'+raw);const changed=await scan('depicted-source-change','art-changed');assert.equal(changed.views.at(-1).freshness,'stale');
  const override=await v.style(original.id,'neutral');assert.equal(override.latestSnapshotId,changed.latestSnapshotId);assert.equal(override.views.at(-1).freshness,'stale');observations.push({case:'style-override',sourceSnapshotUnchanged:true,aiCalls:0,imageCalls:0,freshness:'stale'});
  await fs.unlink(sourcePath);await scan('source-removal','art-changed');assert.equal(calls,0);
  const after=await capture(original);assert.deepEqual(after.sources,before.sources);
  for(const s of original.sources)assert.equal(digest(await fs.readFile(path.join(original.root,s.path))),rawBefore[s.path]);
  const liveState=await live.state(original.id);
  results.push({project:original.id,style:baselineView.style,sourceFilesUnchanged:true,sourceHashes:rawBefore,observations,aiCallsDuringUpdateTests:calls,generationLedger:liveState.ledger,measuredGenerationCostUsd:liveState.ledger.reduce((sum,r)=>sum+(r.costUsd||0),0),unknownCostAttempts:liveState.ledger.filter(r=>r.costUsd===null).length});
}
const report={schema:'represent.visu/pilot-v1',at:new Date().toISOString(),note:'All changes were made to copies. No paid calls during update tests. Initial/refinement generation ledger is actual Ghost usage, including failures.',results};
await atomic(path.join(repo,'experiments/visu-pilot/measurements.json'),report);console.log(JSON.stringify(results.map(r=>({project:r.project,cost:r.measuredGenerationCostUsd,callsDuringUpdates:r.aiCallsDuringUpdateTests,cases:r.observations.map(o=>({case:o.case,classification:o.classification,ms:o.metrics?.durationMs,freshness:o.freshness}))})),null,2));
