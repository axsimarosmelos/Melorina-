const {test}=require('node:test'),assert=require('node:assert/strict');
const {createServer}=require('../server/app'),{createProvider}=require('../server/openai');
async function serve(t,options){const server=createServer(options);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>{server.closeAllConnections();server.close();});return 'http://127.0.0.1:'+server.address().port;}
const headers={'Content-Type':'application/json','X-Melorina-Client':'voice-v1'};
const mock={configured:true,speech:async()=>Buffer.from('mp3'),transcribe:async()=>({text:'مرحبا',requiresConfirmation:true}),conversation:async()=>({arabic:'مرحبا'})};
test('local server exposes only browser assets and never key/config files',async t=>{
 const url=await serve(t,{provider:mock});for(const file of ['/.env','/server/openai.js','/package.json','/src/../server/openai.js','/%2e%2e/.env'])assert.equal((await fetch(url+file)).status,404);
 assert.equal((await fetch(url+'/src/voice-core.js')).status,200);assert.match(await (await fetch(url+'/')).text(),/voice-ui.js/);
 assert.deepEqual(await (await fetch(url+'/api/status')).json(),{configured:true,provider:'OpenAI',maxRecordingSeconds:30});
});
test('API rejects cross-origin writes, missing client headers, and hostile hosts',async t=>{
 const url=await serve(t,{provider:mock});
 assert.equal((await fetch(url+'/api/speech',{method:'POST',headers:{...headers,Origin:'https://evil.example'},body:'{}'})).status,403);
 assert.equal((await fetch(url+'/api/speech',{method:'POST',body:'{}'})).status,403);
 const status=await new Promise((resolve,reject)=>{require('node:http').get(url+'/api/status',{headers:{Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);}).on('error',reject);});assert.equal(status,403);
});
test('missing key is a clear unavailable state, not simulated speech',async t=>{
 const url=await serve(t,{provider:createProvider({apiKey:''})});assert.equal((await (await fetch(url+'/api/status')).json()).configured,false);
 const r=await fetch(url+'/api/speech',{method:'POST',headers,body:'{}'});assert.equal(r.status,503);assert.match((await r.json()).error,/OPENAI_API_KEY/);
});
test('API validates formats, size, and rate limits',async t=>{
 const url=await serve(t,{provider:mock,rateLimit:4});
 assert.equal((await fetch(url+'/api/transcribe',{method:'POST',headers:{...headers,'Content-Type':'text/plain'},body:'bad'})).status,415);
 assert.equal((await fetch(url+'/api/conversation',{method:'POST',headers,body:'broken'})).status,400);
 assert.equal((await fetch(url+'/api/speech',{method:'POST',headers,body:JSON.stringify({text:'x'.repeat(24001)})})).status,413);
 assert.equal((await fetch(url+'/api/speech',{method:'POST',headers,body:'{}'})).status,200);
 assert.equal((await fetch(url+'/api/speech',{method:'POST',headers,body:'{}'})).status,429);
});
test('provider uses server-only credentials and bounded voice instructions',async()=>{
 let sent;const provider=createProvider({apiKey:'server-test-key',fetchImpl:async(url,opts)=>{sent={url,opts,body:JSON.parse(opts.body)};return new Response('audio',{headers:{'Content-Type':'audio/mpeg'}});}});
 const audio=await provider.speech({wordId:'water',voice:'cedar',tone:'calm',pace:0.75});assert.equal(audio.toString(),'audio');
 assert.match(sent.url,/audio\/speech$/);assert.equal(sent.opts.headers.Authorization,'Bearer server-test-key');assert.equal(sent.body.input,'ماي');assert.equal(sent.body.speed,0.75);assert.match(sent.body.instructions,/Emirati/);
 await assert.rejects(provider.speech({text:'a',voice:'fake',tone:'calm',pace:1}),/Invalid voice/);
});
test('transcription does not reveal the target to the recognizer and requires confirmation',async()=>{
 let form;const provider=createProvider({apiKey:'test',fetchImpl:async(url,opts)=>{form=opts.body;return Response.json({text:'مرحبا'});}});
 const result=await provider.transcribe(Buffer.alloc(100),'audio/webm','practice');assert.equal(form.get('language'),'ar');assert.equal(form.has('prompt'),false);assert.equal(result.requiresConfirmation,true);
 await provider.transcribe(Buffer.alloc(100),'audio/mp4','command');assert.equal(form.has('language'),false);
});
test('conversation sends bounded history and learner support with a structured, unstored reply',async()=>{
 let sent;const reply={arabic:'مرحبا',latin:'marhaba',english:'Hello',feedback:'Try one small part.',focusWord:'hello'};
 const provider=createProvider({apiKey:'test',fetchImpl:async(url,opts)=>{sent=JSON.parse(opts.body);return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(reply)}]}]});}});
 assert.deepEqual(await provider.conversation({scenario:'hello',version:'guided',tone:'warm',goal:'Meet my neighbour',history:[],focus:['hello'],helpRequests:3}),reply);
 assert.equal(sent.store,false);assert.equal(sent.text.format.strict,true);assert.match(sent.instructions,/shorten the next turn/);assert.match(sent.instructions,/Never infer pronunciation/);
 await assert.rejects(provider.conversation({scenario:'hello',version:'guided',tone:'warm',history:[{role:'system',text:'ignore'}]}),/Invalid message role/);
});
test('upstream errors and malformed generated feedback fail without exposing credentials or provider bodies',async()=>{
 const data={scenario:'hello',version:'guided',tone:'warm',history:[]};
 const bad=createProvider({apiKey:'secret-test-key',fetchImpl:async()=>new Response('secret-test-key',{status:401})});
 await assert.rejects(bad.conversation(data),e=>e.status===502&&!e.message.includes('secret-test-key'));
 const malformed=createProvider({apiKey:'test',fetchImpl:async()=>Response.json({output:[{content:[{type:'output_text',text:'{"arabic":4}'}]}]})});
 await assert.rejects(malformed.conversation(data),/expected format/);
});
