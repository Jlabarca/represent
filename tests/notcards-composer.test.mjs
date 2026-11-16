import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {startNotcardsServer} from '../src/notcards/server.mjs';
import {TestIdentity} from '../src/notcards/identity.mjs';
import {extractLinks,sourceTypeForLink,youtubeVideo} from '../src/clay-notes/web/composer-links.mjs';

test('extractLinks returns canonical ordered unique safe URLs and detects supported YouTube forms',()=>{
  const links=extractLinks('Read https://example.com/a). Then https://www.youtube.com/watch?v=abcdefghijk&t=8s and https://youtu.be/abcdefghijk?si=x; plus https://youtube.com/shorts/LMNOPQRSTUV and javascript:alert(1)');
  assert.deepEqual(links,['https://example.com/a','https://www.youtube.com/watch?v=abcdefghijk','https://www.youtube.com/watch?v=LMNOPQRSTUV']);
  assert.equal(sourceTypeForLink(links[0]),'web');
  assert.equal(youtubeVideo(links[1]).id,'abcdefghijk');
  assert.equal(youtubeVideo(links[2]).id,'LMNOPQRSTUV');
  assert.equal(youtubeVideo('https://youtube.com/shorts/lmnopqrst'),null); // invalid 10-character ID
});

test('composer preserves research text separately from captions, split metadata and retry idempotency',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'notcards-composer-'));
  const identity=new TestIdentity();
  const app=await startNotcardsServer({directory,port:0,identity});
  t.after(async()=>{await app.close();await rm(directory,{recursive:true,force:true});});
  const start=await fetch(`${app.url}/auth/google`,{redirect:'manual'}),authorize=new URL(start.headers.get('location'));
  const callback=await fetch(`${app.url}/auth/google/callback?code=test-code&state=${authorize.searchParams.get('state')}`,{headers:{Cookie:`notcards_oauth_state=${start.headers.get('set-cookie').split(';')[0].split('=')[1]}`},redirect:'manual'});
  const cookie=callback.headers.get('set-cookie').split(';')[0];
  const draftId=randomUUID(),body='Original thoughts https://example.com/paper and https://www.youtube.com/watch?v=abcdefghijk. Keep all of this.';
  const send=()=>fetch(`${app.url}/api/composer`,{method:'POST',headers:{Cookie:cookie,Origin:app.url,'Content-Type':'application/json'},body:JSON.stringify({draftId,body,title:'Research batch',split:true,folderId:null})});
  const response=await send();assert.equal(response.status,201);const {ids}=await response.json();assert.equal(ids.length,2);
  const retry=await send();assert.deepEqual((await retry.json()).ids,ids);
  const first=await fetch(`${app.url}/api/notes/${ids[0]}`,{headers:{Cookie:cookie}}).then(res=>res.json());
  const second=await fetch(`${app.url}/api/notes/${ids[1]}`,{headers:{Cookie:cookie}}).then(res=>res.json());
  assert.equal(first.sourceType,'web');assert.equal(first.personalNotes,body);assert.deepEqual(first.segments,[]);assert.equal(first.autoSummaryEligible,false);
  assert.equal(second.sourceType,'video');assert.equal(second.personalNotes,'');assert.deepEqual(second.segments,[]);assert.equal(second.autoSummaryEligible,false);
  assert.deepEqual(second.sourceLinks,['https://www.youtube.com/watch?v=abcdefghijk']);
  const conflict=await fetch(`${app.url}/api/composer`,{method:'POST',headers:{Cookie:cookie,Origin:app.url,'Content-Type':'application/json'},body:JSON.stringify({draftId,body:'changed',title:'x',split:true,folderId:null})});assert.equal(conflict.status,409);
});

