'use strict';

// Runs inside the pinned runtime on an isolated Docker network with an empty Mongo.
const assert=require('node:assert/strict');
const {generateKeyPairSync,randomUUID}=require('node:crypto');
const {createRequire}=require('node:module');
const appRequire=createRequire('/app/api/package.json');
appRequire('module-alias')({base:'/app/api'});
const mongoose=appRequire('mongoose');
const {createModels}=appRequire('@librechat/data-schemas');
const {Constants}=appRequire('librechat-data-provider');

async function main(){
  // Deliberately fixed to the private, disposable smoke network.
  if(process.env.NOTCARDS_DISPOSABLE_SMOKE!=='1')throw Error('Use a disposable Mongo container with network disabled');
  const entrypoint=require('node:fs').readFileSync('/app/api/server/index.js','utf8');
  const cardMount=entrypoint.indexOf("app.use('/api/botanic/notcards',");
  const sharedMount=entrypoint.indexOf("app.use('/api/botanic',");
  assert.ok(cardMount>=0,'Missing Notcards router in the packaged server');
  assert.ok(sharedMount<0||cardMount<sharedMount,'The shared JWT middleware intercepts the signed Notcards launch');
  await mongoose.connect('mongodb://127.0.0.1:27017/notcards_fixture',{serverSelectionTimeoutMS:15000});
  createModels(mongoose);
  const launchKeys=generateKeyPairSync('ed25519'),receiptKeys=generateKeyPairSync('ed25519');
  Object.assign(process.env,{BOTANIC_NOTCARDS_AGENT_ID:'agent_notcards_smoke',BOTANIC_NOTCARDS_ORIGIN:'https://notcards.invalid',
    BOTANIC_NOTCARDS_CHAT_ORIGIN:'https://botanic.invalid',BOTANIC_NOTCARDS_LAUNCH_PUBLIC_KEY:launchKeys.publicKey.export({type:'spki',format:'pem'}),
    BOTANIC_NOTCARDS_RECEIPT_PRIVATE_KEY:receiptKeys.privateKey.export({type:'pkcs8',format:'pem'})});
  const bridge=appRequire('./server/notcards/native.cjs');
  const agent={id:process.env.BOTANIC_NOTCARDS_AGENT_ID,instructions:'Fixture assistant'};
  const connection=mongoose.connection.db;
  const {confirmGoogleSubject}=appRequire('./server/notcards/google-subject.cjs');
  const userModel=mongoose.models.User;
  const legacy={_id:new mongoose.Types.ObjectId(),email:'account@example.invalid',provider:'google',emailVerified:true};
  await userModel.collection.insertOne({...legacy});
  const profile={id:'first-verified-subject',email:legacy.email,emailVerified:true};
  await assert.rejects(confirmGoogleSubject(userModel,{...legacy},{...profile,emailVerified:false}));
  await confirmGoogleSubject(userModel,{...legacy},profile);
  await assert.rejects(confirmGoogleSubject(userModel,{...legacy},{...profile,id:'different-subject'}));
  assert.equal((await userModel.findById(legacy._id).lean()).googleId,profile.id);
  const launches=connection.collection('botanic_notcards_launches');
  const subject=randomUUID(),userId=new mongoose.Types.ObjectId().toString(),id=randomUUID(),jti=randomUUID();
  const question='Which source is attached?',cardId='aBcDeF12345';
  await launches.insertOne({jti,subject,state:'pending',cardId,question,context:{source:'Private fixture source'},expiresAt:new Date(Date.now()+300000)});
  const req={body:{text:question,parentMessageId:Constants.NO_PARENT},headers:{cookie:'__Host-notcards_launch='+jti},user:{id:userId,googleId:subject,provider:'google'}};
  assert.equal(await bridge.apply({...req,body:{...req.body,text:'Another chat'}},agent,id),agent);
  assert.equal(await bridge.apply({...req,user:{...req.user,googleId:randomUUID()}},agent,id),agent);
  assert.match((await bridge.apply(req,agent,id)).instructions,/Private fixture source/);
  const userMessage=randomUUID(),answer=randomUUID();
  await bridge.persisted(req,id,userMessage,answer);
  assert.equal((await launches.findOne({jti})).state,'pending');
  await mongoose.model('Conversation').collection.insertOne({conversationId:id,user:userId,agent_id:agent.id,title:'Smoke'});
  for(const [messageId,isCreatedByUser] of [[userMessage,true],[answer,false]])
    await mongoose.model('Message').collection.insertOne({user:userId,conversationId:id,messageId,isCreatedByUser,text:'Fixture message'});
  await bridge.persisted(req,id,userMessage,answer);
  assert.equal((await launches.findOne({jti})).conversationId,id);
  await mongoose.model('Conversation').collection.deleteOne({user:userId,conversationId:id});
  await bridge.deleted(req,[id]);
  const archived=await launches.findOne({jti});
  assert.equal(archived.state,'deleted');assert.equal(archived.context,undefined);
  assert.equal(archived.cardId,cardId);
  console.log('PASS: native LibreChat models, Google subject, first turn, saved message verification, and confirmed deletion with real Mongo.');
}
main().then(()=>process.exit(0),error=>{console.error(error.message);process.exit(1);});
