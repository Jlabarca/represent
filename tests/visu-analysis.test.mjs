import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ANALYSIS_VERSION,analyzeProject,buildAnalysisInput} from '../src/visu/analysis.mjs';

const sources=[
  {path:'README.md',role:'art',text:'# Starling Workshop\nPlayers assemble clockwork birds from found parts.\nThe workshop is a quiet co-op crafting game.\n'.repeat(8)},
  {path:'src/workshop.ts',role:'art',startLine:1,text:'export class Workshop {\n  assemble(parts) { return this.registry.combine(parts); }\n}\n'.repeat(15)},
  {path:'docs/plan.md',role:'detail',text:'# Design\nTarget: players trade crafted birds through a shared market.\nNot implemented: market listing and settlement.\n'.repeat(8)},
];
function chapter(id,i,overrides={}) {return {id,label:`Chapter ${i}`,summary:`Specific project chapter ${i}.`,visual:`A clockwork bird motif ${i}.`,visualChanged:false,currentState:`Source defines workshop behavior ${i}.`,intendedDesign:`The design proposes shared trading ${i}.`,nextSteps:`The market work remains unimplemented ${i}.`,currentEvidence:[i%sources.length],designEvidence:[2],nextEvidence:[2],evidence:[],excerptIndices:[],...overrides};}
function response(body,{status=200,cost='0.012'}={}) {return {ok:status>=200&&status<300,status,headers:{get:key=>key==='x-litellm-response-cost'?cost:key==='x-litellm-call-id'?'call-1':null},json:async()=>body};}
const ghost=fetcher=>({url:'http://127.0.0.1:4000',key:'test-key',fetcher});

test('bounded source excerpts span files and later sections',()=>{
  const input=buildAnalysisInput(sources);
  assert(input.excerpts.length>=3);
  assert(input.excerpts.some(x=>x.path==='src/workshop.ts'));
  assert(input.excerpts.some(x=>x.path==='docs/plan.md'));
  assert(input.approxBytes<50000);
});

test('current structure and supersession remain in excerpts despite repeated older instructions',()=>{
  const text=['# Storefront',...Array(14).fill('General introduction.'),'## Current homepage structure','Material gateway and category strip.','The old collections grid was retired.',...Array(25).fill(''),...Array(30).fill('## Collections gotchas\nCurrent old collections instructions and design.')].join('\n');
  const input=buildAnalysisInput([{path:'docs/reference/homepage.md',role:'art',kind:'reference',text}]);
  assert.ok(input.excerpts.some(e=>e.text.includes('Material gateway')&&e.text.includes('retired')));assert.equal(input.excerpts[0].startLine,1);
});

test('covers every selected source before spending excerpt budget on extras',()=>{
  const many=Array.from({length:24},(_,i)=>({path:`docs/part-${i}.md`,role:'art',text:`# Section ${i}\nSpecific finding 🌙 ${i}.\nMore detail about the system.\n`.repeat(4)}));
  const input=buildAnalysisInput(many);
  assert.deepEqual(new Set(input.excerpts.map(x=>x.path)).size,many.length);
  assert(input.approxBytes<=44000);
  assert.equal(input.approxBytes,Buffer.byteLength(JSON.stringify(input.excerpts),'utf8'));
});

test('one Ghost call returns six grounded chapters and stable previous motifs',async()=>{
  let calls=0,request;
  const g=ghost(async(url,options)=>{calls++;request=JSON.parse(options.body);return response({usage:{total_tokens:123},choices:[{message:{content:JSON.stringify({regions:Array.from({length:6},(_,i)=>chapter(`chapter-${i+1}`,i))})}}]});});
  const previous={regions:[chapter('chapter-1',0,{label:'Workshop',visual:'Old workshop scene'})]};
  const result=await analyzeProject(g,{name:'Starling Workshop',sources,previous,changedPaths:['docs/plan.md']});
  assert.equal(calls,1);assert.equal(request.model,'json');assert.ok(request.max_tokens<=6500);
  assert.match(request.messages[0].content,/untrusted DATA/);
  assert.equal(request.messages[1].content.includes('docs/plan.md'),true);
  assert.equal(result.regions.length,6);
  assert.equal(result.regions[0].label,'Workshop');assert.equal(result.regions[0].visual,'Old workshop scene');
  const citation=result.regions[0].currentEvidence[0];
  assert.equal(citation.path,'README.md');assert.equal(citation.startLine,1);assert.ok(sources[0].text.startsWith(citation.quote));assert.match(citation.quote,/clockwork birds/);
  assert.equal(result.metrics.costUsd,0.012);assert.equal(result.metrics.usage.total_tokens,123);
});

