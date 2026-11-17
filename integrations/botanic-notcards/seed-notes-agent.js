// Run through mongosh against the shared LibreChat database after deployment approval.
// The existing Google user owns the assistant. Only the assistant is shared.
const database = db.getSiblingDB('LibreChat');
const pilot = process.env.NOTCARDS_PILOT_EMAIL;
if (!pilot) throw Error('Set the approved pilot email');
const user = database.users.findOne({email:pilot, provider:'google', emailVerified:true});
const role = database.accessroles.findOne({accessRoleId:'agent_viewer'});
if (!user || !role) throw Error('Existing verified Google user and native viewer role required');
const id='agent_notcards';
const existing=database.agents.findOne({id});
if (existing && (String(existing.author)!==String(user._id)||existing.provider!=='Botanic local'||existing.model!=='botanic-free')) {
  throw Error('Existing assistant differs from the approved pilot');
}
database.agents.updateOne({id},{$setOnInsert:{
  id,author:user._id,name:'Notcards',description:'Discuss the sources saved in your research card.',
  instructions:'Answer in the language of the question. Ground your answer in the supplied card sources. Distinguish source claims from conclusions and point out when the sources are insufficient.',
  provider:'Botanic local',model:'botanic-free',model_parameters:{},category:'general',
  tools:[],mcpServerNames:[],tool_resources:{},versions:[],is_promoted:false,createdAt:new Date(),updatedAt:new Date()
}},{upsert:true});
const agent=database.agents.findOne({id});
database.aclentries.updateOne({principalType:'user',principalId:user._id,resourceType:'agent',resourceId:agent._id},{
  $setOnInsert:{principalModel:'User',roleId:role._id,permBits:1,grantedBy:user._id,grantedAt:new Date()}
},{upsert:true});
database.aclentries.updateOne({principalType:'public',resourceType:'agent',resourceId:agent._id},{
  $setOnInsert:{roleId:role._id,permBits:1,grantedBy:user._id,grantedAt:new Date()}
},{upsert:true});
print('Shared Notcards assistant ready');
