import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {join,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,randomUUID} from 'node:crypto';
import {GoogleIdentity} from './identity.mjs';
import {NotcardsStore,isAllowedExtensionRedirect} from './store.mjs';
import {VideoImportService} from './video-import.mjs';
import {NotcardsCardChatService} from './card-chat.mjs';
import {Gateway} from '../clay-notes/core.mjs';
import {NotcardsVideoSummary,summaryRuntimeFromEnv} from './video-summary.mjs';

const root=dirname(fileURLToPath(import.meta.url));
const web=join(root,'..','clay-notes','web');
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml'};
const problem=(status,message,code)=>Object.assign(new Error(message),{status,...(code?{code}:{})});
const tokenFrom=req=>req.headers.authorization?.match(/^Bearer ([A-Za-z0-9_-]{32,256})$/)?.[1]||null;
const random=()=>randomBytes(32).toString('base64url');
const safeNext=value=>value==='/'||/^\/#note=[A-Za-z0-9_-]{11}$/.test(value||'')?value:'/';

async function readBody(req,limit=1_000_000){
  if(!req.headers['content-type']?.toLowerCase().startsWith('application/json'))throw problem(415,'Expected a JSON request body');
  if(Number(req.headers['content-length'])>limit)throw problem(413,'Request is too large');
  let size=0;const chunks=[];
  for await(const chunk of req){size+=chunk.length;if(size>limit)throw problem(413,'Request is too large');chunks.push(chunk);}
  try{const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!value||Array.isArray(value)||typeof value!=='object')throw new Error();return value;}catch{throw problem(400,'Request JSON is invalid');}
}

const EXTENSION_ID=/^[a-p]{32}$/;

