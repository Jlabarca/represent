const VIDEO_ID=/^[A-Za-z0-9_-]{11}$/;

function stripTrailingPunctuation(value){
  let link=value;
  while(/[.,!?;:]$/.test(link))link=link.slice(0,-1);
  for(const [close,open] of [[')', '('], [']','['], ['}','{']]){
    while(link.endsWith(close)&&(link.match(new RegExp(`\\${close}`,'g'))||[]).length>(link.match(new RegExp(`\\${open}`,'g'))||[]).length)link=link.slice(0,-1);
  }
  return link;
}

export function canonicalizeLink(value){
  if(typeof value!=='string'||value.length>4096)return null;
  let url;try{url=new URL(value);}catch{return null;}
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.port||!url.hostname)return null;
  const host=url.hostname.toLowerCase().replace(/^www\./,'');
  let videoId=null;
  if(host==='youtu.be')videoId=url.pathname.split('/').filter(Boolean)[0]||null;
  else if(host==='youtube.com'||host==='m.youtube.com'){
    if(url.pathname==='/watch')videoId=url.searchParams.get('v');
    else if(/^\/(?:shorts|live)\//.test(url.pathname))videoId=url.pathname.split('/').filter(Boolean)[1]||null;
  }
  if(VIDEO_ID.test(videoId||''))return `https://www.youtube.com/watch?v=${videoId}`;
  return url.href;
}

export function youtubeVideo(value){
  const canonical=canonicalizeLink(value);if(!canonical)return null;
  const url=new URL(canonical),host=url.hostname.toLowerCase().replace(/^www\./,'');
  let id=null;
  if(host==='youtu.be')id=url.pathname.split('/').filter(Boolean)[0]||null;
  else if(host==='youtube.com'||host==='m.youtube.com'){
    if(url.pathname==='/watch')id=url.searchParams.get('v');
    else if(/^\/(?:shorts|live)\//.test(url.pathname))id=url.pathname.split('/').filter(Boolean)[1]||null;
  }
  return VIDEO_ID.test(id||'')?{id,url:`https://www.youtube.com/watch?v=${id}`,thumbnail:`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}:null;
}

export function sourceTypeForLink(value){return youtubeVideo(value)?'video':'web';}

export function extractLinks(text){
  if(typeof text!=='string'||!text)return [];
  const seen=new Set(),links=[];
  for(const match of text.matchAll(/https?:\/\/[^\s<>"']+/gi)){
    const candidate=stripTrailingPunctuation(match[0]);
    const canonical=canonicalizeLink(candidate);
    if(canonical&&!seen.has(canonical)){seen.add(canonical);links.push(canonical);}
  }
  return links;
}
