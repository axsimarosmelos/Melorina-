const {test}=require('node:test'),assert=require('node:assert/strict');
const VoiceClient=require('../src/voice-client');
const tick=()=>new Promise(r=>setImmediate(r));
test('leaving while microphone permission is pending releases a late stream',async()=>{
 let allow,stopped=0;const env={navigator:{mediaDevices:{getUserMedia:()=>new Promise(r=>allow=r)}},MediaRecorder:class{static isTypeSupported(){return true;}},URL:{revokeObjectURL(){}}};
 const client=new VoiceClient(env),recording=client.record(()=>{});client.cancel();allow({getTracks:()=>[{stop(){stopped++;}}]});assert.equal(await recording,null);assert.equal(stopped,1);
});
test('recording stays local until an explicit transcription request and cancel releases tracks',async()=>{
 let fetches=0,stops=0;class Recorder{static isTypeSupported(){return true;}constructor(){this.state='inactive';this.mimeType='audio/webm';}start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['sample'])});this.onstop?.();}}
 const env={navigator:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop(){stops++;}}]})}},MediaRecorder:Recorder,URL:{revokeObjectURL(){}},fetch:async()=>{fetches++;return Response.json({text:'مرحبا'});}};
 const client=new VoiceClient(env),pending=client.record(()=>{});await tick();client.stopRecording();const result=await pending;assert.equal(fetches,0);assert.ok(result.blob.size>0);assert.equal(stops,1);
 await client.request('transcribe',result.blob,true);assert.equal(fetches,1);
 const second=client.record(()=>{});await tick();client.cancel();assert.equal(await second,null);assert.equal(stops,2);
});
test('listening completion waits for the audio and cancel resolves pending playback',async()=>{
 let player,revoked=0;class Audio{constructor(){player=this;}async play(){}pause(){}}
 const client=new VoiceClient({fetch:async()=>new Response('mp3'),Audio,URL:{createObjectURL:()=> 'blob:audio',revokeObjectURL(){revoked++;}}});
 let completed=false;const p=client.speak({text:'مرحبا'}).then(v=>{completed=true;return v;});await tick();assert.equal(completed,false);player.onended();assert.equal(await p,true);assert.equal(revoked,1);
 const p2=client.speak({text:'مرحبا'});await tick();client.cancel();assert.equal(await p2,false);assert.equal(revoked,2);
});
test('cancel aborts pending network calls and a late speech response does not play',async()=>{
 let resolve,signal,plays=0;const client=new VoiceClient({fetch:(url,opts)=>{signal=opts.signal;return new Promise(r=>resolve=r);},Audio:class{play(){plays++;}},URL:{revokeObjectURL(){}}});
 const pending=client.speak({text:'مرحبا'});client.cancel();assert.equal(signal.aborted,true);resolve(new Response('mp3'));assert.equal(await pending,false);assert.equal(plays,0);
});
test('failed speech and transcription requests surface usable errors',async()=>{
 const client=new VoiceClient({fetch:async()=>Response.json({error:'Voice not configured'},{status:503})});await assert.rejects(client.request('transcribe',new Blob(['x']),true),/Voice not configured/);
});
function storage(){const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k),map};}
function hostedEnv(fetch){return {location:{protocol:'https:',hostname:'axsimarosmelos.github.io',origin:'https://axsimarosmelos.github.io',hash:''},localStorage:storage(),sessionStorage:storage(),fetch,URL:{revokeObjectURL(){}}};}
test('Pages does not pretend to have a backend; connection requires an explicitly trusted HTTPS origin',async()=>{
 let calls=0;const env=hostedEnv(async()=>{calls++;return Response.json({});}),client=new VoiceClient(env);
 await assert.rejects(client.request('status'),/not been connected/);assert.equal(calls,0);
 for(const value of ['http://evil.test','https://user:secret@evil.test','https://voice.test/api','https://voice.test/?key=secret','javascript:alert(1)'])assert.throws(()=>client.setBackend(value),/HTTPS/);
 env.location.hash='#connect=https%3A%2F%2Fvoice.test';assert.equal(client.suggestedBackend(),'https://voice.test');assert.equal(client.baseUrl,null);
 client.setBackend(client.suggestedBackend());assert.equal(client.baseUrl,'https://voice.test');
});
test('hosted client attaches account tokens to the selected origin, rejects redirects, and clears on 401',async()=>{
 const calls=[],token='a'.repeat(43),user={id:'12345678-1234-1234-1234-123456789abc',name:'learner'};
 const env=hostedEnv(async(url,opts)=>{calls.push({url,opts});return url.endsWith('/login')?Response.json({token,user,expires:Date.now()+60000}):Response.json({error:'Expired'},{status:401});}),client=new VoiceClient(env);
 client.setBackend('https://voice.test');await client.signIn('login',{name:'learner',password:'a-private-password'});
 assert.equal(calls[0].opts.headers.Authorization,undefined);assert.equal(client.profileKey(),'https%3A%2F%2Fvoice.test:'+user.id);
 assert.ok(![...env.localStorage.map.values()].join('').includes(token));
 await assert.rejects(client.request('speech',{}),/Expired/);assert.equal(calls[1].url,'https://voice.test/api/speech');assert.equal(calls[1].opts.headers.Authorization,'Bearer '+token);assert.equal(calls[1].opts.redirect,'error');assert.equal(calls[1].opts.credentials,'omit');assert.equal(client.token,'');assert.equal(env.sessionStorage.map.size,0);
});
test('switching service clears credentials and a stale login cannot authenticate the new service',async()=>{
 let resolve;const env=hostedEnv(()=>new Promise(r=>resolve=r)),client=new VoiceClient(env);client.setBackend('https://first.test');
 const pending=client.signIn('login',{name:'learner',password:'long-private-password'});client.setBackend('https://second.test');resolve(Response.json({token:'b'.repeat(43),user:{id:'one',name:'learner'},expires:Date.now()+60000}));
 await assert.rejects(pending,/cancelled/);assert.equal(client.token,'');assert.equal(client.user,null);assert.equal(env.sessionStorage.map.size,0);
});
test('corrupt backend preferences do not crash text app startup',()=>{
 const env=hostedEnv();env.localStorage.setItem('melorina.backend','not a URL');assert.equal(new VoiceClient(env).baseUrl,null);
});
