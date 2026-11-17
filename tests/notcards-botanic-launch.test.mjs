import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,generateKeyPairSync,sign,verify} from 'node:crypto';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {createNotcardsLaunchLedger,canonical}=require('../integrations/botanic-notcards/server/launch.cjs');
const {createNotcardsLaunchRouter}=require('../integrations/botanic-notcards/server/router.cjs');
const origin='https://notcards.example.test';
const audience='https://botanic.example.test';
const google={provider:'google',googleId:'google-sub-alice'};
const cardId='Abcdef_1234';
const conversation1='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const conversation2='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const payload={question:'Explain this saved note.',context:{title:'Private source',body:'Secret context body'}};
const sha=value=>createHash('sha256').update(value).digest('base64url');
const b64=value=>Buffer.from(JSON.stringify(value)).toString('base64url');

function fixture({now=1_800_000_000_000}={}){
  const {privateKey,publicKey}=generateKeyPairSync('ed25519');
  let clock=now;const rows=new Map();
  const db={
    async insertPending(row){if(rows.has(row.jti))return false;rows.set(row.jti,{...row});return true;},
    async getPending(jti){const row=rows.get(jti);return row&&{...row};},
    async bindPending({jti,subject,conversationId,now:current}){
      const row=rows.get(jti);if(!row||row.expiresAt<=current||row.subject!==subject)return null;
      if(row.state==='bound'&&row.conversationId!==conversationId)return null;
      row.state='bound';row.conversationId=conversationId;return {...row};
    }
  };
  const ledger=createNotcardsLaunchLedger({db,notcardsOrigin:origin,audience,publicKey,clock:()=>clock});
  function ticket({jti='launch_0001',sub=google.googleId,exp=Math.floor(clock/1000)+240,payloadSha=sha(canonical({cardId,question:payload.question,context:payload.context}))}={}){
    const header=b64({alg:'EdDSA',typ:'JWT'}),claims=b64({iss:origin,aud:audience,sub,card_id:cardId,jti,iat:Math.floor(clock/1000),exp,payload_sha256:payloadSha});
    const body=`${header}.${claims}`;
    return `${body}.${sign(null,Buffer.from(body),privateKey).toString('base64url')}`;
  }
  return {ledger,rows,ticket,setNow(value){clock=value;}};
}

test('top-level POST can be accepted without a Botanic login cookie; exact Google owner reclaims after login',async()=>{
  const f=fixture();
  const accepted=await f.ledger.accept({origin,ticket:f.ticket(),...payload});
  assert.equal(accepted.subject,google.googleId);
  assert.deepEqual(await f.ledger.reclaim({jti:accepted.jti,user:google}),{jti:accepted.jti,cardId,question:payload.question,context:payload.context});
  assert.equal(f.rows.get(accepted.jti).state,'pending');
});

test('another Google account cannot inspect, consume or bind the pending launch',async()=>{
  const f=fixture();
  const accepted=await f.ledger.accept({origin,ticket:f.ticket(),...payload});
  await assert.rejects(f.ledger.reclaim({jti:accepted.jti,user:{provider:'google',googleId:'google-sub-bob'}}),e=>e.code==='launch_owner_mismatch');
  await assert.rejects(f.ledger.bind({jti:accepted.jti,user:{provider:'google',googleId:'google-sub-bob'},conversationId:conversation1,userId:'botanic-bob'}),e=>e.code==='launch_unavailable_or_owner_mismatch');
  assert.equal((await f.ledger.reclaim({jti:accepted.jti,user:google})).question,payload.question);
});

test('launch is exact-origin and one-time; replay and payload substitution are rejected',async()=>{
  const f=fixture(),ticket=f.ticket();
  await assert.rejects(f.ledger.accept({origin:'https://attacker.example.test',ticket,...payload}),e=>e.code==='origin_not_allowed');
  const accepted=await f.ledger.accept({origin,ticket,...payload});
  await assert.rejects(f.ledger.accept({origin,ticket,...payload}),e=>e.code==='launch_replayed');
  await assert.rejects(f.ledger.accept({origin,ticket,question:'changed',context:payload.context}),e=>e.code==='launch_payload_mismatch');
  assert.equal((await f.ledger.bind({jti:accepted.jti,user:google,conversationId:conversation1,userId:'botanic-alice'})).conversationId,conversation1);
  assert.equal((await f.ledger.bind({jti:accepted.jti,user:google,conversationId:conversation1,userId:'botanic-alice'})).conversationId,conversation1);
  await assert.rejects(f.ledger.bind({jti:accepted.jti,user:google,conversationId:conversation2,userId:'botanic-alice'}),e=>e.code==='launch_unavailable_or_owner_mismatch');
});

