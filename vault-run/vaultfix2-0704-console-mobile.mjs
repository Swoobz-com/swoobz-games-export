// vaultfix2-0704-console-mobile.mjs — supplementary check: (1) zero page
// errors/console.error across the full Lobby->BetEntry->Playing->Settled
// flow at 1440x900 (desktop, exercises the new FIX A/B code paths) and at
// 390x844 (mobile, must take the `if (!isWide) return null` early-out in
// VaultGutterCards, so none of the new code ever runs); (2) mobile renders
// all 4 phases with ZERO desktop gutter testids present (isWide gate holds).
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5401';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickText(page, t, within) {
  const h = await page.evaluateHandle(({ t, within }) => {
    const root = within ? document.querySelector(within) : document;
    if (!root) return null;
    const els = [...root.querySelectorAll('button,[role=button]')];
    return (
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
  }, { t, within });
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
async function isSettled(page) {
  return await page.evaluate(() => !!(document.querySelector('[data-testid="vault-settled-left"]') || document.body.textContent.includes('BUST') || document.body.textContent.includes('SECURED')));
}
async function clickCanvasFraction(page, fx, fy) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (!box) return false;
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy);
  return true;
}

async function runFlow(browser, w, h, { mobile }) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('console.error: ' + msg.text());
  });
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(600);
  const testidsLobby = await page.evaluate(() => [...document.querySelectorAll('[data-testid]')].map((e) => e.getAttribute('data-testid')));

  await clickText(page, 'ape in');
  await wait(600);
  const testidsBetEntry = await page.evaluate(() => [...document.querySelectorAll('[data-testid]')].map((e) => e.getAttribute('data-testid')));
  await clickText(page, 'SEND IT');
  await wait(700);
  const testidsPlaying = await page.evaluate(() => [...document.querySelectorAll('[data-testid]')].map((e) => e.getAttribute('data-testid')));

  const spots = [];
  for (let gx = 1; gx <= 9; gx++) for (let gy = 1; gy <= 9; gy++) spots.push([gx / 10, gy / 10]);
  for (const [fx, fy] of spots) {
    if (await isSettled(page)) break;
    await clickCanvasFraction(page, fx, fy);
    await wait(220);
  }
  await wait(900);
  const testidsSettled = await page.evaluate(() => [...document.querySelectorAll('[data-testid]')].map((e) => e.getAttribute('data-testid')));

  const desktopGutterIds = ['vault-gutter-left', 'vault-gutter-right', 'vault-lobby-left', 'vault-lobby-right', 'vault-playing-left', 'vault-playing-right', 'vault-settled-left', 'vault-settled-right-new', 'vault-betentry-left', 'vault-betentry-right'];
  const foundDesktopIds = mobile
    ? [...new Set([...testidsLobby, ...testidsBetEntry, ...testidsPlaying, ...testidsSettled])].filter((id) => desktopGutterIds.includes(id))
    : [];

  await page.close();
  return { errors, foundDesktopIds, phaseCounts: { lobby: testidsLobby.length, betentry: testidsBetEntry.length, playing: testidsPlaying.length, settled: testidsSettled.length } };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const R = {};
  R.desktop_1440x900 = await runFlow(browser, 1440, 900, { mobile: false });
  R.mobile_390x844 = await runFlow(browser, 390, 844, { mobile: true });
  await browser.close();
  fs.writeFileSync('vaultfix2-0704-console-mobile-results.json', JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();
