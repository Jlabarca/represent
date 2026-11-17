import {createHash} from 'node:crypto';
import {parseTranscript,videoIdentity} from '../clay-notes/core.mjs';

const OEMBED='https://www.youtube-nocookie.com/oembed';
const MAX_OEMBED=64_000;
const MAX_EMBED=3_000_000;
const MAX_CAPTIONS=1_500_000;
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

async function boundedBody(response,limit){
  const length=Number(response.headers?.get?.('content-length'));
  if(Number.isFinite(length)&&length>limit)throw new Error('Video import response is too large');
  const reader=response.body?.getReader?.();
  if(!reader){const text=await response.text();if(Buffer.byteLength(text)>limit)throw new Error('Video import response is too large');return text;}
  const chunks=[];let size=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw new Error('Video import response is too large');chunks.push(Buffer.from(value));}}
  finally{await reader.cancel().catch(()=>{});}
  return Buffer.concat(chunks).toString('utf8');
}

function parsePlayerResponse(html){
  return parseAssignedObject(html, /ytInitialPlayerResponse\s*=\s*/)||parseAssignedObject(html,/"playerResponse"\s*:\s*/);
}

function parseAssignedObject(html,pattern){
  const match=pattern.exec(html);
  if(!match)return null;
  return parseObjectAt(html,match.index+match[0].length);
}

function parseObjectAt(html,offset){
  let start=offset;while(/\s/.test(html[start]||''))start++;
  if(html[start]!=='{')return null;
  let depth=0,string=false,escape=false;
  for(let i=start;i<html.length;i++){
    const ch=html[i];
    if(string){if(escape)escape=false;else if(ch==='\\')escape=true;else if(ch==='"')string=false;continue;}
    if(ch==='"'){string=true;continue;}
    if(ch==='{')depth++;
    else if(ch==='}'&&--depth===0){try{return JSON.parse(html.slice(start,i+1));}catch{return null;}}
  }
  return null;
}

