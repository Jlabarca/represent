const form=document.getElementById('pair'),status=document.getElementById('status');
const msg=(name,fallback)=>chrome.i18n?.getMessage(name) || fallback;
document.documentElement.lang=chrome.i18n?.getUILanguage() || 'en';
document.documentElement.dir=chrome.i18n?.getMessage('@@bidi_dir') || 'ltr';
for(const element of document.querySelectorAll('[data-msg]'))element.textContent=msg(element.dataset.msg,element.textContent);
chrome.storage.local.get(['base','token']).then(value=>{document.getElementById('base').value=value.base || 'http://127.0.0.1:8876';document.getElementById('token').value=value.token || '';});
form.addEventListener('submit',async event=>{
  event.preventDefault();status.textContent=msg('saving','Working…');
  try{
    const url=new URL(document.getElementById('base').value);
    if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||url.pathname!=='/'||url.search||url.hash||url.username||url.password)throw new Error(msg('addressError','Use the local address shown by your service.'));
    const token=document.getElementById('token').value.trim();if(!/^[a-f0-9]{64}$/.test(token))throw new Error(msg('codeError','Paste the full pairing code.'));
    const response=await fetch(`${url.origin}/api/config`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw new Error(msg('pairingFailed','Pairing failed. Check the code and make sure the service is running.'));
    await chrome.storage.local.set({base:url.origin,token});status.textContent=msg('connected','Connected. Open a YouTube video and click Clay Notes.');
  }catch(error){status.textContent=error.message;}
});
