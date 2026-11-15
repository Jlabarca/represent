(()=>{
  const msg=(name,fallback)=>chrome.i18n?.getMessage(name) || fallback;
  let previous=location.href;
  function mount(){
    const url=new URL(location.href);
    const video=url.pathname==='/watch'?url.searchParams.get('v'):null;
    const existing=document.getElementById('represent-clay-notes');
    if(!video){existing?.remove();return;}
    const target=document.querySelector('#top-level-buttons-computed') || document.querySelector('#actions ytd-menu-renderer');
    if(!target || existing)return;
    const button=document.createElement('button');button.id='represent-clay-notes';button.type='button';button.className='represent-clay-button';
    button.textContent=msg('captureLabel','✦ Clay Notes');button.title=msg('saveVideo','Save a video');
    button.addEventListener('click',async()=>{
      button.disabled=true;button.textContent=msg('saving','Working…');
      try{const result=await chrome.runtime.sendMessage({type:'clay.capture'});if(!result?.ok)throw new Error(result?.error || msg('captureFailed','Needs attention'));button.textContent=`✓ ${msg('saved','Saved')}${result.needsTranscript?' · '+msg('needsTranscript','Needs transcript'):''}`;button.title=result.message;if(result.needsTranscript)showMessage(msg('noCaptions',result.message));}
      catch(error){button.textContent=`↻ ${msg('captureLabel','Clay Notes')}`;button.title=error.message;showMessage(error.message);}
      finally{button.disabled=false;}
    });
    target.append(button);
  }
  function showMessage(text){
    document.getElementById('represent-clay-message')?.remove();
    const toast=document.createElement('div');toast.id='represent-clay-message';toast.setAttribute('role','status');toast.textContent=text;document.body.append(toast);setTimeout(()=>toast.remove(),12000);
  }
  let scheduled=false;
  const schedule=()=>{if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;if(location.href!==previous){document.getElementById('represent-clay-notes')?.remove();previous=location.href;}mount();},350);};
  document.addEventListener('yt-navigate-finish',schedule);
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});mount();
})();
