const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve('experiments/grafe-restart/fixture-viewer.html')).href);
  const call = page.getByRole('button', { name: /presentAccount\(\)/ }).first();
  await call.click();
  await page.getByText('main.ts:5', { exact: false }).waitFor();
  const result = {
    title: await page.title(),
    buttons: await page.locator('nav button').count(),
    selected: await page.locator('nav button[aria-current=true]').innerText(),
    sourceExcerpt: await page.locator('article pre').allInnerTexts(),
    showsCallLabel: await page.getByText('call', { exact: true }).count() > 0,
    errors,
  };
  await page.screenshot({ path: path.resolve('experiments/grafe-restart/output/grafe-fixture.png'), fullPage: true });
  await browser.close();
  if (result.errors.length || !result.sourceExcerpt.some(x => x.includes('presentAccount(account)'))) process.exitCode = 1;
  console.log(JSON.stringify(result, null, 2));
})();
