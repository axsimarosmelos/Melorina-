'use strict';
const {createServer}=require('../server/app');
const {fromEnv}=require('../server/config');
const config=fromEnv(),hosted=config.mode==='hosted';
const store=hosted?new (require('../server/store').Store)(config.database,config.storeOptions):undefined;
const port=Number(process.env.PORT)||(hosted?10000:4173);
const server=createServer({config,store});
server.listen(port,hosted?'0.0.0.0':'127.0.0.1',()=>{
 console.log('Melorina is ready at '+(hosted?config.publicOrigin:'http://localhost:'+port));
 console.log(process.env.OPENAI_API_KEY?'OpenAI voice is configured.':'Text practice is ready. Voice needs a server-side OPENAI_API_KEY.');
});
let stopping=false;
function stop(){if(stopping)return;stopping=true;server.close(()=>{store?.close();process.exit(0);});setTimeout(()=>process.exit(1),40000).unref();}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
