// Voice controller integration with mocked media/API and a minimal DOM. No browser or live API claims.
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function boot({configured=true,authRequired=false,transcript='ماي',reply={arabic:'مرحبا',latin:'marhaba',english:'Hello',feedback:'Try one useful word.',focusWord:'water'}}={}){
 const nodes=new Map();const node=s=>{if(!nodes.has(s))nodes.set(s,{dataset:{},addEventListener(event,fn){this[event]=fn;}});return nodes.get(s);};
 const context={console,Date,Math,Set,Map,Blob,URL,crypto:require('node:crypto').webcrypto,document:{querySelector:node,querySelectorAll:()=>[]}};context.globalThis=context;vm.createContext(context);
 for(const f of ['content','engine','voice-core'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/'+f+'.js'),'utf8'),context);
 let source=fs.readFileSync(path.join(__dirname,'../src/voice-ui.js'),'utf8');source=source.replace('return {render,bind,enter,leave,growth,startDrill};','return {render,bind,enter,leave,growth,startDrill,startRecording,transcribe,confirm,answerListening,listen,repair,next,startChat,sendChat,applyCommand,authenticate,useBackend,signOut,debug:()=>({page,drill,chat,busy,recording,transcript})};');vm.runInContext(source,context);
 let state=context.MelorinaVoiceCore.fresh(),calls=[],ui,html='';
 const client={cancel(){},speak:async data=>{calls.push({kind:'speech',data});return true;},record:async cb=>{cb('permission');cb('recording');return {blob:new Blob(['audio'],{type:'audio/webm'}),seconds:3};},stopRecording(){},request:async(kind,data)=>{calls.push({kind,data});if(kind==='status')return {configured,authRequired};if(kind==='transcribe')return {text:transcript};if(kind==='conversation')return reply;}};
 ui=context.MelorinaVoiceUI.create({read:()=>state,write:s=>{state=s;},goal:()=>({goal:'Everyday life',conversationGoal:'Meet <a neighbour>'}),update:()=>{if(ui){html=ui.render();ui.bind();}},client});html=ui.render();ui.bind();
 return {ui,client,calls,state:()=>state,html:()=>ui.render(),enable:()=>node('[data-v-consent]').change({target:{checked:true}}),node};
}
const tick=()=>new Promise(r=>setImmediate(r));
test('voice setup is honest without credentials and text-only interaction remains available',async()=>{
 const b=boot({configured:false});b.ui.enter();await tick();assert.match(b.html(),/Voice setup needed/);b.enable();b.ui.startDrill('spoken','water');await b.ui.startRecording('word');assert.equal(b.calls.some(c=>c.kind==='transcribe'),false);assert.deepEqual(Object.keys(b.state().skills),[]);
});
test('word recording uploads only on request and scores only after transcript confirmation',async()=>{
 const b=boot();b.ui.enter();await tick();b.enable();b.ui.startDrill('spoken','water');await b.ui.startRecording('word');
 assert.equal(b.calls.some(c=>c.kind==='transcribe'),false);await b.ui.transcribe();assert.equal(b.state().events.length,0);assert.match(b.html(),/CHECK WHAT WAS HEARD/);
 b.ui.confirm();assert.equal(b.state().events.length,1);assert.equal(b.state().skills['water:spoken'].independent,1);assert.equal(b.state().skills['water:listening'],undefined);
});
test('unmatched speech is not a failure and optional retry stays separate from mastery',async()=>{
 const b=boot({transcript:'قهوة'});b.ui.enter();await tick();b.enable();b.ui.startDrill('spoken','water');await b.ui.startRecording('word');await b.ui.transcribe();b.ui.confirm();assert.equal(b.state().events.length,0);assert.match(b.html(),/No miss was recorded/);
 b.ui.repair();assert.equal(b.ui.debug().drill.repair,true);b.client.request=async()=>({text:'ماي'});await b.ui.startRecording('word');await b.ui.transcribe();b.ui.confirm();assert.equal(b.state().events.length,0);assert.equal(b.state().rehearsals.length,1);
});
test('listening hides the written target, requires playback, and preserves replay support',async()=>{
 const b=boot();b.ui.enter();await tick();b.enable();b.ui.startDrill('listening','water');assert.doesNotMatch(b.html(),/class="voice-model"/);b.ui.answerListening('water');assert.equal(b.state().events.length,0);
 await b.ui.listen();await b.ui.listen();b.ui.answerListening('water');assert.equal(b.state().skills['water:listening'].assisted,1);b.ui.next();assert.equal(b.ui.debug().drill.index,1);assert.equal(b.ui.debug().drill.hinted,false);
});
test('sound workshop is rehearsal and never creates pronunciation or recall mastery',async()=>{
 const b=boot();b.ui.enter();await tick();b.enable();b.ui.startDrill('sound','water');await b.ui.startRecording('word');await b.ui.transcribe();b.ui.confirm();assert.equal(b.state().events.length,0);assert.equal(b.state().rehearsals.length,1);assert.equal(Object.keys(b.state().skills).length,0);
});
test('conversation uses selected style, keeps replies escaped, and adds no invented proficiency',async()=>{
 const b=boot({reply:{arabic:'<script>alert(1)</script>',latin:'model',english:'example',feedback:'Try again',focusWord:'water'}});b.ui.enter();await tick();b.enable();b.ui.startChat();await tick();assert.match(b.html(),/&lt;script&gt;/);assert.doesNotMatch(b.html(),/<script>alert/);
 await b.ui.sendChat('مرحبا');const request=b.calls.filter(c=>c.kind==='conversation').at(-1);assert.equal(request.data.version,'guided');assert.equal(request.data.tone,'warm');assert.equal(b.state().events.length,0);assert.equal(b.ui.debug().chat.turns,1);
});
test('leaving during a response discards a late result',async()=>{
 const b=boot();b.ui.enter();await tick();b.enable();let resolve;b.client.request=()=>new Promise(r=>resolve=r);b.ui.startChat();b.ui.leave();resolve({arabic:'مرحبا',latin:'marhaba',english:'hello',feedback:'',focusWord:'none'});await tick();assert.equal(b.ui.debug().page,'home');assert.equal(b.ui.debug().chat,null);assert.equal(b.calls.filter(c=>c.kind==='speech').length,0);
});
test('commands have their own review controls during listening and do not count as learning attempts',async()=>{
 const b=boot({transcript:'slower'});b.ui.enter();await tick();b.enable();b.ui.startDrill('listening','water');await b.ui.startRecording('command');
 assert.match(b.html(),/Transcribe recording/);assert.match(b.html(),/class="voice-commands" open/);await b.ui.transcribe();assert.match(b.html(),/Yes, use this command/);b.ui.confirm();assert.equal(b.state().events.length,0);assert.match(b.html(),/A little slower/);
});
test('sound repair hides the model and the final listening task does not reveal the target through its scene',async()=>{
 const b=boot();b.ui.enter();await tick();b.enable();b.ui.startDrill('sound','water');await b.ui.startRecording('word');await b.ui.transcribe();b.ui.confirm();b.ui.repair();assert.doesNotMatch(b.html(),/class="voice-model"/);
 b.ui.startDrill('listening','water');await b.ui.listen();b.ui.answerListening('water');b.ui.next();await b.ui.listen();b.ui.answerListening('hello');b.ui.next();assert.doesNotMatch(b.html(),/kiosk|ask for water/);assert.doesNotMatch(b.html(),/class="voice-model"/);
});

test('hosted voice requires sign-in and consent before recording or upstream practice',async()=>{
 const b=boot({authRequired:true});b.ui.enter();await tick();assert.match(b.html(),/Sign in to start/);
 b.ui.startDrill('spoken','water');await b.ui.startRecording('word');assert.equal(b.calls.some(x=>x.kind==='transcribe'),false);
 b.client.signIn=async()=>{b.client.user={id:'one',name:'learner'};b.client.token='token';};b.client.profileKey=()=> 'voice:one';b.client.account=async()=>({user:b.client.user,usage:{remaining:80,limit:80}});
 await b.ui.authenticate({name:'learner',password:'long-private-password'});assert.match(b.html(),/Signed in as/);
 b.ui.startDrill('spoken','water');await b.ui.startRecording('word');assert.doesNotMatch(b.html(),/Transcribe recording/);
 b.enable();await b.ui.startRecording('word');assert.match(b.html(),/Transcribe recording/);
});
test('expired account discards pending practice without saving learner evidence',async()=>{
 const b=boot({authRequired:true});b.ui.enter();await tick();b.client.signIn=async()=>{b.client.user={id:'one',name:'learner'};b.client.token='token';};b.client.profileKey=()=> 'voice:one';b.client.account=async()=>({user:b.client.user,usage:{remaining:80,limit:80}});
 await b.ui.authenticate({});b.enable();b.ui.startDrill('listening','water');b.client.speak=async()=>{const e=Error('Please sign in');e.status=401;throw e;};await b.ui.listen();assert.equal(b.ui.debug().page,'home');assert.equal(b.state().events.length,0);assert.match(b.html(),/Sign in to start/);
});

test('opening a word immediately after entering voice restarts a cancelled connection check',async()=>{
 const b=boot();let firstResolve,calls=0;b.client.request=async()=>{calls++;if(calls===1)return new Promise(r=>firstResolve=r);return {configured:true};};
 b.ui.enter();b.ui.startDrill('spoken','water');await tick();assert.match(b.html(),/Voice configured/);firstResolve({configured:false});await tick();assert.match(b.html(),/Voice configured/);
});
