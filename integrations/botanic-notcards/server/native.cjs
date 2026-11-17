'use strict';

const express=require('express');
const mongoose=require('mongoose');
const {createPublicKey,createPrivateKey}=require('node:crypto');
const {Constants}=require('librechat-data-provider');
const db=require('~/models');
const requireJwtAuth=require('~/server/middleware/requireJwtAuth');
const {createNotcardsLaunchRouter}=require('./router.cjs');
const {createNotcardsLaunchStore}=require('./store.cjs');

const config=process.env;
let initialization;
function origin(value){
  const parsed=new URL(value);
  if(parsed.protocol!=='https:'||parsed.origin!==value)throw Error('Expected an exact HTTPS origin');
  return parsed.origin;
}

async function initialize(){
  const agentId=config.BOTANIC_NOTCARDS_AGENT_ID;
  if(!agentId)return null;
  if(!/^agent_[a-zA-Z0-9_-]{1,100}$/.test(agentId))throw Error('Invalid Notcards agent');
  const publicKey=createPublicKey(config.BOTANIC_NOTCARDS_LAUNCH_PUBLIC_KEY.replace(/\\n/g,'\n'));
  const privateKey=createPrivateKey(config.BOTANIC_NOTCARDS_RECEIPT_PRIVATE_KEY.replace(/\\n/g,'\n'));
  if(publicKey.asymmetricKeyType!=='ed25519'||privateKey.asymmetricKeyType!=='ed25519')throw Error('Expected dedicated Ed25519 keys');
  const store=createNotcardsLaunchStore({pending:mongoose.connection.db.collection('botanic_notcards_launches')});
  await store.initialize();
  const bridge=createNotcardsLaunchRouter({store,express,requireJwtAuth,agentId,publicKey,bindingPrivateKey:privateKey,
    notcardsOrigin:origin(config.BOTANIC_NOTCARDS_ORIGIN),audience:origin(config.BOTANIC_NOTCARDS_CHAT_ORIGIN),
    verifyOwnedConversation:async(userId,id)=>Boolean(await db.getConvo(userId,id))});
  return {bridge,store,agentId};
}

function ready(){
  if(!initialization)initialization=initialize().catch(error=>{initialization=null;throw error;});
  return initialization;
}

module.exports={
  async route(req,res,next){
    try{const active=await ready();if(!active)return res.sendStatus(404);return active.bridge.router(req,res,next);}
    catch{return res.status(503).json({code:'notcards_bridge_unavailable'});}
  },
  async apply(req,agent,conversationId){
    if(!agent?.id||agent.id!==config.BOTANIC_NOTCARDS_AGENT_ID)return agent;
    const active=await ready();
    return active.bridge.applyToAgent(req,agent,{agentId:active.agentId,conversationId,acceptFirstQuestion:async pending=>{
      if(req.body?.parentMessageId!==Constants.NO_PARENT||req.body?.text?.trim()!==pending.question.trim())return false;
      if(await db.getConvo(String(req.user.id),conversationId))return false;
      return active.store.claimFirstTurn({jti:pending.jti,subject:req.user.googleId,conversationId});
    }});
  },
  async persisted(req,id,userMessageId,assistantMessageId){
    if(!req.notcardsPendingBinding||!userMessageId||!assistantMessageId)return;
    const active=await ready();
    return active.bridge.confirmGeneratedConversation(req,{conversationId:id,verifyOwnedConversation:async(userId,conversationId)=>{
      const conversation=await db.getConvo(userId,conversationId);
      if(conversation?.agent_id!==active.agentId)return false;
      const messages=await db.getMessages({user:userId,conversationId,messageId:{$in:[userMessageId,assistantMessageId]}});
      return messages.some(m=>m.messageId===userMessageId&&m.isCreatedByUser===true)&&
        messages.some(m=>m.messageId===assistantMessageId&&m.isCreatedByUser===false&&!m.unfinished);
    }});
  },
  async deleted(req,ids){
    if(!config.BOTANIC_NOTCARDS_AGENT_ID||!ids?.length||req.user?.provider!=='google')return;
    const active=await ready();
    return active.bridge.archiveDeletedConversations({user:req.user,userId:String(req.user.id),conversationIds:ids});
  }
};
