import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Visu} from './core.mjs';
import {Ghost} from './ghost.mjs';
import {serve} from './server.mjs';
export const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export async function configured() {
  const config=process.env.VISU_MANIFEST_DIR||path.join(repo,'examples/visu');
  const files=(await fs.readdir(config)).filter(x=>x.endsWith('.json')).sort();
  const manifests=await Promise.all(files.map(async file=>JSON.parse(await fs.readFile(path.join(config,file),'utf8'))));
  const key=process.env.VISU_GHOST_KEY||process.env.LITELLM_KEY_OPERATOR;
  return new Visu({store:process.env.VISU_STORE||path.join(repo,'.represent/visu'),manifests,ghost:key?new Ghost({key,url:process.env.VISU_GHOST_URL,model:process.env.VISU_IMAGE_MODEL||'image-gen',analysisModel:process.env.VISU_TEXT_MODEL||'gemini-flash'}):null,analysisModel:process.env.VISU_TEXT_MODEL||'gemini-flash',maxCalls:Number(process.env.VISU_MAX_IMAGE_CALLS||3),maxCostUsd:Number(process.env.VISU_MAX_COST_USD||1)});
}
async function main() {
  const [command='serve',id]=process.argv.slice(2),visu=await configured();
  if(command==='serve') {const port=Number(process.env.VISU_PORT||8871);await serve(visu,{port,webRoot:path.join(repo,'web/visu')});console.log(`Visu: http://127.0.0.1:${port} (local only; ${visu.ghost?'Ghost configured':'offline capture/history mode'})`);}
  else if(command==='scan') console.log(JSON.stringify((await visu.scan(id)).result,null,2));
  else if(command==='analyze') console.log(JSON.stringify((await visu.analyze(id)).result,null,2));
  else if(command==='generate') console.log(JSON.stringify((await visu.generate(id)).result,null,2));
  else if(command==='export') console.log(JSON.stringify(await visu.export(id),null,2));
  else if(command==='list') console.log(JSON.stringify(await visu.list(),null,2));
  else throw new Error('Usage: cli.mjs serve | list | scan <id> | analyze <id> | generate <id> | export <id>');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) main().catch(e=>{console.error(e.message);process.exitCode=1;});
