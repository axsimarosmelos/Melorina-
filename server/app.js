'use strict';
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const {createProvider,ApiError}=require('./openai');
const root=path.resolve(__dirname,'..');
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
async function readBody(req,limit){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>limit)throw new ApiError(413,'This recording or request is too large. Try a shorter recording.');chunks.push(chunk);}return Buffer.concat(chunks);}
async function readJSON(req,limit=24000){if((req.headers['content-type']||'').split(';')[0]!=='application/json')throw new ApiError(415,'Expected JSON.');const raw=await readBody(req,limit);let body;try{body=JSON.parse(raw);}catch{throw new ApiError(400,'Invalid JSON.');}if(!body||typeof body!=='object'||Array.isArray(body))throw new ApiError(400,'Invalid request.');return body;}
function createServer({provider=createProvider(),rateLimit=30,config={mode:'local'},store}={}){
 const hosted=config.mode==='hosted';if(hosted&&(!store||!config.publicOrigin))throw Error('Hosted mode requires authentication storage and a public origin.');
 const origins=new Set([config.publicOrigin,...(config.allowedOrigins||[])]);
 let active=0,authActive=0,windowStart=Date.now(),requests=0;const activeUsers=new Set();
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Permissions-Policy','microphone=(self), camera=()');
  // Health checks contain no private data and do not validate an OpenAI key with a paid call.
  if(req.url==='/healthz'&&req.method==='GET')return json(res,200,{ok:true});
  const host=req.headers.host||'',port=server.address()?.port;
  if(hosted?host!==new URL(config.publicOrigin).host:!['localhost:'+port,'127.0.0.1:'+port].includes(host))return json(res,403,{error:'This host is not allowed.'});
  let url;try{url=new URL(req.url,'http://'+host);}catch{return json(res,400,{error:'Invalid URL.'});}
  if(hosted)res.setHeader('Strict-Transport-Security','max-age=31536000');
  if(url.pathname==='/connect'&&hosted&&req.method==='GET'){
   res.writeHead(302,{Location:config.pagesURL+'#connect='+encodeURIComponent(config.publicOrigin),'Cache-Control':'no-store'});return res.end();
  }
  if(url.pathname.startsWith('/api/')){
   const origin=req.headers.origin;
   if(origin&&(hosted?!origins.has(origin):origin!=='http://'+host))return json(res,403,{error:'This app origin is not allowed.'});
   if(hosted&&origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
   if(hosted&&req.method==='OPTIONS'){
    if(!origin||!['GET','POST'].includes(req.headers['access-control-request-method']))return json(res,403,{error:'Unsupported cross-origin request.'});
    const headers=String(req.headers['access-control-request-headers']||'').toLowerCase().split(',').map(x=>x.trim()).filter(Boolean);
    if(headers.some(h=>!['authorization','content-type','x-melorina-client','x-melorina-purpose'].includes(h)))return json(res,403,{error:'Unsupported request header.'});
    res.writeHead(204,{'Access-Control-Allow-Methods':'GET, POST','Access-Control-Allow-Headers':'Authorization, Content-Type, X-Melorina-Client, X-Melorina-Purpose','Access-Control-Max-Age':'600'});return res.end();
   }
   if(url.pathname==='/api/status'&&req.method==='GET')return json(res,200,{configured:provider.configured,provider:'OpenAI',maxRecordingSeconds:30,...(hosted?{authRequired:true,registration:'invite',version:1}:{})});
   const bearer=/^Bearer ([-\w]{43})$/.exec(req.headers.authorization||'')?.[1];
   try{
    if(hosted&&url.pathname==='/api/account'&&req.method==='GET'){const user=store.authenticate(bearer);return json(res,200,{user,usage:store.usage(user)});}
    if(req.method!=='POST'||req.headers['x-melorina-client']!=='voice-v1')throw new ApiError(403,'Open voice practice in Melorina to use this service.');
    if(hosted&&['/api/login','/api/register'].includes(url.pathname)){
     if(authActive>=2)throw new ApiError(429,'Sign-in is busy. Please try again shortly.');
     authActive++;try{const body=await readJSON(req,4096);store.authBudget(body.name);return json(res,200,await store[url.pathname.slice(5)](body));}finally{authActive--;}
    }
    if(hosted&&url.pathname==='/api/logout'){store.authenticate(bearer);store.logout(bearer);return json(res,200,{ok:true});}
    if(!['/api/speech','/api/transcribe','/api/conversation'].includes(url.pathname))throw new ApiError(404,'Unknown endpoint.');
    const user=hosted?store.authenticate(bearer):null;
    if(!provider.configured)throw new ApiError(503,hosted?'Voice is not configured on this server yet. Please contact the Melorina owner.':'Voice is not configured. Set OPENAI_API_KEY on the local server.');
    if(Date.now()-windowStart>60000){windowStart=Date.now();requests=0;}
    if(active>=2||(hosted?activeUsers.has(user.id):requests>=rateLimit))throw new ApiError(429,'Please pause a moment before another voice request.');
    if(hosted)store.reserve(user,url.pathname.slice(5));
    active++;requests++;if(user)activeUsers.add(user.id);const controller=new AbortController();
    res.on('close',()=>{if(!res.writableEnded)controller.abort();});
    try{
     const mime=(req.headers['content-type']||'').split(';')[0];
     if(url.pathname==='/api/transcribe'){
      if(!['audio/webm','audio/mp4','audio/mpeg','audio/wav'].includes(mime))throw new ApiError(415,'Unsupported recording format.');
      const purpose=req.headers['x-melorina-purpose']||'practice';if(!['practice','command'].includes(purpose))throw new ApiError(400,'Invalid recording purpose.');
      const body=await readBody(req,6*1024*1024);if(body.length<100)throw new ApiError(400,'The recording is empty or too short.');
      return json(res,200,await provider.transcribe(body,mime,purpose,controller.signal));
     }
     const body=await readJSON(req);
     if(url.pathname==='/api/conversation')return json(res,200,await provider.conversation(body,controller.signal));
     const audio=await provider.speech(body,controller.signal);res.writeHead(200,{'Content-Type':'audio/mpeg','Cache-Control':'no-store'});return res.end(audio);
    }finally{active--;if(user)activeUsers.delete(user.id);}
   }catch(error){if(!res.destroyed)json(res,error instanceof ApiError?error.status:500,{error:error instanceof ApiError?error.message:'The voice request failed. Please try again.'});}
   return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
  let file;try{file=decodeURIComponent(url.pathname);}catch{res.writeHead(400);return res.end();}
  if(file==='/')file='/index.html';
  // Only browser assets are public. Credentials, account data and server source are never served.
  if(!(file==='/index.html'||file==='/dist/melorina.html'||/^\/src\/[a-z-]+\.(js|css)$/.test(file))){res.writeHead(404);return res.end('Not found');}
  try{const content=await fs.readFile(path.join(root,file));res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:content);}catch{res.writeHead(404);res.end('Not found');}
 });
 server.requestTimeout=45000;server.headersTimeout=10000;server.timeout=45000;return server;
}
module.exports={createServer};
