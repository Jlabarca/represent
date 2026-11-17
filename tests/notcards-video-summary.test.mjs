import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {NotcardsStore} from '../src/notcards/store.mjs';
import {Gateway} from '../src/clay-notes/core.mjs';
import {NotcardsVideoSummary,classifySummaryAttribution,summaryRuntimeFromEnv} from '../src/notcards/video-summary.mjs';
import {startNotcardsServer} from '../src/notcards/server.mjs';

const userInfo=(subject)=>({issuer:'https://accounts.google.com',subject,email:`${subject}@example.test`,displayName:subject});
const activation={applySha:'b'.repeat(40),laneTestPassed:true,paidCallsAuthorized:true};
const completion={overview:'The speaker presents a central claim.',statements:[{text:'The process is iterative.',sources:[0]}],conclusions:[{text:'Iteration improves the result.',sources:[1]}]};

async function harness(t,{cap=1,cost='0.01',hold=false}={}){
  const directory=await mkdtemp(join(tmpdir(),'notcards-summary-'));
  const store=await new NotcardsStore({directory,videoImporter:{close:async()=>{}}}).init();t.after(async()=>{await store.close();await rm(directory,{recursive:true,force:true});});
  const user=store.user(userInfo('owner'));
  const note=await store.createNote(user.id,{url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ',title:'Video'});
  await store.updateTranscript(user.id,note.id,{transcript:[{start:0,text:'The process is iterative.'},{start:4,text:'Iteration improves the result.'}],source:'test'});
  let calls=0,release;
  const server=createServer(async(req,res)=>{
    calls++;
    assert.equal(req.url,'/v1/chat/completions');
    assert.equal(req.headers.authorization,'Bearer isolated-test-key');
    let raw='';for await(const chunk of req)raw+=chunk;
    const body=JSON.parse(raw);assert.ok(['clay-notes-summary','clay-notes-deep'].includes(body.model));
    if(hold)await new Promise(resolve=>{release=resolve;});
    res.writeHead(200,{'content-type':'application/json','x-litellm-response-cost':cost,'x-litellm-model-api-base':'https://openrouter.ai/api/v1'});
    res.end(JSON.stringify({model:'google/gemini-2.5-flash-lite',usage:{total_tokens:20},choices:[{finish_reason:'stop',message:{content:JSON.stringify(completion)}}]}));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve)}));
  const gateway=new Gateway({url:`http://127.0.0.1:${server.address().port}/v1`,key:'isolated-test-key',models:['clay-notes-summary','clay-notes-deep']});
  const service=new NotcardsVideoSummary({store,gateway,activation,maxAccountSpendUsd:cap,maxCallReservationUsd:Math.min(0.05,cap)});
  return {store,user,note,gateway,service,calls:()=>calls,release:()=>release?.()};
}

test('keeps summary unavailable until Apply, lane-test and paid authorization are all present',async t=>{
  const h=await harness(t);const gated=new NotcardsVideoSummary({store:h.store,gateway:h.gateway,activation:{...activation,paidCallsAuthorized:false}});
  assert.deepEqual(gated.status(),{available:false,defaultModel:'cheap',models:[],defaultLane:'clay-notes-summary',deepLaneAvailable:false,reason:'gateway_setup_pending'});
  await assert.rejects(gated.summarize(h.user.id,h.note.id),error=>error.code==='ai_setup_pending');
  assert.equal(h.calls(),0);
});

test('posts the exact summary lane to loopback and persists an owner-scoped revision idempotently',async t=>{
  const h=await harness(t),requestId='a0c66790-212f-4de8-9be0-bf99f6951c12';
  const first=await h.service.summarize(h.user.id,h.note.id,{requestId});
  const replay=await h.service.summarize(h.user.id,h.note.id,{requestId});
  assert.equal(h.calls(),1);assert.equal(first.note.revisions.length,1);assert.equal(replay.replayed,true);
  assert.equal(first.note.revisions[0].metrics.requestedModel,'clay-notes-summary');
  assert.equal(first.note.revisions[0].metrics.costUsd,0.01);assert.equal(first.note.revisions[0].metrics.attribution,'known');assert.equal(first.note.revisions[0].metrics.servingHop,'openrouter-lab1');
  const spend=h.store.db.prepare('SELECT state,cost_usd FROM notcards_summary_spend WHERE user_id=? AND request_id=?').get(h.user.id,requestId);
  assert.equal(spend.state,'completed');assert.equal(spend.cost_usd,0.01);
});

test('reserves account budget atomically and refuses another call after cap is reached',async t=>{
  const h=await harness(t,{cap:0.01,cost:'0.01'});
  await h.service.summarize(h.user.id,h.note.id,{requestId:'cbb4ec88-2761-49b2-b883-c6c030245d3b'});
  await assert.rejects(h.service.summarize(h.user.id,h.note.id,{requestId:'d2e31e6b-8f35-4c41-8065-3c74a86b39ef'}),error=>error.code==='summary_spend_limit');
  assert.equal(h.calls(),1);
});

