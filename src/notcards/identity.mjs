import {createHash, randomBytes, timingSafeEqual} from 'node:crypto';
import {createRemoteJWKSet, jwtVerify} from 'jose';

const encode = value => Buffer.from(value).toString('base64url');
const digest = value => createHash('sha256').update(value).digest('base64url');
const random = (size = 32) => encode(randomBytes(size));
const safeEqual = (left, right) => typeof left === 'string' && typeof right === 'string' && Buffer.byteLength(left)===Buffer.byteLength(right) && timingSafeEqual(Buffer.from(left),Buffer.from(right));

export class GoogleIdentity {
  constructor({clientId = process.env.NOTCARDS_GOOGLE_CLIENT_ID, clientSecret = process.env.NOTCARDS_GOOGLE_CLIENT_SECRET, publicOrigin = process.env.NOTCARDS_PUBLIC_ORIGIN, fetcher = fetch, clock = () => Date.now()} = {}) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.publicOrigin = new URL(publicOrigin || 'http://127.0.0.1:8080').origin;
    this.fetcher = fetcher;
    this.clock = clock;
    this.pending = new Map();
    this.discovery = null;
    this.discoveryTask = null;
    this.jwks = null;
    this.starting = 0;
  }

  get configured() { return Boolean(this.clientId && this.clientSecret); }

  async provider() {
    if (!this.configured) throw Object.assign(new Error('Google sign-in is not configured for this development environment.'), {status:503});
    if(this.discovery)return this.discovery;
    if(!this.discoveryTask)this.discoveryTask=(async()=>{
      const response = await this.fetcher('https://accounts.google.com/.well-known/openid-configuration', {signal:AbortSignal.timeout(10000)});
      if (!response.ok) throw new Error(`Google identity discovery failed (HTTP ${response.status})`);
      const config = await response.json();
      if (config.issuer !== 'https://accounts.google.com' || !config.authorization_endpoint?.startsWith('https://accounts.google.com/') || !config.token_endpoint?.startsWith('https://oauth2.googleapis.com/') || !config.jwks_uri?.startsWith('https://www.googleapis.com/')) throw new Error('Google identity configuration is invalid');
      this.discovery = config;
      this.jwks = createRemoteJWKSet(new URL(config.jwks_uri), {timeoutDuration:5000, cooldownDuration:30000, cacheMaxAge:600000});
      return config;
    })().catch(error=>{this.discoveryTask=null;throw error;});
    return this.discoveryTask;
  }

  async begin({cookieState, context = {type:'web'}} = {}) {
    const now=this.clock();
    for(const [key,value] of this.pending)if(value.expiresAt<=now)this.pending.delete(key);
    if(this.pending.size+this.starting>=256)throw Object.assign(new Error('Too many sign-in attempts. Wait a moment and try again.'),{status:429});
    this.starting++;
    let discovery;
    try{discovery=await this.provider();}finally{this.starting--;}
    const state = random(32);
    const nonce = random(32);
    const verifier = random(48);
    const challenge = digest(verifier);
    const transaction = {cookieState, nonce, verifier, context, expiresAt:this.clock() + 10 * 60_000};
    this.pending.set(state, transaction);
    const authorize = new URL(discovery.authorization_endpoint);
    authorize.search = new URLSearchParams({client_id:this.clientId,redirect_uri:`${this.publicOrigin}/auth/google/callback`,response_type:'code',scope:'openid email profile',state,nonce,code_challenge:challenge,code_challenge_method:'S256'}).toString();
    return {state, authorizationUrl:authorize.href};
  }

  async complete({state, code, cookieState}) {
    const transaction = this.pending.get(state);
    this.pending.delete(state);
    if (!transaction || transaction.expiresAt < this.clock() || !safeEqual(transaction.cookieState, cookieState) || typeof code !== 'string' || code.length > 4096) throw Object.assign(new Error('Google sign-in expired. Please try again.'), {status:400});
    const discovery = await this.provider();
    const response = await this.fetcher(discovery.token_endpoint, {method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},signal:AbortSignal.timeout(15000),body:new URLSearchParams({client_id:this.clientId,client_secret:this.clientSecret,code,code_verifier:transaction.verifier,grant_type:'authorization_code',redirect_uri:`${this.publicOrigin}/auth/google/callback`})});
    if (!response.ok) throw Object.assign(new Error('Google could not complete sign-in. Please retry.'), {status:401});
    const tokenText=await response.text();if(tokenText.length>64_000)throw Object.assign(new Error('Google returned an invalid identity response.'),{status:401});
    let tokens;try{tokens=JSON.parse(tokenText);}catch{throw Object.assign(new Error('Google returned an invalid identity response.'),{status:401});}
    if (typeof tokens.id_token !== 'string') throw Object.assign(new Error('Google did not return a verified identity.'), {status:401});
    const {payload} = await jwtVerify(tokens.id_token, this.jwks, {issuer:discovery.issuer,audience:this.clientId,clockTolerance:5});
    if ((Array.isArray(payload.aud)&&payload.aud.length>1&&payload.azp!==this.clientId) || !safeEqual(payload.nonce, transaction.nonce) || typeof payload.sub !== 'string' || payload.sub.length > 255 || payload.email_verified !== true || typeof payload.email !== 'string' || payload.email.length > 320) throw Object.assign(new Error('Google identity claims are invalid.'), {status:401});
    return {user:{issuer:discovery.issuer,subject:payload.sub,email:payload.email.toLowerCase(),displayName:typeof payload.name === 'string' ? payload.name.slice(0,200) : payload.email.split('@')[0]},context:transaction.context};
  }
}

export class TestIdentity {
  constructor({user = {issuer:'https://accounts.google.com',subject:'notcards-test-subject',email:'test@example.invalid',displayName:'Test Account'}} = {}) { this.user=user; this.configured=true; this.pending=new Map(); }
  async begin({cookieState,context={type:'web'}} = {}) { if(!this.configured)throw Object.assign(new Error('Google sign-in is not configured for this development environment.'),{status:503});const state=random(16);this.pending.set(state,{cookieState,context});return {state,authorizationUrl:`https://identity.test/authorize?state=${state}`}; }
  async complete({state,code,cookieState}) {const value=this.pending.get(state);this.pending.delete(state);if(!value||value.cookieState!==cookieState||code!=='test-code')throw Object.assign(new Error('Google sign-in expired. Please try again.'),{status:400});return {user:this.user,context:value.context};}
}

export const identityInternals = {digest,random};
