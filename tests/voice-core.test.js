const {test}=require('node:test'),assert=require('node:assert/strict');
const V=require('../src/voice-core'),E=require('../src/engine');
const attempt=(extra={})=>({id:'a',word:'water',mode:'spoken',outcome:'independent',session:'s',at:1000,confirmed:true,...extra});
test('voice profiles migrate without invented evidence and reject corrupt preferences',()=>{
 const s=V.validate({prefs:{voice:'unknown',sound:'toString',tone:'__proto__',version:'toString'},skills:{'x:spoken':{word:'x'}}});
 assert.equal(s.prefs.voice,'marin');assert.equal(s.prefs.sound,'all');assert.equal(s.prefs.tone,'warm');assert.deepEqual(s.skills,{});
});
test('spoken recall requires learner confirmation and listening requires playback',()=>{
 assert.throws(()=>V.observe(V.fresh(),attempt({confirmed:false})),/Confirm/);
 assert.throws(()=>V.observe(V.fresh(),attempt({mode:'listening',heard:false})),/Play the audio/);
 assert.throws(()=>V.observe(V.fresh(),attempt({assisted:true})),/Supported/);
});
test('voice evidence is separated by modality and cannot establish pronunciation',()=>{
 let s=V.observe(V.fresh(),attempt());s=V.observe(s,attempt({id:'b',mode:'listening',heard:true}));
 assert.equal(s.skills['water:spoken'].independent,1);assert.equal(s.skills['water:listening'].independent,1);assert.equal(s.skills['water:pronunciation'],undefined);
 assert.equal(s.events[0].source,'learner-confirmed-transcript');assert.equal(V.observe(s,attempt()),s);
});
test('immediate repairs preserve mastery and due dates, even after a successful retry',()=>{
 let s=V.observe(V.fresh(),attempt({outcome:'assisted',assisted:true}));const skills=JSON.stringify(s.skills);
 s=V.observe(s,attempt({id:'b',repair:true}));assert.equal(s.rehearsals.length,1);assert.equal(s.events.length,1);assert.equal(JSON.stringify(s.skills),skills);
 assert.equal(V.observe(s,attempt({id:'b',repair:true})),s);
});
test('later recall needs a different session and at least one day',()=>{
 let s=V.observe(V.fresh(),attempt());s=V.observe(s,attempt({id:'b',at:2000}));assert.equal(s.skills['water:spoken'].delayed,0);
 s=V.observe(s,attempt({id:'c',at:3000+E.DAY,session:'later'}));assert.equal(s.skills['water:spoken'].delayed,1);
});
test('personal targets and due voice evidence guide a three-turn interleaved plan',()=>{
 let s=V.target(V.fresh(),'water');const plan=V.plan(s,'spoken','Connection',null,1000);assert.deepEqual(plan.words,['water','hello','water']);
 s=V.observe(s,attempt({word:'coffee',outcome:'assisted',assisted:true}));assert.equal(V.plan(s,'spoken','Connection',null,E.DAY).words[0],'coffee');
 s.prefs.sound='haa';assert.equal(V.plan(s,'spoken','Connection').words[0],'hello');
});
test('pace following is opt-in, bounded, and needs enough speech',()=>{
 const p=V.fresh().prefs;assert.equal(V.paceFromSpeech(p,'this is a longer utterance',10),0.9);
 p.followPace=true;assert.equal(V.paceFromSpeech(p,'one',10),0.9);assert.equal(V.paceFromSpeech(p,'this is a longer utterance',10),0.75);
 assert.equal(V.paceFromSpeech(p,'this is a longer utterance',2),1);
});
test('voice controls accept only explicit known commands',()=>{
 assert.equal(V.command('Slow down!'),'slower');assert.equal(V.command('شوي شوي'),'slower');assert.equal(V.command('عيد'),'repeat');
 assert.equal(V.command('delete everything'),null);assert.equal(V.command('I stopped at the market'),null);
});