test('rejects a request id replayed with a different lane or transcript hash',async t=>{
  const h=await harness(t),requestId='b3dbe3b1-a10b-4e11-bd42-369dcb9f7867';
  h.service.activation.deepLaneTestPassed=true;h.service.deepEnabled=true;
  await h.service.summarize(h.user.id,h.note.id,{requestId});
  await assert.rejects(h.service.summarize(h.user.id,h.note.id,{requestId,model:'deep'}),error=>error.code==='summary_idempotency_conflict');
  assert.equal(h.calls(),1);
});

test('charges the reservation when response cost attribution is missing',async t=>{
  const h=await harness(t,{cap:0.05,cost:''});
  await h.service.summarize(h.user.id,h.note.id,{requestId:'159cf56e-0e3d-4be0-8e21-c33cc30a9705'});
  const row=h.store.db.prepare('SELECT cost_usd FROM notcards_summary_spend WHERE user_id=?').get(h.user.id);
  assert.equal(row.cost_usd,0.05);
});

test('keeps unrecognized, missing and contradictory hop attribution unknown and reserved',()=>{
  assert.equal(classifySummaryAttribution({modelApiBase:'https://unlisted.example/v1',responseModel:'google/gemini-2.5-flash-lite',reportedCostUsd:0.01}).attribution,'unknown');
  assert.equal(classifySummaryAttribution({modelApiBase:'https://openrouter.ai/api/v1',responseModel:'claude-sonnet-5-5',reportedCostUsd:0.01}).attribution,'contradictory');
  assert.equal(classifySummaryAttribution({modelApiBase:'http://ollama:11434',responseModel:'qwen3:8b',reportedCostUsd:0.01}).attribution,'contradictory');
  assert.equal(classifySummaryAttribution({modelApiBase:'https://api.anthropic.com/v1',responseModel:'CLAUDE-HAIKU-5-5',reportedCostUsd:0.01},'clay-notes-summary').servingHop,'anthropic-lab1');
  const env={NOTCARDS_GATEWAY_APPLY_SHA:'a'.repeat(40),NOTCARDS_GATEWAY_SUMMARY_LANE_TEST:'passed',NOTCARDS_GATEWAY_PAID_CALLS_AUTHORIZED:'yes',NOTCARDS_SUMMARY_MAX_30D_USD:'1',NOTCARDS_SUMMARY_MAX_SERVICE_30D_USD:'1',NOTCARDS_SUMMARY_MAX_CALL_USD:'0.05',NOTCARDS_SUMMARY_MAX_INPUT_USD_PER_TOKEN:'0.0000001',NOTCARDS_SUMMARY_MAX_OUTPUT_USD_PER_TOKEN:'0.0000005'};
  assert.equal(summaryRuntimeFromEnv({...env,LITELLM_KEY_CLAY_NOTES:'own-key',NOTCARDS_GHOST_URL:'http://host.docker.internal:4000/v1'}).configurationValid,true);
  assert.equal(summaryRuntimeFromEnv({...env,LITELLM_KEY_OPERATOR:'foreign'}).configurationValid,false);
  assert.equal(summaryRuntimeFromEnv({...env,LITELLM_KEY_CLAY_NOTES:'own-key',NOTCARDS_GHOST_URL:'https://other.example/v1'}).configurationValid,false);
});

test('reconciles a reservation left by restart and will not replay a possibly charged request',async t=>{
  const h=await harness(t),requestId='7799c3f5-59c8-4d91-8b3d-8bbbfbf11c7f';
  const saved=await h.store.account(h.user.id).then(account=>account.notebook.get(h.note.id));const transcriptHash=saved.transcriptHash;
  const payloadHash=createHash('sha256').update(JSON.stringify({noteId:h.note.id,transcriptHash,lane:'clay-notes-summary'})).digest('hex');
  const now=Date.now();
  h.store.db.prepare("INSERT INTO notcards_summary_spend(user_id,request_id,note_id,lane,payload_hash,period_start,cost_usd,reserved_usd,state,revision_id,created_at,updated_at) VALUES(?,?,?,?,?,?,0,0.05,'reserved',NULL,?,?)").run(h.user.id,requestId,h.note.id,'clay-notes-summary',payloadHash,now,now,now);
  const restarted=new NotcardsVideoSummary({store:h.store,gateway:h.gateway,activation,maxAccountSpendUsd:1,maxCallReservationUsd:0.05});
  const row=h.store.db.prepare('SELECT state,cost_usd,reserved_usd FROM notcards_summary_spend WHERE user_id=? AND request_id=?').get(h.user.id,requestId);
  assert.equal(row.state,'failed');assert.equal(row.cost_usd,0.05);assert.equal(row.reserved_usd,0);
  await assert.rejects(restarted.summarize(h.user.id,h.note.id,{requestId}),error=>error.code==='summary_retry_new_request');
  assert.equal(h.calls(),0);
});

