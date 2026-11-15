import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {videoIdentity, parseTranscript, NotebookStore, Gateway} from '../src/clay-notes/core.mjs';

test('watch and short links deduplicate to the same video identity', () => {
  assert.equal(videoIdentity('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=20').id,
    videoIdentity('https://youtu.be/dQw4w9WgXcQ').id, 'one notebook per video');
});

const video = {url:'https://youtu.be/dQw4w9WgXcQ', title:'A useful talk', channel:'Example'};
const summary = {overview:'The speaker discusses learning.', statements:[{text:'Practice helps.', sources:[0]}], conclusions:[{text:'Keep practicing.', sources:[1]}]};
const captions = [{start:10, text:'Practice helps.'}, {start:32, text:'Keep practicing.'}];
async function fixture(t, gateway = {complete:async () => ({result:summary, metrics:{requestedModel:'cheap', costUsd:0.001}})}) {
  const directory = await mkdtemp(join(tmpdir(), 'clay-notes-')); t.after(() => rm(directory, {recursive:true, force:true}));
  return new NotebookStore(directory, gateway).init();
}
test('rejects unrelated, deceptive and path-bearing URLs', () => {
  for (const url of ['file:///etc/passwd','https://youtube.com.evil/watch?v=dQw4w9WgXcQ','https://user:pass@youtube.com/watch?v=dQw4w9WgXcQ','https://youtu.be/../../secret','http://youtu.be/dQw4w9WgXcQ']) assert.throws(() => videoIdentity(url));
});
test('parses JSON3, XML and pasted timestamped captions with stable evidence ids', () => {
  assert.deepEqual(parseTranscript({events:[{tStartMs:1200, segs:[{utf8:'hello '},{utf8:'world'}]}]}), [{id:0,start:1.2,text:'hello world'}]);
  assert.equal(parseTranscript('<transcript><text start="4.5">A &amp; B</text></transcript>')[0].text, 'A & B');
  assert.equal(parseTranscript('1:02:03 A useful claim')[0].start, 3723);
  assert.throws(() => parseTranscript(''));
  assert.throws(() => parseTranscript([{text:'x'.repeat(16001)}]));
  assert.throws(() => parseTranscript([{start:-1,text:'no'}]));
});
test('creates a durable notebook immediately and deduplicates concurrent saves', async t => {
  const store = await fixture(t);
  const [a,b] = await Promise.all([store.create(video),store.create({...video,url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ'})]);
  assert.equal(a.id,b.id); assert.equal(a.state,'awaiting_transcript'); assert.equal((await store.list()).length,1);
  assert.equal((await new NotebookStore(store.directory).get(a.id)).title,video.title);
  assert.throws(() => store.path('../../escape'));
});
test('retains revisions and personal edits across regeneration and failures', async t => {
  let calls = 0;
  const store = await fixture(t,{complete:async () => {calls++; if(calls===3) throw new Error('gateway unavailable'); return {result:summary,metrics:{requestedModel:calls===1?'cheap':'smart'}};}});
  const note = await store.create(video); await store.transcript(note.id,captions);
  await store.summarize(note.id); await store.edit(note.id,{personalNotes:'My thoughts', pinned:true}); await store.summarize(note.id,'smart');
  await assert.rejects(store.summarize(note.id),/unavailable/);
  const saved = await store.get(note.id);
  assert.equal(saved.revisions.length,2); assert.equal(saved.personalNotes,'My thoughts'); assert.equal(saved.pinned,true); assert.equal(saved.state,'error');
  assert.deepEqual(saved.revisions[0].segments.map(s=>s.start),[10,32]);
});
test('serializes same-video generation and recovers interrupted states', async t => {
  let calls=0; const store = await fixture(t,{complete:async()=>{calls++; await new Promise(r=>setTimeout(r,10)); return {result:summary,metrics:{}};}});
  const note=await store.create(video); await store.transcript(note.id,captions);
  await Promise.all([store.summarize(note.id),store.summarize(note.id)]); assert.equal(calls,1);
  await store.mutate(note.id,n=>{n.state='summarizing';}); await store.recover(); assert.match((await store.get(note.id)).error,/restarted/);
});
test('gateway keeps transcript instructions in source data and records actual response metadata', async () => {
  let request;
  const gateway = new Gateway({key:'fake-consumer-key',fetcher:async(url,options)=>{request=JSON.parse(options.body);return new Response(JSON.stringify({model:'actual-model',choices:[{finish_reason:'stop',message:{content:JSON.stringify(summary)}}]}),{headers:{'x-litellm-response-cost':'0.003'}});}});
  const {metrics}=await gateway.complete({segments:parseTranscript(captions)});
  assert.equal(request.model,'cheap'); assert.match(request.messages[0].content,/untrusted source DATA/); assert.equal(metrics.responseModel,'actual-model'); assert.equal(metrics.costUsd,0.003);
  assert.equal(JSON.parse(request.messages[1].content).transcript.length,2);
});
test('rejects invalid citations, incomplete outputs and unconfigured models without replacing good content', async () => {
  const gateway = new Gateway({key:'fake',fetcher:async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({...summary, statements:[{text:'Unsupported', sources:[999]}]})}}]}))});
  await assert.rejects(gateway.complete({segments:parseTranscript(captions)}),/source references/);
  await assert.rejects(gateway.complete({model:'unapproved',segments:captions}),/not enabled/);
  await assert.rejects(new Gateway().complete({segments:captions}),/own Ghost virtual key/);
  const truncated = new Gateway({key:'fake',fetcher:async()=>new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content:'{}'}}]}))});
  await assert.rejects(truncated.complete({segments:captions}),/incomplete/);
});
test('lists only models allowed by both local policy and gateway key', async () => {
  const gateway = new Gateway({key:'fake',fetcher:async()=>new Response(JSON.stringify({data:[{id:'cheap'},{id:'image-gen'}]}))});
  assert.deepEqual(await gateway.availableModels(),['cheap']);
});
