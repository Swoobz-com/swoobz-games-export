// holisticaudit0703-visreg-playingright-overlap.mjs
// Follow-up probe: quantify the vault-playing-right (topOffset:72 action
// console: MANUAL|TRAIL + TAKE PROFIT) card's overlap with the board's
// PAINTED panel/tile area at 1024x768 vs 1440x900 (control). Fresh port
// 5303 dev server, same session as the rest of this audit. READ-ONLY.
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
  const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2;
  const y = bandCenterY - full / 2;
  const pad = Math.max(14, full * 0.045);
  return { x, y, full, pad, panelRight: x + full + pad, panelTop: y - pad, panelLeft: x - pad, panelBottom: y + full + pad };
}

async function run(browser, w, h, tag) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in');
  await wait(600);
  await selectMode(page, 'BLUECHIPS');
  await wait(400);
  await clickTextWithin(page, '[data-testid="vault-betentry-confirm"]', 'SEND IT');
  await wait(800);

  const playingRight = await rectOf(page, '[data-testid="vault-playing-right"]');
  const playingActions = await rectOf(page, '[data-testid="vault-playing-actions"]');
  const canvasRect = await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]');
    const c = shell ? shell.querySelector('canvas') : document.querySelector('canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
  });
  const geom = canvasRect ? panelGeometry(canvasRect.width, canvasRect.height, 5) : null;
  const panelViewport = geom
    ? {
        left: canvasRect.left + geom.panelLeft,
        right: canvasRect.left + geom.panelRight,
        top: canvasRect.top + geom.panelTop,
        bottom: canvasRect.top + geom.panelBottom,
      }
    : null;

  // Overlap of playingActions card vs the PAINTED panel rect (not full canvas DOM rect).
  let overlapPx = null;
  if (playingActions && panelViewport) {
    const ox = Math.max(0, Math.min(playingActions.right, panelViewport.right) - Math.max(playingActions.left, panelViewport.left));
    const oy = Math.max(0, Math.min(playingActions.bottom, panelViewport.bottom) - Math.max(playingActions.top, panelViewport.top));
    overlapPx = { overlapW: ox, overlapH: oy, overlaps: ox > 0 && oy > 0 };
  }

  await page.screenshot({ path: `${OUT}/playingright-overlap-${tag}-full.png`, fullPage: true });
  await page.close();
  return { viewport: { w, h }, playingRight, playingActions, canvasRect, panelViewport, overlapPx };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  fs.mkdirSync(OUT, { recursive: true });
  const R = {};
  R.v1024x768 = await run(browser, 1024, 768, '1024x768');
  R.v1440x900 = await run(browser, 1440, 900, '1440x900');
  R.v960x700 = await run(browser, 960, 700, '960x700-atbreakpoint');
  await browser.close();
  fs.writeFileSync(`${OUT}/results-playingright-overlap.json`, JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();
