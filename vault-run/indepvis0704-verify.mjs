// indepvis0704-verify.mjs — INDEPENDENT visual-regression re-verification of
// FIX 2 (vault-side-margin-chrome round 5, 2026-07-04). Written fresh by the
// independent QA agent; geometry math cloned from holisticaudit0703-visreg-
// gaptable.mjs / vaultfix0704-verify.mjs (verbatim ports of VaultGridCanvas's
// own layout formula, confirmed against source read this run) but the sweep
// itself (widths, phases, both-sides measurement, mobile regression capture,
// BetEntry-unchanged capture) is independently assembled — none of the
// builder's results.json numbers are reused or trusted.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5330';
const OUT = 'shots-indepvis0704';
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

// Independently-typed port of VaultGridCanvas's computeGridLayout + the
// pad math read directly from source (originals/vault/VaultGridCanvas.tsx
// L445-461, this run): rightEdge = grid.x+grid.full+pad; leftEdge = grid.x-pad.
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
  return {
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
async function scrollProbe(page) {
  return await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]');
    return {
      docScrollWidth: document.documentElement.scrollWidth,
      docClientWidth: document.documentElement.clientWidth,
      shellScrollLeft: shell ? shell.scrollLeft : null,
      shellScrollWidth: shell ? shell.scrollWidth : null,
      shellClientWidth: shell ? shell.clientWidth : null,
    };
  });
}

// Measures BOTH stacks against the board panel's live edges. Returns overlap
// / gap / viewport-edge-clip verdicts, independently computed (not trusting
// any pre-baked flag).
async function measureBothSides(page, w, leftSelector, rightSelector) {
  const canvasRect = await canvasRectOf(page);
  if (!canvasRect) return { FAIL: 'no canvas found' };
  const gridSize = await detectGridSize(page);
  const geo = panelGeometry(canvasRect.width, canvasRect.height, gridSize);
  const panelLeftViewport = canvasRect.left + geo.panelLocalLeft;
  const panelRightViewport = canvasRect.left + geo.panelLocalRight;
  const scroll = await scrollProbe(page);
  const out = { canvasRect, panelLeftViewport, panelRightViewport, scroll };

  const leftRect = leftSelector ? await rectOf(page, leftSelector) : null;
  if (leftRect && leftRect.width > 0) {
    out.leftCard = leftRect;
    out.leftOverlapsBoard = leftRect.right > panelLeftViewport;
    out.gapBoardToLeftCard = panelLeftViewport - leftRect.right;
    out.leftClipsViewportEdge = leftRect.left < -0.5; // spills past browser's own left edge
  } else {
    out.leftCard = null;
  }
  const rightRect = rightSelector ? await rectOf(page, rightSelector) : null;
  if (rightRect && rightRect.width > 0) {
    out.rightCard = rightRect;
    out.rightOverlapsBoard = rightRect.left < panelRightViewport;
    out.gapBoardToRightCard = rightRect.left - panelRightViewport;
    out.rightClipsViewportEdge = rightRect.right > w + 0.5;
  } else {
    out.rightCard = null;
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
    if (btn && !btn.disabled) { btn.click(); return true; }
    return false;
  });
}
async function reachSettled(page) {
  const spots = [];
  for (let gx = 1; gx <= 9; gx++) for (let gy = 1; gy <= 9; gy++) spots.push([gx / 10, gy / 10]);
  let safeReveals = 0;
  for (const [fx, fy] of spots) {
    if (await isSettled(page)) return true;
    await clickCanvasFraction(page, fx, fy);
    await wait(300);
    if (await isSettled(page)) return true;
    safeReveals += 1;
    if (safeReveals >= 2) {
      if (await takeProfitIfEnabled(page)) { await wait(900); return await isSettled(page); }
    }
  }
  await wait(900);
  return await isSettled(page);
}

