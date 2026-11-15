const DEFAULT_BASE='http://127.0.0.1:8876';
const validBase=value=>{const url=new URL(value || DEFAULT_BASE);if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||url.pathname!=='/'||url.search||url.hash||url.username||url.password)throw new Error('Service must be a 127.0.0.1 HTTP address');return url.origin;};
async function settings(){const value=await chrome.storage.local.get(['base','token']);return {base:validBase(value.base),token:value.token || ''};}
async function api(config,path,input){
  const response=await fetch(`${config.base}/api${path}`,{method:input?'POST':'GET',headers:{Authorization:`Bearer ${config.token}`,...(input?{'Content-Type':'application/json'}:{})},...(input?{body:JSON.stringify(input)}:{}),signal:AbortSignal.timeout(15000)});
  const data=await response.json();if(!response.ok)throw new Error(data.error || `Service returned ${response.status}`);return data;
}

// This executes in the YouTube page. The returned values are untrusted and validated again below.
async function capturePage(wantTranscript=false,expectedId){
  const player=document.querySelector('#movie_player');
  const data=player?.getPlayerResponse?.() || {};
  const pageUrl=new URL(location.href);
  const currentId=pageUrl.pathname==='/watch'?pageUrl.searchParams.get('v'):pageUrl.pathname.split('/')[2];
  if(currentId!==expectedId || (data.videoDetails?.videoId && data.videoDetails.videoId!==expectedId))throw new Error('Video is still changing. Try Clay Notes again when it finishes loading.');
  const title=data.videoDetails?.title || document.querySelector('meta[property="og:title"]')?.content || document.title.replace(/ - YouTube$/,'');
  const channel=data.videoDetails?.author || document.querySelector('#owner #channel-name a')?.textContent?.trim() || '';
  if(!wantTranscript)return {title,channel,videoId:currentId};
  const tracks=data.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  const sorted=[...tracks].sort((a,b)=>Number(b.languageCode?.startsWith('en'))-Number(a.languageCode?.startsWith('en')) || Number(a.kind==='asr')-Number(b.kind==='asr'));
  for(const track of sorted.slice(0,2)){
    try{
      const url=new URL(track.baseUrl);
      if(url.origin!=='https://www.youtube.com'||url.pathname!=='/api/timedtext')continue;
      url.searchParams.set('fmt','json3');
      const response=await fetch(url,{credentials:'include',redirect:'error',signal:AbortSignal.timeout(12000)});
      if(!response.ok)continue;
      const text=await response.text();
      if(text.length>800000)throw new Error('Captions exceed supported size');
      const json=JSON.parse(text);
      if(json.events?.some(e=>e.segs?.some(s=>s.utf8?.trim())))return {transcript:json,source:`youtube-captions:${track.languageCode || 'unknown'}`};
    }catch{/* Fall back to YouTube's visible transcript. */}
  }
  // Use a transcript already open, or open YouTube's own transcript panel once.
  const rows=()=>[...document.querySelectorAll('ytd-transcript-segment-renderer')].map(row=>{
    const text=row.querySelector('.segment-text')?.textContent?.trim();
    const parts=(row.querySelector('.segment-timestamp')?.textContent || '0').trim().split(':').map(Number);
    return {text,start:parts.reduce((n,x)=>n*60+x,0)};
  }).filter(row=>row.text);
  let transcript=rows();
  if(!transcript.length){
    const button=[...document.querySelectorAll('button,ytd-button-renderer')].find(b=>/^(show transcript|mostrar transcripci[oó]n)$/i.test(b.textContent?.trim() || ''));
    button?.click();
    if(button){for(let i=0;i<12;i++){await new Promise(resolve=>setTimeout(resolve,250));transcript=rows();if(transcript.length)break;}}
  }
  return transcript.length?{transcript,source:'youtube-transcript-panel'}:{error:'YouTube did not expose captions. Open Show transcript on the video and try again, or paste a transcript in the notebook.'};
}

const captures=new Set();
chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
  if(message?.type!=='clay.capture')return false;
  (async()=>{
    if(!sender.tab?.id)throw new Error('Capture must come from a YouTube tab');
    const url=new URL(sender.tab.url);
    const id=url.pathname==='/watch'?url.searchParams.get('v'):url.pathname.split('/')[2];
    if(url.origin!=='https://www.youtube.com'||!['/watch','/shorts/'+id,'/live/'+id].includes(url.pathname)||!/^[A-Za-z0-9_-]{11}$/.test(id || ''))throw new Error('Open a YouTube video first');
    if(captures.has(id))throw new Error('This video is already being captured');
    captures.add(id);let saved=false;
    try{
      const config=await settings();
      if(!config.token){await chrome.runtime.openOptionsPage();throw new Error('Pair the extension with Clay Notes first');}
      const [{result:metadata}]=await chrome.scripting.executeScript({target:{tabId:sender.tab.id},world:'MAIN',func:capturePage,args:[false,id]});
      if(metadata?.videoId!==id)throw new Error('Video changed before capture. Try again.');
      const note=await api(config,'/notes',{url:`https://www.youtube.com/watch?v=${id}`,title:String(metadata?.title || '').slice(0,500),channel:String(metadata?.channel || '').slice(0,160)});
      if(!/^[A-Za-z0-9_-]{11}$/.test(note.id))throw new Error('Invalid notebook response');
      saved=true;await chrome.tabs.create({url:`${config.base}/#note=${note.id}`});
      if(note.revisions?.length || ['queued','summarizing'].includes(note.state))return {ok:true,message:'Opened your saved notebook'};
      const [{result:captured}]=await chrome.scripting.executeScript({target:{tabId:sender.tab.id},world:'MAIN',func:capturePage,args:[true,id]});
      // Recheck the page identity after asynchronous extraction to avoid mixing SPA videos.
      const current=await chrome.tabs.get(sender.tab.id);
      const currentUrl=new URL(current.url);
      const currentId=currentUrl.pathname==='/watch'?currentUrl.searchParams.get('v'):currentUrl.pathname.split('/')[2];
      if(currentId!==id)throw new Error('Video changed during capture. Your notebook was saved; capture the intended video again.');
      if(!captured?.transcript)throw new Error(captured?.error || 'No captions available; paste a transcript in your saved notebook');
      await api(config,`/notes/${id}/transcript`,{transcript:captured.transcript,source:captured.source});
      return {ok:true,message:'Saved · summary is on its way'};
    }catch(error){if(saved)return {ok:true,needsTranscript:true,message:`Your notebook was saved. ${error.message}`};throw error;}
    finally{captures.delete(id);}
  })().then(sendResponse,error=>sendResponse({ok:false,error:error.message || 'Start the Clay Notes service and try again'}));
  return true;
});
chrome.action.onClicked.addListener(async()=>{try{const config=await settings();await chrome.tabs.create({url:config.base});}catch{await chrome.runtime.openOptionsPage();}});
