// vaultfix0704-verify.mjs — P0/P1 fix-round self-check (FIX 1/2/3, 2026-07-04).
// Fresh `vite --port 5340 --strictPort` dev server (already running for this
// session). Verifies: (1) receipt chip aria-controls resolves to a real
// mounted node on desktop-settled + expands it; (2) Lobby/Playing/Settled
// gutter stacks are board-relative-anchored (no overlap 960-1150px, stable
// gap at wider viewports) on BOTH sides, BetEntry unaffected; (3) BET AGAIN
// follows T.danger on a loss (both gutter + center ledge).
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5340';
const OUT = 'shots-vaultfix-0704';
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

// Verbatim port (from holisticaudit0703-visreg-gaptable.mjs) of
// computeGridLayout + onBoardLayout's pad math.
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
  return {
    gridX: x, tile, gap, full, pad,
    panelLocalLeft: x - pad,
    panelLocalRight: x + full + pad,
  };
}

async function detectGridSize(page) {
  return await page.evaluate(() => {
    const root = document.querySelector('[data-testid="vault-betentry-world"]');
    if (!root) return 5;
    const buttons = [...root.querySelectorAll('button,[role=button]')];
    const pressed = buttons.find((b) => b.getAttribute('aria-pressed') === 'true');
    const label = pressed ? pressed.textContent.trim() : null;
    return label && /shitcoin/i.test(label) ? 7 : 5;
  });
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

async function measureSide(page, w, h, leftSelector, rightSelector) {
  const canvasRect = await canvasRectOf(page);
  const leftRect = leftSelector ? await rectOf(page, leftSelector) : null;
  const rightRect = rightSelector ? await rectOf(page, rightSelector) : null;
  if (!canvasRect) return { FAIL: 'no canvas' };
  const gridSize = await detectGridSize(page);
  const geo = panelGeometry(canvasRect.width, canvasRect.height, gridSize);
  const panelLeftViewport = canvasRect.left + geo.panelLocalLeft;
  const panelRightViewport = canvasRect.left + geo.panelLocalRight;
  const out = { panelLeftViewport, panelRightViewport };
  if (leftRect && leftRect.width > 0) {
    out.leftCard = leftRect;
    out.leftOverlapsBoard = leftRect.right > panelLeftViewport; // card's right edge past board's left edge = overlap
    out.gapBoardToLeftCard = panelLeftViewport - leftRect.right; // positive = clean gap
    out.leftClipsViewportEdge = leftRect.left < 0; // spills past the browser's own left edge
  }
  if (rightRect && rightRect.width > 0) {
    out.rightCard = rightRect;
    out.rightOverlapsBoard = rightRect.left < panelRightViewport;
    out.gapBoardToRightCard = rightRect.left - panelRightViewport;
  }
  return out;
}

async function isSettled(page) {
  return await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-left"]'));
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
async function takeProfitIfEnabled(page) {
  return await page.evaluate(() => {
    const btn = [...document.querySelectorAll('[data-testid="vault-playing-actions"] button')].find((b) =>
      b.textContent.toLowerCase().includes('take profit'),
    );
    if (btn && !btn.disabled) {
      btn.click();
      return true;
    }
    return false;
  });
}
// Reach the settled phase (win OR rug — either is fine for the overlap/
// receipt checks; a deliberate cash-out after a few safe reveals is used as
// a fallback so a lucky no-mine run doesn't tap through the whole board).
async function reachSettled(page, { forceWin } = {}) {
  const spots = [];
  for (let gx = 1; gx <= 9; gx++) for (let gy = 1; gy <= 9; gy++) spots.push([gx / 10, gy / 10]);
  let safeReveals = 0;
  for (const [fx, fy] of spots) {
    if (await isSettled(page)) return true;
    await clickCanvasFraction(page, fx, fy);
    await wait(300);
    if (await isSettled(page)) return true;
    safeReveals += 1;
    if (forceWin && safeReveals >= 2) {
      if (await takeProfitIfEnabled(page)) {
        await wait(900);
        return await isSettled(page);
      }
    }
  }
  await wait(900);
  return await isSettled(page);
}

async function runOverlapSweep(browser, w, h, tag) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  const R = {};

  R.lobby = await measureSide(page, w, h, '[data-testid="vault-lobby-left"]', '[data-testid="vault-lobby-right"]');
  await page.screenshot({ path: `${OUT}/${tag}-lobby.png`, fullPage: true });

  await clickText(page, 'ape in');
  await wait(600);
  R.betentry = await measureSide(page, w, h, '[data-testid="vault-betentry-left"]', '[data-testid="vault-betentry-right"]');
  await clickTextWithin(page, '[data-testid="vault-betentry-confirm"]', 'SEND IT');
  await wait(700);

  R.playing = await measureSide(page, w, h, '[data-testid="vault-playing-left"]', '[data-testid="vault-playing-right"]');
  await page.screenshot({ path: `${OUT}/${tag}-playing.png`, fullPage: true });

  R.reachedSettled = await reachSettled(page, { forceWin: true });
  R.settled = await measureSide(page, w, h, '[data-testid="vault-settled-left"]', '[data-testid="vault-settled-right-new"]');
  await page.screenshot({ path: `${OUT}/${tag}-settled.png`, fullPage: true });

  await page.close();
  return R;
}

async function runReceiptCheck(browser, w, h) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in');
  await wait(600);
  await clickTextWithin(page, '[data-testid="vault-betentry-confirm"]', 'SEND IT');
  await wait(700);
  await reachSettled(page, { forceWin: true });
  await wait(1200); // let the verify effect resolve to 'matched'

  const before = await page.evaluate(() => {
    const chip = document.querySelector('.vault-receipt-toggle');
    const ariaControls = chip ? chip.getAttribute('aria-controls') : null;
    const target = ariaControls ? document.getElementById(ariaControls) : null;
    return {
      chipFound: !!chip,
      ariaControls,
      targetExistsBeforeExpand: !!target,
      chipText: chip ? chip.textContent : null,
    };
  });

  // Click the chip to expand.
  const clicked = await page.evaluate(() => {
    const chip = document.querySelector('.vault-receipt-toggle');
    if (!chip) return false;
    chip.click();
    return true;
  });
  await wait(400);

  const after = await page.evaluate(() => {
    const chip = document.querySelector('.vault-receipt-toggle');
    const ariaControls = chip ? chip.getAttribute('aria-controls') : null;
    const target = ariaControls ? document.getElementById(ariaControls) : null;
    const ariaExpanded = chip ? chip.getAttribute('aria-expanded') : null;
    const srLive = [...document.querySelectorAll('.sr-only[aria-live]')].map((s) => s.textContent);
    return {
      ariaExpanded,
      targetExistsAfterExpand: !!target,
      targetVisible: target ? target.offsetParent !== null : false,
      targetText: target ? target.textContent.slice(0, 200) : null,
      srLiveTexts: srLive,
    };
  });

  await page.screenshot({ path: `${OUT}/receipt-expanded-${w}x${h}.png`, fullPage: true });
  await page.close();
  return { before, clicked, after };
}

