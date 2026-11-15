export async function requestJSON(fetcher,url,options={},retry=true){
  const response=await fetcher(url,{credentials:'same-origin',...options});
  const data=await response.json();
  if(response.status===401 && retry && !new Headers(options.headers).has('authorization') && (data.code==='web_session_expired'||!data.code)){
    const refreshed=await fetcher('/',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(10000)});
    if(refreshed.ok)return requestJSON(fetcher,url,options,false);
  }
  if(!response.ok)throw Object.assign(new Error(data.error || `Request failed (${response.status})`),{code:data.code,status:response.status});
  return data;
}
