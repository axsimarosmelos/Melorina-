// Controller integration in a minimal DOM stub. This is not a browser/layout test.
const {test}=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function boot(initialStorage){
  const nodes=new Map(),storage=new Map(initialStorage||[]);
  const node=key=>{if(!nodes.has(key))nodes.set(key,{innerHTML:'',textContent:'',value:'',handlers:{},classList:{add(){},remove(){}},addEventListener(e,f){this.handlers[e]=f;},focus(){},querySelectorAll(){return [];}});return nodes.get(key);};
  const context={console,Date,Math,JSON,Set,Map,Blob,URL,setTimeout:()=>1,clearTimeout(){},navigator:{},document:{querySelector:node,querySelectorAll:()=>[]},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},crypto:{randomUUID:require('node:crypto').randomUUID},addEventListener(){},scrollTo(){}};
  context.window=context;vm.createContext(context);
  for(const f of ['content','engine'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/'+f+'.js'),'utf8'),context);
  let app=fs.readFileSync(path.join(__dirname,'../src/app.js'),'utf8');
  app=app.replace('window.addEventListener(\'pagehide\',cleanupAudio);',"window.testAPI={startScenario,startPractice,submitAnswer,next,navigate,record,state:()=>state,session:()=>session};window.addEventListener('pagehide',cleanupAudio);");
  vm.runInContext(app,context);
  return {api:context.testAPI,nodes,storage,html:()=>node('#app').innerHTML,click:key=>node(key).handlers.click()};
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
