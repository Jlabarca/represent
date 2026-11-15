(()=>{
  let previous=location.href;
  function mount(){
    const url=new URL(location.href);
    const video=url.pathname==='/watch'?url.searchParams.get('v'):null;
    const existing=document.getElementById('represent-clay-notes');
    if(!video){existing?.remove();return;}
    const target=document.querySelector('#top-level-buttons-computed') || document.querySelector('#actions ytd-menu-renderer');
    if(!target || existing)return;
    const button=document.createElement('button');button.id='represent-clay-notes';button.type='button';button.className='represent-clay-button';
    button.textContent='✦ Clay Notes';button.title='Save this video and automatically summarize its transcript';
    button.addEventListener('click',async()=>{
      button.disabled=true;button.textContent='Saving…';
      try{const result=await chrome.runtime.sendMessage({type:'clay.capture'});if(!result?.ok)throw new Error(result?.error || 'Capture failed');button.textContent=result.needsTranscript?'✓ Saved · add transcript':'✓ Saved';button.title=result.message;if(result.needsTranscript)showMessage(result.message);}
      catch(error){button.textContent='↻ Try Clay Notes';button.title=error.message;showMessage(error.message);}
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
