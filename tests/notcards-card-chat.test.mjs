import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {NotcardsCardChatService} from '../src/notcards/card-chat.mjs';

const principal=(sub,email='same@example.test',issuer='https://accounts.example.test')=>({sub,email,issuer});
const card='Abcdef_1234';
const tick=()=>Date.now();
const cookieValue=(headers,name)=>headers.getSetCookie().map(item=>item.split(';')[0]).find(item=>item.startsWith(`${name}=`))?.slice(name.length+1);

function harness({connector,resolveVerifiedOwner=async p=>({issuer:p.issuer,subject:p.sub}),loadCardContext=async({owner,cardId})=>({owner:owner.subject,cardId,title:'private card context'}),db=new DatabaseSync(':memory:')}={}){
  const service=new NotcardsCardChatService({db,connector,resolveVerifiedOwner,loadCardContext,clock:tick});
  return {service,db};
}
function makePort({send,deleted}={}){
  const calls=[];
  return {calls,port:{capabilities:{available:true,idempotentRequests:true,deletionConfirmation:!!deleted},
    async sendQuestion(arg){calls.push(arg);return send?send(arg,calls.length):{conversationId:`conv_${calls.length}`};},
    ...(deleted?{async confirmRemoteDeletion(arg){return deleted(arg);}}:{})}};
}

test('capability is discoverable and opening a card is lazy',async()=>{
  const {port,calls}=makePort(); const {service}=harness({connector:port});
  assert.deepEqual(service.capabilities(),{available:true,lazyFirstQuestion:true,ownerScopedBindings:true,idempotentRequests:true,deletionConfirmation:false,canonicalConversationUrl:false,rawPromptPersistence:false});
  assert.equal((await service.openCard({principal:principal('alice'),cardId:card})).state,'empty');
  assert.equal(calls.length,0);
  await service.close();
});

test('first question binds one owner/card, replay is idempotent and prompt is not stored',async()=>{
  const {port,calls}=makePort();const {service,db}=harness({connector:port});
  const p=principal('alice');
  const first=await service.sendQuestion({principal:p,cardId:card,requestId:'request_0001',question:'secret prompt'});
  assert.equal(first.conversationId,'conv_1');
  assert.equal(calls[0].context.title,'private card context');
  assert.equal((await service.openCard({principal:p,cardId:card})).conversationId,'conv_1');
  assert.equal((await service.sendQuestion({principal:p,cardId:card,requestId:'request_0001',question:'secret prompt'})).replayed,true);
  assert.equal(calls.length,1);
  const serialized=JSON.stringify(db.prepare('SELECT * FROM notcards_card_chat_requests').all());
  assert.equal(serialized.includes('secret prompt'),false);
  assert.equal(serialized.includes('private card context'),false);
  await service.close();
});

test('same email never merges different OIDC subjects or issuers',async()=>{
  const {port,calls}=makePort();const {service}=harness({connector:port});
  const first=await service.sendQuestion({principal:principal('alice'),cardId:card,requestId:'request_0001',question:'one'});
  const second=await service.sendQuestion({principal:principal('bob'),cardId:card,requestId:'request_0001',question:'two'});
  const third=await service.sendQuestion({principal:principal('alice','same@example.test','https://other-issuer.example.test'),cardId:card,requestId:'request_0001',question:'three'});
  assert.notEqual(first.conversationId,second.conversationId);
  assert.notEqual(first.conversationId,third.conversationId);
  assert.equal(calls.length,3);
  await service.close();
});

test('requires verified issuer and subject, without email fallback',async()=>{
  const {port}=makePort();const {service}=harness({connector:port,resolveVerifiedOwner:async p=>p.identity});
  await assert.rejects(service.openCard({principal:{email:'a@example.test'},cardId:card}),e=>e.status===401);
  await assert.rejects(service.openCard({principal:{identity:{issuer:'http://insecure.example.test',subject:'a'}},cardId:card}),e=>e.status===401);
  await assert.rejects(service.openCard({principal:{identity:{issuer:'https://accounts.example.test',subject:''}},cardId:card}),e=>e.status===401);
  await service.close();
});

