import {startServer} from './server.mjs';

if(process.argv[2] && process.argv[2]!=='serve') {
  console.error('Usage: node D:/ware/represent/src/clay-notes/cli.mjs serve'); process.exitCode=1;
} else {
  try {
    const app=await startServer();
    console.log(`Clay Notes · ${app.url}\nOpen the library to pair your Chrome extension.\n${process.env.CLAY_NOTES_GHOST_KEY?'Ghost consumer key configured.':'AI setup pending: set CLAY_NOTES_GHOST_KEY to this tool’s own virtual key.'}`);
    for(const event of ['SIGINT','SIGTERM']) process.once(event,async()=>{await app.close();process.exit(0);});
  } catch(error) {console.error(`Clay Notes: ${error.message}`);process.exitCode=1;}
}
