import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createHash,generateKeyPairSync} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {BotanicNotebookAccess,signBotanicNotebookAssertion,botanicNotebookPathAllowed} from '../src/notcards/botanic-access.mjs';
import {BotanicCompanionService,botanicCompanionCardId} from '../src/notcards/botanic-companion.mjs';

const botanicOrigin='https://botanic.example',notcardsOrigin='https://notcards.example',subject='verified-google-subject';
const fakeDb=()=>{const rows=new Set();return {exec(){},prepare(sql){return {run(...args){if(sql.startsWith('INSERT'))rows.add(args[0]);return {};},get(...args){return rows.has(args[0])?{jti:args[0]}:null;}};}};};

test('Botanic notebook assertions bind identity, route, body, audience and one-time jti',()=>{
  const keys=generateKeyPairSync('ed25519'),access=new BotanicNotebookAccess(fakeDb(),{publicKey:keys.publicKey,botanicOrigin,notcardsOrigin,clock:()=>1_000_000});
  const body=Buffer.from('{"title":"Private"}'),request={privateKey:keys.privateKey,issuer:botanicOrigin,audience:notcardsOrigin,subject,method:'POST',path:'/api/notes',body,now:1000};
  const token=signBotanicNotebookAssertion(request);
  assert.deepEqual(access.verify(token,{method:'POST',path:'/api/notes',body}),{subject});
  assert.throws(()=>access.verify(token,{method:'POST',path:'/api/notes',body:Buffer.from('{}')}),{code:'invalid_botanic_assertion'});
  assert.throws(()=>access.verify(token,{method:'POST',path:'/api/notes?x=1',body}),{code:'invalid_botanic_assertion'});
  assert.throws(()=>access.verify(token,{method:'POST',path:'/api/notes',body}),{status:409});
  assert.equal(botanicNotebookPathAllowed('GET','/api/notes?include=conversation'),true);
  assert.equal(botanicNotebookPathAllowed('POST','/api/botanic/companion'),true);
  assert.equal(botanicNotebookPathAllowed('GET','/api/notes?include=private'),false);
  assert.equal(botanicNotebookPathAllowed('GET','/api/notes/abcdefghijk/summarize'),false);
});

