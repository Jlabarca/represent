import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {generateKeyPairSync,verify,createPublicKey,createHash} from 'node:crypto';
import {BotanicLaunchIssuer,botanicLaunchConfig} from '../src/notcards/botanic-launch.mjs';

const canonical=value=>value===null||typeof value!=='object'?JSON.stringify(value):Array.isArray(value)?`[${value.map(canonical).join(',')}]`:`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
const card='abcdefghijk', owner={issuer:'https://accounts.google.com',subject:'google-subject-7'};
function harness({context={title:'A real notebook',transcript:[{start:2,text:'Source text'}]},clock=()=>1_800_000_000_000}={}){
  const db=new DatabaseSync(':memory:'),keys=generateKeyPairSync('ed25519');
  const issuer=new BotanicLaunchIssuer({db,privateKey:keys.privateKey,issuer:'https://not.maremoto.dev',audience:'https://botanic.example',botanicOrigin:'https://botanic.example',clock,resolveVerifiedOwner:async()=>owner,loadCardContext:async()=>context});
  return {db,keys,issuer,clock};
}
function claims(ticket,keys){
  const [header,payload,signature]=ticket.split('.'),input=Buffer.from(`${header}.${payload}`);
  assert.equal(verify(null,input,keys.publicKey,Buffer.from(signature,'base64url')),true);
  return JSON.parse(Buffer.from(payload,'base64url').toString());
}
const digest=value=>createHash('sha256').update(value).digest('base64url');

test('launch ticket binds exact issuer, audience, Google subject, card, expiry, and envelope digest',async()=>{
  const h=harness(),principal={auth:'cookie',user:{id:'notcards-user'}};
  const result=await h.issuer.issue({principal,cardId:card,requestId:'request_0001',question:'What are the main claims?'});
  const token=claims(result.ticket,h.keys);
  assert.deepEqual({iss:token.iss,aud:token.aud,sub:token.sub,card_id:token.card_id},{iss:'https://not.maremoto.dev',aud:'https://botanic.example',sub:owner.subject,card_id:card});
  assert.equal(token.exp-token.iat,300);
  assert.equal(token.payload_sha256,digest(canonical({cardId:card,question:result.question,context:result.context})));
  assert.equal(result.botanicOrigin,'https://botanic.example');
  assert.equal(h.db.prepare('SELECT COUNT(*) n FROM notcards_botanic_launches').get().n,1);
  const columns=h.db.prepare('PRAGMA table_info(notcards_botanic_launches)').all().map(row=>row.name);
  assert.equal(columns.includes('question'),false);assert.equal(columns.includes('context'),false);
  h.db.close();
});

test('same request is idempotent without storing question or context; content changes conflict',async()=>{
  const h=harness(),args={principal:{auth:'cookie',user:{id:'u'}},cardId:card,requestId:'request_0001',question:'Summarize this source'};
  const first=await h.issuer.issue(args),retry=await h.issuer.issue(args);
  assert.deepEqual(retry,first);
  assert.equal(h.db.prepare('SELECT payload_hash FROM notcards_botanic_launches').get().payload_hash.length,43);
  await assert.rejects(h.issuer.issue({...args,question:'Different question'}),error=>error.status===409&&error.code==='launch_request_conflict');
  h.db.close();
});

test('only signed-in cookie sessions can launch, and context is bounded',async()=>{
  const h=harness(),args={principal:{auth:'bearer',user:{id:'u'}},cardId:card,requestId:'request_0001',question:'question'};
  await assert.rejects(h.issuer.issue(args),error=>error.status===403);
  const large=harness({context:{transcript:'x'.repeat(140_000)}});
  await assert.rejects(large.issuer.issue({...args,principal:{auth:'cookie',user:{id:'u'}}}),error=>error.status===413&&error.code==='card_context_too_large');
  h.db.close();large.db.close();
});

test('launch remains disabled unless all exact origins and a dedicated Ed25519 private key are configured',()=>{
  const keys=generateKeyPairSync('ed25519'),pem=keys.privateKey.export({type:'pkcs8',format:'pem'}).toString();
  assert.equal(botanicLaunchConfig({}),null);
  assert.equal(botanicLaunchConfig({NOTCARDS_BOTANIC_LAUNCH_PRIVATE_KEY:pem,NOTCARDS_BOTANIC_ORIGIN:'https://botanic.example/path',NOTCARDS_PUBLIC_ORIGIN:'https://not.maremoto.dev'}),null);
  assert.equal(botanicLaunchConfig({NOTCARDS_BOTANIC_LAUNCH_PRIVATE_KEY:keys.publicKey.export({type:'spki',format:'pem'}).toString(),NOTCARDS_BOTANIC_ORIGIN:'https://botanic.example',NOTCARDS_PUBLIC_ORIGIN:'https://not.maremoto.dev'}),null);
  assert.equal(botanicLaunchConfig({NOTCARDS_BOTANIC_LAUNCH_PRIVATE_KEY:pem,NOTCARDS_BOTANIC_ORIGIN:'https://botanic.example',NOTCARDS_PUBLIC_ORIGIN:'https://not.maremoto.dev'}).audience,'https://botanic.example');
});
