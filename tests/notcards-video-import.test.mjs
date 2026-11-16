import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {VideoImportService,videoImportInternals} from '../src/notcards/video-import.mjs';
import {NotcardsStore} from '../src/notcards/store.mjs';

const video=id=>({id,url:`https://www.youtube.com/watch?v=${id}`,thumbnail:`https://i.ytimg.com/vi/${id}/hqdefault.jpg`});
const metadata=(id,title=`Public title ${id}`)=>new Response(JSON.stringify({title,author_name:'Public channel',thumbnail_url:`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}),{headers:{'content-type':'application/json'}});
const playerHtml=(id,{tracks=[{languageCode:'es',baseUrl:`https://www.youtube.com/api/timedtext?v=${id}&lang=es`}],showTranscript=false}={})=>{
  const player={captions:{playerCaptionsTracklistRenderer:{captionTracks:tracks}}};
  const data=showTranscript?{engagementPanels:[{engagementPanelSectionListRenderer:{content:{transcriptRenderer:{footer:{button:{buttonRenderer:{navigationEndpoint:{getTranscriptEndpoint:{params:'public-transcript-params'}}}}}}}}}]}:{};
  const config={INNERTUBE_API_KEY:'public-test-key-not-credential',INNERTUBE_CONTEXT:{client:{clientName:'WEB',clientVersion:'2.test',visitorData:'public-visitor'}}};
  return `var ytInitialPlayerResponse = ${JSON.stringify(player)}; var ytInitialData = ${JSON.stringify(data)}; ytcfg.set(${JSON.stringify(config)});`;
};
const json3=events=>new Response(JSON.stringify({events}),{headers:{'content-type':'application/json'}});

test('parses public YouTube page state and transcript endpoints without trusting arbitrary hosts',()=>{
  const html=playerHtml('abcdefghijk',{showTranscript:true});
  assert.equal(videoImportInternals.parsePlayerResponse(html).captions.playerCaptionsTracklistRenderer.captionTracks.length,1);
  assert.equal(videoImportInternals.findTranscriptEndpoint(videoImportInternals.parseInitialData(html)).params,'public-transcript-params');
  assert.equal(videoImportInternals.parseYtcfg(html).INNERTUBE_CONTEXT.client.clientName,'WEB');
  assert.equal(videoImportInternals.safeCaptionUrl('http://www.youtube.com/api/timedtext?v=x'),null);
  assert.equal(videoImportInternals.safeCaptionUrl('https://evil.example/api/timedtext?v=x'),null);
  assert.deepEqual(videoImportInternals.parseJson3(''),[]);
});

test('fetches public metadata and captions with bounded no-cookie requests',async()=>{
  const calls=[];const fetcher=async(url,options)=>{
    const parsed=new URL(url);calls.push({host:parsed.hostname,path:parsed.pathname,options});
    if(parsed.pathname==='/oembed')return metadata('abcdefghijk');
    if(parsed.pathname==='/watch')return new Response(playerHtml('abcdefghijk'),{headers:{'content-type':'text/html'}});
    if(parsed.pathname==='/api/timedtext')return json3([{tStartMs:1200,segs:[{utf8:'First statement'}]},{tStartMs:3800,segs:[{utf8:'Conclusion'}]}]);
    throw new Error('unexpected URL');
  };
  const service=new VideoImportService({fetcher,enabled:true,retries:0});
  const result=await service.import(video('abcdefghijk'));
  await service.close();
  assert.equal(result.status,'ready');assert.equal(result.title,'Public title abcdefghijk');assert.equal(result.channel,'Public channel');
  assert.deepEqual(result.segments,[{id:0,start:1.2,text:'First statement'},{id:1,start:3.8,text:'Conclusion'}]);
  assert.equal(calls.length,3);assert.equal(calls[0].host,'www.youtube-nocookie.com');
  for(const call of calls){assert.equal(call.options.credentials,'omit');assert.equal(call.options.redirect,'error');assert.equal(call.options.headers.cookie,undefined);assert.ok(call.options.signal);}
});

test('uses the public Show transcript endpoint only after an empty track response',async()=>{
  const methods=[];const fetcher=async(url,options)=>{
    const parsed=new URL(url);methods.push(`${options.method}:${parsed.pathname}`);
    if(parsed.pathname==='/oembed')return metadata('abcdefghijk');
    if(parsed.pathname==='/watch')return new Response(playerHtml('abcdefghijk',{showTranscript:true}),{headers:{'content-type':'text/html'}});
    if(parsed.pathname==='/api/timedtext')return new Response('');
    if(parsed.pathname==='/youtubei/v1/get_transcript'){
      assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');
      const body=JSON.parse(options.body);assert.equal(body.params,'public-transcript-params');
      return Response.json({actions:[{updateEngagementPanelAction:{content:{transcriptRenderer:{body:{transcriptSearchPanelRenderer:{body:{transcriptSegmentListRenderer:{initialSegments:[{transcriptSegmentRenderer:{snippet:{startMs:'900',runs:[{text:'From visible transcript'}]}}}]}}}}}}}}]});
    }
    throw new Error('unexpected URL');
  };
  const service=new VideoImportService({fetcher,enabled:true,retries:0});
  const result=await service.import(video('abcdefghijk'));await service.close();
  assert.equal(result.status,'ready');assert.equal(result.segments[0].text,'From visible transcript');
  assert.deepEqual(methods,['GET:/oembed','GET:/watch','GET:/api/timedtext','POST:/youtubei/v1/get_transcript']);
});

test('returns unavailable for genuinely empty public captions while retaining metadata',async()=>{
  const service=new VideoImportService({enabled:true,retries:0,fetcher:async url=>{
    const parsed=new URL(url);if(parsed.pathname==='/oembed')return metadata('abcdefghijk');
    if(parsed.pathname==='/watch')return new Response(playerHtml('abcdefghijk'));
    if(parsed.pathname==='/api/timedtext')return new Response('');
    throw new Error('no transcript panel');
  }});
  const result=await service.import(video('abcdefghijk'));await service.close();
  assert.equal(result.status,'unavailable');assert.equal(result.reason,'captions_unavailable');assert.equal(result.title,'Public title abcdefghijk');
});

test('caps import concurrency, retries transient errors, and aborts outstanding jobs on close',async()=>{
  let active=0,highWater=0,calls=0;
  const service=new VideoImportService({enabled:true,concurrency:2,retries:1,retryDelayMs:0,fetcher:async url=>{
    const parsed=new URL(url);active++;highWater=Math.max(highWater,active);calls++;
    await new Promise(resolve=>setTimeout(resolve,4));active--;
    if(parsed.pathname==='/oembed'&&calls===1)throw new Error('temporary network failure');
    if(parsed.pathname==='/oembed')return metadata(parsed.searchParams.get('url')?.split('=')[1]||'abcdefghijk');
    if(parsed.pathname==='/watch')return new Response('no public tracks');
    throw new Error('unexpected URL');
  }});
  const results=await Promise.all(['abcdefghijk','bcdefghijkl','cdefghijklm','defghijklmn'].map(id=>service.enqueue(video(id).url)));
  assert.ok(highWater<=2);assert.equal(results.length,4);assert.ok(calls>=9);
  await service.close();

  let aborted=false;
  const stopping=new VideoImportService({enabled:true,retries:0,fetcher:(_url,options)=>new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>{aborted=true;reject(options.signal.reason);},{once:true}))});
  const pending=stopping.enqueue(video('efghijklmno').url).catch(()=>null);
  await stopping.close();await pending;assert.equal(aborted,true);
});

