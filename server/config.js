'use strict';
const path=require('node:path');
function httpsOrigin(value,label){let url;try{url=new URL(value);}catch{throw Error(label+' must be an HTTPS origin.');}if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error(label+' must be an HTTPS origin without a path.');return url.origin;}
function positive(value,fallback,label){if(value===undefined||value==='')return fallback;const n=Number(value);if(!Number.isSafeInteger(n)||n<1||n>100000)throw Error(label+' must be a positive integer up to 100000.');return n;}
function fromEnv(env=process.env){
 const mode=env.MELORINA_MODE||((env.NODE_ENV==='production'||env.RENDER)?'hosted':'local');
 if(!['hosted','local'].includes(mode))throw Error('MELORINA_MODE must be hosted or local.');
 if(mode==='local'&&(env.NODE_ENV==='production'||env.RENDER))throw Error('Local mode cannot run in a production environment.');
 if(mode==='local')return {mode};
 const publicOrigin=httpsOrigin(env.MELORINA_PUBLIC_ORIGIN||env.RENDER_EXTERNAL_URL,'MELORINA_PUBLIC_ORIGIN');
 const allowedOrigins=(env.MELORINA_ALLOWED_ORIGINS||'').split(',').filter(Boolean).map(x=>httpsOrigin(x.trim(),'MELORINA_ALLOWED_ORIGINS'));
 if(!env.MELORINA_DATA_DIR||!path.isAbsolute(env.MELORINA_DATA_DIR))throw Error('Set MELORINA_DATA_DIR to an absolute persistent directory.');
 if(!env.MELORINA_INVITE_CODE||env.MELORINA_INVITE_CODE.length<16)throw Error('Set MELORINA_INVITE_CODE to a secret of at least 16 characters.');
 const pagesURL=env.MELORINA_APP_URL||'https://axsimarosmelos.github.io/Melorina-/';let app;try{app=new URL(pagesURL);}catch{throw Error('MELORINA_APP_URL must be an HTTPS URL.');}
 if(app.protocol!=='https:'||app.username||app.password||app.search||app.hash||!allowedOrigins.includes(app.origin))throw Error('MELORINA_APP_URL must belong to an allowed HTTPS origin.');
 return {mode,publicOrigin,allowedOrigins,pagesURL:app.href,storeOptions:{inviteCode:env.MELORINA_INVITE_CODE,dailyLimit:positive(env.MELORINA_DAILY_UNITS,80,'MELORINA_DAILY_UNITS'),globalDailyLimit:positive(env.MELORINA_GLOBAL_DAILY_UNITS,1000,'MELORINA_GLOBAL_DAILY_UNITS'),maxAccounts:positive(env.MELORINA_MAX_ACCOUNTS,100,'MELORINA_MAX_ACCOUNTS')},database:path.join(env.MELORINA_DATA_DIR,'melorina.sqlite')};
}
module.exports={fromEnv};
