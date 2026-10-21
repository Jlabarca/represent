import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomBytes,timingSafeEqual} from 'node:crypto';
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
export async function serve(visu,{port=8871,webRoot}={}) {
  const token=randomBytes(32).toString('hex');
  const auth=req=>{const a=Buffer.from(req.headers.authorization||''),b=Buffer.from(`Bearer ${token}`);return a.length===b.length&&timingSafeEqual(a,b);};
  const server=http.createServer(async(req,res)=>{
    const json=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
    try {
      if(req.headers.host!==`127.0.0.1:${port}`&&req.headers.host!==`localhost:${port}`) return json(403,{error:'Local Host required'});
      if(req.headers.origin && ![`http://127.0.0.1:${port}`,`http://localhost:${port}`].includes(req.headers.origin)) return json(403,{error:'Same-origin requests only'});
      const url=new URL(req.url,`http://127.0.0.1:${port}`),p=url.pathname;
      res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
      res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'");
      if(!p.startsWith('/api/')) {
        if(req.method!=='GET') return json(405,{error:'GET required'});
        const files={'/':'index.html','/index.html':'index.html','/app.mjs':'app.mjs','/style.css':'style.css'};
        if(!files[p]) return json(404,{error:'Not found'});
        let content=await fs.readFile(path.join(webRoot,files[p]),'utf8');
        if(files[p]==='index.html') content=content.replace('<!--VISU_CONFIG-->',`<script>window.VISU_TOKEN=${JSON.stringify(token)};</script>`);
        res.writeHead(200,{'Content-Type':types[path.extname(files[p])],'Cache-Control':'no-store'});return res.end(content);
      }
      if(!auth(req)) return json(401,{error:'Local session token required'});
      if(p==='/api/projects'&&req.method==='GET') return json(200,await visu.list());
      if(/^\/api\/assets\/[a-f0-9]{64}$/.test(p)&&req.method==='GET') {
        const bytes=await fs.readFile(path.join(visu.store,'assets',p.split('/').at(-1)));
        res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'private,max-age=31536000,immutable'});return res.end(bytes);
      }
      const match=/^\/api\/projects\/([a-z0-9-]+)(?:\/(scan|analyze|generate|style|export))?$/.exec(p);
      if(!match) return json(404,{error:'Not found'});
      const [,id,action]=match;
      if(req.method==='GET'&&!action) return json(200,await visu.bundle(id));
      if(req.method==='GET'&&action==='export') {
        return json(200,await visu.export(id));
      }
      if(req.method!=='POST'||!action||action==='export') return json(405,{error:'Unsupported method'});
      if(!req.headers['content-type']?.startsWith('application/json')) return json(415,{error:'JSON required'});
      let body='';for await(const chunk of req){body+=chunk;if(body.length>8192)throw new Error('Request body too large');}
      const data=body?JSON.parse(body):{};
      return json(200,action==='scan'?await visu.scan(id):action==='analyze'?await visu.analyze(id):action==='style'?await visu.style(id,data.profile):await visu.generate(id));
    } catch(e) { json(e.code==='ENOENT'?404:400,{error:e.message}); }
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  return server;
}