test('persists async imports, preserves manual title/captions, backfills old videos, and reuses same-account captions once',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'notcards-video-import-'));let hookCalls=[];
  const service=new VideoImportService({enabled:true,retries:0,fetcher:async url=>{
    const parsed=new URL(url);if(parsed.pathname==='/oembed')return metadata('abcdefghijk','Hydrated public title');
    if(parsed.pathname==='/watch')return new Response(playerHtml('abcdefghijk'));
    if(parsed.pathname==='/api/timedtext')return json3([{tStartMs:0,segs:[{utf8:'Public caption'}]}]);
    throw new Error('unexpected URL');
  }});
  const store=await new NotcardsStore({directory,videoImporter:service,onVideoReady:async event=>hookCalls.push(event)}).init();
  t.after(async()=>{await store.close();await rm(directory,{recursive:true,force:true});});
  const user=store.user({issuer:'https://accounts.google.com',subject:'video-import-user',email:'video@example.invalid',displayName:'Video User'});
  const manual=await store.createNote(user.id,{url:video('abcdefghijk').url,title:'My manual title',text:'My own caption'});
  await store.videoImportJobs.get(`${user.id}:${manual.id}`);
  let hydrated=await (await store.account(user.id)).notebook.get(manual.id);
  assert.equal(hydrated.title,'My manual title');assert.equal(hydrated.segments[0].text,'My own caption');assert.equal(hydrated.videoImport.status,'ready');
  assert.equal(hookCalls.length,0);

  const account=await store.account(user.id),oldId='Z1234567890';
  await account.notebook.put({id:oldId,url:video('abcdefghijk').url,title:'Older manual title',thumbnail:video('abcdefghijk').thumbnail,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),state:'awaiting_transcript',segments:[],revisions:[],conversations:[],personalNotes:'',autoSummaryEligible:true});
  const old=await store.ensureVideoImport(user.id,oldId);assert.equal(old.videoImport.status,'pending');
  await store.videoImportJobs.get(`${user.id}:${oldId}`);
  hydrated=await account.notebook.get(oldId);
  assert.equal(hydrated.title,'Older manual title');assert.equal(hydrated.state,'awaiting_summary');assert.equal(hydrated.segments[0].text,'Public caption');assert.equal(hydrated.videoImport.status,'ready');
  assert.equal(hookCalls.length,1);assert.equal(hookCalls[0].userId,user.id);assert.equal(hookCalls[0].noteId,oldId);assert.ok(hookCalls[0].requestId);

  const existingId='Q1234567890';
  await account.notebook.put({id:existingId,url:video('lmnopqrstuv').url,title:'Extension capture',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),state:'awaiting_summary',segments:[{id:0,start:0,text:'Saved captions'}],transcriptHash:'saved-hash',transcriptSource:'youtube-captions',revisions:[],conversations:[],personalNotes:''});
  await account.notebook.put({id:'R1234567890',url:video('lmnopqrstuv').url,title:'New note',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),state:'awaiting_transcript',segments:[],revisions:[],conversations:[],personalNotes:'',autoSummaryEligible:false});
  const originalEnqueue=service.enqueue.bind(service);service.enqueue=()=>Promise.resolve({status:'unavailable',reason:'captions_unavailable',title:'Some title',thumbnail:'https://i.ytimg.com/vi/lmnopqrstuv/hqdefault.jpg'});
  await store.ensureVideoImport(user.id,'R1234567890');await store.videoImportJobs.get(`${user.id}:R1234567890`);
  const reused=await account.notebook.get('R1234567890');assert.equal(reused.segments[0].text,'Saved captions');assert.equal(reused.transcriptSource,'youtube-captions');assert.equal(reused.videoImport.transcriptReusedFrom,existingId);assert.equal(hookCalls.length,1);
  service.enqueue=originalEnqueue;
});

