const $=selector=>document.querySelector(selector);
const escape=value=>String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={notes:[],note:null,config:{models:[]},pinned:false,query:'',tab:'summary',revision:null,model:'cheap',evidence:null,drafts:new Map(),busy:false};
let toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('#toast').hidden=true;},5500);}
async function api(path,{method='GET',data}={}){
  const response=await fetch(`/api${path}`,{method,headers:data?{'Content-Type':'application/json'}:{},...(data?{body:JSON.stringify(data)}:{})});
  const body=await response.json();if(!response.ok)throw new Error(body.error || `Request failed (${response.status})`);return body;
}
const time=value=>{const n=Math.floor(Number(value)||0);return n>=3600?`${Math.floor(n/3600)}:${String(Math.floor(n/60)%60).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`:`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;};
const date=value=>new Date(value).toLocaleDateString(undefined,{month:'short',day:'numeric'});
const labels={awaiting_transcript:'Needs transcript',awaiting_summary:'Ready to summarize',queued:'In the queue',summarizing:'Finding the good parts…',ready:'Ready to read',error:'Needs attention'};
const status=note=>`<span class="status ${escape(note.state)}">${note.state==='ready'?'✦ ':''}${escape(labels[note.state] || note.state)}</span>`;
const isGenerating=note=>['queued','summarizing'].includes(note.state);
function modelOptions(){const models=state.config.models.length?state.config.models:[state.config.defaultModel || 'cheap'];return models.map(model=>`<option value="${escape(model)}" ${state.model===model?'selected':''}>${escape(model)}${!state.config.gatewayConfigured?' · setup needed':''}</option>`).join('');}
function setupBanner(){
  if(state.config.gatewayConfigured && !state.config.modelError)return '';
  return `<div class="setup-banner"><details><summary>${state.config.gatewayConfigured?'Gateway connection needs attention':'Your library is ready. Connect Ghost to turn on AI.'}</summary><p class="small">${escape(state.config.modelError || 'Set CLAY_NOTES_GHOST_KEY in the service’s launching shell to Clay Notes’ dedicated virtual key, then restart. The initial summary uses cheap; every redo or question is a new request. Gateway aliases may fall back to another model. Actual cost appears when the gateway reports it.')}</p><p class="small">Optional: CLAY_NOTES_GHOST_URL (default http://127.0.0.1:4000/v1), CLAY_NOTES_MODELS (default cheap,smart,local). Your key’s allow-list also applies.</p></details></div>`;
}
const garden=`<div class="garden" aria-hidden="true"><svg viewBox="0 0 480 230" fill="none"><defs><linearGradient id="paper" x1="200" y1="20" x2="270" y2="170" gradientUnits="userSpaceOnUse"><stop stop-color="#fffef4"/><stop offset="1" stop-color="#e6dfc9"/></linearGradient><linearGradient id="leaf" x1="340" y1="65" x2="350" y2="165" gradientUnits="userSpaceOnUse"><stop stop-color="#99b477"/><stop offset="1" stop-color="#54734a"/></linearGradient><radialGradient id="shadow"><stop stop-color="#5f7655" stop-opacity=".23"/><stop offset="1" stop-color="#5f7655" stop-opacity="0"/></radialGradient></defs><ellipse cx="250" cy="192" rx="155" ry="24" fill="url(#shadow)"/><g transform="rotate(-12 205 120)"><rect x="107" y="53" width="138" height="143" rx="19" fill="#b1c3a1"/><rect x="111" y="48" width="138" height="143" rx="19" fill="#c5d7b1" stroke="#fff" stroke-opacity=".5"/></g><g transform="rotate(9 250 110)"><rect x="187" y="37" width="141" height="151" rx="19" fill="#d5cbb1"/><rect x="184" y="31" width="141" height="151" rx="19" fill="url(#paper)" stroke="#fffef3"/><rect x="205" y="51" width="99" height="39" rx="10" fill="#dbe5c9"/><path d="m246 62 13 8-13 8V62Z" fill="#65814e"/><path d="M206 111h79M206 124h65M206 137h83M206 150h48" stroke="#a2ac90" stroke-width="4" stroke-linecap="round"/></g><path d="M355 185v-62" stroke="#71865a" stroke-width="5" stroke-linecap="round"/><path d="M353 148c-35-1-43-26-36-43 29 0 39 21 36 43Z" fill="url(#leaf)"/><path d="M356 128c32-8 37-32 25-47-26 6-32 27-25 47Z" fill="url(#leaf)"/><path d="M336 177h38l-5 23h-29l-4-23Z" fill="#bfae8c"/><path d="M111 92 101 86M121 71l-2-12M96 115l-13 2" stroke="#93a67b" stroke-width="3" stroke-linecap="round"/><circle cx="365" cy="49" r="5" fill="#d4dca5"/><path d="m343 62 3-6 3 6 6 3-6 3-3 6-3-6-6-3 6-3Z" fill="#8ba36c"/></svg><span class="garden-caption">Small notes. Room for big ideas.</span></div>`;

function renderLibrary(){
  state.note=null;
  $('#all-filter').classList.toggle('active',!state.pinned);$('#pin-filter').classList.toggle('active',state.pinned);
  $('#main').innerHTML=`<section class="library-intro"><div><span class="eyebrow">YOUR LITTLE CORNER OF CLARITY</span><h1>Less watching.<br>More <em>understanding.</em></h1><p class="lead">The good ideas from your videos, gathered in one place.<br>A quick takeaway now. A deeper notebook whenever.</p></div>${garden}</section>${setupBanner()}<section aria-labelledby="library-title"><div class="toolbar"><h2 id="library-title">${state.pinned?'Pinned notes':'Your collection'} <span class="count" id="note-count"></span></h2><label class="screen-reader" for="search">Search your notes</label><div class="search-wrap"><span aria-hidden="true">⌕</span><input type="search" id="search" placeholder="Find an idea, video, or channel…" value="${escape(state.query)}"></div></div><div id="cards"></div></section><footer class="library-footer"><span>Made for the things worth keeping.</span><span>Clay Notes · a Represent tool</span></footer>`;
  $('#search').addEventListener('input',event=>{state.query=event.target.value;renderCards();});renderCards();
}
function renderCards(){
  const query=state.query.toLowerCase();
  const notes=state.notes.filter(note=>(!state.pinned||note.pinned)&&`${note.title} ${note.channel} ${note.overview}`.toLowerCase().includes(query));
  $('#note-count').textContent=notes.length;
  if(!notes.length){
    $('#cards').innerHTML=state.notes.length?`<div class="empty"><div><h3>${state.pinned?'A place for your favorites.':'No notes found.'}</h3><p>${state.pinned?'Pin any video to keep it close.':'Try another title, channel, or idea.'}</p></div></div>`:`<div class="empty"><div><h3>Your next good idea<br>is already playing.</h3><p>Bring a video here and leave with its main statements and conclusions. No prompt to type. No notebook to set up.</p><button class="dark-button" data-action="add">Save your first video ↗</button></div><div class="empty-flow"><div class="flow-step"><span class="step-number">1</span><span>Find something interesting on YouTube.</span></div><div class="flow-step"><span class="step-number">2</span><span>Click <strong>✦ Clay Notes</strong> below the video.</span></div><div class="flow-step"><span class="step-number">3</span><span>Your notebook opens. The takeaway follows.</span></div><button class="quiet-button" data-action="connect">Connect the Chrome extension →</button></div></div>`;
    return;
  }
  $('#cards').innerHTML=`<div class="grid">${notes.map((note,i)=>`<article class="note-card ${['cream','mint','peach','lilac'].includes(note.color)?note.color:['cream','mint','peach','lilac'][i%4]}"><div class="card-top"><span class="video-tag"><span class="play-icon" aria-hidden="true">▶</span>${escape(note.channel || 'YouTube video')}</span><button class="pin" aria-label="${note.pinned?'Unpin':'Pin'} ${escape(note.title)}" aria-pressed="${note.pinned}" data-action="pin" data-id="${note.id}">${note.pinned?'◆':'◇'}</button></div><button class="card-title" data-action="open" data-id="${note.id}">${escape(note.title)}</button><p class="card-summary">${escape(note.overview || (note.state==='awaiting_transcript'?'Your video is safe here. Add its transcript to find the main statements and conclusions.':note.error || 'Finding the main statements and conclusions. You can open the notebook while it works.'))}</p>${status(note)}<div class="card-footer"><span>${note.statementCount?`${note.statementCount} main statements`:'A little clarity, on its way'}</span><span>${escape(date(note.createdAt))} <span aria-hidden="true">↗</span></span></div></article>`).join('')}</div>`;
}

function citations(sources,kind='summary',item='') {return (sources || []).map(index=>`<button class="citation" title="Read supporting transcript" aria-label="Read supporting segment ${index+1}" data-action="cite" data-source="${index}" data-kind="${kind}" data-item="${item}">[${index+1}]</button>`).join('');}
function renderNotebook(){
  const n=state.note;if(!n)return;
  const draft=state.drafts.get(n.id) ?? n.personalNotes;
  $('#main').innerHTML=`<button class="back" data-action="library">← Back to your collection</button>${setupBanner()}<header class="notebook-heading"><div><span class="eyebrow">A VIDEO, DISTILLED</span><h1>${escape(n.title)}</h1><div class="notebook-meta"><span>${escape(n.channel || 'YouTube')}</span><span>Saved ${escape(date(n.createdAt))}</span>${status(n)}</div></div><button class="pin" data-action="pin" data-id="${n.id}" aria-label="${n.pinned?'Unpin':'Pin'} notebook" aria-pressed="${n.pinned}">${n.pinned?'◆':'◇'}</button></header><div class="notebook-layout"><section class="paper" aria-label="Notebook content"><div class="tabs" role="tablist" aria-label="Notebook sections">${[['summary','The takeaway'],['questions','Ask a question'],['transcript','Transcript']].map(([id,label])=>`<button class="tab ${state.tab===id?'active':''}" role="tab" aria-selected="${state.tab===id}" data-action="tab" data-tab="${id}">${label}</button>`).join('')}</div><div id="notebook-content" role="tabpanel"></div></section><aside class="notebook-side"><div class="source-card"><img src="${n.thumbnail}" alt="Video thumbnail" loading="lazy"><div class="source-card-content"><p>${n.segments.length?`${n.segments.length} transcript segments · ${escape(n.transcriptSource || 'captured source')}`:'Waiting for your video transcript'}</p><a class="source-link" href="${n.url}" target="_blank" rel="noreferrer">Open original video ↗</a></div></div><form id="personal-form" class="notes-card"><h3>A thought of your own.</h3><p>Connections, questions, things to try.</p><label class="screen-reader" for="personal-notes">Your personal notes</label><textarea id="personal-notes" placeholder="Make a little space for your thoughts…" maxlength="50000">${escape(draft)}</textarea><button class="light-button">Save my notes</button><div class="color-picker" aria-label="Note color">${['cream','mint','peach','lilac'].map(color=>`<button type="button" class="${color}" aria-label="${color}" aria-pressed="${n.color===color}" data-action="color" data-color="${color}"></button>`).join('')}</div></form><div id="evidence"></div></aside></div>`;
  $('#personal-notes').addEventListener('input',event=>state.drafts.set(n.id,event.target.value));
  $('#personal-form').addEventListener('submit',async event=>{event.preventDefault();try{state.note=await api(`/notes/${n.id}`,{method:'PATCH',data:{personalNotes:$('#personal-notes').value}});state.drafts.delete(n.id);toast('Your thoughts are saved.');}catch(error){toast(error.message);}});
  renderNotebookContent();renderEvidence();
}
function transcriptForm(){return `<form id="transcript-form" class="transcript-form"><label for="transcript-input">Paste the video transcript</label><p class="small">On YouTube, expand the description and select “Show transcript”. Copy the text here. Timestamps are welcome. Maximum 160,000 characters.</p><textarea id="transcript-input" required placeholder="0:00 The first idea…&#10;1:24 The next idea…" maxlength="800000"></textarea><button class="dark-button" ${state.busy?'disabled':''}>Save transcript & summarize →</button></form>`;}
function bindTranscript(){ $('#transcript-form')?.addEventListener('submit',async event=>{event.preventDefault();const transcript=$('#transcript-input').value;const button=event.submitter;button.disabled=true;try{await api(`/notes/${state.note.id}/transcript`,{method:'POST',data:{transcript,source:'paste',model:state.model}});state.note=await api(`/notes/${state.note.id}`);state.tab='summary';renderNotebook();}catch(error){toast(error.message);button.disabled=false;}}); }
function renderNotebookContent(){
  const n=state.note, target=$('#notebook-content');
  if(state.tab==='transcript'){
    target.innerHTML=`<h2 class="section-title">The source, in its own words.</h2><p class="small">${n.segments.length?'Captured captions may contain transcription mistakes. Click a timestamp to watch the original.':'The notebook is saved. Add captions to start the summary.'}</p>${n.segments.length?`<details><summary class="small">Replace transcript</summary>${transcriptForm()}</details><div class="transcript-list">${n.segments.map(s=>`<div class="segment"><a href="${n.url}&t=${Math.floor(s.start)}s" target="_blank" rel="noreferrer">${time(s.start)} ↗</a><span>${escape(s.text)}</span></div>`).join('')}</div>`:transcriptForm()}`;bindTranscript();return;
  }
  if(state.tab==='questions'){
    target.innerHTML=`<h2 class="section-title">Pull on an interesting thread.</h2><p class="small">Ask about the captured transcript. Each question makes a new gateway request.</p><form id="ask-form" class="ask-form"><label class="screen-reader" for="question">Your question</label><textarea id="question" maxlength="4000" required placeholder="What evidence supports the main conclusion?" ${!n.segments.length?'disabled':''}></textarea><div class="form-actions"><select class="model-select" aria-label="Question model" id="question-model">${modelOptions()}</select><button class="dark-button" ${!n.segments.length||state.busy||isGenerating(n)?'disabled':''}>${state.busy?'Thinking…':'Ask this video →'}</button></div></form>${!n.segments.length?'<p class="small">Add a transcript first.</p>':''}${n.conversations.slice().reverse().map(q=>`<article class="conversation"><h3>${escape(q.question)}</h3><p>${escape(q.answer)} ${citations(q.sources,'question',q.id)}</p><span class="small">${escape(q.metrics.responseModel || q.metrics.requestedModel || 'Gateway model')}</span></article>`).join('')}`;
    $('#question-model').addEventListener('change',e=>{state.model=e.target.value;});
    $('#ask-form').addEventListener('submit',async event=>{event.preventDefault();const question=$('#question').value;state.busy=true;event.submitter.disabled=true;event.submitter.textContent='Thinking…';try{state.note=await api(`/notes/${n.id}/ask`,{method:'POST',data:{question,model:state.model}});}catch(error){toast(error.message);}finally{state.busy=false;renderNotebook();}});return;
  }
  const revision=n.revisions[state.revision ?? n.revisions.length-1];
  const controls=`<div class="summary-toolbar"><select id="revision" aria-label="Summary revision">${n.revisions.map((r,index)=>`<option value="${index}" ${r.id===revision?.id?'selected':''}>Version ${index+1} · ${escape(r.metrics.requestedModel || 'model')}</option>`).join('')}</select><div><select class="model-select" id="summary-model" aria-label="Regeneration model">${modelOptions()}</select><button class="quiet-button" data-action="redo" ${isGenerating(n)||!n.segments.length?'disabled':''}>${isGenerating(n)?'Working…':'↻ Redo'}</button></div></div>`;
  const error=n.error?`<div class="setup-banner"><div><strong>We kept your notebook.</strong><p class="error">${escape(n.error)}</p>${n.segments.length?'<button class="quiet-button" data-action="redo">Try summary again ↗</button>':''}</div></div>`:'';
  if(!revision){
    target.innerHTML=`${error}<div class="generation"><div class="orb" aria-hidden="true">✦</div><h2>${isGenerating(n)?'A little clarity is on its way.':'Your video has a home.'}</h2><p>${isGenerating(n)?'Finding the main statements and conclusions in the transcript. You can leave this page; the service keeps working.':'The Chrome extension will try to bring the captions here automatically. If YouTube keeps them tucked away, paste the transcript below.'}</p></div>${n.segments.length?controls:transcriptForm()}`;
    bindTranscript();$('#summary-model')?.addEventListener('change',e=>{state.model=e.target.value;});return;
  }
  const list=items=>`<ol class="claims">${items.map((item,index)=>`<li><span class="claim-number">${String(index+1).padStart(2,'0')}</span><div>${escape(item.text)} ${citations(item.sources)}</div></li>`).join('')}</ol>`;
  const metrics=revision.metrics;
  target.innerHTML=`${error}${controls}${isGenerating(n)?'<p class="small">A new version is on its way. Your current takeaway stays here.</p>':''}<p class="overview">${escape(revision.overview)}</p><h2 class="section-title"><span class="section-glyph" aria-hidden="true">≋</span>Main statements</h2>${list(revision.statements)}<section class="conclusion-box"><h2 class="section-title"><span aria-hidden="true">↗</span>What it comes down to</h2>${list(revision.conclusions)}</section><p class="revision-meta">AI summary of the speaker’s claims. Check the source before relying on it.<br>Requested ${escape(metrics.requestedModel || 'unknown')} · Served ${escape(metrics.responseModel || 'model not reported')} · ${metrics.costUsd===null||metrics.costUsd===undefined?'Cost not reported':`$${Number(metrics.costUsd).toFixed(5)}`} · ${Math.round((metrics.durationMs || 0)/1000)}s · ${escape(date(revision.createdAt))}</p>`;
  $('#revision').addEventListener('change',e=>{state.revision=Number(e.target.value);state.evidence=null;renderNotebookContent();renderEvidence();});$('#summary-model').addEventListener('change',e=>{state.model=e.target.value;});
}
function renderEvidence(){
  const target=$('#evidence');if(!target)return;
  const evidence=state.evidence;
  target.innerHTML=evidence?`<section class="evidence-box" aria-label="Supporting transcript"><button class="icon-button" data-action="close-evidence" aria-label="Close evidence">×</button><span class="eyebrow">IN THE TRANSCRIPT</span><blockquote>“${escape(evidence.text)}”</blockquote><a class="source-link" href="${state.note.url}&t=${Math.floor(evidence.start)}s" target="_blank" rel="noreferrer">Watch at ${time(evidence.start)} ↗</a></section>`:'';
}
async function refresh(){
  const id=new URLSearchParams(location.hash.slice(1)).get('note');
  if(id){if(!/^[A-Za-z0-9_-]{11}$/.test(id))throw new Error('Invalid notebook link');state.note=await api(`/notes/${id}`);renderNotebook();}
  else{state.notes=await api('/notes');renderLibrary();}
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
function openConnect(){if(!state.config.pairingToken){toast('Refresh the library to load your pairing code.');return;}$('#pairing-code').value=state.config.pairingToken;$('#connect-dialog').showModal();}
$('#connect').addEventListener('click',openConnect);
document.querySelectorAll('.close-dialog').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
$('#copy-code').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#pairing-code').value);toast('Pairing code copied. Paste it in extension settings.');}catch{$('#pairing-code').type='text';$('#pairing-code').select();toast('Select and copy the pairing code.');}});
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
try{state.config=await api('/config');state.model=state.config.models.includes(state.config.defaultModel)?state.config.defaultModel:state.config.models[0] || state.config.defaultModel || 'cheap';await refresh();}
catch(error){$('#main').innerHTML=`<div class="empty"><div><h1>A little pause.</h1><p>${escape(error.message)}</p><button class="dark-button" data-action="library">Return to library</button></div></div>`;}
setInterval(async()=>{
  if(document.hidden||state.busy)return;
  try{
    if(state.note){const updated=await api(`/notes/${state.note.id}`);if(updated.updatedAt!==state.note.updatedAt){state.note=updated;renderNotebook();}}
    else{const updated=await api('/notes');if(JSON.stringify(updated)!==JSON.stringify(state.notes)){state.notes=updated;if($('#cards'))renderCards();}}
  }catch{/* Preserve visible content through temporary disconnects. */}
},2500);
