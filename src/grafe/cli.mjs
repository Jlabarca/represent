import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { indexProject, focus } from './core.mjs';
import { createServer } from './server.mjs';

const args=process.argv.slice(2); const command=args[0]??'help';
function flag(name, fallback=undefined){const i=args.indexOf(name);return i<0?fallback:args[i+1];}
function usage(){console.log('Grafe local source explorer\n\n  node src/grafe/cli.mjs index <project-root> [--output <snapshot.json>]\n  node src/grafe/cli.mjs serve --config <projects.json> [--port 8873] [--store <directory>]');}
if(command==='index'){
  const root=args[1]; if(!root || root.startsWith('--')){usage();process.exitCode=2;} else {const result=indexProject(root); const output=flag('--output'); if(output)fs.writeFileSync(path.resolve(output),JSON.stringify(result,null,2)); console.log(JSON.stringify({snapshotId:result.snapshotId,files:result.files.length,symbols:result.symbols.length,edges:result.edges.length,diagnostics:result.diagnostics.length,scope:result.scope.included},null,2));}
}else if(command==='serve'){
  const configPath=flag('--config');if(!configPath){usage();process.exitCode=2;}else{
    const config=JSON.parse(fs.readFileSync(path.resolve(configPath),'utf8'));
    if(!Array.isArray(config.projects)||!config.projects.length)throw new Error('Config must contain a nonempty projects array.');
    for(const p of config.projects)if(!/^[a-z0-9][a-z0-9-]{0,40}$/.test(p.id)||typeof p.name!=='string'||!path.isAbsolute(p.root))throw new Error('Each configured project needs a safe id, name and absolute root path.');
    const store=path.resolve(flag('--store',path.join(process.env.LOCALAPPDATA||os.homedir(),'Represent','grafe')));fs.mkdirSync(store,{recursive:true});
    const token=crypto.randomBytes(32).toString('hex');
    const server=createServer({projects:config.projects,store,token,port:Number(flag('--port','8873'))});
    server.listen(server.port,'127.0.0.1',()=>console.log(`Grafe ready at http://127.0.0.1:${server.port}`));
  }
}else usage();
