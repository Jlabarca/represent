import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const prototypeUrl = process.env.ALEGOR_PREVIEW_URL ?? pathToFileURL(resolve(import.meta.dirname ?? new URL('.', import.meta.url).pathname, 'index.html')).href;
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(prototypeUrl);
  await page.getByRole('heading', { name: 'Project re-entry' }).waitFor();
  await page.getByRole('heading', { name: 'What changed' }).waitFor();
  await page.getByRole('heading', { name: 'Needs review' }).waitFor();
  await page.getByText('Synthetic fixture', { exact: true }).waitFor();
  assert.equal(await page.locator('a[href*="evidence.html#context-"]').count(), 2);
  assert.equal(await page.locator('a[href*="evidence.html#todo-"]').count(), 2);
  const contextSource = await browser.newPage();
  await contextSource.goto(prototypeUrl);
  await contextSource.locator('a[href*="evidence.html#context-"]').first().click();
  assert.match(await contextSource.locator('body').innerText(), /Represent — Context/);
  assert.equal(await contextSource.locator('span:target').count(), 1);
  const todoSource = await browser.newPage();
  await todoSource.goto(prototypeUrl);
  await todoSource.locator('a[href*="evidence.html#todo-"]').first().click();
  assert.match(await todoSource.locator('body').innerText(), /Represent — TODO/);
  assert.equal(await todoSource.locator('span:target').count(), 1);
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(prototypeUrl);
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert.equal(overflow, false, 'mobile page should not overflow horizontally');
  assert.deepEqual(errors, []);
  const result = { pass: true, checks: 12, errors, sourceLinksOpened: 2, mobileOverflow: overflow, url: prototypeUrl };
  writeFileSync(new URL('./browser-smoke.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
