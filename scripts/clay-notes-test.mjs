// Translate actual Node TAP totals for the installed Orkest verifier.
import {spawn} from 'node:child_process';
import {readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const all=process.argv.includes('--all');
const files=readdirSync(new URL('../tests/',import.meta.url)).filter(name=>name.endsWith('.test.mjs') && (all || name.startsWith('clay-notes'))).map(name=>`tests/${name}`);
// Existing Git-heavy suites need a longer file budget; serialize files on Windows.
const child=spawn(process.execPath,['--test','--test-reporter=tap','--test-concurrency=1',`--test-timeout=${all?60000:15000}`,...files],{cwd:root,stdio:['ignore','pipe','pipe']});
let output='';for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{output+=chunk;process.stdout.write(chunk);});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('close',code=>{
  const count=key=>Number(new RegExp(`^# ${key} (\\d+)$`,'m').exec(output)?.[1] || 0);
  const errors=count('cancelled');
  console.log(`${count('pass')} passed, ${count('fail')} failed, ${count('skipped')} skipped, ${errors} errors`);
  process.exitCode=code===0 && count('pass')>0 && !errors?0:1;
});
