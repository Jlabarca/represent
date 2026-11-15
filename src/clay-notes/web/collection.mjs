const KEY='clay-notes-library-v1',LIMIT=2_000_000,MAX_AGE=7*86400000;
const FIELDS=['id','url','title','channel','thumbnail','cover','imageCount','state','error','pinned','color','createdAt','updatedAt','overview','statementCount','revisionCount'];
export function readLibraryCache(storage,now=Date.now()){
  try{const raw=storage?.getItem(KEY);if(!raw||raw.length>LIMIT)return null;const value=JSON.parse(raw);if(value.version!==1||!Number.isFinite(value.savedAt)||value.savedAt>now+60000||now-value.savedAt>MAX_AGE||!Array.isArray(value.notes)||value.notes.length>500||value.notes.some(note=>!note||typeof note.id!=='string'||!/^[A-Za-z0-9_-]{11}$/.test(note.id)))return null;return value.notes.map(note=>({...note,pinned:note.pinned===true}));}catch{return null;}
}
export function writeLibraryCache(storage,notes,now=Date.now()){
  try{if(!Array.isArray(notes)||notes.length>500)return;const minimal=notes.map(note=>Object.fromEntries(FIELDS.filter(key=>Object.hasOwn(note,key)).map(key=>[key,note[key]])));const value=JSON.stringify({version:1,savedAt:now,notes:minimal});if(value.length<=LIMIT)storage?.setItem(KEY,value);}catch{/* Private mode and quota must not block the collection. */}
}
export function sortCollection(notes,sort='manual',locale='en'){
  const copy=[...notes];if(sort==='title')copy.sort((a,b)=>String(a.title).localeCompare(String(b.title),locale));if(['newest','oldest'].includes(sort))copy.sort((a,b)=>String(sort==='newest'?b.createdAt:a.createdAt).localeCompare(String(sort==='newest'?a.createdAt:b.createdAt)));return copy;
}
export function mergeVisibleOrder(all,visible){
  if(new Set(visible).size!==visible.length||visible.some(id=>!all.includes(id)))throw new Error('Order must contain unique known notebook ids');const selected=new Set(visible);let index=0;return all.map(id=>selected.has(id)?visible[index++]:id);
}
export function bootCollection({storage,loadNotes,loadConfig,onNotes,onConfig,onError}){
  const cached=readLibraryCache(storage);if(cached)onNotes(cached,'cache');
  const notes=Promise.resolve().then(loadNotes).then(value=>{writeLibraryCache(storage,value);onNotes(value,'network');}).catch(error=>onError(error,'notes'));
  const config=Promise.resolve().then(loadConfig).then(onConfig).catch(error=>onError(error,'config'));return {notes,config};
}
export function coverSource(note){
  const value=note.cover||note.thumbnail||'';
  if(/^https:\/\/i\.ytimg\.com\/vi\/[A-Za-z0-9_-]{11}\/[A-Za-z0-9_-]+\.(?:jpg|webp)$/.test(value)||new RegExp(`^/api/notes/${note.id}/images/[a-f0-9-]{36}$`).test(value))return value;
  return '';
}
export function animateCards(container,before=new Map()){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  container.querySelectorAll('.note-card').forEach((card,index)=>{const old=before.get(card.dataset.id),next=card.getBoundingClientRect();if(old)card.animate([{transform:`translate(${old.left-next.left}px,${old.top-next.top}px)`},{transform:'translate(0,0)'}],{duration:430,easing:'cubic-bezier(.2,.8,.2,1)'});else card.animate([{opacity:0,transform:'translateY(24px) rotate(2deg) scale(.97)'},{opacity:1,transform:'none'}],{duration:440,delay:Math.min(index,8)*35,easing:'cubic-bezier(.2,.8,.2,1)'});});
}
