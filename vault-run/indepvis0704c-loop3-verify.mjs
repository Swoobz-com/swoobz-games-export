// indepvis0704c-loop3-verify.mjs — INDEPENDENT RE-VERIFICATION LOOP 3 of the
// vault receipt short-height clip fix on "Rug or Riches" (VaultExperience.tsx).
// Written fresh for THIS loop (does not import vaultfix3-0704-verify.mjs or
// reuse its results.json numbers) — separately derives every measurement from
// live getBoundingClientRect()/getComputedStyle() reads via a real Chrome
// instance driving real page.mouse.click()s (no evaluate()-based .click()
// bypass of hit-testing, per the FIX-B click-trap lesson from LOOP 2).
//
// SCOPE (per orchestrator brief):
//  1) CLIP CHECK — expand the receipt via real mouse click at 960x800,
//     1024x800, 1440x900, 1920x1080 (win AND rug outcomes). Measure the
//     receipt body's rect vs `vault-canvas-shell`'s rect. Body bottom must be
//     WITHIN the shell. At short heights where content is capped, confirm
//     scrollHeight>clientHeight (scroll-reachable) rather than clipped.
//  2) REGRESSION GUARD — vault-gutter-left/right (@400) zero overlap + ~32px
//     stable gap 960-1150 on Lobby/Playing/Settled; vault-{lobby,playing,
//     settled}-{left,right} (@72) unchanged; mobile 390x844 all 4 phases
//     byte-unchanged (sha256, 0 desktop-gutter testids present); BetEntry
//     grammar untouched (left gutter empty during bet-entry); settled BET
//     AGAIN red-on-loss / green-on-win.
//  3) No horizontal scroll / viewport-edge clip introduced.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import crypto from 'crypto';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5511';
const OUT = 'shots-indepvis0704c-loop3';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const round2 = (n) => (typeof n === 'number' ? Math.round(n * 100) / 100 : n);

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