function parseInitialData(html){return parseAssignedObject(html,/ytInitialData\s*=\s*/);}
function parseYtcfg(html){
  let config={};
  for(const match of html.matchAll(/ytcfg\.set\(/g)){
    const value=parseObjectAt(html,match.index+match[0].length);
    if(value&&typeof value==='object')config={...config,...value};
  }
  return config;
}

function safeCaptionUrl(value){
  let url;try{url=new URL(value);}catch{return null;}
  if(url.protocol!=='https:'||url.username||url.password||url.port||!['www.youtube.com','youtube.com','www.youtube-nocookie.com'].includes(url.hostname.toLowerCase()))return null;
  if(!url.pathname.includes('/api/timedtext'))return null;
  url.searchParams.set('fmt','json3');
  return url;
}

function publicTracks(player){
  const tracks=player?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if(!Array.isArray(tracks)||!tracks.length)return [];
  const available=tracks.filter(track=>track?.baseUrl&&safeCaptionUrl(track.baseUrl));
  return available.sort((a,b)=>Number(a.kind==='asr')-Number(b.kind==='asr'));
}

function parseJson3(text){
  if(!text.trim())return [];
  let body;try{body=JSON.parse(text);}catch{throw new Error('Public captions are not valid JSON');}
  const events=body?.events;
  if(!Array.isArray(events))throw new Error('Public captions have no timed events');
  const rows=events.filter(event=>Array.isArray(event.segs)).map(event=>({start:Number(event.tStartMs||0)/1000,text:event.segs.map(segment=>segment.utf8||'').join('')}));
  return parseTranscript(rows);
}

function findTranscriptEndpoint(node){
  if(!node||typeof node!=='object')return null;
  if(node.getTranscriptEndpoint&&typeof node.getTranscriptEndpoint.params==='string')return node.getTranscriptEndpoint;
  for(const value of Object.values(node)){const found=findTranscriptEndpoint(value);if(found)return found;}
  return null;
}

function parseTranscriptResponse(body){
  const rows=[];
  const visit=node=>{
    if(!node||typeof node!=='object')return;
    const segment=node.transcriptSegmentRenderer||node.transcriptSegmentViewModel;
    if(segment){
      const snippet=segment.snippet||segment.snippetText||segment.text||{};
      const runs=Array.isArray(snippet.runs)?snippet.runs.map(run=>run.text||'').join(''):'';
      const text=runs||snippet.simpleText||snippet.content||segment.content||'';
      const ms=segment.startMs??segment.startTimeMs??snippet.startMs;
      const timestamp=segment.startTimeText?.content||segment.startTimeText?.simpleText||'';
      const seconds=/^\d+(?::[0-5]\d){1,2}$/.test(timestamp)?timestamp.split(':').reduce((total,part)=>total*60+Number(part),0):0;
      const start=ms!=null&&Number.isFinite(Number(ms))?Number(ms)/1000:seconds;
      if(typeof text==='string'&&text.trim())rows.push({start,text});
    }
    for(const value of Object.values(node))visit(value);
  };
  visit(body);
  return rows.length?parseTranscript(rows):[];
}

export class VideoImportService{
  constructor({fetcher=globalThis.fetch,timeoutMs=3500,retries=1,retryDelayMs=80,concurrency=3,maxQueue=250,enabled=false}={}){
    if(typeof fetcher!=='function')throw new TypeError('A fetch implementation is required');
    this.fetcher=fetcher;this.timeoutMs=Math.min(Math.max(Number(timeoutMs)||3500,250),10_000);this.retries=Math.min(Math.max(Number(retries)||0,0),3);this.retryDelayMs=Math.min(Math.max(Number(retryDelayMs)||0,0),1000);this.concurrency=Math.min(Math.max(Number(concurrency)||3,1),8);this.maxQueue=Math.min(Math.max(Number(maxQueue)||250,1),1000);this.enabled=Boolean(enabled);this.closed=false;this.active=0;this.queue=[];this.jobs=new Map();this.controllers=new Set();
  }

  enqueue(value){
    if(!this.enabled)throw Object.assign(new Error('Public video import is disabled'),{code:'video_import_disabled'});
    if(this.closed)throw Object.assign(new Error('Video importer is shutting down'),{code:'video_import_closed'});
    const identity=videoIdentity(value),existing=this.jobs.get(identity.id);if(existing)return existing;
    if(this.queue.length>=this.maxQueue)throw Object.assign(new Error('Video import backlog is full'),{code:'video_import_backlog'});
    let resolve,reject;const base=new Promise((yes,no)=>{resolve=yes;reject=no;});
    const job=base.finally(()=>{if(this.jobs.get(identity.id)===job)this.jobs.delete(identity.id);});
    this.jobs.set(identity.id,job);this.queue.push({identity,resolve,reject});this.drain();return job;
  }

  drain(){
    while(this.active<this.concurrency&&this.queue.length){const item=this.queue.shift();this.active++;this.import(item.identity).then(item.resolve,item.reject).finally(()=>{this.active--;this.drain();});}
  }

  async request(url,limit,init={}){
    let last;
    for(let attempt=0;attempt<=this.retries;attempt++){
      let controller;
      try{
        controller=new AbortController();this.controllers.add(controller);
        const response=await this.fetcher(url,{...init,method:init.method||'GET',headers:{Accept:'application/json,text/html;q=0.9,*/*;q=0.1',...(init.headers||{})},credentials:'omit',redirect:'error',signal:AbortSignal.any([AbortSignal.timeout(this.timeoutMs),controller.signal])});
        if(response.status===404||response.status===410)return {unavailable:true};
        if(response.status===429){
          const value=response.headers.get('retry-after');
          const delay=value&&/^\d+$/.test(value)?Number(value)*1000:Date.parse(value)-Date.now();
          return {unavailable:true,rateLimited:true,retryMs:Number.isFinite(delay)?Math.min(86400000,Math.max(30000,delay)):60000};
        }
        if(!response.ok){if(response.status>=500||response.status===429)throw Object.assign(new Error(`YouTube returned HTTP ${response.status}`),{retryable:true});return {unavailable:true};}
        return {text:await boundedBody(response,limit)};
      }catch(error){last=error;if(attempt>=this.retries||this.closed)break;await new Promise(resolve=>setTimeout(resolve,this.retryDelayMs));}
      finally{if(controller)this.controllers.delete(controller);}
    }
    throw last||new Error('YouTube video import failed');
  }

  async import(identity){
    const oembed=new URL(OEMBED);oembed.searchParams.set('url',identity.url);oembed.searchParams.set('format','json');
    const metadataResponse=await this.request(oembed,MAX_OEMBED);
    if(metadataResponse.rateLimited)return {status:'failed',reason:'youtube_rate_limited',retryMs:metadataResponse.retryMs};
    if(metadataResponse.unavailable)return {status:'unavailable',reason:'metadata_unavailable'};
    let metadata;try{metadata=JSON.parse(metadataResponse.text);}catch{return {status:'unavailable',reason:'metadata_invalid'};}
    if(typeof metadata.title!=='string'||!metadata.title.trim())return {status:'unavailable',reason:'metadata_missing'};
    let thumbnail=identity.thumbnail;
    try{const photo=new URL(metadata.thumbnail_url);if(photo.protocol==='https:'&&['i.ytimg.com','img.youtube.com'].includes(photo.hostname))thumbnail=photo.href;}catch{}
    const watchUrl=`https://www.youtube.com/watch?v=${identity.id}`;
    let page;
    try{page=await this.request(watchUrl,MAX_EMBED);}catch{return {status:'failed',reason:'player_request_failed',title:metadata.title,channel:metadata.author_name||'',thumbnail};}
    if(page.unavailable)return {status:page.rateLimited?'failed':'unavailable',reason:page.rateLimited?'youtube_rate_limited':'player_unavailable',retryMs:page.retryMs,title:metadata.title,channel:metadata.author_name||'',thumbnail};
    let player=parsePlayerResponse(page.text);
    if(!publicTracks(player).length){
      const embedResponse=await this.request(`https://www.youtube-nocookie.com/embed/${identity.id}`,MAX_EMBED).catch(()=>null);
      if(embedResponse&&!embedResponse.unavailable)player=parsePlayerResponse(embedResponse.text)||player;
    }
    const tracks=publicTracks(player),metadataResult={title:metadata.title.trim().slice(0,500),channel:String(metadata.author_name||'').trim().slice(0,160),thumbnail};
    let segments=[],track=tracks[0]||null,trackFailure=false;
    if(track){
      const captionUrl=safeCaptionUrl(track.baseUrl);let captionsResponse;
      try{captionsResponse=await this.request(captionUrl,MAX_CAPTIONS);}catch{trackFailure=true;}
      if(captionsResponse?.rateLimited)return {status:'failed',reason:'youtube_rate_limited',retryMs:captionsResponse.retryMs,...metadataResult};
      if(captionsResponse&&!captionsResponse.unavailable)try{segments=parseJson3(captionsResponse.text);}catch{segments=[];}
    }
    if(!segments.length){
      const endpoint=findTranscriptEndpoint(parseInitialData(page.text)),config=parseYtcfg(page.text);
      if(endpoint&&config.INNERTUBE_API_KEY&&config.INNERTUBE_CONTEXT){
        const apiUrl=new URL('https://www.youtube.com/youtubei/v1/get_transcript');apiUrl.searchParams.set('key',config.INNERTUBE_API_KEY);
        const context=config.INNERTUBE_CONTEXT,headers={'Content-Type':'application/json','X-YouTube-Client-Name':'1','X-YouTube-Client-Version':String(context.client?.clientVersion||''),'Origin':'https://www.youtube.com','Referer':`https://www.youtube.com/watch?v=${identity.id}`};
        if(context.client?.visitorData)headers['X-Goog-Visitor-Id']=context.client.visitorData;
        try{
          const transcriptResponse=await this.request(apiUrl,MAX_CAPTIONS,{method:'POST',headers,body:JSON.stringify({context,params:endpoint.params})});
          if(transcriptResponse.rateLimited)return {status:'failed',reason:'youtube_rate_limited',retryMs:transcriptResponse.retryMs,...metadataResult};
          if(!transcriptResponse.unavailable){let responseBody;try{responseBody=JSON.parse(transcriptResponse.text);}catch{responseBody=null;}segments=parseTranscriptResponse(responseBody);if(segments.length)track={languageCode:''};}
        }catch{trackFailure=true;}
      }
    }
    if(!segments.length)return {status:trackFailure?'failed':'unavailable',reason:trackFailure?'captions_request_failed':'captions_unavailable',...metadataResult};
    return {status:'ready',title:metadata.title.trim().slice(0,500),channel:String(metadata.author_name||'').trim().slice(0,160),thumbnail,captionLanguage:String(track.languageCode||'').slice(0,32),segments,transcriptHash:sha(segments)};
  }

  async close(){
    this.closed=true;
    const error=Object.assign(new Error('Video importer is shutting down'),{code:'video_import_closed'});
    for(const queued of this.queue.splice(0))queued.reject(error);
    for(const controller of this.controllers)controller.abort(error);
    await Promise.allSettled([...this.jobs.values()]);
  }
}

export const videoImportInternals={boundedBody,parsePlayerResponse,parseInitialData,parseYtcfg,safeCaptionUrl,publicTracks,parseJson3,findTranscriptEndpoint,parseTranscriptResponse};
