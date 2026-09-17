'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const {mkdtempSync,rmSync,readFileSync}=require('node:fs'),{tmpdir}=require('node:os'),{join}=require('node:path');
const {Store}=require('../server/store'),{createServer}=require('../server/app'),{fromEnv}=require('../server/config');
const INVITE='test-invitation-32-characters-long',PASS='test-password-long-enough',origin='https://axsimarosmelos.github.io';
const config={mode:'hosted',publicOrigin:'https://voice.example.com',allowedOrigins:[origin],pagesURL:origin+'/Melorina-/'};
function send(server,path,{method='GET',headers={},body}={}){return new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port:server.address().port,path,method,headers:{Host:'voice.example.com',Origin:origin,...headers}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{const text=Buffer.concat(chunks).toString();let data;try{data=JSON.parse(text);}catch{}resolve({status:res.statusCode,headers:res.headers,text,data});});});req.on('error',reject);req.end(body);});}
const post=(server,path,data,token,headers={})=>send(server,path,{method:'POST',headers:{'Content-Type':'application/json','X-Melorina-Client':'voice-v1',...(token?{Authorization:'Bearer '+token}:{}),...headers},body:JSON.stringify(data)});
async function fixture(t,options={}){const store=new Store(':memory:',{inviteCode:INVITE,...options});let calls=0;const provider={configured:true,speech:async()=>{calls++;return Buffer.from('mp3');},transcribe:async()=>{calls++;return {text:'مرحبا'};},conversation:async()=>{calls++;return {arabic:'مرحبا'};}};const server=createServer({config,store,provider});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(()=>{store.close();r();})));return {store,server,provider,calls:()=>calls};}
async function signup(server,name='learner'){return (await post(server,'/api/register',{name,password:PASS,inviteCode:INVITE})).data;}
test('hosted configuration fails closed without HTTPS, persistent data or invitation secret',()=>{
 const env={NODE_ENV:'production',MELORINA_PUBLIC_ORIGIN:config.publicOrigin,MELORINA_ALLOWED_ORIGINS:origin,MELORINA_DATA_DIR:'/tmp/test-melorina',MELORINA_INVITE_CODE:INVITE};
 assert.equal(fromEnv(env).mode,'hosted');assert.throws(()=>fromEnv({...env,MELORINA_MODE:'local'}),/production/);assert.throws(()=>fromEnv({...env,MELORINA_PUBLIC_ORIGIN:'http://evil.test'}),/HTTPS/);assert.throws(()=>fromEnv({...env,MELORINA_ALLOWED_ORIGINS:origin+'/path'}),/path/);assert.throws(()=>fromEnv({...env,MELORINA_DATA_DIR:''}),/persistent/);assert.throws(()=>fromEnv({...env,MELORINA_INVITE_CODE:''}),/secret/);assert.throws(()=>fromEnv({...env,MELORINA_DAILY_UNITS:'NaN'}),/integer/);
});
test('hosted CORS permits exact origins and bearer preflight; rejects untrusted origins, hosts and headers',async t=>{
 const {server}=await fixture(t);const status=await send(server,'/api/status');assert.equal(status.data.authRequired,true);assert.equal(status.headers['access-control-allow-origin'],origin);
 const pre=await send(server,'/api/speech',{method:'OPTIONS',headers:{'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization, content-type, x-melorina-client'}});assert.equal(pre.status,204);assert.equal(pre.headers['access-control-allow-credentials'],undefined);
 assert.equal((await send(server,'/api/status',{headers:{Origin:origin+'.evil.test'}})).status,403);
 assert.equal((await send(server,'/api/status',{headers:{Host:'evil.test'}})).status,403);
 assert.equal((await send(server,'/api/status',{headers:{Origin:'null'}})).status,403);
 assert.equal((await send(server,'/api/speech',{method:'OPTIONS',headers:{'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'x-evil'}})).status,403);
 assert.equal((await send(server,'/server/store.js')).status,404);assert.equal((await send(server,'/data/melorina.sqlite')).status,404);
 const connect=await send(server,'/connect');assert.equal(connect.headers.location,config.pagesURL+'#connect='+encodeURIComponent(config.publicOrigin));
});
test('OpenAI endpoints require an invited account; logout revokes the session',async t=>{
 const {server,calls}=await fixture(t);
 assert.equal((await post(server,'/api/speech',{wordId:'hello'})).status,401);
 assert.equal((await post(server,'/api/register',{name:'learner',password:PASS,inviteCode:'wrong'})).status,403);
 const session=await signup(server);assert.equal(session.user.name,'learner');assert.equal(session.token.length,43);
 assert.equal((await post(server,'/api/speech',{wordId:'hello'},session.token)).status,200);assert.equal(calls(),1);
 const account=await send(server,'/api/account',{headers:{Authorization:'Bearer '+session.token}});assert.equal(account.data.usage.used,1);assert.equal(account.data.user.hash,undefined);
 assert.equal((await post(server,'/api/logout',{},session.token)).status,200);
 assert.equal((await post(server,'/api/speech',{wordId:'hello'},session.token)).status,401);assert.equal(calls(),1);
});
test('daily budgets isolate learners and prevent upstream calls beyond the service limit',async t=>{
 const {server,calls}=await fixture(t,{dailyLimit:3,globalDailyLimit:4});const a=await signup(server,'alice'),b=await signup(server,'bravo');
 assert.equal((await post(server,'/api/conversation',{},a.token)).status,200);
 assert.equal((await post(server,'/api/speech',{},a.token)).status,429);
 assert.equal((await post(server,'/api/speech',{},b.token)).status,200);
 assert.equal((await post(server,'/api/speech',{},b.token)).status,429);assert.equal(calls(),2);
});
test('credentials, sessions, expired tokens and quotas survive database restarts without plaintext secrets',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'melorina-')),file=join(dir,'test.sqlite');let now=Date.now(),store=new Store(file,{inviteCode:INVITE,now:()=>now,dailyLimit:1});
 try{const session=await store.register({name:'learner',password:PASS,inviteCode:INVITE});store.reserve(session.user,'speech');store.close();store=new Store(file,{inviteCode:INVITE,now:()=>now,dailyLimit:1});
  assert.equal(store.authenticate(session.token).id,session.user.id);assert.throws(()=>store.reserve(session.user,'speech'),/allowance/);
  await assert.rejects(store.login({name:'learner',password:'wrong-password-long'}),/incorrect/);assert.equal((await store.login({name:'LEARNER',password:PASS})).user.id,session.user.id);
  const row=store.db.prepare('SELECT * FROM users').get();assert.notEqual(row.hash,PASS);assert.equal(row.hash.length,128);assert.notEqual(store.db.prepare('SELECT hash FROM sessions LIMIT 1').get().hash,session.token);
  now+=8*86400000;assert.throws(()=>store.authenticate(session.token),/expired/);store.reserve(session.user,'speech');
  store.close();store=null;const disk=readFileSync(file).toString();assert.ok(!disk.includes(PASS));assert.ok(!disk.includes(session.token));assert.ok(!disk.includes(INVITE));
 }finally{store?.close();rmSync(dir,{recursive:true,force:true});}
});
test('persistent sign-in throttling, strong credentials and account capacity cannot be bypassed by restart',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'melorina-')),file=join(dir,'test.sqlite'),opts={inviteCode:INVITE,maxAccounts:1,now:()=>180000};let store=new Store(file,opts);
 try{await assert.rejects(store.register({name:'learner',password:'short',inviteCode:INVITE}),/12/);await store.register({name:'learner',password:PASS,inviteCode:INVITE});await assert.rejects(store.register({name:'another',password:PASS,inviteCode:INVITE}),/paused/);
  for(let i=0;i<5;i++)store.authBudget('learner');store.close();store=new Store(file,opts);assert.throws(()=>store.authBudget('LEARNER'),/pause/);
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
test('one account cannot run concurrent AI requests and failed upstream attempts still consume quota',async t=>{
 const {server,provider,store}=await fixture(t);const session=await signup(server);let release,started;const ready=new Promise(r=>started=r);
 provider.speech=()=>{started();return new Promise(r=>release=r);};const pending=post(server,'/api/speech',{},session.token);await ready;
 assert.equal((await post(server,'/api/speech',{},session.token)).status,429);release(Buffer.from('mp3'));assert.equal((await pending).status,200);
 provider.speech=async()=>{throw Error('private upstream detail');};const failure=await post(server,'/api/speech',{},session.token);assert.equal(failure.status,500);assert.ok(!failure.text.includes('private'));assert.equal(store.usage(session.user).used,2);
});
test('owner password recovery preserves account identity, revokes sessions and supports account deletion',async()=>{
 const store=new Store(':memory:',{inviteCode:INVITE});
 try{const first=await store.register({name:'learner',password:PASS,inviteCode:INVITE});await store.resetPassword('learner','a-new-private-password');assert.throws(()=>store.authenticate(first.token),/expired/);await assert.rejects(store.login({name:'learner',password:PASS}),/incorrect/);
  const second=await store.login({name:'learner',password:'a-new-private-password'});assert.equal(second.user.id,first.user.id);store.revoke('learner');assert.throws(()=>store.authenticate(second.token),/expired/);store.deleteAccount('learner');await assert.rejects(store.login({name:'learner',password:'a-new-private-password'}),/incorrect/);
 }finally{store.close();}
});