test('a title renamed while hydration is pending is marked manual and never replaced',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'notcards-video-rename-'));let releaseImport,startedImport;
  const importGate=new Promise(resolve=>{releaseImport=resolve;}),started=new Promise(resolve=>{startedImport=resolve;});
  const service=new VideoImportService({enabled:true,retries:0,fetcher:async url=>{
    const parsed=new URL(url);if(parsed.pathname==='/oembed'){startedImport();await importGate;return metadata('abcdefghijk','Fetched title');}
    if(parsed.pathname==='/watch')return new Response(playerHtml('abcdefghijk'));
    if(parsed.pathname==='/api/timedtext')return json3([{tStartMs:0,segs:[{utf8:'Caption'}]}]);
    throw new Error('unexpected URL');
  }});
  const store=await new NotcardsStore({directory,videoImporter:service}).init();
  t.after(async()=>{releaseImport();await store.close();await rm(directory,{recursive:true,force:true});});
  const user=store.user({issuer:'https://accounts.google.com',subject:'rename-video-user',email:'rename@example.invalid',displayName:'Rename User'});
  const note=await store.createNote(user.id,{url:video('abcdefghijk').url});
  assert.equal(note.videoImport.status,'pending');await started;
  const renamed=await store.updateNote(user.id,note.id,{title:'User chosen title'});
  assert.equal(renamed.title,'User chosen title');assert.equal(renamed.titleManuallySet,true);
  releaseImport();await store.videoImportJobs.get(`${user.id}:${note.id}`);
  const saved=await (await store.account(user.id)).notebook.get(note.id);
  assert.equal(saved.title,'User chosen title');assert.equal(saved.videoImport.status,'ready');assert.equal(saved.segments[0].text,'Caption');
});

