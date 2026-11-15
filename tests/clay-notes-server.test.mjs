import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import http from 'node:http';
import {startServer} from '../src/clay-notes/server.mjs';

test('unpaired API requests are rejected', async t => {
  const app = await fixture(t);
  const response = await fetch(`${app.url}/api/notes`);
  assert.equal(response.status,401,'unpaired request must be rejected');
});

const result={overview:'Fixture summary',statements:[{text:'A test claim',sources:[0]}],conclusions:[{text:'A test conclusion',sources:[0]}]};
const fakeGateway={key:'not-a-real-key',models:['cheap','smart'],availableModels:async()=>['cheap','smart'],complete:async()=>({result,metrics:{requestedModel:'cheap',responseModel:'fixture',costUsd:null}})};
async function fixture(t,gateway=fakeGateway){
  const directory=await mkdtemp(join(tmpdir(),'clay-server-'));
  const app=await startServer({directory,port:0,gateway});
  t.after(async()=>{await app.close();await rm(directory,{recursive:true,force:true});});return app;
}
const request=(app,path,{method='GET',data,headers={}}={})=>fetch(`${app.url}/api${path}`,{method,headers:{Authorization:`Bearer ${app.token}`,...(data?{'Content-Type':'application/json'}:{}),...headers},...(data?{body:JSON.stringify(data)}:{})});
const input={url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ',title:'Service fixture'};
async function settled(app,id){for(let i=0;i<100;i++){const note=await app.store.get(id);if(!['queued','summarizing'].includes(note.state))return note;await new Promise(resolve=>setTimeout(resolve,10));}throw new Error('Fixture job did not settle');}

test('persists notebook before generation finishes and supports redo and Q&A',async t=>{
  let release;const wait=new Promise(resolve=>{release=resolve;});
  const app=await fixture(t,{...fakeGateway,complete:async({question})=>{await wait;return {result:question?{answer:'Supported answer',sources:[0]}:result,metrics:{requestedModel:'cheap'}};}});
  const response=await request(app,'/notes',{method:'POST',data:input});assert.equal(response.status,201);const note=await response.json();assert.equal(note.state,'awaiting_transcript');
  const queued=await request(app,`/notes/${note.id}/transcript`,{method:'POST',data:{transcript:'0:10 A test claim',source:'fixture'}});assert.equal(queued.status,202);
  assert.equal((await app.store.get(note.id)).revisions.length,0);
  assert.equal((await request(app,`/notes/${note.id}/summarize`,{method:'POST',data:{}})).status,409);
  release();assert.equal((await settled(app,note.id)).revisions.length,1);
  assert.equal((await request(app,`/notes/${note.id}/summarize`,{method:'POST',data:{model:'smart'}})).status,202);assert.equal((await settled(app,note.id)).revisions.length,2);
  const answer=await request(app,`/notes/${note.id}/ask`,{method:'POST',data:{question:'What is the claim?'}});assert.equal(answer.status,200);assert.equal((await answer.json()).conversations.length,1);
  const listed=await (await request(app,'/notes')).json();assert.equal(listed[0].overview,'Fixture summary');assert.equal(listed[0].segments,undefined);
});
test('enforces host, origin, auth and same-origin pairing disclosure',async t=>{
  const app=await fixture(t);
  assert.equal((await request(app,'/notes',{headers:{Origin:'https://untrusted.example'}})).status,403);
  const hostStatus=await new Promise((resolve,reject)=>{http.get(`${app.url}/api/notes`,{headers:{Host:'untrusted.example',Authorization:`Bearer ${app.token}`}},response=>{response.resume();resolve(response.statusCode);}).on('error',reject);});
  assert.equal(hostStatus,403);
  assert.equal((await request(app,'/notes',{headers:{Authorization:'Bearer wrong'}})).status,401);
  const ext=await request(app,'/config',{headers:{Origin:`chrome-extension://${'a'.repeat(32)}`}});const config=await ext.json();assert.equal(config.pairingToken,undefined);assert.deepEqual(config.models,['cheap','smart']);assert.equal(JSON.stringify(config).includes('not-a-real-key'),false);
  const page=await fetch(app.url);assert.equal(page.status,200);const cookie=page.headers.get('set-cookie').split(';')[0];assert.match(page.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  const own=await fetch(`${app.url}/api/config`,{headers:{cookie}});assert.equal((await own.json()).pairingToken,app.token);
});
test('bounds and validates inputs while retaining notes on missing AI configuration',async t=>{
  const app=await fixture(t,{models:['cheap'],availableModels:async()=>[],complete:async()=>{throw new Error('No dedicated key configured');}});
  assert.equal((await request(app,'/notes',{method:'POST',data:{url:'https://evil.example'}})).status,400);
  const note=await (await request(app,'/notes',{method:'POST',data:input})).json();
  assert.equal((await request(app,`/notes/${note.id}/transcript`,{method:'POST',data:{transcript:'0:00 Claim'}})).status,202);
  const saved=await settled(app,note.id);assert.equal(saved.state,'error');assert.match(saved.error,/dedicated key/);assert.equal(saved.title,input.title);
  assert.equal((await request(app,`/notes/${note.id}/summarize`,{method:'POST',data:{model:'unknown'}})).status,400);
  const bad=await fetch(`${app.url}/api/notes`,{method:'POST',headers:{Authorization:`Bearer ${app.token}`,'Content-Type':'application/json'},body:'{"bad"'});assert.equal(bad.status,400);
  const large=await request(app,'/notes',{method:'POST',data:{url:input.url,title:'x'.repeat(1_000_001)}});assert.equal(large.status,413);
});
test('serves bundled Satoshi and refuses filesystem traversal',async t=>{
  const app=await fixture(t);
  const font=await fetch(`${app.url}/assets/satoshi-700.woff2`);assert.equal(font.status,200);assert.equal(font.headers.get('content-type'),'font/woff2');assert.ok((await font.arrayBuffer()).byteLength>10000);
  assert.equal((await fetch(`${app.url}/%2e%2e/package.json`)).status,404);
});
test('extension limits its host permissions and contains no gateway credential plumbing',async()=>{
  const root=new URL('../extensions/clay-notes/',import.meta.url);
  const manifest=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
  assert.equal(manifest.manifest_version,3);assert.ok(manifest.host_permissions.includes('https://www.youtube.com/*'));assert.equal(manifest.host_permissions.includes('<all_urls>'),false);
  const worker=await readFile(new URL('background.js',root),'utf8');assert.match(worker,/world:'MAIN'/);assert.match(worker,/api\/timedtext/);assert.match(worker,/Video changed during capture/);assert.doesNotMatch(worker,/CLAY_NOTES_GHOST_KEY/);
});
