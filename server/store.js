'use strict';
const {DatabaseSync}=require('node:sqlite');
const {randomBytes,randomUUID,createHash,scrypt,timingSafeEqual}=require('node:crypto');
const {promisify}=require('node:util');
const {mkdirSync,chmodSync}=require('node:fs');
const {dirname}=require('node:path');
const {ApiError}=require('./openai');
const derive=promisify(scrypt),digest=value=>createHash('sha256').update(value).digest('hex');
const same=(a,b)=>timingSafeEqual(Buffer.from(digest(a)),Buffer.from(digest(b)));
const publicUser=u=>({id:u.id,name:u.name});
class Store{
 constructor(file,{inviteCode,now=Date.now,dailyLimit=80,globalDailyLimit=1000,maxAccounts=100}={}){
  if(typeof inviteCode!=='string'||inviteCode.length<16)throw Error('MELORINA_INVITE_CODE must contain at least 16 characters.');
  this.inviteCode=inviteCode;this.now=now;this.dailyLimit=dailyLimit;this.globalDailyLimit=globalDailyLimit;this.maxAccounts=maxAccounts;
  if(file!==':memory:')mkdirSync(dirname(file),{recursive:true,mode:0o700});
  this.db=new DatabaseSync(file);if(file!==':memory:')chmodSync(file,0o600);
  this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
   CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL UNIQUE,salt TEXT NOT NULL,hash TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS buckets(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);`);
 }
 close(){this.db.close();}
 transaction(fn){this.db.exec('BEGIN IMMEDIATE');try{const result=fn();this.db.exec('COMMIT');return result;}catch(e){this.db.exec('ROLLBACK');throw e;}}
 // Budgets are reserved before work, including failed attempts. Restarts do not reset them.
 consume(limits){const now=this.now();return this.transaction(()=>{
  this.db.prepare('DELETE FROM buckets WHERE expires<=?').run(now);
  for(const item of limits){const row=this.db.prepare('SELECT count FROM buckets WHERE key=?').get(item.key);if((row?.count||0)+item.cost>item.max)throw new ApiError(429,item.message||'Please pause before trying again.');}
  for(const item of limits)this.db.prepare('INSERT INTO buckets VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET count=count+excluded.count').run(item.key,item.cost,item.expires);
 });}
 authBudget(name){const window=Math.floor(this.now()/60000),expires=(window+1)*60000;
  this.consume([{key:'auth:global:'+window,cost:1,max:20,expires},{key:'auth:name:'+digest(String(name).toLowerCase())+':'+window,cost:1,max:5,expires}]);
 }
 credentials(input){if(!input||typeof input.name!=='string'||!/^[a-z0-9_]{3,32}$/i.test(input.name)||typeof input.password!=='string'||input.password.length<12||input.password.length>128)throw new ApiError(400,'Use a username of 3–32 letters, numbers or underscores and a password of 12–128 characters.');return {name:input.name.toLowerCase(),password:input.password};}
 async register(input){const {name,password}=this.credentials(input);
  if(typeof input.inviteCode!=='string'||!same(input.inviteCode,this.inviteCode))throw new ApiError(403,'That invitation code is not valid. Ask the Melorina owner for an invitation.');
  const salt=randomBytes(16).toString('hex'),hash=(await derive(password,salt,64,{N:32768,maxmem:64*1024*1024})).toString('hex');
  const user={id:randomUUID(),name};
  this.transaction(()=>{if(this.db.prepare('SELECT count(*) AS n FROM users').get().n>=this.maxAccounts)throw new ApiError(403,'New accounts are paused. Contact the Melorina owner.');
   if(this.db.prepare('SELECT id FROM users WHERE name=?').get(name))throw new ApiError(409,'This username is unavailable. Choose another or sign in.');
   this.db.prepare('INSERT INTO users VALUES(?,?,?,?)').run(user.id,name,salt,hash);
  });return this.session(user);
 }
 async login(input){const {name,password}=this.credentials(input),user=this.db.prepare('SELECT * FROM users WHERE name=?').get(name);
  const hash=await derive(password,user?.salt||'melorina-nonexistent-account',64,{N:32768,maxmem:64*1024*1024});
  if(!user||this.db.prepare('SELECT hash FROM users WHERE id=?').get(user.id)?.hash!==user.hash||!timingSafeEqual(hash,Buffer.from(user.hash,'hex')))throw new ApiError(401,'Username or password is incorrect.');
  return this.session(user);
 }
 session(user){const now=this.now(),token=randomBytes(32).toString('base64url'),expires=now+7*86400000;
  this.db.prepare('DELETE FROM sessions WHERE expires<=?').run(now);
  // Bound concurrent sessions per account. The fifth sign-in revokes the oldest.
  this.db.prepare('DELETE FROM sessions WHERE user_id=? AND hash NOT IN (SELECT hash FROM sessions WHERE user_id=? ORDER BY expires DESC LIMIT 3)').run(user.id,user.id);
  this.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token),user.id,expires);
  return {token,user:publicUser(user),expires};
 }
 async resetPassword(name,password){const clean=this.credentials({name,password});const user=this.db.prepare('SELECT id FROM users WHERE name=?').get(clean.name);if(!user)throw new ApiError(404,'Account not found.');
  const salt=randomBytes(16).toString('hex'),hash=(await derive(clean.password,salt,64,{N:32768,maxmem:64*1024*1024})).toString('hex');
  this.transaction(()=>{this.db.prepare('UPDATE users SET salt=?,hash=? WHERE id=?').run(salt,hash,user.id);this.db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);});
 }
 revoke(name){const user=this.db.prepare('SELECT id FROM users WHERE name=?').get(String(name).toLowerCase());if(!user)throw new ApiError(404,'Account not found.');this.db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);}
 deleteAccount(name){const user=this.db.prepare('SELECT id FROM users WHERE name=?').get(String(name).toLowerCase());if(!user)throw new ApiError(404,'Account not found.');this.db.prepare('DELETE FROM users WHERE id=?').run(user.id);}
 authenticate(token){if(typeof token!=='string'||!/^[-\w]{43}$/.test(token))throw new ApiError(401,'Sign in to continue voice practice.');
  const user=this.db.prepare('SELECT users.id,users.name FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.hash=? AND sessions.expires>?').get(digest(token),this.now());
  if(!user)throw new ApiError(401,'Your session has expired. Please sign in again.');return publicUser(user);
 }
 logout(token){this.db.prepare('DELETE FROM sessions WHERE hash=?').run(digest(token||''));}
 usage(user){const day=Math.floor(this.now()/86400000),used=this.db.prepare('SELECT count FROM buckets WHERE key=?').get('day:'+day+':'+user.id)?.count||0;return {used,limit:this.dailyLimit,remaining:Math.max(0,this.dailyLimit-used),resetsAt:(day+1)*86400000};}
 reserve(user,endpoint){const minute=Math.floor(this.now()/60000),day=Math.floor(this.now()/86400000),cost=endpoint==='conversation'?3:endpoint==='transcribe'?2:1;
  this.consume([
   {key:'minute:'+minute+':'+user.id,cost:1,max:20,expires:(minute+1)*60000},
   {key:'minute:'+minute+':global',cost:1,max:60,expires:(minute+1)*60000},
   {key:'day:'+day+':'+user.id,cost,max:this.dailyLimit,expires:(day+1)*86400000,message:'You have used today’s voice allowance. Text practice is still available; voice resets at midnight UTC.'},
   {key:'day:'+day+':global',cost,max:this.globalDailyLimit,expires:(day+1)*86400000,message:'Voice has reached its daily service allowance. Please return tomorrow; text practice is still available.'}
  ]);
 }
}
module.exports={Store};
