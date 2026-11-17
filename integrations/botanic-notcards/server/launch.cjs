'use strict';

const {createHash,createPublicKey,verify}=require('node:crypto');

const MAX_QUESTION=4000;
const MAX_CONTEXT_BYTES=128_000;
const MAX_TTL_SECONDS=5*60;
const ID=/^[A-Za-z0-9_-]{8,96}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sha=value=>createHash('sha256').update(value).digest('base64url');
const fail=(code,status=400)=>Object.assign(new Error(code),{code,status});
function canonical(value){
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}
function decodePart(value){try{return JSON.parse(Buffer.from(value,'base64url').toString('utf8'));}catch{throw fail('invalid_launch');}}
function verifiedTicket(compact,publicKey,{issuer,audience,clock=()=>Date.now()}={}){
  if(typeof compact!=='string'||compact.length>4096)throw fail('invalid_launch');
  const parts=compact.split('.');if(parts.length!==3)throw fail('invalid_launch');
  const header=decodePart(parts[0]),claims=decodePart(parts[1]);
  const verificationKey=publicKey?.type==='public'?publicKey:createPublicKey(publicKey);
  if(header.alg!=='EdDSA'||header.typ!=='JWT'||!verify(null,Buffer.from(`${parts[0]}.${parts[1]}`),verificationKey,Buffer.from(parts[2],'base64url')))throw fail('invalid_launch');
  const now=Math.floor(clock()/1000);
  if(claims.iss!==issuer||claims.aud!==audience||typeof claims.sub!=='string'||!claims.sub||claims.sub.length>255||!ID.test(claims.jti||'')||!ID.test(claims.card_id||'')||!Number.isInteger(claims.iat)||!Number.isInteger(claims.exp)||claims.iat>now+30||claims.exp<=now||claims.exp<=claims.iat||claims.exp-claims.iat>MAX_TTL_SECONDS||typeof claims.payload_sha256!=='string')throw fail('invalid_or_expired_launch',401);
  return claims;
}

/**
 * Botanic-side durable launch ledger. Mount its adapter before application routes.
 * The incoming top-level POST intentionally does not require a Botanic cookie: the
 * signed short-lived ticket names the exact Google subject. A Lax handle cookie lets
 * the top-level Botanic page reclaim it after native Google login (OAuth redirects
 * may use GET); the original Lax auth cookie is never assumed on this POST.
 */
function createNotcardsLaunchLedger({db,notcardsOrigin,audience,publicKey,clock=()=>Date.now()}={}){
  if(!db||typeof db.insertPending!=='function'||typeof db.getPending!=='function'||typeof db.bindPending!=='function')throw new Error('A durable Botanic pending-launch store is required');
  const originUrl=new URL(notcardsOrigin),audienceUrl=new URL(audience);
  if(originUrl.protocol!=='https:'||originUrl.origin!==notcardsOrigin||audienceUrl.protocol!=='https:'||audienceUrl.origin!==audience)throw new Error('Notcards issuer and Botanic audience must be exact HTTPS origins');
  const origin=originUrl.origin;
  return {
    async accept({origin:requestOrigin,ticket,question,context}){
      if(requestOrigin!==origin)throw fail('origin_not_allowed',403);
      const claims=verifiedTicket(ticket,publicKey,{issuer:origin,audience,clock});
      if(typeof question!=='string'||!question.trim()||question.length>MAX_QUESTION||!context||typeof context!=='object'||Buffer.byteLength(canonical(context))>MAX_CONTEXT_BYTES)throw fail('invalid_launch_payload',413);
      const payloadSha=sha(canonical({cardId:claims.card_id,question:question.trim(),context}));
      if(payloadSha!==claims.payload_sha256)throw fail('launch_payload_mismatch',401);
      const row={jti:claims.jti,issuer:claims.iss,subject:claims.sub,cardId:claims.card_id,question:question.trim(),context,expiresAt:claims.exp*1000,state:'pending',conversationId:null};
      if(!await db.insertPending(row))throw fail('launch_replayed',409);
      return {jti:claims.jti,subject:claims.sub,expiresAt:row.expiresAt};
    },
    async reclaim({jti,user}){
      if(!user||user.provider!=='google'||typeof user.googleId!=='string'||!user.googleId)throw fail('google_sign_in_required',401);
      const row=await db.getPending(jti);
      if(!row||row.expiresAt<=clock()||row.state!=='pending')throw fail('launch_unavailable',404);
      if(row.subject!==user.googleId)throw fail('launch_owner_mismatch',403);
      return {jti:row.jti,cardId:row.cardId,question:row.question,context:row.context};
    },
    async bind({jti,user,conversationId,userId}){
      if(!user||user.provider!=='google'||typeof user.googleId!=='string'||!user.googleId)throw fail('google_sign_in_required',401);
      if(typeof conversationId!=='string'||!UUID.test(conversationId)||typeof userId!=='string'||!userId)throw fail('invalid_conversation',400);
      const row=await db.bindPending({jti,subject:user.googleId,conversationId,now:clock(),userId});
      if(!row)throw fail('launch_unavailable_or_owner_mismatch',404);
      return {cardId:row.cardId,context:row.context,conversationId:row.conversationId};
    }
  };
}

module.exports={createNotcardsLaunchLedger,verifiedTicket,canonical,MAX_CONTEXT_BYTES,MAX_QUESTION};
