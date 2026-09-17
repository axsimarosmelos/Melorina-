(function(){
'use strict';
const C=window.MelorinaContent,E=window.MelorinaEngine,P=window.MelorinaPractice,STORE='melorina.v1';
const $=s=>document.querySelector(s), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>window.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);
let state=E.fresh(), view='today', session=null, storageOK=true, search='', filter='all', recorder=null, stream=null, clipURL=null, recordTimer=null, recordToken=0;
try{const raw=localStorage.getItem(STORE);if(raw)state=E.validate(JSON.parse(raw));}catch{storageOK=false;}
const paths={home:'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',chat:'M21 11a8 8 0 0 1-8 8H6l-4 3V11a9 9 0 0 1 19 0ZM7 10h10M7 14h6',book:'M3 4h6a4 4 0 0 1 3 2 4 4 0 0 1 3-2h6v15h-6a4 4 0 0 0-3 2 4 4 0 0 0-3-2H3ZM12 6v15',plant:'M12 21v-9M12 16C3 17 3 9 3 9s9-1 9 7ZM12 12c-1-8 8-9 8-9s2 8-8 9',arrow:'M5 12h14M13 6l6 6-6 6',back:'M19 12H5M11 6l-6 6 6 6',spark:'m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7Z',clock:'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',cup:'M4 8h13v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5ZM17 9h2a3 3 0 0 1 0 6h-2M7 3v2M11 2v3M15 3v2',compass:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M16 8l-3 5-5 3 3-5Z',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',check:'m5 12 4 4L19 6',repeat:'M19 8a8 8 0 0 0-14-2L2 9M2 3v6h6M5 16a8 8 0 0 0 14 2l3-3M22 21v-6h-6',mic:'M8 6a4 4 0 0 1 8 0v6a4 4 0 0 1-8 0ZM5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8',shield:'m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6ZM8 12l3 3 5-6',ear:'M7 8a5 5 0 0 1 10 0c0 4-4 4-4 8a3 3 0 0 1-6 0M10 8a2 2 0 0 1 4 0c0 2-2 2-2 4',download:'M12 3v12M7 10l5 5 5-5M4 16v5h16v-5',close:'m6 6 12 12M6 18 18 6'};
const icon=name=>'<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="'+(paths[name]||paths.spark)+'"/></svg>';
const brand='<span class="brand-mark" aria-hidden="true"><i></i><i></i></span>melorina';
const pill=s=>'<span class="pill tone-'+s.tone+'">'+esc(s.label)+'</span>';
const wordById=id=>C.words.find(w=>w.id===id);
function save(){try{localStorage.setItem(STORE,JSON.stringify(state));storageOK=true;}catch{storageOK=false;toast('Progress could not be saved. You can export it from your profile.');}}
let toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4000);}
function activeNav(id){return view===id||(id==='conversation'&&['session','complete','practice'].includes(view));}
function render(){
const nav=[['today','home','Today'],['conversation','chat','Conversations'],['words','book','Your words'],['profile','plant','Your growth']];
const count=new Set(Object.values(state.skills).map(s=>s.word)).size;
$('#app').innerHTML='<div class="app-shell"><aside class="sidebar"><div class="brand">'+brand+'</div><div class="nav-label">YOUR LEARNING SPACE</div><nav aria-label="Main navigation">'+nav.map(([id,i,label])=>'<button class="nav-item '+(activeNav(id)?'active':'')+'" data-view="'+id+'" '+(activeNav(id)?'aria-current="page"':'')+'>'+icon(i)+'<span>'+label+'</span>'+(id==='words'&&count?'<span class="nav-count">'+count+'</span>':'')+'</button>').join('')+'</nav><div class="sidebar-bottom"><div class="side-note">'+icon('plant')+'<p>A little practice.<br>A world of connection.</p></div><button class="nav-item" data-view="settings">'+icon('settings')+'Your preferences</button></div></aside><div class="main-wrap"><header class="topbar"><span class="breadcrumb">Your learning space <span style="margin:0 8px;color:#bdc6b8">/</span> '+({today:'Today',conversation:'Conversations',words:'Your words',profile:'Your growth',settings:'Preferences',session:'Conversation',practice:'Personal practice',complete:'Session reflection'}[view])+'</span><div class="mobile-brand">'+brand+'</div><div class="header-right"><span class="language"><i class="uae-flag" aria-hidden="true"></i>Emirati Arabic</span><button class="avatar-button" data-view="settings" aria-label="Open your preferences"><span class="avatar">'+esc(state.settings.name?state.settings.name.slice(0,1).toUpperCase():'Y')+'</span></button></div></header><main id="main" class="main">'+(!storageOK?'<div class="storage-warning" role="status">Your browser is not saving progress. Keep this page open, or export your progress from Your growth.</div>':'')+({today:dashboard,conversation:conversations,words:wordsView,profile:profile,settings:settings,session:sessionView,practice:sessionView,complete:completion}[view]||dashboard)()+'</main></div></div>';
bind();
}
function scenarioCard(s){const completed=state.sessions.some(x=>x.scenario===s.id);return '<button class="scenario-card" data-start="'+s.id+'"><span class="scenario-icon '+s.color+'">'+icon(s.icon)+'</span><span class="eyebrow">'+s.tag+'</span><h3>'+s.title+'</h3><p>'+s.subtitle+'</p><span class="scenario-footer">'+(completed?'Explore again':'A short guided conversation')+icon('arrow')+'</span></button>';}
function dashboard(){
const due=E.recommend(state,C.words).filter(r=>r.priority>=100), seen=Object.keys(state.skills).length;
const greeting=state.settings.name?'Hello, '+esc(state.settings.name)+'.':'Make yourself at home.';
const newUser=state.sessions.length===0;
return '<div class="welcome-row"><div><h1>'+greeting+'</h1><p>Your Arabic journey, shaped around you.</p></div><div class="date-chip">'+icon('plant')+'One conversation at a time</div></div><div class="dashboard-grid"><section class="hero"><div class="hero-copy"><div class="eyebrow">YOUR WORDS. YOUR WORLD.</div><h2>A little closer to<br>a real conversation.</h2><p>Find your words. Build your confidence.<br>Discover Arabic at your own rhythm.</p><button class="primary" '+(due.length?'data-practice':'data-start="hello"')+'>'+(due.length?'Pick up where you left off':newUser?'Let’s have a first conversation':'Let’s keep the conversation going')+icon('arrow')+'</button><p class="hero-meta">'+icon('spark')+'Adapted to you, one response at a time</p></div><div class="hero-art" aria-hidden="true"><div class="sun"></div><div class="arch"></div><div class="speech-art arabic" lang="ar">مرحبا</div><div class="leaf"></div><div class="leaf two"></div><div class="spark">✧</div></div></section><section class="profile-preview"><h2>Uniquely you</h2><p>'+(!seen?'Every conversation helps us discover how you learn.':'A growing picture of your abilities, from your own practice.')+'</p>'+[['Word recognition','recognition'],['Word recall','recall'],['Pronunciation','pronunciation'],['Listening','listening']].map(([label,mode])=>{const amount=Object.values(state.skills).filter(s=>s.mode===mode).length;return '<div class="profile-skill"><span>'+label+'</span>'+(amount?'<span class="small">'+amount+' explored</span>':'<span class="small">Not explored</span>')+'</div>';}).join('')+'<button class="ghost" data-view="profile">See your learning profile '+icon('arrow')+'</button></section></div><div class="section-heading"><h2>A little Arabic, a little more life</h2><small>Choose what feels useful</small></div><div class="scenario-grid">'+C.scenarios.map(scenarioCard).join('')+'</div><section class="practice-strip"><div class="round-icon">'+icon('repeat')+'</div><div><h3>'+(due.length?due.length+' '+(due.length===1?'skill is':'skills are')+' ready for a revisit':'Practice that finds your next step')+'</h3><p>'+(seen?'Build on the words you’ve met, with the support you need.':'Meet a word, remember it, and make it part of a conversation.')+'</p></div><button class="ghost" data-practice>Explore your practice '+icon('arrow')+'</button></section>'+focusCard()+'<div class="bottom-note">'+icon('shield')+'Your pace is welcome here. Progress stays in this browser.</div>';
}
function conversations(){return '<div class="page-intro"><div class="eyebrow muted" style="margin-bottom:15px">LIFE HAPPENS IN CONVERSATION</div><h1>What shall we talk about?</h1><p>Choose a moment from everyday life. We’ll find the right amount of support as we go.</p></div><div class="scenario-grid">'+C.scenarios.map(scenarioCard).join('')+'</div><div class="profile-callout"><h3>You bring the curiosity. We’ll meet you there.</h3><p>You can enter any conversation. Ask for a hint when something is new, or try recalling it on your own.</p></div><p class="showcase-note">These first conversations use guided prompts. Open-ended voice conversations are a planned next step.</p>';}
function startScenario(id){cleanupAudio();const sc=C.scenarios.find(s=>s.id===id);if(!sc)return;session={id:uid(),scenario:id,title:sc.title,setting:sc.setting,turns:sc.turns.map(t=>({...t})),index:0,hinted:false,feedback:null,eventId:uid(),startAt:Date.now(),events:[],revisited:false,hintLevel:0,retryUsed:false,repair:null};view='session';render();window.scrollTo(0,0);}
function startPractice(wordId){
cleanupAudio();let queue=E.recommend(state,C.words);
if(wordId){const w=wordById(wordId);if(!w)return;queue=[{word:w,mode:'recall',reason:'Bring this word to mind, with support whenever you need it.'}];}
queue=queue.slice(0,Math.max(2,Math.min(5,Math.floor(state.settings.minutes/3))));
if(!queue.length){toast('Your words have time to settle. Try another conversation while you wait.');view='conversation';render();return;}
const turns=queue.map((r,i)=>({word:r.word.id,mode:r.mode,ar:r.mode==='recognition'?r.word.ar:'',line:r.reason,prompt:r.mode==='recognition'?'What does this word mean?':'How would you say “'+r.word.meaning.toLowerCase()+'”?',options:r.mode==='recognition'?[r.word.meaning,...C.words.filter(w=>w.id!==r.word.id).slice(0,2).map(w=>w.meaning)]:undefined,context:'personal-practice:'+r.word.category,reason:r.reason}));
session={id:uid(),scenario:'practice',title:'A little practice, just for you',setting:'Your next steps, chosen from the words you have met and the moments you care about.',turns,index:0,hinted:false,feedback:null,eventId:uid(),startAt:Date.now(),events:[],revisited:false,hintLevel:0,retryUsed:false,repair:null};view='practice';render();window.scrollTo(0,0);
}