async function runBetAgainColorCheck(browser, w, h) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in');
  await wait(600);
  await clickTextWithin(page, '[data-testid="vault-betentry-confirm"]', 'SEND IT');
  await wait(700);

  // Force a RUG (never a deliberate take-profit) by tapping many tiles
  // rapidly across a wide spread until a mine ends the round.
  const spots = [];
  for (let gx = 1; gx <= 9; gx++) for (let gy = 1; gy <= 9; gy++) spots.push([gx / 10, gy / 10]);
  let rugged = false;
  for (const [fx, fy] of spots) {
    if (await isSettled(page)) { rugged = true; break; }
    await clickCanvasFraction(page, fx, fy);
    await wait(250);
    if (await isSettled(page)) { rugged = true; break; }
  }
  await wait(900);

  const colors = await page.evaluate(() => {
    const gutterBtn = document.querySelector('[data-testid="vault-settled-betagain"] button');
    const ledgeBtn = document.querySelector('[data-testid="vault-board-rebet"] button');
    const cs = (el) => (el ? getComputedStyle(el).backgroundColor || getComputedStyle(el).backgroundImage : null);
    return {
      gutterBtnBg: cs(gutterBtn),
      ledgeBtnBg: cs(ledgeBtn),
      bodyIncludesRugged: document.body.textContent.includes('RUGGED') || document.body.textContent.includes('BUST'),
    };
  });
  await page.screenshot({ path: `${OUT}/betagain-color-loss-${w}x${h}.png`, fullPage: true });
  await page.close();
  return { rugged, colors };
}

async function runBetAgainColorCheckWin(browser, w, h) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in');
  await wait(600);
  await clickTextWithin(page, '[data-testid="vault-betentry-confirm"]', 'SEND IT');
  await wait(700);
  const won = await reachSettled(page, { forceWin: true });
  await wait(500);
  const colors = await page.evaluate(() => {
    const gutterBtn = document.querySelector('[data-testid="vault-settled-betagain"] button');
    const ledgeBtn = document.querySelector('[data-testid="vault-board-rebet"] button');
    const cs = (el) => (el ? getComputedStyle(el).backgroundColor || getComputedStyle(el).backgroundImage : null);
    return {
      gutterBtnBg: cs(gutterBtn),
      ledgeBtnBg: cs(ledgeBtn),
      bodyIncludesWin: document.body.textContent.includes('SECURED') || document.body.textContent.includes('pumped'),
    };
  });
  await page.screenshot({ path: `${OUT}/betagain-color-win-${w}x${h}.png`, fullPage: true });
  await page.close();
  return { won, colors };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  fs.mkdirSync(OUT, { recursive: true });
  const R = {};

  R.overlap_960x768 = await runOverlapSweep(browser, 960, 768, 'v960x768');
  R.overlap_1000x768 = await runOverlapSweep(browser, 1000, 768, 'v1000x768');
  R.overlap_1024x768 = await runOverlapSweep(browser, 1024, 768, 'v1024x768');
  R.overlap_1100x768 = await runOverlapSweep(browser, 1100, 768, 'v1100x768');
  R.overlap_1150x768 = await runOverlapSweep(browser, 1150, 768, 'v1150x768');
  R.overlap_1440x900 = await runOverlapSweep(browser, 1440, 900, 'v1440x900');
  R.overlap_1920x1080 = await runOverlapSweep(browser, 1920, 1080, 'v1920x1080');

  R.receipt_1440x900 = await runReceiptCheck(browser, 1440, 900);

  R.betagain_loss_1440x900 = await runBetAgainColorCheck(browser, 1440, 900);
  R.betagain_win_1440x900 = await runBetAgainColorCheckWin(browser, 1440, 900);

  await browser.close();
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();
