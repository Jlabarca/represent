import fs from 'node:fs/promises';
import path from 'node:path';
import {configured,repo} from '../src/visu/cli.mjs';
import {digest} from '../src/visu/core.mjs';

const visu=await configured(),out=path.join(repo,'experiments/visu-discovery');
await fs.mkdir(out,{recursive:true});
const stage=process.argv[2]||'report',ids=process.argv.slice(3);
for(const manifest of visu.manifests.filter(m=>!ids.length||ids.includes(m.id))){
  if(Object.keys(manifest).some(k=>!['id','name','root'].includes(k)))throw new Error('Pilot requires root-only identity manifests');
  if(stage==='explain'){
    await visu.scan(manifest.id);await visu.analyze(manifest.id);
  } else if(stage==='illustrate') await visu.generate(manifest.id);
  else if(stage!=='report')throw new Error('Use explain | illustrate | report [project ids]');
  const state=await visu.state(manifest.id),snapshot=state.snapshots.find(s=>s.id===state.latestSnapshotId),view=state.views.find(v=>v.id===state.latestViewId);
  const originalHashes={};for(const s of snapshot.sources)originalHashes[s.path]=digest(await fs.readFile(path.join(manifest.root,s.path)));
  const previous=JSON.parse(await fs.readFile(path.join(repo,'experiments/visu-pilot/measurements.json'),'utf8'));
  const oldIDs=new Set(previous.results.flatMap(r=>r.generationLedger.map(l=>l.id)));
  const ledger=state.ledger.filter(l=>!oldIDs.has(l.id));
  const report={at:new Date().toISOString(),project:manifest.id,configuration:manifest,sourceScope:snapshot.sources.map(({text,...s})=>s),discovery:snapshot.discovery,snapshotId:snapshot.id,viewId:view.id,style:view.style,analysisStatus:view.analysisStatus,chapters:view.regions.map(({sources,progress,...r})=>r),art:view.art,ledger,measuredCostUsd:ledger.reduce((sum,r)=>sum+(r.costUsd||0),0),unknownCostAttempts:ledger.filter(r=>r.costUsd===null).length,originalHashes};
  await fs.writeFile(path.join(out,`${manifest.id}.json`),JSON.stringify(report,null,2));
  if(view.art?.chapterSignature===view.chapterSignature&&view.art)await fs.copyFile(path.join(visu.store,'assets',view.art.hash),path.join(out,`${manifest.id}.png`));
  console.log(JSON.stringify({project:manifest.id,stage,sourceCount:snapshot.sources.length,analysis:view.analysisStatus,chapters:view.regions.map(r=>({label:r.label,current:r.currentState,intended:r.intendedDesign,next:r.nextSteps})),costUsd:report.measuredCostUsd}));
}
