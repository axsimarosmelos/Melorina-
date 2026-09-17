'use strict';
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const {createProvider,ApiError}=require('./openai');
const root=path.resolve(__dirname,'..');
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
async function readBody(req,limit){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>limit)throw new ApiError(413,'This recording or request is too large. Try a shorter recording.');chunks.push(chunk);}return Buffer.concat(chunks);}
function createServer({provider=createProvider(),rateLimit=30}={}){
 let active=0,windowStart=Date.now(),requests=0;
 const server=http.createServer(async(req,res)=>{
  // This single-user development server is deliberately loopback-only. Reject DNS rebinding and cross-site API calls.
  const host=req.headers.host||'',port=server.address()?.port;
  if(!['localhost:'+port,'127.0.0.1:'+port].includes(host)){res.writeHead(403);return res.end('Local access only.');}
  let url;try{url=new URL(req.url,'http://'+host);}catch{return json(res,400,{error:'Invalid URL.'});}
  if(url.pathname.startsWith('/api/')){
   const origin=req.headers.origin;
   if(origin&&origin!=='http://'+host)return json(res,403,{error:'Use this app from its own local address.'});
   if(url.pathname==='/api/status'&&req.method==='GET')return json(res,200,{configured:provider.configured,provider:'OpenAI',maxRecordingSeconds:30});
   if(req.method!=='POST'||req.headers['x-melorina-client']!=='voice-v1')return json(res,403,{error:'Open voice practice in Melorina to use this service.'});
   if(!['/api/speech','/api/transcribe','/api/conversation'].includes(url.pathname))return json(res,404,{error:'Unknown endpoint.'});
   if(!provider.configured)return json(res,503,{error:'Voice is not connected yet. Configure OPENAI_API_KEY on the local server.'});
   if(Date.now()-windowStart>60000){windowStart=Date.now();requests=0;}
   if(active>=2||requests>=rateLimit)return json(res,429,{error:'Please pause a moment before another voice request.'});
   active++;requests++;const controller=new AbortController();
   res.on('close',()=>{if(!res.writableEnded)controller.abort();});
   try{
    const mime=(req.headers['content-type']||'').split(';')[0];
    if(url.pathname==='/api/transcribe'){
     if(!['audio/webm','audio/mp4','audio/mpeg','audio/wav'].includes(mime))throw new ApiError(415,'Unsupported recording format.');
     const purpose=req.headers['x-melorina-purpose']||'practice';if(!['practice','command'].includes(purpose))throw new ApiError(400,'Invalid recording purpose.');
     const body=await readBody(req,6*1024*1024);if(body.length<100)throw new ApiError(400,'The recording is empty or too short.');
     return json(res,200,await provider.transcribe(body,mime,purpose,controller.signal));
    }
    if(mime!=='application/json')throw new ApiError(415,'Expected JSON.');
    const raw=await readBody(req,24000);let body;try{body=JSON.parse(raw);}catch{throw new ApiError(400,'Invalid JSON.');}
    if(!body||typeof body!=='object'||Array.isArray(body))throw new ApiError(400,'Invalid request.');
    if(url.pathname==='/api/conversation')return json(res,200,await provider.conversation(body,controller.signal));
    const audio=await provider.speech(body,controller.signal);
    res.writeHead(200,{'Content-Type':'audio/mpeg','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(audio);
   }catch(error){if(!res.destroyed)json(res,error.status||500,{error:error instanceof ApiError?error.message:'The voice request failed. Please try again.'});}
   finally{active--;}
   return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
  let file;try{file=decodeURIComponent(url.pathname);}catch{res.writeHead(400);return res.end();}
  // Serve only browser assets. Never expose .env, server code, tests, or arbitrary project files.
  if(file==='/')file='/index.html';
  if(!(file==='/index.html'||file==='/dist/melorina.html'||/^\/src\/[a-z-]+\.(js|css)$/.test(file))){res.writeHead(404);return res.end('Not found');}
  try{const content=await fs.readFile(path.join(root,file));res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(req.method==='HEAD'?undefined:content);}catch{res.writeHead(404);res.end('Not found');}
 });
 server.requestTimeout=45000;server.headersTimeout=10000;return server;
}
module.exports={createServer};
