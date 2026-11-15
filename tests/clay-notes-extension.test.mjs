import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const source=await readFile(new URL('../extensions/clay-notes/background.js',import.meta.url),'utf8');
const id='dQw4w9WgXcQ';
async function capture({captions={transcript:[{start:0,text:'Fixture claim'}],source:'fixture'},existing=false,current=id,metadataId=id,senderUrl=`https://www.youtube.com/watch?v=${id}`}={}){
  let listener;const events=[];
  const chrome={storage:{local:{get:async()=>({token:'a'.repeat(64)})}},runtime:{onMessage:{addListener:value=>{listener=value;}},openOptionsPage:async()=>events.push('options')},action:{onClicked:{addListener:()=>{}}},tabs:{create:async input=>{events.push('open');return input;},get:async()=>({url:`https://www.youtube.com/watch?v=${current}`})},scripting:{executeScript:async options=>{events.push(options.args[0]?'captions':'metadata');return [{result:options.args[0]?captions:{title:'Fixture video',channel:'Fixture channel',videoId:metadataId}}];}}};
  const fetcher=async(url,options)=>{if(url.endsWith('/api/notes')){events.push('save');return new Response(JSON.stringify({id,state:'awaiting_transcript',revisions:existing?[{}]:[]}));}if(url.endsWith('/transcript')){events.push('summarize');return new Response(JSON.stringify({id,state:'queued'}),{status:202});}throw new Error('Unexpected endpoint');};
  runInNewContext(source,{chrome,fetch:fetcher,URL,AbortSignal,console,setTimeout});
  const response=await new Promise(resolve=>{assert.equal(listener({type:'clay.capture'},{tab:{id:1,url:senderUrl}},resolve),true);});
  return {response,events};
}
test('extension saves and opens notebook before caption extraction or summarization',async()=>{
  const {response,events}=await capture();assert.equal(response.ok,true);assert.deepEqual(events,['metadata','save','open','captions','summarize']);
});
test('missing captions report a saved notebook with a recovery message',async()=>{
  const {response,events}=await capture({captions:{error:'No captions available'}});
  assert.equal(response.ok,true,'caption failure must acknowledge the saved notebook');assert.equal(response.needsTranscript,true);assert.match(response.message,/saved/i);assert.equal(events.includes('summarize'),false);
});
test('already summarized videos reopen without another AI call',async()=>{
  const {response,events}=await capture({existing:true});assert.equal(response.ok,true);assert.deepEqual(events,['metadata','save','open']);
});
test('video changes never submit another video transcript',async()=>{
  const {response,events}=await capture({current:'aaaaaaaaaaa'});assert.equal(response.needsTranscript,true);assert.equal(events.includes('summarize'),false);
});
test('non-YouTube senders cannot trigger capture',async()=>{
  const {response,events}=await capture({senderUrl:`https://evil.example/watch?v=${id}`});assert.equal(response.ok,false);assert.deepEqual(events,[]);
});
test('stale player metadata cannot label another video notebook',async()=>{
  const {response,events}=await capture({metadataId:'aaaaaaaaaaa'});assert.equal(response.ok,false);assert.deepEqual(events,['metadata']);
});
