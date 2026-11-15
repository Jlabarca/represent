import http from 'node:http';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes, timingSafeEqual} from 'node:crypto';
import {homedir} from 'node:os';
import {NotebookStore, Gateway} from './core.mjs';

const web = join(dirname(fileURLToPath(import.meta.url)), 'web');
const mime = {'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
const same = (a,b) => typeof a === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a),Buffer.from(b));
const problem = (status,message) => Object.assign(new Error(message),{status});
export const defaultDirectory = () => join(process.env.LOCALAPPDATA || join(homedir(),'.local','share'),'Represent','clay-notes');

async function body(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw problem(415,'Expected JSON');
  let size=0; const chunks=[];
  for await (const chunk of req) { size+=chunk.length; if(size>1_000_000) throw problem(413,'Request exceeds size limit'); chunks.push(chunk); }
  try { const value=JSON.parse(Buffer.concat(chunks).toString('utf8')); if(!value || Array.isArray(value) || typeof value!=='object') throw new Error(); return value; }
  catch { throw problem(400,'Invalid JSON object'); }
}

export async function startServer({directory = process.env.CLAY_NOTES_STORE || defaultDirectory(), port = Number(process.env.CLAY_NOTES_PORT || 8876), gateway = new Gateway({url:process.env.CLAY_NOTES_GHOST_URL, key:process.env.CLAY_NOTES_GHOST_KEY, models:(process.env.CLAY_NOTES_MODELS || 'cheap,smart,local').split(',').map(s=>s.trim()).filter(Boolean)})} = {}) {
  await mkdir(directory,{recursive:true});
  let token;
  try { token=JSON.parse(await readFile(join(directory,'pairing.json'),'utf8')).token; }
  catch(error) { if(error.code!=='ENOENT') throw error; token=randomBytes(32).toString('hex'); await writeFile(join(directory,'pairing.json'),JSON.stringify({token}),{mode:0o600,flag:'wx'}); }
  if(!/^[a-f0-9]{64}$/.test(token || '')) throw new Error('Invalid local pairing file');
  const session=randomBytes(32).toString('hex');
  const store=await new NotebookStore(directory,gateway).init(); await store.recover();
  const defaultModel=gateway.models.includes('cheap')?'cheap':gateway.models[0];
  if(!defaultModel)throw new Error('Enable at least one Clay Notes model');
  const queue=[]; const pending=new Set(); let draining=false, closing=false;
  async function drain() { if(draining) return; draining=true; try {while(queue.length){const job=queue.shift(); try{await store.summarize(job.id,job.model);}catch{/* Persisted error is shown in notebook. */}finally{pending.delete(job.id);}}}finally{draining=false;} }
  async function enqueue(id,model=defaultModel,capture) {
    if(closing) throw problem(503,'Service is closing');
    if(!gateway.models.includes(model)) throw problem(400,'This model is not enabled for Clay Notes');
    if(pending.has(id)) throw problem(409,'This notebook is already generating');
    if(pending.size>=8) throw problem(429,'Eight notebooks are already queued; try again shortly');
    // Reserve synchronously before any store await; competing captures cannot replace source data.
    pending.add(id);
    try {
      if(capture) await store.transcript(id,capture.transcript,capture.source);
      const note=await store.get(id); if(!note?.segments.length) throw problem(400,'Add a transcript first');
      await store.mutate(id,n=>{n.state='queued';n.error=null;});
      queue.push({id,model}); void drain();
    } catch(error) {pending.delete(id);throw error;}
  }
  let base;
  const server=http.createServer(async(req,res)=>{
    const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
    try {
      res.setHeader('Cache-Control','no-store'); res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Referrer-Policy','no-referrer');
      res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' https://i.ytimg.com data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
      if(req.headers.host!==new URL(base).host) throw problem(403,'Unrecognized local host');
      const url=new URL(req.url,base);
      if(url.pathname==='/health' && req.method==='GET') return json(200,{ok:true,tool:'clay-notes'});
      if(url.pathname.startsWith('/api/')) {
        const origin=req.headers.origin;
        if(origin && origin!==base && !/^chrome-extension:\/\/[a-p]{32}$/.test(origin)) throw problem(403,'Origin is not allowed');
        const bearer=req.headers.authorization?.replace(/^Bearer /,'');
        const cookie=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('clay_session='))?.slice(13);
        const webAuth=same(cookie,session);
        if(!same(bearer,token) && !webAuth) throw problem(401,'Pair Clay Notes in extension settings first');
        if(url.pathname==='/api/config' && req.method==='GET') {
          let models=[],modelError=null;
          try{models=await gateway.availableModels();}catch(error){modelError=error.message;}
          return json(200,{gatewayConfigured:Boolean(gateway.key),models,modelError,defaultModel,...(webAuth?{pairingToken:token}:{}),queueSize:pending.size});
        }
        if(url.pathname==='/api/notes') {
          if(req.method==='GET') {const notes=await store.list(); return json(200,notes.map(n=>({id:n.id,url:n.url,title:n.title,channel:n.channel,thumbnail:n.thumbnail,state:n.state,error:n.error,pinned:n.pinned,color:n.color,createdAt:n.createdAt,updatedAt:n.updatedAt,overview:n.revisions.at(-1)?.overview || '',statementCount:n.revisions.at(-1)?.statements.length || 0,revisionCount:n.revisions.length})));}
          if(req.method==='POST') return json(201,await store.create(await body(req)));
        }
        const match=/^\/api\/notes\/([A-Za-z0-9_-]{11})(?:\/(transcript|summarize|ask))?$/.exec(url.pathname);
        if(match) {
          const [,id,action]=match; const note=await store.get(id); if(!note) throw problem(404,'Notebook not found');
          if(!action && req.method==='GET') return json(200,note);
          if(!action && req.method==='PATCH') return json(200,await store.edit(id,await body(req)));
          if(req.method==='POST') {
            const input=await body(req);
            if(action==='transcript') {
              await enqueue(id,input.model,input); return json(202,{id,state:'queued'});
            }
            if(action==='summarize') {await enqueue(id,input.model);return json(202,{id,state:'queued'});}
            if(action==='ask') {
              if(pending.has(id)) throw problem(409,'Wait for the summary to finish first');
              // Share the same bounded queue accounting so concurrent chat cannot fan out unchecked.
              if(pending.size>=8) throw problem(429,'Queue is full');
              pending.add(id); try{return json(200,await store.ask(id,input.question,input.model || defaultModel));}finally{pending.delete(id);}
            }
          }
        }
        throw problem(404,'API route not found');
      }
      if(req.method!=='GET') throw problem(405,'Method not allowed');
      let path=url.pathname==='/'?'index.html':url.pathname.slice(1);
      if(!['index.html','app.mjs','i18n.mjs','style.css','assets/Satoshi-LICENSE.txt'].includes(path) && !/^assets\/satoshi-(400|500|700|900)\.woff2$/.test(path)) throw problem(404,'Page not found');
      const bytes=await readFile(join(web,path));
      if(path==='index.html') res.setHeader('Set-Cookie',`clay_session=${session}; HttpOnly; SameSite=Strict; Path=/`);
      const extension=path.slice(path.lastIndexOf('.')); res.writeHead(200,{'Content-Type':mime[extension] || 'application/octet-stream'});res.end(bytes);
    } catch(error) {if(!res.headersSent) json(error.status || (error.code==='ENOENT'?404:400),{error:error.message});else res.end();}
  });
  server.requestTimeout=120000; server.headersTimeout=15000;
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  base=`http://127.0.0.1:${server.address().port}`;
  return {server,url:base,store,token,pending,async close(){closing=true;await new Promise(resolve=>server.close(resolve));while(draining)await new Promise(resolve=>setTimeout(resolve,20));}};
}
