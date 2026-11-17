'use strict';
const {signBindingAssertion,signDeletionAssertion}=require('./launch.cjs');

function startReceiptDelivery({store,privateKey,issuer,audience,publish,clock=Date.now}){
  let busy=false;
  async function flush(){
    if(busy)return;
    busy=true;
    try{
      for(const row of await store.dueReceipts(clock())){
        const sign=row.state==='deleted'?signDeletionAssertion:signBindingAssertion;
        const assertion=sign({privateKey,issuer,audience,user:{provider:'google',googleId:row.subject},
          cardId:row.cardId,launchJti:row.jti,conversationId:row.conversationId,clock});
        let delivered=false;
        try{await publish({assertion});delivered=true;}catch{/* Defer this row and continue with other cards. */}
        await store.finishReceipt(row,delivered);
      }
    }finally{busy=false;}
  }
  const timer=setInterval(()=>flush().catch(()=>{}),15_000);
  timer.unref();
  return {flush,close:()=>clearInterval(timer)};
}
module.exports={startReceiptDelivery};
