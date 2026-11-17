import {createHash, randomUUID} from 'node:crypto';
import {videoIdentity,DEFAULT_PROMPT,SUMMARY_MAX_COMPLETION_TOKENS} from '../clay-notes/core.mjs';

const sha=value=>createHash('sha256').update(value).digest('hex');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LANES={summary:'clay-notes-summary',deep:'clay-notes-deep'};
const problem=(status,code,message)=>Object.assign(new Error(message),{status,code});

const expectedProviderForModel=model=>{
  const value=String(model||'').trim().toLowerCase();
  if(/^google\/gemini-2\.5-flash-lite(?:$|[-:])/.test(value))return 'openrouter-lab1';
  if(/^claude-haiku-5-5(?:$|[-:])/.test(value)||/^claude-sonnet-5-5(?:$|[-:])/.test(value))return 'anthropic-lab1';
  if(/^qwen3:8b(?:$|[-:])/.test(value))return 'ollama';
  return null;
};
export function classifySummaryAttribution(metrics={},requestedLane='clay-notes-summary'){
  const rawBase=typeof metrics.modelApiBase==='string'?metrics.modelApiBase.trim():'';
  const rawModel=typeof metrics.responseModel==='string'?metrics.responseModel.trim():'';
  const cost=metrics.reportedCostUsd??metrics.costUsd;
  const numericCost=typeof cost==='number'&&Number.isFinite(cost)&&cost>=0?cost:null;
  let base=null,host='';
  try{const parsed=new URL(rawBase);if(['http:','https:'].includes(parsed.protocol)&&!parsed.username&&!parsed.password&&!parsed.search&&!parsed.hash){base=parsed.href;host=parsed.hostname.toLowerCase();}}catch{}
  const upstream=host==='openrouter.ai'||host==='openrouter'||host==='openrouter-lab1'?'openrouter-lab1':host==='api.anthropic.com'||host==='anthropic'||host==='anthropic-lab1'?'anthropic-lab1':host==='ollama'?'ollama':null;
  const malformedCost=metrics.reportedCostRaw!=null&&numericCost===null;
  let attribution='known';
  const expected=expectedProviderForModel(rawModel);
  const laneAllows=requestedLane==='clay-notes-summary'?['openrouter-lab1','anthropic-lab1','ollama']:requestedLane==='clay-notes-deep'?['anthropic-lab1']:[];
  if(!base||!rawModel||numericCost===null||!upstream||!expected)attribution='unknown';
  else if(malformedCost||expected!==upstream||!laneAllows.includes(upstream)||(upstream==='ollama'&&numericCost!==0))attribution='contradictory';
  return {attribution,servingHop:attribution==='known'?upstream:null,responseModel:rawModel||null,reportedCostUsd:numericCost,chargedCostUsd:attribution==='known'?numericCost:null};
}

function allowedRuntimeUrl(value){try{const url=new URL(value);return url.protocol==='http:'&&['127.0.0.1','localhost','[::1]','host.docker.internal'].includes(url.hostname)&&url.port==='4000'&&url.pathname==='/v1'&&!url.username&&!url.password&&!url.search&&!url.hash;}catch{return false;}}

