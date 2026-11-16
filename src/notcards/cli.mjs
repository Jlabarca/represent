import {startNotcardsServer} from './server.mjs';

if(process.argv[2]&&process.argv[2]!=='serve'){
  console.error('Usage: node src/notcards/cli.mjs serve');process.exitCode=1;
}else{
  try{
    const app=await startNotcardsServer();
    console.log(`Notcards development service listening on ${app.url}`);
    console.log(`Google sign-in ${app.identity.configured?'configured':'waiting for development client credentials'}.`);
    for(const event of ['SIGINT','SIGTERM'])process.once(event,async()=>{await app.close();process.exit(0);});
  }catch(error){console.error(`Notcards: ${error.message}`);process.exitCode=1;}
}