// Independently re-derived from VaultGridCanvas source this run (same formula
// used consistently across every prior independent loop — a break here would
// also break the @72 regression numbers, so it's internally self-checking).
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
      shellScrollWidth: shell ? shell.scrollWidth : null,
      shellClientWidth: shell ? shell.clientWidth : null,
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
    out.leftCard = null; out.leftPresent = false;
  }
  const rightRect = rightSelector ? await rectOf(page, rightSelector) : null;
  if (rightRect && rightRect.width > 0) {
    out.rightCard = rightRect;
    out.rightOverlapsBoard = rightRect.left < panelRightViewport;
    out.gapBoardToRightCard = round2(rightRect.left - panelRightViewport);
    out.rightClipsViewportEdge = rightRect.right > w + 0.5;
  } else {
    out.rightCard = null; out.rightPresent = false;
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
async function reachSettled(page, { forceWin, forceLoss } = {}) {
  const spots = [];
  for (let gx = 1; gx <= 9; gx++) for (let gy = 1; gy <= 9; gy++) spots.push([gx / 10, gy / 10]);
  let safeReveals = 0;
  for (const [fx, fy] of spots) {
    if (await isSettled(page)) return true;
    await clickCanvasFraction(page, fx, fy);
    await wait(280);
    if (await isSettled(page)) return true;
    safeReveals += 1;
    if (forceWin && !forceLoss && safeReveals >= 2) {
      if (await takeProfitIfEnabled(page)) { await wait(900); return await isSettled(page); }
    }
  }
  await wait(900);
  return await isSettled(page);
}
async function startRound(page) {
  await clickText(page, 'ape in');
  await wait(600);
  await clickText(page, 'SEND IT');
  await wait(700);
}

// ── CLIP CHECK (primary re-verification target) ────────────────────────────
async function runClipCheck(browser, w, h, { forceLoss }) {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await startRound(page);
  await reachSettled(page, forceLoss ? { forceLoss: true } : { forceWin: true });
  await wait(1200);

  const toggleBox = await page.evaluate(() => {
    const chip = document.querySelector('.vault-receipt-toggle');
    if (!chip) return null;
    const r = chip.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (!toggleBox) {
    await page.close();
    return { FAIL: 'toggle not found — verifyState never reached matched', pageErrors };
  }
  // real mouse click, not evaluate()-dispatched
  await page.mouse.click(toggleBox.x, toggleBox.y);
  await wait(600);

  const measured = await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]');
    const body = document.querySelector('[data-testid="vault-settled-receipt-gutter"]');
    if (!shell) return { FAIL: 'no shell' };
    if (!body) return { FAIL: 'receipt body not mounted after real-mouse open' };
    const shellRect = shell.getBoundingClientRect();
    const bodyRect = body.getBoundingClientRect();
    const cs = getComputedStyle(body);
    const dds = [...body.querySelectorAll('dd')];
    const dts = [...body.querySelectorAll('dt')];
    const rows = dds.map((dd, i) => ({
      label: dts[i] ? dts[i].textContent : null,
      widthPx: dd.getBoundingClientRect().width,
    }));
    const scrollHeight = body.scrollHeight;
    const clientHeight = body.clientHeight;
    const scrollable = scrollHeight > clientHeight + 1;
    // scroll to bottom, re-read last row + body box to prove it's reachable
    // WITHIN the body's own visible viewport (not merely off in DOM space)
    let lastRowReachableAfterScroll = null;
    if (scrollable && dds.length) {
      body.scrollTop = body.scrollHeight;
      const afterBodyRect = body.getBoundingClientRect();
      const afterLastRowRect = dds[dds.length - 1].getBoundingClientRect();
      lastRowReachableAfterScroll =
        afterLastRowRect.bottom <= afterBodyRect.bottom + 1 && afterLastRowRect.top >= afterBodyRect.top - 1;
      body.scrollTop = 0;
    }
    return {
      shellRect: { top: shellRect.top, bottom: shellRect.bottom, left: shellRect.left, right: shellRect.right },
      bodyRect: { top: bodyRect.top, bottom: bodyRect.bottom, left: bodyRect.left, right: bodyRect.right, height: bodyRect.height },
      maxHeightCss: cs.maxHeight,
      overflowYCss: cs.overflowY,
      boxSizingCss: cs.boxSizing,
      scrollHeight,
      clientHeight,
      scrollable,
      lastRowReachableAfterScroll,
      rowCount: rows.length,
      allRowsWidthGT0: rows.every((r) => r.widthGT0 !== false && r.widthPx > 0),
      rows,
      clipPastShellBottomPx: bodyRect.bottom - shellRect.bottom,
    };
  });
  if (!measured.FAIL) measured.clipPastShellBottomPx = round2(measured.clipPastShellBottomPx);

  await page.screenshot({ path: `${OUT}/clip-${forceLoss ? 'rug' : 'win'}-${w}x${h}.png`, fullPage: true });

  // close it again with real mouse click, re-measured toggle coords
  const closeBox = await page.evaluate(() => {
    const chip = document.querySelector('.vault-receipt-toggle');
    if (!chip) return null;
    const r = chip.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  let closeWorked = false;
  if (closeBox) {
    await page.mouse.click(closeBox.x, closeBox.y);
    await wait(400);
    closeWorked = await page.evaluate(() => !document.querySelector('[data-testid="vault-settled-receipt-gutter"]'));
  }

  const scroll = await scrollProbe(page);
  await page.close();
  return {
    measured,
    pageErrors,
    closeWorked,
    scrollWidthIntroduced: scroll.docScrollWidth > scroll.docClientWidth + 1,
    shellScrollLeftNonZero: scroll.shellScrollLeft !== null && Math.abs(scroll.shellScrollLeft) > 0.5,
  };
}

// ── Regression: @400/@72 gutter gap sweep + BET AGAIN color ─────────────────
async function runBoardAnchorGapCheck(browser, w, h) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  const lobby400 = await measureBothSides(page, w, '[data-testid="vault-gutter-left"]', '[data-testid="vault-gutter-right"]');
  const lobby72 = await measureBothSides(page, w, '[data-testid="vault-lobby-left"]', '[data-testid="vault-lobby-right"]');

  await clickText(page, 'ape in');
  await wait(700);
  await clickTextWithin(page, '[data-testid="vault-betentry-confirm"]', 'SEND IT');
  await wait(800);
  const playing400 = await measureBothSides(page, w, '[data-testid="vault-gutter-left"]', '[data-testid="vault-gutter-right"]');
  const playing72 = await measureBothSides(page, w, '[data-testid="vault-playing-left"]', '[data-testid="vault-playing-right"]');

  await reachSettled(page, { forceWin: true });
  await wait(1200);
  const settled400 = await measureBothSides(page, w, '[data-testid="vault-gutter-left"]', '[data-testid="vault-gutter-right"]');
  const settled72 = await measureBothSides(page, w, '[data-testid="vault-settled-left"]', '[data-testid="vault-settled-right-new"]');

  await page.close();
  return { lobby400, lobby72, playing400, playing72, settled400, settled72 };
}

async function runBetAgainColorCheck(browser, w, h, { forceLoss }) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await startRound(page);
  await reachSettled(page, forceLoss ? { forceLoss: true } : { forceWin: true });
  await wait(500);
  const colors = await page.evaluate(() => {
    const gutterBtn = document.querySelector('[data-testid="vault-settled-betagain"] button');
    const cs = (el) => {
      if (!el) return null;
      const st = getComputedStyle(el);
      const bg = st.backgroundColor;
      const isReal = bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)';
      return isReal ? bg : st.backgroundImage;
    };
    return { gutterBtnBg: cs(gutterBtn) };
  });
  await page.close();
  return colors;
}