export function summaryRuntimeFromEnv(env=process.env){
  const summaryTest=env.NOTCARDS_GATEWAY_SUMMARY_LANE_TEST==='passed';
  const deepTest=env.NOTCARDS_GATEWAY_DEEP_LANE_TEST==='passed';
  const paidCallsAuthorized=env.NOTCARDS_GATEWAY_PAID_CALLS_AUTHORIZED==='yes';
  const applySha=env.NOTCARDS_GATEWAY_APPLY_SHA||'';
  const maxAccountSpendUsd=Number(env.NOTCARDS_SUMMARY_MAX_30D_USD);
  const maxServiceSpendUsd=Number(env.NOTCARDS_SUMMARY_MAX_SERVICE_30D_USD);
  const maxCallReservationUsd=Number(env.NOTCARDS_SUMMARY_MAX_CALL_USD);
  const summaryInputUsdPerToken=Number(env.NOTCARDS_SUMMARY_MAX_INPUT_USD_PER_TOKEN);
  const summaryOutputUsdPerToken=Number(env.NOTCARDS_SUMMARY_MAX_OUTPUT_USD_PER_TOKEN);
  const deepInputUsdPerToken=Number(env.NOTCARDS_DEEP_MAX_INPUT_USD_PER_TOKEN);
  const deepOutputUsdPerToken=Number(env.NOTCARDS_DEEP_MAX_OUTPUT_USD_PER_TOKEN);
  const key=env.LITELLM_KEY_CLAY_NOTES||'';
  const bounded=Number.isFinite(maxAccountSpendUsd)&&maxAccountSpendUsd>0&&maxAccountSpendUsd<=1&&Number.isFinite(maxServiceSpendUsd)&&maxServiceSpendUsd>0&&maxServiceSpendUsd<=1&&Number.isFinite(maxCallReservationUsd)&&maxCallReservationUsd>0&&maxCallReservationUsd<=Math.min(maxAccountSpendUsd,maxServiceSpendUsd)&&[summaryInputUsdPerToken,summaryOutputUsdPerToken].every(rate=>Number.isFinite(rate)&&rate>0&&rate<=0.001);
  const url=env.NOTCARDS_GHOST_URL||'http://127.0.0.1:4000/v1';
  const deepRatesValid=[deepInputUsdPerToken,deepOutputUsdPerToken].every(rate=>Number.isFinite(rate)&&rate>0&&rate<=0.001);
  return {key,url,activation:{applySha,summaryLaneTestPassed:summaryTest,deepLaneTestPassed:deepTest&&deepRatesValid,paidCallsAuthorized},maxAccountSpendUsd,maxServiceSpendUsd,maxCallReservationUsd,rates:{summary:{inputUsdPerToken:summaryInputUsdPerToken,outputUsdPerToken:summaryOutputUsdPerToken},deep:deepRatesValid?{inputUsdPerToken:deepInputUsdPerToken,outputUsdPerToken:deepOutputUsdPerToken}:null},configurationValid:/^[a-f0-9]{40}$/i.test(applySha)&&summaryTest&&paidCallsAuthorized&&Boolean(key)&&bounded&&allowedRuntimeUrl(url)};
}

/**
 * Explicitly gated adapter for hosted, owner-scoped summary generation.
 * It intentionally is not connected to HTTP routes by this change. Activation requires
 * the operator's Apply SHA, own-key lane test and separate paid-call authorization.
 */
