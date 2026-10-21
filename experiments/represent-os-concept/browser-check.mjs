import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const rawBaseURL = process.env.BASE_URL ?? 'http://127.0.0.1:8876/experiments/represent-os-concept/';
const baseURL = rawBaseURL.endsWith('/') ? rawBaseURL : `${rawBaseURL}/`;
const browser = await chromium.launch({ headless: true });
const errors = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const page = await context.newPage();
page.on('pageerror', error => errors.push(String(error)));
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
await page.goto(baseURL, { waitUntil: 'networkidle' });
const title = await page.title();
const initial = await page.locator('#scenario').innerText();
const initialDetailsClosed = await page.locator('details').evaluate(el => !el.open);
await page.screenshot({ path: 'D:/ware/represent/experiments/represent-os-concept/desktop.png', fullPage: true });
await page.getByText('Research evidence and boundaries', { exact: true }).click();
const detailsOpen = await page.locator('details').evaluate(el => el.open);
const localLinks = await page.locator('a[href]').evaluateAll(anchors => anchors.map(a => a.href).filter(href => new URL(href).origin === location.origin));
const localLinkChecks = await page.evaluate(async links => Promise.all(links.map(async href => {
  const response = await fetch(href);
  return { href, status: response.status, ok: response.ok };
})), localLinks);
await page.getByRole('button', { name: 'Inspect my checkout' }).click();
const local = await page.locator('#scenario').innerText();
const localPressed = await page.getByRole('button', { name: 'Inspect my checkout' }).getAttribute('aria-pressed');
const localLayerActive = await page.locator('[data-layer="local"]').evaluate(el => el.classList.contains('active'));
await page.getByRole('button', { name: 'Run an untrusted tool' }).click();
const isolated = await page.locator('#scenario').innerText();
await page.getByRole('button', { name: 'Full desktop apps' }).click();
const fullDesktop = await page.locator('#scenario').innerText();
await page.getByRole('button', { name: 'Browse snapshots' }).click();
await page.keyboard.press('Tab');
const focusVisible = await page.evaluate(() => !!document.activeElement && document.activeElement !== document.body);
const desktop = { viewport: '1440x1000', docWidth: await page.evaluate(() => document.documentElement.scrollWidth), title, initialHasWeb: initial.includes('Web workspace'), localHasAgent: local.includes('Local agent'), localPressed, localLayerActive, isolatedHasLinux: isolated.toLowerCase().includes('linux'), fullDesktopHasGui: fullDesktop.toLowerCase().includes('gui'), detailsClosed: initialDetailsClosed, detailsOpen, focusVisible };
await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: 'networkidle' });
const mobile = { viewport: '390x844', docWidth: await page.evaluate(() => document.documentElement.scrollWidth), width: await page.evaluate(() => document.documentElement.clientWidth), scenarioVisible: await page.locator('#scenario').isVisible() };
await page.screenshot({ path: 'D:/ware/represent/experiments/represent-os-concept/mobile.png', fullPage: true });
const expectedLocalURLs = [
  new URL('poster.png', baseURL).href,
  new URL('poster.svg', baseURL).href,
  new URL('README.md', baseURL).href,
  new URL('/docs/research/reports/Represent%20OS%20design%20and%20runtime.md', new URL(baseURL).origin).href,
];
const localLinksResolve = expectedLocalURLs.every(href => localLinkChecks.some(check => check.href === href && check.ok));
const report = { result: errors.length === 0 && desktop.docWidth === 1440 && mobile.docWidth === mobile.width && desktop.localPressed === 'true' && desktop.localLayerActive && desktop.isolatedHasLinux && desktop.fullDesktopHasGui && desktop.detailsClosed && desktop.detailsOpen && desktop.focusVisible && localLinkChecks.every(check => check.ok) && localLinksResolve, errors, desktop, mobile, baseURL, localLinkChecks, localLinksResolve, network: 'local-only', reducedMotion: true };
await writeFile('D:/ware/represent/experiments/represent-os-concept/browser-check.json', JSON.stringify(report, null, 2) + '\n');
await browser.close();
console.log(JSON.stringify(report, null, 2));
if (!report.result) process.exitCode = 1;
