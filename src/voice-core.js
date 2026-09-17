(function(root){
'use strict';
const isNode=typeof module==='object'&&module.exports;
const C=isNode?require('./content'):root.MelorinaContent;
const E=isNode?require('./engine'):root.MelorinaEngine;
const voices=['marin','cedar','coral','sage','alloy','echo'];
const tones={warm:'Warm and encouraging',calm:'Calm and patient',direct:'Clear and concise'};
const versions={guided:'With a little guidance',everyday:'Everyday conversation',surprise:'An unexpected reply'};
const sounds={all:{label:'All sounds',words:C.words.map(w=>w.id)},haa:{label:'ح · in marhaba',words:['hello']},long:{label:'Long vowels · maay / ismi',words:['water','name','market']},qaaf:{label:'ق · in gahwa',words:['coffee']}};
function fresh(){return {prefs:{voice:'marin',tone:'warm',pace:0.9,followPace:false,version:'guided',scenario:'cafe',sound:'all'},skills:{},events:[],rehearsals:[],targets:[],sessions:[]};}
function preferences(p={}){return {voice:voices.includes(p.voice)?p.voice:'marin',tone:Object.hasOwn(tones,p.tone)?p.tone:'warm',pace:[0.75,0.9,1].includes(Number(p.pace))?Number(p.pace):0.9,followPace:p.followPace===true,version:Object.hasOwn(versions,p.version)?p.version:'guided',scenario:['hello','cafe','directions'].includes(p.scenario)?p.scenario:'cafe',sound:Object.hasOwn(sounds,p.sound)?p.sound:'all'};}
function validWord(id){return C.words.some(w=>w.id===id);}
function validate(raw){
 const s=fresh();if(!raw||typeof raw!=='object')return s;
 s.prefs=preferences(raw.prefs);s.targets=Array.isArray(raw.targets)?[...new Set(raw.targets.filter(validWord))]:[];
 for(const [k,v] of Object.entries(raw.skills||{}))if(v&&validWord(v.word)&&['listening','spoken'].includes(v.mode)&&k===v.word+':'+v.mode&&['attempts','independent','assisted','misses','delayed','due','lastAt'].every(n=>Number.isFinite(v[n])&&v[n]>=0))s.skills[k]={...v};
 for(const field of ['events','rehearsals'])s[field]=Array.isArray(raw[field])?raw[field].filter(e=>e&&typeof e.id==='string'&&validWord(e.word)&&Number.isFinite(e.at)).slice(-500):[];
 s.sessions=Array.isArray(raw.sessions)?raw.sessions.filter(x=>x&&typeof x.id==='string'&&Number.isFinite(x.at)).slice(-100):[];
 return s;
}
function observe(s,e){
 const {id,word,mode,outcome,at=Date.now(),session,assisted=false,repair=false}=e;
 if(!id||!validWord(word)||!['listening','spoken'].includes(mode)||!['independent','assisted','miss'].includes(outcome)||!session||!Number.isFinite(at))throw Error('Invalid voice evidence');
 if(s.events.some(x=>x.id===id)||s.rehearsals.some(x=>x.id===id))return s;
 if(mode==='spoken'&&e.confirmed!==true)throw Error('Confirm the transcript before recording evidence');
 if(mode==='listening'&&e.heard!==true)throw Error('Play the audio before recording listening evidence');
 if(assisted&&outcome==='independent')throw Error('Supported response cannot be independent');
 const event={id,word,mode,outcome,session,at,source:mode==='spoken'?'learner-confirmed-transcript':'audio-choice',assisted};
 if(repair)return {...s,rehearsals:[...s.rehearsals,event].slice(-500)};
 const key=word+':'+mode,old=s.skills[key],skill=old?{...old}:{word,mode,attempts:0,independent:0,assisted:0,misses:0,delayed:0,due:at,lastAt:0};
 skill.attempts++;skill[outcome==='miss'?'misses':outcome]++;
 if(outcome==='independent'&&old&&old.lastSession!==session&&at-old.lastAt>=E.DAY)skill.delayed++;
 skill.lastAt=at;skill.lastSession=session;skill.lastOutcome=outcome;
 skill.due=at+(outcome==='miss'?15*60000:outcome==='assisted'?6*3600000:Math.min(14,1+skill.delayed*2)*E.DAY);
 return {...s,skills:{...s.skills,[key]:skill},events:[...s.events,event].slice(-500),targets:outcome==='independent'?s.targets.filter(x=>x!==word):s.targets};
}
function target(s,id){return validWord(id)?{...s,targets:[...new Set([...s.targets,id])]}:s;}
function plan(s,mode,goal,wordId,now=Date.now()){
 const pool=C.words.filter(w=>sounds[s.prefs.sound].words.includes(w.id));
 const rank=w=>{const k=s.skills[w.id+':'+mode];return (k&&k.due<=now?100:0)+(s.targets.includes(w.id)?80:0)+(!k?20:0)+(w.category===goal?10:0);};
 const word=C.words.find(w=>w.id===wordId)||pool.slice().sort((a,b)=>rank(b)-rank(a))[0];
 const bridge=C.words.find(w=>w.id!==word.id&&s.skills[w.id+':'+mode]?.independent)||C.words.find(w=>w.id!==word.id);
 const skill=s.skills[word.id+':'+mode];
 return {words:[word.id,bridge.id,word.id],reason:s.targets.includes(word.id)?'A word you chose to work on.':skill&&skill.due<=now?'A review after a little space.':skill?'Bring a familiar word into another moment.':'A new word for a conversation you care about.'};
}
function paceFromSpeech(prefs,text,seconds){
 if(!prefs.followPace||!Number.isFinite(seconds)||seconds<2)return prefs.pace;
 const count=String(text).trim().split(/\s+/).filter(Boolean).length;if(count<4)return prefs.pace;
 const rate=count/seconds*60;return rate<90?0.75:rate<145?0.9:1;
}
function command(text){
 const n=E.normalize(text);
 const groups={repeat:['repeat','again','say it again','عيد','مرة ثانية'],slower:['slower','slow down','ببطء','شوي شوي'],hint:['hint','help','help me','ساعدني'],next:['next','continue','التالي','كمل'],stop:['stop','pause','وقف','توقف']};
 return Object.keys(groups).find(k=>groups[k].some(x=>E.normalize(x)===n))||null;
}
const api={voices,tones,versions,sounds,fresh,preferences,validate,observe,target,plan,paceFromSpeech,command};
if(isNode)module.exports=api;else root.MelorinaVoiceCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