export class NotcardsVideoSummary {
  constructor({store,gateway=store?.gateway,activation={},clock=()=>Date.now(),maxAccountSpendUsd=1,maxServiceSpendUsd=1,maxCallReservationUsd=0.05,rates={summary:{inputUsdPerToken:1e-7,outputUsdPerToken:5e-7},deep:{inputUsdPerToken:2e-6,outputUsdPerToken:1e-5}}}={}) {
    if(!store?.account||!store?.db)throw new Error('An initialized account-scoped NotcardsStore is required');
    if(!gateway||typeof gateway.complete!=='function')throw new Error('A Clay Notes Ghost Gateway is required');
    if(!Number.isFinite(maxAccountSpendUsd)||maxAccountSpendUsd<=0||maxAccountSpendUsd>1||!Number.isFinite(maxServiceSpendUsd)||maxServiceSpendUsd<=0||maxServiceSpendUsd>1||!Number.isFinite(maxCallReservationUsd)||maxCallReservationUsd<=0||maxCallReservationUsd>Math.min(maxAccountSpendUsd,maxServiceSpendUsd))throw new Error('Invalid summary spend limits');
    if(!rates?.summary||![rates.summary.inputUsdPerToken,rates.summary.outputUsdPerToken].every(rate=>Number.isFinite(rate)&&rate>0&&rate<=0.001)||rates.deep&&![rates.deep.inputUsdPerToken,rates.deep.outputUsdPerToken].every(rate=>Number.isFinite(rate)&&rate>0&&rate<=0.001))throw new Error('Invalid lane price bounds');
    this.store=store;this.gateway=gateway;this.clock=clock;this.maxAccountSpendUsd=maxAccountSpendUsd;this.maxServiceSpendUsd=maxServiceSpendUsd;this.maxCallReservationUsd=maxCallReservationUsd;this.rates=rates;this.jobs=new Map();this.closed=false;
    this.activation={applySha:/^[a-f0-9]{40}$/i.test(activation.applySha||''),laneTestPassed:activation.summaryLaneTestPassed===true||activation.laneTestPassed===true,deepLaneTestPassed:activation.deepLaneTestPassed===true,paidCallsAuthorized:activation.paidCallsAuthorized===true};
    this.enabled=Object.values(this.activation).slice(0,2).every(Boolean)&&this.activation.paidCallsAuthorized&&Boolean(gateway.key)&&gateway.models?.includes(LANES.summary);
    this.deepEnabled=this.enabled&&this.activation.deepLaneTestPassed&&gateway.models?.includes(LANES.deep);
    this.db=store.db;
    this.db.exec(`CREATE TABLE IF NOT EXISTS notcards_summary_spend (
      user_id TEXT NOT NULL, request_id TEXT NOT NULL, note_id TEXT NOT NULL, lane TEXT NOT NULL,
      payload_hash TEXT NOT NULL, period_start INTEGER NOT NULL, cost_usd REAL NOT NULL,
      reserved_usd REAL NOT NULL, state TEXT NOT NULL CHECK(state IN ('reserved','completed','failed')),
      revision_id TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      PRIMARY KEY(user_id,request_id)
    ); CREATE INDEX IF NOT EXISTS notcards_summary_spend_period ON notcards_summary_spend(user_id,period_start,state);`);
    // A reservation left by a prior process may have reached the provider. Settle it at
    // the full configured reserve and never silently repeat that id after restart.
    this.db.prepare("UPDATE notcards_summary_spend SET state='failed',cost_usd=reserved_usd,reserved_usd=0,updated_at=? WHERE state='reserved'").run(this.clock());
  }
  status(){return {available:this.enabled,defaultModel:'cheap',models:this.enabled?['cheap',...(this.deepEnabled?['smart']:[])]:[],defaultLane:LANES.summary,deepLaneAvailable:this.deepEnabled,reason:this.enabled?null:'gateway_setup_pending'};}
  _transaction(work){this.db.exec('BEGIN IMMEDIATE');try{const value=work();this.db.exec('COMMIT');return value;}catch(error){this.db.exec('ROLLBACK');throw error;}}
  _reserve({userId,noteId,requestId,lane,payloadHash,reserveUsd,now}){
    return this._transaction(()=>{
      const prior=this.db.prepare('SELECT * FROM notcards_summary_spend WHERE user_id=? AND request_id=?').get(userId,requestId);
      if(prior){if(prior.payload_hash!==payloadHash)throw problem(409,'summary_idempotency_conflict','This request id was already used for different content.');return {replay:prior};}
      const cutoff=now-30*24*60*60*1000;
      this.db.prepare("DELETE FROM notcards_summary_spend WHERE period_start<? AND state<>'reserved'").run(cutoff);
      const rows=this.db.prepare('SELECT COUNT(*) AS count FROM notcards_summary_spend WHERE user_id=?').get(userId).count;
      if(rows>=5000)throw problem(429,'summary_journal_limit','The summary request history reached its safety limit.');
      const sum=this.db.prepare("SELECT COALESCE(SUM(CASE WHEN state='reserved' THEN reserved_usd ELSE cost_usd END),0) AS total FROM notcards_summary_spend WHERE user_id=? AND period_start>=? AND state IN ('reserved','completed','failed')").get(userId,cutoff).total;
      if(sum+reserveUsd>this.maxAccountSpendUsd+1e-9)throw problem(429,'summary_spend_limit','This request exceeds the account’s remaining AI summary allowance.');
      const serviceSum=this.db.prepare("SELECT COALESCE(SUM(CASE WHEN state='reserved' THEN reserved_usd ELSE cost_usd END),0) AS total FROM notcards_summary_spend WHERE period_start>=? AND state IN ('reserved','completed','failed')").get(cutoff).total;
      if(serviceSum+reserveUsd>this.maxServiceSpendUsd+1e-9)throw problem(429,'summary_service_spend_limit','This request exceeds the service’s remaining AI summary allowance.');
      this.db.prepare("INSERT INTO notcards_summary_spend(user_id,request_id,note_id,lane,payload_hash,period_start,cost_usd,reserved_usd,state,revision_id,created_at,updated_at) VALUES(?,?,?,?,?,?,0,?,'reserved',NULL,?,?)").run(userId,requestId,noteId,lane,payloadHash,now,reserveUsd,now,now);
      return {replay:null};
    });
  }
  _settle(userId,requestId,{state,cost=0,revisionId=null}){this._transaction(()=>this.db.prepare('UPDATE notcards_summary_spend SET state=?,cost_usd=?,reserved_usd=0,revision_id=?,updated_at=? WHERE user_id=? AND request_id=?').run(state,cost,revisionId,this.clock(),userId,requestId));}
  async summarize(userId,noteId,{model='summary',requestId=randomUUID()}={}){
    if(this.closed)throw problem(503,'summary_service_closing','Summary generation is shutting down.');
    if(!this.enabled)throw problem(503,'ai_setup_pending','AI summaries are waiting for operator Apply and paid-call authorization.');
    if(!Object.hasOwn(LANES,model))throw problem(400,'summary_lane_invalid','Choose the summary lane or explicitly select deep regeneration.');
    const lane=LANES[model];
    if(!this.gateway.models?.includes(lane)||(model==='deep'&&!this.deepEnabled))throw problem(503,'summary_lane_unavailable','The selected Notcards lane is not enabled in this server configuration.');
    if(!UUID.test(requestId||''))throw problem(400,'summary_request_id_invalid','A valid request id is required.');
    const jobKey=`${userId}:${noteId}:${requestId}`;
    if(this.jobs.has(jobKey))return this.jobs.get(jobKey);
    const task=this._run(userId,noteId,requestId,lane);
    this.jobs.set(jobKey,task);
    try{return await task;}finally{if(this.jobs.get(jobKey)===task)this.jobs.delete(jobKey);}
  }
  async enqueue(userId,noteId,options={}){
    if(this.closed)throw problem(503,'summary_service_closing','Summary generation is shutting down.');
    if(!this.enabled)throw problem(503,'ai_setup_pending','AI summaries are waiting for operator Apply and paid-call authorization.');
    const requestId=options.requestId||randomUUID();
    const jobKey=`${userId}:${noteId}:${requestId}`;
    if(this.jobs.has(jobKey))return {state:'summarizing',requestId};
    const job=this.summarize(userId,noteId,{...options,requestId});
    void job.catch(()=>{});
    return {state:'queued',requestId};
  }
  async enqueueAuto(userId,noteId){
    if(this.closed||!this.enabled)return {state:'disabled'};
    const account=await this.store.account(userId),note=await account.notebook.get(noteId);
    if(!note||note.autoSummaryEligible!==true||!Array.isArray(note.segments)||!note.segments.length||note.state!=='awaiting_summary')return {state:note?.state||'missing'};
    try{videoIdentity(note.url);}catch{return {state:'not_video'};}
    const transcriptHash=note.transcriptHash||sha(JSON.stringify(note.segments));
    if(note.revisions?.some(revision=>revision.transcriptHash===transcriptHash))return {state:'ready'};
    const digest=sha(`${userId}\0${noteId}\0${transcriptHash}\0${LANES.summary}`);
    const requestId=`${digest.slice(0,8)}-${digest.slice(8,12)}-4${digest.slice(13,16)}-a${digest.slice(17,20)}-${digest.slice(20,32)}`;
    const prior=this.db.prepare('SELECT state FROM notcards_summary_spend WHERE user_id=? AND request_id=?').get(userId,requestId);
    if(prior)return {state:prior.state==='completed'?'ready':prior.state==='reserved'?'summarizing':'error',requestId};
    try{await this.summarize(userId,noteId,{model:'summary',requestId});return {state:'ready',requestId};}
    catch(error){return {state:'error',requestId,code:error.code||'summary_failed'};}
  }
  async _run(userId,noteId,requestId,lane){
    const account=await this.store.account(userId),note=await account.notebook.get(noteId);
    if(!note)throw problem(404,'notebook_not_found','Notebook not found.');
    if(!note.segments?.length)throw problem(409,'transcript_required','A transcript is needed before summarizing.');
    const originalTranscriptHash=note.transcriptHash||sha(JSON.stringify(note.segments));
    const payloadHash=sha(JSON.stringify({noteId,transcriptHash:originalTranscriptHash,lane}));
    const rate=this.rates[lane==='clay-notes-summary'?'summary':'deep'];
    if(!rate)throw problem(503,'summary_lane_unavailable','No reviewed price bounds are configured for this lane.');
    const requestBytes=Buffer.byteLength(JSON.stringify({question:DEFAULT_PROMPT,transcript:note.segments}))+4096;
    const reserveUsd=requestBytes*rate.inputUsdPerToken+SUMMARY_MAX_COMPLETION_TOKENS*rate.outputUsdPerToken;
    if(!Number.isFinite(reserveUsd)||reserveUsd>this.maxCallReservationUsd+1e-9)throw problem(413,'summary_cost_bound_exceeded','This transcript exceeds the configured per-call cost bound. Its full text is preserved; use a smaller source or a reviewed higher bound.');
    const now=this.clock(),reservation=this._reserve({userId,noteId,requestId,lane,payloadHash,reserveUsd,now});
    if(reservation.replay){
      if(reservation.replay.state==='completed')return {note:await account.notebook.get(noteId),replayed:true,requestId};
      if(reservation.replay.state==='reserved')throw problem(409,'summary_pending','This summary request is already in progress.');
      throw problem(409,'summary_retry_new_request','This summary request failed; retry explicitly with a new request id.');
    }
    try{
      await account.notebook.mutate(noteId,n=>{if((n.transcriptHash||sha(JSON.stringify(n.segments||[])))!==originalTranscriptHash)throw problem(409,'transcript_changed','Transcript changed before generation began.');n.state='summarizing';n.error=null;});
      const {result,metrics={}}=await this.gateway.complete({model:lane,segments:note.segments});
      const attribution=classifySummaryAttribution(metrics,lane);
      const charged=attribution.attribution==='known'?attribution.reportedCostUsd:this.maxCallReservationUsd;
      const revisionId=randomUUID();
      const saved=await account.notebook.mutate(noteId,n=>{
        const currentHash=n.transcriptHash||sha(JSON.stringify(n.segments||[]));
        if(currentHash!==originalTranscriptHash)throw problem(409,'transcript_changed','Transcript changed during generation. Retry with the current transcript.');
        n.revisions??=[];n.revisions.push({id:revisionId,createdAt:new Date(this.clock()).toISOString(),transcriptHash:currentHash,segments:n.segments,...result,metrics:{...metrics,requestedModel:lane,attribution:attribution.attribution,servingHop:attribution.servingHop,reportedCostUsd:attribution.reportedCostUsd,costUsd:charged}});n.state='ready';n.error=null;
      });
      this._settle(userId,requestId,{state:'completed',cost:charged,revisionId});
      return {note:saved,replayed:false,requestId};
    }catch(error){await account.notebook.mutate(noteId,n=>{if(n.state==='summarizing') {n.state=n.revisions?.length?'ready':'error';n.error=error.message;}}).catch(()=>{});this._settle(userId,requestId,{state:'failed',cost:this.maxCallReservationUsd});throw error;}
  }
  async close(){this.closed=true;await Promise.allSettled([...this.jobs.values()]);}
}
