import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile,rename} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {replaceFile} from '../src/clay-notes/core.mjs';
import {requestJSON} from '../src/clay-notes/web/session.mjs';
import {readPreferences,resolveTheme,pendingNoteMessage,translate} from '../src/clay-notes/web/i18n.mjs';
test('transient Windows file locks are retried before replacing a saved notebook',async()=>{
  let calls=0;const result=await replaceFile('source','target',{renameFile:async()=>{calls++;if(calls===1)throw Object.assign(new Error('locked'),{code:'EPERM'});},wait:async()=>{}});
  assert.equal(result,true,'transient Windows file lock must be retried');assert.equal(calls,2);
});
test('permanent replacement errors do not overwrite existing file data or loop indefinitely',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'clay-lock-'));t.after(()=>rm(directory,{recursive:true,force:true}));const source=join(directory,'new.json'),target=join(directory,'old.json');
  await writeFile(source,'new');await writeFile(target,'old');let calls=0;
  await assert.rejects(replaceFile(source,target,{renameFile:async()=>{calls++;throw Object.assign(new Error('invalid'),{code:'EINVAL'});},wait:async()=>{}}),/invalid/);
  assert.equal(calls,1);assert.equal(await readFile(target,'utf8'),'old');
  let locked=0;await replaceFile(source,target,{renameFile:async(...args)=>{if(!locked++)throw Object.assign(new Error('sharing violation'),{code:'EPERM'});return rename(...args);},wait:async()=>{}});assert.equal(await readFile(target,'utf8'),'new');
  let attempts=0;await assert.rejects(replaceFile(source,target,{attempts:3,renameFile:async()=>{attempts++;throw Object.assign(new Error('busy'),{code:'EBUSY'});},wait:async()=>{}}),/busy/);assert.equal(attempts,3);
});
test('website recovery is bounded and does not retry real errors or extension credentials',async()=>{
  let calls=0;const denied=async()=>{calls++;return new Response(JSON.stringify({error:'expired',code:'web_session_expired'}),{status:401});};
  await assert.rejects(requestJSON(denied,'/api/notes'),/expired/);assert.equal(calls,2);
  calls=0;await assert.rejects(requestJSON(async()=>{calls++;return new Response(JSON.stringify({error:'budget'}),{status:429});},'/api/notes'),/budget/);assert.equal(calls,1);
  calls=0;await assert.rejects(requestJSON(denied,'/api/notes',{headers:{authorization:'Bearer fake'}}),/expired/);assert.equal(calls,1);
});
test('automatic language/theme use browser and OS preferences; saved overrides stay independent',()=>{
  const automatic=readPreferences({getItem:()=>null},['es-CL','en'],true);assert.equal(automatic.language,'auto');assert.equal(automatic.locale,'es');assert.equal(automatic.appearance,'dark');
  const values={'clay-notes-language':'ja','clay-notes-theme':'light'};const manual=readPreferences({getItem:key=>values[key]},['es'],true);assert.equal(manual.locale,'ja');assert.equal(manual.appearance,'light');
  assert.equal(resolveTheme('auto',false),'light');assert.equal(resolveTheme('auto',true),'dark');assert.equal(resolveTheme('dark',false),'dark');
  assert.equal(readPreferences({getItem:()=>{throw new Error('disabled');}},['fr-FR']).locale,'fr');
});
test('captured-but-not-started sources never claim an active summary job',()=>{
  assert.equal(pendingNoteMessage('awaiting_summary'),'Ready to summarize');assert.notEqual(pendingNoteMessage('awaiting_summary'),pendingNoteMessage('summarizing'));
  assert.equal(translate('es',pendingNoteMessage('awaiting_summary')),'Lista para resumir');
});
test('website session refresh retries an auth-rejected mutation once without extension pairing',async()=>{
  const calls=[];let mutations=0;
  const fetcher=async(url)=>{calls.push(url);if(url==='/')return new Response('<html>session cookie</html>');if(calls.length===1)return new Response(JSON.stringify({code:'web_session_expired',error:'Session expired'}),{status:401});mutations++;return new Response(JSON.stringify({saved:true}));};
  const value=await requestJSON(fetcher,'/api/notes',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  assert.equal(value.saved,true,'website should recover its own session');assert.deepEqual(calls,['/api/notes','/','/api/notes']);assert.equal(mutations,1);
});
