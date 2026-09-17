(function(root) {
  const words = [
    {id:'hello', ar:'مرحبا', latin:'marhaba', meaning:'Hello', aliases:['marhaba','marhaban','مرحبا','مرحباً'], category:'Connection'},
    {id:'thanks', ar:'شكراً', latin:'shukran', meaning:'Thank you', aliases:['shukran','shukraan','shokran','شكرا'], category:'Connection'},
    {id:'name', ar:'اسمي', latin:'ismi', meaning:'My name is', aliases:['ismi','esmi','اسمي'], category:'Connection'},
    {id:'coffee', ar:'قهوة', latin:'gahwa', meaning:'Coffee', aliases:['gahwa','gahwah','qahwa','qahwah','قهوة'], category:'Everyday life'},
    {id:'water', ar:'ماي', latin:'maay', meaning:'Water', aliases:['maay','mai','may','maai','ماي'], category:'Everyday life'},
    {id:'want', ar:'أبا', latin:'aba', meaning:'I want', aliases:['aba','abaa','ابا','أبا','ابغي','أبغي','abghi'], category:'Everyday life'},
    {id:'where', ar:'وين', latin:'wain', meaning:'Where', aliases:['wain','wayn','wein','wen','وين'], category:'Getting around'},
    {id:'market', ar:'السوق', latin:'as-soog', meaning:'The market', aliases:['as soog','al soog','as souq','al souq','as souk','al souk','alsouq','السوق'], category:'Getting around'}
  ];
  const scenarios = [
    {id:'hello', title:'A first hello', subtitle:'Meet someone. Make a connection.', tag:'Connection', icon:'chat', color:'sage', setting:'You meet Noura at a neighbourhood gathering.',
      turns:[
        {word:'hello',mode:'recall',ar:'',line:'Noura waves as you arrive.',prompt:'Greet Noura with “hello”.',context:'gathering:greeting'},
        {word:'name',mode:'recognition',ar:'اسمي نورة',line:'Noura introduces herself.',prompt:'What does “اسمي” mean here?',options:['My name is','Where is','Thank you'],context:'gathering:introduction'},
        {word:'thanks',mode:'recall',ar:'',line:'Noura welcomes you to the gathering.',prompt:'Thank her for the welcome.',context:'gathering:thanks'},
        {word:'hello',mode:'recall',ar:'',line:'Someone new joins you. This time, you start.',prompt:'How would you say “hello”?',context:'gathering:new-person'}]},
    {id:'cafe',title:'A moment for coffee',subtitle:'Order something you enjoy.',tag:'Everyday life',icon:'cup',color:'peach',setting:'You stop at a small café after a walk.',
      turns:[
        {word:'coffee',mode:'recognition',ar:'قهوة',line:'You notice a word on the menu.',prompt:'What is “قهوة”?',options:['Coffee','Water','The market'],context:'cafe:menu'},
        {word:'want',mode:'recognition',ar:'أبا قهوة',line:'The person beside you places an order.',prompt:'What does “أبا” mean here?',options:['I want','My name is','Where'],context:'cafe:overheard-order'},
        {word:'coffee',mode:'recall',ar:'',line:'It is your turn at the counter.',prompt:'Ask for “coffee” using the word you just met.',context:'cafe:order'},
        {word:'water',mode:'recall',ar:'',line:'You would like some water, too.',prompt:'What is the Emirati Arabic word for “water”?',context:'cafe:water'},
        {word:'thanks',mode:'recall',ar:'',line:'Your order is ready.',prompt:'Say “thank you”.',context:'cafe:thanks'}]},
    {id:'directions',title:'Find your way',subtitle:'Ask a question. Keep exploring.',tag:'Getting around',icon:'compass',color:'lilac',setting:'You are exploring the neighbourhood and looking for the market.',
      turns:[
        {word:'hello',mode:'recall',ar:'',line:'You approach someone to ask for help.',prompt:'Start with “hello”.',context:'street:greeting'},
        {word:'where',mode:'recognition',ar:'وين السوق؟',line:'Another visitor is asking a question.',prompt:'What does “وين” mean?',options:['Where','Coffee','My name is'],context:'street:question'},
        {word:'market',mode:'recognition',ar:'السوق',line:'A sign points towards your destination.',prompt:'What does “السوق” mean?',options:['The market','Water','Thank you'],context:'street:sign'},
        {word:'where',mode:'recall',ar:'',line:'Now you begin your own question.',prompt:'Start with the word for “where”.',context:'street:ask'},
        {word:'thanks',mode:'recall',ar:'',line:'You have the directions you need.',prompt:'Thank the person who helped.',context:'street:thanks'}]}
  ];
  const practiceFrames={
    hello:{chunks:[{ar:'مرحبا',latin:'marhaba',meaning:'Hello',word:'hello'}],translation:'Hello.',notice:'A single greeting is already a useful conversational unit.',situation:'You arrive at a new neighbour’s home and greet them.',prompt:'What word would you use for “hello”?'},
    thanks:{chunks:[{ar:'شكراً',latin:'shukran',meaning:'Thank you',word:'thanks'}],translation:'Thank you.',notice:'Keep the whole expression together. It can complete a real exchange.',situation:'A neighbour helps you carry a bag. You want to thank them.',prompt:'How would you say “thank you”?'},
    name:{chunks:[{ar:'اسمي',latin:'ismi',meaning:'My name is',word:'name'},{ar:'نورة',latin:'Noura',meaning:'Noura'}],translation:'My name is Noura.',notice:'Notice the introduction and the name as two parts. The name can change.',situation:'You join a group for the first time and begin introducing yourself.',prompt:'Write the part meaning “my name is”, before adding your name.'},
    coffee:{chunks:[{ar:'أبا',latin:'aba',meaning:'I want',word:'want'},{ar:'قهوة',latin:'gahwa',meaning:'Coffee',word:'coffee'}],translation:'I want coffee.',notice:'First the request, then the drink. Work on the drink word before rebuilding the request.',situation:'You are visiting a friend who asks which drink you would like.',prompt:'Give the word for “coffee”.'},
    water:{chunks:[{ar:'أبا',latin:'aba',meaning:'I want',word:'want'},{ar:'ماي',latin:'maay',meaning:'Water',word:'water'}],translation:'I want water.',notice:'Notice how the drink fits after the request. Focus on the small part you need.',situation:'After a walk, you ask for water at a kiosk.',prompt:'Give the Emirati Arabic word for “water”.'},
    want:{chunks:[{ar:'أبا',latin:'aba',meaning:'I want',word:'want'},{ar:'ماي',latin:'maay',meaning:'Water',word:'water'}],translation:'I want water.',notice:'The request stays the same when the thing you want changes.',situation:'You are asking for something at a small shop.',prompt:'Start with the words meaning “I want”.'},
    where:{chunks:[{ar:'وين',latin:'wain',meaning:'Where',word:'where'},{ar:'السوق؟',latin:'as-soog?',meaning:'The market',word:'market'}],translation:'Where is the market?',notice:'Find the question word first, then the place. Practice just the part you are reaching for.',situation:'You ask a neighbour where the market is.',prompt:'Begin your question with the word for “where”.'},
    market:{chunks:[{ar:'وين',latin:'wain',meaning:'Where',word:'where'},{ar:'السوق؟',latin:'as-soog?',meaning:'The market',word:'market'}],translation:'Where is the market?',notice:'Notice the question and the destination as two small pieces.',situation:'Someone asks which place you are looking for.',prompt:'Tell them “the market”.'}
  };
  const content = {words,scenarios,practiceFrames,version:2,reviewStatus:'Draft: Emirati educator review required before public release.'};
  if(typeof module==='object'&&module.exports) module.exports=content; else root.MelorinaContent=content;
})(typeof globalThis!=='undefined'?globalThis:this);
