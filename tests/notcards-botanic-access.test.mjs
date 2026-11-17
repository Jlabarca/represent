import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {generateKeyPairSync} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {BotanicNotebookAccess,signBotanicNotebookAssertion,botanicNotebookPathAllowed} from '../src/notcards/botanic-access.mjs';

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
});
