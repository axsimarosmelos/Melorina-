// Controller integration in a minimal DOM stub. This is not a browser/layout test.
const {test}=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function boot(initialStorage){
  const nodes=new Map(),storage=new Map(initialStorage||[]);
  const node=key=>{if(!nodes.has(key))nodes.set(key,{innerHTML:'',textContent:'',value:'',handlers:{},classList:{add(){},remove(){}},addEventListener(e,f){this.handlers[e]=f;},focus(){},querySelectorAll(){return [];}});return nodes.get(key);};
  const context={console,Date,Math,JSON,Set,Map,Blob,URL,setTimeout:()=>1,clearTimeout(){},navigator:{},document:{querySelector:node,querySelectorAll:()=>[]},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},crypto:{randomUUID:require('node:crypto').randomUUID},addEventListener(){},scrollTo(){}};
  context.window=context;vm.createContext(context);
  for(const f of ['content','engine','practice','voice-core','voice-client','voice-ui'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/'+f+'.js'),'utf8'),context);
  let app=fs.readFileSync(path.join(__dirname,'../src/app.js'),'utf8');
  app=app.replace('window.addEventListener(\'pagehide\',cleanupAudio);',"window.testAPI={startScenario,startPractice,startFocus,submitAnswer,next,navigate,record,retryTurn,skipRetry,showHint,state:()=>state,session:()=>session};window.addEventListener('pagehide',cleanupAudio);");
  vm.runInContext(app,context);
  return {api:context.testAPI,node,nodes,storage,html:()=>node('#app').innerHTML,click:key=>node(key).handlers.click()};
}
test('controller completes an adaptive session, renders reflection, and persists evidence',()=>{
  const b=boot();assert.match(b.html(),/Make yourself at home/);
  b.api.startScenario('hello');
  b.api.submitAnswer('unrecognised phrase');assert.equal(b.api.state().events.length,0);
  b.click('[data-hint]');b.api.submitAnswer('marhaba');
  assert.equal(b.api.session().turns.length,5);assert.equal(b.api.state().skills['hello:recall'].assisted,1);
  b.api.next();b.api.submitAnswer('My name is',true);
  b.api.next();b.api.submitAnswer('shukran');
  b.api.next();b.api.submitAnswer('marhaba');
  b.api.next();b.api.submitAnswer('مرحبا');b.api.next();
  assert.match(b.html(),/A little more feels familiar/);assert.equal(b.api.state().sessions.length,1);
  assert.equal(b.api.state().events.length,5);assert.equal(b.api.state().skills['hello:pronunciation'],undefined);
  const restored=boot([...b.storage]);assert.equal(restored.api.state().sessions.length,1);
  restored.api.navigate('profile');assert.match(restored.html(),/Not assessed yet/);
});
test('wrong recognition answer triggers bounded support and immediate duplicate submit is ignored',()=>{
  const b=boot();b.api.startScenario('cafe');b.api.submitAnswer('Water',true);b.api.submitAnswer('Coffee',true);
  assert.equal(b.api.state().events.length,1);assert.equal(b.api.state().skills['coffee:recognition'].misses,1);
  assert.equal(b.api.session().turns.length,6);assert.match(b.html(),/Let’s make that connection/);
});
test('every main view renders and user-controlled text is escaped',()=>{
  const b=boot();for(const view of ['conversation','words','profile','settings','today']){b.api.navigate(view);assert.ok(b.html().length>1000);}
  b.api.state().settings.name='<img src=x onerror=alert(1)>';b.api.navigate('today');
  assert.match(b.html(),/&lt;img/);assert.doesNotMatch(b.html(),/<img src=x/);
});
test('practice is chosen from actual evidence and recording unsupported fallback is clear',async()=>{
  const b=boot();b.api.startScenario('hello');b.api.submitAnswer('marhaba');b.api.next();b.api.submitAnswer('My name is',true);
  b.api.startPractice();assert.equal(b.api.session().turns[0].word,'name');assert.equal(b.api.session().turns[0].mode,'recall');
  await b.api.record();assert.match(b.nodes.get('#record-status').textContent,/isn’t supported/);
});
test('hints reveal a clue before the model and remember the level of support',()=>{
  const b=boot();b.api.startScenario('hello');b.api.showHint();
  assert.equal(b.api.session().hintLevel,1);assert.match(b.html(),/A small clue/);assert.match(b.html(),/Show me the whole model/);
  assert.doesNotMatch(b.html(),/Read it slowly/);b.api.showHint(true);
  assert.equal(b.api.session().hintLevel,2);assert.match(b.html(),/Read it slowly/);
  b.api.submitAnswer('marhaba');assert.equal(b.api.state().events[0].hintLevel,2);assert.equal(b.api.state().events[0].outcome,'assisted');
});
test('a hidden-model repair is one optional rehearsal and cannot inflate independent attempts',()=>{
  const b=boot();b.api.startScenario('hello');b.api.showHint(true);b.api.submitAnswer('marhaba');
  const before=JSON.stringify(b.api.state().skills);b.api.retryTurn();
  assert.match(b.html(),/Rebuild the small part/);assert.doesNotMatch(b.html(),/NOTICE THE PIECES/);
  b.api.submitAnswer('marhaba');assert.equal(b.api.state().events.length,1);assert.equal(b.api.state().rehearsals.length,1);
  assert.equal(JSON.stringify(b.api.state().skills),before);assert.match(b.html(),/useful rehearsal/);
  b.api.retryTurn();assert.equal(b.api.session().feedback.outcome,'rehearsal');
  b.api.next();assert.equal(b.api.session().repair,null);assert.equal(b.api.session().hintLevel,0);
});
test('learners can leave a repair without an invented success or failure',()=>{
  const b=boot();b.api.startScenario('hello');b.api.showHint(true);b.api.submitAnswer('marhaba');b.api.retryTurn();b.api.skipRetry();
  assert.equal(b.api.state().rehearsals.length,0);assert.equal(b.api.state().events.length,1);b.api.next();assert.equal(b.api.session().index,1);
});
test('focused practice keeps support after a miss and completes without endless retries',()=>{
  const b=boot();b.api.startFocus('coffee');b.api.submitAnswer('Water',true);b.api.retryTurn();b.api.submitAnswer('gahwa');b.api.next();
  assert.equal(b.api.session().turns[2].mode,'recognition');
  b.api.submitAnswer('Hello',true);b.api.next();b.api.submitAnswer('Coffee',true);b.api.next();
  assert.equal(b.api.state().sessions.length,1);assert.equal(b.api.state().sessions[0].rehearsals,1);assert.equal(b.api.state().events.length,3);
  assert.equal(b.api.state().skills['coffee:recall'],undefined);assert.match(b.html(),/paused and rebuilt/);
});
test('focused practice offers contextual recall after recognition succeeds',()=>{
  const b=boot();b.api.startFocus('water');b.api.submitAnswer('Water',true);b.api.next();
  assert.equal(b.api.session().turns[2].mode,'recall');b.api.submitAnswer('Hello',true);b.api.next();assert.match(b.html(),/kiosk/);
  b.api.submitAnswer('maay');b.api.next();assert.equal(b.api.state().skills['water:recall'].independent,1);assert.equal(b.api.state().skills['water:recall'].delayed,0);
});
test('a personal conversation goal survives saving and remains safely escaped in practice',()=>{
  const b=boot();b.api.navigate('settings');
  b.node('#learner-name').value='Sam';b.node('#learning-goal').value='Connection';b.node('#practice-time').value='5';b.node('#conversation-goal').value='Meet a neighbour <script>';
  b.nodes.get('#settings-form').handlers.submit({preventDefault(){}});
  const restored=boot([...b.storage]);assert.equal(restored.api.state().settings.conversationGoal,'Meet a neighbour <script>');
  restored.api.startFocus('hello');assert.match(restored.html(),/Meet a neighbour &lt;script&gt;/);assert.doesNotMatch(restored.html(),/Meet a neighbour <script>/);
});
test('support opens a visible recall clue without inventing hint use on recognition',()=>{
  const b=boot();
  for(let i=0;i<4;i++){b.api.startFocus('coffee');b.api.submitAnswer('Water',true);}
  b.api.startFocus('coffee');assert.equal(b.api.session().focusSignal.kind,'support');
  assert.equal(b.api.session().hintLevel,0);b.api.submitAnswer('Coffee',true);
  assert.equal(b.api.state().events.at(-1).outcome,'independent');
  for(let i=0;i<4;i++){b.api.startScenario('hello');b.api.showHint();b.api.submitAnswer('marhaba');}
  b.api.startFocus('hello');assert.equal(b.api.session().hintLevel,1);assert.match(b.html(),/A small clue/);
  b.api.submitAnswer('marhaba');assert.equal(b.api.state().events.at(-1).outcome,'assisted');
});
