// vaultfix2-0704-verify.mjs — LOOP 2 self-check (FIX A / FIX B, 2026-07-04).
// Fresh `vite --port 5401 --strictPort` dev server. Verifies:
//  (1) `vault-gutter-left`/`vault-gutter-right` (VaultGutterCards, @400) are
//      now board-relative-anchored — zero overlap 960-1150px, stable gap at
//      wider viewports, no viewport-edge clip, on Lobby/Playing/Settled.
//  (2) The desktop-settled receipt is CLOSABLE by a REAL page.mouse.click()
//      (not chip.click()/evaluate) — elementFromPoint + ariaExpanded proof
//      for BOTH open and close.
//  (3) No regression: @72 stacks / FIX-3 red-on-loss / mobile byte-unchanged
//      / BetEntry grammar.
// FIXES THE cs() BUG from vaultfix0704-verify.mjs: getComputedStyle(el)
// .backgroundColor returning 'rgba(0,0,0,0)' (a TRUTHY string) short-
// circuited the `||` before it could fall through to backgroundImage for a
// gradient fill — silently mis-reporting the win-case color as transparent.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5401';
const OUT = 'shots-vaultfix2-0704';
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

// Verbatim port (from holisticaudit0703-visreg-gaptable.mjs /
// vaultfix0704-verify.mjs) of computeGridLayout + onBoardLayout's pad math.
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

async function measureSide(page, leftSelector, rightSelector) {
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
    out.rightClipsViewportEdge = rightRect.right > canvasRect.width + canvasRect.left + 2000; // sanity guard only
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

  // Lobby: BOTH the @72 stack (vault-lobby-left/right) AND the @400 stack
  // (vault-gutter-left/right, FIX A target) coexist.
  R.lobby72 = await measureSide(page, '[data-testid="vault-lobby-left"]', '[data-testid="vault-lobby-right"]');
  R.lobby400 = await measureSide(page, '[data-testid="vault-gutter-left"]', '[data-testid="vault-gutter-right"]');
  await page.screenshot({ path: `${OUT}/${tag}-lobby.png`, fullPage: true });

  await clickText(page, 'ape in');
  await wait(600);
  R.betentry = await measureSide(page, '[data-testid="vault-betentry-left"]', '[data-testid="vault-betentry-right"]');
  await clickTextWithin(page, '[data-testid="vault-betentry-confirm"]', 'SEND IT');
  await wait(700);

  R.playing72 = await measureSide(page, '[data-testid="vault-playing-left"]', '[data-testid="vault-playing-right"]');
  R.playing400 = await measureSide(page, '[data-testid="vault-gutter-left"]', '[data-testid="vault-gutter-right"]');
  await page.screenshot({ path: `${OUT}/${tag}-playing.png`, fullPage: true });

  R.reachedSettled = await reachSettled(page, { forceWin: true });
  await wait(1200); // let verify effect resolve to 'matched' so Card B/C mount
  R.settled72 = await measureSide(page, '[data-testid="vault-settled-left"]', '[data-testid="vault-settled-right-new"]');
  R.settled400 = await measureSide(page, '[data-testid="vault-gutter-left"]', '[data-testid="vault-gutter-right"]');
  await page.screenshot({ path: `${OUT}/${tag}-settled.png`, fullPage: true });

  await page.close();
  return R;
}

