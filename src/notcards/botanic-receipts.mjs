import {createHash,createPublicKey,verify} from 'node:crypto';

const ownerHash = subject => createHash('sha256').update('https://accounts.google.com\0' + subject).digest('base64url');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reject = (status=401) => Object.assign(new Error('Botanic conversation receipt was rejected.'),{status,code:'invalid_botanic_receipt'});

export class BotanicReceipts {
  constructor(db, {publicKey, botanicOrigin, notcardsOrigin, clock=Date.now}) {
    this.db=db;
    this.key=publicKey?.type==='public'?publicKey:createPublicKey(publicKey);
    if(this.key.asymmetricKeyType!=='ed25519')throw new Error('Expected a Botanic Ed25519 public key');
    this.botanicOrigin=botanicOrigin;
    this.notcardsOrigin=notcardsOrigin;
    this.clock=clock;
    db.exec(`CREATE TABLE IF NOT EXISTS notcards_botanic_receipts (
      jti TEXT PRIMARY KEY, owner_hash TEXT NOT NULL, card_id TEXT NOT NULL,
      conversation_id TEXT NOT NULL UNIQUE, deleted INTEGER NOT NULL CHECK(deleted IN (0,1))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS notcards_one_active_chat
      ON notcards_botanic_receipts(owner_hash,card_id) WHERE deleted=0;`);
  }

  forCard(subject,cardId) {
    const active=this.db.prepare('SELECT conversation_id FROM notcards_botanic_receipts WHERE owner_hash=? AND card_id=? AND deleted=0').get(ownerHash(subject),cardId);
    return active?new URL('/c/'+active.conversation_id,this.botanicOrigin).href:null;
  }

  accept(assertion) {
    if(typeof assertion!=='string'||assertion.length>4096)throw reject();
    const parts=assertion.split('.');
    if(parts.length!==3||parts.some(p=>!p||!/^[A-Za-z0-9_-]+$/.test(p)))throw reject();
    if(!verify(null,Buffer.from(parts[0]+'.'+parts[1]),this.key,Buffer.from(parts[2],'base64url')))throw reject();
    let header,claim;
    try {
      [header,claim]=parts.slice(0,2).map(p=>JSON.parse(Buffer.from(p,'base64url').toString('utf8')));
    } catch { throw reject(); }
    const now=Math.floor(this.clock()/1000);
    if(header?.alg!=='EdDSA'||header.typ!=='JWT'||claim?.iss!==this.botanicOrigin||claim.aud!==this.notcardsOrigin||
       typeof claim.sub!=='string'||!claim.sub.length||claim.sub.length>255||!uuid.test(claim.jti)||!uuid.test(claim.conversation_id)||
       !/^[A-Za-z0-9_-]{11}$/.test(claim.card_id)||!Number.isInteger(claim.iat)||!Number.isInteger(claim.exp)||
       claim.iat>now+30||claim.exp<=now||claim.exp<=claim.iat||claim.exp-claim.iat>300||
       !['conversation_bound','conversation_deleted'].includes(claim.event))throw reject();
    const owner=ownerHash(claim.sub);
    const deleted=Number(claim.event==='conversation_deleted');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const prior=this.db.prepare('SELECT * FROM notcards_botanic_receipts WHERE jti=?').get(claim.jti);
      if(prior) {
        if(prior.owner_hash!==owner||prior.card_id!==claim.card_id||prior.conversation_id!==claim.conversation_id)throw reject(409);
        if(deleted)this.db.prepare('UPDATE notcards_botanic_receipts SET deleted=1 WHERE jti=?').run(claim.jti);
      } else {
        const issued=this.db.prepare('SELECT jti FROM notcards_botanic_launches WHERE jti=? AND card_id=? AND owner_hash=?').get(claim.jti,claim.card_id,owner);
        if(!issued)throw reject(409);
        const conflict=this.db.prepare('SELECT jti FROM notcards_botanic_receipts WHERE conversation_id=? OR (owner_hash=? AND card_id=? AND deleted=0 AND ?=0)').get(claim.conversation_id,owner,claim.card_id,deleted);
        if(conflict)throw reject(409);
        this.db.prepare('INSERT INTO notcards_botanic_receipts VALUES(?,?,?,?,?)').run(claim.jti,owner,claim.card_id,claim.conversation_id,deleted);
      }
      this.db.exec('COMMIT');
    } catch(error) { this.db.exec('ROLLBACK');throw error; }
  }
}
