import test from 'node:test';
import assert from 'node:assert/strict';
import {cardArt,cardFinish,readLibraryCache,writeLibraryCache} from '../src/clay-notes/web/collection.mjs';
import {translate} from '../src/clay-notes/web/i18n.mjs';

function memoryStorage(){
  const values=new Map();
  return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
}

test('a warm collection retains source, finish and folder metadata',()=>{
  const storage=memoryStorage();
  const card={id:'Ecuit73WzV0',sourceType:'text',finish:'spectrum',folderId:'reading',transcriptAvailable:true,pinned:true};
  writeLibraryCache(storage,[card],100,'account-a');
  assert.deepEqual(readLibraryCache(storage,101,'account-a'),[card]);
});

test('card finishes stay stable and respect a saved finish',()=>{
  const note={id:'Ecuit73WzV0'};
  const first=cardFinish(note);
  assert.ok(['prism','classic','spectrum'].includes(first));
  assert.equal(cardFinish(note),first);
  assert.equal(cardFinish({...note,finish:'spectrum'}),'spectrum');
});

test('library caches stay isolated by account and local library',()=>{
  const storage=memoryStorage(),first=[{id:'Ecuit73WzV0',title:'First account'}],second=[{id:'X6J3ByTqhLY',title:'Second account'}],local=[{id:'t2_F7Fn8vYA',title:'Local notes'}];
  writeLibraryCache(storage,first,100,'account-a');
  writeLibraryCache(storage,second,100,'account-b');
  writeLibraryCache(storage,local,100);
  assert.equal(readLibraryCache(storage,101,'account-a')[0].title,'First account');
  assert.equal(readLibraryCache(storage,101,'account-b')[0].title,'Second account');
  assert.equal(readLibraryCache(storage,101)[0].title,'Local notes');
});

test('YouTube cards try the available large thumbnail then keep the saved fallback',()=>{
  const note={id:'Ecuit73WzV0',thumbnail:'https://i.ytimg.com/vi/Ecuit73WzV0/hqdefault.jpg'};
  assert.deepEqual(cardArt(note),{src:'https://i.ytimg.com/vi/Ecuit73WzV0/maxresdefault.jpg',fallback:note.thumbnail});
  const custom={...note,cover:'/api/notes/Ecuit73WzV0/images/00000000-0000-0000-0000-000000000000'};
  assert.deepEqual(cardArt(custom),{src:custom.cover,fallback:''});
  assert.match(cardArt({id:'t2_F7Fn8vYA'}).src,/^data:image\/gif/);
});

test('new album labels render in English and Spanish',()=>{
  assert.equal(translate('en','Tu colección'),'Your collection');
  assert.equal(translate('es','Tu colección'),'Tu colección');
  assert.equal(translate('en','RESEARCH NOTEBOOK'),'RESEARCH NOTEBOOK');
  assert.equal(translate('es','RESEARCH NOTEBOOK'),'CUADERNO DE INVESTIGACIÓN');
  assert.equal(translate('en','Sign in to save web and text research.'),'Sign in to save web and text research.');
});
