import {createHash,createPrivateKey,randomUUID,sign} from 'node:crypto';

export const BOTANIC_LAUNCH_MAX_QUESTION=4000;
export const BOTANIC_LAUNCH_MAX_CONTEXT_BYTES=128*1024;
const fail=(status,code,message)=>Object.assign(new Error(message),{status,code});
export function canonical(value){
  if(value===null)return 'null';
  if(typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
  if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
  if(typeof value!=='object')throw new TypeError('Context must contain only JSON values');
  if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}
const sha=value=>createHash('sha256').update(value).digest('base64url');
function exactOrigin(value,name){
  let parsed;try{parsed=new URL(value);}catch{throw new Error(`${name} must be an exact HTTPS origin`);}
  if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.pathname!=='/'||parsed.search||parsed.hash)throw new Error(`${name} must be an exact HTTPS origin`);
  return parsed.origin;
}
export function botanicLaunchConfig(env=process.env){
  const pem=env.NOTCARDS_BOTANIC_LAUNCH_PRIVATE_KEY;
  const botanicOrigin=env.NOTCARDS_BOTANIC_ORIGIN;
  const notcardsOrigin=env.NOTCARDS_PUBLIC_ORIGIN;
  if(!pem||!botanicOrigin||!notcardsOrigin)return null;
  try{const privateKey=createPrivateKey(pem.replace(/\\n/g,'\n'));if(privateKey.asymmetricKeyType!=='ed25519')return null;return {privateKey,issuer:exactOrigin(notcardsOrigin,'NOTCARDS_PUBLIC_ORIGIN'),audience:exactOrigin(botanicOrigin,'NOTCARDS_BOTANIC_ORIGIN'),botanicOrigin:exactOrigin(botanicOrigin,'NOTCARDS_BOTANIC_ORIGIN')};}
  catch{return null;}
}

/** Issues short-lived, payload-bound Botanic tickets without persisting prompt/context. */
export class BotanicLaunchIssuer{
  constructor({db,privateKey,issuer,audience,botanicOrigin,resolveVerifiedOwner,loadCardContext,clock=()=>Date.now()}={}){
    if(!db||!privateKey||!issuer||!audience||!botanicOrigin||typeof resolveVerifiedOwner!=='function'||typeof loadCardContext!=='function')throw new Error('Botanic launch issuer configuration is incomplete');
    this.db=db;this.privateKey=privateKey;this.issuer=exactOrigin(issuer,'issuer');this.audience=exactOrigin(audience,'audience');this.botanicOrigin=exactOrigin(botanicOrigin,'Botanic origin');this.resolveVerifiedOwner=resolveVerifiedOwner;this.loadCardContext=loadCardContext;this.clock=clock;
    db.exec(`CREATE TABLE IF NOT EXISTS notcards_botanic_launches (
      owner_hash TEXT NOT NULL, request_hash TEXT NOT NULL, card_id TEXT NOT NULL,
      jti TEXT NOT NULL UNIQUE, payload_hash TEXT NOT NULL, issued_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL, state TEXT NOT NULL CHECK(state IN ('issued','expired')),
      PRIMARY KEY(owner_hash,request_hash)
    ); CREATE INDEX IF NOT EXISTS notcards_botanic_launch_expiry ON notcards_botanic_launches(expires_at);`);
  }
  _ticket({sub,cardId,jti,issuedAt,expiresAt,payloadHash}){
    const header=Buffer.from(JSON.stringify({alg:'EdDSA',typ:'JWT'})).toString('base64url');
    const claims=Buffer.from(JSON.stringify({iss:this.issuer,aud:this.audience,sub,card_id:cardId,jti,iat:issuedAt,exp:expiresAt,payload_sha256:payloadHash})).toString('base64url');
    const input=`${header}.${claims}`,signature=sign(null,Buffer.from(input),this.privateKey).toString('base64url');
    return `${input}.${signature}`;
  }
  async issue({principal,cardId,requestId,question}={}){
    if(!principal||principal.auth!=='cookie')throw fail(403,'cookie_session_required','Botanic launch requires your signed-in Notcards browser session.');
    if(!/^[A-Za-z0-9_-]{11}$/.test(cardId||''))throw fail(400,'invalid_card_id','Notebook id is invalid.');
    if(typeof requestId!=='string'||!/^[A-Za-z0-9_-]{8,128}$/.test(requestId))throw fail(400,'invalid_request_id','Request id is invalid.');
    if(typeof question!=='string'||!question.trim()||question.length>BOTANIC_LAUNCH_MAX_QUESTION)throw fail(400,'invalid_question','Enter a question of at most 4,000 characters.');
    let owner;try{owner=await this.resolveVerifiedOwner(principal.user);}catch{throw fail(401,'notcards_auth_required','Sign in to Notcards to continue.');}
    if(!owner||typeof owner.issuer!=='string'||typeof owner.subject!=='string'||!owner.subject)throw fail(401,'notcards_auth_required','Sign in to Notcards to continue.');
    const ownerHash=sha(`${owner.issuer}\0${owner.subject}`),requestHash=sha(requestId),account=await this.loadCardContext({owner,cardId});
    if(!account)throw fail(404,'notebook_not_found','Notebook not found.');
    const context=account.context??account;
    let contextJson;try{contextJson=canonical(context);}catch{throw fail(500,'card_context_invalid','Notebook context could not be prepared.');}
    if(Buffer.byteLength(contextJson)>BOTANIC_LAUNCH_MAX_CONTEXT_BYTES)throw fail(413,'card_context_too_large','Notebook context exceeds the Botanic launch limit.');
    const cleanQuestion=question.trim(),payloadHash=sha(canonical({cardId,question:cleanQuestion,context}));
    const now=Math.floor(this.clock()/1000),expiresAt=now+300;
    this.db.exec('BEGIN IMMEDIATE');
    try{
      this.db.prepare("DELETE FROM notcards_botanic_launches WHERE expires_at<?").run(now);
      const prior=this.db.prepare('SELECT * FROM notcards_botanic_launches WHERE owner_hash=? AND request_hash=?').get(ownerHash,requestHash);
      let row;
      if(prior){
        if(prior.card_id!==cardId||prior.payload_hash!==payloadHash)throw fail(409,'launch_request_conflict','This request id was already used for different content.');
        if(prior.expires_at<=now)throw fail(409,'launch_request_expired','Create a new Botanic launch to continue.');
        row=prior;
      }else{
        const jti=randomUUID();row={jti,issued_at:now,expires_at:expiresAt};
        this.db.prepare("INSERT INTO notcards_botanic_launches(owner_hash,request_hash,card_id,jti,payload_hash,issued_at,expires_at,state) VALUES(?,?,?,?,?,?,?,'issued')").run(ownerHash,requestHash,cardId,jti,payloadHash,now,expiresAt);
      }
      this.db.exec('COMMIT');
      return {ticket:this._ticket({sub:owner.subject,cardId,jti:row.jti,issuedAt:row.issued_at,expiresAt:row.expires_at,payloadHash}),question:cleanQuestion,context,botanicOrigin:this.botanicOrigin};
    }catch(error){try{this.db.exec('ROLLBACK');}catch{}throw error;}
  }
}