test('expired ticket and expired pending row cannot be reclaimed',async()=>{
  const f=fixture();
  await assert.rejects(f.ledger.accept({origin,ticket:f.ticket({exp:1_800_000_000-1}),...payload}),e=>e.code==='invalid_or_expired_launch');
  const accepted=await f.ledger.accept({origin,ticket:f.ticket({jti:'launch_0002'}),...payload});
  f.setNow(f.rows.get(accepted.jti).expiresAt+1);
  await assert.rejects(f.ledger.reclaim({jti:accepted.jti,user:google}),e=>e.code==='launch_unavailable');
  await assert.rejects(f.ledger.bind({jti:accepted.jti,user:google,conversationId:conversation1,userId:'botanic-alice'}),e=>e.code==='launch_unavailable_or_owner_mismatch');
});

test('only native Google provider identities may reclaim the launch',async()=>{
  const f=fixture();const accepted=await f.ledger.accept({origin,ticket:f.ticket(),...payload});
  await assert.rejects(f.ledger.reclaim({jti:accepted.jti,user:{provider:'openid',googleId:google.googleId}}),e=>e.code==='google_sign_in_required');
  await assert.rejects(f.ledger.reclaim({jti:accepted.jti,user:{provider:'google',email:'alice@example.test'}}),e=>e.code==='google_sign_in_required');
});

