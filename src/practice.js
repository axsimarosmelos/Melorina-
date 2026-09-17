(function(root){
  const isNode=typeof module==='object'&&module.exports;
  const E=isNode?require('./engine'):root.MelorinaEngine;
  const C=isNode?require('./content'):root.MelorinaContent;
  function recognition(word,context,line){return {word:word.id,mode:'recognition',ar:word.ar,line,prompt:'What does this word mean?',options:[word.meaning,...C.words.filter(w=>w.id!==word.id).slice(0,2).map(w=>w.meaning)],context};}
  function recall(word,context,line,prompt){return {word:word.id,mode:'recall',ar:'',line,prompt:prompt||'How would you say “'+word.meaning.toLowerCase()+'”?',context};}
  function plan(state,wordId,now=Date.now()){
    const queue=E.recommend(state,C.words,now);
    let candidate=wordId?null:queue[0];
    let word=wordId?C.words.find(w=>w.id===wordId):candidate?.word;
    // When reviews are not due, offer a new context rather than claim a scheduled review is due.
    if(!word)word=C.words.find(w=>w.category===state.settings.goal)||C.words[0];
    const r=state.skills[E.key(word.id,'recall')],known=state.skills[E.key(word.id,'recognition')];
    const mode=candidate?.mode||(r||known?.lastOutcome==='independent'?'recall':'recognition');
    const signal=E.challenge(state,word.id,mode);
    const reason=candidate?.reason||(r||known?'Choose a new setting for a word you have already met.':'Start with one word for a conversation you care about.');
    const first=mode==='recall'?recall(word,'focus:'+word.id+':attempt',reason):recognition(word,'focus:'+word.id+':attempt',reason);
    first.phase='Reach';
    const bridgeWord=C.words.filter(w=>w.id!==word.id).sort((a,b)=>{
      const score=w=>(state.skills[E.key(w.id,'recognition')]?.independent||0)+(state.skills[E.key(w.id,'recall')]?.independent||0);
      return score(b)-score(a);
    })[0];
    const bridge=recognition(bridgeWord,'focus:'+word.id+':space','A brief change of scene before returning to your focus word.');bridge.phase='Make space';
    const frame=C.practiceFrames[word.id];
    const transfer=recall(word,'focus:'+word.id+':apply',frame.situation,frame.prompt);transfer.phase='Use it';
    return {word,mode,signal,reason,turns:[first,bridge,transfer]};
  }
  function adaptTransfer(planTurns,state,wordId){
    const first=planTurns[0],word=C.words.find(w=>w.id===wordId),last=planTurns[planTurns.length-1];
    const evidence=state.skills[E.key(wordId,first.mode)];
    if(first.mode==='recognition'&&evidence?.lastOutcome!=='independent'){
      const supported=recognition(word,'focus:'+wordId+':apply-supported',C.practiceFrames[wordId].situation);
      return {...supported,phase:'Use it',prompt:'Recognise the word you would use in this situation.'};
    }
    return last;
  }
  const practice={plan,adaptTransfer};
  if(isNode)module.exports=practice;else root.MelorinaPractice=practice;
})(typeof globalThis!=='undefined'?globalThis:this);
