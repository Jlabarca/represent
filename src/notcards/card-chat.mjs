import {createHash, randomUUID} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';

const CARD_ID=/^[A-Za-z0-9_-]{11}$/;
const CONVERSATION_ID=/^[A-Za-z0-9_-]{1,64}$/;
const REQUEST_ID=/^[A-Za-z0-9_-]{8,128}$/;
const MAX_QUESTION=4000;
const MAX_CONTEXT_BYTES=1_000_000;
const sha=value=>createHash('sha256').update(value).digest('hex');
const problem=(status,code,message)=>Object.assign(new Error(message),{status,code});

/**
 * `resolveVerifiedOwner` must resolve the authenticated server principal to the exact
 * validated OIDC issuer and subject. It must never derive identity from email or request
 * fields. `loadCardContext` must load the card and its allowed sources by that owner.
 *
 * Connector contract (injected by an approved integration):
 * - `capabilities: {available, idempotentRequests, deletionConfirmation}`
 * - `sendQuestion({owner,cardId,conversationId,requestId,idempotencyKey,question,context})`
 *   lazily creates a Botanic conversation only when conversationId is null, sends this
 *   first question, and returns `{conversationId}`. Replays of idempotencyKey must return
 *   the original operation/result without sending a duplicate turn.
 * - optional `confirmRemoteDeletion({owner,conversationId})` returns true only when the
 *   trusted connector has confirmed that exact owner's remote conversation is deleted.
 * - optional `conversationUrl({owner,conversationId})` returns the canonical HTTPS page
 *   for that owner's signed-in Botanic session; only a bound conversation exposes it.
 *
 * This module deliberately contains no Botanic HTTP routes or assumed transport.
 */
