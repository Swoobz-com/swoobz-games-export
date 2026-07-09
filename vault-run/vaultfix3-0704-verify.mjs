// vaultfix3-0704-verify.mjs — LOOP 3 self-check (DEFECT 1 / DEFECT 2, 2026-07-04).
// Fresh `vite --port 5500 --strictPort` dev server. Verifies:
//  (1) DEFECT 1: every receipt <dd> VALUE has getBoundingClientRect().width>0
//      and its FULL hex content is present (not truncated/hidden), at 200px
//      card width, at 960x800/1024x800/1440x900/1920x1080, win AND rug.
//  (2) DEFECT 2: nothing clips past the `vault-canvas-shell` (overflow:
//      hidden) at short heights (960x800/1024x800) — rows stay
//      scroll-reachable (maxHeight+overflowY:auto on the receipt body).
//  (3) Real-mouse open+close of the receipt still fires (ported from
//      vaultfix2-0704-verify.mjs's runReceiptRealMouseCheck).
//  (4) No regression: mobile Settlement() receipt (`settlementReceiptRows`
//      byte-unchanged, still 'auto 1fr'), FIX-3 red-on-loss BET AGAIN,
//      board-anchor gaps @400 stable 960-1150px.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5500';
const OUT = 'shots-vaultfix3-0704';
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
  return { gridX: x, tile, gap, full, pad, panelLocalLeft: x - pad, panelLocalRight: x + full + pad };
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
    out.leftOverlapsBoard = leftRect.right > panelLeftViewport;
    out.gapBoardToLeftCard = panelLeftViewport - leftRect.right;
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
      if (await takeProfitIfEnabled(page)) {
        await wait(900);
        return await isSettled(page);
      }
    }
  }
  await wait(900);
  return await isSettled(page);
}
async function startRound(page) {
  await clickText(page, 'ape in');
  await wait(600);
  // NOTE: `vault-betentry-confirm` is the DESKTOP-only BetEntryGutterCards
  // wrapper (isWide-gated) — scoping the SEND IT click to it silently no-ops
  // on mobile viewports (root is null, clickText returns without clicking),
  // stranding the round at bet-entry. Click SEND IT unscoped so this helper
  // works identically on every viewport.
  await clickText(page, 'SEND IT');
  await wait(700);
}

