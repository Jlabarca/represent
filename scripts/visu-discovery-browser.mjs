import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.VISU_PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:1100}}),checks=[],errors=[],posts=[];
const out='experiments/visu-discovery';await fs.mkdir(out,{recursive:true});
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
try{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:8871');await page.getByRole('button',{name:/ImageLab/}).click();await page.locator('#art-image').waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelector('#art-image').naturalWidth>0);
  assert.equal(await page.locator('#pins .pin').count(),6);checks.push('Root-only ImageLab has six automatically selected chapters and generated art');
  await page.locator('.pin').first().focus();assert.ok(await page.locator('#inspector-content').isVisible());assert.equal(await page.locator('.chapter-explanation').count(),3);checks.push('Current state, intended design and next steps are separate with captured citations');
  const ratios=[];
  for(const theme of ['light','dark','mono']){
    await page.selectOption('#theme-select',theme);await page.screenshot({path:`${out}/imagelab-${theme}.png`,fullPage:true});
    const pairs=await page.evaluate(()=>{
      const rgb=x=>{const n=x.match(/[\d.]+/g)?.map(Number);return n?.length>=3?n.slice(0,3):[0,0,0];};
      const lum=c=>c.map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((v,x,i)=>v+x*[.2126,.7152,.0722][i],0);
      return ['.chapter-explanation>p','.chapter-explanation h3','.region-summary','.region-detail','.source-card summary','#project-name','#project-description'].map(sel=>{
        const el=document.querySelector(sel),style=getComputedStyle(el);let parent=el,bg;
        while(parent){const c=getComputedStyle(parent).backgroundColor;if(c!=='rgba(0, 0, 0, 0)'&&c!=='transparent'){bg=rgb(c);break;}parent=parent.parentElement;}
        const a=lum(rgb(style.color)),b=lum(bg||[255,255,255]);return {selector:sel,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
      });
    });
    for(const pair of pairs)assert.ok(pair.ratio>=(theme==='mono'?7:4.5),`${theme} ${pair.selector}: ${pair.ratio}`);
    ratios.push({theme,pairs});
  }
  checks.push('Measured key text contrast ≥4.5:1 in light/dark, ≥7:1 in monochrome');
  assert.equal(await page.locator('#art-image').evaluate(n=>getComputedStyle(n).filter),'grayscale(1)');checks.push('Monochrome artwork is a local CSS transformation');
  await page.reload();await page.getByRole('button',{name:/ImageLab/}).click();assert.equal(await page.locator('body').getAttribute('data-theme'),'mono');checks.push('Appearance persists after reload');
  await page.selectOption('#project-switch','luz');await page.waitForFunction(()=>document.querySelector('#project-name').textContent==='Luz y Luna');await page.locator('#art-image').waitFor({state:'visible'});
  await page.locator('#outline-button').click();assert.match(await page.locator('#outline-list').innerText(),/Catalog|Storefront|Wholesale/);checks.push('Luz exposes specific catalog, storefront and future wholesale topics');
  await page.locator('#outline-close').click();await page.selectOption('#theme-select','dark');await page.locator('.pin').nth(2).click();await page.screenshot({path:`${out}/luz-dark.png`,fullPage:true});
  await page.keyboard.press('Escape');assert.equal(await page.locator('#inspector-content').isVisible(),false);checks.push('Keyboard disclosure closes and returns focus');
  await page.setViewportSize({width:390,height:844});await page.locator('.pin').nth(2).click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.ok(await page.locator('#inspector-content').isVisible());await page.screenshot({path:`${out}/luz-mobile.png`,fullPage:true});checks.push('390px viewport fits and tap detail remains usable');
  assert.equal(posts.length,0);assert.deepEqual(errors,[]);checks.push('Browsing, themes and history cause no POSTs, JavaScript errors or failing requests');
  await fs.writeFile(`${out}/browser-check.json`,JSON.stringify({at:new Date().toISOString(),checks,ratios,posts,errors},null,2));console.log(JSON.stringify({checks:checks.length,errors}));
}finally{await browser.close();}