export class NotcardsCardChatService {
  constructor({database,db,connector=null,resolveVerifiedOwner,loadCardContext,clock=()=>Date.now(),leaseMs=30_000}={}) {
    if(!db&&!database)throw new Error('A durable SQLite database is required');
    if(typeof resolveVerifiedOwner!=='function')throw new Error('A verified owner resolver is required');
    if(typeof loadCardContext!=='function')throw new Error('A server-side card context loader is required');
    if(!Number.isInteger(leaseMs)||leaseMs<1000||leaseMs>300_000)throw new Error('Invalid card chat request lease');
    this.db=db??new DatabaseSync(database);
    this.ownsDb=!db;
    if(this.ownsDb&&database!==':memory:')mkdirSync(dirname(resolve(database)),{recursive:true});
    this.connector=connector;
    this.resolveVerifiedOwner=resolveVerifiedOwner;
    this.loadCardContext=loadCardContext;
    this.clock=clock;
    this.leaseMs=leaseMs;
    this.db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notcards_card_chat_bindings (
        owner_key TEXT NOT NULL,
        card_id TEXT NOT NULL,
        state TEXT NOT NULL CHECK(state IN ('empty','starting','bound','uncertain')),
        conversation_id TEXT,
        active_request_id TEXT,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY(owner_key,card_id),
        CHECK((state='bound' AND conversation_id IS NOT NULL) OR state<>'bound'),
        CHECK((state='empty' AND conversation_id IS NULL AND active_request_id IS NULL) OR state<>'empty')
      );
      CREATE UNIQUE INDEX IF NOT EXISTS notcards_card_chat_active_conversation
        ON notcards_card_chat_bindings(owner_key,conversation_id) WHERE conversation_id IS NOT NULL;
      CREATE TABLE IF NOT EXISTS notcards_card_chat_history (
        owner_key TEXT NOT NULL,
        card_id TEXT NOT NULL,
        conversation_id TEXT NOT NULL,
        state TEXT NOT NULL CHECK(state IN ('active','deleted')),
        created_at INTEGER NOT NULL,
        deleted_at INTEGER,
        PRIMARY KEY(owner_key,conversation_id)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS notcards_card_chat_one_active_per_card
        ON notcards_card_chat_history(owner_key,card_id) WHERE state='active';
      CREATE TABLE IF NOT EXISTS notcards_card_chat_requests (
        owner_key TEXT NOT NULL,
        card_id TEXT NOT NULL,
        request_id TEXT NOT NULL,
        payload_hash TEXT NOT NULL,
        state TEXT NOT NULL CHECK(state IN ('pending','completed','retryable','uncertain','remote_deleted')),
        conversation_id TEXT,
        lease_token TEXT,
        lease_until INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY(owner_key,card_id,request_id)
      );
      CREATE INDEX IF NOT EXISTS notcards_card_chat_requests_by_conversation
        ON notcards_card_chat_requests(owner_key,card_id,conversation_id);
    `);
  }

  capabilities() {
    const advertised=this.connector?.capabilities??{};
    return {
      available:advertised.available===true&&typeof this.connector?.sendQuestion==='function',
      lazyFirstQuestion:true,
      ownerScopedBindings:true,
      idempotentRequests:advertised.idempotentRequests===true,
      deletionConfirmation:advertised.deletionConfirmation===true&&typeof this.connector?.confirmRemoteDeletion==='function',
      canonicalConversationUrl:typeof this.connector?.conversationUrl==='function',
      rawPromptPersistence:false
    };
  }

  async _owner(principal) {
    let identity;
    try{identity=await this.resolveVerifiedOwner(principal);}catch{throw problem(401,'notcards_auth_required','Sign in to Notcards to continue.');}
    const issuer=identity?.issuer,subject=identity?.subject;
    let issuerUrl;
    try{issuerUrl=new URL(issuer);}catch{throw problem(401,'notcards_auth_required','A verified Notcards identity is required.');}
    if(issuerUrl.protocol!=='https:'||issuerUrl.username||issuerUrl.password||issuerUrl.search||issuerUrl.hash||typeof issuer!=='string'||issuer.length>512||typeof subject!=='string'||!subject.trim()||subject.length>255||/[\u0000-\u001f\u007f]/.test(subject))throw problem(401,'notcards_auth_required','A verified Notcards identity is required.');
    // Preserve issuer and subject exactly: email and display name are never identity keys.
    return {issuer,subject,key:sha(`${issuer}\0${subject}`)};
  }

  _cardId(value){if(typeof value!=='string'||!CARD_ID.test(value))throw problem(400,'invalid_card','Card id is invalid.');return value;}
  _requestId(value){if(typeof value!=='string'||!REQUEST_ID.test(value))throw problem(400,'invalid_request_id','An idempotency request id is required.');return value;}
  _transaction(work){this.db.exec('BEGIN IMMEDIATE');try{const value=work();this.db.exec('COMMIT');return value;}catch(error){this.db.exec('ROLLBACK');throw error;}}
  _binding(owner,cardId){return this.db.prepare('SELECT * FROM notcards_card_chat_bindings WHERE owner_key=? AND card_id=?').get(owner.key,cardId);}
  _ensureBinding(owner,cardId){this.db.prepare("INSERT OR IGNORE INTO notcards_card_chat_bindings(owner_key,card_id,state,conversation_id,active_request_id,updated_at) VALUES(?,?,'empty',NULL,NULL,?)").run(owner.key,cardId,this.clock());return this._binding(owner,cardId);}
  _portAvailable(){return this.capabilities().available;}
  _portIdempotent(){return this.capabilities().idempotentRequests;}
  _idempotencyKey(owner,cardId,requestId){return sha(`${owner.key}\0${cardId}\0${requestId}`);}

  async openCard({principal,cardId}={}) {
    const owner=await this._owner(principal),id=this._cardId(cardId);
    await this.loadCardContext({owner:{issuer:owner.issuer,subject:owner.subject},cardId:id});
    const row=this._binding(owner,id);
    if(!row)return {state:'empty',conversationId:null,canAsk:this._portAvailable(),canReset:false};
    if(row.state==='bound')return {state:'bound',conversationId:row.conversation_id,conversationUrl:await this._conversationUrl(owner,row.conversation_id),canAsk:this._portAvailable(),canReset:this.capabilities().deletionConfirmation,remoteStatus:'unverified'};
    if(row.state==='uncertain')return {state:'outcome_unknown',conversationId:row.conversation_id,canAsk:false,canReset:Boolean(row.conversation_id)&&this.capabilities().deletionConfirmation,remoteStatus:'unverified'};
    if(row.state==='starting')return {state:'starting',conversationId:row.conversation_id,canAsk:false,canReset:false};
    return {state:'empty',conversationId:null,canAsk:this._portAvailable(),canReset:false};
  }

  async _conversationUrl(owner,conversationId) {
    if(!conversationId||typeof this.connector?.conversationUrl!=='function')return null;
    let value;
    try{value=await this.connector.conversationUrl({owner:{issuer:owner.issuer,subject:owner.subject},conversationId});}catch{return null;}
    try{const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)return null;return url.href;}catch{return null;}
  }

  async sendQuestion({principal,cardId,requestId,question}={}) {
    const owner=await this._owner(principal),id=this._cardId(cardId),key=this._requestId(requestId);
    if(typeof question!=='string'||!question.trim()||question.length>MAX_QUESTION)throw problem(400,'invalid_question','Write a question up to 4,000 characters.');
    if(!this._portAvailable())throw problem(503,'botanic_unavailable','Botanic chat is not connected for this account.');
    const context=await this.loadCardContext({owner:{issuer:owner.issuer,subject:owner.subject},cardId:id});
    let contextText;
    try{contextText=JSON.stringify(context);}catch{throw problem(500,'card_context_invalid','The card context could not be prepared.');}
    if(typeof contextText!=='string'||Buffer.byteLength(contextText)>MAX_CONTEXT_BYTES)throw problem(413,'card_context_too_large','The card context exceeds the chat limit.');
    const payloadHash=sha(JSON.stringify({question:question.trim(),context:contextText}));
    const leaseToken=randomUUID(),now=this.clock();
    const reservation=this._transaction(()=>{
      let binding=this._ensureBinding(owner,id);
      let request=this.db.prepare('SELECT * FROM notcards_card_chat_requests WHERE owner_key=? AND card_id=? AND request_id=?').get(owner.key,id,key);
      if(request&&request.payload_hash!==payloadHash)throw problem(409,'idempotency_conflict','This request id was already used with different question or card content.');
      if(request?.state==='completed')return {kind:'replay',state:'bound',conversationId:request.conversation_id,requestId:key,replayed:true};
      if(request?.state==='remote_deleted')throw problem(409,'conversation_deleted','The deleted conversation cannot be reused; submit a new question with a new request id.');
      if(request?.state==='pending'&&Number(request.lease_until)>now)return {kind:'pending',state:'pending',conversationId:request.conversation_id,requestId:key};
      if(request?.state==='uncertain'&&!this._portIdempotent())return {kind:'uncertain',state:'outcome_unknown',conversationId:request.conversation_id,requestId:key};
      if(binding.state==='uncertain'&&binding.active_request_id!==key)throw problem(409,'conversation_outcome_unknown','Resolve the earlier chat request before sending another question.');
      if(binding.active_request_id&&binding.active_request_id!==key){
        const active=this.db.prepare('SELECT state,lease_until FROM notcards_card_chat_requests WHERE owner_key=? AND card_id=? AND request_id=?').get(owner.key,id,binding.active_request_id);
        if(active&&['pending','uncertain'].includes(active.state))throw problem(409,'card_chat_busy','Another chat request for this card is still unresolved.');
      }
      if(binding.state==='starting'&&binding.active_request_id!==key)throw problem(409,'card_chat_starting','A chat is already starting for this card.');
      const conversationId=binding.conversation_id??null;
      if(!request){
        this.db.prepare("INSERT INTO notcards_card_chat_requests(owner_key,card_id,request_id,payload_hash,state,conversation_id,lease_token,lease_until,created_at,updated_at) VALUES(?,?,?,?,'pending',?,?,?,?,?)")
          .run(owner.key,id,key,payloadHash,conversationId,leaseToken,now+this.leaseMs,now,now);
      }else{
        if(request.state==='pending'&&!this._portIdempotent())return {kind:'pending',state:'pending',conversationId:request.conversation_id,requestId:key};
        this.db.prepare("UPDATE notcards_card_chat_requests SET state='pending',conversation_id=?,lease_token=?,lease_until=?,updated_at=? WHERE owner_key=? AND card_id=? AND request_id=?")
          .run(conversationId,leaseToken,now+this.leaseMs,now,owner.key,id,key);
      }
      const state=conversationId?'bound':'starting';
      this.db.prepare('UPDATE notcards_card_chat_bindings SET state=?,conversation_id=?,active_request_id=?,updated_at=? WHERE owner_key=? AND card_id=?')
        .run(state,conversationId,key,now,owner.key,id);
      binding=this._binding(owner,id);
      return {kind:'reserved',conversationId,leaseToken,idempotencyKey:this._idempotencyKey(owner,id,key),owner:{issuer:owner.issuer,subject:owner.subject}};
    });
    if(reservation.kind!=='reserved')return reservation;

    let result;
    try{
      result=await this.connector.sendQuestion({owner:reservation.owner,cardId:id,conversationId:reservation.conversationId,requestId:key,idempotencyKey:reservation.idempotencyKey,question:question.trim(),context});
    }catch(error){
      this._finishFailure(owner,id,key,reservation.leaseToken,error?.retrySafe===true);
      if(error?.retrySafe===true)throw problem(503,'botanic_retryable','Botanic could not accept the question. Retry it with the same request id.');
      return {state:'outcome_unknown',conversationId:reservation.conversationId,requestId:key,replayed:false};
    }
    const remoteId=result?.conversationId;
    if(typeof remoteId!=='string'||!CONVERSATION_ID.test(remoteId)||(reservation.conversationId&&remoteId!==reservation.conversationId)){
      this._finishFailure(owner,id,key,reservation.leaseToken,false);
      return {state:'outcome_unknown',conversationId:reservation.conversationId,requestId:key,replayed:false};
    }
    try{
      const saved=this._transaction(()=>{
        const request=this.db.prepare('SELECT state,lease_token FROM notcards_card_chat_requests WHERE owner_key=? AND card_id=? AND request_id=?').get(owner.key,id,key);
        const binding=this._binding(owner,id);
        if(!request||request.state!=='pending'||request.lease_token!==reservation.leaseToken||binding?.active_request_id!==key)throw problem(409,'chat_request_superseded','The chat request was replaced before its reply could be saved.');
        if(!reservation.conversationId){
          this.db.prepare("INSERT INTO notcards_card_chat_history(owner_key,card_id,conversation_id,state,created_at,deleted_at) VALUES(?,?,?,'active',?,NULL)")
            .run(owner.key,id,remoteId,this.clock());
        }
        this.db.prepare("UPDATE notcards_card_chat_bindings SET state='bound',conversation_id=?,active_request_id=NULL,updated_at=? WHERE owner_key=? AND card_id=?")
          .run(remoteId,this.clock(),owner.key,id);
        this.db.prepare("UPDATE notcards_card_chat_requests SET state='completed',conversation_id=?,lease_token=NULL,lease_until=NULL,updated_at=? WHERE owner_key=? AND card_id=? AND request_id=?")
          .run(remoteId,this.clock(),owner.key,id,key);
        return {state:'bound',conversationId:remoteId,requestId:key,replayed:false};
      });
      return {...saved,conversationUrl:await this._conversationUrl(owner,remoteId)};
    }catch(error){
      if(error.code==='chat_request_superseded')throw error;
      this._finishFailure(owner,id,key,reservation.leaseToken,false);
      return {state:'outcome_unknown',conversationId:reservation.conversationId,requestId:key,replayed:false};
    }
  }

  _finishFailure(owner,cardId,requestId,leaseToken,retrySafe) {
    this._transaction(()=>{
      const request=this.db.prepare('SELECT state,lease_token,conversation_id FROM notcards_card_chat_requests WHERE owner_key=? AND card_id=? AND request_id=?').get(owner.key,cardId,requestId);
      if(!request||request.state!=='pending'||request.lease_token!==leaseToken)return;
      const state=retrySafe?'retryable':'uncertain',bindingState=retrySafe?(request.conversation_id?'bound':'empty'):'uncertain';
      this.db.prepare('UPDATE notcards_card_chat_requests SET state=?,lease_token=NULL,lease_until=NULL,updated_at=? WHERE owner_key=? AND card_id=? AND request_id=?')
        .run(state,this.clock(),owner.key,cardId,requestId);
      this.db.prepare('UPDATE notcards_card_chat_bindings SET state=?,active_request_id=?,conversation_id=?,updated_at=? WHERE owner_key=? AND card_id=? AND active_request_id=?')
        .run(bindingState,retrySafe?null:requestId,request.conversation_id,this.clock(),owner.key,cardId,requestId);
    });
  }

  async resetAfterRemoteDeletion({principal,cardId,expectedConversationId}={}) {
    const owner=await this._owner(principal),id=this._cardId(cardId);
    if(typeof expectedConversationId!=='string'||!CONVERSATION_ID.test(expectedConversationId))throw problem(400,'invalid_conversation_id','Conversation id is invalid.');
    if(!this.capabilities().deletionConfirmation)throw problem(503,'deletion_confirmation_unavailable','Botanic cannot confirm that this conversation was deleted.');
    await this.loadCardContext({owner:{issuer:owner.issuer,subject:owner.subject},cardId:id});
    const current=this._binding(owner,id);
    if(!current||current.conversation_id!==expectedConversationId||!['bound','uncertain'].includes(current.state))throw problem(409,'conversation_binding_changed','The card chat binding changed. Refresh before starting a new chat.');
    let confirmed=false;
    try{confirmed=await this.connector.confirmRemoteDeletion({owner:{issuer:owner.issuer,subject:owner.subject},conversationId:expectedConversationId});}
    catch{throw problem(503,'deletion_confirmation_unavailable','Botanic could not confirm whether this conversation was deleted. The existing link is preserved.');}
    if(confirmed!==true)throw problem(409,'conversation_not_deleted','Botanic has not confirmed deletion. The existing link is preserved.');
    return this._transaction(()=>{
      const row=this._binding(owner,id);
      if(!row||row.conversation_id!==expectedConversationId||!['bound','uncertain'].includes(row.state))throw problem(409,'conversation_binding_changed','The card chat binding changed. Refresh before starting a new chat.');
      const now=this.clock();
      this.db.prepare("UPDATE notcards_card_chat_history SET state='deleted',deleted_at=? WHERE owner_key=? AND card_id=? AND conversation_id=? AND state='active'")
        .run(now,owner.key,id,expectedConversationId);
      this.db.prepare("UPDATE notcards_card_chat_requests SET state='remote_deleted',lease_token=NULL,lease_until=NULL,updated_at=? WHERE owner_key=? AND card_id=? AND conversation_id=? AND state IN ('pending','uncertain','completed','retryable')")
        .run(now,owner.key,id,expectedConversationId);
      this.db.prepare("UPDATE notcards_card_chat_bindings SET state='empty',conversation_id=NULL,active_request_id=NULL,updated_at=? WHERE owner_key=? AND card_id=?")
        .run(now,owner.key,id);
      return {state:'empty',conversationId:null,previousConversationId:expectedConversationId,reset:true};
    });
  }

  async close(){if(this.ownsDb)this.db.close();}
}