function focusCard(){
  const plan=P.plan(state),goal=state.settings.conversationGoal;
  return '<section class="focus-card"><div class="focus-card-copy"><div class="eyebrow">ONE SMALL PART. A REAL CONVERSATION.</div><h2>Find your next stretch.</h2><p>'+esc(goal?'Working toward: '+goal:'Pick one word, notice what helps, then try it in a different situation.')+'</p><span class="small">Suggested focus: '+esc(plan.word.meaning)+' · '+(plan.mode==='recall'?'bringing it to mind':'recognising its meaning')+'</span></div><div class="focus-card-actions"><button class="primary" data-focus>'+icon('spark')+'Start focused practice</button><button class="ghost" data-view="settings">'+(goal?'Change my conversation goal':'Set my conversation goal')+'</button></div></section>';
}
function startFocus(wordId){
  cleanupAudio();const plan=P.plan(state,wordId),offerClue=plan.mode==='recall'&&plan.signal.kind==='support';
  session={id:uid(),scenario:'focus',title:'One word. A little further.',setting:state.settings.conversationGoal||'A small stretch you can bring into an everyday conversation.',turns:plan.turns,index:0,hinted:offerClue,hintLevel:offerClue?1:0,feedback:null,eventId:uid(),startAt:Date.now(),events:[],revisited:false,retryUsed:false,repair:null,focus:plan.word.id,focusSignal:plan.signal,originalFirstTurn:{...plan.turns[0]}};
  view='practice';render();window.scrollTo(0,0);
}
function focusHeader(){
  const w=wordById(session.focus),phase=session.repair&&!session.feedback?'Repair':session.turns[session.index].phase;
  return '<section class="focus-ribbon" aria-label="Your practice focus"><div><span class="eyebrow">YOUR FOCUS</span><strong>'+esc(w.meaning)+'</strong><p>'+esc(session.focusSignal.reason)+'</p></div><ol aria-label="Practice steps">'+['Reach','Notice','Repair','Use it'].map(label=>'<li'+(label===(session.feedback?'Notice':phase)?' aria-current="step"':'')+'>'+label+'</li>').join('')+'</ol></section>';
}
function hintMarkup(w){
  if(!session.hintLevel)return '';
  if(session.hintLevel===1)return '<div class="hint-box" role="status"><strong>A small clue</strong><p class="small">The word starts with <b>'+esc(w.latin.charAt(0))+'…</b> in transliteration, or <b class="arabic" lang="ar">'+esc(E.normalize(w.ar).charAt(0))+'…</b> in Arabic. Try reaching for the rest.</p><button class="ghost" type="button" data-model>Show me the whole model</button></div>';
  return '<div class="hint-box" role="status"><span class="arabic" lang="ar">'+esc(w.ar)+'</span><strong>'+esc(w.latin)+'</strong><br><small>'+esc(w.meaning)+' · Read it slowly, notice the part you needed, then try it.</small></div>';
}
function modelMarkup(w){
  const frame=C.practiceFrames[w.id];
  return '<section class="practice-model" aria-label="Written example in small pieces"><div class="eyebrow">NOTICE THE PIECES</div><div class="model-chunks" dir="rtl">'+frame.chunks.map(chunk=>'<div class="model-chunk '+(chunk.word===w.id?'target-chunk':'')+'"><span class="arabic" lang="ar">'+esc(chunk.ar)+'</span><span dir="ltr">'+esc(chunk.latin)+'</span><small dir="ltr">'+esc(chunk.meaning)+'</small></div>').join('')+'</div><p>'+esc(frame.translation)+'</p><p class="small">'+esc(frame.notice)+'</p><small>Written example. Transliteration is a reading aid; pronunciation has not been assessed.</small></section>';
}
function retryTurn(){
  if(!session?.feedback||session.feedback.outcome==='independent'||session.retryUsed)return;
  cleanupAudio();const original={...session.turns[session.index]};
  session.repair={original,feedback:session.feedback};session.retryUsed=true;
  session.turns[session.index]={...original,mode:'recall',ar:'',line:'Take your time. Rebuild the small part you just noticed.',prompt:'Bring back the word for “'+wordById(original.word).meaning.toLowerCase()+'”.',context:original.context+':repair'};
  session.hinted=false;session.hintLevel=0;session.feedback=null;session.eventId=uid();render();$('#answer')?.focus();
}
function skipRetry(){
  if(!session?.repair||session.feedback)return;
  session.turns[session.index]=session.repair.original;session.feedback=session.repair.feedback;session.repair=null;render();
}
function showHint(full=false){
  if(!session||session.feedback)return;
  const value=$('#answer')?.value||'';session.hinted=true;session.hintLevel=full?2:Math.min(2,(session.hintLevel||0)+1);render();$('#answer').value=value;$('#answer').focus();
}

