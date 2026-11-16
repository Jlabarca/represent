import {DatabaseSync} from 'node:sqlite';
import {createHash, randomBytes, randomUUID} from 'node:crypto';
import {mkdir, chmod, readFile, writeFile, unlink, readdir, stat} from 'node:fs/promises';
import {join} from 'node:path';
import {NotebookStore, videoIdentity, replaceFile} from '../clay-notes/core.mjs';

const hashHex = value => createHash('sha256').update(value).digest('hex');
const hashChallenge = value => createHash('sha256').update(value).digest('base64url');
const opaque = (bytes = 32) => randomBytes(bytes).toString('base64url');
const USER_ID = /^[0-9a-f-]{36}$/i;
const EXTENSION_ID = /^[a-p]{32}$/;
const clean = (value, limit = 300) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, limit);
const problem = (status, message, code) => Object.assign(new Error(message), {status, ...(code ? {code} : {})});
const TRANSCRIPT_STORAGE_RESERVE = 320 * 1024;

export function isAllowedExtensionRedirect(value, extensionId = process.env.NOTCARDS_EXTENSION_ID) {
  if (!EXTENSION_ID.test(extensionId || '')) return false;
  return value === `https://${extensionId}.chromiumapp.org/auth`;
}

export class NotcardsStore {
  constructor({directory = process.env.NOTCARDS_DATA_DIR || './notcards-data', gateway = undefined, clock = () => Date.now(), extensionId = process.env.NOTCARDS_EXTENSION_ID, maxNotes = 2500, maxBytes = 512 * 1024 * 1024} = {}) {
    this.directory = directory;
    this.clock = clock;
    this.accounts = new Map();
    this.idempotentLocks = new Map();
    this.db = null;
    this.gateway = gateway;
    this.extensionId=extensionId;
    this.maxNotes=maxNotes;
    this.maxBytes=maxBytes;
  }

