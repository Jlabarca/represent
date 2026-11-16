import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
import http from 'node:http';
import {startNotcardsServer} from '../src/notcards/server.mjs';
import {TestIdentity} from '../src/notcards/identity.mjs';

const extensionId='aimdojafaddgpjhiejbfihfljeacolmk';
const extensionOrigin=`chrome-extension://${extensionId}`;
const storeExtensionId='bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const storeExtensionOrigin=`chrome-extension://${storeExtensionId}`;
const sha=value=>createHash('sha256').update(value).digest('base64url');
const cookieValue=(headers,name)=>headers.getSetCookie().map(item=>item.split(';')[0]).find(item=>item.startsWith(`${name}=`))?.slice(name.length+1);
let sharedDirectory,sharedIdentity,sharedApp,sharedZip;

before(async()=>{
  sharedDirectory=await mkdtemp(join(tmpdir(),'notcards-hosted-suite-'));
  sharedZip=join(sharedDirectory,'releases','notcards-dev.zip');
  await mkdir(join(sharedDirectory,'releases'),{recursive:true});
  await writeFile(sharedZip,Buffer.from('PK\x03\x04fixture'));
  sharedIdentity=new TestIdentity();sharedIdentity.configured=false;
  sharedApp=await startNotcardsServer({directory:join(sharedDirectory,'store'),port:0,identity:sharedIdentity,extensionId,storeExtensionId,extensionZip:sharedZip});
});
after(async()=>{await sharedApp?.close();if(sharedDirectory)await rm(sharedDirectory,{recursive:true,force:true});});

async function login(app,identity){
  const start=await fetch(`${app.url}/auth/google`,{redirect:'manual'});
  const location=start.headers.get('location');
  assert.match(location,/identity\.test\/authorize/);
  const state=new URL(location).searchParams.get('state');
  const oauthCookie=cookieValue(start.headers,'notcards_oauth_state');
  const callback=await fetch(`${app.url}/auth/google/callback?code=test-code&state=${encodeURIComponent(state)}`,{headers:{Cookie:`notcards_oauth_state=${oauthCookie}`},redirect:'manual'});
  assert.equal(callback.status,302);
  const token=cookieValue(callback.headers,'notcards_session');
  assert.ok(token);
  return token;
}

async function request(app,path,{method='GET',token,origin=app.url,body,idempotencyKey}={}){
  const headers={...(origin?{Origin:origin}:{}),...(token?{Cookie:`notcards_session=${token}`} : {}),...(body?{'Content-Type':'application/json'}:{}),...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})};
  return fetch(`${app.url}${path}`,{method,headers,...(body?{body:JSON.stringify(body)}:{}),redirect:'manual'});
}

test('public library remains reachable while private APIs require Google identity',async()=>{
  const app=sharedApp;
  const page=await fetch(app.url);
  assert.equal(page.status,200);
  const landing=await page.text();
  assert.match(landing,/Notcards|Clay Notes/);
  assert.doesNotMatch(landing,/connect-dialog|D:\/ware\/represent\/extensions/i);
  assert.deepEqual(await (await fetch(`${app.url}/api/session`)).json(),{authenticated:false,user:null,cacheScope:null,googleConfigured:false});
  const notes=await fetch(`${app.url}/api/notes`);
  assert.equal(notes.status,401);
  assert.equal((await notes.json()).code,'sign_in_required');
  const signIn=await fetch(`${app.url}/auth/google`,{redirect:'manual'});
  assert.equal(signIn.status,503);
});

