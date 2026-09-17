const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../src/engine'),C=require('../src/content'),P=require('../src/practice');
function observe(state,word,mode,outcome,i=0){return E.observe(state,{id:'attempt-'+word+'-'+mode+'-'+i,word,mode,outcome,context:'test:'+i,session:'session-'+i,at:100000+i*100});}
test('a recognition miss does not unlock a harder recall recommendation',()=>{
  const s=observe(E.fresh(),'coffee','recognition','miss');
  assert.equal(E.recommend(s,C.words,100001).some(r=>r.word.id==='coffee'&&r.mode==='recall'),false);
  assert.equal(E.recommend(s,C.words,100000+20*60000)[0].mode,'recognition');
});
test('challenge needs several observations and stays specific to the word and task',()=>{
  let s=E.fresh();for(let i=0;i<3;i++)s=observe(s,'coffee','recall','assisted',i);
  assert.equal(E.challenge(s,'coffee','recall').kind,'explore');
  s=observe(s,'coffee','recall','assisted',3);
  assert.equal(E.challenge(s,'coffee','recall').kind,'support');
  assert.equal(E.challenge(s,'coffee','recognition').kind,'explore');
  assert.equal(E.challenge(s,'water','recall').sampleSize,0);
});
test('challenge responds to recent evidence rather than a lifetime level',()=>{
  let s=E.fresh();for(let i=0;i<6;i++)s=observe(s,'coffee','recall','independent',i);
  assert.equal(E.challenge(s,'coffee','recall').kind,'stretch');
  for(let i=6;i<12;i++)s=observe(s,'coffee','recall','assisted',i);
  assert.equal(E.challenge(s,'coffee','recall').kind,'support');
});
test('rehearsal is saved without inflating mastery or changing the review schedule',()=>{
  let s=observe(E.fresh(),'coffee','recall','assisted');const before=JSON.stringify(s.skills);
  const r={id:'repair-1',word:'coffee',mode:'recall',context:'repair',session:'session-0',at:100500};
  s=E.rehearse(s,r);assert.equal(JSON.stringify(s.skills),before);assert.equal(s.events.length,1);assert.equal(s.rehearsals.length,1);
  assert.equal(E.rehearse(s,r),s);assert.equal(E.finish(s,'session-0','focus',101000).sessions[0].rehearsals,1);
});
test('hinted responses cannot accidentally be marked independent',()=>{
  assert.throws(()=>E.observe(E.fresh(),{id:'a',word:'coffee',mode:'recall',outcome:'independent',context:'x',session:'s',hintLevel:1,at:1000}),/hint evidence/);
});
test('older profiles keep learning history and gain empty goal and rehearsal fields',()=>{
  const old=observe(E.fresh(),'hello','recall','independent');delete old.rehearsals;delete old.settings.conversationGoal;
  const s=E.validate(JSON.parse(JSON.stringify(old)));assert.equal(s.events.length,1);assert.equal(s.skills['hello:recall'].independent,1);assert.deepEqual(s.rehearsals,[]);assert.equal(s.settings.conversationGoal,'');
});
test('conversation goals are bounded and do not execute or overwrite the topic',()=>{
  const s=E.fresh();s.settings.conversationGoal='x'.repeat(300);s.settings.goal='Getting around';
  assert.equal(E.validate(s).settings.conversationGoal.length,160);assert.equal(E.validate(s).settings.goal,'Getting around');
});
test('a focused plan includes a different intervening word and a concrete new context',()=>{
  const p=P.plan(E.fresh(),'water',100000);assert.equal(p.word.id,'water');assert.equal(p.mode,'recognition');assert.equal(p.turns.length,3);
  assert.notEqual(p.turns[1].word,'water');assert.equal(p.turns[2].word,'water');assert.notEqual(p.turns[0].context,p.turns[2].context);assert.match(p.turns[2].line,/kiosk/);
});
test('the final task adapts to the first response, not to rehearsal success',()=>{
  const p=P.plan(E.fresh(),'coffee',100000);let s=observe(E.fresh(),'coffee','recognition','miss');
  s=E.rehearse(s,{id:'repair',word:'coffee',mode:'recall',context:'repair',session:'s',at:100500});
  assert.equal(P.adaptTransfer(p.turns,s,'coffee').mode,'recognition');
  s=observe(E.fresh(),'coffee','recognition','independent');assert.equal(P.adaptTransfer(p.turns,s,'coffee').mode,'recall');
});
test('every focus model uses defined vocabulary and actually includes its target',()=>{
  for(const w of C.words){const frame=C.practiceFrames[w.id];assert.ok(frame&&frame.situation&&frame.prompt);assert.ok(frame.chunks.some(c=>c.word===w.id));for(const c of frame.chunks)if(c.word)assert.ok(C.words.some(w=>w.id===c.word));}
});