test('normal hosted config and note routes gate, enqueue once, and autosummarize a pasted video transcript',async t=>{
  const h=await harness(t),token=h.store.issueSession(h.user.id).token;
  const app=await startNotcardsServer({store:h.store,port:0,summaryConfig:{gateway:h.gateway,configurationValid:true,activation,maxAccountSpendUsd:0.05,maxCallReservationUsd:0.05}});
  t.after(()=>app.close());
  const headers={cookie:`notcards_session=${token}`,origin:app.url,'content-type':'application/json'};
  let response=await fetch(`${app.url}/api/config`,{headers});const config=await response.json();assert.equal(config.gatewayConfigured,true);assert.deepEqual(config.models,['cheap']);
  const note=await h.store.createNote(h.user.id,{url:'https://www.youtube.com/watch?v=X6J3ByTqhLY',title:'Manual transcript',content:'The process is iterative.\nIteration improves the result.'});
  response=await fetch(`${app.url}/api/notes/${note.id}`,{headers});assert.equal(response.status,200);
  const first=await response.json();assert.ok(['awaiting_summary','summarizing','ready'].includes(first.state));
  response=await fetch(`${app.url}/api/notes/${note.id}`,{headers});assert.equal(response.status,200);
  let saved;for(let attempt=0;attempt<100;attempt++){saved=await h.store.account(h.user.id).then(account=>account.notebook.get(note.id));if(saved.state==='ready')break;await new Promise(resolve=>setTimeout(resolve,50));}
  assert.equal(saved.state,'ready',saved.error);assert.equal(saved.revisions.length,1);assert.equal(h.calls(),1);
  response=await fetch(`${app.url}/api/notes/${note.id}/summarize`,{method:'POST',headers,body:JSON.stringify({model:'cheap'})});assert.equal(response.status,202);
  assert.equal(h.calls(),1);
});

test('cost ceiling rejects oversized deep input before dispatch and blocks when remaining budget is too small',async t=>{
  const h=await harness(t,{cap:0.05,cost:'0.049'});
  h.service.activation.deepLaneTestPassed=true;h.service.deepEnabled=true;
  const account=await h.store.account(h.user.id);
  const oversized=await h.store.createNote(h.user.id,{title:'Long source',text:'A'});
  await h.store.updateTranscript(h.user.id,oversized.id,{transcript:Array.from({length:20},()=> 'x'.repeat(8000)).join('\n'),source:'manual'});
  await assert.rejects(h.service.summarize(h.user.id,oversized.id,{model:'deep',requestId:'de25568b-15f1-4d06-a135-77cf24765314'}),error=>error.code==='summary_cost_bound_exceeded');
  assert.equal(h.calls(),0);
  await h.service.summarize(h.user.id,h.note.id,{requestId:'8824218d-df2c-4ef8-8cf9-ff03fbb4a214'});
  const second=await h.store.createNote(h.user.id,{title:'Another note',text:'The process is iterative.'});
  await h.store.updateTranscript(h.user.id,second.id,{transcript:[{start:0,text:'The process is iterative.'},{start:4,text:'Iteration improves the result.'}],source:'manual'});
  await assert.rejects(h.service.summarize(h.user.id,second.id,{requestId:'4cb99b90-93d8-436e-91aa-cd9f5bb30bb1'}),error=>error.code==='summary_spend_limit');
  assert.equal(h.calls(),1);
});

test('serializes concurrent per-account and service spend reservations before dispatch',async t=>{
  const h=await harness(t,{cap:0.002,cost:'0.001'});
  const second=await h.store.createNote(h.user.id,{title:'Second source',text:'The process is iterative.'});
  await h.store.updateTranscript(h.user.id,second.id,{transcript:[{start:0,text:'The process is iterative.'},{start:4,text:'Iteration improves the result.'}],source:'manual'});
  const attempts=await Promise.allSettled([
    h.service.summarize(h.user.id,h.note.id,{requestId:'895e1314-0051-4b29-9cea-116e8848b8b0'}),
    h.service.summarize(h.user.id,second.id,{requestId:'06bdf24c-6dfc-4325-a136-6fb099868490'})
  ]);
  assert.equal(attempts.filter(item=>item.status==='fulfilled').length,1);
  assert.equal(attempts.filter(item=>item.status==='rejected').length,1);
  assert.ok(['summary_spend_limit','summary_service_spend_limit'].includes(attempts.find(item=>item.status==='rejected').reason.code));
  assert.equal(h.calls(),1);
});
