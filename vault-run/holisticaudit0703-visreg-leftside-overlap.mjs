// holisticaudit0703-visreg-leftside-overlap.mjs — quantify LEFT-side card
// overlap (vault-playing-left / vault-lobby-left / vault-settled-left, all
// topOffset:72 fixed left:20 to shell) vs the painted board panel's LEFT
// edge at 1024x768, mirroring the right-side probe. Same fresh port 5303.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5303';
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
function panelGeometry(W, H, gridSize) {
  const wide = W / H > 1.2;
  const topReserved = H * (wide ? 0.12 : 0.15);
  const bottomReserved = H * (wide ? 0.14 : 0.18);
  const sideFrac = 0.08;
  const safeW = W * (1 - sideFrac * 2);
  const safeH = (H - topReserved - bottomReserved) * 0.96;
  const available = Math.min(safeW, safeH);
  const gap = Math.max(6, available * 0.026);
  const tile = (available - gap * (gridSize - 1)) / gridSize;
  const full = tile * gridSize + gap * (gridSize - 1);
  const x = (W - full) / 2;
  const pad = Math.max(14, full * 0.045);
  return { panelLeft: x - pad };
}
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

async function measureLeftOverlap(page, testid) {
  const cardRect = await rectOf(page, testid);
  const canvasRect = await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]');
    const c = shell ? shell.querySelector('canvas') : document.querySelector('canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { left: r.left, width: r.width, height: r.height };
  });
  if (!cardRect || !canvasRect) return { FAIL: 'missing', cardRect, canvasRect };
  const geom = panelGeometry(canvasRect.width, canvasRect.height, 5);
  const panelLeftViewport = canvasRect.left + geom.panelLeft;
  const overlapPx = Math.max(0, cardRect.right - panelLeftViewport);
  return { cardRect, panelLeftViewport, overlapPx, overlaps: overlapPx > 0 };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);

  const R = {};
  R.lobby_left = await measureLeftOverlap(page, '[data-testid="vault-lobby-hero"]');

  await clickText(page, 'ape in');
  await wait(600);
  await selectMode(page, 'BLUECHIPS');
  await wait(400);
  await clickTextWithin(page, '[data-testid="vault-betentry-confirm"]', 'SEND IT');
  await wait(800);
  R.playing_left = await measureLeftOverlap(page, '[data-testid="vault-playing-status"]');

  for (const [fx, fy] of [[0.5,0.5],[0.45,0.4],[0.55,0.6]]) {
    const still = await isPlaying(page);
    if (!still) break;
    await clickCanvasFraction(page, fx, fy);
    await wait(400);
  }
  await clickTextWithin(page, '[data-testid="vault-playing-actions"]', 'take profit');
  await wait(900);
  R.settled_left = await measureLeftOverlap(page, '[data-testid="vault-settled-result"]');

  await browser.close();
  fs.writeFileSync('shots-holisticaudit0703/visreg/results-leftside-overlap.json', JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();
