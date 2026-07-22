// vault-side-margin-chrome BEFORE measurement (2026-07-03).
// Measures the board-panel-to-right-gutter-card gap at bet-entry, desktop
// only, at 1440x900 and 1920x1080. READ-ONLY — no source edits.
//
// Board panel edge is DERIVED, not guessed: computeGridLayout() and the
// drawTerminalPanel() padding formula are copied VERBATIM from
// originals/vault/VaultGridCanvas.tsx (lines 842-862, 1112-1124) and
// evaluated in-page against the REAL canvas.getBoundingClientRect() (dpr
// pinned to 1 so CSS px == device px == draw-call coordinate space, per
// VaultGridCanvas's own ctx.setTransform(dpr,0,0,dpr,0,0)). A pixel
// cross-check (ctx.getImageData) confirms the computed edge lands on the
// actual light/dark transition rendered by the canvas.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5243';
const OUT = 'shots-gapmeasure-0703';
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

async function rectOf(page, selector) {
  return await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
  }, selector);
}

// Verbatim port of computeGridLayout (VaultGridCanvas.tsx L842-862) and the
// drawTerminalPanel padding math (L1112-1124).
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
  // BLUECHIPS/ALTSEASON = 5x5, SHITCOIN = 7x7 (vaultMath.ts GRID_SIZE_*).
  // Detect the pressed/selected world card; default falls back to 5 (the
  // DEFAULT_GRID_SIZE constant, and also BLUECHIPS/ALTSEASON's value).
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

async function pixelCrossCheck(page, canvasSelector, sampleX, sampleY) {
  // Sample colors just inside vs just outside the computed panel right edge,
  // directly off the canvas backing store (dpr=1, so CSS px == device px).
  return await page.evaluate(
    ({ canvasSelector, sampleX, sampleY }) => {
      const canvas = document.querySelector(canvasSelector);
      if (!canvas) return null;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      const rect = canvas.getBoundingClientRect();
      const localX = Math.round(sampleX - rect.left);
      const localY = Math.round(sampleY - rect.top);
      const read = (lx, ly) => {
        if (lx < 0 || ly < 0 || lx >= canvas.width || ly >= canvas.height) return null;
        const d = ctx.getImageData(lx, ly, 1, 1).data;
        return [d[0], d[1], d[2], d[3]];
      };
      const inside = read(localX - 12, localY); // 12px INSIDE the computed panel (should be dark translucent panel/gradient)
      const outside = read(localX + 15, localY); // 15px OUTSIDE (should be lighter/backdrop, or offscreen if panel==canvas edge)
      return { localX, localY, inside, outside, canvasW: canvas.width, canvasH: canvas.height };
    },
    { canvasSelector, sampleX, sampleY },
  );
}

async function measure(browser, w, h, label) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log(`[pageerror ${label}]`, e.message));
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  const clickedApeIn = await clickText(page, 'ape in');
  await wait(700);

  const right = await rectOf(page, '[data-testid="vault-betentry-right"]');
  if (!right) {
    await page.screenshot({ path: `${OUT}/${label}-FAIL-no-gutter.png`, fullPage: true });
    await page.close();
    return { viewport: { w, h }, FAIL: 'vault-betentry-right not found after ape-in click', clickedApeIn };
  }

  const shell = await rectOf(page, '[data-testid="vault-canvas-shell"]');
  const canvasRect = await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]');
    const c = shell ? shell.querySelector('canvas') : document.querySelector('canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
  });

  const gridInfo = await detectGridSize(page);

  let geometry = null;
  let panelRightViewport = null;
  let tileAreaRightViewport = null;
  let crossCheck = null;
  if (canvasRect) {
    geometry = panelGeometry(canvasRect.width, canvasRect.height, gridInfo.gridSize);
    panelRightViewport = canvasRect.left + geometry.panelLocalRight;
    tileAreaRightViewport = canvasRect.left + geometry.tileAreaLocalRight;
    const sampleY = canvasRect.top + geometry.panelLocalTop + geometry.panelLocalHeight / 2;
    crossCheck = await pixelCrossCheck(page, 'canvas', panelRightViewport, sampleY);
  }

  const gapPanelToCard = panelRightViewport != null ? right.left - panelRightViewport : null;
  const gapTileAreaToCard = tileAreaRightViewport != null ? right.left - tileAreaRightViewport : null;
  const gutterOverhang = shell ? shell.right - right.right : null; // right.right to shell right edge (edgeOffset)

  // Full-frame wide crop: board (canvas) LEFT edge through gutter card RIGHT
  // edge + margin, one single frame (memory lesson: single-side crops can't
  // show the gap).
  const cropLeft = Math.max(0, (canvasRect ? canvasRect.left : shell.left) - 20);
  const cropRight = Math.min(w, right.right + 20);
  const cropTop = Math.max(0, Math.min(shell.top, right.top) - 20);
  const cropBottom = Math.min(h, Math.max(shell.bottom, right.bottom) + 20);
  await page.screenshot({
    path: `${OUT}/${label}-fullframe.png`,
    clip: { x: cropLeft, y: cropTop, width: cropRight - cropLeft, height: cropBottom - cropTop },
  });
  await page.screenshot({ path: `${OUT}/${label}-viewport-full.png` });

  await page.close();

  return {
    viewport: { w, h },
    clickedApeIn,
    shell,
    canvasRect,
    gridInfo,
    geometry,
    panelRightViewport,
    tileAreaRightViewport,
    right,
    gapPanelToCard,
    gapTileAreaToCard,
    gutterOverhang,
    crossCheck,
  };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  fs.mkdirSync(OUT, { recursive: true });
  const R = {};
  R.v_1440x900 = await measure(browser, 1440, 900, '1440x900');
  R.v_1920x1080 = await measure(browser, 1920, 1080, '1920x1080');
  await browser.close();
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();
