import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,readFile,cp,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parseBrowserExport,importVideoTrial} from '../scripts/clay-notes-video-trial.mjs';
import {buildPackage,crc32} from '../scripts/clay-notes-package.mjs';
import {NotebookStore} from '../src/clay-notes/core.mjs';
test('native exports retain caption language/times and exclude header metadata from speech',()=>{
  const result=parseBrowserExport('YouTube transcript\nVideo ID: X6J3ByTqhLY\nLanguage: es\nCaptions: auto-generated\n\n[0:00] Primera idea\n[1:02] Otra idea');
  assert.equal(result.language,'es','exported Spanish captions must retain their language');
  assert.equal(result.segments.length,2);assert.equal(result.segments[1].start,62);
  assert.equal(result.segments[0].text,'Primera idea');
});
async function temporary(t){const directory=await mkdtemp(join(tmpdir(),'clay-release-'));t.after(()=>rm(directory,{recursive:true,force:true}));return directory;}
test('source-only import stores real captions without invoking any gateway or inventing summaries',async t=>{
  const directory=await temporary(t),exportPath=join(directory,'video.txt');
  await writeFile(exportPath,'YouTube transcript\nVideo ID: X6J3ByTqhLY\nLanguage: es\nCaptions: auto-generated\n[0:12] Una idea del autor');
  let calls=0;const store=await new NotebookStore(join(directory,'notes'),{complete:async()=>{calls++;throw new Error('Forbidden inference');}}).init();
  const report=await importVideoTrial({url:'https://youtu.be/X6J3ByTqhLY',title:'Actual supplied video',channel:'Example',exportPath,store});
  assert.equal(calls,0);assert.equal(report.summaryCalls,0);assert.equal(report.notebookState,'awaiting_summary');assert.equal((await store.get(report.id)).revisions.length,0);assert.equal(report.segments,1);assert.match(report.normalizedSha256,/^[a-f0-9]{64}$/);
  await assert.rejects(importVideoTrial({url:'https://youtu.be/t2_F7Fn8vYA',title:'Other',exportPath,store}),/does not match/);
  const again=await importVideoTrial({url:'https://youtu.be/X6J3ByTqhLY',title:'Changed title',exportPath,store});assert.equal(again.imported,false);assert.equal((await store.get(report.id)).title,'Actual supplied video');
});
test('export adapter rejects missing source metadata and malformed timestamp data',()=>{
  assert.throws(()=>parseBrowserExport('[0:00] No id'),/headers/);
  assert.throws(()=>parseBrowserExport('Video ID: X6J3ByTqhLY\nLanguage: es\n[0:77] Invalid'),/timestamp/);
  assert.throws(()=>parseBrowserExport('Video ID: X6J3ByTqhLY\nLanguage: es\nNo captions'),/No transcript/);
});
function members(bytes){
  const output=[];let cursor=0;
  while(bytes.readUInt32LE(cursor)===0x04034b50){const size=bytes.readUInt32LE(cursor+18),nameLength=bytes.readUInt16LE(cursor+26),extraLength=bytes.readUInt16LE(cursor+28),name=bytes.toString('utf8',cursor+30,cursor+30+nameLength),data=bytes.subarray(cursor+30+nameLength+extraLength,cursor+30+nameLength+extraLength+size);assert.equal(crc32(data),bytes.readUInt32LE(cursor+14));output.push(name);cursor+=30+nameLength+extraLength+size;}
  assert.equal(bytes.readUInt32LE(cursor),0x02014b50);assert.equal(bytes.readUInt32LE(bytes.length-22),0x06054b50);return output;
}
test('release ZIP is reproducible, contains declared locales/icons, and excludes secrets/runtime files',async t=>{
  const directory=await temporary(t),source=join(directory,'extension');await cp(new URL('../extensions/clay-notes/',import.meta.url),source,{recursive:true});
  await writeFile(join(source,'.env'),'not-a-real-secret');await writeFile(join(source,'notebook.json'),'private fixture');
  const first=await buildPackage({source,output:join(directory,'one')}),second=await buildPackage({source,output:join(directory,'two')});
  assert.equal(first.sha256,second.sha256);const archive=await readFile(first.path),names=members(archive);assert.deepEqual(names,first.members);assert.ok(names.includes('manifest.json'));assert.ok(names.includes('_locales/es/messages.json'));assert.ok(names.includes('_locales/ar/messages.json'));assert.ok(names.includes('icons/128.png'));assert.equal(names.some(name=>name.includes('.env')||name.includes('notebook')),false);
  assert.equal(first.version,'0.2.0');assert.equal(first.credentialValuesIncluded,false);
});
test('package validation rejects missing assets and path traversal in manifest resources',async t=>{
  const directory=await temporary(t),source=join(directory,'extension');await cp(new URL('../extensions/clay-notes/',import.meta.url),source,{recursive:true});
  const path=join(source,'manifest.json'),manifest=JSON.parse(await readFile(path,'utf8'));manifest.background.service_worker='../secret.js';await writeFile(path,JSON.stringify(manifest));
  await assert.rejects(buildPackage({source,output:join(directory,'out')}),/allow-list/);
  manifest.background.service_worker='background.js';await writeFile(path,JSON.stringify(manifest));await rm(join(source,'icons','128.png'));
  await assert.rejects(buildPackage({source,output:join(directory,'out')}),/ENOENT/);
});