test('Google sessions, research notebooks and folders stay isolated per account',async()=>{
  const app=sharedApp,identity=sharedIdentity;identity.configured=true;
  const firstCookie=await login(app,identity);
  const session=await fetch(`${app.url}/api/session`,{headers:{Cookie:`notcards_session=${firstCookie}`}}).then(res=>res.json());
  assert.equal(session.authenticated,true);
  assert.equal(session.cacheScope,session.user.id);
  assert.equal(session.googleConfigured,true);
  const folderResponse=await request(app,'/api/folders',{method:'POST',token:firstCookie,body:{name:'Research'}});
  const folder=await folderResponse.json();
  assert.equal(folderResponse.status,201);
  const create=await request(app,'/api/notes',{method:'POST',token:firstCookie,body:{sourceType:'web',title:'A paper worth reading',url:'https://example.com/paper',text:'First supported claim.\nSecond supported claim.',folderId:folder.id}});
  assert.equal(create.status,201);
  const note=await create.json();
  assert.equal(note.state,'awaiting_summary');
  assert.equal(note.segments.length,2);
  assert.equal(note.folderId,folder.id);
  assert.equal(note.sourceType,'web');
  const appearance=await request(app,`/api/notes/${note.id}`,{method:'PATCH',token:firstCookie,body:{finish:'prism'}});
  assert.equal((await appearance.json()).finish,'prism');
  const list=await request(app,'/api/notes',{token:firstCookie}).then(res=>res.json());
  assert.equal(list.length,1);
  assert.equal(list[0].folderId,folder.id);
  assert.equal(list[0].finish,'prism');
  assert.equal(list[0].sourceType,'web');
  assert.equal((await request(app,'/api/folders',{token:firstCookie}).then(res=>res.json()))[0].count,1);
  app.store.maxNotes=2;
  const competing=await Promise.all([
    request(app,'/api/notes',{method:'POST',token:firstCookie,body:{title:'Last available notebook',text:'A short research note.'}}),
    request(app,'/api/notes',{method:'POST',token:firstCookie,body:{title:'Over the notebook limit',text:'This must be rejected.'}})
  ]);
  assert.deepEqual(competing.map(response=>response.status).sort(),[201,409]);
  const summary=await request(app,`/api/notes/${note.id}/summarize`,{method:'POST',token:firstCookie,body:{model:'cheap'}});
  assert.equal(summary.status,503);
  assert.equal((await summary.json()).code,'ai_setup_pending');

  identity.user={issuer:'https://accounts.google.com',subject:'second-account',email:'other@example.invalid',displayName:'Other Account'};
  const secondCookie=await login(app,identity);
  const secondSession=await fetch(`${app.url}/api/session`,{headers:{Cookie:`notcards_session=${secondCookie}`}}).then(res=>res.json());
  assert.notEqual(secondSession.cacheScope,session.cacheScope);
  const hidden=await request(app,`/api/notes/${note.id}`,{token:secondCookie});
  assert.equal(hidden.status,404);
  assert.deepEqual(await request(app,'/api/folders',{token:secondCookie}).then(res=>res.json()),[]);
  const own=await request(app,'/api/notes',{token:secondCookie}).then(res=>res.json());
  assert.deepEqual(own,[]);
});