test('native route accepts a cross-site top-level POST with no Botanic cookie, then requires the matching Google session',async()=>{
  const f=fixture(),routes=[];
  const memoryRows=new Map();
  const store={
    async insertPending(row){if(memoryRows.has(row.jti)||[...memoryRows.values()].some(x=>x.subject===row.subject&&x.cardId===row.cardId&&['pending','bound'].includes(x.state)))return false;memoryRows.set(row.jti,{...row});return true;},
    async getPending(jti){return memoryRows.get(jti)||null;},
    async bindPending({jti,subject,conversationId,now,userId}){const row=memoryRows.get(jti);if(!row||row.subject!==subject||row.expiresAt<=now)return null;if(row.state==='bound')return row.conversationId===conversationId&&row.botanicUserId===String(userId)?row:null;row.state='bound';row.conversationId=conversationId;row.botanicUserId=String(userId);row.question=undefined;return row;},
    async contextForConversation({subject,conversationId,userId}){return [...memoryRows.values()].find(x=>x.subject===subject&&x.conversationId===conversationId&&x.botanicUserId===String(userId)&&x.state==='bound')||null;},
    async bindingForCard({subject,cardId,userId}){return [...memoryRows.values()].find(x=>x.subject===subject&&x.cardId===cardId&&x.botanicUserId===String(userId)&&x.state==='bound')||null;},
    async archiveConfirmedDeletion({subject,cardId,conversationId,userId}){const row=[...memoryRows.values()].find(x=>x.subject===subject&&x.cardId===cardId&&x.conversationId===conversationId&&x.botanicUserId===String(userId)&&x.state==='bound');if(!row)return false;row.state='deleted';row.context=undefined;row.question=undefined;return true;}
  };
  const fakeExpress={Router(){return {post(...args){routes.push(['POST',...args]);},use(...args){routes.push(['USE',...args]);},get(...args){routes.push(['GET',...args]);}};},urlencoded(){return (_req,_res,next)=>next?.();}};
  const keyPair=generateKeyPairSync('ed25519');
  const botanicKeyPair=generateKeyPairSync('ed25519'),published=[];
  const routed=createNotcardsLaunchRouter({express:fakeExpress,store,notcardsOrigin:origin,audience,publicKey:keyPair.publicKey,bindingPrivateKey:botanicKeyPair.privateKey,publishBinding:async value=>published.push(value.assertion),requireJwtAuth(){},clock:()=>1_800_000_000_000});
  const payloadSha=sha(canonical({cardId,question:payload.question,context:payload.context}));
  const claims={iss:origin,aud:audience,sub:google.googleId,card_id:cardId,jti:'launch_route_01',iat:1_800_000_000,exp:1_800_000_240,payload_sha256:payloadSha};
  const part=b64({alg:'EdDSA',typ:'JWT'}),body=`${part}.${b64(claims)}`,ticket=`${body}.${sign(null,Buffer.from(body),keyPair.privateKey).toString('base64url')}`;
  const post=routes.find(([method,path])=>method==='POST'&&path==='/launch').at(-1);
  const res={statusCode:200,headers:{},status(n){this.statusCode=n;return this;},json(value){this.value=value;return this;},set(name,value){this.headers[name]=value;return this;},cookie(name,value,options){this.cookieValue={name,value,options};return this;},redirect(status,location){this.redirected={status,location};return this;}};
  await post({body:{ticket,question:payload.question,context:JSON.stringify(payload.context)},get(name){return name==='origin'?origin:null},headers:{}},res);
  assert.deepEqual(res.redirected,{status:303,location:'/'});
  assert.equal(res.cookieValue.name,'__Host-notcards_launch');
  assert.equal(res.cookieValue.options.sameSite,'lax');
  assert.equal(res.cookieValue.options.httpOnly,true);
  assert.equal(res.cookieValue.options.secure,true);
  const get=routes.find(([method,path])=>method==='GET'&&path==='/pending').at(-1);
  const deny={status(n){this.statusCode=n;return this;},set(){return this;},json(value){this.value=value;return this;}};
  await get({headers:{cookie:`__Host-notcards_launch=${claims.jti}`},get(name){return name==='cookie'?this.headers.cookie:null},user:{provider:'google',googleId:'google-sub-bob'}},deny);
  assert.equal(deny.statusCode,403);
  const allow={set(name,value){this.headers??={};this.headers[name]=value;return this;},json(value){this.value=value;return this;}};
  await get({headers:{cookie:`__Host-notcards_launch=${claims.jti}`},get(name){return name==='cookie'?this.headers.cookie:null},user:{...google,id:'botanic-alice'}},allow);
  assert.equal(allow.value.question,payload.question);
  const req={headers:{cookie:`__Host-notcards_launch=${claims.jti}`},body:{conversationId:conversation1},user:{...google,id:'botanic-alice'}};
  const agent=await routed.applyToAgent(req,{id:'notcards-agent',instructions:'Base rules.'},{agentId:'notcards-agent'});
  assert.match(agent.instructions,/Private source/);
  assert.equal(memoryRows.get(claims.jti).state,'pending','agent initialization must not durably bind before conversation persistence');
  assert.equal(await routed.confirmGeneratedConversation(req,{conversationId:conversation1,verifyOwnedConversation:async()=>false}),null);
  assert.equal(memoryRows.get(claims.jti).state,'pending');
  const bound=await routed.confirmGeneratedConversation(req,{conversationId:conversation1,verifyOwnedConversation:async(userId,id)=>userId==='botanic-alice'&&id===conversation1});
  assert.equal(bound.conversationId,conversation1);
  const [assertionHead,assertionBody,assertionSig]=bound.assertion.split('.');
  assert.equal(verify(null,Buffer.from(`${assertionHead}.${assertionBody}`),botanicKeyPair.publicKey,Buffer.from(assertionSig,'base64url')),true);
  const assertionClaims=JSON.parse(Buffer.from(assertionBody,'base64url').toString('utf8'));
  assert.equal(assertionClaims.event,'conversation_bound');
  assert.equal(assertionClaims.exp-assertionClaims.iat,60);
  assert.deepEqual({iss:assertionClaims.iss,aud:assertionClaims.aud,sub:assertionClaims.sub,card_id:assertionClaims.card_id,conversation_id:assertionClaims.conversation_id,jti:assertionClaims.jti},{iss:audience,aud:origin,sub:google.googleId,card_id:cardId,conversation_id:conversation1,jti:claims.jti});
  assert.equal(published.length,1);
  const resumed=await routed.applyToAgent({headers:{},body:{conversationId:conversation1},user:{...google,id:'botanic-alice'}},{id:'notcards-agent',instructions:'Base rules.'},{agentId:'notcards-agent'});
  assert.match(resumed.instructions,/Private source/);
  assert.equal((await routed.confirmGeneratedConversation({user:{...google,id:'botanic-alice'},body:{conversationId:conversation1}},{conversationId:conversation1,verifyOwnedConversation:async()=>true})).jti,claims.jti);
  assert.equal(published.length,2,'callback retry after a lost response must be idempotently publishable');
  const duplicate=await routed.ledger.accept({origin,ticket:ticket,question:payload.question,context:payload.context}).catch(e=>e.code);
  assert.equal(duplicate,'launch_replayed');
  assert.equal(memoryRows.get(claims.jti).state,'bound');
  assert.equal(memoryRows.get(claims.jti).question,undefined);
  assert.equal((await store.contextForConversation({subject:google.googleId,conversationId:conversation1,userId:'botanic-alice'})).cardId,cardId);
  assert.deepEqual(await routed.openBoundCard({user:google,userId:'botanic-alice',cardId,verifyOwnedConversation:async()=>true}),{state:'bound',conversationId:conversation1,conversationUrl:`${audience}/c/${conversation1}`});
  assert.deepEqual(await routed.openBoundCard({user:{provider:'google',googleId:'google-sub-bob'},userId:'botanic-bob',cardId,verifyOwnedConversation:async()=>true}),{state:'empty',conversationUrl:null});
  assert.equal((await routed.openBoundCard({user:google,userId:'botanic-alice',cardId,verifyOwnedConversation:async()=>{throw new Error('database unavailable');}})).state,'unavailable');
  const removed=await routed.openBoundCard({user:google,userId:'botanic-alice',cardId,verifyOwnedConversation:async()=>false});
  assert.equal(removed.state,'deleted');
  assert.equal(removed.canStart,true);
  const [deleteHead,deleteBody,deleteSig]=published.at(-1).split('.');
  assert.equal(verify(null,Buffer.from(`${deleteHead}.${deleteBody}`),botanicKeyPair.publicKey,Buffer.from(deleteSig,'base64url')),true);
  assert.equal(JSON.parse(Buffer.from(deleteBody,'base64url').toString('utf8')).event,'conversation_deleted');
  assert.equal(memoryRows.get(claims.jti).state,'deleted');
  assert.equal(memoryRows.get(claims.jti).cardId,cardId,'deleting the Botanic conversation preserves its card binding record');
  const nextClaims={...claims,jti:'launch_route_02'};
  const nextBody=`${part}.${b64(nextClaims)}`,nextTicket=`${nextBody}.${sign(null,Buffer.from(nextBody),keyPair.privateKey).toString('base64url')}`;
  assert.equal((await routed.ledger.accept({origin,ticket:nextTicket,question:payload.question,context:payload.context})).jti,nextClaims.jti);
  await routed.ledger.reclaim({jti:nextClaims.jti,user:google});
  await routed.ledger.bind({jti:nextClaims.jti,user:google,conversationId:conversation2,userId:'botanic-alice'});
  assert.deepEqual(await routed.archiveDeletedConversations({user:{provider:'google',googleId:'google-sub-bob'},userId:'botanic-bob',conversationIds:[conversation2]}),[]);
  const deletionEvents=await routed.archiveDeletedConversations({user:{...google,id:'botanic-alice'},userId:'botanic-alice',conversationIds:[conversation2]});
  assert.equal(deletionEvents.length,1);
  assert.equal(deletionEvents[0].cardId,cardId);
  const deletionClaims=JSON.parse(Buffer.from(deletionEvents[0].assertion.split('.')[1],'base64url').toString('utf8'));
  assert.equal(deletionClaims.event,'conversation_deleted');
  assert.equal(memoryRows.get(nextClaims.jti).state,'deleted');
});
