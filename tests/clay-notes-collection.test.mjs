import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {startServer} from '../src/clay-notes/server.mjs';
const ids=['X6J3ByTqhLY','t2_F7Fn8vYA','Ecuit73WzV0'];
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
async function setup(t){const directory=await mkdtemp(join(tmpdir(),'clay-collection-'));const app=await startServer({directory,port:0});t.after(async()=>{await app.close();await rm(directory,{recursive:true,force:true});});const home=await fetch(app.url);const cookie=home.headers.get('set-cookie').split(';')[0];const request=(path,method='GET',data)=>fetch(app.url+'/api'+path,{method,headers:{Cookie:cookie,...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});for(const id of ids)await request('/notes','POST',{url:`https://youtu.be/${id}`,title:id});return {app,request,directory};}
test('filtered manual reorder preserves hidden slots and survives a new store instance',async t=>{
  const {app,request}=await setup(t);const initial=await (await request('/notes')).json();const order=initial.map(n=>n.id);
  const response=await request('/order','PATCH',{ids:[order[2],order[0]]});assert.equal(response.status,200,'filtered reorder endpoint must accept known visible cards');
  assert.deepEqual((await response.json()).ids,[order[2],order[1],order[0]]);
  const {NotebookStore}=await import('../src/clay-notes/core.mjs');const reopened=await new NotebookStore(app.store.directory).init();assert.deepEqual((await reopened.list()).map(n=>n.id),[order[2],order[1],order[0]]);
  assert.equal((await request('/order','PATCH',{ids:[order[0],order[0]]})).status,400);assert.equal((await request('/order','PATCH',{ids:['abcdefghijk']})).status,400);
  assert.equal((await fetch(app.url+'/api/order',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:order})})).status,401);
});
test('image attachments are authenticated, owned, bounded and selectable as full-art cover',async t=>{
  const {app,request}=await setup(t);const uploaded=await request(`/notes/${ids[0]}/images`,'POST',{dataUrl:png,name:'my cover.png'});assert.equal(uploaded.status,201);
  const image=await uploaded.json();assert.equal(image.mime,'image/png');assert.ok(image.id);assert.equal(image.url,`/api/notes/${ids[0]}/images/${image.id}`);
  assert.equal((await fetch(app.url+image.url)).status,401);const binary=await request(`/notes/${ids[0]}/images/${image.id}`);assert.equal(binary.headers.get('content-type'),'image/png');assert.equal((await binary.arrayBuffer()).byteLength,image.bytes);
  assert.equal((await request(`/notes/${ids[1]}/images/${image.id}`)).status,404);
  assert.equal((await request(`/notes/${ids[1]}`,'PATCH',{coverImage:image.id})).status,400);
  assert.equal((await request(`/notes/${ids[0]}`,'PATCH',{coverImage:image.id})).status,200);
  const card=(await (await request('/notes')).json()).find(n=>n.id===ids[0]);assert.equal(card.cover,image.url);assert.equal(card.imageCount,1);assert.ok(!JSON.stringify(card).includes('base64'));
  assert.equal((await request(`/notes/${ids[0]}`,'PATCH',{coverImage:null})).status,200);assert.match((await (await request('/notes')).json()).find(n=>n.id===ids[0]).cover,/i.ytimg.com/);
  assert.equal((await request(`/notes/${ids[0]}/images`,'POST',{dataUrl:'data:image/svg+xml;base64,PHN2Zz4='})).status,400);
  assert.equal((await request(`/notes/${ids[0]}/images`,'POST',{dataUrl:'data:image/png;base64,aGVsbG8='})).status,400);
  const oversized='data:image/png;base64,'+Buffer.alloc(2*1024*1024+1).toString('base64');assert.equal((await request(`/notes/${ids[0]}/images`,'POST',{dataUrl:oversized})).status,400);
  await Promise.all(Array.from({length:9},()=>request(`/notes/${ids[0]}/images`,'POST',{dataUrl:png})));const note=await app.store.get(ids[0]);assert.equal(note.images.length,8);
});
test('legacy source notebooks remain readable with default thumbnail and no image metadata',async t=>{
  const {app,request}=await setup(t);const note=await app.store.get(ids[0]);delete note.images;delete note.coverImage;await writeFile(app.store.path(note.id),JSON.stringify(note));
  const card=(await (await request('/notes')).json()).find(n=>n.id===note.id);assert.equal(card.cover,note.thumbnail);assert.equal(card.imageCount,0);assert.equal((await request(`/notes/${note.id}`)).status,200);
});
test('collection cache is versioned, minimal, bounded and resilient to blocked or corrupt storage',async()=>{
  const {readLibraryCache,writeLibraryCache,sortCollection,mergeVisibleOrder}=await import('../src/clay-notes/web/collection.mjs');let saved;const storage={getItem:()=>saved,setItem:(key,value)=>{saved=value;}};const now=1700000000000;const notes=[{id:ids[0],title:'B',thumbnail:'https://i.ytimg.com/vi/X6J3ByTqhLY/hqdefault.jpg',segments:[{text:'private long transcript'}],personalNotes:'draft',createdAt:'2026-01-02'},{id:ids[1],title:'A',createdAt:'2026-01-01'}];
  writeLibraryCache(storage,notes,now);assert.ok(!saved.includes('private long transcript'));assert.ok(!saved.includes('draft'));assert.equal(readLibraryCache(storage,now+1).length,2);assert.equal(readLibraryCache(storage,now+8*86400000),null);saved='{broken';assert.equal(readLibraryCache(storage,now),null);assert.doesNotThrow(()=>writeLibraryCache({setItem:()=>{throw Error('quota');}},notes));
  assert.deepEqual(sortCollection(notes,'title','en').map(n=>n.id),[ids[1],ids[0]]);assert.deepEqual(mergeVisibleOrder(ids,[ids[2],ids[0]]),[ids[2],ids[1],ids[0]]);
});
test('cached collection renders and fresh notes load without waiting for model discovery',async()=>{
  const {bootCollection}=await import('../src/clay-notes/web/collection.mjs');let finishConfig;const events=[];let cache='';const storage={getItem:()=>cache,setItem:(key,value)=>{cache=value;}};const {writeLibraryCache}=await import('../src/clay-notes/web/collection.mjs');writeLibraryCache(storage,[{id:ids[0],title:'cached'}]);
  const boot=bootCollection({storage,loadNotes:async()=>[],loadConfig:()=>new Promise(resolve=>{finishConfig=resolve;}),onNotes:(notes,source)=>events.push([source,notes.length]),onConfig:()=>events.push(['config']),onError:error=>{throw error;}});
  assert.deepEqual(events,[['cache',1]]);await boot.notes;assert.deepEqual(events,[['cache',1],['network',0]]);finishConfig({});await boot.config;assert.deepEqual(events.at(-1),['config']);
});
