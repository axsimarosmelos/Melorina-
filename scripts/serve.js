const {createServer}=require('../server/app');
const port=Number(process.env.PORT)||4173;
createServer().listen(port,'127.0.0.1',()=>{
 console.log('Melorina is ready at http://localhost:'+port);
 console.log(process.env.OPENAI_API_KEY?'OpenAI voice is configured.':'Text practice is ready. Set OPENAI_API_KEY on the server to enable AI voice.');
});