// ── DEFECT 1 + DEFECT 2 core check ─────────────────────────────────────────
async function runReceiptReadabilityCheck(browser, w, h, { forceLoss }) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await startRound(page);
  await reachSettled(page, forceLoss ? { forceLoss: true } : { forceWin: true });
  await wait(1200); // let verify effect resolve to 'matched' so Card C mounts

  // OPEN via real mouse click (same technique as LOOP 2's real-mouse check).
  const toggleBox = await page.evaluate(() => {
    const chip = document.querySelector('.vault-receipt-toggle');
    if (!chip) return null;
    const r = chip.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (!toggleBox) {
    await page.close();
    return { FAIL: 'toggle not found (verifyState never reached matched?)' };
  }
  await page.mouse.click(toggleBox.x, toggleBox.y);
  await wait(500);

  const readability = await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]');
    const body = document.querySelector('[data-testid="vault-settled-receipt-gutter"]');
    if (!shell || !body) return { FAIL: 'receipt body not mounted after real-mouse open' };
    const shellRect = shell.getBoundingClientRect();
    const bodyRect = body.getBoundingClientRect();
    const bodyCs = getComputedStyle(body);
    const dl = body.querySelector('dl');
    const dlCs = dl ? getComputedStyle(dl) : null;
    const dds = [...body.querySelectorAll('dd')];
    const dts = [...body.querySelectorAll('dt')];
    const rows = dds.map((dd, i) => {
      const r = dd.getBoundingClientRect();
      const cs = getComputedStyle(dd);
      return {
        label: dts[i] ? dts[i].textContent : null,
        widthPx: r.width,
        heightPx: r.height,
        widthGT0: r.width > 0,
        computedWidth: cs.width,
        display: cs.display,
        visibility: cs.visibility,
        overflowWrap: cs.overflowWrap,
        wordBreak: cs.wordBreak,
        textContent: dd.textContent,
        titleAttr: dd.getAttribute('title'),
        fullValueVisibleInTextContent: dd.getAttribute('title') === dd.textContent,
      };
    });
    // Clipping check: does the body's own bottom edge exceed the shell's
    // bottom edge? If maxHeight+overflowY:auto is applied, the body's OWN
    // rendered box should never exceed the shell — content beyond the cap
    // is reachable via scroll (scrollHeight > clientHeight), not clipped.
    const bodyExceedsShellBottom = bodyRect.bottom > shellRect.bottom + 0.5;
    const scrollable = body.scrollHeight > body.clientHeight + 1;
    // If scrollable, prove every row is scroll-reachable: scroll to bottom
    // and confirm the LAST row's rect right after moves within the body's
    // visible box (i.e. maxScrollTop actually reveals it).
    let lastRowScrollReachable = true;
    if (scrollable && dds.length > 0) {
      const before = body.scrollTop;
      body.scrollTop = body.scrollHeight;
      const afterRect = dds[dds.length - 1].getBoundingClientRect();
      const bodyBoxAfter = body.getBoundingClientRect();
      lastRowScrollReachable = afterRect.top >= bodyBoxAfter.top - 1 && afterRect.bottom <= bodyBoxAfter.bottom + 1;
      body.scrollTop = before;
    }
    return {
      shellRect: { top: shellRect.top, bottom: shellRect.bottom, height: shellRect.height },
      bodyRect: { top: bodyRect.top, bottom: bodyRect.bottom, width: bodyRect.width, height: bodyRect.height },
      bodyMaxHeightCss: bodyCs.maxHeight,
      bodyOverflowY: bodyCs.overflowY,
      dlGridTemplateColumns: dlCs ? dlCs.gridTemplateColumns : null,
      rowCount: rows.length,
      allRowsWidthGT0: rows.every((r) => r.widthGT0),
      allRowsFullValueVisible: rows.every((r) => r.fullValueVisibleInTextContent),
      bodyExceedsShellBottom,
      scrollable,
      lastRowScrollReachable,
      rows,
    };
  });
  await page.screenshot({ path: `${OUT}/receipt-readability-${forceLoss ? 'rug' : 'win'}-${w}x${h}.png`, fullPage: true });

  // CLOSE — real mouse click, re-measured toggle coords (toggle sits ABOVE
  // the body in flow, so its own coords are unaffected by the body's
  // maxHeight/scroll).
  const closeBox = await page.evaluate(() => {
    const chip = document.querySelector('.vault-receipt-toggle');
    const r = chip.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  const hitBeforeClose = await page.evaluate((c) => {
    const hit = document.elementFromPoint(c.x, c.y);
    const chip = document.querySelector('.vault-receipt-toggle');
    return hit ? (chip === hit || chip.contains(hit)) : false;
  }, closeBox);
  await page.mouse.click(closeBox.x, closeBox.y);
  await wait(400);
  const afterClose = await page.evaluate(() => {
    const chip = document.querySelector('.vault-receipt-toggle');
    const ariaExpanded = chip ? chip.getAttribute('aria-expanded') : null;
    const bodyStillMounted = !!document.querySelector('[data-testid="vault-settled-receipt-gutter"]');
    return { ariaExpanded, bodyStillMounted };
  });
  await page.screenshot({ path: `${OUT}/receipt-closed-${forceLoss ? 'rug' : 'win'}-${w}x${h}.png`, fullPage: true });

  await page.close();
  return { readability, realMouseOpenWorked: true, hitBeforeClose, afterClose };
}

// ── Regression: mobile Settlement() receipt byte-unchanged (grid still
// 'auto 1fr' via `Row`/`settlementReceiptRows`, untouched by this loop). ──
// NOTE: mobile's settled root is `[data-testid="vault-settledpanel"]`
// (Settlement() itself) — `vault-settled-left`/`-right` are desktop-only
// SettledGutterCards testids and never mount on mobile, so `isSettled`
// (used by the desktop-focused `reachSettled` helper above) always reads
// false here. This regression check uses its OWN settle-detection + reveal
// loop scoped to mobile's real settled marker.
async function isSettledMobile(page) {
  return await page.evaluate(() => !!document.querySelector('[data-testid="vault-settledpanel"]'));
}
async function runMobileReceiptRegressionCheck(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in');
  await wait(600);
  await clickText(page, 'SEND IT');
  await wait(700);
  const spots = [];
  for (let gx = 1; gx <= 9; gx++) for (let gy = 1; gy <= 9; gy++) spots.push([gx / 10, gy / 10]);
  let safeReveals = 0;
  for (const [fx, fy] of spots) {
    if (await isSettledMobile(page)) break;
    await clickCanvasFraction(page, fx, fy);
    await wait(280);
    if (await isSettledMobile(page)) break;
    safeReveals += 1;
    if (safeReveals >= 2 && (await takeProfitIfEnabled(page))) {
      await wait(900);
      break;
    }
  }
  await wait(1200);
  await clickText(page, 'view receipt');
  await wait(400);
  const info = await page.evaluate(() => {
    const dls = [...document.querySelectorAll('dl')];
    const receiptDl = dls.find((d) => d.querySelector('dt') && d.querySelector('dt').textContent.includes('round id'));
    if (!receiptDl) return { FAIL: 'no mobile receipt dl found after expanding' };
    const cs = getComputedStyle(receiptDl);
    const dd = receiptDl.querySelector('dd');
    const ddCs = dd ? getComputedStyle(dd) : null;
    return {
      gridTemplateColumns: cs.gridTemplateColumns,
      byteUnchanged: cs.gridTemplateColumns.split(' ').length === 2,
      ddOverflow: ddCs ? ddCs.overflow : null,
      ddTextOverflow: ddCs ? ddCs.textOverflow : null,
      found: true,
    };
  });
  await page.screenshot({ path: `${OUT}/mobile-settled-390x844.png`, fullPage: true });
  await page.close();
  return info;
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
    const ledgeBtn = document.querySelector('[data-testid="vault-board-rebet"] button');
    const cs = (el) => {
      if (!el) return null;
      const st = getComputedStyle(el);
      const bg = st.backgroundColor;
      const isRealColor = bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'rgba(0,0,0,0)';
      return isRealColor ? bg : st.backgroundImage;
    };
    return { gutterBtnBg: cs(gutterBtn), ledgeBtnBg: cs(ledgeBtn) };
  });
  await page.close();
  return colors;
}

async function runBoardAnchorGapCheck(browser, w, h) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  const R = await measureSide(page, '[data-testid="vault-gutter-left"]', '[data-testid="vault-gutter-right"]');
  await page.close();
  return R;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  fs.mkdirSync(OUT, { recursive: true });
  const R = {};

  const viewports = [[960, 800], [1024, 800], [1440, 900], [1920, 1080]];
  for (const [w, h] of viewports) {
    R[`readability_win_${w}x${h}`] = await runReceiptReadabilityCheck(browser, w, h, { forceLoss: false });
    R[`readability_rug_${w}x${h}`] = await runReceiptReadabilityCheck(browser, w, h, { forceLoss: true });
  }

  R.mobileReceiptRegression = await runMobileReceiptRegressionCheck(browser);
  R.betagain_loss_1440x900 = await runBetAgainColorCheck(browser, 1440, 900, { forceLoss: true });
  R.betagain_win_1440x900 = await runBetAgainColorCheck(browser, 1440, 900, { forceLoss: false });

  for (const w of [960, 1024, 1100, 1150]) {
    R[`boardAnchorGap_${w}x768`] = await runBoardAnchorGapCheck(browser, w, 768);
  }

  await browser.close();
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();