  async init() {
    await mkdir(join(this.directory, 'accounts'), {recursive:true});
    this.db = new DatabaseSync(join(this.directory, 'notcards.sqlite'));
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, issuer TEXT NOT NULL, subject TEXT NOT NULL, email TEXT NOT NULL, display_name TEXT NOT NULL, created_at INTEGER NOT NULL, UNIQUE(issuer, subject));
      CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
      CREATE TABLE IF NOT EXISTS extension_codes (code_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, challenge TEXT NOT NULL, redirect_uri TEXT NOT NULL, state TEXT NOT NULL, expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS extension_grants (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL, revoked_at INTEGER);
      CREATE INDEX IF NOT EXISTS grants_user ON extension_grants(user_id);
      CREATE TABLE IF NOT EXISTS idempotency (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, request_key TEXT NOT NULL, payload_hash TEXT NOT NULL, note_id TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(user_id, request_key));
    `);
    await chmod(join(this.directory, 'notcards.sqlite'), 0o600).catch(() => {});
    return this;
  }

  user(identity) {
    const existing = this.db.prepare('SELECT id, issuer, subject, email, display_name AS displayName FROM users WHERE issuer=? AND subject=?').get(identity.issuer, identity.subject);
    if (existing) {
      this.db.prepare('UPDATE users SET email=?,display_name=? WHERE id=?').run(identity.email, identity.displayName, existing.id);
      return {...existing,email:identity.email,displayName:identity.displayName};
    }
    const user = {id:randomUUID(),...identity};
    this.db.prepare('INSERT INTO users(id,issuer,subject,email,display_name,created_at) VALUES(?,?,?,?,?,?)').run(user.id,user.issuer,user.subject,user.email,user.displayName,this.clock());
    return user;
  }

  issueSession(userId) {
    const token = opaque();
    const expiresAt = this.clock() + 14 * 24 * 60 * 60_000;
    this.db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').run(hashHex(token),userId,expiresAt);
    return {token,expiresAt};
  }

  session(token) {
    if (!token || token.length > 256) return null;
    const session = this.db.prepare(`SELECT u.id,u.email,u.display_name AS displayName,s.expires_at AS expiresAt
      FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?`).get(hashHex(token),this.clock());
    return session ? {user:{id:session.id,email:session.email,displayName:session.displayName},expiresAt:session.expiresAt} : null;
  }

  revokeSession(token) {
    if (!token) return;
    const hash = hashHex(token);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const row = this.db.prepare('SELECT user_id FROM sessions WHERE token_hash=?').get(hash);
      if (row) {
        this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash);
        this.db.prepare('UPDATE extension_grants SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL').run(this.clock(),row.user_id);
        this.db.prepare('DELETE FROM extension_codes WHERE user_id=?').run(row.user_id);
      }
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }

  revokeGrant(token) { if(token)this.db.prepare('UPDATE extension_grants SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL').run(this.clock(),hashHex(token)); }

  sessionCookie(token) { return this.session(token); }

  issueExtensionCode({userId,challenge,redirectUri,state}) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(challenge || '') || typeof state !== 'string' || state.length < 16 || state.length > 256) throw problem(400,'Extension authorization request is invalid');
    if (!isAllowedExtensionRedirect(redirectUri,this.extensionId)) throw problem(400,'Extension redirect is not allowed');
    const code = opaque(32), expiresAt=this.clock()+5*60_000;
    this.db.prepare('INSERT INTO extension_codes(code_hash,user_id,challenge,redirect_uri,state,expires_at) VALUES(?,?,?,?,?,?)').run(hashHex(code),userId,challenge,redirectUri,state,expiresAt);
    return {code,state,redirectUri,expiresAt};
  }

  exchangeExtensionCode({code,verifier,redirectUri}) {
    if (typeof code !== 'string' || code.length > 256 || typeof verifier !== 'string' || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier) || !isAllowedExtensionRedirect(redirectUri,this.extensionId)) throw problem(400,'Extension token request is invalid');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const row=this.db.prepare('SELECT * FROM extension_codes WHERE code_hash=?').get(hashHex(code));
      if (!row || row.expires_at<=this.clock() || row.redirect_uri!==redirectUri || row.challenge!==hashChallenge(verifier)) throw problem(401,'Extension authorization expired. Sign in and try again.','extension_authorization_expired');
      this.db.prepare('DELETE FROM extension_codes WHERE code_hash=?').run(hashHex(code));
      const token=opaque(),expiresAt=this.clock()+12*60*60_000;
      this.db.prepare('INSERT INTO extension_grants(token_hash,user_id,expires_at,revoked_at) VALUES(?,?,?,NULL)').run(hashHex(token),row.user_id,expiresAt);
      const user=this.db.prepare('SELECT id,email,display_name AS displayName FROM users WHERE id=?').get(row.user_id);
      this.db.exec('COMMIT');
      return {accessToken:token,tokenType:'Bearer',expiresAt,user:{id:user.id,email:user.email,displayName:user.displayName}};
    } catch(error) { this.db.exec('ROLLBACK'); throw error; }
  }

  grant(token) {
    if (!token || token.length > 256) return null;
    const row=this.db.prepare(`SELECT u.id,u.email,u.display_name AS displayName,g.expires_at AS expiresAt
      FROM extension_grants g JOIN users u ON u.id=g.user_id WHERE g.token_hash=? AND g.revoked_at IS NULL AND g.expires_at>?`).get(hashHex(token),this.clock());
    return row?{user:{id:row.id,email:row.email,displayName:row.displayName},expiresAt:row.expiresAt}:null;
  }

  async account(userId) {
    if (!USER_ID.test(userId || '') || !this.db.prepare('SELECT 1 FROM users WHERE id=?').get(userId)) throw problem(401,'Sign in to Notcards to continue.','sign_in_required');
    let account=this.accounts.get(userId);
    if (account) return account.initializing?account.initializing:account;
    account={userId,initializing:(async()=>{
      const directory=join(this.directory,'accounts',userId);
      await mkdir(directory,{recursive:true});
      const notebook=new NotebookStore(join(directory,'notes'),this.gateway);
      await notebook.init();
      let folders=[];
      try {
        const saved=JSON.parse(await readFile(join(directory,'folders.json'),'utf8'));
        if (!Array.isArray(saved) || saved.length>200 || saved.some(item=>!item || typeof item.id!=='string' || typeof item.name!=='string')) throw new Error('Saved folder list is invalid');
        folders=saved;
      } catch(error) { if(error.code!=='ENOENT')throw error; }
      return {userId,directory,notebook,folders,folderLocks:Promise.resolve(),writeLock:Promise.resolve()};
    })()};
    this.accounts.set(userId,account);
    try{const ready=await account.initializing;this.accounts.set(userId,ready);return ready;}
    catch(error){this.accounts.delete(userId);throw error;}
  }

  async saveFolders(account) {
    const target=join(account.directory,'folders.json'),temporary=`${target}.${randomUUID()}.tmp`;
    try { await writeFile(temporary,JSON.stringify(account.folders),{mode:0o600});await replaceFile(temporary,target); }
    finally { await unlink(temporary).catch(()=>{}); }
  }

  async folders(userId) {
    const account=await this.account(userId),notes=await account.notebook.list();
    return account.folders.map(folder=>({...folder,count:notes.filter(note=>note.folderId===folder.id).length}));
  }

  async createFolder(userId, name) {
    const account=await this.account(userId),normalized=clean(name,80);
    if (!normalized) throw problem(400,'Folder name is required');
    return this.withAccountWrite(account,()=>this.folderMutation(account,async()=>{
      if(account.folders.length>=200)throw problem(409,'This account already has 200 folders');
      if (account.folders.some(folder=>folder.name.toLowerCase()===normalized.toLowerCase())) throw problem(409,'A folder with that name already exists');
      const folder={id:randomUUID(),name:normalized,createdAt:new Date(this.clock()).toISOString()};
      await this.assertCapacity(account,{additionalBytes:Buffer.byteLength(JSON.stringify(folder))+512});
      account.folders.push(folder);try{await this.saveFolders(account);}catch(error){account.folders.pop();throw error;}return {...folder,count:0};
    }));
  }

  async renameFolder(userId,id,name) {
    const account=await this.account(userId),folder=account.folders.find(item=>item.id===id),normalized=clean(name,80);
    if (!normalized) throw problem(400,'Folder name is required');
    return this.withAccountWrite(account,()=>this.folderMutation(account,async()=>{
      if (!folder) throw problem(404,'Folder not found');
      if (account.folders.some(item=>item.id!==id&&item.name.toLowerCase()===normalized.toLowerCase())) throw problem(409,'A folder with that name already exists');
      await this.assertCapacity(account,{additionalBytes:512});
      const previous=folder.name;folder.name=normalized;
      try{await this.saveFolders(account);}catch(error){folder.name=previous;throw error;}
      return folder;
    }));
  }

  async folderMutation(account,task){const previous=account.folderLocks;let release;account.folderLocks=new Promise(resolve=>{release=resolve;});await previous;try{return await task();}finally{release();}}

  async withAccountWrite(account,task){const previous=account.writeLock;let release;account.writeLock=new Promise(resolve=>{release=resolve;});await previous;try{return await task();}finally{release();}}

  async assertCapacity(account,{newNote=false,additionalBytes=0}={}){
    const entries=await readdir(account.notebook.directory,{withFileTypes:true});
    const noteFiles=entries.filter(entry=>entry.isFile()&&/^[A-Za-z0-9_-]{11}\.json$/.test(entry.name));
    if(newNote&&noteFiles.length>=this.maxNotes)throw problem(409,`This account has reached its ${this.maxNotes.toLocaleString('en-US')} notebook limit`);
    let bytes=additionalBytes;
    for(const entry of entries){const path=join(account.notebook.directory,entry.name);if(entry.isFile())bytes+=(await stat(path)).size;else if(entry.isDirectory()&&entry.name==='images')for(const notebookId of await readdir(path)){const folder=join(path,notebookId);for(const image of await readdir(folder)){const imagePath=join(folder,image);bytes+=(await stat(imagePath)).size;}}}
    try{bytes+=(await stat(join(account.directory,'folders.json'))).size;}catch(error){if(error.code!=='ENOENT')throw error;}
    if(bytes>this.maxBytes)throw problem(409,`This account has reached its ${Math.round(this.maxBytes/1024/1024)} MiB storage limit`);
  }

  async createNote(userId,input) {
    const account=await this.account(userId);
    return this.withAccountWrite(account,async()=>{
      if (input.folderId != null && !account.folders.some(folder=>folder.id===input.folderId)) throw problem(400,'Choose a folder in your account');
      const content=input.content ?? input.transcript ?? input.text;
      const writeReserve=typeof content==='string'&&content.trim()?TRANSCRIPT_STORAGE_RESERVE:2048;
      let note,video=null;
      if (typeof input.url==='string' && input.url.trim()) {
        try { video=videoIdentity(input.url); } catch { video=null; }
        if(video){await this.assertCapacity(account,{newNote:!(await account.notebook.get(video.id)),additionalBytes:Buffer.byteLength(JSON.stringify(input))+writeReserve});note=await account.notebook.create({url:video.url,title:input.title,channel:input.channel});}
        else{await this.assertCapacity(account,{newNote:true,additionalBytes:Buffer.byteLength(JSON.stringify(input))+writeReserve});note=await this.createResearchNote(account,input);}
      } else{await this.assertCapacity(account,{newNote:true,additionalBytes:Buffer.byteLength(JSON.stringify(input))+writeReserve});note=await this.createResearchNote(account,input);}
      if (input.folderId != null && note.folderId!==input.folderId) note=await account.notebook.mutate(note.id,n=>{n.folderId=input.folderId;});
      if (typeof content==='string' && content.trim()) note=await account.notebook.transcript(note.id,content,input.source || 'pasted text');
      return note;
    });
  }

  async createResearchNote(account,input) {
    const title=clean(input.title,500)||'Untitled research';
    const raw=typeof input.url==='string'&&input.url.trim()?input.url.trim():null;
    let sourceUrl=null;
    if (raw) {
      let parsed;try{parsed=new URL(raw);}catch{throw problem(400,'Use a valid source URL');}
      if (!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password||parsed.port)throw problem(400,'Use a public web address without credentials or a custom port');
      sourceUrl=parsed.href;
    }
    let id;do{id=randomBytes(9).toString('base64url').slice(0,11);}while(await account.notebook.get(id));
    const now=new Date(this.clock()).toISOString();
    const defaultSourceType=sourceUrl?'web':'text';
    const note=await account.notebook.put({id,url:sourceUrl,title,channel:clean(input.channel || input.sourceLabel,160),thumbnail:null,createdAt:now,updatedAt:now,state:'awaiting_transcript',error:null,segments:[],revisions:[],conversations:[],personalNotes:'',pinned:false,color:'cream',finish:null,transcriptSource:null,sourceType:clean(input.sourceType || defaultSourceType,40),folderId:input.folderId ?? null});
    return note;
  }

  async capture(userId,input,idempotencyKey) {
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey || '')) throw problem(400,'Capture idempotency key is required');
    let identity;try{identity=videoIdentity(input.url);}catch(error){throw problem(400,error.message);}
    if (typeof input.transcript!=='string' || input.transcript.length>800_000) throw problem(400,'Video captions are missing or too large');
    const normalized={...input,url:identity.url};
    const payloadHash=hashHex(JSON.stringify(normalized));
    const lockKey=`${userId}:${idempotencyKey}`;
    const previous=this.idempotentLocks.get(lockKey)||Promise.resolve();
    const next=previous.catch(()=>{}).then(async()=>{
      const account=await this.account(userId);
      return this.withAccountWrite(account,async()=>{
        const saved=this.db.prepare('SELECT payload_hash,note_id FROM idempotency WHERE user_id=? AND request_key=?').get(userId,idempotencyKey);
        if(saved){if(saved.payload_hash!==payloadHash)throw problem(409,'This capture key was already used for different video data');const note=await account.notebook.get(saved.note_id);if(note)return note;}
        const writeReserve=input.transcript.trim()?TRANSCRIPT_STORAGE_RESERVE:2048;
        await this.assertCapacity(account,{newNote:!(await account.notebook.get(identity.id)),additionalBytes:Buffer.byteLength(JSON.stringify(normalized))+writeReserve});
        this.db.prepare('DELETE FROM idempotency WHERE user_id=? AND created_at<?').run(userId,this.clock()-30*24*60*60_000);
        if(this.db.prepare('SELECT COUNT(*) AS count FROM idempotency WHERE user_id=?').get(userId).count>=5000)throw problem(429,'This account has reached its recent capture retry limit');
        let note=await account.notebook.create({url:identity.url,title:input.title,channel:input.channel});
        if(input.transcript.trim())note=await account.notebook.transcript(note.id,input.transcript,input.source||'youtube-captions');
        this.db.prepare('INSERT OR REPLACE INTO idempotency(user_id,request_key,payload_hash,note_id,created_at) VALUES(?,?,?,?,?)').run(userId,idempotencyKey,payloadHash,note.id,this.clock());
        return note;
      });
    });
    this.idempotentLocks.set(lockKey,next);
    try{return await next;}finally{if(this.idempotentLocks.get(lockKey)===next)this.idempotentLocks.delete(lockKey);}
  }

  async listNotes(userId) {
    const account=await this.account(userId),notes=await account.notebook.list();
    return notes.map(note=>({id:note.id,url:note.url,title:note.title,channel:note.channel,sourceType:note.sourceType||'video',transcriptAvailable:Boolean(note.segments?.length),transcriptSource:note.transcriptSource||null,thumbnail:note.thumbnail,cover:note.images?.find(image=>image.id===note.coverImage)?.url||note.thumbnail||null,imageCount:note.images?.length||0,state:note.state,error:note.error,pinned:note.pinned,color:note.color,finish:note.finish??null,folderId:note.folderId??null,createdAt:note.createdAt,updatedAt:note.updatedAt,overview:note.revisions?.at(-1)?.overview||'',statementCount:note.revisions?.at(-1)?.statements?.length||0,revisionCount:note.revisions?.length||0}));
  }

  async addImage(userId,id,input){const account=await this.account(userId);return this.withAccountWrite(account,async()=>{await this.assertCapacity(account,{additionalBytes:Math.ceil(String(input.dataUrl||'').length*0.75)+2048});return account.notebook.addImage(id,input);});}

  async updateNote(userId,id,input){
    const account=await this.account(userId);
    return this.withAccountWrite(account,async()=>{
      if(input.folderId!=null&&!account.folders.some(folder=>folder.id===input.folderId))throw problem(400,'Choose a folder in your account');
      await this.assertCapacity(account,{additionalBytes:Buffer.byteLength(JSON.stringify(input))+1024});
      const current=await account.notebook.get(id);if(!current)throw problem(404,'Notebook not found');
      return account.notebook.mutate(id,n=>{
        if('folderId'in input)n.folderId=input.folderId;
        if('personalNotes'in input){if(typeof input.personalNotes!=='string'||input.personalNotes.length>50000)throw problem(400,'Personal notes exceed size limit');n.personalNotes=input.personalNotes;}
        if('pinned'in input)n.pinned=Boolean(input.pinned);
        if(['cream','mint','peach','lilac'].includes(input.color))n.color=input.color;
        if('finish'in input){if(!['prism','classic','spectrum'].includes(input.finish))throw problem(400,'Choose a supported card finish');n.finish=input.finish;}
        if('coverImage'in input){if(input.coverImage!==null&&!n.images?.some(image=>image.id===input.coverImage))throw problem(400,'Choose an image attached to this notebook');n.coverImage=input.coverImage;}
      });
    });
  }

  async updateTranscript(userId,id,input){const account=await this.account(userId);return this.withAccountWrite(account,async()=>{const note=await account.notebook.get(id);if(!note)throw problem(404,'Notebook not found');const writeReserve=typeof input.transcript==='string'&&input.transcript.trim()?TRANSCRIPT_STORAGE_RESERVE:2048;await this.assertCapacity(account,{additionalBytes:Buffer.byteLength(JSON.stringify(input))+writeReserve});return account.notebook.transcript(id,input.transcript,input.source||'paste');});}

  async reorder(userId,ids){const account=await this.account(userId);return this.withAccountWrite(account,async()=>{await this.assertCapacity(account,{additionalBytes:Buffer.byteLength(JSON.stringify(ids))+512});return account.notebook.reorder(ids);});}

  async close() { this.db?.close(); }
}
