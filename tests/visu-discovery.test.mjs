import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { discover } from '../src/visu/discovery.mjs';

async function fixture(t) {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'visu-discovery-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  execFileSync('git',['init','-q',root]);
  const put=async(rel,content='useful project evidence\n')=>{const file=path.join(root,...rel.split('/'));await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,content);};
  return {root,put};
}

test('discovers balanced project intent, current state, implementation, and style without project-specific config',async t=>{
  const {root,put}=await fixture(t);
  await put('README.md','# Product\nA concrete project.');
  await put('docs/design/architecture.md','# Architecture\nCurrent architecture.');
  await put('docs/CONTEXT.md','# Context\nCurrent state.');
  await put('docs/TODO.md','# TODO\nOpen work.');
  await put('src/index.ts','export const app = 1;');
  await put('src/theme.css',':root { --ink: #123; }');
  await put('package.json','{"name":"fixture","scripts":{"start":"node src/index.ts"}}');
  await put('docs/research/old.md','Historical research.');
  await put('docs/archive/decision.md','Old decision.');
  await put('node_modules/pkg/index.js','private dependency');
  await put('.env','PRIVATE=do-not-read');
  await put('private/session.md','private dump');
  await put('assets/image.png',Buffer.from([0,1,2]));
  await put('.gitignore','ignored/\n');
  await put('ignored/secret.md','ignore me');
  await put('docs/confidential.md','tracked before ignore');
  execFileSync('git',['-C',root,'add','docs/confidential.md']);
  await put('.gitignore','ignored/\ndocs/confidential.md\n');
  const found=await discover(root);
  assert.equal(found.report.inventory,'git');
  assert.deepEqual(found.sources.map(s=>s.path),[
    'docs/CONTEXT.md','docs/TODO.md','README.md','package.json','docs/design/architecture.md','src/index.ts','src/theme.css','docs/research/old.md','docs/archive/decision.md'
  ]);
  assert.equal(found.sources.find(s=>s.path==='src/theme.css').role,'style');
  assert.ok(found.sources.every(s=>s.reason && s.startLine===1 && s.endLine>=1));
  const all=JSON.stringify(found);
  for(const forbidden of ['PRIVATE=','private/session','node_modules','ignored/','confidential']) assert.equal(all.includes(forbidden),false);
});

test('ordering and selection remain stable across filesystem creation order and include new files on next run',async t=>{
  const {root,put}=await fixture(t);
  await put('z/entry.js','z'); await put('README.md','readme'); await put('a/entry.js','a');
  const first=await discover(root);
  assert.deepEqual(first.sources.map(x=>x.path),['README.md','a/entry.js','z/entry.js']);
  await put('docs/CONTEXT.md','fresh state');
  const second=await discover(root);
  assert.equal(second.sources[0].path,'docs/CONTEXT.md');
  assert.ok(second.report.filesSeen > first.report.filesSeen);
});

test('requires Git for source discovery instead of guessing ignore semantics',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'visu-discovery-plain-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  await assert.rejects(discover(root),/requires a Git repository/);
});

test('caps breadth and skips symlinked files and oversized inputs',async t=>{
  const {root,put}=await fixture(t);
  for(let i=0;i<40;i++) await put(`src/file-${String(i).padStart(2,'0')}.ts`,Array(20).fill('x'.repeat(800)).join('\n'));
  await put('docs/huge.md','x'.repeat(2*1024*1024+1));
  const outside=await fs.mkdtemp(path.join(os.tmpdir(),'visu-discovery-outside-'));
  t.after(()=>fs.rm(outside,{recursive:true,force:true}));
  await fs.writeFile(path.join(outside,'secret.md'),'outside');
  try { await fs.symlink(outside,path.join(root,'linked'),'junction'); } catch { /* platform policy may disallow creating links */ }
  const found=await discover(root);
  assert.ok(found.sources.length<=30);
  assert.ok(found.report.estimatedBytes<=600*1024);
  assert.ok(found.report.categories.code>=6);
  assert.ok(found.report.skipped>=1);
  assert.ok(found.sources.every(s=>!s.path.startsWith('linked/')));
});

test('rejects a symlinked discovery root',async t=>{
  const {root}=await fixture(t);
  const link=path.join(os.tmpdir(),`visu-discovery-link-${process.pid}`);
  try {
    await fs.symlink(root,link,'junction');
    await assert.rejects(discover(link),/symlink/);
  } catch(e) { if (e.code!=='EPERM' && e.code!=='EACCES') throw e; }
  finally { await fs.rm(link,{recursive:true,force:true}); }
});
