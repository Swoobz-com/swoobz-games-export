// holisticaudit0703-visreg-worlds-narrow.mjs
// Part 2 of the visual-regression lane: (A) per-world (BLUECHIPS + SHITCOIN)
// per-phase screenshots at 1440x900 to catch scenic/HUD regressions the
// gutter migration may have introduced; (B) 1024x768 narrow-desktop zone
// (just above isWide>=960) for gutter-card/board overlap or clipping;
// (C) small-win vs big-win SETTLED screenshots (cinematic-completeness note).
// Same fresh port 5303 dev server as gaptable script. READ-ONLY.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5303';
const OUT = 'shots-holisticaudit0703/visreg';
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
async function clickTextWithin(page, selector, t) { return clickText(page, t, selector); }
async function rectOf(page, selector) {
  return await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
  }, selector);
}
async function selectMode(page, modeName) { await clickTextWithin(page, '[data-testid="vault-betentry-world"]', modeName); }
async function isPlaying(page) {
  return await page.evaluate(() => document.body.textContent.includes('PUMPING') || document.body.textContent.includes('TRAIL'));
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
async function tryReveal(page, fx, fy) {
  const stillPlaying = await isPlaying(page);
  if (!stillPlaying) return false;
  await clickCanvasFraction(page, fx, fy);
  await wait(450);
  return true;
}
async function takeProfitEnabled(page) {
  return await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.toLowerCase().includes('take profit'));
    return btn ? !btn.disabled : false;
  });
}

// ---------- (A) Per-world screenshots at 1440x900 ----------
async function perWorldSweep(browser) {
  const R = {};
  for (const mode of ['BLUECHIPS', 'SHITCOIN']) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await wait(500);

    await page.screenshot({ path: `${OUT}/world-${mode}-01-lobby.png`, fullPage: true });

    await clickText(page, 'ape in');
    await wait(600);
    await selectMode(page, mode);
    await wait(400);
    await page.screenshot({ path: `${OUT}/world-${mode}-02-betentry.png`, fullPage: true });
    const betentryRight = await rectOf(page, '[data-testid="vault-betentry-right"]');
    const canvas1 = await rectOf(page, 'canvas');

    await clickTextWithin(page, '[data-testid="vault-betentry-confirm"]', 'SEND IT');
    await wait(800);
    await page.screenshot({ path: `${OUT}/world-${mode}-03-playing.png`, fullPage: true });
    const canvasPlaying = await rectOf(page, 'canvas');

    // reveal a handful of safe tiles across a grid pattern (works for 5x5 and 7x7)
    const spots = [[0.15,0.15],[0.85,0.15],[0.15,0.85],[0.85,0.85],[0.5,0.5],[0.3,0.6],[0.6,0.3],[0.4,0.4],[0.6,0.6],[0.2,0.5]];
    let revealed = 0;
    for (const [fx, fy] of spots) {
      const enabledBefore = await takeProfitEnabled(page);
      if (enabledBefore) revealed++;
      const ok = await tryReveal(page, fx, fy);
      if (!ok) break;
    }
    await clickTextWithin(page, '[data-testid="vault-playing-actions"]', 'take profit');
    await wait(900);
    await page.screenshot({ path: `${OUT}/world-${mode}-04-settled.png`, fullPage: true });

    R[mode] = { betentryRight, canvas1, canvasPlaying, revealedApprox: revealed, pageerrors: errors };
    await page.close();
  }
  return R;
}

// ---------- (B) 1024x768 narrow-desktop zone (isWide breakpoint is >=960) ----------
async function narrowDesktopSweep(browser) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);

  const R = {};
  R.isWideCheck = await page.evaluate(() => window.innerWidth >= 960);
  await page.screenshot({ path: `${OUT}/narrow1024x768-01-lobby.png`, fullPage: true });
  R.lobby_gutterRight = await rectOf(page, '[data-testid="vault-gutter-right"]');
  R.lobby_canvas = await rectOf(page, 'canvas');
  R.lobby_shell = await rectOf(page, '[data-testid="vault-canvas-shell"]');

  await clickText(page, 'ape in');
  await wait(600);
  await selectMode(page, 'BLUECHIPS');
  await wait(400);
  await page.screenshot({ path: `${OUT}/narrow1024x768-02-betentry.png`, fullPage: true });
  R.betentry_right = await rectOf(page, '[data-testid="vault-betentry-right"]');
  R.betentry_canvas = await rectOf(page, 'canvas');
  R.betentry_shell = await rectOf(page, '[data-testid="vault-canvas-shell"]');
  // overlap check: does betentry-right rect intersect the canvas rect?
  if (R.betentry_right && R.betentry_canvas) {
    R.betentry_overlapsCanvas = !(
      R.betentry_right.left >= R.betentry_canvas.right ||
      R.betentry_right.right <= R.betentry_canvas.left ||
      R.betentry_right.top >= R.betentry_canvas.bottom ||
      R.betentry_right.bottom <= R.betentry_canvas.top
    );
  }
  // clipping check: does the card extend past the viewport/shell right edge?
  R.betentry_clippedRight = R.betentry_right ? R.betentry_right.right > 1024 : null;

  await clickTextWithin(page, '[data-testid="vault-betentry-confirm"]', 'SEND IT');
  await wait(800);
  await page.screenshot({ path: `${OUT}/narrow1024x768-03-playing.png`, fullPage: true });
  R.playing_gutterRight = await rectOf(page, '[data-testid="vault-gutter-right"]');
  R.playing_canvas = await rectOf(page, 'canvas');

  for (const [fx, fy] of [[0.5,0.5],[0.45,0.4],[0.55,0.6]]) {
    const still = await isPlaying(page);
    if (!still) break;
    await tryReveal(page, fx, fy);
  }
  await clickTextWithin(page, '[data-testid="vault-playing-actions"]', 'take profit');
  await wait(900);
  await page.screenshot({ path: `${OUT}/narrow1024x768-04-settled.png`, fullPage: true });
  R.settled_gutterRight = await rectOf(page, '[data-testid="vault-gutter-right"]');
  R.settled_canvas = await rectOf(page, 'canvas');

  R.pageerrors = errors;
  R.hasVScroll = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight);
  R.scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  R.innerHeight = await page.evaluate(() => window.innerHeight);

  await page.close();
  return R;
}

