import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {videoImportStatus,videoSourceMessageKey} from '../src/clay-notes/web/collection.mjs';

test('caption loading is video-only and samples never pretend to be importing',()=>{
  assert.equal(videoImportStatus({sourceType:'text',state:'awaiting_summary'}), 'not-applicable');
  assert.equal(videoImportStatus({sourceType:'video',state:'awaiting_transcript'}), 'pending');
  assert.equal(videoImportStatus({url:'https://youtube.com/watch?v=abcdefghijk',state:'sample'}), 'unavailable');
});

test('confirmed caption failures have failure copy, not loading copy',()=>{
  const failed={sourceType:'video',state:'error',videoImport:{status:'failed'}};
  const unavailable={sourceType:'video',videoImport:{status:'unavailable'}};
  assert.equal(videoImportStatus(failed), 'failed');
  assert.equal(videoSourceMessageKey(failed,{status:videoImportStatus(failed)}),'Captions could not be fetched. The video is still available above.');
  assert.equal(videoSourceMessageKey(unavailable,{status:videoImportStatus(unavailable)}),'Captions are unavailable for this video.');
  assert.equal(videoImportStatus({sourceType:'video',segments:[{text:'Saved transcript'}],videoImport:{status:'failed'}}),'ready');
  assert.equal(videoImportStatus({sourceType:'video',state:'ready',transcriptAvailable:true,videoImport:{status:'failed'}}),'ready');
  assert.equal(videoImportStatus({sourceType:'video',state:'ready'}),'unavailable');
});

test('ready transcripts and public previews have distinct source copy',()=>{
  const ready={sourceType:'video',segments:[{text:'A source segment'}],transcriptSource:'auto'};
  assert.equal(videoImportStatus(ready),'ready');
  assert.equal(videoSourceMessageKey(ready,{status:'ready'}),'');
  assert.equal(videoSourceMessageKey({state:'sample'},{isVideo:true,preview:true,status:'unavailable'}),'Public video preview; captions are not included.');
  assert.equal(videoSourceMessageKey({sourceType:'text'},{isVideo:false,status:'not-applicable'}),'Your note is saved; add source text whenever you like.');
});

test('quick-note plus glyph uses a CSS escape and page assets are cache-busted',async()=>{
  const [css,html]=await Promise.all([
    readFile(new URL('../src/clay-notes/web/style.css',import.meta.url),'utf8'),
    readFile(new URL('../src/clay-notes/web/index.html',import.meta.url),'utf8')
  ]);
  assert.match(css,/\.quick-note-toggle::after\s*\{\s*content:"\\FF0B"/);
  assert.doesNotMatch(css,/Ã¯Â¼|â€¹/);
  const styleVersion=html.match(/style\.css\?v=webbook-(\d+)/)?.[1];
  assert.ok(Number(styleVersion)>=4);
  assert.equal(html.match(/app\.mjs\?v=webbook-(\d+)/)?.[1],styleVersion);
});