async function runReceiptRealMouseCheck(browser, w, h) {
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
      ariaExpandedBefore: chip ? chip.getAttribute('aria-expanded') : null,
    };
  });

  // OPEN — real mouse click at the toggle's actual screen coords.
  const toggleBox = await page.evaluate(() => {
    const chip = document.querySelector('.vault-receipt-toggle');
    if (!chip) return null;
    const r = chip.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (!toggleBox) {
    await page.close();
    return { FAIL: 'toggle not found', before };
  }
  await page.mouse.click(toggleBox.x, toggleBox.y);
  await wait(400);

  const afterOpen = await page.evaluate(() => {
    const chip = document.querySelector('.vault-receipt-toggle');
    const ariaControls = chip ? chip.getAttribute('aria-controls') : null;
    const target = ariaControls ? document.getElementById(ariaControls) : null;
    const ariaExpanded = chip ? chip.getAttribute('aria-expanded') : null;
    const srLive = [...document.querySelectorAll('.sr-only[aria-live]')].map((s) => s.textContent);
    return {
      ariaExpanded,
      targetExistsAfterExpand: !!target,
      targetVisible: target ? target.offsetParent !== null : false,
      targetText: target ? target.textContent.slice(0, 160) : null,
      srLiveTexts: srLive,
    };
  });
  await page.screenshot({ path: `${OUT}/receipt-open-realmouse-${w}x${h}.png`, fullPage: true });

  // Re-measure the toggle's coords (the expanded body may have shifted the
  // column's flow — but the toggle sits ABOVE the body in this stack now, so
  // its own coords should be unchanged) and prove elementFromPoint resolves
  // to the toggle itself, NOT the receipt body, before attempting the real
  // close click.
  const hitTestBeforeClose = await page.evaluate(() => {
    const chip = document.querySelector('.vault-receipt-toggle');
    if (!chip) return null;
    const r = chip.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const hit = document.elementFromPoint(cx, cy);
    return {
      coords: { x: cx, y: cy },
      hitTag: hit ? hit.tagName : null,
      hitClass: hit ? hit.className : null,
      hitIsChipOrDescendant: hit ? chip === hit || chip.contains(hit) : false,
      hitText: hit ? (hit.textContent || '').slice(0, 60) : null,
    };
  });

  // CLOSE — real mouse click at the (re-measured) toggle coords.
  const closeBox = hitTestBeforeClose
    ? hitTestBeforeClose.coords
    : await page.evaluate(() => {
        const chip = document.querySelector('.vault-receipt-toggle');
        const r = chip.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
  await page.mouse.click(closeBox.x, closeBox.y);
  await wait(400);

  const afterClose = await page.evaluate(() => {
    const chip = document.querySelector('.vault-receipt-toggle');
    const ariaControls = chip ? chip.getAttribute('aria-controls') : null;
    const target = ariaControls ? document.getElementById(ariaControls) : null;
    const ariaExpanded = chip ? chip.getAttribute('aria-expanded') : null;
    return {
      ariaExpanded,
      targetStillInDom: !!target,
      targetVisible: target ? target.offsetParent !== null : false,
    };
  });
  await page.screenshot({ path: `${OUT}/receipt-closed-realmouse-${w}x${h}.png`, fullPage: true });

  await page.close();
  return { before, afterOpen, hitTestBeforeClose, afterClose };
}

async function runBetAgainColorCheck(browser, w, h, { forceLoss }) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in');
  await wait(600);
  await clickTextWithin(page, '[data-testid="vault-betentry-confirm"]', 'SEND IT');
  await wait(700);

  let reached;
  if (forceLoss) {
    const spots = [];
    for (let gx = 1; gx <= 9; gx++) for (let gy = 1; gy <= 9; gy++) spots.push([gx / 10, gy / 10]);
    reached = false;
    for (const [fx, fy] of spots) {
      if (await isSettled(page)) { reached = true; break; }
      await clickCanvasFraction(page, fx, fy);
      await wait(250);
      if (await isSettled(page)) { reached = true; break; }
    }
    await wait(900);
  } else {
    reached = await reachSettled(page, { forceWin: true });
    await wait(500);
  }

  // FIXED cs() — an rgba(0,0,0,0) / 'transparent' backgroundColor is NOT a
  // real fill; fall through to backgroundImage (gradient) in that case
  // instead of short-circuiting on the truthy-but-meaningless string.
  const colors = await page.evaluate(() => {
    const gutterBtn = document.querySelector('[data-testid="vault-settled-betagain"] button');
    const ledgeBtn = document.querySelector('[data-testid="vault-board-rebet"] button');
    const cs = (el) => {
      if (!el) return null;
      const st = getComputedStyle(el);
      const bg = st.backgroundColor;
      const isRealColor = bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'rgba(0,0,0,0)';
      return isRealColor ? bg : st.backgroundImage;
    };
    return {
      gutterBtnBg: cs(gutterBtn),
      ledgeBtnBg: cs(ledgeBtn),
      bodyIncludesRugged: document.body.textContent.includes('RUGGED') || document.body.textContent.includes('BUST'),
      bodyIncludesWin: document.body.textContent.includes('SECURED') || document.body.textContent.includes('pumped'),
    };
  });
  await page.screenshot({ path: `${OUT}/betagain-color-${forceLoss ? 'loss' : 'win'}-${w}x${h}.png`, fullPage: true });
  await page.close();
  return { reached, colors };
}

async function runMobileByteCheck(browser, w, h) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  const lobbyHtml = await page.evaluate(() => document.querySelector('[data-testid="vault-canvas-shell"]')?.outerHTML.length ?? -1);
  const hasGutterCards = await page.evaluate(
    () => !!document.querySelector('[data-testid="vault-gutter-left"],[data-testid="vault-gutter-right"],[data-testid="vault-lobby-left"]'),
  );
  await page.screenshot({ path: `${OUT}/mobile-lobby-${w}x${h}.png`, fullPage: true });
  await page.close();
  return { lobbyShellHtmlLength: lobbyHtml, hasDesktopGutterCards: hasGutterCards };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  fs.mkdirSync(OUT, { recursive: true });
  const R = {};

  R.overlap_960x768 = await runOverlapSweep(browser, 960, 768, 'v960x768');
  R.overlap_1024x768 = await runOverlapSweep(browser, 1024, 768, 'v1024x768');
  R.overlap_1100x768 = await runOverlapSweep(browser, 1100, 768, 'v1100x768');
  R.overlap_1150x768 = await runOverlapSweep(browser, 1150, 768, 'v1150x768');
  R.overlap_1440x900 = await runOverlapSweep(browser, 1440, 900, 'v1440x900');
  R.overlap_1920x1080 = await runOverlapSweep(browser, 1920, 1080, 'v1920x1080');

  R.receiptRealMouse_1440x900 = await runReceiptRealMouseCheck(browser, 1440, 900);
  R.receiptRealMouse_1920x1080 = await runReceiptRealMouseCheck(browser, 1920, 1080);

  R.betagain_loss_1440x900 = await runBetAgainColorCheck(browser, 1440, 900, { forceLoss: true });
  R.betagain_win_1440x900 = await runBetAgainColorCheck(browser, 1440, 900, { forceLoss: false });

  R.mobile_390x844 = await runMobileByteCheck(browser, 390, 844);

  await browser.close();
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();
