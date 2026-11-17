import {createHash,createPublicKey,verify,sign,randomUUID} from 'node:crypto';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reject=(status=401)=>Object.assign(new Error('Botanic notebook assertion was rejected.'),{status,code:'invalid_botanic_assertion'});
const digest=bytes=>createHash('sha256').update(bytes).digest('base64url');
const exactOrigin=value=>{const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('Botanic origins must be exact HTTPS origins');return url.origin;};
export const botanicNotebookPathAllowed=(method,path)=>{
  if(method==='GET'&&path==='/api/session')return true;
  if(method==='GET'&&(path==='/api/notes'||path==='/api/notes?include=conversation'))return true;
  if(method==='POST'&&path==='/api/notes')return true;
  const match=/^\/api\/notes\/([A-Za-z0-9_-]{11})(\/images(?:\/[a-f0-9-]{36})?|\/botanic-launch)?$/i.exec(path);
  if(!match)return false;
  if(!match[2])return method==='GET'||method==='PATCH';
  if(match[2]?.startsWith('/images'))return method==='GET'||(method==='POST'&&match[2]==='/images');
  return match[2]==='/botanic-launch'&&['GET','POST'].includes(method);
};

export class BotanicNotebookAccess {
  constructor(db,{publicKey,botanicOrigin,notcardsOrigin,clock=Date.now}={}){
    this.db=db;this.key=publicKey?.type==='public'?publicKey:createPublicKey(publicKey);
    if(this.key.asymmetricKeyType!=='ed25519')throw new Error('Expected Botanic Ed25519 public key');
    this.issuer=exactOrigin(botanicOrigin);this.audience=exactOrigin(notcardsOrigin);this.clock=clock;
    db.exec('CREATE TABLE IF NOT EXISTS notcards_botanic_access_jti (jti TEXT PRIMARY KEY, expires_at INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS notcards_botanic_access_expiry ON notcards_botanic_access_jti(expires_at);');
  }
  verify(assertion,{method,path,body}){
    if(typeof assertion!=='string'||assertion.length>4096||!botanicNotebookPathAllowed(method,path)||!Buffer.isBuffer(body))throw reject();
    const parts=assertion.split('.');if(parts.length!==3||parts.some(part=>!part||!/^[A-Za-z0-9_-]+$/.test(part)))throw reject();
    let header,claim;try{header=JSON.parse(Buffer.from(parts[0],'base64url').toString());claim=JSON.parse(Buffer.from(parts[1],'base64url').toString());}catch{throw reject();}
    if(header?.alg!=='EdDSA'||header?.typ!=='botanic-notebook+jwt'||!verify(null,Buffer.from(`${parts[0]}.${parts[1]}`),this.key,Buffer.from(parts[2],'base64url')))throw reject();
    const now=Math.floor(this.clock()/1000);
    if(claim?.iss!==this.issuer||claim.aud!==this.audience||typeof claim.sub!=='string'||!claim.sub||claim.sub.length>255||!uuid.test(claim.jti)||!Number.isInteger(claim.iat)||!Number.isInteger(claim.exp)||claim.iat>now+5||claim.exp<=now||claim.exp<=claim.iat||claim.exp-claim.iat>60||claim.method!==method||claim.path!==path||claim.body_sha256!==digest(body))throw reject();
    this.db.exec('BEGIN IMMEDIATE');try{this.db.prepare('DELETE FROM notcards_botanic_access_jti WHERE expires_at<?').run(now);if(this.db.prepare('SELECT 1 FROM notcards_botanic_access_jti WHERE jti=?').get(claim.jti))throw reject(409);this.db.prepare('INSERT INTO notcards_botanic_access_jti VALUES(?,?)').run(claim.jti,claim.exp);this.db.exec('COMMIT');}catch(error){try{this.db.exec('ROLLBACK');}catch{}throw error;}
    return {subject:claim.sub};
  }
}

export function signBotanicNotebookAssertion({privateKey,issuer,audience,subject,method,path,body=Buffer.alloc(0),now=Math.floor(Date.now()/1000),jti=randomUUID()}){
  const header=Buffer.from(JSON.stringify({alg:'EdDSA',typ:'botanic-notebook+jwt'})).toString('base64url');
  const claims=Buffer.from(JSON.stringify({iss:issuer,aud:audience,sub:subject,iat:now,exp:now+60,jti,method,path,body_sha256:digest(body)})).toString('base64url');
  const input=`${header}.${claims}`;return `${input}.${sign(null,Buffer.from(input),privateKey).toString('base64url')}`;
}