// ---------- (C) small-win vs big-win SETTLED cinematic-completeness ----------
async function winTierSweep(browser) {
  const R = {};
  // SMALL/TIGHT win: reveal exactly 1 safe tile then take profit immediately.
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await wait(500);
    await clickText(page, 'ape in');
    await wait(600);
    await selectMode(page, 'BLUECHIPS');
    await wait(400);
    await clickTextWithin(page, '[data-testid="vault-betentry-confirm"]', 'SEND IT');
    await wait(800);
    let got = false;
    for (const [fx, fy] of [[0.5,0.5],[0.45,0.4],[0.55,0.6],[0.4,0.55],[0.6,0.45]]) {
      await tryReveal(page, fx, fy);
      if (await takeProfitEnabled(page)) { got = true; break; }
    }
    R.smallWin_revealed1 = got;
    await clickTextWithin(page, '[data-testid="vault-playing-actions"]', 'take profit');
    await wait(200); // capture DURING hero overlay (HERO_VISIBLE_MS=2000)
    await page.screenshot({ path: `${OUT}/wintier-SMALL-hero-overlay.png`, fullPage: true });
    await wait(2200); // let hero auto-dismiss
    await page.screenshot({ path: `${OUT}/wintier-SMALL-settled-after.png`, fullPage: true });
    R.smallWin_bodyText = await page.evaluate(() => document.body.innerText.slice(0, 4000));
    await page.close();
  }
  // BIG win: reveal as many safe tiles as possible before mines force a stop
  // (or a generous cap), to push the multiplier well past HUGE_VAULT_BPS
  // (30_000 bps = 3.00x).
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await wait(500);
    await clickText(page, 'ape in');
    await wait(600);
    await selectMode(page, 'BLUECHIPS');
    await wait(400);
    await clickTextWithin(page, '[data-testid="vault-betentry-confirm"]', 'SEND IT');
    await wait(800);
    // sweep many grid cells, stop as soon as playing ends (mine hit) or 18 reveals reached
    let revealed = 0;
    const grid = [];
    for (let gy = 1; gy <= 6; gy++) for (let gx = 1; gx <= 6; gx++) grid.push([gx / 7, gy / 7]);
    for (const [fx, fy] of grid) {
      const still = await isPlaying(page);
      if (!still) break;
      await clickCanvasFraction(page, fx, fy);
      await wait(260);
      revealed++;
      if (revealed >= 18) break;
    }
    R.bigWin_revealAttempts = revealed;
    R.bigWin_stillPlaying = await isPlaying(page);
    if (R.bigWin_stillPlaying) {
      await clickTextWithin(page, '[data-testid="vault-playing-actions"]', 'take profit');
      await wait(200);
      await page.screenshot({ path: `${OUT}/wintier-BIG-hero-overlay.png`, fullPage: true });
      await wait(2200);
      await page.screenshot({ path: `${OUT}/wintier-BIG-settled-after.png`, fullPage: true });
      R.bigWin_bodyText = await page.evaluate(() => document.body.innerText.slice(0, 4000));
    } else {
      // hit a mine (rug) before cashing out — capture the bust state instead, noted.
      await wait(200);
      await page.screenshot({ path: `${OUT}/wintier-BIG-attempt-RUGGED.png`, fullPage: true });
      R.bigWin_bodyText = await page.evaluate(() => document.body.innerText.slice(0, 4000));
    }
    await page.close();
  }
  return R;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  fs.mkdirSync(OUT, { recursive: true });
  const R = {};
  R.perWorld = await perWorldSweep(browser);
  R.narrow1024x768 = await narrowDesktopSweep(browser);
  R.winTier = await winTierSweep(browser);
  await browser.close();
  fs.writeFileSync(`${OUT}/results-part2.json`, JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();