test('concurrent sends reserve the card once and never create two conversations',async()=>{
  let release;const gate=new Promise(r=>{release=r;});
  const {port,calls}=makePort({send:async(_arg,n)=>{await gate;return {conversationId:`conv_${n}`};}});
  const {service}=harness({connector:port});
  const one=service.sendQuestion({principal:principal('alice'),cardId:card,requestId:'request_0001',question:'one'});
  await new Promise(r=>setTimeout(r,5));
  await assert.rejects(service.sendQuestion({principal:principal('alice'),cardId:card,requestId:'request_0002',question:'two'}),e=>e.code==='card_chat_busy');
  release();
  assert.equal((await one).conversationId,'conv_1');
  assert.equal(calls.length,1);
  await service.close();
});

test('uncertain outcomes block new questions until confirmed deletion',async()=>{
  const {port,calls}=makePort({send:async()=>{throw new Error('connection ended ambiguously');}});
  const {service}=harness({connector:port});const p=principal('alice');
  const result=await service.sendQuestion({principal:p,cardId:card,requestId:'request_0001',question:'one'});
  assert.equal(result.state,'outcome_unknown');
  await assert.rejects(service.sendQuestion({principal:p,cardId:card,requestId:'request_0002',question:'two'}),e=>e.code==='conversation_outcome_unknown');
  assert.equal((await service.openCard({principal:p,cardId:card})).canAsk,false);
  assert.equal(calls.length,1);
  await service.close();
});

test('retry only repeats the same idempotency key after a declared safe failure',async()=>{
  let attempts=0;
  const {port,calls}=makePort({send:async(arg)=>{attempts++;if(attempts===1){const e=new Error('not accepted');e.retrySafe=true;throw e;}return {conversationId:'safe_retry_1'};}});
  const {service}=harness({connector:port});const args={principal:principal('alice'),cardId:card,requestId:'request_0001',question:'same'};
  await assert.rejects(service.sendQuestion(args),e=>e.code==='botanic_retryable');
  assert.equal((await service.sendQuestion(args)).conversationId,'safe_retry_1');
  assert.equal(calls.length,2);
  await service.close();
});

test('reset requires confirmed deletion and preserves card while allowing a new explicit start',async()=>{
  let deleted=false;const {port,calls}=makePort({deleted:async()=>deleted});const {service}=harness({connector:port});const p=principal('alice');
  const first=await service.sendQuestion({principal:p,cardId:card,requestId:'request_0001',question:'first'});
  await assert.rejects(service.resetAfterRemoteDeletion({principal:p,cardId:card,expectedConversationId:first.conversationId}),e=>e.code==='conversation_not_deleted');
  assert.equal((await service.openCard({principal:p,cardId:card})).conversationId,first.conversationId);
  deleted=true;
  const reset=await service.resetAfterRemoteDeletion({principal:p,cardId:card,expectedConversationId:first.conversationId});
  assert.equal(reset.reset,true);
  assert.equal((await service.openCard({principal:p,cardId:card})).state,'empty');
  await assert.rejects(service.sendQuestion({principal:p,cardId:card,requestId:'request_0001',question:'first'}),e=>e.code==='conversation_deleted');
  const next=await service.sendQuestion({principal:p,cardId:card,requestId:'request_0002',question:'new'});
  assert.notEqual(next.conversationId,first.conversationId);
  assert.equal(calls.length,2);
  await service.close();
});

test('connector outage and malformed remote ids fail closed',async()=>{
  const missing=harness();
  assert.equal(missing.service.capabilities().available,false);
  await assert.rejects(missing.service.sendQuestion({principal:principal('alice'),cardId:card,requestId:'request_0001',question:'x'}),e=>e.code==='botanic_unavailable');
  await missing.service.close();
  const {port}=makePort({send:async()=>({conversationId:'contains/slash'})});const {service}=harness({connector:port});
  assert.equal((await service.sendQuestion({principal:principal('alice'),cardId:card,requestId:'request_0001',question:'x'})).state,'outcome_unknown');
  assert.equal((await service.openCard({principal:principal('alice'),cardId:card})).state,'outcome_unknown');
  await service.close();
});