test('rejects evidence indices outside captured excerpts and preserves call cost on errors',async()=>{
  const bad=Array.from({length:6},(_,i)=>chapter(`bad-${i}`,i,{currentEvidence:[999]}));
  const g=ghost(async()=>response({choices:[{message:{content:JSON.stringify({regions:bad})}}]},{cost:'0.004'}));
  await assert.rejects(analyzeProject(g,{name:'Starling Workshop',sources}),error=>error.message.includes('Invalid currentEvidence')&&error.metrics.costUsd===0.004);
});

test('keeps HTTP failure cost and does not retry',async()=>{
  let calls=0;const g=ghost(async()=>{calls++;return response({}, {status:502,cost:'0.009'});});
  await assert.rejects(analyzeProject(g,{name:'Starling Workshop',sources}),error=>error.message.includes('HTTP 502')&&error.metrics.costUsd===0.009);
  assert.equal(calls,1);
});

test('withholds an unsupported design claim without discarding other grounded fields',async()=>{
  const noEvidence=Array.from({length:6},(_,i)=>chapter(`uncited-${i}`,i,{designEvidence:[]}));
  const g=ghost(async()=>response({choices:[{message:{content:JSON.stringify({regions:noEvidence})}}]}));
  const result=await analyzeProject(g,{name:'Starling Workshop',sources});
  assert.match(result.regions[0].intendedDesign,/^Unknown/);assert.equal(result.warnings.length,6);assert.ok(result.regions[0].currentEvidence.length);
});

test('permits uncited unknown fields only with the explicit Unknown prefix',async()=>{
  const unknown=Array.from({length:6},(_,i)=>chapter(`unknown-${i}`,i,{currentState:'Unknown — source excerpts do not establish what runs.',currentEvidence:[],intendedDesign:'Unknown — no target is documented in the selected sources.',designEvidence:[],nextSteps:'Unknown — no next action is evidenced.',nextEvidence:[],evidence:[i]}));
  const g=ghost(async()=>response({choices:[{message:{content:JSON.stringify({regions:unknown})}}]}));
  const result=await analyzeProject(g,{name:'Starling Workshop',sources});
  assert.equal(result.regions[0].currentEvidence.length,0);
});

test('withholds uncited current-state claims instead of displaying them',async()=>{
  const bad=Array.from({length:6},(_,i)=>chapter(`empty-${i}`,i,{currentEvidence:[]}));
  const g=ghost(async()=>response({choices:[{message:{content:JSON.stringify({regions:bad})}}]}));
  const result=await analyzeProject(g,{name:'Starling Workshop',sources});assert.match(result.regions[0].currentState,/^Unknown/);assert.equal(result.regions[0].currentEvidence.length,0);
});

test('preserves prior chapter order and motif for state changes, permits material visual changes',async()=>{
  const prior={regions:[chapter('existing-a',0,{label:'First',visual:'Existing gear scene'}),chapter('existing-b',1,{label:'Second',visual:'Existing trade scene'})]};
  const rows=[chapter('existing-b',0,{label:'Changed label',visual:'New market festival',visualChanged:true}),chapter('new-c',1),chapter('existing-a',2,{label:'Changed title',visual:'Unneeded alternate scene'})];
  const g=ghost(async()=>response({choices:[{message:{content:JSON.stringify({regions:[...rows,...Array.from({length:3},(_,i)=>chapter(`new-${i}`,i+3))]})}}]}));
  const result=await analyzeProject(g,{name:'Starling Workshop',sources,previous:prior});
  assert.deepEqual(result.regions.slice(0,2).map(r=>r.id),['existing-a','existing-b']);
  assert.equal(result.regions[0].label,'First');assert.equal(result.regions[0].visual,'Existing gear scene');
  assert.equal(result.regions[1].label,'Changed label');assert.equal(result.regions[1].visual,'New market festival');
});
