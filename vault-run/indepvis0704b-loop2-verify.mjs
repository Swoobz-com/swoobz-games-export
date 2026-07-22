// indepvis0704b-loop2-verify.mjs — INDEPENDENT re-verification LOOP 2 of the
// generalized gutterBoardAnchorLeftStyle/RightStyle fix (FIX A) applied to
// `VaultGutterCards` (vault-gutter-left/right, @400 SESSION PULSE / Card B/C
// stack). Written fresh (does not import or reuse the builder's
// vaultfix2-0704-verify.mjs code or its results.json numbers). Geometry math
// (panelGeometry) is a verbatim port of VaultGridCanvas's own layout formula,
// cross-checked against source this run — same formula every prior
// independent driver in this history has used, so a mismatch here would show
// up as a broken @72 regression check too (internal consistency guard).
//
// Adds beyond LOOP 1's indepvis0704-verify.mjs:
//  (1) targets vault-gutter-left/right instead of vault-lobby/playing/
//      settled-left/right (LOOP 1 scope did NOT cover VaultGutterCards).
//  (2) EXPANDED-receipt-state Settled overflow check at 960/1024 — clicks
//      the real "view receipt" toggle with a real page.mouse.click(), then
//      re-measures the canvas-shell scroll state and the gutter-right card's
//      rect against the shell's own box.
//  (3) @72 regression re-check (vault-{lobby,playing,settled}-{left,right})
//      at the same width sweep, in the SAME page instance as the @400 check,
//      so both are provably measured under identical conditions.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import crypto from 'crypto';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5403';
const OUT = 'shots-indepvis0704b';
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

// Independently-typed port of VaultGridCanvas's computeGridLayout + the pad
// math read directly from source (originals/vault/VaultGridCanvas.tsx
// L445-461, re-confirmed this run).
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
  return { panelLocalLeft: x - pad, panelLocalRight: x + full + pad };
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
async function shellRectOf(page) {
  return await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]');
    if (!shell) return null;
    const r = shell.getBoundingClientRect();
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
      shellScrollTop: shell ? shell.scrollTop : null,
      shellScrollWidth: shell ? shell.scrollWidth : null,
      shellClientWidth: shell ? shell.clientWidth : null,
      shellScrollHeight: shell ? shell.scrollHeight : null,
      shellClientHeight: shell ? shell.clientHeight : null,
    };
  });
}

async function measureBothSides(page, w, leftSelector, rightSelector) {
  const canvasRect = await canvasRectOf(page);
  if (!canvasRect) return { FAIL: 'no canvas found' };
  const gridSize = await detectGridSize(page);
  const geo = panelGeometry(canvasRect.width, canvasRect.height, gridSize);
  const panelLeftViewport = canvasRect.left + geo.panelLocalLeft;
  const panelRightViewport = canvasRect.left + geo.panelLocalRight;
  const scroll = await scrollProbe(page);
  const out = { panelLeftViewport, panelRightViewport, scroll };

  const leftRect = leftSelector ? await rectOf(page, leftSelector) : null;
  if (leftRect && leftRect.width > 0) {
    out.leftCard = leftRect;
    out.leftOverlapsBoard = leftRect.right > panelLeftViewport;
    out.gapBoardToLeftCard = round2(panelLeftViewport - leftRect.right);
    out.leftClipsViewportEdge = leftRect.left < -0.5;
  } else {
    out.leftCard = null;
    out.leftPresent = false;
  }
  const rightRect = rightSelector ? await rectOf(page, rightSelector) : null;
  if (rightRect && rightRect.width > 0) {
    out.rightCard = rightRect;
    out.rightOverlapsBoard = rightRect.left < panelRightViewport;
    out.gapBoardToRightCard = round2(rightRect.left - panelRightViewport);
    out.rightClipsViewportEdge = rightRect.right > w + 0.5;
  } else {
    out.rightCard = null;
    out.rightPresent = false;
  }
  return out;
}
function round2(n) { return typeof n === 'number' ? Math.round(n * 100) / 100 : n; }

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

  // @400 gutter (FIX A target)
  R.lobby400 = await measureBothSides(page, w, '[data-testid="vault-gutter-left"]', '[data-testid="vault-gutter-right"]');
  // @72 stack (regression guard)
  R.lobby72 = await measureBothSides(page, w, '[data-testid="vault-lobby-left"]', '[data-testid="vault-lobby-right"]');
  await page.screenshot({ path: `${OUT}/${tag}-01-lobby.png`, fullPage: true });

  await clickText(page, 'ape in');
  await wait(700);
  R.betentry = await measureBothSides(page, w, '[data-testid="vault-betentry-left"]', '[data-testid="vault-betentry-right"]');
  await page.screenshot({ path: `${OUT}/${tag}-02-betentry.png`, fullPage: true });
  await clickTextWithin(page, '[data-testid="vault-betentry-confirm"]', 'SEND IT');
  await wait(800);

  R.playing400 = await measureBothSides(page, w, '[data-testid="vault-gutter-left"]', '[data-testid="vault-gutter-right"]');
  R.playing72 = await measureBothSides(page, w, '[data-testid="vault-playing-left"]', '[data-testid="vault-playing-right"]');
  await page.screenshot({ path: `${OUT}/${tag}-03-playing.png`, fullPage: true });

  R.reachedSettled = await reachSettled(page, { forceWin: true });
  await wait(1200); // let verify effect resolve to 'matched' so Card B/C mount
  R.settled400 = await measureBothSides(page, w, '[data-testid="vault-gutter-left"]', '[data-testid="vault-gutter-right"]');
  R.settled72 = await measureBothSides(page, w, '[data-testid="vault-settled-left"]', '[data-testid="vault-settled-right-new"]');
  await page.screenshot({ path: `${OUT}/${tag}-04-settled.png`, fullPage: true });

  R.pageErrors = pageErrors;
  await page.close();
  return R;
}

