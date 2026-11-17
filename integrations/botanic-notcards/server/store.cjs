'use strict';

/** Mongo-backed pending handoff and durable Botanic owner/card/conversation map. */
function createNotcardsLaunchStore({pending,clock=()=>Date.now()}={}){
  if(!pending)throw new Error('Botanic Notcards launch collection is required');
  return {
    async initialize(){
      await pending.createIndex({jti:1},{unique:true,name:'notcards_launch_jti'});
      await pending.createIndex({subject:1,cardId:1},{unique:true,name:'notcards_one_active_conversation_per_google_card',partialFilterExpression:{state:{$in:['pending','bound']}}});
      await pending.createIndex({subject:1,conversationId:1},{unique:true,name:'notcards_google_conversation_unique',partialFilterExpression:{state:'bound'}});
      await pending.createIndex({expiresAt:1},{expireAfterSeconds:0,name:'notcards_pending_launch_expiry',partialFilterExpression:{state:'pending'}});
    },
    async insertPending(row){
      await pending.updateMany({subject:row.subject,cardId:row.cardId,state:'pending',expiresAt:{$lte:new Date(clock())}},{$set:{state:'expired'},$unset:{question:'',context:''}});
      try{await pending.insertOne({...row,_id:row.jti,jti:row.jti,expiresAt:new Date(row.expiresAt)});return true;}
      catch(error){if(error?.code===11000)return false;throw error;}
    },
    getPending(jti){return pending.findOne({jti,state:'pending',expiresAt:{$gt:new Date(clock())}});},
    async bindPending({jti,subject,conversationId,now=clock(),userId}){
      const query={jti,subject,state:'pending',expiresAt:{$gt:new Date(now)}};
      const update=await pending.updateOne(query,{$set:{state:'bound',conversationId,botanicUserId:String(userId),boundAt:now},$unset:{question:''}});
      if(update.modifiedCount===1)return pending.findOne({jti,state:'bound',subject,conversationId});
      return pending.findOne({jti,state:'bound',subject,conversationId,botanicUserId:String(userId)});
    },
    async contextForConversation({subject,conversationId,userId}){
      return pending.findOne({subject,conversationId,botanicUserId:String(userId),state:'bound'});
    },
    bindingForCard({subject,cardId,userId}){
      return pending.findOne({subject,cardId,botanicUserId:String(userId),state:'bound'});
    },
    async archiveConfirmedDeletion({subject,cardId,conversationId,userId,now=clock()}){
      const result=await pending.updateOne({subject,cardId,conversationId,botanicUserId:String(userId),state:'bound'},{$set:{state:'deleted',deletedAt:now},$unset:{question:'',context:''}});
      return result.modifiedCount===1;
    }
  };
}
module.exports={createNotcardsLaunchStore};
