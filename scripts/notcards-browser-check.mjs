import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {startNotcardsServer} from '../src/notcards/server.mjs';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.NOTCARDS_PLAYWRIGHT_PATH||'playwright');
const directory=await mkdtemp(join(tmpdir(),'notcards-click-retry-'));
const importer={
  attempts:0,
  enqueue(){this.attempts++;return Promise.resolve(this.attempts===1?
    {status:'failed',reason:'captions_request_failed'}:
    {status:'ready',segments:[{id:0,start:12,text:'Recovered caption'}],title:'Recovered video'});},
  async close(){}
};
let server,browser;
try{
  server=await startNotcardsServer({directory,port:0,videoImporter:importer});
  const owner=server.store.user({issuer:'https://accounts.google.com',subject:'browser-fixture',email:'fixture@example.invalid',displayName:'Test'});
  const created=await server.store.compose(owner.id,{draftId:crypto.randomUUID(),body:'https://youtu.be/X6J3ByTqhLY',title:'Video navigation fixture',folderId:null,split:false});
  const id=created.ids[0];
  await Promise.all(server.store.videoImportJobs.values());
  browser=await chromium.launch({executablePath:process.env.NOTCARDS_CHROMIUM||undefined});
  const context=await browser.newContext({locale:'en'});
  await context.addCookies([{url:server.url,name:'notcards_session',value:server.store.issueSession(owner.id).token}]);
  await context.route('https://**',route=>route.abort());
  const page=await context.newPage();
  let releaseFolders;
  const held=new Promise(resolve=>{releaseFolders=resolve;});
  await page.route('**/api/folders',async route=>{await held;await route.continue();});
  await page.goto(server.url,{waitUntil:'domcontentloaded'});
  await page.getByRole('link',{name:/Open notebook: Video navigation fixture/}).click();
  const notebook=page.locator('[data-notebook-id="'+id+'"]');
  await notebook.waitFor();
  const folderResponse=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/folders');
  releaseFolders();await folderResponse;
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(await notebook.count(),1,'late collection responses must not replace the notebook');
  await page.locator('[data-action="retry-video-import"]').click();
  await page.getByText('✦ Captions ready',{exact:true}).waitFor();
  assert.equal(importer.attempts,2);
  await page.reload();
  await page.getByRole('tab',{name:'Transcript'}).click();
  await page.getByText('Recovered caption',{exact:true}).waitFor();
  console.log('PASS: collection card click survives late folders, Retry starts a second import, and saved captions survive reload.');
}finally{
  await browser?.close();await server?.close();await rm(directory,{recursive:true,force:true});
}