test('extension authorization binds PKCE grants to one account and revokes them on logout',async()=>{
  const app=sharedApp,identity=sharedIdentity;identity.user={issuer:'https://accounts.google.com',subject:'extension-test-account',email:'extension@example.invalid',displayName:'Extension Account'};
  const cookie=await login(app,identity);
  const verifier=randomBytes(32).toString('base64url'),challenge=sha(verifier),state=randomBytes(24).toString('base64url');
  const redirectUri=`https://${extensionId}.chromiumapp.org/auth`;
  const authorize=new URL(`${app.url}/auth/extension/authorize`);
  authorize.search=new URLSearchParams({challenge,state,redirectUri}).toString();
  assert.equal(authorize.searchParams.get('redirectUri'),redirectUri);
  const authorization=await fetch(authorize,{headers:{Cookie:`notcards_session=${cookie}`},redirect:'manual'});
  assert.equal(authorization.status,302,await authorization.clone().text());
  const callback=new URL(authorization.headers.get('location'));
  assert.equal(callback.searchParams.get('state'),state);
  const exchange=await request(app,'/auth/extension/token',{method:'POST',origin:extensionOrigin,body:{code:callback.searchParams.get('code'),verifier,redirectUri}});
  assert.equal(exchange.status,200);
  const grant=await exchange.json();
  assert.equal(grant.tokenType,'Bearer');
  assert.equal(grant.user.email,'extension@example.invalid');
  assert.equal(typeof grant.expiresAt,'string');
  assert.ok(Date.parse(grant.expiresAt)>Date.now());
  assert.equal(exchange.headers.get('access-control-allow-origin'),extensionOrigin);
  const privateRead=await fetch(`${app.url}/api/notes`,{headers:{Origin:extensionOrigin,Authorization:`Bearer ${grant.accessToken}`}});
  assert.equal(privateRead.status,403);
  const accountCheck=await fetch(`${app.url}/api/session`,{headers:{Origin:extensionOrigin,Authorization:`Bearer ${grant.accessToken}`}});
  assert.equal((await accountCheck.json()).cacheScope,grant.user.id);
  const cannotMint=await fetch(`${app.url}/auth/extension/authorize?${new URLSearchParams({challenge,state:randomBytes(24).toString('base64url'),redirectUri})}`,{headers:{Authorization:`Bearer ${grant.accessToken}`},redirect:'manual'});
  assert.equal(cannotMint.status,302);
  assert.match(cannotMint.headers.get('location'),/^https:\/\/identity\.test\//);

  const differentOwner=app.store.user({issuer:'https://fixture.invalid',subject:'other-cookie',email:'cookie@example.invalid',displayName:'Web account'});
  const ambientCookie='notcards_session='+app.store.issueSession(differentOwner.id).token;
  const mixedHeaders={Origin:extensionOrigin,Cookie:ambientCookie,Authorization:`Bearer ${grant.accessToken}`};
  const mixed=await fetch(`${app.url}/api/session`,{headers:mixedHeaders}).then(r=>r.json());
  assert.equal(mixed.cacheScope,grant.user.id);
  const invalid=await fetch(`${app.url}/api/session`,{headers:{...mixedHeaders,Authorization:'Bearer expired'}}).then(r=>r.json());
  assert.equal(invalid.authenticated,false);
  const key=randomBytes(24).toString('base64url');
  const capture=await fetch(`${app.url}/api/capture`,{method:'POST',headers:{...mixedHeaders,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify({url:'https://www.youtube.com/watch?v=X6J3ByTqhLY',title:'Video summary trial',channel:'Example',transcript:'',source:'youtube-captions'} )});
  assert.equal(capture.status,201);
  const saved=await capture.json();
  assert.equal(saved.state,'awaiting_transcript');
  assert.equal(saved.openUrl,`/#note=${saved.id}`);
  const replay=await fetch(`${app.url}/api/capture`,{method:'POST',headers:{Origin:extensionOrigin,Authorization:`Bearer ${grant.accessToken}`,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify({url:'https://www.youtube.com/watch?v=X6J3ByTqhLY',title:'Video summary trial',channel:'Example',transcript:'',source:'youtube-captions'} )});
  assert.equal((await replay.json()).id,saved.id);
  const changed=await fetch(`${app.url}/api/capture`,{method:'POST',headers:{Origin:extensionOrigin,Authorization:`Bearer ${grant.accessToken}`,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify({url:'https://www.youtube.com/watch?v=X6J3ByTqhLY',title:'Different data',channel:'Example',transcript:'',source:'youtube-captions'} )});
  assert.equal(changed.status,409);
  const structuredKey=randomBytes(24).toString('base64url');
  const structured=await fetch(`${app.url}/api/capture`,{method:'POST',headers:{Origin:extensionOrigin,Authorization:`Bearer ${grant.accessToken}`,'Content-Type':'application/json','Idempotency-Key':structuredKey},body:JSON.stringify({url:'https://www.youtube.com/watch?v=AbCdEfGhijk',title:'Structured captions',channel:'Example',transcript:{events:[{tStartMs:1250,segs:[{utf8:'A caption from YouTube.'}]}]},source:'youtube-captions:en'} )});
  assert.equal(structured.status,201,await structured.clone().text());
  const structuredNote=await structured.json();
  assert.match(structuredNote.id,/^[A-Za-z0-9_-]{11}$/);
  assert.equal(structuredNote.state,'awaiting_summary');
  const stored=await fetch(`${app.url}/api/notes/${structuredNote.id}`,{headers:{Cookie:`notcards_session=${cookie}`}}).then(response=>response.json());
  assert.deepEqual(stored.segments.map(({start,text})=>({start,text})),[{start:1.25,text:'A caption from YouTube.'}]);
  const listed=await fetch(`${app.url}/api/notes`,{headers:{Origin:app.url,Cookie:`notcards_session=${cookie}`}}).then(res=>res.json());
  assert.equal(listed.length,2);
  const logout=await fetch(`${app.url}/auth/logout`,{method:'POST',headers:{Origin:app.url,Cookie:`notcards_session=${cookie}`}});
  assert.equal(logout.status,200);
  const revoked=await fetch(`${app.url}/api/notes`,{headers:{Origin:extensionOrigin,Authorization:`Bearer ${grant.accessToken}`}});
  assert.equal(revoked.status,401);
});

test('extension token exchange is one-time and verifies callback and PKCE values',async()=>{
  const app=sharedApp,identity=sharedIdentity;
  const user=await app.store.user(identity.user),verifier=randomBytes(32).toString('base64url');
  const code=app.store.issueExtensionCode({userId:user.id,challenge:sha(verifier),redirectUri:`https://${extensionId}.chromiumapp.org/auth`,state:randomBytes(24).toString('base64url')});
  assert.throws(()=>app.store.exchangeExtensionCode({code:code.code,verifier:'x'.repeat(43),redirectUri:code.redirectUri}),/expired|invalid/i);
  assert.throws(()=>app.store.exchangeExtensionCode({code:code.code,verifier,redirectUri:'https://attacker.invalid/callback'}),/invalid/i);
  const accepted=app.store.exchangeExtensionCode({code:code.code,verifier,redirectUri:code.redirectUri});
  assert.ok(app.store.grant(accepted.accessToken));
  assert.throws(()=>app.store.exchangeExtensionCode({code:code.code,verifier,redirectUri:code.redirectUri}),/expired/i);
  const revoke=await fetch(`${app.url}/auth/extension/revoke`,{method:'POST',headers:{Origin:extensionOrigin,Authorization:`Bearer ${accepted.accessToken}`}});
  assert.equal(revoke.status,200);
  assert.equal(app.store.grant(accepted.accessToken),null);
});

test('local and unconfigured-extension origins cannot read hosted account APIs',async()=>{
  const app=sharedApp,identity=sharedIdentity;
  const cookie=await login(app,identity);
  const bad=await fetch(`${app.url}/api/notes`,{headers:{Origin:'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',Cookie:`notcards_session=${cookie}`}});
  assert.equal(bad.status,403);
  const preflight=await fetch(`${app.url}/api/capture`,{method:'OPTIONS',headers:{Origin:extensionOrigin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type,idempotency-key'}});
  assert.equal(preflight.status,204);
  assert.equal(preflight.headers.get('access-control-allow-origin'),extensionOrigin);
  const address=new URL(app.url);
  const wrongHost=await new Promise((resolve,reject)=>http.get({hostname:'127.0.0.1',port:Number(address.port),headers:{Host:'attacker.invalid'}},response=>{response.resume();response.once('end',()=>resolve(response.statusCode));}).once('error',reject));
  assert.equal(wrongHost,403);
});

test('only the configured development and assigned Store extension IDs can authorize',async()=>{
  const app=sharedApp,identity=sharedIdentity;
  const user=await app.store.user(identity.user),session=app.store.issueSession(user.id).token;
  const verifier=randomBytes(32).toString('base64url'),challenge=sha(verifier),state=randomBytes(24).toString('base64url');
  const authorize=redirectUri=>fetch(`${app.url}/auth/extension/authorize?${new URLSearchParams({challenge,state,redirectUri})}`,{headers:{Cookie:`notcards_session=${session}`},redirect:'manual'});
  const devRedirect=`https://${extensionId}.chromiumapp.org/auth`,storeRedirect=`https://${storeExtensionId}.chromiumapp.org/auth`;
  const dev=await authorize(devRedirect);
  const assigned=await authorize(storeRedirect);
  assert.equal(dev.status,302);
  assert.equal(assigned.status,302);
  assert.equal(new URL(assigned.headers.get('location')).hostname,`${storeExtensionId}.chromiumapp.org`);
  const callback=new URL(assigned.headers.get('location'));
  const exchange=await request(app,'/auth/extension/token',{method:'POST',origin:storeExtensionOrigin,body:{code:callback.searchParams.get('code'),verifier,redirectUri:storeRedirect}});
  assert.equal(exchange.status,200);
  assert.equal(exchange.headers.get('access-control-allow-origin'),storeExtensionOrigin);
  const offList=await authorize('https://cccccccccccccccccccccccccccccccc.chromiumapp.org/auth');
  assert.equal(offList.status,400);
  const storePreflight=await fetch(`${app.url}/api/capture`,{method:'OPTIONS',headers:{Origin:storeExtensionOrigin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type,idempotency-key'}});
  assert.equal(storePreflight.status,204);
  assert.equal(storePreflight.headers.get('access-control-allow-origin'),storeExtensionOrigin);
  const unknownPreflight=await fetch(`${app.url}/api/capture`,{method:'OPTIONS',headers:{Origin:'chrome-extension://cccccccccccccccccccccccccccccccc','Access-Control-Request-Method':'POST'}});
  assert.notEqual(unknownPreflight.status,204);
});

test('download response is private to the configured fixed artifact path and revalidates',async()=>{
  const response=await fetch(`${sharedApp.url}/downloads/notcards-dev.zip`);
  assert.equal(response.status,200);
  assert.equal(response.headers.get('content-type'),'application/zip');
  assert.match(response.headers.get('cache-control'),/no-cache/);
  assert.equal(Buffer.from(await response.arrayBuffer()).toString('utf8'),'PK\u0003\u0004fixture');
});
