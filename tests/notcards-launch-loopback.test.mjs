import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {generateKeyPairSync} from 'node:crypto';
import {startNotcardsServer} from '../src/notcards/server.mjs';
import {TestIdentity} from '../src/notcards/identity.mjs';

const require=createRequire(import.meta.url);
const {createNotcardsLaunchRouter}=require('../integrations/botanic-notcards/server/router.cjs');
const notcardsOrigin='https://notcards.loopback.test',botanicOrigin='https://botanic.loopback.test',subject='fixture-google-subject';

function fakeExpress(routes){
  return {Router(){return {post(path,...handlers){routes.push({method:'POST',path,handlers});},get(path,...handlers){routes.push({method:'GET',path,handlers});},use(handler){routes.push({method:'USE',handler});}};},urlencoded(){return async(req,_res,next)=>{const chunks=[];for await(const chunk of req.raw)chunks.push(chunk);const parsed=new URLSearchParams(Buffer.concat(chunks).toString('utf8'));req.body=Object.fromEntries(parsed);return next();};}};
}
function receiverHttp(routes){
  const auth=routes.find(route=>route.method==='USE').handler;
  const server=http.createServer(async(raw,res)=>{
    const route=routes.find(item=>item.method===raw.method&&item.path===new URL(raw.url,'http://localhost').pathname);
    if(!route){res.writeHead(404).end();return;}
    const req={raw,headers:raw.headers,body:{},get(name){return raw.headers[name.toLowerCase()]||null;}};
    const out={statusCode:200,headers:{},status(code){this.statusCode=code;return this;},set(name,value){this.headers[name]=value;return this;},json(value){res.writeHead(this.statusCode,{'Content-Type':'application/json',...this.headers});res.end(JSON.stringify(value));},cookie(name,value,options){this.headers['Set-Cookie']=`${name}=${value}; Path=${options.path}; Max-Age=${Math.floor(options.maxAge/1000)}; HttpOnly; Secure; SameSite=Lax`;},redirect(code,path){res.writeHead(code,{Location:path,...this.headers});res.end();}};
    const handlers=route.method==='GET'?[auth,...route.handlers]:route.handlers;
    let cursor=0;const next=async()=>{const handler=handlers[cursor++];if(!handler||res.writableEnded)return;await handler(req,out,next);};
    try{await next();}catch(error){if(!res.headersSent){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:error.message}));}}
  });
  return server;
}

