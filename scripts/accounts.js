// Owner-only maintenance: run inside the hosting service shell, never in a browser.
'use strict';
const {fromEnv}=require('../server/config'),{Store}=require('../server/store'),{existsSync}=require('node:fs');
async function main(){
 const [action,name]=process.argv.slice(2);if(!['reset','revoke','delete'].includes(action)||!name)throw Error('Usage: node scripts/accounts.js reset|revoke|delete username');
 const config=fromEnv();if(config.mode!=='hosted'||!existsSync(config.database))throw Error('Run this on the hosted service with its existing account database.');
 const store=new Store(config.database,config.storeOptions);
 try{if(action==='reset'){
  if(process.stdin.isTTY)throw Error('Pipe the new password on stdin from a hidden shell prompt. See docs/deployment.md.');
  let input='';for await(const chunk of process.stdin){input+=chunk;if(input.length>256)throw Error('Password input is too long.');}
  await store.resetPassword(name,input.replace(/\r?\n$/,''));
 }else if(action==='revoke')store.revoke(name);else store.deleteAccount(name);
 console.log('Account operation completed. No credentials were printed.');
 }finally{store.close();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
