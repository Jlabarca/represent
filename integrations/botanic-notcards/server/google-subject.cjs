'use strict';

// Called only inside the native Google OAuth success path, after domain policy.
// Legacy pre-provisioned Google users can have a verified email but no subject.
async function confirmGoogleSubject(User, user, profile) {
  const {id,email,emailVerified}=profile;
  if(typeof id!=='string'||!id||user.provider!=='google')throw new Error('Google identity unavailable');
  if(user.googleId===id)return;
  if(user.googleId||user.tenantId||emailVerified!==true||user.emailVerified!==true||
     !email||email.toLowerCase()!==user.email?.toLowerCase())throw new Error('Google identity mismatch');
  const confirmed=await User.findOneAndUpdate({
    _id:user._id,provider:'google',email:user.email,emailVerified:true,tenantId:null,
    $or:[{googleId:null},{googleId:''},{googleId:id}]
  },{$set:{googleId:id}},{new:true}).select('googleId').lean();
  if(confirmed?.googleId!==id)throw new Error('Google identity unavailable');
  user.googleId=id;
}

module.exports={confirmGoogleSubject};