test('signed Notcards envelope reaches the native Botanic loopback receiver and owner reclaims it',async t=>{
  const previous={key:process.env.NOTCARDS_BOTANIC_LAUNCH_PRIVATE_KEY,botanic:process.env.NOTCARDS_BOTANIC_ORIGIN,origin:process.env.NOTCARDS_PUBLIC_ORIGIN};
  const {privateKey,publicKey}=generateKeyPairSync('ed25519');
  const signing=generateKeyPairSync('ed25519'),previousVerifyKey=process.env.NOTCARDS_BOTANIC_RECEIPT_PUBLIC_KEY;
  process.env.NOTCARDS_BOTANIC_RECEIPT_PUBLIC_KEY=signing.publicKey.export({type:'spki',format:'pem'}).toString();
  t.after(()=>{if(previousVerifyKey===undefined)delete process.env.NOTCARDS_BOTANIC_RECEIPT_PUBLIC_KEY;else process.env.NOTCARDS_BOTANIC_RECEIPT_PUBLIC_KEY=previousVerifyKey;});
  process.env.NOTCARDS_BOTANIC_LAUNCH_PRIVATE_KEY=privateKey.export({type:'pkcs8',format:'pem'}).toString();
  process.env.NOTCARDS_BOTANIC_ORIGIN=botanicOrigin;process.env.NOTCARDS_PUBLIC_ORIGIN=notcardsOrigin;
  const directory=await mkdtemp(join(tmpdir(),'notcards-botanic-loopback-'));
  const identity=new TestIdentity({user:{issuer:'https://accounts.google.com',subject,email:'owner@example.test',displayName:'Owner'}});
  let app,receiver;
  t.after(async()=>{await app?.close();if(receiver?.listening)await new Promise(resolve=>receiver.close(resolve));await rm(directory,{recursive:true,force:true});for(const [name,value] of Object.entries({NOTCARDS_BOTANIC_LAUNCH_PRIVATE_KEY:previous.key,NOTCARDS_BOTANIC_ORIGIN:previous.botanic,NOTCARDS_PUBLIC_ORIGIN:previous.origin})){if(value===undefined)delete process.env[name];else process.env[name]=value;}});
  app=await startNotcardsServer({directory,port:0,identity,publicOrigin:notcardsOrigin,summaryConfig:{configurationValid:false},botanicConnector:{capabilities:{available:true,idempotentRequests:true},async sendQuestion(){return {conversationId:'unused'};},conversationUrl:()=>null}});
  const localUrl=`http://127.0.0.1:${app.server.address().port}`;
  const api=(path,options={})=>new Promise((resolve,reject)=>{
    const url=new URL(path,localUrl),request=http.request({host:'127.0.0.1',port:url.port,path:url.pathname+url.search,method:options.method||'GET',headers:{Host:new URL(notcardsOrigin).host,...options.headers}},response=>{
      const chunks=[];response.on('data',chunk=>chunks.push(chunk));response.on('end',()=>{const text=Buffer.concat(chunks).toString();const headers={get(name){const value=response.headers[name.toLowerCase()];return Array.isArray(value)?value.join(', '):value||null;}};resolve({status:response.statusCode,headers,clone(){return this;},async text(){return text;},async json(){return JSON.parse(text);}});});
    });request.on('error',reject);if(options.body)request.write(options.body);request.end();
  });
  const start=await api('/auth/google',{redirect:'manual'});assert.equal(start.status,302,await start.clone().text());const authUrl=new URL(start.headers.get('location')),state=authUrl.searchParams.get('state'),oauth=start.headers.get('set-cookie').split(';')[0].split('=').slice(1).join('=');
  const callback=await api(`/auth/google/callback?code=test-code&state=${encodeURIComponent(state)}`,{headers:{Cookie:`notcards_oauth_state=${oauth}`},redirect:'manual'});
  assert.equal(callback.status,302);const session=callback.headers.get('set-cookie').match(/notcards_session=([^;]+)/)[1];
  const headers={Origin:notcardsOrigin,Cookie:`notcards_session=${session}`,'Content-Type':'application/json'};
  const configResponse=await api('/api/config',{headers}),config=await configResponse.json();assert.equal(config.botanicLaunchAvailable,true);assert.equal(config.chatConfigured,true);assert.equal(config.cardChat.available,true);assert.equal(config.summary.available,false);assert.match(configResponse.headers.get('content-security-policy'),/form-action 'self' https:\/\/botanic\.loopback\.test/);
  const created=await api('/api/notes',{method:'POST',headers,body:JSON.stringify({sourceType:'text',title:'Loopback private notebook',text:'Source context from the account-owned note.'})});
  assert.equal(created.status,201);const note=await created.json();
  const issued=await api(`/api/notes/${note.id}/botanic-launch`,{method:'POST',headers,body:JSON.stringify({question:'Explain its main conclusion.',requestId:'loopback_request_001'})});
  assert.equal(issued.status,200);const envelope=await issued.json();assert.deepEqual(envelope.context.transcript,[{start:0,text:'Source context from the account-owned note.'}]);

  const routes=[],pending=new Map();const store={async insertPending(row){if(pending.has(row.jti))return false;pending.set(row.jti,{...row});return true;},async getPending(jti){return pending.get(jti)||null;},async bindPending(){return null;}};
  const routed=createNotcardsLaunchRouter({express:fakeExpress(routes),store,notcardsOrigin,audience:botanicOrigin,publicKey,agentId:'agent_notcards',requireJwtAuth(req,_res,next){req.user={provider:'google',googleId:subject,id:'native-owner'};return next();}});
  receiver=receiverHttp(routes);await new Promise(resolve=>receiver.listen(0,'127.0.0.1',resolve));
  const receiverUrl=`http://127.0.0.1:${receiver.address().port}`;
  const form=new URLSearchParams({ticket:envelope.ticket,question:envelope.question,context:JSON.stringify(envelope.context)});
  const accepted=await fetch(`${receiverUrl}/launch`,{method:'POST',headers:{Origin:notcardsOrigin,'Content-Type':'application/x-www-form-urlencoded'},body:form,redirect:'manual'});
  assert.equal(accepted.status,303);const launchCookie=accepted.headers.get('set-cookie');assert.match(launchCookie,/__Host-notcards_launch=/);assert.match(launchCookie,/HttpOnly; Secure; SameSite=Lax/);
  assert.equal(accepted.headers.get('location'),'/c/new?agent_id=agent_notcards&spec=notcards');
  const pendingResponse=await fetch(`${receiverUrl}/pending`,{headers:{Cookie:launchCookie.split(';')[0]}});
  assert.equal(pendingResponse.status,200);const reclaimed=await pendingResponse.json();assert.equal(reclaimed.cardId,note.id);assert.equal(reclaimed.question,envelope.question);
  assert.equal(pending.get(reclaimed.jti).subject,subject);assert.deepEqual(pending.get(reclaimed.jti).context,envelope.context);
  await routed.ledger.reclaim({jti:reclaimed.jti,user:{provider:'google',googleId:'some-other-owner'}}).then(()=>assert.fail('foreign owner should be rejected'),error=>assert.equal(error.code,'launch_owner_mismatch'));
  const {signBindingAssertion,signDeletionAssertion}=require('../integrations/botanic-notcards/server/launch.cjs');
  const args={privateKey:signing.privateKey,issuer:botanicOrigin,audience:notcardsOrigin,user:{provider:'google',googleId:subject},cardId:note.id,launchJti:reclaimed.jti,conversationId:'65edc781-c210-4309-9a7b-ef433cb82a1a'};
  const callbackPost=assertion=>api('/api/botanic/receipt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({assertion})});
  const cardRoute='/api/notes/'+note.id+'/botanic-launch';
  const currentLink=async()=>(await (await api(cardRoute,{headers})).json()).conversationUrl;
  const listWithChats=async()=>(await (await api('/api/notes?include=conversation',{headers})).json()).find(card=>card.id===note.id);
  assert.equal((await api('/api/notes?include=conversation')).status,401);
  assert.equal(Object.hasOwn((await (await api('/api/notes',{headers})).json())[0],'conversationId'),false);
  assert.equal((await listWithChats()).conversationId,null);
  assert.equal(await currentLink(),null);
  assert.equal((await callbackPost(signBindingAssertion({...args,privateKey}))).status,401);
  assert.equal((await callbackPost(signBindingAssertion({...args,user:{provider:'google',googleId:'another-account'}}))).status,409);
  const bound=signBindingAssertion(args);
  assert.equal((await callbackPost(bound)).status,200);
  assert.equal((await callbackPost(bound)).status,200);
  assert.equal(await currentLink(),botanicOrigin+'/c/'+args.conversationId);
  assert.equal((await listWithChats()).conversationId,args.conversationId);
  const other=app.store.user({...identity.user,subject:'second-fixture-owner',email:'other@example.test'});
  const otherCookie='notcards_session='+app.store.issueSession(other.id).token;
  const otherCards=await api('/api/notes?include=conversation',{headers:{Cookie:otherCookie}});
  assert.equal(otherCards.status,200);
  assert.deepEqual(await otherCards.json(),[]);
  assert.equal((await api(cardRoute,{method:'POST',headers,body:JSON.stringify({requestId:'new_request_123',question:'Duplicate?'})})).status,409);
  assert.equal((await callbackPost(signDeletionAssertion(args))).status,200);
  assert.equal((await listWithChats()).conversationId,null);
  assert.equal((await callbackPost(bound)).status,200);
  assert.equal(await currentLink(),null);
  assert.equal((await api('/api/notes/'+note.id,{headers})).status,200);
  assert.equal((await api(cardRoute,{method:'POST',headers,body:JSON.stringify({requestId:'new_request_124',question:'Start again?'})})).status,200);
});
