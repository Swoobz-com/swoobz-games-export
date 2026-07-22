// holisticaudit0703-visreg-gaptable.mjs
// HOLISTIC LIVE AUDIT (visual-regression lane, centerpiece deliverable) —
// board-panel-right-edge -> right-gutter-card-left-edge gap, ALL 4 phases
// (Lobby/BetEntry/Playing/Settled), 3 viewports (1440x900, 1920x1080,
// 1440x1920), against a FRESH `vite --port 5303 --strictPort` dev server
// started for THIS run only. Copied+adapted from vault-run/gapmeasure-
// after2-0703.mjs (panelGeometry/detectGridSize/clickText verbatim ports
// unchanged) per task brief. READ-ONLY — no source edits.
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
async function clickTextWithin(page, selector, t) {
  return clickText(page, t, selector);
}
async function rectOf(page, selector) {
  return await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
  }, selector);
}

// Verbatim port of computeGridLayout (VaultGridCanvas.tsx L871-892) +
// drawTerminalPanel/onBoardLayout pad math (L426, L1148): pad = max(14,
// full*0.045); panelLocalRight = x - pad + (full + 2*pad) = x + full + pad
// == the LIVE onBoardLayout `rightEdge` (confirmed by reading source L422-430
// directly this run — the WRONG-EDGE TRAP note says grid.x+grid.full ALONE
// reads 6px too tight; the pad-inclusive edge is both the visually painted
// panel edge AND the exact value boardPanelRightX carries).
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
  const px = x - pad;
  const py = y - pad;
  const pw = full + pad * 2;
  const ph = full + pad * 2;
  return {
    gridX: x, gridY: y, tile, gap, full,
    panelLocalLeft: px, panelLocalTop: py, panelLocalWidth: pw, panelLocalHeight: ph,
    panelLocalRight: px + pw,
    tileAreaLocalRight: x + full,
    pad,
  };
}

async function detectGridSize(page) {
  return await page.evaluate(() => {
    const root = document.querySelector('[data-testid="vault-betentry-world"]');
    if (!root) return { gridSize: 5, selected: null, reason: 'no-world-root' };
    const buttons = [...root.querySelectorAll('button,[role=button]')];
    const pressed = buttons.find(
      (b) => b.getAttribute('aria-pressed') === 'true' || /selected|active/i.test(b.className || ''),
    );
    const label = pressed ? pressed.textContent.trim() : null;
    const isShitcoin = label ? /shitcoin/i.test(label) : false;
    return { gridSize: isShitcoin ? 7 : 5, selected: label, reason: pressed ? 'pressed-found' : 'default-fallback' };
  });
}

async function selectMode(page, modeName) {
  await clickTextWithin(page, '[data-testid="vault-betentry-world"]', modeName);
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

async function revealOneTileVerified(page) {
  const spots = [[0.5, 0.5], [0.45, 0.4], [0.55, 0.6], [0.4, 0.55], [0.6, 0.45], [0.5, 0.35]];
  for (const [fx, fy] of spots) {
    const stillPlaying = await isPlaying(page);
    if (!stillPlaying) return false;
    await clickCanvasFraction(page, fx, fy);
    await wait(500);
    const enabled = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.toLowerCase().includes('take profit'));
      return btn ? !btn.disabled : false;
    });
    if (enabled) return true;
  }
  return false;
}

async function canvasRectOf(page) {
  return await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]');
    const c = shell ? shell.querySelector('canvas') : document.querySelector('canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
  });
}

async function measureGap(page, w, h, gutterSelector) {
  const canvasRect = await canvasRectOf(page);
  const gutterRight = await rectOf(page, gutterSelector);
  if (!canvasRect || !gutterRight) return { FAIL: `missing canvas or ${gutterSelector}`, canvasRect, gutterRight };
  const gridInfo = await detectGridSize(page);
  const geometry = panelGeometry(canvasRect.width, canvasRect.height, gridInfo.gridSize);
  const panelRightViewport = canvasRect.left + geometry.panelLocalRight; // PADDED panel edge (correct one)
  const tileAreaRightViewport = canvasRect.left + geometry.tileAreaLocalRight; // inner tile-area, 6px too tight
  return {
    gridInfo,
    canvasRect,
    gutterRight,
    panelRightViewport,
    tileAreaRightViewport,
    gapPanelToCard: gutterRight.left - panelRightViewport,
    gapTileAreaToCard: gutterRight.left - tileAreaRightViewport,
    pad: geometry.pad,
  };
}

