import {locales,resolveLocale,translate,direction,localizeStatic,readPreferences,resolveTheme,pendingNoteMessage} from './i18n.mjs';
import {requestJSON} from './session.mjs';
import {bootCollection,writeLibraryCache,sortCollection,mergeVisibleOrder,coverSource,animateCards} from './collection.mjs';
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
const state={notes:[],note:null,config:{models:[]},pinned:false,query:'',sort:'manual',filter:'all',sync:'loading',dragging:false,tab:'summary',revision:null,model:'cheap',evidence:null,drafts:new Map(),busy:false};
let toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('#toast').hidden=true;},5500);}
async function api(path,{method='GET',data}={}){
  try{return await requestJSON(fetch,`/api${path}`,{method,headers:data?{'Content-Type':'application/json'}:{},...(data?{body:JSON.stringify(data)}:{})});}
  catch(error){if(error.code==='web_session_expired')error.message=t('Your local session expired. Reload Clay Notes.');throw error;}
}
const time=value=>{const n=Math.floor(Number(value)||0);return n>=3600?`${Math.floor(n/3600)}:${String(Math.floor(n/60)%60).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`:`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;};
const date=value=>new Date(value).toLocaleDateString(locale,{month:'short',day:'numeric'});
const labels={awaiting_transcript:'Needs transcript',awaiting_summary:'Ready to summarize',queued:'In the queue',summarizing:'Finding the good parts…',ready:'Ready to read',error:'Needs attention'};
const status=note=>`<span class="status ${escape(note.state)}">${note.state==='ready'?'✦ ':''}${h(labels[note.state] || note.state)}</span>`;
const isGenerating=note=>['queued','summarizing'].includes(note.state);
function modelOptions(){const models=state.config.models.length?state.config.models:[state.config.defaultModel || 'cheap'];return models.map(model=>`<option value="${escape(model)}" ${state.model===model?'selected':''}>${escape(model)}${!state.config.gatewayConfigured?' · '+h('Needs attention'):''}</option>`).join('');}
function setupBanner(){
  if(state.config.gatewayConfigured && !state.config.modelError)return '';
  return `<div class="setup-banner"><details><summary>${state.config.gatewayConfigured?h('Gateway connection needs attention'):h('Your library is ready. Connect Ghost to turn on AI.')}</summary><p class="small">${h('Gateway onboarding is waiting for operator Apply. Saving and source capture work without AI.')}</p>${state.config.modelError?`<p class="error" dir="auto">${escape(state.config.modelError)}</p>`:''}</details></div>`;
}
const garden=()=>`<div class="garden" aria-hidden="true"><svg viewBox="0 0 480 230" fill="none"><defs><linearGradient id="paper" x1="200" y1="20" x2="270" y2="170" gradientUnits="userSpaceOnUse"><stop stop-color="#fffef4"/><stop offset="1" stop-color="#e6dfc9"/></linearGradient><linearGradient id="leaf" x1="340" y1="65" x2="350" y2="165" gradientUnits="userSpaceOnUse"><stop stop-color="#99b477"/><stop offset="1" stop-color="#54734a"/></linearGradient><radialGradient id="shadow"><stop stop-color="#5f7655" stop-opacity=".23"/><stop offset="1" stop-color="#5f7655" stop-opacity="0"/></radialGradient></defs><ellipse cx="250" cy="192" rx="155" ry="24" fill="url(#shadow)"/><g transform="rotate(-12 205 120)"><rect x="107" y="53" width="138" height="143" rx="19" fill="#b1c3a1"/><rect x="111" y="48" width="138" height="143" rx="19" fill="#c5d7b1" stroke="#fff" stroke-opacity=".5"/></g><g transform="rotate(9 250 110)"><rect x="187" y="37" width="141" height="151" rx="19" fill="#d5cbb1"/><rect x="184" y="31" width="141" height="151" rx="19" fill="url(#paper)" stroke="#fffef3"/><rect x="205" y="51" width="99" height="39" rx="10" fill="#dbe5c9"/><path d="m246 62 13 8-13 8V62Z" fill="#65814e"/><path d="M206 111h79M206 124h65M206 137h83M206 150h48" stroke="#a2ac90" stroke-width="4" stroke-linecap="round"/></g><path d="M355 185v-62" stroke="#71865a" stroke-width="5" stroke-linecap="round"/><path d="M353 148c-35-1-43-26-36-43 29 0 39 21 36 43Z" fill="url(#leaf)"/><path d="M356 128c32-8 37-32 25-47-26 6-32 27-25 47Z" fill="url(#leaf)"/><path d="M336 177h38l-5 23h-29l-4-23Z" fill="#bfae8c"/><path d="M111 92 101 86M121 71l-2-12M96 115l-13 2" stroke="#93a67b" stroke-width="3" stroke-linecap="round"/><circle cx="365" cy="49" r="5" fill="#d4dca5"/><path d="m343 62 3-6 3 6 6 3-6 3-3 6-3-6-6-3 6-3Z" fill="#8ba36c"/></svg><span class="garden-caption">${h("Small notes. Room for big ideas.")}</span></div>`;

function renderLibrary(){
  state.note=null;
  $('#all-filter').classList.toggle('active',!state.pinned);$('#pin-filter').classList.toggle('active',state.pinned);
  $('#main').innerHTML=`<section class="library-intro"><div><span class="eyebrow">${h("YOUR LITTLE CORNER OF CLARITY")}</span><h1>${h("Less watching.")} <br>${h("More")} <em>${h("understanding.")}</em></h1><p class="lead">${h("Ideas worth keeping, all in your collection.")}<br>${h("A quick takeaway now. A deeper notebook whenever.")}</p></div>${garden()}</section>${setupBanner()}<section aria-labelledby="library-title"><div class="toolbar"><h2 id="library-title">${state.pinned?t("Pinned notes"):t("Your collection")} <span class="count" id="note-count"></span></h2><label class="screen-reader" for="search">${h("Search your notes")}</label><div class="search-wrap"><span aria-hidden="true">⌕</span><input type="search" id="search" placeholder="${h("Find an idea, video, or channel…")}" value="${escape(state.query)}"></div></div><div class="collection-tools"><label>${h("Sort")}<select id="card-sort">${[["manual","My order"],["newest","Newest first"],["oldest","Oldest first"],["title","Title"]].map(([value,label])=>`<option value="${value}" ${state.sort===value?"selected":""}>${h(label)}</option>`).join("")}</select></label><label>${h("Filter")}<select id="card-filter">${[["all","All notes"],["ready","Ready to read"],["waiting","Waiting"],["error","Needs attention"]].map(([value,label])=>`<option value="${value}" ${state.filter===value?"selected":""}>${h(label)}</option>`).join("")}</select></label><span class="small collection-sync" id="sync-state" role="status"></span></div><p class="small move-help">${h("Drag the handle to reorder. Arrow keys move a focused handle.")}</p><div id="cards"></div></section><footer class="library-footer"><span>${h("Made for the things worth keeping.")}</span><span>Clay Notes · ${h("a Represent tool")}</span></footer>`;
  $('#search').addEventListener('input',event=>{state.query=event.target.value;renderCards();});$('#card-sort').addEventListener('change',event=>{state.sort=event.target.value;renderCards();});$('#card-filter').addEventListener('change',event=>{state.filter=event.target.value;renderCards();});renderCards();
}
function renderCards(){
  const query=state.query.toLowerCase();
  const notes=sortCollection(state.notes.filter(note=>(!state.pinned||note.pinned)&&(state.filter==='all'||(state.filter==='waiting'?!['ready','error'].includes(note.state):note.state===state.filter))&&`${note.title} ${note.channel} ${note.overview}`.toLowerCase().includes(query)),state.sort,locale);
  const before=new Map([...document.querySelectorAll('.note-card')].map(card=>[card.dataset.id,card.getBoundingClientRect()]));
  $('#main').dataset.hasNotes=String(state.notes.length>0);$('#note-count').textContent=notes.length;$('#sync-state').textContent=state.sync==='cache'?t('Saved on this device. Refreshing…'):state.sync==='loading'?t('Refreshing…'):state.sync==='error'?t('Offline. Showing saved notes.') :'';
  if(!notes.length){
    $('#cards').innerHTML=state.notes.length?`<div class="empty"><div><h3>${state.pinned?t("A place for your favorites."):t("No notes found.")}</h3><p>${state.pinned?t("Pin any video to keep it close."):t("Try another title, channel, or idea.")}</p></div></div>`:`<div class="empty"><div><h3>${h("Your next good idea")}<br>${h("is already playing.")}</h3><p>${h("Bring a video here and leave with its main statements and conclusions. No prompt to type. No notebook to set up.")}</p><button class="dark-button" data-action="add">${h("Save your first video")} ↗</button></div><div class="empty-flow"><div class="flow-step"><span class="step-number">1</span><span>${h("Find something interesting on YouTube.")}</span></div><div class="flow-step"><span class="step-number">2</span><span>${h("Click")} <strong>✦ Clay Notes</strong> ${h("below the video.")}</span></div><div class="flow-step"><span class="step-number">3</span><span>${h("Your notebook opens. The takeaway follows.")}</span></div><button class="quiet-button" data-action="connect">${h("Connect the Chrome extension")} →</button></div></div>`;
    return;
  }
  $('#cards').innerHTML=`<div class="grid tcg-grid">${notes.map((note,i)=>`<article data-id="${note.id}" class="note-card tcg-card ${['cream','mint','peach','lilac'].includes(note.color)?note.color:['cream','mint','peach','lilac'][i%4]}"><div class="card-surface"><img class="card-art" src="${escape(coverSource(note))}" alt="" loading="${i<4?'eager':'lazy'}" decoding="async" referrerpolicy="no-referrer"><div class="card-shade"></div><div class="card-foil" aria-hidden="true"></div><div class="card-top"><span class="video-tag"><span class="play-icon" aria-hidden="true">▶</span><span dir="auto">${escape(note.channel || t('YouTube video'))}</span></span><button class="pin" aria-label="${note.pinned?t('Unpin'):t('Pin')} ${escape(note.title)}" aria-pressed="${note.pinned}" data-action="pin" data-id="${note.id}">${note.pinned?'◆':'◇'}</button></div><div class="card-text"><span class="card-category">CLAY NOTES <span aria-hidden="true">✦</span></span><button class="card-title" dir="auto" data-action="open" data-id="${note.id}">${escape(note.title)}</button><p class="card-summary" dir="auto">${escape(note.overview || note.error || t(note.state==='awaiting_summary'?'The source, in its own words.':pendingNoteMessage(note.state)))}</p>${status(note)}</div><div class="card-footer"><span>${note.statementCount?`${note.statementCount} ${h('main statements')}`:h('Notebook')}</span><button class="card-grab" aria-label="${h('Move card')} ${escape(note.title)}" title="${h('Drag the handle to reorder. Arrow keys move a focused handle.')}" ${state.sort!=='manual'?'disabled':''} data-id="${note.id}"><span aria-hidden="true">⠿</span></button><span>${escape(date(note.createdAt))} ↗</span></div></div></article>`).join('')}</div>`;
  bindCards();animateCards($('#cards'),before);
}

function citations(sources,kind='summary',item='') {return (sources || []).map(index=>`<button class="citation" title="${h("Read supporting transcript")}" aria-label="${h("Read supporting segment")} ${index+1}" data-action="cite" data-source="${index}" data-kind="${kind}" data-item="${item}">[${index+1}]</button>`).join('');}
function renderNotebook(){
  const n=state.note;if(!n)return;
  const sameNotebook=document.querySelector('[data-notebook-id]')?.dataset.notebookId===n.id;const inputDrafts=new Map(sameNotebook?['question','transcript-input'].map(id=>[id,$(`#${id}`)?.value]):[]);
  const draft=state.drafts.get(n.id) ?? n.personalNotes;
  $('#main').innerHTML=`<button class="back" data-action="library">← ${h("Back to your collection")}</button>${setupBanner()}<header class="notebook-heading" data-notebook-id="${n.id}"><div><span class="eyebrow">${h("A VIDEO, DISTILLED")}</span><h1 dir="auto">${escape(n.title)}</h1><div class="notebook-meta"><span>${escape(n.channel || 'YouTube')}</span><span>${h("Saved")} ${escape(date(n.createdAt))}</span>${status(n)}</div></div><button class="pin" data-action="pin" data-id="${n.id}" aria-label="${n.pinned?t("Unpin"):t("Pin")} ${h('Notebook')}" aria-pressed="${n.pinned}">${n.pinned?'◆':'◇'}</button></header><div class="notebook-layout"><section class="paper" aria-label="${h('Notebook content')}"><div class="tabs" role="tablist" aria-label="${h('Notebook sections')}">${[['summary',t("The takeaway")],['questions',t("Ask a question")],['transcript',t("Transcript")]].map(([id,label])=>`<button class="tab ${state.tab===id?'active':''}" role="tab" aria-selected="${state.tab===id}" data-action="tab" data-tab="${id}">${label}</button>`).join('')}</div><div id="notebook-content" role="tabpanel"></div></section><aside class="notebook-side"><div class="source-card"><img src="${n.thumbnail}" alt="${h('Video thumbnail')}" loading="lazy"><div class="source-card-content"><p>${n.segments.length?`${n.segments.length} ${h("transcript segments")} · ${escape(n.transcriptSource || 'captured source')}`:t("Waiting for your video transcript")}</p><a class="source-link" href="${n.url}" target="_blank" rel="noreferrer">${h("Open original video")} ↗</a></div></div><form id="personal-form" class="notes-card"><h3>${h("A thought of your own.")}</h3><p>${h("Connections, questions, things to try.")}</p><label class="screen-reader" for="personal-notes">${h("Your personal notes")}</label><textarea dir="auto" id="personal-notes" placeholder="${h("Make a little space for your thoughts…")}" maxlength="50000">${escape(draft)}</textarea><button class="light-button">${h("Save my notes")}</button><div class="color-picker" aria-label="${h("Note color")}">${['cream','mint','peach','lilac'].map(color=>`<button type="button" class="${color}" aria-label="${h({cream:'Cream',mint:'Mint',peach:'Peach',lilac:'Lilac'}[color])}" aria-pressed="${n.color===color}" data-action="color" data-color="${color}"></button>`).join('')}</div></form>${imagePanel(n)}<div id="evidence"></div></aside></div>`;
  $('#personal-notes').addEventListener('input',event=>state.drafts.set(n.id,event.target.value));
  $('#personal-form').addEventListener('submit',async event=>{event.preventDefault();try{state.note=await api(`/notes/${n.id}`,{method:'PATCH',data:{personalNotes:$('#personal-notes').value}});state.drafts.delete(n.id);toast(t("Your thoughts are saved."));}catch(error){toast(error.message);}});
  renderNotebookContent();renderEvidence();bindImages();for(const [id,value] of inputDrafts)if(value!==undefined&&$(`#${id}`))$(`#${id}`).value=value;
}
function transcriptForm(){return `<form id="transcript-form" class="transcript-form"><label for="transcript-input">${h("Paste the video transcript")}</label><p class="small">${h("On YouTube, expand the description and select “Show transcript”. Copy the text here. Timestamps are welcome. Maximum 160,000 characters.")}</p><textarea id="transcript-input" required placeholder="0:00 The first idea…&#10;1:24 The next idea…" maxlength="800000"></textarea><button class="dark-button" ${state.busy?'disabled':''}>${h("Save transcript & summarize")} →</button></form>`;}
function bindTranscript(){ $('#transcript-form')?.addEventListener('submit',async event=>{event.preventDefault();const transcript=$('#transcript-input').value;const button=event.submitter;button.disabled=true;try{await api(`/notes/${state.note.id}/transcript`,{method:'POST',data:{transcript,source:'paste',model:state.model}});state.note=await api(`/notes/${state.note.id}`);state.tab='summary';renderNotebook();}catch(error){toast(error.message);button.disabled=false;}}); }
function renderNotebookContent(){
  const n=state.note, target=$('#notebook-content');
  if(state.tab==='transcript'){
    target.innerHTML=`<h2 class="section-title">${h("The source, in its own words.")}</h2><p class="small">${n.segments.length?t("Captured captions may contain transcription mistakes. Click a timestamp to watch the original."):t("The notebook is saved. Add captions to start the summary.")}</p>${n.segments.length?`<details><summary class="small">${h("Replace transcript")}</summary>${transcriptForm()}</details><div class="transcript-list">${n.segments.map(s=>`<div class="segment"><a href="${n.url}&t=${Math.floor(s.start)}s" target="_blank" rel="noreferrer">${time(s.start)} ↗</a><span dir="auto">${escape(s.text)}</span></div>`).join('')}</div>`:transcriptForm()}`;bindTranscript();return;
  }
  if(state.tab==='questions'){
    target.innerHTML=`<h2 class="section-title">${h("Pull on an interesting thread.")}</h2><p class="small">${h("Ask about the captured transcript. Each question makes a new gateway request.")}</p><form id="ask-form" class="ask-form"><label class="screen-reader" for="question">${h("Your question")}</label><textarea id="question" maxlength="4000" required placeholder="${h("What evidence supports the main conclusion?")}" ${!n.segments.length?'disabled':''}></textarea><div class="form-actions"><select class="model-select" aria-label="${h("Question model")}" id="question-model">${modelOptions()}</select><button class="dark-button" ${!n.segments.length||state.busy||isGenerating(n)?'disabled':''}>${state.busy?t("Thinking…"):"" + t("Ask this video") + " →"}</button></div></form>${!n.segments.length?`<p class="small">${h("Add a transcript first.")}</p>`:''}${n.conversations.slice().reverse().map(q=>`<article class="conversation"><h3>${escape(q.question)}</h3><p>${escape(q.answer)} ${citations(q.sources,'question',q.id)}</p><span class="small">${escape(q.metrics.responseModel || q.metrics.requestedModel || 'Gateway model')}</span></article>`).join('')}`;
    $('#question-model').addEventListener('change',e=>{state.model=e.target.value;});
    $('#ask-form').addEventListener('submit',async event=>{event.preventDefault();const question=$('#question').value;state.busy=true;event.submitter.disabled=true;event.submitter.textContent=t("Thinking…");try{state.note=await api(`/notes/${n.id}/ask`,{method:'POST',data:{question,model:state.model}});}catch(error){toast(error.message);}finally{state.busy=false;renderNotebook();}});return;
  }
  const revision=n.revisions[state.revision ?? n.revisions.length-1];
  const controls=`<div class="summary-toolbar"><select id="revision" aria-label="${h("Summary revision")}">${n.revisions.map((r,index)=>`<option value="${index}" ${r.id===revision?.id?'selected':''}>${h("Version")} ${index+1} · ${escape(r.metrics.requestedModel || 'model')}</option>`).join('')}</select><div><select class="model-select" id="summary-model" aria-label="${h("Regeneration model")}">${modelOptions()}</select><button class="quiet-button" data-action="redo" ${isGenerating(n)||!n.segments.length?'disabled':''}>${isGenerating(n)?t("Working…"):"↻ " + t("Redo") + ""}</button></div></div>`;
  const error=n.error?`<div class="setup-banner"><div><strong>${h("We kept your notebook.")}</strong><p class="error">${escape(n.error)}</p>${n.segments.length?`<button class="quiet-button" data-action="redo">${h("Try summary again")} ↗</button>`:''}</div></div>`:'';
  if(!revision){
    target.innerHTML=`${error}<div class="generation"><div class="orb" aria-hidden="true">✦</div><h2>${isGenerating(n)?t("A little clarity is on its way."):t("Your video has a home.")}</h2><p>${isGenerating(n)?t("Finding the main statements and conclusions in the transcript. You can leave this page; the service keeps working."):n.segments.length?t("Ready to summarize"):t("The Chrome extension will try to bring the captions here automatically. If YouTube keeps them tucked away, paste the transcript below.")}</p></div>${n.segments.length?controls:transcriptForm()}`;
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
  target.innerHTML=evidence?`<section class="evidence-box" aria-label="${h("Supporting transcript")}"><button class="icon-button" data-action="close-evidence" aria-label="${h("Close evidence")}">×</button><span class="eyebrow">${h("IN THE TRANSCRIPT")}</span><blockquote dir="auto">“${escape(evidence.text)}”</blockquote><a class="source-link" href="${state.note.url}&t=${Math.floor(evidence.start)}s" target="_blank" rel="noreferrer">${h("Watch at")} ${time(evidence.start)} ↗</a></section>`:'';
}
async function refresh(){
  const id=new URLSearchParams(location.hash.slice(1)).get('note');
  if(id){if(!/^[A-Za-z0-9_-]{11}$/.test(id))throw new Error('Invalid notebook link');state.note=await api(`/notes/${id}`);renderNotebook();}
  else{state.notes=await api('/notes');writeLibraryCache(localStorage,state.notes);renderLibrary();}
}
document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-action]');if(!button)return;
  const action=button.dataset.action;
  try{
    if(action==='add')$('#add-dialog').showModal();
    if(action==='connect')openConnect();
    if(action==='open')location.hash=`note=${button.dataset.id}`;
    if(action==='library'){location.hash='';state.evidence=null;state.revision=null;}
    if(action==='tab'){state.tab=button.dataset.tab;renderNotebook();}
    if(action==='cover'){state.note=await api(`/notes/${state.note.id}`,{method:'PATCH',data:{coverImage:button.dataset.image||null}});renderNotebook();}
    if(action==='pin'){const note=state.note?.id===button.dataset.id?state.note:state.notes.find(n=>n.id===button.dataset.id);await api(`/notes/${note.id}`,{method:'PATCH',data:{pinned:!note.pinned}});await refresh();}
    if(action==='color'){state.note=await api(`/notes/${state.note.id}`,{method:'PATCH',data:{color:button.dataset.color}});renderNotebook();}
    if(action==='redo'){button.disabled=true;await api(`/notes/${state.note.id}/summarize`,{method:'POST',data:{model:state.model}});state.revision=null;state.note=await api(`/notes/${state.note.id}`);renderNotebook();}
    if(action==='cite'){const note=state.note;const revision=note.revisions[state.revision ?? note.revisions.length-1];const segments=button.dataset.kind==='question'?note.conversations.find(q=>q.id===button.dataset.item)?.segments:revision?.segments;state.evidence=segments?.find(s=>s.id===Number(button.dataset.source));renderEvidence();$('#evidence')?.scrollIntoView({behavior:'smooth',block:'nearest'});}
    if(action==='close-evidence'){state.evidence=null;renderEvidence();}
  }catch(error){toast(error.message);button.disabled=false;}
});
$('#all-filter').addEventListener('click',()=>{state.pinned=false;if(location.hash)location.hash='';else renderLibrary();});
$('#pin-filter').addEventListener('click',()=>{state.pinned=true;if(location.hash)location.hash='';else renderLibrary();});
$('#add').addEventListener('click',()=>$('#add-dialog').showModal());
function openConnect(){if(!state.config.pairingToken){toast(t("Refresh the library to load your pairing code."));return;}$('#pairing-code').value=state.config.pairingToken;$('#connect-dialog').showModal();}
$('#connect').addEventListener('click',openConnect);
document.querySelectorAll('.close-dialog').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
$('#copy-code').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#pairing-code').value);toast(t("Pairing code copied. Paste it in extension settings."));}catch{$('#pairing-code').type='text';$('#pairing-code').select();toast(t("Select and copy the pairing code."));}});
$('#add-form').addEventListener('submit',async event=>{
  event.preventDefault();$('#save-video').disabled=true;$('#add-error').textContent='';
  try{
    const note=await api('/notes',{method:'POST',data:{url:$('#video-url').value,title:$('#video-title').value}});
    const transcript=$('#video-transcript').value.trim();
    if(transcript)await api(`/notes/${note.id}/transcript`,{method:'POST',data:{transcript,source:'paste',model:state.config.defaultModel || 'cheap'}});
    $('#add-dialog').close();$('#add-form').reset();state.tab='summary';state.revision=null;location.hash=`note=${note.id}`;await refresh();
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
applyTheme();applyLanguage();
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
if(!location.hash)renderLibrary();
bootCollection({storage:localStorage,loadNotes:()=>api('/notes'),loadConfig:()=>api('/config'),onNotes:(notes,source)=>{state.notes=notes;state.sync=source;if(!location.hash){if($('#cards'))renderCards();else renderLibrary();}},onConfig:config=>{state.config=config;state.model=config.models.includes(config.defaultModel)?config.defaultModel:config.models[0]||config.defaultModel||'cheap';const banner=document.querySelector('.setup-banner');if(banner)banner.outerHTML=setupBanner();document.querySelectorAll('.model-select').forEach(select=>{select.innerHTML=modelOptions();});},onError:(error,source)=>{if(source==='notes'){state.sync='error';if($('#cards'))renderCards();toast(error.message);}}});
if(location.hash)refresh().catch(error=>toast(error.message));
setInterval(async()=>{
  if(document.hidden||state.busy||state.dragging)return;
  try{
    if(state.note){const updated=await api(`/notes/${state.note.id}`);if(updated.updatedAt!==state.note.updatedAt){state.note=updated;renderNotebook();}}
    else{const updated=await api('/notes');if(JSON.stringify(updated)!==JSON.stringify(state.notes)){state.notes=updated;writeLibraryCache(localStorage,updated);if($('#cards'))renderCards();}}
  }catch{/* Preserve visible content through temporary disconnects. */}
},2500);

function imagePanel(note){return `<section class="images-panel"><h3>${h('Images')}</h3><p class="small">${h('Attach images and choose your full-art cover.')}</p><label class="image-upload">${h('Add image')}<input id="image-upload" type="file" accept="image/png,image/jpeg,image/webp"></label><p class="small">${h('PNG, JPEG or WebP · up to 2 MiB · 8 images')}</p><div class="image-gallery">${(note.images||[]).map(image=>`<button type="button" class="image-cover ${note.coverImage===image.id?'selected':''}" data-action="cover" data-image="${image.id}" aria-label="${h('Use as cover')}: ${escape(image.name)}" aria-pressed="${note.coverImage===image.id}"><img src="${escape(image.url)}" alt="${escape(image.name)}" loading="lazy"><span>${h(note.coverImage===image.id?'Current cover':'Use as cover')}</span></button>`).join('')}</div>${note.coverImage?`<button class="quiet-button" data-action="cover" data-image="">${h('Use video thumbnail')}</button>`:''}</section>`;}
function bindImages(){$('#image-upload')?.addEventListener('change',async event=>{const input=event.target,file=input.files?.[0];if(!file)return;if(file.size>2*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type)){toast(t('PNG, JPEG or WebP · up to 2 MiB · 8 images'));input.value='';return;}input.disabled=true;try{const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error(t('Image could not be read')));reader.readAsDataURL(file);});await api(`/notes/${state.note.id}/images`,{method:'POST',data:{dataUrl,name:file.name}});state.note=await api(`/notes/${state.note.id}`);renderNotebook();toast(t('Image saved. Choose it as your cover.'));}catch(error){toast(error.message);input.disabled=false;}});}
async function moveCard(id,targetId){
  if(state.sort!=='manual'||id===targetId)return;
  const ids=[...document.querySelectorAll('.note-card')].map(card=>card.dataset.id),from=ids.indexOf(id),to=ids.indexOf(targetId);if(from<0||to<0)return;ids.splice(to,0,ids.splice(from,1)[0]);
  state.dragging=true;try{const result=await api('/order',{method:'PATCH',data:{ids}});const byId=new Map(state.notes.map(note=>[note.id,note]));state.notes=result.ids.map(key=>byId.get(key)).filter(Boolean);writeLibraryCache(localStorage,state.notes);renderCards();document.querySelector(`.card-grab[data-id="${id}"]`)?.focus({preventScroll:true});toast(t('Card order saved.'));}catch(error){toast(error.message);}finally{state.dragging=false;}
}
function bindCards(){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,fine=matchMedia('(pointer: fine)').matches;
  document.querySelectorAll('.note-card').forEach(card=>{const surface=card.querySelector('.card-surface');if(!reduced&&fine){card.addEventListener('pointermove',event=>{if(state.dragging)return;const box=card.getBoundingClientRect(),x=(event.clientX-box.left)/box.width,y=(event.clientY-box.top)/box.height;surface.style.setProperty('--rx',`${(0.5-y)*9}deg`);surface.style.setProperty('--ry',`${(x-.5)*12}deg`);surface.style.setProperty('--px',`${x*100}%`);surface.style.setProperty('--py',`${y*100}%`);});card.addEventListener('pointerleave',()=>{surface.style.setProperty('--rx','0deg');surface.style.setProperty('--ry','0deg');});}
    const handle=card.querySelector('.card-grab');handle.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)||state.sort!=='manual')return;event.preventDefault();const cards=[...document.querySelectorAll('.note-card')],index=cards.indexOf(card),delta=['ArrowLeft','ArrowUp'].includes(event.key)?-1:1;const target=event.key==='Home'?cards[0]:event.key==='End'?cards.at(-1):cards[index+delta];if(target)void moveCard(card.dataset.id,target.dataset.id);});
    handle.addEventListener('pointerdown',event=>{if(event.button!==0||state.sort!=='manual'||state.dragging)return;event.preventDefault();handle.setPointerCapture(event.pointerId);state.dragging=true;card.classList.add('dragging');const startX=event.clientX,startY=event.clientY;let targetId=card.dataset.id;
      const move=pointer=>{card.style.setProperty('--dx',`${pointer.clientX-startX}px`);card.style.setProperty('--dy',`${pointer.clientY-startY}px`);const hit=document.elementFromPoint(pointer.clientX,pointer.clientY)?.closest('.note-card');document.querySelectorAll('.drop-target').forEach(item=>item.classList.remove('drop-target'));if(hit&&hit!==card){targetId=hit.dataset.id;hit.classList.add('drop-target');}};
      const finish=pointer=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',finish);handle.removeEventListener('pointercancel',finish);if(handle.hasPointerCapture(pointer.pointerId))handle.releasePointerCapture(pointer.pointerId);card.classList.remove('dragging');card.style.removeProperty('--dx');card.style.removeProperty('--dy');document.querySelectorAll('.drop-target').forEach(item=>item.classList.remove('drop-target'));state.dragging=false;if(pointer.type!=='pointercancel')void moveCard(card.dataset.id,targetId);};
      handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);
    });
  });
}