async function runBetEntryGrammarCheck(browser, w, h) {
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
  await page.close();
  return R;
}

async function isSettledMobile(page) {
  return await page.evaluate(() => !!document.querySelector('[data-testid="vault-settledpanel"]'));
}
async function runMobileCheck(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(600);
  const R = {};
  R.lobbyDesktopGutterPresent = await page.evaluate(() => !!document.querySelector('[data-testid="vault-gutter-left"],[data-testid="vault-gutter-right"]'));
  const b1 = await page.screenshot({ path: `${OUT}/mobile-01-lobby.png`, fullPage: true });
  R.lobbySha256 = crypto.createHash('sha256').update(b1).digest('hex');

  await clickText(page, 'ape in');
  await wait(700);
  R.betentryDesktopGutterPresent = await page.evaluate(() => !!document.querySelector('[data-testid="vault-gutter-left"],[data-testid="vault-gutter-right"]'));
  const b2 = await page.screenshot({ path: `${OUT}/mobile-02-betentry.png`, fullPage: true });
  R.betentrySha256 = crypto.createHash('sha256').update(b2).digest('hex');

  await clickText(page, 'send it');
  await wait(800);
  R.playingDesktopGutterPresent = await page.evaluate(() => !!document.querySelector('[data-testid="vault-gutter-left"],[data-testid="vault-gutter-right"]'));
  const b3 = await page.screenshot({ path: `${OUT}/mobile-03-playing.png`, fullPage: true });
  R.playingSha256 = crypto.createHash('sha256').update(b3).digest('hex');

  const spots = [];
  for (let gx = 1; gx <= 9; gx++) for (let gy = 1; gy <= 9; gy++) spots.push([gx / 10, gy / 10]);
  let safeReveals = 0;
  for (const [fx, fy] of spots) {
    if (await isSettledMobile(page)) break;
    await clickCanvasFraction(page, fx, fy);
    await wait(280);
    if (await isSettledMobile(page)) break;
    safeReveals += 1;
    if (safeReveals >= 2 && (await takeProfitIfEnabled(page))) { await wait(900); break; }
  }
  await wait(900);
  R.settledDesktopGutterPresent = await page.evaluate(() => !!document.querySelector('[data-testid="vault-gutter-left"],[data-testid="vault-gutter-right"]'));
  const b4 = await page.screenshot({ path: `${OUT}/mobile-04-settled.png`, fullPage: true });
  R.settledSha256 = crypto.createHash('sha256').update(b4).digest('hex');

  await page.close();
  return R;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  fs.mkdirSync(OUT, { recursive: true });
  const R = {};

  const viewports = [[960, 800], [1024, 800], [1440, 900], [1920, 1080]];
  for (const [w, h] of viewports) {
    R[`clip_win_${w}x${h}`] = await runClipCheck(browser, w, h, { forceLoss: false });
    R[`clip_rug_${w}x${h}`] = await runClipCheck(browser, w, h, { forceLoss: true });
  }

  for (const w of [960, 1024, 1100, 1150]) {
    R[`gapSweep_${w}x768`] = await runBoardAnchorGapCheck(browser, w, 768);
  }

  R.betagain_win_1440x900 = await runBetAgainColorCheck(browser, 1440, 900, { forceLoss: false });
  R.betagain_loss_1440x900 = await runBetAgainColorCheck(browser, 1440, 900, { forceLoss: true });

  R.betentryGrammar_960 = await runBetEntryGrammarCheck(browser, 960, 800);
  R.betentryGrammar_1440 = await runBetEntryGrammarCheck(browser, 1440, 900);

  R.mobile390 = await runMobileCheck(browser);

  await browser.close();
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();
