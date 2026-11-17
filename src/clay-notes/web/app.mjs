import {locales,resolveLocale,translate,direction,localizeStatic,readPreferences,resolveTheme,pendingNoteMessage} from './i18n.mjs?v=webbook-6';
import {requestJSON} from './session.mjs';
import {createComposer} from './composer.mjs';
import {youtubeVideo,canonicalizeLink} from './composer-links.mjs';
import {bootCollection,writeLibraryCache,sortCollection,mergeVisibleOrder,coverSource,cardArt,cardFinish,animateCards,videoImportStatus as readVideoImportStatus,videoSourceMessageKey} from './collection.mjs?v=webbook-6';
const $=selector=>document.querySelector(selector);
const escape=value=>String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let localStorage;try{localStorage=window.localStorage;}catch{/* Automatic settings work without storage. */}
const browserLanguages=()=>navigator.languages?.length?navigator.languages:[navigator.language || 'en'];
const systemTheme=window.matchMedia('(prefers-color-scheme: dark)');
const preferences=readPreferences(localStorage,browserLanguages(),systemTheme.matches);
let locale=preferences.locale,languagePreference=preferences.language,themePreference=preferences.theme;
const t=(key,values)=>translate(locale,key,values);
const h=(key,values)=>escape(t(key,values));
function applyLanguage(){
  document.documentElement.lang=locale;document.documentElement.dir=direction(locale);localizeStatic(document,locale);
  const select=$('#language');select.innerHTML=`<option value="auto">${h('Automatic')}</option>`+locales.map(item=>`<option value="${item.id}">${item.name}</option>`).join('');select.value=languagePreference;
  $('#theme').innerHTML=['auto','light','dark'].map(value=>`<option value="${value}">${h({auto:'Automatic',light:'Light',dark:'Dark'}[value])}</option>`).join('');$('#theme').value=themePreference;
}
function applyTheme(){document.documentElement.dataset.theme=resolveTheme(themePreference,systemTheme.matches);if($('#theme'))$('#theme').value=themePreference;}
const state={notes:[],note:null,config:{models:[]},user:null,local:false,googleConfigured:false,cacheScope:'local',folders:[],folderId:'all',view:'album',explore:false,pinned:false,query:'',sort:'newest',filter:'all',sync:'loading',dragging:false,tab:'summary',revision:null,model:'cheap',evidence:null,drafts:new Map(),busy:false};
const sampleNotes=[
  {id:'Ecuit73WzV0',url:'https://www.youtube.com/watch?v=Ecuit73WzV0',title:'The NEAR Protocol Pivot Nobody Saw',channel:'Bitcoin Strategy',thumbnail:'https://i.ytimg.com/vi/Ecuit73WzV0/maxresdefault.jpg',state:'sample',finish:'prism',folderId:'sample-markets',pinned:true,createdAt:'2026-11-15T00:00:00.000Z',statementCount:0},
  {id:'X6J3ByTqhLY',url:'https://www.youtube.com/watch?v=X6J3ByTqhLY',title:'¿Seguirá cayendo Bitcoin?',channel:'KManuS88',thumbnail:'https://i.ytimg.com/vi/X6J3ByTqhLY/maxresdefault.jpg',state:'sample',finish:'classic',folderId:'sample-markets',pinned:false,createdAt:'2026-11-14T00:00:00.000Z',statementCount:0},
  {id:'t2_F7Fn8vYA',url:'https://www.youtube.com/watch?v=t2_F7Fn8vYA',title:'Bitcoin acaba de perder su último soporte',channel:'Un Podcast Sobre Bitcoin',thumbnail:'https://i.ytimg.com/vi/t2_F7Fn8vYA/maxresdefault.jpg',state:'sample',finish:'spectrum',folderId:'sample-markets',pinned:true,createdAt:'2026-11-13T00:00:00.000Z',statementCount:0}
];
const stackIcon='<svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="m32 8 23 12-23 12L9 20 32 8Z" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/><path d="m10 29 22 12 22-12M10 39l22 12 22-12" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const folderIcon='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
const bookmarkIcon='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 4h12v17l-6-4-6 4V4Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
const finishFor=cardFinish;
let toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('#toast').hidden=true;},5500);}
async function api(path,{method='GET',data}={}){
  try{return await requestJSON(fetch,`/api${path}`,{method,headers:data?{'Content-Type':'application/json'}:{},...(data?{body:JSON.stringify(data)}:{})});}
  catch(error){if(error.code==='web_session_expired')error.message=t('Your local session expired. Reload Clay Notes.');if(error.code==='sign_in_required'){composer.clear();state.user=null;state.notes=[];state.folders=[];state.note=null;location.hash='';renderLibrary();}throw error;}
}
const time=value=>{const n=Math.floor(Number(value)||0);return n>=3600?`${Math.floor(n/3600)}:${String(Math.floor(n/60)%60).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`:`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;};
const date=value=>new Date(value).toLocaleDateString(locale,{month:'short',day:'numeric'});
const videoSource=note=>note?.url?youtubeVideo(note.url):null;
const isVideoNote=note=>note?.sourceType==='video'||Boolean(videoSource(note));
const videoImportStatus=note=>readVideoImportStatus(note,{isVideo:isVideoNote(note),local:state.local,preview:state.samplePreview});
const sourceLabel=note=>isVideoNote(note)?t('YouTube'):note?.url?t('Web source'):t('Text source');
const labels={awaiting_transcript:'Needs transcript',awaiting_summary:'Ready to summarize',queued:'In the queue',summarizing:'Finding the good parts…',ready:'Ready to read',error:'Needs attention'};
const status=note=>`<span class="status ${escape(note.state)}">${note.state==='ready'?'✦ ':''}${h(labels[note.state] || note.state)}</span>`;
const isGenerating=note=>['queued','summarizing'].includes(note.state);
function modelOptions(){const models=state.config.models.length?state.config.models:[state.config.defaultModel || 'cheap'];return models.map(model=>`<option value="${escape(model)}" ${state.model===model?'selected':''}>${escape(model)}${!state.config.gatewayConfigured?' · '+h('Needs attention'):''}</option>`).join('');}
function setupBanner(){
  if(state.config.gatewayConfigured && !state.config.modelError)return '';
  return `<div class="setup-banner"><details><summary>${state.config.gatewayConfigured?h('Gateway connection needs attention'):h('Your library is ready. Connect Ghost to turn on AI.')}</summary><p class="small">${h('Gateway onboarding is waiting for operator Apply. Saving and source capture work without AI.')}</p>${state.config.modelError?`<p class="error" dir="auto">${escape(state.config.modelError)}</p>`:''}</details></div>`;
}
const garden=()=>`<div class="garden" aria-hidden="true"><svg viewBox="0 0 480 230" fill="none"><defs><linearGradient id="paper" x1="200" y1="20" x2="270" y2="170" gradientUnits="userSpaceOnUse"><stop stop-color="#fffef4"/><stop offset="1" stop-color="#e6dfc9"/></linearGradient><linearGradient id="leaf" x1="340" y1="65" x2="350" y2="165" gradientUnits="userSpaceOnUse"><stop stop-color="#99b477"/><stop offset="1" stop-color="#54734a"/></linearGradient><radialGradient id="shadow"><stop stop-color="#5f7655" stop-opacity=".23"/><stop offset="1" stop-color="#5f7655" stop-opacity="0"/></radialGradient></defs><ellipse cx="250" cy="192" rx="155" ry="24" fill="url(#shadow)"/><g transform="rotate(-12 205 120)"><rect x="107" y="53" width="138" height="143" rx="19" fill="#b1c3a1"/><rect x="111" y="48" width="138" height="143" rx="19" fill="#c5d7b1" stroke="#fff" stroke-opacity=".5"/></g><g transform="rotate(9 250 110)"><rect x="187" y="37" width="141" height="151" rx="19" fill="#d5cbb1"/><rect x="184" y="31" width="141" height="151" rx="19" fill="url(#paper)" stroke="#fffef3"/><rect x="205" y="51" width="99" height="39" rx="10" fill="#dbe5c9"/><path d="m246 62 13 8-13 8V62Z" fill="#65814e"/><path d="M206 111h79M206 124h65M206 137h83M206 150h48" stroke="#a2ac90" stroke-width="4" stroke-linecap="round"/></g><path d="M355 185v-62" stroke="#71865a" stroke-width="5" stroke-linecap="round"/><path d="M353 148c-35-1-43-26-36-43 29 0 39 21 36 43Z" fill="url(#leaf)"/><path d="M356 128c32-8 37-32 25-47-26 6-32 27-25 47Z" fill="url(#leaf)"/><path d="M336 177h38l-5 23h-29l-4-23Z" fill="#bfae8c"/><path d="M111 92 101 86M121 71l-2-12M96 115l-13 2" stroke="#93a67b" stroke-width="3" stroke-linecap="round"/><circle cx="365" cy="49" r="5" fill="#d4dca5"/><path d="m343 62 3-6 3 6 6 3-6 3-3 6-3-6-6-3 6-3Z" fill="#8ba36c"/></svg><span class="garden-caption">${h("Small notes. Room for big ideas.")}</span></div>`;

function signInForNotes(){
  if(!state.googleConfigured){toast(t('Google sign-in is being configured.'));return;}
  location.assign('/auth/google');
}

const composer=createComposer({
  t,
  canSave:()=>Boolean(state.user && !state.local),
  getOwner:()=>state.user?.id ?? null,
  signIn:signInForNotes,
  save:payload=>api('/composer',{method:'POST',data:{...payload,folderId:['all','saved'].includes(state.folderId)?null:state.folderId}}),
  onSaved:async()=>{
    state.query='';state.pinned=false;state.filter='all';state.explore=false;
    if(state.folderId==='saved')state.folderId='all';
    const owner=state.user?.id;
    try{
      const [notes,folders]=await Promise.all([api('/notes'),api('/folders')]);
      if(!owner || owner!==state.user?.id)return;
      state.notes=notes;state.folders=folders;state.sync='network';
      writeLibraryCache(localStorage,notes,Date.now(),owner);
      if(!location.hash)renderLibrary();
    }catch(error){toast(error.message);}
  }
});

let focusComposerAfterNavigation=false;
function startNote(){
  if(state.local){updateSourceFields();$('#add-dialog').showModal();return;}
  if(location.hash){focusComposerAfterNavigation=true;location.hash='';return;}
  composer.focus();
}
function renderLibrary(){
  if(state.user&&location.hash)return;
  document.documentElement.dataset.screen='collection';
  state.samplePreview=false;
  const editing=$('#quick-note-slot')?.contains(document.activeElement)?document.activeElement:null;
  const selection=editing && typeof editing.selectionStart==='number'?[editing.selectionStart,editing.selectionEnd]:null;
  state.note=null;$('#all-filter').classList.toggle('active',!state.pinned&&!state.explore);$('#explore-filter').classList.toggle('active',state.explore);$('#pin-filter').classList.toggle('active',state.pinned);
  const source=state.user?state.notes:sampleNotes,folders=state.user?state.folders:[{id:'sample-markets',name:t('Mercados'),count:sampleNotes.length}];
  $('#main').innerHTML=`<div class="library-layout"><aside class="folder-rail"><div class="rail-emblem">${stackIcon}</div><div class="folder-heading"><h2>${h('Mis carpetas')}</h2><button class="add-folder" data-action="new-folder" aria-label="${h('Nueva carpeta')}">＋</button></div><button class="folder-item ${state.folderId==='all'?'selected':''}" data-folder="all">${folderIcon}${h('Todas')}<b>${source.length}</b></button>${folders.map(folder=>`<button class="folder-item ${state.folderId===folder.id?'selected':''}" data-folder="${escape(folder.id)}">${folderIcon}${escape(folder.name)}<b>${folder.count||0}</b></button>`).join('')}<button class="folder-item ${state.folderId==='saved'?'selected':''}" data-folder="saved">${bookmarkIcon}${h('Guardadas')}<b>${source.filter(note=>note.pinned).length}</b></button></aside><section class="collection-main"><div class="collection-heading"><div><h1>${state.pinned?h('Fijadas'):state.explore?h('Explorar'):h('Tu colección')}</h1><p>${h('Cada carta guarda una investigación.')}</p></div><span class="count-pill" id="note-count"></span><label class="search-wrap">⌕ <input type="search" id="search" placeholder="${h('Buscar entre tus cartas…')}" value="${escape(state.query)}"></label></div>${state.local?'':'<div id="quick-note-slot"></div>'}<div class="collection-controls"><div class="filter-pills"><button class="filter-pill ${state.filter==='all'?'active':''}" data-filter="all">${h('Todas')}</button><button class="filter-pill ${state.filter==='holo'?'active':''}" data-filter="holo">${h('Holo')}</button><button class="filter-pill ${state.filter==='pinned'?'active':''}" data-filter="pinned">${h('Fijadas')}</button><button class="filter-pill ${state.filter==='ready'?'active':''}" data-filter="ready">${h('Con IA')}</button><button class="filter-pill ${state.filter==='waiting'?'active':''}" data-filter="waiting">${h('Por explorar')}</button></div><span class="control-divider"></span><label class="sort-control"><select id="card-sort" aria-label="${h('Sort')}">${[['newest','Más recientes'],['oldest','Más antiguas'],['title','Título'],['manual','Orden manual']].map(([value,label])=>`<option value="${value}" ${state.sort===value?'selected':''}>${h(label)}</option>`).join('')}</select></label><div class="view-toggle"><button data-view="grid" class="${state.view==='grid'?'active':''}">▦ ${h('Cuadrícula')}</button><button data-view="album" class="${state.view==='album'?'active':''}">▣ ${h('Álbum')}</button></div></div>${!state.user?`<div class="sample-banner"><span>${h('Colección de ejemplo')} · ${h('Inicia sesión para guardar tus propias investigaciones.')}</span><a href="#" data-action="signin">${h('Iniciar sesión con Google')} ↗</a></div>`:''}<p class="small collection-sync" id="sync-state"></p><div class="album-frame ${state.view==='grid'?'grid-view':''}" id="cards"></div><div class="album-caption"><span></span><span>▣ &nbsp;${h('Abre una carta para investigar')}</span><span></span></div></section></div>`;
  if(!state.local){
    composer.mount($('#quick-note-slot'));
    if(focusComposerAfterNavigation){focusComposerAfterNavigation=false;composer.focus();}
    else if(editing?.isConnected){
      editing.focus({preventScroll:true});
      if(selection)editing.setSelectionRange(...selection);
    }
  }
  $('#search').addEventListener('input',event=>{state.query=event.target.value;renderCards();});$('#card-sort').addEventListener('change',event=>{state.sort=event.target.value;renderCards();});
  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{state.filter=button.dataset.filter;renderLibrary();}));
  document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{state.view=button.dataset.view;try{localStorage?.setItem('notcards-view',state.view);}catch{}renderLibrary();}));
  document.querySelectorAll('[data-folder]').forEach(button=>button.addEventListener('click',()=>{state.folderId=button.dataset.folder;state.pinned=state.folderId==='saved';state.explore=false;renderLibrary();}));
  document.querySelector('[data-action="new-folder"]')?.addEventListener('click',()=>$('#folder-dialog').showModal());renderCards();
}
function renderCards(){
  const source=state.user?state.notes:sampleNotes,query=state.query.toLowerCase();
  const notes=sortCollection(source.filter(note=>(!state.pinned||note.pinned)&&(state.folderId==='all'||state.folderId==='saved'&&note.pinned||note.folderId===state.folderId)&&(!state.explore||note.state==='awaiting_summary')&&(state.filter==='all'||(state.filter==='holo'?finishFor(note)!=='classic':state.filter==='pinned'?note.pinned:(state.filter==='waiting'?!['ready','error'].includes(note.state):state.filter==='ready'?note.state==='ready':note.state===state.filter)))&&`${note.title} ${note.channel} ${note.overview||''}`.toLowerCase().includes(query)),state.sort,locale);
  const before=new Map([...document.querySelectorAll('.note-card')].map(card=>[card.dataset.id,card.getBoundingClientRect()]));
  $('#main').dataset.hasNotes=String(source.length>0);$('#note-count').textContent=`${notes.length} ${h('cartas')}`;
  $('#sync-state').textContent=state.sync==='cache'?t('Saved on this device. Refreshing…'):state.sync==='loading'?t('Refreshing…'):state.sync==='error'?t('Offline. Showing saved notes.'):'';
  if(!notes.length){$('#cards').innerHTML=`<div class="empty"><div><h3>${state.user?h('No notes found.'):h('Tu colección empieza aquí.')}</h3><p>${state.user?h('Try another title, channel, or idea.'):h('Inicia sesión para guardar videos, documentos e ideas.')}</p></div></div>`;return;}
  $('#cards').innerHTML=`<div class="grid ${state.view==='grid'?'compact-grid':''}">${notes.map(note=>{const art=cardArt(note),pending=isVideoNote(note)&&videoImportStatus(note)==='pending';return `<article data-id="${note.id}" class="note-card ${finishFor(note)}" data-finish="${finishFor(note)}"><div class="card-surface"><a class="note-card-link" href="#note=${encodeURIComponent(note.id)}" data-action="open" data-id="${escape(note.id)}" aria-label="${h('Open notebook')}: ${escape(note.title)}"></a><img class="card-art" src="${escape(art.src)}" data-fallback="${escape(art.fallback)}" alt="" loading="eager" decoding="async" referrerpolicy="no-referrer"><div class="card-shade"></div><div class="card-foil"></div><div class="card-rim"></div><div class="card-top"><span class="foil-badge">${h(finishFor(note)==='classic'?'CLÁSICA':finishFor(note)==='spectrum'?'HOLO · ESPECTRO':'HOLO · PRISMA')}</span>${state.user?`<button class="pin" aria-label="${note.pinned?t('Unpin'):t('Pin')} ${escape(note.title)}" data-action="pin" data-id="${note.id}">${note.pinned?'◆':'◇'} ${note.pinned?h('Fijada'):''}</button>`:note.pinned?`<span class="pin sample-pin">◆ ${h('Fijada')}</span>`:''}</div><div class="card-meta">▶ &nbsp;${h(sourceLabel(note))} · <span dir="auto">${escape(note.channel||sourceLabel(note))}</span></div><div class="card-text"><button class="card-title" dir="auto" data-action="open" data-id="${escape(note.id)}">${escape(note.title)}</button></div><div class="card-footer"><span>${pending?`<span class="import-spinner" aria-hidden="true"></span>${h('Fetching captions')}`:note.state==='ready'?h('IA lista'):state.user?escape(t(labels[note.state]||note.state)):h('Muestra pública')}</span>${state.user&&state.sort==='manual'?`<button class="card-grab" data-id="${escape(note.id)}" aria-label="${h('Move card')}" title="${h('Move card')}">⠿</button>`:''}<span class="card-actions">${note.state==='ready'?`${note.statementCount} ${h('ideas')}`:h('Vista previa')}<button class="open-card" data-action="open" data-id="${escape(note.id)}" aria-label="${h('Open card')}">↗</button></span></div></div></article>`}).join('')}</div>`;
  bindCards();animateCards($('#cards'),before);
}

function citations(sources,kind='summary',item='') {return (sources || []).map(index=>`<button class="citation" title="${h("Read supporting transcript")}" aria-label="${h("Read supporting segment")} ${index+1}" data-action="cite" data-source="${index}" data-kind="${kind}" data-item="${item}">[${index+1}]</button>`).join('');}
function sourcePanel(note){
  const video=videoSource(note),status=videoImportStatus(note),needsRetry=video&&!state.samplePreview&&!state.local&&['failed','unavailable'].includes(status);
  const player=video?`<div class="video-player"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}?rel=0&playsinline=1" title="${h('YouTube video player')}: ${escape(note.title)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`:coverSource(note)?`<img class="source-cover" src="${escape(coverSource(note))}" alt="${h('Source cover')}" loading="lazy">`:'';
  const policy=note.videoImport||{};
  const retryTime=policy.reason==='youtube_rate_limited'||policy.attemptCount>1?Date.parse(policy.retryAllowedAt)||0:0;
  const cooldown=retryTime>Date.now();
  const importState=video?state.samplePreview?`<p class="video-import-state">${h('Public video preview; captions are not included.')}</p>`:status==='pending'?`<p class="video-import-state pending"><span class="import-spinner" aria-hidden="true"></span>${h('Fetching captions')}</p>`:status==='ready'?`<p class="video-import-state ready">✦ ${h('Captions ready')}</p>`:needsRetry?`<div class="video-import-state failed"><p>${h(note.videoImport?.reason==='youtube_rate_limited'?'YouTube is limiting caption requests.':status==='unavailable'?'Captions are unavailable for this video.':'Caption import failed.')}</p><button class="quiet-button" type="button" data-action="retry-video-import" data-ready-at="${retryTime}" ${cooldown?'disabled':''}>${cooldown?h('Retry after {time}',{time:new Date(retryTime).toLocaleTimeString(locale)}):h('Retry caption import')+' ↻'}</button></div>`:'' :'';
  const manualFallback=video&&needsRetry?`<button type="button" class="quiet-button" data-action="tab" data-tab="transcript">${h('Paste transcript instead')}</button>`:'';
  const description=note.segments.length?`${note.segments.length} ${h(video?'transcript segments':'source segments')} · ${escape(note.transcriptSource||'captured source')}`:h(videoSourceMessageKey(note,{isVideo:video,status,preview:state.samplePreview}));
  return `<section class="source-card">${player}<div class="source-card-content"><div class="source-card-heading"><strong>${h(video?'Original video':sourceLabel(note))}</strong>${note.url?`<a class="source-link" href="${escape(canonicalizeLink(note.url)||note.url)}" target="_blank" rel="noopener noreferrer">${h(video?'Open on YouTube':'Open source')} ↗</a>`:''}</div><p>${description}</p>${importState}${manualFallback}</div></section>`;
}
function renderNotebook(){
  document.documentElement.dataset.screen='notebook';
  const n=state.note;if(!n)return;
  n.segments ||= [];n.revisions ||= [];n.conversations ||= [];n.images ||= [];n.personalNotes ||= '';
  const sameNotebook=document.querySelector('[data-notebook-id]')?.dataset.notebookId===n.id;
  const previousFocus=sameNotebook&&document.activeElement?.id?document.activeElement.id:'';
  const activeControl=previousFocus?document.getElementById(previousFocus):null;
  const caret=activeControl&&typeof activeControl.selectionStart==='number'?[activeControl.selectionStart,activeControl.selectionEnd]:null;
  const inputDrafts=new Map(sameNotebook?['question','transcript-input','personal-notes','notebook-title'].map(id=>[id,$(`#${id}`)?.value]):[]);
  const draft=state.drafts.get(n.id) ?? n.personalNotes;
  const source=sourcePanel(n),sourceLink=n.url?`<a class="notebook-source-link" href="${escape(canonicalizeLink(n.url)||n.url)}" target="_blank" rel="noopener noreferrer">${h(isVideoNote(n)?'Open original video':'Open source')} ↗</a>`:'';
  const publicPreview=state.samplePreview?`<div class="sample-detail-banner"><span>${h('Public preview · sign in to save this video and create your own notebook.')}</span><a href="#" data-action="signin">${h('Sign in with Google')} ↗</a></div>`:'';
  $('#main').innerHTML=`<button class="back" data-action="library">← ${h("Back to your collection")}</button>${setupBanner()}${publicPreview}<header class="notebook-heading" data-notebook-id="${escape(n.id)}"><div><span class="eyebrow">${h(isVideoNote(n)?"A VIDEO, DISTILLED":"RESEARCH NOTEBOOK")}</span>${state.local||state.samplePreview?`<h1 dir="auto">${escape(n.title)}</h1>`:`<form id="title-form" class="title-edit-form"><label class="screen-reader" for="notebook-title">${h('Notebook title')}</label><input id="notebook-title" dir="auto" maxlength="200" value="${escape(n.title)}" aria-label="${h('Notebook title')}"><button class="icon-button" type="submit" aria-label="${h('Save title')}">✓</button></form>`}<div class="notebook-meta"><span>${escape(n.channel || sourceLabel(n))}</span><span>${h("Saved")} ${escape(date(n.createdAt))}</span>${state.samplePreview?'':status(n)}</div>${sourceLink}</div>${state.samplePreview?'':`<button class="pin" data-action="pin" data-id="${escape(n.id)}" aria-label="${n.pinned?t("Unpin"):t("Pin")} ${h('Notebook')}" aria-pressed="${n.pinned}">${n.pinned?'◆':'◇'}</button>`}${!state.local&&!state.samplePreview?`<label class="note-folder"><span class="screen-reader">${h('Move to folder')}</span><select id="note-folder" aria-label="${h('Move to folder')}"><option value="">${h('Todas')}</option>${state.folders.map(folder=>`<option value="${escape(folder.id)}" ${n.folderId===folder.id?'selected':''}>${escape(folder.name)}</option>`).join('')}</select></label>`:''}</header><div class="notebook-layout"><section class="paper" aria-label="${h('Notebook content')}"><div class="tabs" role="tablist" aria-label="${h('Notebook sections')}">${[['summary',t("The takeaway")],['questions',t("Ask a question")],['transcript',t(isVideoNote(n)?"Transcript":"Source text")]].map(([id,label])=>`<button class="tab ${state.tab===id?'active':''}" role="tab" aria-selected="${state.tab===id}" data-action="tab" data-tab="${id}">${label}</button>`).join('')}</div><div id="notebook-content" role="tabpanel"></div></section><aside class="notebook-side">${source}${state.samplePreview?'':`<form id="personal-form" class="notes-card"><h3>${h("A thought of your own.")}</h3><p>${h("Connections, questions, things to try.")}</p><label class="screen-reader" for="personal-notes">${h("Your personal notes")}</label><textarea dir="auto" id="personal-notes" placeholder="${h("Make a little space for your thoughts…")}" maxlength="50000">${escape(draft)}</textarea><button class="light-button">${h("Save my notes")}</button><div class="color-picker" aria-label="${h("Note color")}">${['cream','mint','peach','lilac'].map(color=>`<button type="button" class="${color}" aria-label="${h({cream:'Cream',mint:'Mint',peach:'Peach',lilac:'Lilac'}[color])}" aria-pressed="${n.color===color}" data-action="color" data-color="${color}"></button>`).join('')}</div></form>`}${!state.samplePreview?imagePanel(n):''}<div id="evidence"></div></aside></div>`;
  $('#note-folder')?.addEventListener('change',async event=>{try{await api(`/notes/${n.id}`,{method:'PATCH',data:{folderId:event.target.value||null}});state.folders=await api('/folders');await refresh();toast(t('Folder updated.'));}catch(error){toast(error.message);}});
  $('#personal-notes')?.addEventListener('input',event=>state.drafts.set(n.id,event.target.value));
  $('#title-form')?.addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter,title=$('#notebook-title').value.trim();if(!title)return;button.disabled=true;try{state.note=await api(`/notes/${n.id}`,{method:'PATCH',data:{title}});renderNotebook();$('#notebook-title')?.focus({preventScroll:true});toast(t('Title saved.'));}catch(error){toast(error.message);}finally{if(button.isConnected)button.disabled=false;}});
  $('#personal-form')?.addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter;button.disabled=true;try{state.note=await api(`/notes/${n.id}`,{method:'PATCH',data:{personalNotes:$('#personal-notes').value}});state.drafts.delete(n.id);$('#personal-notes').value=state.note.personalNotes||'';toast(t("Your thoughts are saved."));}catch(error){toast(error.message);}finally{button.disabled=false;}});
  renderNotebookContent();renderEvidence();bindImages();for(const [id,value] of inputDrafts)if(value!==undefined&&$(`#${id}`))$(`#${id}`).value=value;
  if(previousFocus&&$(`#${previousFocus}`)){const restored=$(`#${previousFocus}`);restored.focus({preventScroll:true});if(caret&&typeof restored.setSelectionRange==='function')restored.setSelectionRange(...caret);}
}
function transcriptForm(){const video=isVideoNote(state.note);return `<form id="transcript-form" class="transcript-form"><label for="transcript-input">${h(video?"Paste the video transcript":"Paste source text")}</label><p class="small">${h(video?"Automatic caption import did not work. Paste captions here if you have them.":"Add the text you want this notebook to use as its source.")}</p><textarea id="transcript-input" required placeholder="${video?'0:00 The first idea…&#10;1:24 The next idea…':h('Paste source text here…')}" maxlength="800000"></textarea><button class="dark-button" ${state.busy?'disabled':''}>${h(video?"Save transcript":"Save source text")} →</button></form>`;}
function bindTranscript(){
  const id=state.note.id, scope=state.cacheScope;
  $('#transcript-form')?.addEventListener('submit',async event=>{
    event.preventDefault();
    if(!viewingNotebook(id,scope))return;
    const transcript=event.currentTarget.querySelector('textarea').value, button=event.submitter;
    button.disabled=true;
    try{
      await api(`/notes/${id}/transcript`,{method:'POST',data:{transcript,source:'paste',model:state.model}});
      if(!viewingNotebook(id,scope))return;
      const updated=await api(`/notes/${id}`);
      if(viewingNotebook(id,scope)){state.note=updated;state.tab='summary';renderNotebook();}
    }catch(error){if(viewingNotebook(id,scope))toast(error.message);}
    finally{if(button.isConnected)button.disabled=false;}
  });
}
const chatDrafts = new Map();
const botanicLaunchDrafts = new Map();
async function renderCardChat(target, note) {
  const draftKey = state.cacheScope + "/" + note.id;
  const path = `/notes/${encodeURIComponent(note.id)}/chat`;
  const isCurrent = () => state.note?.id === note.id && state.tab === 'questions' && target.isConnected;
  const launchEnabled=!state.local&&!state.samplePreview&&state.config.botanicLaunchAvailable===true&&typeof state.config.botanicOrigin==='string';
  const launchShelf=()=>launchEnabled?`<section class="botanic-launch-shelf"><h3>${h('Explore this notebook with Botanic')}</h3><p class="small">${h('Your question and source context will be sent to Botanic. Review and send it there.')}</p><form id="botanic-launch-form"><label for="botanic-launch-question">${h('Ask a question')}</label><textarea id="botanic-launch-question" maxlength="4000" required dir="auto"></textarea><button class="dark-button" type="submit">${h('Open in Botanic')} ↗</button><p id="botanic-launch-status" class="small" role="status"></p></form></section>`:'';
  const bindLaunch=()=>target.querySelector('#botanic-launch-form')?.addEventListener('submit',async event=>{
    event.preventDefault();const question=target.querySelector('#botanic-launch-question').value.trim();if(!question)return;
    const prior=botanicLaunchDrafts.get(draftKey),request=prior?.question===question?prior:{question,requestId:crypto.randomUUID()};botanicLaunchDrafts.set(draftKey,request);
    const button=event.submitter,status=target.querySelector('#botanic-launch-status');button.disabled=true;status.textContent=t('Opening your notebook…');
    try{
      const envelope=await api(`/notes/${encodeURIComponent(note.id)}/botanic-launch`,{method:'POST',data:{question,requestId:request.requestId}});
      const expected=new URL(state.config.botanicOrigin);if(expected.protocol!=='https:'||expected.origin!==state.config.botanicOrigin||envelope.botanicOrigin!==expected.origin)throw new Error(t('Botanic chat is unavailable right now. Your notebook and notes are still here.'));
      const form=document.createElement('form');form.method='POST';form.action=new URL('/api/botanic/notcards/launch',expected.origin).href;form.target='_blank';form.setAttribute('rel','noopener');form.hidden=true;
      for(const [name,value] of Object.entries({ticket:envelope.ticket,question:envelope.question,context:JSON.stringify(envelope.context)})){const input=document.createElement('input');input.type='hidden';input.name=name;input.value=value;form.append(input);}
      document.body.append(form);form.submit();form.remove();status.textContent='';
    }catch(error){status.textContent=error.message;button.disabled=false;}
  });
  target.innerHTML = `<h2 class="section-title">Botanic</h2><p role="status">${h('Opening your notebook…')}</p>`;
  if(launchEnabled){
    try{
      const {conversationUrl}=await api(`/notes/${encodeURIComponent(note.id)}/botanic-launch`);
      if(!isCurrent())return;
      target.innerHTML=`<h2 class="section-title">Botanic</h2>`+(conversationUrl
        ? `<a class="light-button" rel="noopener noreferrer" target="_blank" href="${escape(conversationUrl)}">${h('Open Botanic chat')} ↗</a>`
        : launchShelf());
      bindLaunch();
    }catch(error){if(isCurrent())target.querySelector('[role=status]').textContent=error.message;}
    return;
  }
  try {
    const chat = await api(path);
    if (!isCurrent()) return;
    const draft = chatDrafts.get(draftKey) || {question:'', requestId:crypto.randomUUID()};
    const link = chat.conversationUrl ? `<a class="light-button" rel="noopener noreferrer" target="_blank" href="${escape(chat.conversationUrl)}">${h('Open Botanic chat')} ↗</a>` : '';
    target.innerHTML = `<h2 class="section-title">Botanic</h2>${launchShelf()}${link}${chat.canAsk ? `<form id="botanic-question"><label for="question">${h('Ask a question')}</label><textarea id="question" maxlength="5000" required dir="auto">${escape(draft.question)}</textarea><button class="dark-button">${h('Ask a question')}</button></form>` : ''}${!chat.canAsk&&!chat.canReset?`<p class="ai-unavailable" role="status">${h('Botanic chat is unavailable right now. Your notebook and notes are still here.')}</p>`:''}${chat.canReset ? `<button id="reset-card-chat" class="quiet-button">${h('Start fresh after deletion')}</button>` : ''}<p id="chat-status" role="status"></p>`;bindLaunch();
    target.querySelector('#reset-card-chat')?.addEventListener('click',async e=>{
      e.currentTarget.disabled=true;
      try{await api(path+'/reset',{method:'POST',data:{expectedConversationId:chat.conversationId}});chatDrafts.delete(draftKey);if(isCurrent())await renderCardChat(target,note);}catch(error){if(isCurrent()){target.querySelector('#chat-status').textContent=error.message;target.querySelector('#reset-card-chat').disabled=false;}}
    });
    target.querySelector('#botanic-question')?.addEventListener('submit',async e=>{
      e.preventDefault();const field=target.querySelector('#question'),question=field.value.trim();if(!question)return;
      const prior=chatDrafts.get(draftKey);const request=prior?.question===question?prior:{question,requestId:crypto.randomUUID()};chatDrafts.set(draftKey,request);
      field.readOnly=true;e.submitter.disabled=true;
      try{const result=await api(path,{method:'POST',data:request});if(result.state==='bound')chatDrafts.delete(draftKey);if(isCurrent())await renderCardChat(target,note);}
      catch(error){if(isCurrent()){target.querySelector('#chat-status').textContent=error.message;field.readOnly=false;target.querySelector('button[type=submit],#botanic-question button').disabled=false;}}
    });
  } catch(error){if(isCurrent()) {target.innerHTML=`<h2 class="section-title">Botanic</h2>${launchShelf()}<p class="ai-unavailable" role="status">${h('Botanic chat is unavailable right now. Your notebook and notes are still here.')}</p>`;bindLaunch();}}
}
function renderNotebookContent(){
  const n=state.note, target=$('#notebook-content');
  if(state.samplePreview){target.innerHTML=`<div class="sample-detail-copy"><h2>${h('Public video preview')}</h2><p>${h('Play the source above. Sign in to save it as a notebook and add your own notes.')}</p><a class="dark-button" href="#" data-action="signin">${h('Sign in with Google')} ↗</a></div>`;return;}
  if(state.tab==='transcript'){
    const video=isVideoNote(n),importStatus=videoImportStatus(n),pending=video&&importStatus==='pending',fallback=video&&['failed','unavailable'].includes(importStatus);
    target.innerHTML=`<h2 class="section-title">${h("The source, in its own words.")}</h2><p class="small">${n.segments.length?t(video?"Captured captions may contain transcription mistakes. Click a timestamp to watch the original.":"Source text captured for this notebook."):pending?t("Fetching captions from YouTube. You can keep watching while we work."):video?t("Captions could not be fetched. The video is still available above."):t("Add source text to start the summary.")}</p>${pending?`<div class="import-progress" role="status"><span class="import-spinner" aria-hidden="true"></span><div><strong>${h('Fetching captions')}</strong><p class="small">${h('You can leave this page. Captions will appear when ready.')}</p></div></div>`:''}${n.segments.length?`<details><summary class="small">${h(video?"Replace transcript":"Replace source text")}</summary>${transcriptForm()}</details><div class="transcript-list">${n.segments.map(s=>`<div class="segment">${video&&n.url?`<a href="${escape(videoSource(n)?.url||canonicalizeLink(n.url))}&t=${Math.floor(s.start)}s" target="_blank" rel="noopener noreferrer">${time(s.start)} ↗</a>`:`<span>${video?time(s.start):''}</span>`}<span dir="auto">${escape(s.text)}</span></div>`).join('')}</div>`:fallback||!video?transcriptForm():''}`;if(fallback||!video||n.segments.length)bindTranscript();return;
  }
  if(state.tab==='questions'){
    if(!state.local&&!state.samplePreview){void renderCardChat(target,n);return;}
    const askDisabled=!n.segments.length||state.busy||isGenerating(n)||!state.config.gatewayConfigured;
    target.innerHTML=`<h2 class="section-title">${h("Pull on an interesting thread.")}</h2><p class="small">${h("Ask about the captured transcript. Each question makes a new gateway request.")}</p>${!state.config.gatewayConfigured?`<p class="ai-unavailable" role="status">${h('AI chat is not configured. Your source and personal notes remain available.')}</p>`:''}<form id="ask-form" class="ask-form"><label class="screen-reader" for="question">${h("Your question")}</label><textarea id="question" maxlength="4000" required placeholder="${h("What evidence supports the main conclusion?")}" ${askDisabled?'disabled':''}></textarea><div class="form-actions"><select class="model-select" aria-label="${h("Question model")}" id="question-model" ${!state.config.gatewayConfigured?'disabled':''}>${modelOptions()}</select><button class="dark-button" ${askDisabled?'disabled':''}>${state.busy?t("Thinking…"):t("Ask this video")} →</button></div></form>${!n.segments.length?`<p class="small">${h(videoImportStatus(n)==='pending'?'Fetching captions from YouTube. You can keep watching while we work.':"Add a transcript first.")}</p>`:''}${n.conversations.slice().reverse().map(q=>`<article class="conversation"><h3>${escape(q.question)}</h3><p>${escape(q.answer)} ${citations(q.sources,'question',q.id)}</p><span class="small">${escape(q.metrics.responseModel || q.metrics.requestedModel || 'Gateway model')}</span></article>`).join('')}`;
    $('#question-model').addEventListener('change',e=>{state.model=e.target.value;});
    $('#ask-form').addEventListener('submit',async event=>{event.preventDefault();const question=$('#question').value;state.busy=true;event.submitter.disabled=true;event.submitter.textContent=t("Thinking…");try{state.note=await api(`/notes/${n.id}/ask`,{method:'POST',data:{question,model:state.model}});}catch(error){toast(error.message);}finally{state.busy=false;renderNotebook();}});return;
  }
  const revision=n.revisions[state.revision ?? n.revisions.length-1];
  const canSummarize=Boolean(n.segments.length&&state.config.gatewayConfigured&&!isGenerating(n));
  const controls=`<div class="summary-toolbar"><select id="revision" aria-label="${h("Summary revision")}">${n.revisions.map((r,index)=>`<option value="${index}" ${r.id===revision?.id?'selected':''}>${h("Version")} ${index+1} · ${escape(r.metrics.requestedModel || 'model')}</option>`).join('')}</select><div><select class="model-select" id="summary-model" aria-label="${h("Regeneration model")}" ${!state.config.gatewayConfigured?'disabled':''}>${modelOptions()}</select><button class="quiet-button" data-action="redo" ${!canSummarize?'disabled':''}>${isGenerating(n)?t("Working…"):"↻ " + t("Redo")}</button></div></div>`;
  const error=n.error?`<div class="setup-banner"><div><strong>${h("We kept your notebook.")}</strong><p class="error">${escape(n.error)}</p>${n.segments.length?`<button class="quiet-button" data-action="redo">${h("Try summary again")} ↗</button>`:''}</div></div>`:'';
  if(!revision){
    const video=isVideoNote(n),importStatus=videoImportStatus(n),importPending=video&&importStatus==='pending',importFailed=video&&['failed','unavailable'].includes(importStatus);
    const headline=isGenerating(n)?t('A little clarity is on its way.'):importPending?t('Fetching captions'):video?t('Your video has a home.'):t('Your research has a home.');
    const detail=isGenerating(n)?t('Finding the main statements and conclusions in the transcript. You can leave this page; the service keeps working.'):importPending?t('YouTube captions are being fetched automatically.'):n.segments.length?t('Source saved. Add a summary when you are ready.'):!state.config.gatewayConfigured?t('AI summaries are not configured. Your notebook and personal notes are still editable.'):t(video?'The video remains playable while captions are unavailable.':'Add source text to start the summary.');
    const summaryState=isGenerating(n)?`<p class="summary-state pending" role="status"><span class="import-spinner" aria-hidden="true"></span>${h('Summary is being prepared')}</p>`:!state.config.gatewayConfigured?`<p class="summary-state unavailable" role="status">${h('AI summaries are not configured. Your source and notes are saved.')}</p>`:n.segments.length?`<div class="summary-start"><select class="model-select" id="summary-model" aria-label="${h('Regeneration model')}">${modelOptions()}</select><button class="dark-button" data-action="redo" ${canSummarize?'':'disabled'}>${h('Create summary')} →</button></div>`:'';
    const sourceText=!video&&n.segments.length?`<section class="plain-source"><h3>${h('Source text')}</h3>${n.segments.map(segment=>`<p dir="auto">${escape(segment.text)}</p>`).join('')}</section>`:'';
    target.innerHTML=`${error}<div class="generation"><div class="orb ${isGenerating(n)||importPending?'is-working':''}" aria-hidden="true">✦</div><h2>${escape(headline)}</h2><p>${escape(detail)}</p></div>${importPending?`<p class="import-progress" role="status"><span class="import-spinner" aria-hidden="true"></span>${h('Fetching captions')}</p>`:''}${summaryState}${sourceText}${importFailed||(!video&&!n.segments.length)?transcriptForm():''}`;
    bindTranscript();$('#summary-model')?.addEventListener('change',e=>{state.model=e.target.value;});return;
  }
  const list=items=>`<ol class="claims">${items.map((item,index)=>`<li><span class="claim-number">${String(index+1).padStart(2,'0')}</span><div>${escape(item.text)} ${citations(item.sources)}</div></li>`).join('')}</ol>`;
  const metrics=revision.metrics;
  target.innerHTML=`${error}${controls}${isGenerating(n)?`<p class="small">${h("A new version is on its way. Your current takeaway stays here.")}</p>`:''}<p class="overview">${escape(revision.overview)}</p><h2 class="section-title"><span class="section-glyph" aria-hidden="true">≋</span>${h("Main statements")}</h2>${list(revision.statements)}<section class="conclusion-box"><h2 class="section-title"><span aria-hidden="true">↗</span>${h("What it comes down to")}</h2>${list(revision.conclusions)}</section><p class="revision-meta">${h("AI summary of the speaker’s claims. Check the source before relying on it.")}<br>${h("Requested")} ${escape(metrics.requestedModel || t("unknown"))} · ${h("Served")} ${escape(metrics.responseModel || t("model not reported"))} · ${metrics.costUsd===null||metrics.costUsd===undefined?t("Cost not reported"):`$${Number(metrics.costUsd).toFixed(5)}`} · ${Math.round((metrics.durationMs || 0)/1000)}s · ${escape(date(revision.createdAt))}</p>`;
  $('#revision').addEventListener('change',e=>{state.revision=Number(e.target.value);state.evidence=null;renderNotebookContent();renderEvidence();});$('#summary-model').addEventListener('change',e=>{state.model=e.target.value;});
}
function renderEvidence(){
  const target=$('#evidence');if(!target)return;
  const evidence=state.evidence;
  target.innerHTML=evidence?`<section class="evidence-box" aria-label="${h("Supporting transcript")}"><button class="icon-button" data-action="close-evidence" aria-label="${h("Close evidence")}">×</button><span class="eyebrow">${h(isVideoNote(state.note)?"IN THE TRANSCRIPT":"IN THE SOURCE")}</span><blockquote dir="auto">“${escape(evidence.text)}”</blockquote>${isVideoNote(state.note)&&state.note.url?`<a class="source-link" href="${escape(state.note.url)}&t=${Math.floor(evidence.start)}s" target="_blank" rel="noreferrer">${h("Watch at")} ${time(evidence.start)} ↗</a>`:state.note.url?`<a class="source-link" href="${escape(state.note.url)}" target="_blank" rel="noreferrer">${h("Open source")} ↗</a>`:''}</section>`:'';
}
function viewingNotebook(id,scope){
  return scope===state.cacheScope && new URLSearchParams(location.hash.slice(1)).get('note')===id;
}
let refreshSequence=0;
async function refresh(){
  const sequence=++refreshSequence, hash=location.hash, scope=state.cacheScope;
  const current=()=>sequence===refreshSequence && location.hash===hash && state.cacheScope===scope;
  const params=new URLSearchParams(location.hash.slice(1)),sampleId=params.get('sample'),id=params.get('note');
  if(sampleId){const sample=sampleNotes.find(note=>note.id===sampleId);if(!sample)throw new Error('Invalid sample link');state.samplePreview=true;state.note={...sample,segments:[],revisions:[],conversations:[],images:[],personalNotes:''};state.tab='summary';renderNotebook();return;}
  state.samplePreview=false;
  if(id && !/^[A-Za-z0-9_-]{1,128}$/.test(id))throw new Error('Invalid notebook link');
  if(state.note && state.note.id!==id){
    state.note=null;
    $('#main').replaceChildren();
  }
  try{
    if(id){
      const note=await api(`/notes/${encodeURIComponent(id)}`);
      if(current()){state.note=note;renderNotebook();window.scrollTo(0,0);}
    }else{
      const notes=await api('/notes');
      if(current()){state.notes=notes;writeLibraryCache(localStorage,notes,Date.now(),scope||'local');renderLibrary();}
    }
  }catch(error){if(current())throw error;}
}
document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-action]')||(!event.target.closest('button,a,input')&&event.target.closest('.note-card[data-id]'));
  if(!button||state.dragging)return;
  const action=button.dataset.action||'open';
  try{
    if(action==='add')startNote();
    if(action==='signin'){event.preventDefault();signInForNotes();}
    if(action==='open'){
      if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
      event.preventDefault();
      const id=button.dataset.id;
      const hash=state.user?'#note='+encodeURIComponent(id):'#sample='+encodeURIComponent(id);
      if(location.hash===hash)await refresh();else location.hash=hash;
    }
    if(action==='library'){location.hash='';state.evidence=null;state.revision=null;}
    if(action==='tab'){state.tab=button.dataset.tab;renderNotebook();}
    if(action==='cover'){state.note=await api(`/notes/${state.note.id}`,{method:'PATCH',data:{coverImage:button.dataset.image||null}});renderNotebook();}
    if(action==='pin'){const note=state.note?.id===button.dataset.id?state.note:state.notes.find(n=>n.id===button.dataset.id);await api(`/notes/${note.id}`,{method:'PATCH',data:{pinned:!note.pinned}});await refresh();}
    if(action==='color'){state.note=await api(`/notes/${state.note.id}`,{method:'PATCH',data:{color:button.dataset.color}});renderNotebook();}
    if(action==='redo'){
      const note=state.note,scope=state.cacheScope,model=state.model;
      if(!note||!viewingNotebook(note.id,scope))return;
      button.disabled=true;
      const revision=note.revisions?.at(-1)?.id||'first';
      const operation=['notcards.summary',scope,note.id,model,note.transcriptHash||'',revision].join(':');
      let requestId=crypto.randomUUID();
      try{requestId=sessionStorage.getItem(operation)||requestId;sessionStorage.setItem(operation,requestId);}catch{}
      await api(`/notes/${note.id}/summarize`,{method:'POST',data:{model,requestId}});
      try{sessionStorage.removeItem(operation);}catch{}
      if(!viewingNotebook(note.id,scope))return;
      const updated=await api(`/notes/${note.id}`);
      if(viewingNotebook(note.id,scope)){state.revision=null;state.note=updated;renderNotebook();}
    }
    if(action==='retry-video-import'){
      const id=state.note.id,scope=state.cacheScope;
      button.disabled=true;button.textContent=t('Fetching captions');
      const updated=await api(`/notes/${encodeURIComponent(id)}/video-import`,{method:'POST'});
      if(viewingNotebook(id,scope)){state.note=updated;renderNotebook();}
    }
    if(action==='cite'){const note=state.note;const revision=note.revisions[state.revision ?? note.revisions.length-1];const segments=button.dataset.kind==='question'?note.conversations.find(q=>q.id===button.dataset.item)?.segments:revision?.segments;state.evidence=segments?.find(s=>s.id===Number(button.dataset.source));renderEvidence();$('#evidence')?.scrollIntoView({behavior:'smooth',block:'nearest'});}
    if(action==='close-evidence'){state.evidence=null;renderEvidence();}
  }catch(error){toast(error.message);button.disabled=false;}
});
$('#all-filter').addEventListener('click',()=>{state.folderId='all';state.explore=false;state.pinned=false;if(location.hash)location.hash='';else renderLibrary();});
$('#explore-filter').addEventListener('click',()=>{state.folderId='all';state.explore=true;state.pinned=false;if(location.hash)location.hash='';else renderLibrary();});
$('#pin-filter').addEventListener('click',()=>{state.folderId='saved';state.pinned=true;state.explore=false;if(location.hash)location.hash='';else renderLibrary();});
function updateSourceFields(){
  const kind=$('#source-kind').value,urlField=$('#url-field'),url=$('#video-url'),text=$('#video-transcript');
  const needsUrl=kind!=='text';urlField.hidden=!needsUrl;url.required=needsUrl;text.required=kind==='text';
  $('#url-label').textContent=t(kind==='video'?'YouTube URL':'Source URL');
  $('#text-label').textContent=t(kind==='video'?'Transcript':'Source text');
  text.placeholder=t(kind==='video'?'Paste text or timestamped captions…':'Paste text or notes…');
}
$('#source-kind').addEventListener('change',updateSourceFields);
$('#add').addEventListener('click',startNote);
$('#connect').href='/downloads/notcards-dev.zip';
$('#connect').addEventListener('click',event=>{if(state.local){event.preventDefault();if(state.config.pairingToken&&$('#connect-dialog')){$('#pairing-code').value=state.config.pairingToken;$('#connect-dialog').showModal();}}});
document.querySelectorAll('.close-dialog').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
$('#copy-code')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#pairing-code').value);toast(t('Pairing code copied. Paste it in extension settings.'));}catch{$('#pairing-code').type='text';$('#pairing-code').select();toast(t('Select and copy the pairing code.'));}});
$('#folder-form')?.addEventListener('submit',async event=>{event.preventDefault();if(!state.user){toast(t('Sign in to create folders.'));return;}const name=$('#folder-name').value.trim();if(!name)return;try{const folder=await api('/folders',{method:'POST',data:{name}});state.folders.push(folder);$('#folder-dialog').close();$('#folder-form').reset();renderLibrary();}catch(error){toast(error.message);}});
$('#logout')?.addEventListener('click',async()=>{try{await fetch('/auth/logout',{method:'POST',credentials:'same-origin'});composer.clear();state.user=null;state.notes=[];state.folders=[];state.note=null;location.hash='';$('#settings-dialog').close();renderLibrary();}catch(error){toast(error.message);}});
$('#add-form').addEventListener('submit',async event=>{
  event.preventDefault();$('#save-video').disabled=true;$('#add-error').textContent='';
  const sourceType=$('#source-kind').value,url=$('#video-url').value.trim(),text=$('#video-transcript').value.trim(),title=$('#video-title').value.trim();
  try{
    if(state.local&&sourceType!=='video')throw new Error(t('Sign in to save web and text research.'));
    let note;
    if(sourceType==='video'){
      note=await api('/notes',{method:'POST',data:{url,title}});
      if(text)await api(`/notes/${note.id}/transcript`,{method:'POST',data:{transcript:text,source:'paste',model:state.config.defaultModel||'cheap'}});
    }else{
      note=await api('/notes',{method:'POST',data:{sourceType,url:url||undefined,title,text,folderId:state.folderId==='all'?null:state.folderId}});
    }
    $('#add-dialog').close();$('#add-form').reset();updateSourceFields();state.tab='summary';state.revision=null;location.hash=`note=${note.id}`;await refresh();
  }catch(error){$('#add-error').textContent=error.message;}finally{$('#save-video').disabled=false;}
});
window.addEventListener('hashchange',()=>{state.tab='summary';state.revision=null;state.evidence=null;refresh().catch(error=>{toast(error.message);location.hash='';});});
document.addEventListener('keydown',event=>{
  const tab=event.target.closest('.tab');
  if(!tab || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();
  const tabs=[...document.querySelectorAll('.tab')];const current=tabs.indexOf(tab);
  const index=event.key==='Home'?0:event.key==='End'?tabs.length-1:(current+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
  state.tab=tabs[index].dataset.tab;renderNotebook();document.querySelector(`.tab[data-tab="${state.tab}"]`)?.focus();
});
try{state.view=localStorage?.getItem('notcards-view')==='grid'?'grid':'album';}catch{}
applyTheme();applyLanguage();
const cardSize=$('#card-size');
function applyCardSize(value){
  const size=/^[1-5]$/.test(String(value))?String(value):'3';
  document.documentElement.dataset.cardSize=size;
  cardSize.value=size;
  const readout=cardSize.parentElement.querySelector('output');
  if(readout)readout.value=size;
}
let savedCardSize;
try{savedCardSize=localStorage?.getItem('notcards-card-size');}catch{}
applyCardSize(savedCardSize);
cardSize.addEventListener('input',()=>{
  applyCardSize(cardSize.value);
  try{localStorage?.setItem('notcards-card-size',cardSize.value);}catch{}
});
$('#settings').addEventListener('click',()=>$('#settings-dialog').showModal());
function changeLanguage(preference){
  const ids=['question','transcript-input'];const drafts=new Map(ids.map(id=>[id,$(`#${id}`)?.value]));
  languagePreference=preference==='auto'?'auto':resolveLocale(preference);locale=resolveLocale(languagePreference==='auto'?browserLanguages():[languagePreference]);try{if(localStorage)localStorage.setItem('clay-notes-language',languagePreference);}catch{/* Browser storage may be disabled. */}
  applyLanguage();if(state.note)renderNotebook();else renderLibrary();
  for(const [id,value] of drafts)if(value!==undefined && $(`#${id}`))$(`#${id}`).value=value;
}
$('#language').addEventListener('change',event=>changeLanguage(event.target.value));
$('#theme').addEventListener('change',event=>{
  themePreference=['light','dark'].includes(event.target.value)?event.target.value:'auto';try{localStorage?.setItem('clay-notes-theme',themePreference);}catch{}applyTheme();
});
systemTheme.addEventListener?.('change',()=>{if(themePreference==='auto')applyTheme();});
window.addEventListener('languagechange',()=>{if(languagePreference==='auto')changeLanguage('auto');});
renderLibrary();
async function bootUserLibrary(){
  state.cacheScope=state.user?state.user.id:'local';
  if(state.user&&!state.local){$('#connect').textContent=t('Chrome extension');$('#connect').setAttribute('aria-label',t('Chrome extension'));$('#connect').href='/downloads/notcards-dev.zip';$('#logout').hidden=false;void api('/folders').then(folders=>{state.folders=folders;renderLibrary();}).catch(error=>toast(error.message));}
  else{$('#logout').hidden=true;}
  bootCollection({storage:localStorage,scope:state.cacheScope,loadNotes:()=>api('/notes'),loadConfig:()=>api('/config'),onNotes:(notes,source)=>{state.notes=notes;state.sync=source;if(!location.hash)renderLibrary();},onConfig:config=>{state.config=config;document.querySelectorAll('.model-select').forEach(select=>select.innerHTML=modelOptions());if(state.note)renderNotebook();},onError:(error,source)=>{if(source==='notes'){state.sync='error';renderCards();toast(error.message);}}});
  if(location.hash&&state.user)refresh().catch(error=>toast(error.message));
}
async function startLibrary(){
  try{
    const response=await fetch('/api/session',{credentials:'same-origin'});
    if(response.status===404){state.local=true;state.user={id:'local'};await bootUserLibrary();return;}
    if(!response.ok)throw new Error('Session check failed');
    const session=await response.json();state.googleConfigured=session.googleConfigured===true;
    if(!session.authenticated){state.user=null;state.local=false;renderLibrary();return;}
    state.local=false;state.user=session.user;await bootUserLibrary();
  }catch{state.user=null;state.local=false;renderLibrary();}
}
async function refreshSession(){
  if(state.local)return;
  try{
    const response=await fetch('/api/session',{credentials:'same-origin'});if(!response.ok)return;
    const session=await response.json(),nextId=session.authenticated?session.user.id:null,currentId=state.user?.id||null;
    state.googleConfigured=session.googleConfigured===true;
    if(nextId===currentId)return;
    if(currentId)composer.clear();
    state.note=null;state.notes=[];state.folders=[];state.user=session.authenticated?session.user:null;location.hash='';
    renderLibrary();if(state.user)await bootUserLibrary();
  }catch{/* Keep the current account visible until a definite session response arrives. */}
}
void startLibrary();
setInterval(async()=>{
  const retry=document.querySelector('[data-action="retry-video-import"][data-ready-at]:disabled');
  if(retry&&Number(retry.dataset.readyAt)>0&&Number(retry.dataset.readyAt)<=Date.now()){retry.disabled=false;retry.removeAttribute('data-ready-at');retry.textContent=t('Retry caption import')+' ↻';}
  if(document.hidden||state.busy||state.dragging||!state.user||state.samplePreview)return;
  try{
    if(state.note){
      const {id}=state.note,scope=state.cacheScope;
      const updated=await api(`/notes/${encodeURIComponent(id)}`);
      if(viewingNotebook(id,scope) && state.note?.id===id &&
        (updated.updatedAt!==state.note.updatedAt || JSON.stringify(updated.videoImport)!==JSON.stringify(state.note.videoImport))){
        state.note=updated;renderNotebook();
      }
    }
    else{const updated=await api('/notes');if(JSON.stringify(updated)!==JSON.stringify(state.notes)){state.notes=updated;writeLibraryCache(localStorage,updated,Date.now(),state.cacheScope);if($('#cards'))renderCards();}}
  }catch{/* Preserve visible content through temporary disconnects. */}
},2500);

function imagePanel(note){return `<section class="images-panel"><h3>${h('Images')}</h3><p class="small">${h('Attach images and choose your full-art cover.')}</p><label class="image-upload">${h('Add image')}<input id="image-upload" type="file" accept="image/png,image/jpeg,image/webp"></label><p class="small">${h('PNG, JPEG or WebP · up to 2 MiB · 8 images')}</p><div class="image-gallery">${(note.images||[]).map(image=>`<button type="button" class="image-cover ${note.coverImage===image.id?'selected':''}" data-action="cover" data-image="${image.id}" aria-label="${h('Use as cover')}: ${escape(image.name)}" aria-pressed="${note.coverImage===image.id}"><img src="${escape(image.url)}" alt="${escape(image.name)}" loading="lazy"><span>${h(note.coverImage===image.id?'Current cover':'Use as cover')}</span></button>`).join('')}</div>${note.coverImage?`<button class="quiet-button" data-action="cover" data-image="">${h('Use video thumbnail')}</button>`:''}</section>`;}
function bindImages(){$('#image-upload')?.addEventListener('change',async event=>{const input=event.target,file=input.files?.[0];if(!file)return;if(file.size>2*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type)){toast(t('PNG, JPEG or WebP · up to 2 MiB · 8 images'));input.value='';return;}input.disabled=true;try{const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error(t('Image could not be read')));reader.readAsDataURL(file);});await api(`/notes/${state.note.id}/images`,{method:'POST',data:{dataUrl,name:file.name}});state.note=await api(`/notes/${state.note.id}`);renderNotebook();toast(t('Image saved. Choose it as your cover.'));}catch(error){toast(error.message);input.disabled=false;}});}
async function moveCard(id,targetId){
  if(state.sort!=='manual'||id===targetId)return;
  const ids=[...document.querySelectorAll('.note-card')].map(card=>card.dataset.id),from=ids.indexOf(id),to=ids.indexOf(targetId);if(from<0||to<0)return;ids.splice(to,0,ids.splice(from,1)[0]);
  state.dragging=true;try{const result=await api('/order',{method:'PATCH',data:{ids}});const byId=new Map(state.notes.map(note=>[note.id,note]));state.notes=result.ids.map(key=>byId.get(key)).filter(Boolean);writeLibraryCache(localStorage,state.notes,Date.now(),state.cacheScope);renderCards();document.querySelector(`.card-grab[data-id="${id}"]`)?.focus({preventScroll:true});toast(t('Card order saved.'));}catch(error){toast(error.message);}finally{state.dragging=false;}
}
function bindCards(){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,fine=matchMedia('(pointer: fine)').matches;
  document.querySelectorAll('.note-card').forEach(card=>{const surface=card.querySelector('.card-surface');if(!surface)return;const art=card.querySelector('.card-art');art.addEventListener('error',()=>{const fallback=art.dataset.fallback;if(fallback){art.dataset.fallback='';art.src=fallback;}});if(!reduced&&fine){card.addEventListener('pointermove',event=>{if(state.dragging)return;const box=card.getBoundingClientRect(),x=(event.clientX-box.left)/box.width,y=(event.clientY-box.top)/box.height;surface.style.setProperty('--rx',`${(0.5-y)*9}deg`);surface.style.setProperty('--ry',`${(x-.5)*12}deg`);surface.style.setProperty('--px',`${x*100}%`);surface.style.setProperty('--py',`${y*100}%`);});card.addEventListener('pointerleave',()=>{surface.style.setProperty('--rx','0deg');surface.style.setProperty('--ry','0deg');});}
    const handle=card.querySelector('.card-grab');if(!handle)return;handle.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)||state.sort!=='manual')return;event.preventDefault();const cards=[...document.querySelectorAll('.note-card')],index=cards.indexOf(card),delta=['ArrowLeft','ArrowUp'].includes(event.key)?-1:1;const target=event.key==='Home'?cards[0]:event.key==='End'?cards.at(-1):cards[index+delta];if(target)void moveCard(card.dataset.id,target.dataset.id);});
    handle.addEventListener('pointerdown',event=>{if(event.button!==0||state.sort!=='manual'||state.dragging)return;event.preventDefault();handle.setPointerCapture(event.pointerId);state.dragging=true;card.classList.add('dragging');const startX=event.clientX,startY=event.clientY;let targetId=card.dataset.id;
      const move=pointer=>{card.style.setProperty('--dx',`${pointer.clientX-startX}px`);card.style.setProperty('--dy',`${pointer.clientY-startY}px`);const hit=document.elementFromPoint(pointer.clientX,pointer.clientY)?.closest('.note-card');document.querySelectorAll('.drop-target').forEach(item=>item.classList.remove('drop-target'));if(hit&&hit!==card){targetId=hit.dataset.id;hit.classList.add('drop-target');}};
      const finish=pointer=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',finish);handle.removeEventListener('pointercancel',finish);if(handle.hasPointerCapture(pointer.pointerId))handle.releasePointerCapture(pointer.pointerId);card.classList.remove('dragging');card.style.removeProperty('--dx');card.style.removeProperty('--dy');document.querySelectorAll('.drop-target').forEach(item=>item.classList.remove('drop-target'));state.dragging=false;if(pointer.type!=='pointercancel')void moveCard(card.dataset.id,targetId);};
      handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);
    });
  });
}