test('Botanic bridge reads and writes existing account notebooks without triggering video inference',async t=>{
  const previous={key:process.env.NOTCARDS_BOTANIC_LAUNCH_PRIVATE_KEY,botanic:process.env.NOTCARDS_BOTANIC_ORIGIN,origin:process.env.NOTCARDS_PUBLIC_ORIGIN,receipt:process.env.NOTCARDS_BOTANIC_RECEIPT_PUBLIC_KEY};
  const keys=generateKeyPairSync('ed25519');process.env.NOTCARDS_BOTANIC_LAUNCH_PRIVATE_KEY=keys.privateKey.export({type:'pkcs8',format:'pem'}).toString();
  process.env.NOTCARDS_BOTANIC_RECEIPT_PUBLIC_KEY=keys.publicKey.export({type:'spki',format:'pem'}).toString();process.env.NOTCARDS_BOTANIC_ORIGIN=botanicOrigin;process.env.NOTCARDS_PUBLIC_ORIGIN=notcardsOrigin;
  const directory=await mkdtemp(join(tmpdir(),'notcards-botanic-access-'));let app,imports=0;
  t.after(async()=>{await app?.close();await rm(directory,{recursive:true,force:true});for(const [name,value] of Object.entries({NOTCARDS_BOTANIC_LAUNCH_PRIVATE_KEY:previous.key,NOTCARDS_BOTANIC_ORIGIN:previous.botanic,NOTCARDS_PUBLIC_ORIGIN:previous.origin,NOTCARDS_BOTANIC_RECEIPT_PUBLIC_KEY:previous.receipt})){if(value===undefined)delete process.env[name];else process.env[name]=value;}});
  const {startNotcardsServer}=await import('../src/notcards/server.mjs');
  app=await startNotcardsServer({directory,port:0,publicOrigin:notcardsOrigin,identity:{configured:false},videoImporter:{async fetch(){imports++;return null;},async close(){}},summaryConfig:{configurationValid:false}});
  const owner=app.store.user({issuer:'https://accounts.google.com',subject,email:'private@example.test',displayName:'Private'}),other=app.store.user({issuer:'https://accounts.google.com',subject:'other-subject',email:'other@example.test',displayName:'Other'});
  const local=`http://127.0.0.1:${app.server.address().port}`;
  const call=async(path,{method='GET',body=Buffer.alloc(0),subject:sub=subject,headers={}}={})=>{
    const payload=Buffer.isBuffer(body)?body:Buffer.from(JSON.stringify(body));
    const assertion=signBotanicNotebookAssertion({privateKey:keys.privateKey,issuer:botanicOrigin,audience:notcardsOrigin,subject:sub,method,path,body:payload});
    const response=await new Promise((resolve,reject)=>{const url=new URL(path,local),request=http.request({host:'127.0.0.1',port:url.port,path:url.pathname+url.search,method,headers:{Host:new URL(notcardsOrigin).host,'x-botanic-assertion':assertion,...headers,...(payload.length?{'content-type':'application/json'}:{})}},res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve({status:res.statusCode,text:Buffer.concat(chunks).toString(),contentType:res.headers['content-type'],json(){return JSON.parse(this.text);}}));});request.on('error',reject);if(payload.length)request.write(payload);request.end();});
    return {response,body:response.contentType?.startsWith('application/json')?response.json():null};
  };
  const created=await call('/api/notes',{method:'POST',body:{sourceType:'text',title:'Botanic plain note',text:'No inference on bridge create.'}});
  assert.equal(created.response.status,201,JSON.stringify(created.body));
  const id=created.body.id;assert.equal(imports,0);
  const fetched=await call(`/api/notes/${id}`);assert.equal(fetched.response.status,200);assert.match(fetched.body.segments[0].text,/No inference/);assert.equal(imports,0);
  const edited=await call(`/api/notes/${id}`,{method:'PATCH',body:{personalNotes:'Saved with no AI request.'}});assert.equal(edited.response.status,200);assert.equal(imports,0);
  const image=await call(`/api/notes/${id}/images`,{method:'POST',body:{name:'tiny.png',dataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/3ioAAAAASUVORK5CYII='}});
  assert.equal(image.response.status,201,JSON.stringify(image.body));
  const imageRead=await call(image.body.url);assert.equal(imageRead.response.status,200);
  const foreignImage=await call(image.body.url,{subject:'other-subject'});assert.equal(foreignImage.response.status,404);
  const listed=await call('/api/notes?include=conversation');assert.equal(listed.response.status,200);assert.equal(listed.body[0].conversationId,null);
  const launch=await call(`/api/notes/${id}/botanic-launch`,{method:'POST',body:{requestId:'botanic_request_001',question:'What is the note about?'}});
  assert.equal(launch.response.status,200,JSON.stringify(launch.body));assert.ok(launch.body.ticket);assert.equal(launch.body.question,'What is the note about?');
  const existingLaunch=await call(`/api/notes/${id}/botanic-launch`);assert.equal(existingLaunch.response.status,200);assert.equal(existingLaunch.body.conversationUrl,null);
  assert.equal(imports,0);
  const foreign=await call('/api/notes',{subject:'other-subject'});assert.deepEqual(foreign.body,[]);
  const forbidden=await call('/api/config');assert.equal(forbidden.response.status,401);
  const withOrigin=await call(`/api/notes/${id}`,{headers:{Origin:notcardsOrigin}});assert.equal(withOrigin.response.status,403);
  const session=app.store.issueSession(owner.id),withCookie=await call(`/api/notes/${id}`,{headers:{Cookie:`notcards_session=${session.token}`}});assert.equal(withCookie.response.status,403);

  const conversationId='c3725bca-9ac8-4b0a-88d1-33383c326830',companionRequest={conversationId,title:'Existing Botanic conversation',requestId:'existing_chat_001'};
  const attach=()=>call('/api/botanic/companion',{method:'POST',body:companionRequest});
  const first=await attach();assert.equal(first.response.status,201,JSON.stringify(first.body));assert.match(first.body.cardId,/^[A-Za-z0-9_-]{11}$/);assert.ok(first.body.launch.ticket);assert.equal(first.body.launch.question,'Notebook companion');
  const retry=await attach();assert.equal(retry.response.status,201);assert.equal(retry.body.cardId,first.body.cardId);assert.equal(retry.body.launch.ticket,first.body.launch.ticket);
  const changedTitle=await call('/api/botanic/companion',{method:'POST',body:{...companionRequest,title:'Changed title'}});assert.equal(changedTitle.response.status,409);
  const renamed=await call('/api/botanic/companion',{method:'POST',body:{...companionRequest,title:'Renamed native chat',requestId:'existing_chat_002'}});assert.equal(renamed.response.status,201);assert.equal(renamed.body.cardId,first.body.cardId);assert.equal((await call(`/api/notes/${first.body.cardId}`)).body.title,'Existing Botanic conversation');
  const reusedRequest=await call('/api/botanic/companion',{method:'POST',body:{...companionRequest,conversationId:'88f4ad4d-7560-4f70-9f80-ec4c2c7a9518'}});assert.equal(reusedRequest.response.status,409);
  const companionRead=await call(`/api/notes/${first.body.cardId}`);assert.equal(companionRead.response.status,200);assert.equal(companionRead.body.botanicConversationId,conversationId);assert.equal(imports,0);
  const foreignRead=await call(`/api/notes/${first.body.cardId}`,{subject:'other-subject'});assert.equal(foreignRead.response.status,404);
  const unknownBefore=app.store.db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  const unknown=await call('/api/botanic/companion',{subject:'unregistered-subject',method:'POST',body:{conversationId:'6bab5a03-c649-4d85-bd23-705bd95abac3',title:'No account',requestId:'unknown_user_01'}});
  assert.equal(unknown.response.status,401);assert.equal(app.store.db.prepare('SELECT COUNT(*) AS count FROM users').get().count,unknownBefore);

  const ownerAccount=await app.store.account(owner.id),collisionConversation='9feae231-7b27-4cd4-b437-f13454022c4c',collisionCard=botanicCompanionCardId(owner.id,collisionConversation);
  await ownerAccount.notebook.put({id:collisionCard,title:'Existing unrelated note',sourceType:'text',url:null,segments:[],revisions:[],personalNotes:'Keep me'});
  const collision=await call('/api/botanic/companion',{method:'POST',body:{conversationId:collisionConversation,title:'Would collide',requestId:'collision_test_001'}});
  assert.equal(collision.response.status,409);assert.equal((await ownerAccount.notebook.get(collisionCard)).title,'Existing unrelated note');

  const recoveryConversation='e049d9a6-c24e-4bb1-b2f8-f9e4c39d72ef',recoveryRequest='recovery_case_001';
  const recovery=new BotanicCompanionService({store:app.store,launchIssuer:{async issue(args){return {ticket:'test-ticket',question:args.question,context:{},botanicOrigin}}}});
  const reservation=recovery.reserve({userId:owner.id,conversationId:recoveryConversation,title:'Interrupted companion',requestId:recoveryRequest});
  assert.equal(reservation.state,'reserved');assert.equal(await ownerAccount.notebook.get(reservation.card_id),null);
  const recovered=await recovery.create({principal:{auth:'botanic',user:{id:owner.id}},verifiedSubject:subject,conversationId:recoveryConversation,title:'Interrupted companion',requestId:recoveryRequest});
  assert.equal(recovered.cardId,reservation.card_id);assert.equal(app.store.db.prepare('SELECT state FROM notcards_botanic_companions WHERE owner_id=? AND conversation_id=?').get(owner.id,recoveryConversation).state,'created');
  assert.equal(imports,0);

  const launchRow=app.store.db.prepare('SELECT * FROM notcards_botanic_companions WHERE owner_id=? AND conversation_id=?').get(owner.id,conversationId);
  app.store.db.prepare('UPDATE notcards_botanic_launches SET expires_at=0 WHERE owner_hash=? AND request_hash=?').run(
    createHash('sha256').update('https://accounts.google.com\0'+subject).digest('base64url'),createHash('sha256').update(launchRow.launch_request_id).digest('base64url'));
  const reattached=await attach();assert.equal(reattached.response.status,201);assert.notEqual(reattached.body.launch.ticket,first.body.launch.ticket);
  assert.equal(app.store.db.prepare('SELECT launch_generation FROM notcards_botanic_companions WHERE owner_id=? AND conversation_id=?').get(owner.id,conversationId).launch_generation,2);
  const launchClaims=JSON.parse(Buffer.from(reattached.body.launch.ticket.split('.')[1],'base64url').toString());
  const {signBindingAssertion}=createRequire(import.meta.url)('../integrations/botanic-notcards/server/launch.cjs');
  const receipt=signBindingAssertion({privateKey:keys.privateKey,issuer:botanicOrigin,audience:notcardsOrigin,user:{provider:'google',googleId:subject},cardId:first.body.cardId,launchJti:launchClaims.jti,conversationId});
  const receiptBody=Buffer.from(JSON.stringify({assertion:receipt}));
  const callback=await new Promise((resolve,reject)=>{const request=http.request({host:'127.0.0.1',port:new URL(local).port,path:'/api/botanic/receipt',method:'POST',headers:{Host:new URL(notcardsOrigin).host,'Content-Type':'application/json','Content-Length':receiptBody.length}},response=>{const chunks=[];response.on('data',chunk=>chunks.push(chunk));response.on('end',()=>resolve({status:response.statusCode,text:Buffer.concat(chunks).toString()}));});request.on('error',reject);request.end(receiptBody);});
  assert.equal(callback.status,200,callback.text);
  const confirmed=await call(`/api/notes/${first.body.cardId}/botanic-launch`);assert.equal(confirmed.body.conversationUrl,`${botanicOrigin}/c/${conversationId}`);
  assert.equal(imports,0);
});