// Expanded-receipt overflow check — real page.mouse.click() on the "view
// receipt" toggle (NOT chip.click()/evaluate — that bypasses hit-testing per
// the FIX-B click-trap lesson), then re-measure shell scroll state + the
// gutter-right card's own box vs the shell's box.
async function runExpandedReceiptCheck(browser, w, h, tag) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in');
  await wait(600);
  await clickTextWithin(page, '[data-testid="vault-betentry-confirm"]', 'SEND IT');
  await wait(700);
  await reachSettled(page, { forceWin: true });
  await wait(1200);

  const scrollBefore = await scrollProbe(page);
  const shellBefore = await shellRectOf(page);
  const gutterRightBefore = await rectOf(page, '[data-testid="vault-gutter-right"]');

  const toggleBox = await page.evaluate(() => {
    const chip = document.querySelector('.vault-receipt-toggle');
    if (!chip) return null;
    const r = chip.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (!toggleBox) {
    await page.close();
    return { FAIL: 'toggle not found', scrollBefore, shellBefore, gutterRightBefore };
  }
  await page.mouse.click(toggleBox.x, toggleBox.y);
  await wait(400);

  const receiptState = await page.evaluate(() => {
    const chip = document.querySelector('.vault-receipt-toggle');
    const body = document.getElementById('vault-settled-receipt');
    return {
      ariaExpanded: chip ? chip.getAttribute('aria-expanded') : null,
      bodyPresent: !!body,
      bodyVisible: body ? body.offsetParent !== null : false,
    };
  });
  const scrollAfter = await scrollProbe(page);
  const shellAfter = await shellRectOf(page);
  const gutterRightAfter = await rectOf(page, '[data-testid="vault-gutter-right"]');
  const canvasRect = await canvasRectOf(page);
  const receiptBodyRect = await rectOf(page, '#vault-settled-receipt');

  await page.screenshot({ path: `${OUT}/${tag}-receipt-expanded.png`, fullPage: true });

  // Overflow verdicts: does the expanded right stack (or its receipt body)
  // exceed the shell's own bottom/right edge, and did scroll get introduced?
  const shellRightEdge = shellAfter ? shellAfter.right : null;
  const shellBottomEdge = shellAfter ? shellAfter.bottom : null;
  const out = {
    scrollBefore, scrollAfter, shellBefore, shellAfter,
    gutterRightBefore, gutterRightAfter, receiptState, receiptBodyRect, canvasRect,
    scrollWidthIntroduced: scrollAfter.docScrollWidth > scrollAfter.docClientWidth + 1,
    shellScrollLeftNonZero: scrollAfter.shellScrollLeft !== null && Math.abs(scrollAfter.shellScrollLeft) > 0.5,
    shellHorizontalOverflow: scrollAfter.shellScrollWidth !== null && scrollAfter.shellClientWidth !== null
      ? scrollAfter.shellScrollWidth - scrollAfter.shellClientWidth
      : null,
    gutterRightExceedsShellRight: gutterRightAfter && shellRightEdge != null ? gutterRightAfter.right - shellRightEdge : null,
    receiptBodyExceedsShellBottom: receiptBodyRect && shellBottomEdge != null ? receiptBodyRect.bottom - shellBottomEdge : null,
    receiptBodyExceedsViewportBottom: receiptBodyRect ? receiptBodyRect.bottom - h : null,
  };
  await page.close();
  return out;
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
  R.lobbyDesktopGutterPresent = await page.evaluate(() => !!document.querySelector('[data-testid="vault-gutter-left"],[data-testid="vault-gutter-right"]'));
  const b1 = await page.screenshot({ path: `${OUT}/${tag}-01-lobby.png`, fullPage: true });
  R.lobbySha256 = crypto.createHash('sha256').update(b1).digest('hex');

  await clickText(page, 'ape in');
  await wait(700);
  R.betentry = await scrollProbe(page);
  R.betentryGutterCardsPresent = await page.evaluate(() => !!document.querySelector('[data-testid="vault-betentry-left"]'));
  const b2 = await page.screenshot({ path: `${OUT}/${tag}-02-betentry.png`, fullPage: true });
  R.betentrySha256 = crypto.createHash('sha256').update(b2).digest('hex');

  const sentIt = await clickText(page, 'send it');
  R.sentItClicked = sentIt;
  await wait(800);

  R.playing = await scrollProbe(page);
  R.playingGutterCardsPresent = await page.evaluate(() => !!document.querySelector('[data-testid="vault-playing-left"]'));
  const b3 = await page.screenshot({ path: `${OUT}/${tag}-03-playing.png`, fullPage: true });
  R.playingSha256 = crypto.createHash('sha256').update(b3).digest('hex');

  await reachSettled(page);
  R.settled = await scrollProbe(page);
  R.settledGutterCardsPresent = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-left"]'));
  const b4 = await page.screenshot({ path: `${OUT}/${tag}-04-settled.png`, fullPage: true });
  R.settledSha256 = crypto.createHash('sha256').update(b4).digest('hex');

  R.pageErrors = pageErrors;
  await page.close();
  return R;
}

async function runBetEntryDesktopGrammarCheck(browser, w, h) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in');
  await wait(700);
  const leftEmpty = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-betentry-left"]');
    return el ? el.children.length === 0 || el.innerHTML.trim() === '' : true;
  });
  const R = await measureBothSides(page, w, '[data-testid="vault-betentry-left"]', '[data-testid="vault-betentry-right"]');
  R.leftGutterEmpty = leftEmpty;
  await page.screenshot({ path: `${OUT}/betentry-grammar-${w}x${h}.png`, fullPage: true });
  await page.close();
  return R;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  fs.mkdirSync(OUT, { recursive: true });
  const R = {};

  R.w960 = await runDesktopSweep(browser, 960, 800, 'v960');
  R.w1024 = await runDesktopSweep(browser, 1024, 800, 'v1024');
  R.w1100 = await runDesktopSweep(browser, 1100, 800, 'v1100');
  R.w1150 = await runDesktopSweep(browser, 1150, 800, 'v1150');
  R.w1440 = await runDesktopSweep(browser, 1440, 900, 'v1440');
  R.w1920 = await runDesktopSweep(browser, 1920, 1080, 'v1920');

  R.expandedReceipt_960 = await runExpandedReceiptCheck(browser, 960, 800, 'v960');
  R.expandedReceipt_1024 = await runExpandedReceiptCheck(browser, 1024, 800, 'v1024');

  R.betentryGrammar_960 = await runBetEntryDesktopGrammarCheck(browser, 960, 800);
  R.betentryGrammar_1440 = await runBetEntryDesktopGrammarCheck(browser, 1440, 900);

  R.mobile390 = await runMobileCapture(browser, 390, 844, 'm390');

  await browser.close();
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();
