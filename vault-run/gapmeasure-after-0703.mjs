// vault-side-margin-chrome AFTER measurement (2026-07-03+5).
// Re-derives the board-panel-to-right-gutter-card gap LIVE against the
// shipped fix (boardPanelRightX + BETENTRY_PANEL_GAP=32, VaultExperience.tsx
// / VaultGridCanvas.tsx onBoardLayout). Same panelGeometry()/detectGridSize()
// verbatim ports as the BEFORE driver (gapmeasure-0703.mjs) — READ-ONLY, no
// source edits. Adds: (1) BetEntry gap at both desktop viewports, (2)
// regression check on Lobby/Playing/Settled at 1440x900, (3) SHITCOIN 7x7
// BetEntry gap spot-check at both viewports.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5247';
const OUT = 'shots-gapmeasure-after-0703';
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

// Verbatim port of computeGridLayout (VaultGridCanvas.tsx L842-862) and the
// drawTerminalPanel padding math (L1112-1124) — UNCHANGED by this fix.
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
    tileAreaLocalRight: x + full, // == grid.x + grid.full == the shipped onBoardLayout `rightEdge`
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

async function pixelCrossCheck(page, canvasSelector, sampleX, sampleY) {
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
      const inside = read(localX - 12, localY);
      const outside = read(localX + 15, localY);
      return { localX, localY, inside, outside, canvasW: canvas.width, canvasH: canvas.height };
    },
    { canvasSelector, sampleX, sampleY },
  );
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

// ---------- Part A + C: BetEntry gap (BLUECHIPS 5x5 and SHITCOIN 7x7) ----------
async function measureBetEntry(browser, w, h, label, mode) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log(`[pageerror ${label}/${mode}]`, e.message));
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  const clickedApeIn = await clickText(page, 'ape in');
  await wait(700);
  if (mode === 'SHITCOIN') {
    await selectMode(page, 'SHITCOIN');
    await wait(400);
  }

  const right = await rectOf(page, '[data-testid="vault-betentry-right"]');
  if (!right) {
    await page.screenshot({ path: `${OUT}/${label}-${mode}-FAIL-no-gutter.png`, fullPage: true });
    await page.close();
    return { viewport: { w, h }, mode, FAIL: 'vault-betentry-right not found after ape-in click', clickedApeIn };
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
  let crossCheckAtTileArea = null;
  if (canvasRect) {
    geometry = panelGeometry(canvasRect.width, canvasRect.height, gridInfo.gridSize);
    panelRightViewport = canvasRect.left + geometry.panelLocalRight;
    tileAreaRightViewport = canvasRect.left + geometry.tileAreaLocalRight;
    const sampleY = canvasRect.top + geometry.panelLocalTop + geometry.panelLocalHeight / 2;
    crossCheck = await pixelCrossCheck(page, 'canvas', panelRightViewport, sampleY);
    crossCheckAtTileArea = await pixelCrossCheck(page, 'canvas', tileAreaRightViewport, sampleY);
  }

  // gapPanelToCard: card.left - (dark drawn panel edge INCLUDING pad) — this
  // is what Tim's "dark vault board panel's right edge" phrase + the BEFORE
  // 55.28/170.86 numbers actually measured (verified against gapmeasure-0703
  // .mjs's results.json).
  const gapPanelToCard = panelRightViewport != null ? right.left - panelRightViewport : null;
  // gapTileAreaToCard: card.left - (grid.x + grid.full) — this is EXACTLY the
  // shipped onBoardLayout `rightEdge` formula (VaultGridCanvas.tsx L423) that
  // boardPanelRightX + BETENTRY_PANEL_GAP(32) is built from. If the fix is
  // working as coded, this value should read ~32 at BOTH viewports.
  const gapTileAreaToCard = tileAreaRightViewport != null ? right.left - tileAreaRightViewport : null;
  const gutterOverhang = shell ? shell.right - right.right : null;
  const padAtViewport = geometry ? geometry.pad : null;

  const cropLeft = Math.max(0, (canvasRect ? canvasRect.left : shell.left) - 20);
  const cropRight = Math.min(w, right.right + 20);
  const cropTop = Math.max(0, Math.min(shell.top, right.top) - 20);
  const cropBottom = Math.min(h, Math.max(shell.bottom, right.bottom) + 20);
  await page.screenshot({
    path: `${OUT}/${label}-${mode}-fullframe.png`,
    clip: { x: cropLeft, y: cropTop, width: cropRight - cropLeft, height: cropBottom - cropTop },
  });
  await page.screenshot({ path: `${OUT}/${label}-${mode}-viewport-full.png` });

  await page.close();

  return {
    viewport: { w, h }, mode,
    clickedApeIn, shell, canvasRect, gridInfo, geometry,
    panelRightViewport, tileAreaRightViewport, right,
    gapPanelToCard, gapTileAreaToCard, gutterOverhang, padAtViewport,
    crossCheck, crossCheckAtTileArea,
  };
}