test('composer is cookie-only and combined card type follows the first unique link',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'notcards-composer-cookie-')),identity=new TestIdentity(),app=await startNotcardsServer({directory,port:0,identity});
  t.after(async()=>{await app.close();await rm(directory,{recursive:true,force:true});});
  const start=await fetch(`${app.url}/auth/google`,{redirect:'manual'}),state=new URL(start.headers.get('location')).searchParams.get('state');
  const oauth=start.headers.get('set-cookie').split(';')[0].split('=')[1];
  const callback=await fetch(`${app.url}/auth/google/callback?code=test-code&state=${state}`,{headers:{Cookie:`notcards_oauth_state=${oauth}`},redirect:'manual'}),cookie=callback.headers.get('set-cookie').split(';')[0];
  const denied=await fetch(`${app.url}/api/composer`,{method:'POST',headers:{Origin:app.url,Authorization:'Bearer '+ 'x'.repeat(40),'Content-Type':'application/json'},body:'{}'});assert.equal(denied.status,401);
  const savedVideo=await fetch(`${app.url}/api/notes`,{method:'POST',headers:{Cookie:cookie,Origin:app.url,'Content-Type':'application/json'},body:JSON.stringify({url:'https://www.youtube.com/watch?v=abcdefghijk',title:'Already saved',text:'Earlier notes'})}).then(res=>res.json());
  const draftId=randomUUID(),body='https://youtu.be/abcdefghijk and https://example.org';
  const response=await fetch(`${app.url}/api/composer`,{method:'POST',headers:{Cookie:cookie,Origin:app.url,'Content-Type':'application/json'},body:JSON.stringify({draftId,body,title:'Combined',split:false,folderId:null})});
  assert.equal(response.status,201);const [id]=(await response.json()).ids;
  assert.notEqual(id,savedVideo.id);
  assert.equal((await fetch(`${app.url}/api/notes`,{headers:{Cookie:cookie}}).then(res=>res.json())).length,2);
  const note=await fetch(`${app.url}/api/notes/${id}`,{headers:{Cookie:cookie}}).then(res=>res.json());
  assert.equal(note.sourceType,'video');assert.equal(note.autoSummaryEligible,true);assert.equal(note.personalNotes,body);assert.deepEqual(note.segments,[]);
});

test('concurrent and partial split retries reuse each same-account card exactly once',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'notcards-composer-retry-')),identity=new TestIdentity(),app=await startNotcardsServer({directory,port:0,identity});
  t.after(async()=>{await app.close();await rm(directory,{recursive:true,force:true});});
  const start=await fetch(`${app.url}/auth/google`,{redirect:'manual'}),state=new URL(start.headers.get('location')).searchParams.get('state'),oauth=start.headers.get('set-cookie').split(';')[0].split('=')[1];
  const callback=await fetch(`${app.url}/auth/google/callback?code=test-code&state=${state}`,{headers:{Cookie:`notcards_oauth_state=${oauth}`},redirect:'manual'}),cookie=callback.headers.get('set-cookie').split(';')[0];
  const draftId=randomUUID(),body='A clip https://youtube.com/watch?v=abcdefghijk then https://example.org/source';
  const send=()=>fetch(`${app.url}/api/composer`,{method:'POST',headers:{Cookie:cookie,Origin:app.url,'Content-Type':'application/json'},body:JSON.stringify({draftId,body,title:'Retry split',split:true,folderId:null})});
  const account=await app.store.account((await app.store.session(cookie.slice(cookie.indexOf('=')+1)))?.user.id);
  const put=account.notebook.put.bind(account.notebook);let writes=0;
  account.notebook.put=async note=>{writes++;if(writes===2)throw new Error('simulated interrupted write');return put(note);};
  const interrupted=await send();assert.equal(interrupted.status,500);account.notebook.put=put;
  const retried=await send(),ids=(await retried.json()).ids;assert.equal(retried.status,201);assert.equal(ids.length,2);
  const concurrent=await Promise.all([send(),send()]);
  assert.deepEqual((await concurrent[0].json()).ids,ids);assert.deepEqual((await concurrent[1].json()).ids,ids);
  const notes=await fetch(`${app.url}/api/notes`,{headers:{Cookie:cookie}}).then(res=>res.json());assert.equal(notes.length,2);
  const first=await account.notebook.get(ids[0]),second=await account.notebook.get(ids[1]);
  assert.equal(first.autoSummaryEligible,true);assert.equal(second.autoSummaryEligible,false);
  assert.equal(first.personalNotes,body);assert.equal(second.personalNotes,'');assert.deepEqual(first.segments,[]);assert.deepEqual(second.segments,[]);
});
