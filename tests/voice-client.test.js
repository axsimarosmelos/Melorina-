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
