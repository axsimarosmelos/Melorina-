// Optional browser integration. Start npm start first; all paid API endpoints are mocked here.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
function silence(){const b=Buffer.alloc(44+8000);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(8000,40);return b;}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
 try{
  const context=await browser.newContext({permissions:['microphone'],viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[];let transcriptions=0;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',async route=>{
   const name=new URL(route.request().url()).pathname;
   if(name==='/api/speech')return route.fulfill({contentType:'audio/wav',body:silence()});
   if(name==='/api/status')return route.fulfill({json:{configured:true}});
   if(name==='/api/transcribe'){transcriptions++;return route.fulfill({json:{text:'ماي',requiresConfirmation:true}});}
   if(name==='/api/conversation')return route.fulfill({json:{arabic:'مرحبا',latin:'marhaba',english:'Hello. What would you like?',feedback:'Try one small part.',focusWord:'water'}});
   return route.abort();
  });
  await page.goto('http://localhost:4173');await page.locator('[data-view="voice"]').first().click();await page.getByText('Voice configured',{exact:true}).waitFor();
  await page.locator('[data-v-consent]').check();await page.locator('[data-v-pref="voice"]').selectOption('cedar');
  await page.locator('[data-v-start="listening"]').click();assert.equal(await page.locator('.voice-model').count(),0);
  await page.locator('[data-v-listen]').click();await page.locator('[data-v-answer="coffee"]:not([disabled])').waitFor();await page.locator('[data-v-answer="coffee"]').click();
  let state=await page.evaluate(()=>JSON.parse(localStorage.getItem('melorina.v1')));assert.equal(state.voice.skills['coffee:listening'].independent,1);
  await page.locator('[data-view="words"]').click();await page.locator('#word-search').fill('water');await page.locator('[data-voice-word="water"]').click();await page.locator('[data-v-consent]').check();
  await page.locator('[data-v-record="word"]').click();await page.getByRole('button',{name:'Stop recording',exact:true}).waitFor();await page.waitForTimeout(500);await page.getByRole('button',{name:'Stop recording',exact:true}).click();
  await page.locator('[data-v-transcribe]').waitFor();assert.equal(transcriptions,0);await page.locator('[data-v-transcribe]').click();await page.locator('[data-v-confirm]').waitFor();
  state=await page.evaluate(()=>JSON.parse(localStorage.getItem('melorina.v1')));assert.equal(state.voice.skills['water:spoken'],undefined);
  await page.locator('[data-v-confirm]').click();state=await page.evaluate(()=>JSON.parse(localStorage.getItem('melorina.v1')));assert.equal(state.voice.skills['water:spoken'].independent,1);
  await page.locator('[data-v-home]').click();await page.locator('[data-v-chat]').click();await page.locator('#voice-chat-form button:not([disabled])').waitFor();await page.locator('#voice-chat-input').fill('مرحبا');await page.locator('#voice-chat-form button').click();await page.locator('.voice-bubble.learner').waitFor();
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('[data-view="today"]').first().click();assert.deepEqual(errors,[]);
  console.log('PASS: mocked voice browser flow, explicit uploads, confirmed evidence, conversation, and mobile overflow.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
