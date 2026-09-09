(function(root) {
  const DAY=86400000;
  function fresh(){return {version:1,settings:{name:'',goal:'Everyday life',minutes:10},skills:{},events:[],sessions:[]};}
  function normalize(value){return String(value).normalize('NFKD').toLowerCase().replace(/[\u064B-\u065F\u0670\u0640\u0300-\u036f]/g,'').replace(/[أإآٱ]/g,'ا').replace(/[’‘']/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');}
  function matches(word,value){const n=normalize(value);return !!n&&[word.ar,...word.aliases].some(a=>normalize(a)===n);}
  function key(word,mode){return word+':'+mode;}
  function observe(state,{id,word,mode,outcome,context,session,at=Date.now()}){
    if(!['recognition','recall'].includes(mode)||!['independent','assisted','miss'].includes(outcome))throw Error('Unsupported evidence');
    if(!id||!word||!context||!session||!Number.isFinite(at))throw Error('Incomplete evidence');
    if(state.events.some(e=>e.id===id))return state;
    const k=key(word,mode), old=state.skills[k];
    const s=old?{...old,contexts:[...old.contexts]}:{word,mode,attempts:0,independent:0,assisted:0,misses:0,delayed:0,contexts:[],lastAt:0,interval:0,due:at};
    s.attempts++;
    if(outcome==='independent'){
      s.independent++;
      if(old&&at-old.lastAt>=DAY)s.delayed++;
      if(!s.contexts.includes(context))s.contexts.push(context);
      // Same-session repetitions do not keep multiplying the review interval.
      s.interval=old&&old.lastSession===session?Math.max(old.interval,DAY):Math.min(30*DAY,Math.max(DAY,(old?.interval||DAY)* (s.delayed?2:1)));
    }else if(outcome==='assisted'){s.assisted++;s.interval=6*3600000;}else{s.misses++;s.interval=15*60000;}
    s.lastAt=at;s.lastSession=session;s.lastOutcome=outcome;s.due=at+s.interval;
    const event={id,word,mode,outcome,context,session,at};
    return {...state,skills:{...state.skills,[k]:s},events:[...state.events,event].slice(-2000)};
  }
  function status(skill){
    if(!skill)return {label:'Not explored yet',tone:'muted'};
    if(skill.lastOutcome==='miss'||skill.lastOutcome==='assisted')return {label:'Needs a little support',tone:'peach'};
    if(skill.delayed>=2&&skill.contexts.length>=2&&skill.independent>=3)return {label:'Holding over time',tone:'sage'};
    if(skill.independent>=2)return {label:'Becoming familiar',tone:'sage'};
    return {label:'First evidence',tone:'lilac'};
  }
  function recommend(state,words,now=Date.now()){
    const queue=[];
    for(const word of words){
      const recall=state.skills[key(word.id,'recall')], recognition=state.skills[key(word.id,'recognition')];
      for(const mode of ['recall','recognition']){
        const s=state.skills[key(word.id,mode)];
        if(s&&s.due<=now)queue.push({word,mode,priority:100+(s.lastOutcome==='miss'?20:0)+Math.min(10,(now-s.due)/DAY),reason:s.lastOutcome==='independent'?'Check what stayed with you after a break.':'Give this another try after a little space.'});
      }
      if(recognition&&!recall)queue.push({word,mode:'recall',priority:60,reason:'You met its meaning. Try bringing the word to mind.'});
      if(!recognition&&!recall)queue.push({word,mode:'recognition',priority:20+(word.category===state.settings.goal?10:0),reason:'A new word for your everyday conversations.'});
    }
    return queue.sort((a,b)=>b.priority-a.priority||a.word.id.localeCompare(b.word.id));
  }
  function finish(state,session,scenario,at=Date.now()){
    if(state.sessions.some(s=>s.id===session))return state;
    const events=state.events.filter(e=>e.session===session);
    return {...state,sessions:[...state.sessions,{id:session,scenario,at,attempts:events.length,independent:events.filter(e=>e.outcome==='independent').length}].slice(-500)};
  }
  function validate(raw){
    if(!raw||raw.version!==1||!raw.settings||typeof raw.settings!=='object'||!raw.skills||typeof raw.skills!=='object'||Array.isArray(raw.skills)||!Array.isArray(raw.events)||!Array.isArray(raw.sessions))return fresh();
    const valid=Object.values(raw.skills).every(s=>s&&typeof s.word==='string'&&['recall','recognition'].includes(s.mode)&&Array.isArray(s.contexts)&&['attempts','independent','assisted','misses','delayed','lastAt','interval','due'].every(k=>Number.isFinite(s[k])&&s[k]>=0));
    if(!valid)return fresh();
    return {...raw,settings:{name:typeof raw.settings.name==='string'?raw.settings.name.slice(0,40):'',goal:['Connection','Everyday life','Getting around'].includes(raw.settings.goal)?raw.settings.goal:'Everyday life',minutes:[5,10,15].includes(raw.settings.minutes)?raw.settings.minutes:10},events:raw.events.slice(-2000),sessions:raw.sessions.slice(-500)};
  }
  const engine={DAY,fresh,normalize,matches,key,observe,status,recommend,finish,validate};
  if(typeof module==='object'&&module.exports)module.exports=engine;else root.MelorinaEngine=engine;
})(typeof globalThis!=='undefined'?globalThis:this);