async function shotSeam(page, w, h, gutterSelector, path) {
  const canvasRect = await canvasRectOf(page);
  const gutterRight = await rectOf(page, gutterSelector);
  if (!canvasRect || !gutterRight) return false;
  const cropLeft = Math.max(0, canvasRect.right - 260);
  const cropRight = Math.min(w, gutterRight.right + 20);
  const cropTop = Math.max(0, Math.min(canvasRect.top, gutterRight.top) - 10);
  const cropBottom = Math.min(h, Math.max(canvasRect.bottom, gutterRight.bottom) + 10);
  await page.screenshot({ path, clip: { x: cropLeft, y: cropTop, width: cropRight - cropLeft, height: cropBottom - cropTop } });
  return true;
}

async function runViewport(browser, w, h, tag) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(600);

  const R = { viewport: { w, h }, tag };

  // ---- LOBBY ----
  await page.screenshot({ path: `${OUT}/${tag}-01-lobby-full.png`, fullPage: true });
  R.lobby = await measureGap(page, w, h, '[data-testid="vault-gutter-right"]');
  await shotSeam(page, w, h, '[data-testid="vault-gutter-right"]', `${OUT}/${tag}-01-lobby-seam.png`);

  // ---- BET-ENTRY ----
  const clickedApeIn = await clickText(page, 'ape in');
  await wait(700);
  await selectMode(page, 'BLUECHIPS');
  await wait(400);
  await page.screenshot({ path: `${OUT}/${tag}-02-betentry-full.png`, fullPage: true });
  R.betentry = await measureGap(page, w, h, '[data-testid="vault-betentry-right"]');
  R.betentry.clickedApeIn = clickedApeIn;
  await shotSeam(page, w, h, '[data-testid="vault-betentry-right"]', `${OUT}/${tag}-02-betentry-seam.png`);

  // ---- PLAYING ----
  await clickTextWithin(page, '[data-testid="vault-betentry-confirm"]', 'SEND IT');
  await wait(800);
  await page.screenshot({ path: `${OUT}/${tag}-03-playing-full.png`, fullPage: true });
  R.playing = await measureGap(page, w, h, '[data-testid="vault-gutter-right"]');
  await shotSeam(page, w, h, '[data-testid="vault-gutter-right"]', `${OUT}/${tag}-03-playing-seam.png`);

  // ---- SETTLED ----
  R.reveal_ok = await revealOneTileVerified(page);
  await clickTextWithin(page, '[data-testid="vault-playing-actions"]', 'take profit');
  await wait(900);
  await page.screenshot({ path: `${OUT}/${tag}-04-settled-full.png`, fullPage: true });
  R.settled = await measureGap(page, w, h, '[data-testid="vault-gutter-right"]');
  await shotSeam(page, w, h, '[data-testid="vault-gutter-right"]', `${OUT}/${tag}-04-settled-seam.png`);

  // ---- SETTLED, Glass Box open (receipt drawer expanded) if toggle present ----
  const hasToggle = await page.evaluate(() => !!document.querySelector('.vault-receipt-toggle'));
  if (hasToggle) {
    await page.evaluate(() => document.querySelector('.vault-receipt-toggle')?.click());
    await wait(400);
    await page.screenshot({ path: `${OUT}/${tag}-05-settled-gbopen-full.png`, fullPage: true });
    R.settled_gbopen = await measureGap(page, w, h, '[data-testid="vault-gutter-right"]');
  } else {
    R.settled_gbopen = { skipped: 'no .vault-receipt-toggle found (verifyState likely not matched, or history<2)' };
  }

  R.pageerrors = errors;
  await page.close();
  return R;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  fs.mkdirSync(OUT, { recursive: true });
  const R = {};

  R.v1440x900 = await runViewport(browser, 1440, 900, '1440x900');
  R.v1920x1080 = await runViewport(browser, 1920, 1080, '1920x1080');
  R.v1440x1920 = await runViewport(browser, 1440, 1920, '1440x1920');

  await browser.close();
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(R, null, 2));
  console.log('DONE');
  // Print compact gap table to stdout
  const phases = ['lobby', 'betentry', 'playing', 'settled', 'settled_gbopen'];
  const vps = ['v1440x900', 'v1920x1080', 'v1440x1920'];
  for (const p of phases) {
    const row = vps.map((v) => {
      const m = R[v]?.[p];
      if (!m || m.FAIL || m.skipped) return `${v}:${m?.FAIL || m?.skipped || 'MISSING'}`;
      return `${v}:gapPanel=${m.gapPanelToCard?.toFixed(2)}`;
    });
    console.log(p, row.join(' | '));
  }
})();