test('hosted chat API is cookie-only, card-owner scoped and carries server-loaded note text',async()=>{
  const [{startNotcardsServer},{TestIdentity}]=await Promise.all([import('../src/notcards/server.mjs'),import('../src/notcards/identity.mjs')]);
  const directory=await mkdtemp(join(tmpdir(),'notcards-card-chat-http-'));
  const identity=new TestIdentity({user:{issuer:'https://accounts.google.com',subject:'chat-owner-one',email:'one@example.test',displayName:'Owner One'}});
  const sent=[];
  const connector={capabilities:{available:true,idempotentRequests:true,deletionConfirmation:false},
    async sendQuestion(arg){sent.push(arg);return {conversationId:`botanic_${sent.length}`};},
    conversationUrl:({conversationId})=>`https://botanic.example.test/conversations/${conversationId}`};
  let app;
  try{
    app=await startNotcardsServer({directory,port:0,identity,botanicConnector:connector});
    async function login(){
      const start=await fetch(`${app.url}/auth/google`,{redirect:'manual'}),location=new URL(start.headers.get('location'));
      const state=location.searchParams.get('state'),oauth=cookieValue(start.headers,'notcards_oauth_state');
      const callback=await fetch(`${app.url}/auth/google/callback?code=test-code&state=${encodeURIComponent(state)}`,{headers:{Cookie:`notcards_oauth_state=${oauth}`},redirect:'manual'});
      return cookieValue(callback.headers,'notcards_session');
    }
    const firstCookie=await login();
    const config=await fetch(`${app.url}/api/config`,{headers:{Cookie:`notcards_session=${firstCookie}`}}).then(r=>r.json());
    assert.equal(config.gatewayConfigured,false);
    assert.equal(config.chatConfigured,true);
    assert.equal(config.cardChat.available,true);
    const created=await fetch(`${app.url}/api/notes`,{method:'POST',headers:{Origin:app.url,Cookie:`notcards_session=${firstCookie}`,'Content-Type':'application/json'},body:JSON.stringify({sourceType:'web',title:'Owner One private note',url:'https://docs.example.test/one'})});
    assert.equal(created.status,201);
    const note=await created.json();
    assert.deepEqual(note.segments,[]);
    const personal=await fetch(`${app.url}/api/notes/${note.id}`,{method:'PATCH',headers:{Origin:app.url,Cookie:`notcards_session=${firstCookie}`,'Content-Type':'application/json'},body:JSON.stringify({personalNotes:'Only owner one private context.'})});
    assert.equal(personal.status,200);
    const noSession=await fetch(`${app.url}/api/notes/${note.id}/chat`);
    assert.equal(noSession.status,401);
    const crossSite=await fetch(`${app.url}/api/notes/${note.id}/chat`,{method:'POST',headers:{Origin:'https://attacker.example.test',Cookie:`notcards_session=${firstCookie}`,'Content-Type':'application/json','Idempotency-Key':'request_0001'},body:JSON.stringify({question:'do not accept'})});
    assert.equal(crossSite.status,403);
    const opened=await fetch(`${app.url}/api/notes/${note.id}/chat`,{headers:{Cookie:`notcards_session=${firstCookie}`}}).then(r=>r.json());
    assert.equal(opened.state,'empty');
    assert.equal(opened.conversationUrl,null);
    const post=await fetch(`${app.url}/api/notes/${note.id}/chat`,{method:'POST',headers:{Origin:app.url,Cookie:`notcards_session=${firstCookie}`,'Content-Type':'application/json','Idempotency-Key':'request_0001'},body:JSON.stringify({question:'Explain my note.'})});
    assert.equal(post.status,200,await post.clone().text());
    const linked=await post.json();
    assert.equal(linked.state,'bound');
    assert.equal(linked.conversationUrl,'https://botanic.example.test/conversations/botanic_1');
    assert.equal(sent[0].context.personalNotes,'Only owner one private context.');
    assert.deepEqual(sent[0].context.transcript,[]);
    assert.equal(JSON.stringify(sent[0].context).includes('other owner'),false);

    identity.user={issuer:'https://accounts.google.com',subject:'chat-owner-two',email:'two@example.test',displayName:'Owner Two'};
    const secondCookie=await login();
    const crossOwner=await fetch(`${app.url}/api/notes/${note.id}/chat`,{headers:{Cookie:`notcards_session=${secondCookie}`}});
    assert.equal(crossOwner.status,404);
    assert.equal(sent.length,1);
  }finally{
    await app?.close();
    await rm(directory,{recursive:true,force:true});
  }
});