async function runDesktopSweep(browser, w, h, tag) {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(600);
  const R = {};

  R.lobby = await measureBothSides(page, w, '[data-testid="vault-lobby-left"]', '[data-testid="vault-lobby-right"]');
  await page.screenshot({ path: `${OUT}/${tag}-01-lobby.png`, fullPage: true });

  await clickText(page, 'ape in');
  await wait(700);
  R.betentry = await measureBothSides(page, w, '[data-testid="vault-betentry-left"]', '[data-testid="vault-betentry-right"]');
  await page.screenshot({ path: `${OUT}/${tag}-02-betentry.png`, fullPage: true });
  await clickTextWithin(page, '[data-testid="vault-betentry-confirm"]', 'SEND IT');
  await wait(800);

  R.playing = await measureBothSides(page, w, '[data-testid="vault-playing-left"]', '[data-testid="vault-playing-right"]');
  await page.screenshot({ path: `${OUT}/${tag}-03-playing.png`, fullPage: true });

  R.reachedSettled = await reachSettled(page);
  R.settled = await measureBothSides(page, w, '[data-testid="vault-settled-left"]', '[data-testid="vault-settled-right-new"]');
  await page.screenshot({ path: `${OUT}/${tag}-04-settled.png`, fullPage: true });

  R.pageErrors = pageErrors;
  await page.close();
  return R;
}

async function runMobileCapture(browser, w, h, tag) {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(600);
  const R = {};

  R.lobby = await scrollProbe(page);
  R.lobbyGutterCardsPresent = await page.evaluate(() => !!document.querySelector('[data-testid="vault-lobby-left"]'));
  await page.screenshot({ path: `${OUT}/${tag}-01-lobby.png`, fullPage: true });

  await clickText(page, 'ape in');
  await wait(700);
  R.betentry = await scrollProbe(page);
  R.betentryGutterCardsPresent = await page.evaluate(() => !!document.querySelector('[data-testid="vault-betentry-left"]'));
  await page.screenshot({ path: `${OUT}/${tag}-02-betentry.png`, fullPage: true });
  // Mobile has NO `vault-betentry-confirm` scoping node (that testid lives on
  // the desktop-only BetEntryGutterCards CONFIRM card) — mobile's commit
  // button is the shared <BetConsole commitLabel="SEND IT ->">, unscoped.
  const sentIt = await clickText(page, 'send it');
  R.sentItClicked = sentIt;
  await wait(800);

  R.playing = await scrollProbe(page);
  R.playingGutterCardsPresent = await page.evaluate(() => !!document.querySelector('[data-testid="vault-playing-left"]'));
  await page.screenshot({ path: `${OUT}/${tag}-03-playing.png`, fullPage: true });

  await reachSettled(page);
  R.settled = await scrollProbe(page);
  R.settledGutterCardsPresent = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-left"]'));
  await page.screenshot({ path: `${OUT}/${tag}-04-settled.png`, fullPage: true });

  R.pageErrors = pageErrors;
  await page.close();
  return R;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  fs.mkdirSync(OUT, { recursive: true });
  const mode = process.argv[3] || 'all';
  const R = {};

  if (mode === 'all' || mode === 'desktop') {
    // Dead-zone + gap-stability + clipping sweep — overlap widths + wide widths.
    R.w960 = await runDesktopSweep(browser, 960, 800, 'v960');
    R.w1024 = await runDesktopSweep(browser, 1024, 800, 'v1024');
    R.w1100 = await runDesktopSweep(browser, 1100, 800, 'v1100');
    R.w1150 = await runDesktopSweep(browser, 1150, 800, 'v1150');
    R.w1440 = await runDesktopSweep(browser, 1440, 900, 'v1440');
    R.w1920 = await runDesktopSweep(browser, 1920, 1080, 'v1920');
  }

  if (mode === 'all' || mode === 'mobile') {
    // Mobile regression check.
    R.mobile390 = await runMobileCapture(browser, 390, 844, 'm390');
  }

  await browser.close();
  const suffix = mode === 'all' ? '' : `-${mode}`;
  fs.writeFileSync(`${OUT}/results${suffix}.json`, JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();