function sessionView(){
if(!session)return conversations();
const t=session.turns[session.index],w=wordById(t.word),s=state.skills[E.key(w.id,t.mode)],f=session.feedback;
const prompt=esc(t.prompt);let controls='';
if(!f){
  if(t.mode==='recognition'){
    // Rotate answer positions rather than making the correct answer always first.
    const opts=t.options||[w.meaning,...C.words.filter(x=>x.id!==w.id).slice(0,2).map(x=>x.meaning)];
    const shift=(session.index+1)%opts.length;const ordered=opts.slice(shift).concat(opts.slice(0,shift));
    controls='<div class="choices">'+ordered.map((o,i)=>'<button class="choice" data-choice="'+esc(o)+'"><span class="choice-index">'+(i+1)+'</span>'+esc(o)+'</button>').join('')+'</div>';
  }else{
    controls='<form id="answer-form"><label class="answer-label" for="answer">Arabic or transliteration</label><input id="answer" class="answer-input" autocomplete="off" autocapitalize="none" spellcheck="false" dir="auto" maxlength="120" placeholder="Find your words…" aria-describedby="answer-message">'+hintMarkup(w)+'<div id="answer-message" class="inline-message" role="status"></div><div class="answer-actions"><button type="button" class="ghost" data-hint>'+icon('spark')+(session.hintLevel>=2?'Model is open':session.hintLevel===1?'Show the model':'A little help, please')+'</button><button class="primary" type="submit">Send my response '+icon('arrow')+'</button></div></form>'+(session.repair?'<p class="small rehearsal-note">This is practice after seeing a model. We’ll keep it separate from independent recall.</p><button class="ghost" data-skip-retry>Continue without this retry</button>':'');
  }
}else{
controls='<div class="feedback '+(f.outcome==='independent'?'':'support')+'" role="status"><strong>'+esc(f.title)+'</strong><p>'+esc(f.message)+'</p><p><span class="arabic" lang="ar">'+esc(w.ar)+'</span> &nbsp; '+esc(w.latin)+' · '+esc(w.meaning)+'</p>'+modelMarkup(w)+'<div class="record-zone"><details id="record-details"><summary>Try saying it aloud</summary><p>Record and replay yourself. Audio stays on this device for this turn. Pronunciation isn’t scored yet.</p><button class="secondary record-button" type="button" id="record-btn">'+icon('mic')+'Record my voice</button><span id="record-status" class="record-live" role="status"></span><audio id="voice-playback" controls hidden></audio></details></div>'+(f.outcome!=='independent'&&!session.retryUsed?'<button class="secondary" data-retry>Hide the model & try again</button>':'')+'<button class="primary" data-next>'+(session.index>=session.turns.length-1?'See my reflection':'Keep going')+' '+icon('arrow')+'</button></div>';
}
return (session.focus?focusHeader():'')+'<div class="page-title-row"><div class="page-intro"><button class="ghost" data-view="conversation" style="margin-bottom:14px">'+icon('back')+'All conversations</button><h1>'+esc(session.title)+'</h1><p>'+esc(session.setting)+'</p></div><span class="pill">'+icon('spark')+'A path that adapts</span></div><div class="conversation-layout"><section class="conversation-panel" aria-label="Guided conversation"><div class="conversation-head"><div class="tutor-avatar" aria-hidden="true">ن</div><div><strong>Your conversation with Noura</strong><small>A little support, whenever you need it</small></div><span class="pill">Guided practice</span></div><div class="conversation-body"><div class="scene-tag">'+(session.repair?'SLOW DOWN & REBUILD':session.focus?'ONE SMALL REACH':session.scenario==='practice'?'YOUR PERSONAL PRACTICE':'IN THE MOMENT')+'</div><div class="tutor-line">'+(t.ar?'<div class="arabic" lang="ar">'+esc(t.ar)+'</div>':'')+'<p>'+esc(t.line)+'</p></div><h2 class="task-prompt">'+prompt+'</h2>'+controls+'</div><div class="session-footer"><small>This conversation</small><div class="session-track" role="progressbar" aria-label="Conversation progress" aria-valuenow="'+session.index+'" aria-valuemin="0" aria-valuemax="'+session.turns.length+'"><span style="width:'+Math.round(session.index/session.turns.length*100)+'%"></span></div><small>'+session.index+' of '+session.turns.length+' moments</small></div></section><aside class="panel session-aside"><h3>A closer look at you</h3><p>'+ (t.mode==='recall'?'This moment explores bringing a word to mind.':'This moment explores understanding a written word.')+'</p><div class="mini-evidence">'+icon(t.mode==='recall'?'spark':'book')+'<div><strong>'+ (t.mode==='recall'?'Word recall':'Word recognition')+'</strong><span>'+esc(E.status(s).label)+'</span></div></div><div class="mini-evidence">'+icon('plant')+'<div><strong>Help is part of learning</strong><span>Using a hint gives us useful information about where to support you.</span></div></div><hr class="aside-divider"><div class="mini-evidence">'+icon('ear')+'<div><strong>Listening & pronunciation</strong><span>Not assessed by these text responses. They remain separate in your profile.</span></div></div><p class="small">Your next session will remember what happened here.</p></aside></div>';
}
function submitAnswer(value,choice=false){
  if(!session||session.feedback)return;
  const t=session.turns[session.index],w=wordById(t.word);
  if(!value.trim()){const m=$('#answer-message');if(m)m.textContent='Type a response, or ask for a little help.';return;}
  const correct=choice?value===w.meaning:E.matches(w,value);
  if(!correct&&!choice){$('#answer-message').textContent='I couldn’t match that to this practice phrase. It may be a different expression or spelling. Try again or open a hint; your profile hasn’t changed.';return;}
  if(session.repair){
    state=E.rehearse(state,{id:session.eventId,word:w.id,mode:'recall',context:t.context,session:session.id,withModel:session.hintLevel>0});
    session.feedback={outcome:'rehearsal',title:'You rebuilt that small part.',message:'That was a useful rehearsal after feedback. It is saved separately; a later attempt will show what you can recall independently.'};
    save();render();return;
  }
  const outcome=correct?(session.hinted?'assisted':'independent'):'miss';
  state=E.observe(state,{id:session.eventId,word:w.id,mode:t.mode,outcome,context:t.context,session:session.id,hintLevel:session.hintLevel||0});
  session.events.push({word:w.id,mode:t.mode,outcome});
  session.feedback={outcome,title:outcome==='independent'?'You found it.':outcome==='assisted'?'You found a useful place to practice.':'Let’s make that connection.',message:outcome==='independent'?(t.mode==='recall'?'You brought this word to mind without a hint on this turn. A later review will show what stays with you.':'You recognised the meaning in this context. Bringing the word to mind is a separate next step.'):outcome==='assisted'?'Notice the piece that helped. You can hide the model and try it once more, at your own pace.':'This word means “'+w.meaning.toLowerCase()+'”. The mismatch is a clue about what to practice next.'};
  // Keep the session bounded, and preserve task type when recognition needs support.
  if(!session.focus&&outcome!=='independent'&&!session.revisited&&session.turns.length<8&&session.index<session.turns.length-2){
    const mode=t.mode==='recognition'?'recognition':'recall';
    session.turns.push({word:w.id,mode,ar:mode==='recognition'?w.ar:'',line:'Return to one small part from earlier, after a change of scene.',prompt:mode==='recognition'?'What does this word mean?':'Can you bring back the word for “'+w.meaning.toLowerCase()+'”?',context:session.scenario+':supported-revisit'});session.revisited=true;
  }
  save();render();
}
function next(){
  if(!session||!session.feedback)return;cleanupAudio();
  if(session.focus&&session.index===0){
    const turns=[session.originalFirstTurn,...session.turns.slice(1)];
    session.turns[session.turns.length-1]=P.adaptTransfer(turns,state,session.focus);
  }
  if(session.index===session.turns.length-1){state=E.finish(state,session.id,session.scenario);save();view='complete';}
  else{session.index++;session.hinted=false;session.hintLevel=0;session.retryUsed=false;session.repair=null;session.feedback=null;session.eventId=uid();}
  render();window.scrollTo(0,0);
}
function completion(){
if(!session)return dashboard();const indep=session.events.filter(e=>e.outcome==='independent').length,help=session.events.filter(e=>e.outcome!=='independent').length;
const reviewed=[...new Set(session.events.map(e=>e.word))];
const rehearsals=(state.rehearsals||[]).filter(e=>e.session===session.id).length;
return '<section class="panel completion"><div class="completion-icon">'+icon('plant')+'</div><div class="eyebrow muted" style="margin-bottom:15px">A MOMENT OF GROWTH</div><h1>A little more feels familiar.</h1><p>'+indep+' '+(indep===1?'response':'responses')+' without a hint'+(help?', and '+help+' '+(help===1?'moment':'moments')+' with support':'')+'. Every one helps shape what comes next.</p>'+(rehearsals?'<p class="reflection-note">You also paused and rebuilt '+rehearsals+' '+(rehearsals===1?'small part':'small parts')+' after feedback. Those rehearsals are recorded separately from independent attempts.</p>':'')+(state.settings.conversationGoal?'<p class="conversation-goal">Working toward: '+esc(state.settings.conversationGoal)+'</p>':'')+'<div class="completion-results">'+reviewed.map(id=>{const w=wordById(id),s=state.skills[E.key(id,'recall')]||state.skills[E.key(id,'recognition')];return '<div class="evidence-row"><div><strong>'+esc(w.meaning)+'</strong><small>'+esc(w.latin)+' · '+(s.mode==='recall'?'Recall':'Recognition')+'</small></div>'+pill(E.status(s))+'</div>';}).join('')+'</div><p>Your practice has been saved'+(!storageOK?' for this open page only':' in this browser')+'. Later review will help us see what stays with you.</p><div class="button-row"><button class="primary" data-view="profile">See my growth '+icon('arrow')+'</button><button class="secondary" data-view="today">Back to my space</button></div></section>';
}
function wordsView(){return '<div class="page-intro"><h1>Words becoming yours.</h1><p>A word can feel familiar in one way and new in another. Explore its meaning, then practice bringing it to mind.</p></div><div class="word-tools"><input id="word-search" class="answer-input" type="search" aria-label="Search your words" placeholder="Search in English, Arabic, or transliteration" value="'+esc(search)+'"><select id="word-filter" aria-label="Filter your words"><option value="all" '+(filter==='all'?'selected':'')+'>All words</option><option value="explored" '+(filter==='explored'?'selected':'')+'>Words I’ve explored</option><option value="support" '+(filter==='support'?'selected':'')+'>Needs support</option></select></div><div class="word-grid" id="word-results">'+wordCards()+'</div>';}
function wordCards(){
const list=C.words.filter(w=>{const skills=['recall','recognition'].map(m=>state.skills[E.key(w.id,m)]).filter(Boolean);return (!search||E.normalize([w.ar,w.latin,w.meaning].join(' ')).includes(E.normalize(search)))&&(filter==='all'||filter==='explored'&&skills.length||filter==='support'&&skills.some(s=>['assisted','miss'].includes(s.lastOutcome)));});
return list.length?list.map(w=>'<article class="word-card"><span class="arabic" lang="ar">'+esc(w.ar)+'</span><span class="latin">'+esc(w.latin)+'</span><h3>'+esc(w.meaning)+'</h3>'+['recognition','recall'].map(mode=>'<div class="word-detail"><span>'+ (mode==='recognition'?'Recognising':'Recalling')+'</span>'+pill(E.status(state.skills[E.key(w.id,mode)]))+'</div>').join('')+'<button class="ghost" data-word="'+w.id+'">Practice this word '+icon('arrow')+'</button><button class="ghost" data-focus-word="'+w.id+'">Focus on this word '+icon('spark')+'</button></article>').join(''):'<p class="muted">No words match this view yet. Try another search or explore a conversation.</p>';
}
function profile(){
const skills=Object.values(state.skills);const independent=state.events.filter(e=>e.outcome==='independent').length;
return '<div class="page-title-row"><div class="page-intro"><h1>Your growth has its own shape.</h1><p>A living picture of what you can do, built from your practice. Each ability gets its own space to grow.</p></div><button class="secondary" data-export>'+icon('download')+'Export my progress</button></div><div class="profile-grid"><section class="panel panel-padded"><h2>What we’re learning about you</h2>'+(!skills.length?'<div class="profile-empty"><h3>We’re getting to know you.</h3><p>Your profile starts with a clean slate. A first conversation will give us a few useful clues.</p><button class="primary" data-start="hello">Start a conversation '+icon('arrow')+'</button></div>':'<p class="small">'+state.sessions.length+' completed '+(state.sessions.length===1?'session':'sessions')+' · '+independent+' independent '+(independent===1?'response':'responses')+'</p>'+skills.map(s=>{const w=wordById(s.word);if(!w)return '';return '<div class="evidence-row"><div><strong>'+esc(w.meaning)+' · '+(s.mode==='recall'?'Recall':'Recognition')+'</strong><small>'+s.independent+' without hints · '+s.assisted+' with hints · '+s.misses+' recognition '+(s.misses===1?'miss':'misses')+'<br>'+s.delayed+' successful '+(s.delayed===1?'revisit':'revisits')+' after a day or more</small></div>'+pill(E.status(s))+'</div>';}).join(''))+'<div class="subtle-rule"></div><div class="evidence-row"><div><strong>Pronunciation</strong><small>Voice recordings are for your own playback. Sound accuracy has not been assessed.</small></div>'+pill({label:'Not assessed yet',tone:'muted'})+'</div><div class="evidence-row"><div><strong>Listening</strong><small>Text exercises do not tell us how well you understand spoken Arabic.</small></div>'+pill({label:'Not assessed yet',tone:'muted'})+'</div></section><aside><section class="panel panel-padded"><h2>Every detail has a place.</h2><ul class="evidence-list"><li>Understanding a word and recalling it are tracked separately.</li><li>A hint helps us choose where to support you.</li><li>A few answers give us clues, not a fixed level.</li><li>Later practice shows what you remember over time.</li></ul><button class="ghost" data-practice style="margin-top:20px">Find my next practice '+icon('arrow')+'</button></section><div class="profile-callout"><h3>There’s no single level of you.</h3><p>You might recognise a word easily and still need time to find it in conversation. Both things can be true.</p></div></aside></div>';
}
function settings(){return '<div class="page-intro"><h1>Make this space yours.</h1><p>A few preferences to guide your practice. You can change them whenever life changes.</p></div><div class="profile-grid"><section class="panel panel-padded"><form class="settings-form" id="settings-form"><h2>Your preferences</h2><label for="learner-name">What should we call you?</label><input class="answer-input" id="learner-name" maxlength="40" placeholder="Your first name" autocomplete="given-name" value="'+esc(state.settings.name)+'"><label for="learning-goal">What brings you to Arabic?</label><select id="learning-goal">'+['Connection','Everyday life','Getting around'].map(g=>'<option '+(g===state.settings.goal?'selected':'')+'>'+g+'</option>').join('')+'</select><label for="conversation-goal">A conversation you want to have</label><input class="answer-input" id="conversation-goal" maxlength="160" placeholder="Order breakfast near home, or get to know a neighbour…" value="'+esc(state.settings.conversationGoal)+'"><p class="small">Make it meaningful to you. This stays visible during focused practice; your topic above guides which words we suggest.</p><label for="practice-time">A comfortable practice window</label><select id="practice-time">'+[5,10,15].map(n=>'<option value="'+n+'" '+(n===state.settings.minutes?'selected':'')+'>'+n+' minutes</option>').join('')+'</select><p class="small">This shapes the size of your personal practice. There’s no daily requirement.</p><button class="primary" type="submit">Save my preferences '+icon('check')+'</button></form></section><aside class="panel panel-padded"><h2>Your progress, your control.</h2><p class="small">Progress is stored in this browser. Export a copy to keep it elsewhere. Voice recordings stay in memory until you leave the turn.</p><button class="secondary" data-export>'+icon('download')+'Export my progress</button><div class="settings-note"><details><summary>About this first version</summary><p>Melorina 0.2 · Emirati Arabic. These guided text conversations demonstrate adaptive practice. Responses are matched to a small phrase collection; other valid expressions may not be recognised.</p><p>Teaching phrases and transliterations are draft content awaiting Emirati educator review. Listening assessment, automated pronunciation feedback, accounts, and open-ended voice conversations are not connected yet.</p><p><a href="https://alramsa.ae/alramsa-faqs/" target="_blank" rel="noopener noreferrer">About the Emirati Arabic variety</a></p></details></div><div class="settings-note"><button class="ghost reset-button" id="reset-progress">Reset progress in this browser</button><p>This removes your learning history and preferences from this browser.</p></div></aside></div>';}
function navigate(nextView){cleanupAudio();view=nextView;render();window.scrollTo(0,0);}
function bind(){
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.view)));
document.querySelectorAll('[data-start]').forEach(b=>b.addEventListener('click',()=>startScenario(b.dataset.start)));
document.querySelectorAll('[data-practice]').forEach(b=>b.addEventListener('click',()=>startPractice()));
document.querySelectorAll('[data-focus]').forEach(b=>b.addEventListener('click',()=>startFocus()));
document.querySelectorAll('[data-focus-word]').forEach(b=>b.addEventListener('click',()=>startFocus(b.dataset.focusWord)));
document.querySelectorAll('[data-word]').forEach(b=>b.addEventListener('click',()=>startPractice(b.dataset.word)));
document.querySelectorAll('[data-choice]').forEach(b=>b.addEventListener('click',()=>submitAnswer(b.dataset.choice,true)));
document.querySelectorAll('[data-export]').forEach(b=>b.addEventListener('click',exportProgress));
$('#answer-form')?.addEventListener('submit',e=>{e.preventDefault();submitAnswer($('#answer').value);});
$('[data-hint]')?.addEventListener('click',()=>showHint());
$('[data-model]')?.addEventListener('click',()=>showHint(true));
$('[data-retry]')?.addEventListener('click',retryTurn);
$('[data-skip-retry]')?.addEventListener('click',skipRetry);
$('[data-next]')?.addEventListener('click',next);
$('#word-search')?.addEventListener('input',e=>{search=e.target.value;refreshWords();});
$('#word-filter')?.addEventListener('change',e=>{filter=e.target.value;refreshWords();});
$('#settings-form')?.addEventListener('submit',e=>{e.preventDefault();state={...state,settings:{name:$('#learner-name').value.trim().slice(0,40),goal:$('#learning-goal').value,minutes:Number($('#practice-time').value),conversationGoal:$('#conversation-goal').value.trim().slice(0,160)}};save();render();toast(storageOK?'Your preferences are saved.':'Preferences updated for this open page.');});
$('#reset-progress')?.addEventListener('click',()=>{if(window.confirm('Reset all Melorina progress and preferences in this browser? Export a copy first if you want to keep them.')){cleanupAudio();state=E.fresh();session=null;save();view='today';render();toast('A fresh start. Your progress has been reset.');}});
$('#record-btn')?.addEventListener('click',record);
}
function refreshWords(){$('#word-results').innerHTML=wordCards();$('#word-results').querySelectorAll('[data-word]').forEach(b=>b.addEventListener('click',()=>startPractice(b.dataset.word)));$('#word-results').querySelectorAll('[data-focus-word]').forEach(b=>b.addEventListener('click',()=>startFocus(b.dataset.focusWord)));}
function exportProgress(){const blob=new Blob([JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='melorina-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Your progress export is ready.');}
function cleanupAudio(){recordToken++;clearTimeout(recordTimer);if(recorder){recorder.onstop=null;recorder.ondataavailable=null;if(recorder.state!=='inactive')try{recorder.stop();}catch{}}stream?.getTracks().forEach(t=>t.stop());recorder=null;stream=null;if(clipURL){URL.revokeObjectURL(clipURL);clipURL=null;}}
async function record(){
const button=$('#record-btn'),status=$('#record-status');if(!button||!status)return;
if(recorder&&recorder.state==='recording'){recorder.stop();return;}
if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){status.textContent='Recording isn’t supported here. You can still say the word aloud. Try Chrome or Edge on localhost or HTTPS for recording.';return;}
cleanupAudio();const token=recordToken;button.disabled=true;status.textContent='Waiting for microphone permission…';
try{
const media=await navigator.mediaDevices.getUserMedia({audio:true});
if(token!==recordToken){media.getTracks().forEach(t=>t.stop());return;}
stream=media;const chunks=[];recorder=new MediaRecorder(stream);
recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
recorder.onstop=()=>{clearTimeout(recordTimer);stream?.getTracks().forEach(t=>t.stop());if(token!==recordToken)return;const audio=$('#voice-playback');if(audio&&chunks.length){clipURL=URL.createObjectURL(new Blob(chunks,{type:recorder.mimeType||'audio/webm'}));audio.src=clipURL;audio.hidden=false;}button.innerHTML=icon('mic')+'Record again';button.classList.remove('recording');status.textContent='Ready to replay. No pronunciation score has been added.';recorder=null;stream=null;};
recorder.onerror=()=>{cleanupAudio();button.disabled=false;button.classList.remove('recording');button.innerHTML=icon('mic')+'Try recording again';status.textContent='The recording stopped unexpectedly. Please try again.';};
recorder.start();button.disabled=false;button.innerHTML=icon('mic')+'Stop recording';button.classList.add('recording');status.textContent='Recording… stops automatically after 20 seconds.';recordTimer=setTimeout(()=>{if(recorder?.state==='recording')recorder.stop();},20000);
}catch(error){if(token!==recordToken)return;cleanupAudio();button.disabled=false;status.textContent=error.name==='NotAllowedError'?'Microphone access wasn’t granted. You can allow it in browser settings, or continue without recording.':'No microphone was available. You can continue practicing by typing.';}
}
window.addEventListener('pagehide',cleanupAudio);
render();
})();
