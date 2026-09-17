(function(root){
'use strict';
class VoiceClient{
 constructor(env=root){this.env=env;this.epoch=0;this.controllers=new Set();this.urls=new Set();this.player=null;this.recorder=null;this.stream=null;this.timer=null;this.pendingRecord=null;this.baseUrl='';this.token='';this.user=null;this.configure();}
 configure(){
  let saved='';try{saved=this.env.localStorage?.getItem('melorina.backend')||'';}catch{}
  const location=this.env.location,defaultURL=this.env.MelorinaConfig?.apiBaseUrl||saved;
  // Pages and standalone files have no same-origin API. Never guess a deployed hostname.
  try{this.baseUrl=defaultURL?this.validOrigin(defaultURL):(location&&(location.protocol==='file:'||location.hostname?.endsWith('.github.io'))?null:'');}catch{this.baseUrl=null;}
  this.restoreSession();
 }
 validOrigin(value){let url;try{url=new URL(value);}catch{throw Error('Enter the HTTPS address of your Melorina voice service.');}
  if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('Use an HTTPS server address without a path.');return url.origin;
 }
 sessionKey(){return 'melorina.session:'+(this.baseUrl||this.env.location?.origin||'local');}
 restoreSession(){this.token='';this.user=null;try{const saved=JSON.parse(this.env.sessionStorage?.getItem(this.sessionKey())||'null');if(saved?.expires>Date.now()&&/^[-\w]{43}$/.test(saved.token)){this.token=saved.token;if(saved.user&&/^[a-z0-9-]{36}$/.test(saved.user.id))this.user=saved.user;}}catch{}}
 clearSession(){this.token='';this.user=null;try{this.env.sessionStorage?.removeItem(this.sessionKey());}catch{}}
 setBackend(value){const base=this.validOrigin(value);this.cancel();this.clearSession();this.baseUrl=base;try{this.env.localStorage?.setItem('melorina.backend',base);}catch{}this.restoreSession();}
 suggestedBackend(){try{return new URLSearchParams(this.env.location?.hash?.slice(1)).get('connect')||'';}catch{return '';}}
 profileKey(){return this.user?encodeURIComponent(this.baseUrl||this.env.location?.origin||'local')+':'+this.user.id:null;}
 async signIn(kind,credentials){if(!['login','register'].includes(kind))throw Error('Invalid sign-in action.');const epoch=this.epoch,key=this.sessionKey(),result=await this.request(kind,credentials);
  if(epoch!==this.epoch)throw Error('Sign-in was cancelled.');
  this.token=result.token;this.user=result.user;try{this.env.sessionStorage?.setItem(key,JSON.stringify(result));}catch{}return result.user;
 }
 async account(){const epoch=this.epoch;const result=await this.request('account');if(epoch!==this.epoch)throw Error('Connection changed.');this.user=result.user;return result;}
 async signOut(){const pending=this.token?this.request('logout',{}):Promise.resolve();this.clearSession();await pending;}
 async request(path,body,raw=false,purpose='practice'){
  if(this.baseUrl===null)throw Error('The voice service has not been connected yet. Text practice is ready.');
  if(!['status','account','login','register','logout','speech','transcribe','conversation'].includes(path))throw Error('Unknown voice request.');
  const controller=new AbortController();this.controllers.add(controller);const epoch=this.epoch;
  try{
   const response=await this.env.fetch((this.baseUrl||'')+'/api/'+path,{method:body===undefined?'GET':'POST',mode:'cors',credentials:'omit',redirect:'error',headers:{...(this.token&&!['status','login','register'].includes(path)?{Authorization:'Bearer '+this.token}:{}),...(body===undefined?{}:{'Content-Type':raw?body.type:'application/json','X-Melorina-Client':'voice-v1',...(raw?{'X-Melorina-Purpose':purpose}:{})})},body:body===undefined?undefined:raw?body:JSON.stringify(body),signal:controller.signal});
   if(!response.ok){let result;try{result=await response.json();}catch{}if(response.status===401&&!['login','register'].includes(path)&&epoch===this.epoch)this.clearSession();const error=Error(result?.error||'Voice is temporarily unavailable. Please try again.');error.status=response.status;throw error;}
   return path==='speech'?await response.blob():await response.json();
  }finally{this.controllers.delete(controller);}
 }
 async speak(data){
  this.stopPlayback();const epoch=this.epoch,blob=await this.request('speech',data);if(epoch!==this.epoch)return false;
  const url=this.env.URL.createObjectURL(blob);this.urls.add(url);const player=new this.env.Audio(url);this.player=player;
  return new Promise((resolve,reject)=>{
   let settled=false;
   const finish=(error)=>{if(settled)return;settled=true;this.playResolve=null;this.stopPlayback();if(error)reject(Error('Playback was blocked or interrupted. Tap Listen again to hear it.'));else resolve(true);};
   this.playResolve=value=>{if(settled)return;settled=true;this.playResolve=null;resolve(value);};
   player.onended=()=>finish();player.onerror=()=>finish(true);
   try{Promise.resolve(player.play()).catch(()=>finish(true));}catch{finish(true);}
  });
 }
 stopPlayback(){this.playResolve?.(false);if(this.player){this.player.pause();this.player.src='';this.player=null;}for(const url of this.urls)this.env.URL.revokeObjectURL(url);this.urls.clear();}
 async record(onStatus){
  if(this.recorder){this.recorder.stop();return;}
  if(this.pendingRecord)return;
  if(!this.env.navigator.mediaDevices?.getUserMedia||!this.env.MediaRecorder)throw Error('Microphone recording needs a supported browser on localhost or HTTPS. You can still type in a conversation.');
  this.stopPlayback();const epoch=this.epoch;onStatus('permission');this.pendingRecord=true;
  let stream;
  try{stream=await this.env.navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});}catch(e){this.pendingRecord=null;throw Error(e.name==='NotAllowedError'?'Microphone permission was not granted. You can still type.':'No microphone is available.');}
  if(epoch!==this.epoch){stream.getTracks().forEach(t=>t.stop());return null;}
  this.pendingRecord=null;this.stream=stream;
  const mime=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(t=>this.env.MediaRecorder.isTypeSupported(t));
  if(!mime){stream.getTracks().forEach(t=>t.stop());this.stream=null;throw Error('This browser has no supported recording format. Try a current Chrome, Edge, or Safari.');}
  return new Promise((resolve,reject)=>{
   let recorder;try{recorder=new this.env.MediaRecorder(stream,{mimeType:mime});}catch{stream.getTracks().forEach(t=>t.stop());this.stream=null;reject(Error('The microphone could not start.'));return;}
   this.recorder=recorder;this.recordResolve=resolve;const chunks=[];let size=0;const start=Date.now();
   recorder.ondataavailable=e=>{if(e.data.size){chunks.push(e.data);size+=e.data.size;if(size>=5*1024*1024&&recorder.state==='recording')recorder.stop();}};
   recorder.onstop=()=>{clearTimeout(this.timer);stream.getTracks().forEach(t=>t.stop());this.stream=null;this.recorder=null;this.recordResolve=null;if(epoch!==this.epoch)return resolve(null);const blob=new Blob(chunks,{type:mime.split(';')[0]});resolve({blob,seconds:(Date.now()-start)/1000});};
   recorder.onerror=()=>{this.recordResolve=null;this.cancel();reject(Error('Recording stopped unexpectedly. Please try again.'));};
   try{recorder.start(250);}catch{this.recordResolve=null;this.cancel();reject(Error('Recording could not start. Try again.'));return;}onStatus('recording');this.timer=setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},30000);
  });
 }
 stopRecording(){if(this.recorder?.state==='recording')this.recorder.stop();}
 cancel(){this.epoch++;for(const c of this.controllers)c.abort();this.controllers.clear();clearTimeout(this.timer);if(this.recorder){this.recorder.onstop=null;this.recorder.ondataavailable=null;this.recorder.onerror=null;if(this.recorder.state!=='inactive')try{this.recorder.stop();}catch{}}this.stream?.getTracks().forEach(t=>t.stop());this.recorder=null;this.stream=null;this.pendingRecord=null;this.recordResolve?.(null);this.recordResolve=null;this.stopPlayback();}
}
if(typeof module==='object'&&module.exports)module.exports=VoiceClient;else root.MelorinaVoiceClient=VoiceClient;
})(typeof globalThis!=='undefined'?globalThis:this);