export async function startNotcardsServer({directory=process.env.NOTCARDS_DATA_DIR||'./notcards-data',host=process.env.NOTCARDS_HOST||'127.0.0.1',port=Number(process.env.NOTCARDS_PORT||8080),publicOrigin=process.env.NOTCARDS_PUBLIC_ORIGIN,extensionId=process.env.NOTCARDS_EXTENSION_ID,storeExtensionId=process.env.NOTCARDS_STORE_EXTENSION_ID,extensionZip=process.env.NOTCARDS_EXTENSION_ZIP||null,identity=null,store=null,videoImporter,onVideoReady,botanicConnector=null,summaryConfig=null}={}){
  const extensionIds=[...new Set([extensionId,storeExtensionId].filter(Boolean))];
  if(extensionIds.some(id=>!EXTENSION_ID.test(id)))throw new Error('Configured Notcards extension IDs must be exact Chromium IDs');
  const ownsPersistence=!store;
  const persistence=store||await new NotcardsStore({directory,extensionIds,videoImporter:videoImporter ?? new VideoImportService({enabled:Boolean(publicOrigin)}),onVideoReady}).init();
  const requestedSummary=summaryConfig||summaryRuntimeFromEnv();
  const safeMax=Number.isFinite(requestedSummary.maxAccountSpendUsd)&&requestedSummary.maxAccountSpendUsd>0&&requestedSummary.maxAccountSpendUsd<=1?requestedSummary.maxAccountSpendUsd:1;
  const safeService=Number.isFinite(requestedSummary.maxServiceSpendUsd)&&requestedSummary.maxServiceSpendUsd>0&&requestedSummary.maxServiceSpendUsd<=1?requestedSummary.maxServiceSpendUsd:1;
  const safeReservation=Number.isFinite(requestedSummary.maxCallReservationUsd)&&requestedSummary.maxCallReservationUsd>0&&requestedSummary.maxCallReservationUsd<=Math.min(safeMax,safeService)?requestedSummary.maxCallReservationUsd:Math.min(0.05,safeMax,safeService);
  const models=[];
  if(requestedSummary.activation?.summaryLaneTestPassed===true||requestedSummary.activation?.laneTestPassed===true)models.push('clay-notes-summary');
  if(requestedSummary.activation?.deepLaneTestPassed===true)models.push('clay-notes-deep');
  const summaryGateway=requestedSummary.gateway||new Gateway({url:requestedSummary.url||'http://127.0.0.1:4000/v1',key:requestedSummary.key||undefined,models});
  const summaryActivation=requestedSummary.configurationValid===true?requestedSummary.activation:{};
  const videoSummary=new NotcardsVideoSummary({store:persistence,gateway:summaryGateway,activation:summaryActivation,maxAccountSpendUsd:safeMax,maxServiceSpendUsd:safeService,maxCallReservationUsd:safeReservation,rates:requestedSummary.configurationValid===true?requestedSummary.rates:undefined});
  const priorVideoReady=persistence.onVideoReady;
  persistence.onVideoReady=async({userId,noteId,...rest})=>{if(priorVideoReady)await priorVideoReady({userId,noteId,...rest});if(videoSummary.status().available)return videoSummary.enqueueAuto(userId,noteId);};
  const cardChat=botanicConnector?new NotcardsCardChatService({db:persistence.db,connector:botanicConnector,
    resolveVerifiedOwner:async principal=>principal?.id?persistence.db.prepare('SELECT issuer,subject FROM users WHERE id=?').get(principal.id):null,
    loadCardContext:async({owner,cardId})=>{
      const identityRow=persistence.db.prepare('SELECT id FROM users WHERE issuer=? AND subject=?').get(owner.issuer,owner.subject);
      if(!identityRow)throw problem(404,'Notebook not found');
      const account=await persistence.account(identityRow.id),note=await account.notebook.get(cardId);
      if(!note)throw problem(404,'Notebook not found');
      return {
        title:String(note.title||'').slice(0,500),url:typeof note.url==='string'?note.url:null,
        sourceType:String(note.sourceType||'video').slice(0,40),
        transcript:Array.isArray(note.segments)?note.segments.map(segment=>({start:segment.start,text:segment.text})):[],
        personalNotes:typeof note.personalNotes==='string'?note.personalNotes:'',
        overview:String(note.revisions?.at(-1)?.overview||'').slice(0,20_000),
        sourceLinks:Array.isArray(note.sourceLinks)?note.sourceLinks.map(link=>typeof link==='string'?link:link?.url).filter(link=>typeof link==='string'&&link.length<=2000).slice(0,20):[]
      };
    }}):null;
  if(publicOrigin){const configured=new URL(publicOrigin);if(configured.pathname!=='/'||configured.search||configured.hash||configured.username||configured.password||(configured.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(configured.hostname)))throw new Error('NOTCARDS_PUBLIC_ORIGIN must be an HTTPS origin outside loopback development');}
  const extensionOrigins=extensionIds.map(id=>`chrome-extension://${id}`);
  let origin,identityService;
  const server=http.createServer(async(req,res)=>{
    const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));};
    try{
      const requestOrigin=req.headers.origin;
      const reqUrl=new URL(req.url,origin);
      if(req.headers.host!==new URL(origin).host)throw problem(403,'Unknown Notcards host');
      const extensionRequest=extensionOrigins.includes(requestOrigin);
      if(extensionRequest){res.setHeader('Access-Control-Allow-Origin',requestOrigin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','authorization, content-type, idempotency-key');res.setHeader('Access-Control-Allow-Methods','GET, POST, PATCH, OPTIONS');}
      if(req.method==='OPTIONS'&&extensionRequest){res.writeHead(204);return res.end();}
      res.setHeader('X-Content-Type-Options','nosniff');
      res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
      res.setHeader('X-Frame-Options','DENY');
      res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' https://i.ytimg.com data:; connect-src 'self'; frame-src https://www.youtube-nocookie.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
      res.setHeader('Cache-Control','no-store');
      const cookieValue=name=>req.headers.cookie?.split(';').map(item=>item.trim()).find(item=>item.startsWith(`${name}=`))?.slice(name.length+1)||null;
      const clearCookie=(name,path='/')=>`${name}=; HttpOnly; SameSite=Lax; Path=${path}; Max-Age=0${new URL(origin).protocol==='https:'?'; Secure':''}`;
      const setCookie=(name,value,path='/',age=1_209_600)=>`${name}=${value}; HttpOnly; SameSite=Lax; Path=${path}; Max-Age=${age}${new URL(origin).protocol==='https:'?'; Secure':''}`;
      const resolveUser=()=>{
        // Explicit extension credentials identify the owner of a queued capture.
        // An ambient website cookie can belong to a different signed-in account.
        if(req.headers.authorization){
          const bearer=tokenFrom(req),grant=bearer&&persistence.grant(bearer);
          return grant?{...grant,auth:'bearer',raw:bearer}:null;
        }
        if(extensionRequest)return null;
        const raw=cookieValue('notcards_session');
        if(raw){const session=persistence.sessionCookie(raw);if(session)return {...session,auth:'cookie',raw};}
        return null;
      };
      const requireOrigin=({allowExtension=false}={})=>{
        if(requestOrigin===origin)return;
        if(allowExtension&&extensionRequest)return;
        throw problem(403,'Request origin is not allowed');
      };
      if(reqUrl.pathname==='/health'&&req.method==='GET')return json(200,{ok:true,tool:'notcards'});
      if(reqUrl.pathname==='/auth/google'&&req.method==='GET'){
        const cookieState=random(),next=safeNext(reqUrl.searchParams.get('next'));
        const begun=await identityService.begin({cookieState,context:{type:'web',next}});
        res.writeHead(302,{Location:begun.authorizationUrl,'Set-Cookie':[setCookie('notcards_oauth_state',cookieState,'/auth/google/callback',600)]});return res.end();
      }
      if(reqUrl.pathname==='/auth/google/callback'&&req.method==='GET'){
        const state=reqUrl.searchParams.get('state'),code=reqUrl.searchParams.get('code'),cookieState=cookieValue('notcards_oauth_state');
        const result=await identityService.complete({state,code,cookieState});
        const user=persistence.user(result.user),session=persistence.issueSession(user.id);
        const cookies=[setCookie('notcards_session',session.token),clearCookie('notcards_oauth_state','/auth/google/callback')];
        if(result.context?.type==='extension'){
          const issued=persistence.issueExtensionCode({...result.context,userId:user.id});
          const redirect=new URL(issued.redirectUri);redirect.searchParams.set('code',issued.code);redirect.searchParams.set('state',issued.state);
          res.writeHead(302,{Location:redirect.href,'Set-Cookie':cookies});return res.end();
        }
        res.writeHead(302,{Location:safeNext(result.context?.next),'Set-Cookie':cookies});return res.end();
      }
      if(reqUrl.pathname==='/auth/extension/authorize'&&req.method==='GET'){
        const challenge=reqUrl.searchParams.get('challenge'),state=reqUrl.searchParams.get('state'),redirectUri=reqUrl.searchParams.get('redirectUri');
        if(!isAllowedExtensionRedirect(redirectUri,extensionIds))throw problem(400,'Extension redirect is not allowed');
        if(!/^[A-Za-z0-9_-]{43}$/.test(challenge||'')||typeof state!=='string'||state.length<16||state.length>256)throw problem(400,'Extension authorization request is invalid');
        const raw=cookieValue('notcards_session'),session=raw&&persistence.sessionCookie(raw);const current=session?{...session,auth:'cookie',raw}:null;
        if(current){const issued=persistence.issueExtensionCode({userId:current.user.id,challenge,redirectUri,state});const callback=new URL(redirectUri);callback.searchParams.set('code',issued.code);callback.searchParams.set('state',state);res.writeHead(302,{Location:callback.href});return res.end();}
        const cookieState=random(),context={type:'extension',challenge,redirectUri,state};
        const begun=await identityService.begin({cookieState,context});
        res.writeHead(302,{Location:begun.authorizationUrl,'Set-Cookie':setCookie('notcards_oauth_state',cookieState,'/auth/google/callback',600)});return res.end();
      }
      if(reqUrl.pathname==='/auth/extension/token'&&req.method==='POST'){
        requireOrigin({allowExtension:true});
        const grant=persistence.exchangeExtensionCode(await readBody(req));
        return json(200,{...grant,expiresAt:new Date(grant.expiresAt).toISOString()});
      }
      if(reqUrl.pathname==='/auth/extension/revoke'&&req.method==='POST'){
        requireOrigin({allowExtension:true});const grant=resolveUser();if(!grant||grant.auth!=='bearer')throw problem(401,'Extension access expired. Sign in again.','extension_authorization_expired');
        persistence.revokeGrant?.(grant.raw);return json(200,{ok:true});
      }
      if(reqUrl.pathname==='/auth/logout'&&req.method==='POST'){
        requireOrigin();const raw=cookieValue('notcards_session');if(raw)persistence.revokeSession(raw);res.setHeader('Set-Cookie',clearCookie('notcards_session'));return json(200,{ok:true});
      }
      if(reqUrl.pathname==='/downloads/notcards-dev.zip'&&req.method==='GET'){
        if(!extensionZip)throw problem(404,'The Notcards development extension is not available yet');
        let data;try{data=await readFile(extensionZip);}catch(error){if(error.code==='ENOENT')throw problem(404,'The Notcards development extension is not available yet');throw error;}
        res.writeHead(200,{'Content-Type':'application/zip','Content-Length':data.length,'Content-Disposition':'attachment; filename="notcards-dev.zip"','Cache-Control':'no-cache, must-revalidate'});return res.end(data);
      }
      if(reqUrl.pathname.startsWith('/api/')){
        if(requestOrigin&&!extensionRequest&&requestOrigin!==origin)throw problem(403,'Request origin is not allowed');
        if(reqUrl.pathname==='/api/session'&&req.method==='GET'){
          const current=resolveUser();return json(200,current?{authenticated:true,user:current.user,cacheScope:current.user.id,googleConfigured:Boolean(identityService.configured)}:{authenticated:false,user:null,cacheScope:null,googleConfigured:Boolean(identityService.configured)});
        }
        const current=resolveUser();if(!current)return json(401,{code:'sign_in_required',error:'Sign in to your Notcards account to continue.'});
        const cardChatMatch=/^\/api\/notes\/([A-Za-z0-9_-]{11})\/chat(?:\/(reset))?$/.exec(reqUrl.pathname);
        if(cardChatMatch&&current.auth!=='cookie')throw problem(403,'Card chat requires your signed-in Notcards web session.','chat_cookie_required');
        if(current.auth==='bearer'&&!['/api/session','/api/capture'].includes(reqUrl.pathname))throw problem(403,'Extension access is limited to saving videos and checking the signed-in account.');
        if(reqUrl.pathname==='/api/composer'&&current.auth!=='cookie')throw problem(403,'Composer drafts require a signed-in web session.');
        if(req.method!=='GET')requireOrigin({allowExtension:current.auth==='bearer'});
        const account=await persistence.account(current.user.id),path=reqUrl.pathname;
        if(path==='/api/config'&&req.method==='GET')return json(200,{gatewayConfigured:videoSummary.status().available,models:videoSummary.status().models,defaultModel:videoSummary.status().defaultModel,generationAvailable:videoSummary.status().available,queueSize:videoSummary.jobs.size,summary:videoSummary.status(),chatConfigured:Boolean(cardChat?.capabilities().available),cardChat:cardChat?.capabilities()||{available:false,lazyFirstQuestion:true,ownerScopedBindings:true,idempotentRequests:false,deletionConfirmation:false,canonicalConversationUrl:false,rawPromptPersistence:false}});
        if(cardChatMatch){
          if(!cardChat)throw problem(503,'Botanic chat connector is not configured.','chat_not_configured');
          const [,noteId,reset]=cardChatMatch;
          if(!reset&&req.method==='GET'){const opened=await cardChat.openCard({principal:current.user,cardId:noteId});return json(200,{...opened,conversationUrl:opened.conversationUrl||null});}
          if(!reset&&req.method==='POST'){
            const body=await readBody(req,10_000),requestId=req.headers['idempotency-key']||body.requestId;
            const sent=await cardChat.sendQuestion({principal:current.user,cardId:noteId,requestId,question:body.question});
            if(sent.state==='bound'){
              const opened=await cardChat.openCard({principal:current.user,cardId:noteId});
              return json(200,{...sent,conversationUrl:opened.conversationUrl||null,canAsk:opened.canAsk,canReset:opened.canReset,remoteStatus:opened.remoteStatus});
            }
            return json(200,{...sent,conversationUrl:null,canAsk:false,canReset:false});
          }
          if(reset&&req.method==='POST'){
            const body=await readBody(req,10_000),result=await cardChat.resetAfterRemoteDeletion({principal:current.user,cardId:noteId,expectedConversationId:body.expectedConversationId});
            return json(200,{...result,canAsk:cardChat.capabilities().available,canReset:false,conversationUrl:null});
          }
          throw problem(405,'Method not allowed');
        }
        if(path==='/api/folders'&&req.method==='GET')return json(200,await persistence.folders(current.user.id));
        if(path==='/api/folders'&&req.method==='POST'){const folder=await persistence.createFolder(current.user.id,(await readBody(req)).name);return json(201,folder);}
        const folderMatch=/^\/api\/folders\/([a-f0-9-]{36})$/i.exec(path);
        if(folderMatch&&req.method==='PATCH')return json(200,await persistence.renameFolder(current.user.id,folderMatch[1],(await readBody(req)).name));
        if(path==='/api/order'&&req.method==='PATCH')return json(200,{ids:await persistence.reorder(current.user.id,(await readBody(req)).ids)});
        const media=/^\/api\/notes\/([A-Za-z0-9_-]{11})\/images(?:\/([a-f0-9-]{36}))?$/i.exec(path);
        if(media){const [,id,imageId]=media;const note=await account.notebook.get(id);if(!note)throw problem(404,'Notebook not found');if(!imageId&&req.method==='POST')return json(201,await persistence.addImage(current.user.id,id,await readBody(req,2_850_000)));if(imageId&&req.method==='GET'){const image=await account.notebook.image(id,imageId);if(!image)throw problem(404,'Image not found');res.writeHead(200,{'Content-Type':image.mime,'Content-Length':image.data.length,'Cache-Control':'private, no-store'});return res.end(image.data);}throw problem(405,'Method not allowed');}
        if(path==='/api/notes'&&req.method==='GET')return json(200,await persistence.listNotes(current.user.id));
        if(path==='/api/composer'&&req.method==='POST')return json(201,await persistence.compose(current.user.id,await readBody(req,100_000)));
        if(path==='/api/notes'&&req.method==='POST')return json(201,await persistence.createNote(current.user.id,await readBody(req)));
        if(path==='/api/capture'&&req.method==='POST'){
          if(current.auth!=='bearer')throw problem(403,'Extension capture requires extension authorization');
          const input=await readBody(req,1_000_000),note=await persistence.capture(current.user.id,input,req.headers['idempotency-key']);
          return json(201,{id:note.id,url:note.url,state:note.state,openUrl:`/#note=${note.id}`});
        }
        const match=/^\/api\/notes\/([A-Za-z0-9_-]{11})(?:\/(transcript|summarize|ask|video-import))?$/.exec(path);
        if(match){const [,id,action]=match,note=await account.notebook.get(id);if(!note)throw problem(404,'Notebook not found');
          if(!action&&req.method==='GET'){const opened=await persistence.ensureVideoImport(current.user.id,id);if(opened?.state==='awaiting_summary')void videoSummary.enqueueAuto(current.user.id,id).catch(()=>{});return json(200,opened);}
          if(action==='video-import'&&req.method==='POST')return json(200,await persistence.retryVideoImport(current.user.id,id));
          if(!action&&req.method==='PATCH')return json(200,await persistence.updateNote(current.user.id,id,await readBody(req)));
          if(req.method==='POST'&&action==='summarize'){
            const input=await readBody(req,10_000);const model=['smart','deep'].includes(input.model)?'deep':['cheap','summary',undefined].includes(input.model)?'summary':null;
            if(!model)throw problem(400,'summary_lane_invalid','Choose the summary or deep model.');
            const queued=await videoSummary.enqueue(current.user.id,id,{model,requestId:input.requestId||randomUUID()});
            return json(202,{id,state:queued.state,requestId:queued.requestId});
          }
          if(req.method==='POST'&&action==='ask')throw problem(503,'AI chat is not enabled for this account.','ai_setup_pending');
          if(req.method==='POST'&&action==='transcript'){
            const input=await readBody(req);const updated=await persistence.updateTranscript(current.user.id,id,input);return json(200,{id,state:updated.state});
          }
        }
        throw problem(404,'Notcards API route not found');
      }
      if(req.method!=='GET')throw problem(405,'Method not allowed');
      const path=reqUrl.pathname==='/'?'index.html':reqUrl.pathname.slice(1);
      if(!['index.html','app.mjs','i18n.mjs','session.mjs','collection.mjs','composer.mjs','composer-links.mjs','style.css','assets/Satoshi-LICENSE.txt'].includes(path)&&!/^assets\/satoshi-(400|500|700|900)\.woff2$/.test(path))throw problem(404,'Page not found');
      let data=await readFile(join(web,path));const extension=extname(path);
      if(path==='index.html')data=Buffer.from(data.toString('utf8').replace(/<dialog id="connect-dialog">[\s\S]*?<\/dialog>/,'') );
      res.setHeader('Content-Type',mime[extension]||'application/octet-stream');
      if(path==='index.html')res.setHeader('Cache-Control','no-store');else res.setHeader('Cache-Control',extension==='.woff2'?'public, max-age=31536000, immutable':extension==='.mjs'||extension==='.css'?'no-cache, must-revalidate':'public, max-age=3600');
      return res.end(data);
    }catch(error){
      if(res.headersSent)return res.end();
      const status=error.status|| (error.code==='ENOENT'?404:500);
      if(req.url?.startsWith('/api/')||req.url?.startsWith('/auth/'))return json(status,{code:error.code||'notcards_error',error:status===500?'Notcards could not complete that request.':error.message});
      const message=String(error.message||'Sign-in unavailable').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      res.writeHead(status,{'Content-Type':'text/html; charset=utf-8'});return res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Notcards sign in</title><body><main><h1>Notcards</h1><p>${message}</p><p><a href="/">Back to your collection</a></p></main></body></html>`);
    }
  });
  server.requestTimeout=30_000;server.headersTimeout=10_000;server.keepAliveTimeout=5_000;
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,resolve);});
  const address=server.address();
  origin=publicOrigin?new URL(publicOrigin).origin:`http://127.0.0.1:${address.port}`;
  const url=new URL(origin);
  if(url.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new Error('NOTCARDS_PUBLIC_ORIGIN must use HTTPS outside loopback development');
  identityService=identity||new GoogleIdentity({publicOrigin:origin});
  return {server,url:origin,identity:identityService,store:persistence,cardChat,videoSummary,async close(){const closed=new Promise(resolve=>server.close(resolve));server.closeAllConnections();await closed;await videoSummary.close();if(ownsPersistence)await persistence.close?.();}};
}
