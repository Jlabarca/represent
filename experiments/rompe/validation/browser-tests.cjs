// Application tests run in a fresh headless profile, never the user's browser.
const { chromium } = require(process.argv[2] || process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const report = { runtime: 'Playwright Chromium, headless isolated profile', viewport: {width:1440,height:1000}, checks: [], console: [], errors: [], dialogs: [], externalRequests: [] };
async function main() {
  const browser = await chromium.launch({headless:true});
  const context = await browser.newContext({viewport:report.viewport, acceptDownloads:true});
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(String(e)));
  page.on('console', m => { if (m.type() !== 'debug') report.console.push({type:m.type(),text:m.text()}); });
  page.on('dialog', async d => { report.dialogs.push(d.message()); await d.accept(); });
  await context.route(/^https?:/, route => {report.externalRequests.push(route.request().url()); return route.abort();});
  try {
    const config = JSON.parse(fs.readFileSync(path.join(root,'interactive-diagram/explainer.config.json'),'utf8'));
    await page.goto(pathToFileURL(path.join(root,'interactive-diagram/explainer.html')).href);
    await page.locator('.node-group').first().waitFor();
    assert.equal(await page.locator('.tab-btn').count(),10);
    for (const tab of config.tabs) {
      await page.locator(`.tab-btn[data-tab-id="${tab.id}"]`).click();
      const svg = page.locator('#canvas > svg:visible');
      assert.equal(await svg.locator('.node-group').count(),tab.blocks.length);
      await page.locator('#btn-audit').click();
      report.checks.push({name:`tab:${tab.id}`,cards:tab.blocks.length,passed:true});
    }
    await page.locator('.tab-btn[data-tab-id="risk"]').click();
    await page.locator('#canvas > svg:visible .node-group[data-id="red"]').click();
    await page.waitForFunction(()=>document.querySelector('#panel-desc')?.textContent.includes('if flagged'));
    assert.match(await page.locator('#panel-desc').innerText(),/if flagged/);
    assert(await page.locator('#panel-resp a').count() > 0);
    const href = await page.locator('#panel-resp a').first().getAttribute('href');
    const source = await context.newPage();
    await source.goto(new URL(href,page.url()).href);
    const hash = new URL(source.url()).hash;
    assert(hash && await source.locator(`[id="${decodeURIComponent(hash.slice(1))}"]`).count() === 1);
    await source.close();
    report.checks.push({name:'red-rule-detail-and-source-anchor',passed:true});
    await page.locator('#panel-close').click();
    await page.mouse.move(0,0);
    await page.screenshot({path:path.join(__dirname,'risk-desktop.png')});
    await page.locator('.tab-btn[data-tab-id="loop"]').click();
    const before = await page.locator('#canvas > svg:visible').getAttribute('viewBox');
    await page.locator('#btn-zoom-in').click();
    assert.notEqual(await page.locator('#canvas > svg:visible').getAttribute('viewBox'),before);
    await page.locator('#btn-fit').click();
    await page.mouse.move(0,0);
    report.checks.push({name:'zoom-and-fit',passed:true});
    await page.screenshot({path:path.join(__dirname,'loop-desktop.png')});
    const download = page.waitForEvent('download');
    await page.locator('#btn-svg').click();
    const exported = await download;
    await exported.saveAs(path.join(__dirname,'loop-export.svg'));
    assert.match(fs.readFileSync(path.join(__dirname,'loop-export.svg'),'utf8'),/<svg/);
    report.checks.push({name:'svg-export',passed:true});
    await page.locator('#btn-theme').click();
    await page.screenshot({path:path.join(__dirname,'loop-alternate-theme.png')});
    await page.setViewportSize({width:390,height:844});
    await page.locator('#btn-fit').click();
    await page.screenshot({path:path.join(__dirname,'loop-mobile.png')});
    report.mobile = await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
    await page.setViewportSize(report.viewport);
    await page.goto(pathToFileURL(path.join(root,'interactive-diagram/poster.html')).href);
    await page.locator('#stage svg').waitFor();
    await page.locator('#audit').click();
    await page.screenshot({path:path.join(__dirname,'template-poster.png'),fullPage:true});
    const posterDownload = page.waitForEvent('download');
    await page.locator('#svg').click();
    await (await posterDownload).saveAs(path.join(root,'interactive-diagram/poster.svg'));
    report.checks.push({name:'poster-render-audit-and-svg-export',passed:true});
    assert.equal(report.dialogs.length,11);
    assert(report.dialogs.every(message=>message.startsWith('✓')), 'An upstream layout audit reported a problem');
    assert.equal(report.errors.length,0);
    assert.equal(report.externalRequests.length,0);
    report.passed = true;
  } catch(e) {
    report.failure = String(e.stack || e);
    report.passed = false;
    await page.screenshot({path:path.join(__dirname,'failure.png'),fullPage:true}).catch(()=>{});
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(path.join(__dirname,'browser-results.json'),JSON.stringify(report,null,2)+'\n');
    await browser.close();
    console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,errors:report.errors,dialogs:report.dialogs,failure:report.failure},null,2));
  }
}
main().catch(e=>{console.error(e);process.exitCode=1});
