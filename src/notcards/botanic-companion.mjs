import {createHash} from 'node:crypto';

const fail=(status,code,message)=>Object.assign(new Error(message),{status,code});
const hash=value=>createHash('sha256').update(value).digest('base64url');
const clean=value=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,500);
const conversationPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const requestPattern=/^[A-Za-z0-9_-]{8,128}$/;

export function botanicCompanionCardId(userId,conversationId){
  return hash(`notcards:botanic-companion:v1\0${userId}\0${conversationId}`).slice(0,11);
}

export class BotanicCompanionService {
  constructor({store,launchIssuer,clock=()=>Date.now()}={}){
    if(!store?.db||typeof store.ensureBotanicCompanionNote!=='function'||!launchIssuer)throw new Error('Botanic companion service configuration is incomplete');
    this.store=store;this.db=store.db;this.launchIssuer=launchIssuer;this.clock=clock;
    this.db.exec(`CREATE TABLE IF NOT EXISTS notcards_botanic_companions (
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      conversation_id TEXT NOT NULL, card_id TEXT NOT NULL, title TEXT NOT NULL,
      state TEXT NOT NULL CHECK(state IN ('reserved','created')),
      launch_generation INTEGER NOT NULL DEFAULT 1, launch_request_id TEXT NOT NULL,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      PRIMARY KEY(owner_id,conversation_id), UNIQUE(owner_id,card_id)
    );
    CREATE TABLE IF NOT EXISTS notcards_botanic_companion_requests (
      owner_id TEXT NOT NULL, request_id TEXT NOT NULL, request_hash TEXT NOT NULL,
      conversation_id TEXT NOT NULL, created_at INTEGER NOT NULL,
      PRIMARY KEY(owner_id,request_id),
      FOREIGN KEY(owner_id,conversation_id) REFERENCES notcards_botanic_companions(owner_id,conversation_id) ON DELETE CASCADE
    );`);
  }

  reserve({userId,conversationId,title,requestId}={}){
    const normalizedTitle=clean(title);
    if(!conversationPattern.test(conversationId||''))throw fail(400,'invalid_conversation_id','Botanic conversation id is invalid.');
    if(!requestPattern.test(requestId||''))throw fail(400,'invalid_request_id','A stable companion request id is required.');
    if(!normalizedTitle)throw fail(400,'invalid_companion_title','A companion notebook title is required.');
    if(typeof userId!=='string'||!userId)throw fail(401,'sign_in_required','Sign in to Notcards to continue.');
    const requestHash=hash(`${conversationId}\0${normalizedTitle}`),now=this.clock();
    this.db.exec('BEGIN IMMEDIATE');
    try{
      const priorRequest=this.db.prepare('SELECT * FROM notcards_botanic_companion_requests WHERE owner_id=? AND request_id=?').get(userId,requestId);
      if(priorRequest&&(priorRequest.conversation_id!==conversationId||priorRequest.request_hash!==requestHash))throw fail(409,'companion_request_conflict','This request id was already used for different companion data.');
      let row=this.db.prepare('SELECT * FROM notcards_botanic_companions WHERE owner_id=? AND conversation_id=?').get(userId,conversationId);
      if(row){
        // A new idempotency key may accompany a renamed native conversation;
        // keep the original card title while preserving each request's payload binding.
        if(!priorRequest)this.db.prepare('INSERT INTO notcards_botanic_companion_requests VALUES(?,?,?,?,?)').run(userId,requestId,requestHash,conversationId,now);
      }else{
        const cardId=botanicCompanionCardId(userId,conversationId),launchRequestId=this.launchRequestId(userId,conversationId,1);
        this.db.prepare("INSERT INTO notcards_botanic_companions VALUES(?,?,?,?, 'reserved',1,?,?,?)").run(userId,conversationId,cardId,normalizedTitle,launchRequestId,now,now);
        this.db.prepare('INSERT INTO notcards_botanic_companion_requests VALUES(?,?,?,?,?)').run(userId,requestId,requestHash,conversationId,now);
        row=this.db.prepare('SELECT * FROM notcards_botanic_companions WHERE owner_id=? AND conversation_id=?').get(userId,conversationId);
      }
      this.db.exec('COMMIT');return row;
    }catch(error){try{this.db.exec('ROLLBACK');}catch{}throw error;}
  }

  launchRequestId(userId,conversationId,generation){
    return `companion_${hash(`${userId}\0${conversationId}`).slice(0,32)}_${generation}`;
  }

  rotateLaunch(row){
    this.db.exec('BEGIN IMMEDIATE');
    try{
      const current=this.db.prepare('SELECT * FROM notcards_botanic_companions WHERE owner_id=? AND conversation_id=?').get(row.owner_id,row.conversation_id);
      if(current.launch_request_id===row.launch_request_id){
        const generation=current.launch_generation+1,requestId=this.launchRequestId(current.owner_id,current.conversation_id,generation);
        this.db.prepare('UPDATE notcards_botanic_companions SET launch_generation=?,launch_request_id=?,updated_at=? WHERE owner_id=? AND conversation_id=?').run(generation,requestId,this.clock(),current.owner_id,current.conversation_id);
      }
      const latest=this.db.prepare('SELECT * FROM notcards_botanic_companions WHERE owner_id=? AND conversation_id=?').get(row.owner_id,row.conversation_id);
      this.db.exec('COMMIT');return latest;
    }catch(error){try{this.db.exec('ROLLBACK');}catch{}throw error;}
  }

  async create({principal,verifiedSubject,conversationId,title,requestId}={}){
    if(principal?.auth!=='botanic'||!principal.user?.id)throw fail(403,'botanic_auth_required','A verified Botanic server assertion is required.');
    const owner=this.db.prepare('SELECT issuer,subject FROM users WHERE id=?').get(principal.user.id);
    if(!owner||owner.issuer!=='https://accounts.google.com'||owner.subject!==verifiedSubject)throw fail(401,'sign_in_required','Sign in to Notcards to continue.');
    let row=this.reserve({userId:principal.user.id,conversationId,title,requestId});
    await this.store.ensureBotanicCompanionNote(principal.user.id,{cardId:row.card_id,conversationId:row.conversation_id,title:row.title});
    if(row.state!=='created'){
      this.db.prepare("UPDATE notcards_botanic_companions SET state='created',updated_at=? WHERE owner_id=? AND conversation_id=? AND state='reserved'").run(this.clock(),row.owner_id,row.conversation_id);
      row=this.db.prepare('SELECT * FROM notcards_botanic_companions WHERE owner_id=? AND conversation_id=?').get(row.owner_id,row.conversation_id);
    }
    const ownerHash=hash(`${owner.issuer}\0${owner.subject}`),now=Math.floor(this.clock()/1000);
    const prior=this.db.prepare('SELECT expires_at FROM notcards_botanic_launches WHERE owner_hash=? AND request_hash=?').get(ownerHash,hash(row.launch_request_id));
    if(prior&&prior.expires_at<=now)row=this.rotateLaunch(row);
    let result;
    for(let attempt=0;attempt<3;attempt++){
      try{result=await this.launchIssuer.issue({principal:{user:{id:principal.user.id},auth:'botanic'},cardId:row.card_id,requestId:row.launch_request_id,question:'Notebook companion'});break;}
      catch(error){if(!['launch_request_expired','launch_request_conflict'].includes(error.code)||attempt===2)throw error;row=this.rotateLaunch(row);}
    }
    return {cardId:row.card_id,launch:{ticket:result.ticket,question:result.question,context:result.context,botanicOrigin:result.botanicOrigin}};
  }
}