// ---------- Part B: Lobby/Playing/Settled regression at 1440x900 ----------
async function measureOtherPhases(browser) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(600);

  const shell = await rectOf(page, '[data-testid="vault-canvas-shell"]');
  const canvasRect = await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]');
    const c = shell ? shell.querySelector('canvas') : document.querySelector('canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
  });

  async function boardGapFor(phaseLabel) {
    const gridInfo = await detectGridSize(page);
    const gutterRight = await rectOf(page, '[data-testid="vault-gutter-right"]');
    if (!canvasRect || !gutterRight) return { phaseLabel, FAIL: 'missing canvas or vault-gutter-right', gutterRight };
    const geometry = panelGeometry(canvasRect.width, canvasRect.height, gridInfo.gridSize);
    const panelRightViewport = canvasRect.left + geometry.panelLocalRight;
    const tileAreaRightViewport = canvasRect.left + geometry.tileAreaLocalRight;
    return {
      phaseLabel,
      gridInfo,
      gutterRight,
      panelRightViewport,
      tileAreaRightViewport,
      gapPanelToCard: gutterRight.left - panelRightViewport,
      gapTileAreaToCard: gutterRight.left - tileAreaRightViewport,
      gutterOverhang: shell ? shell.right - gutterRight.right : null,
    };
  }

  const R = { shell, canvasRect };

  // LOBBY (no board rendered yet in some builds, but canvas/grid geometry is
  // computed regardless of phase — vault-gutter-right is absent pre-ape-in
  // per showA gating, so lobby's gutter-right IS the "no gutter card visible"
  // state; skip gap calc there and just confirm dom absence, matching the
  // showA gating comment at VaultExperience.tsx L2916/2938).
  R.lobby_gutterRight = await rectOf(page, '[data-testid="vault-gutter-right"]');
  await page.screenshot({ path: `${OUT}/other-phases-01-lobby-1440.png` });

  await clickText(page, 'ape in');
  await wait(500);
  await selectMode(page, 'BLUECHIPS');
  await wait(300);
  await clickTextWithin(page, '[data-testid="vault-betentry-confirm"]', 'SEND IT');
  await wait(800);

  R.playing = await boardGapFor('playing');
  await page.screenshot({ path: `${OUT}/other-phases-02-playing-1440.png` });

  R.reveal_ok = await revealOneTileVerified(page);
  await clickTextWithin(page, '[data-testid="vault-playing-actions"]', 'take profit');
  await wait(900);

  R.settled = await boardGapFor('settled');
  await page.screenshot({ path: `${OUT}/other-phases-03-settled-1440.png` });

  R.pageerrors = errors;
  await page.close();
  return R;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  fs.mkdirSync(OUT, { recursive: true });
  const R = {};

  // Part A — BetEntry, BLUECHIPS 5x5, both desktop viewports
  R.betentry_bluechips_1440x900 = await measureBetEntry(browser, 1440, 900, '1440x900', 'BLUECHIPS');
  R.betentry_bluechips_1920x1080 = await measureBetEntry(browser, 1920, 1080, '1920x1080', 'BLUECHIPS');

  // Part C — BetEntry, SHITCOIN 7x7, both desktop viewports
  R.betentry_shitcoin_1440x900 = await measureBetEntry(browser, 1440, 900, '1440x900', 'SHITCOIN');
  R.betentry_shitcoin_1920x1080 = await measureBetEntry(browser, 1920, 1080, '1920x1080', 'SHITCOIN');

  // Part B — Lobby/Playing/Settled regression, 1440x900
  R.other_phases_1440x900 = await measureOtherPhases(browser);

  await browser.close();
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();
