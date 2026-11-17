const KEY='clay-notes-library-v1',LIMIT=2_000_000,MAX_AGE=7*86400000;
const FIELDS=['id','url','title','channel','sourceType','transcriptAvailable','transcriptSource','thumbnail','cover','imageCount','state','error','pinned','color','finish','folderId','createdAt','updatedAt','overview','statementCount','revisionCount'];
const cacheKey=scope=>scope==='local'?KEY:`${KEY}:${String(scope).replace(/[^A-Za-z0-9_-]/g,'')}`;
export function cardFinish(note){
  if(['prism','classic','spectrum'].includes(note?.finish))return note.finish;
  const score=[...String(note?.id||'')].reduce((sum,char)=>sum+char.charCodeAt(0),0);
  return ['prism','classic','spectrum'][score%3];
}
const VIDEO_IMPORT_STATES=new Set(['pending','ready','unavailable','failed']);
export function videoImportStatus(note,{isVideo=null,local=false,preview=false}={}){
  if(isVideo===null)isVideo=note?.sourceType==='video'||Boolean(note?.url&&/^https:\/\/(?:www\.)?(?:youtube\.com\/watch\?|youtu\.be\/)/i.test(note.url));
  if(!isVideo)return 'not-applicable';
  if(note?.transcriptAvailable===true||note?.segments?.length)return 'ready';
  const status=note?.videoImport?.status;
  if(VIDEO_IMPORT_STATES.has(status))return status;
  if(preview||local||note?.state==='sample')return 'unavailable';
  if(note?.state==='error')return 'failed';
  return note?.state==='awaiting_transcript'?'pending':'unavailable';
}
export function videoSourceMessageKey(note,{isVideo=true,status='pending',preview=false}={}){
  if(!isVideo)return 'Your note is saved; add source text whenever you like.';
  if(preview||note?.state==='sample')return 'Public video preview; captions are not included.';
  if(note?.segments?.length)return '';
  if(status==='pending')return 'The video can play while captions load.';
  if(status==='failed')return 'Captions could not be fetched. The video is still available above.';
  if(status==='unavailable')return 'Captions are unavailable for this video.';
  return 'Captions ready';
}
export function readLibraryCache(storage,now=Date.now(),scope='local'){
  try{const raw=storage?.getItem(cacheKey(scope));if(!raw||raw.length>LIMIT)return null;const value=JSON.parse(raw);if(value.version!==1||!Number.isFinite(value.savedAt)||value.savedAt>now+60000||now-value.savedAt>MAX_AGE||!Array.isArray(value.notes)||value.notes.length>500||value.notes.some(note=>!note||typeof note.id!=='string'||!/^[A-Za-z0-9_-]{11}$/.test(note.id)))return null;return value.notes.map(note=>({...note,pinned:note.pinned===true}));}catch{return null;}
}
export function writeLibraryCache(storage,notes,now=Date.now(),scope='local'){
  try{if(!Array.isArray(notes)||notes.length>500)return;const minimal=notes.map(note=>Object.fromEntries(FIELDS.filter(key=>Object.hasOwn(note,key)).map(key=>[key,note[key]])));const value=JSON.stringify({version:1,savedAt:now,notes:minimal});if(value.length<=LIMIT)storage?.setItem(cacheKey(scope),value);}catch{/* Private mode and quota must not block the collection. */}
}
export function sortCollection(notes,sort='manual',locale='en'){
  const copy=[...notes];if(sort==='title')copy.sort((a,b)=>String(a.title).localeCompare(String(b.title),locale));if(['newest','oldest'].includes(sort))copy.sort((a,b)=>String(sort==='newest'?b.createdAt:a.createdAt).localeCompare(String(sort==='newest'?a.createdAt:b.createdAt)));return copy;
}
export function mergeVisibleOrder(all,visible){
  if(new Set(visible).size!==visible.length||visible.some(id=>!all.includes(id)))throw new Error('Order must contain unique known notebook ids');const selected=new Set(visible);let index=0;return all.map(id=>selected.has(id)?visible[index++]:id);
}
export function bootCollection({storage,scope='local',loadNotes,loadConfig,onNotes,onConfig,onError}){
  const cached=readLibraryCache(storage,Date.now(),scope);if(cached)onNotes(cached,'cache');
  const notes=Promise.resolve().then(loadNotes).then(value=>{writeLibraryCache(storage,value,Date.now(),scope);onNotes(value,'network');}).catch(error=>onError(error,'notes'));
  const config=Promise.resolve().then(loadConfig).then(onConfig).catch(error=>onError(error,'config'));return {notes,config};
}
export function coverSource(note){
  const value=note.cover||note.thumbnail||'';
  if(/^https:\/\/i\.ytimg\.com\/vi\/[A-Za-z0-9_-]{11}\/[A-Za-z0-9_-]+\.(?:jpg|webp)$/.test(value)||new RegExp(`^/api/notes/${note.id}/images/[a-f0-9-]{36}$`).test(value))return value;
  return '';
}
export function cardArt(note){
  const cover=coverSource(note);
  if(!cover)return {src:'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=',fallback:''};
  if(cover!==note?.thumbnail||!/^https:\/\/i\.ytimg\.com\/vi\/[A-Za-z0-9_-]{11}\/(?:hq|sd)default\.jpg$/.test(cover))return {src:cover,fallback:''};
  return {src:cover.replace(/(?:hq|sd)default\.jpg$/,'maxresdefault.jpg'),fallback:cover};
}
export function animateCards(container,before=new Map()){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  container.querySelectorAll('.note-card').forEach((card,index)=>{const old=before.get(card.dataset.id),next=card.getBoundingClientRect();if(old)card.animate([{transform:`translate(${old.left-next.left}px,${old.top-next.top}px)`},{transform:'translate(0,0)'}],{duration:430,easing:'cubic-bezier(.2,.8,.2,1)'});else card.animate([{opacity:0,transform:'translateY(24px) rotate(2deg) scale(.97)'},{opacity:1,transform:'none'}],{duration:440,delay:Math.min(index,8)*35,easing:'cubic-bezier(.2,.8,.2,1)'});});
}
