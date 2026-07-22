// a11y-loop2-receiptmove-verify.mjs — swoobz-accessibility-qa LOOP 2 re-verify.
// Confirms the FIX 1 a11y properties (aria-live announcer + receipt
// reachability, desktop-settled) STILL hold after FIX B relocated the
// receipt body from SettledGutterCards (@72) into VaultGutterCards' OWN
// @400 Card C stack. Desktop 1440x900 WIN+LOSS, plus mobile 390x844.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5411';
const OUT = 'shots-a11y-loop2-receiptmove';
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
async function isSettled(page) {
  return await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-left"],[data-testid="vault-settledpanel"]'));
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
    const btn = [...document.querySelectorAll('[data-testid="vault-playing-actions"] button, button')].find((b) =>
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

async function reachDesktopSettled(page, w, h, { forceWin }) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in');
  await wait(600);
  await clickTextWithin(page, '[data-testid="vault-betentry-confirm"]', 'SEND IT');
  await wait(700);
  const reached = await reachSettled(page, { forceWin });
  await wait(1500); // clear the ~2s VaultHeroOverlay wash before any pixel/contrast read
  return reached;
}

// ---- ITEM 1: aria-live announcer present + populated ----
async function checkAnnouncer(page) {
  return await page.evaluate(() => {
    const spans = [...document.querySelectorAll('.sr-only[aria-live="polite"]')];
    return spans.map((s) => s.textContent.trim()).filter((t) => t.length > 0);
  });
}

// ---- ITEM 2: chip aria-controls resolution + keyboard reachability ----
async function checkReceiptControlsKeyboard(page) {
  const before = await page.evaluate(() => {
    const chip = document.querySelector('.vault-receipt-toggle');
    const ariaControls = chip ? chip.getAttribute('aria-controls') : null;
    const target = ariaControls ? document.getElementById(ariaControls) : null;
    return {
      chipFound: !!chip,
      ariaControls,
      ariaExpandedBefore: chip ? chip.getAttribute('aria-expanded') : null,
      targetExistsBeforeExpand: !!target,
    };
  });
  if (!before.chipFound) return { before, FAIL: 'chip not found' };

  // Focus the toggle via a REAL keyboard path: Tab from body until it's the
  // active element (bounded loop), then activate with Enter — proves both
  // keyboard reachability AND keyboard activation, not just JS .focus().
  await page.evaluate(() => document.body.focus());
  let reachedByTab = false;
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const isChip = await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('vault-receipt-toggle'));
    if (isChip) { reachedByTab = true; break; }
  }
  if (!reachedByTab) {
    // fall back to direct focus so the rest of the probe can still run, but
    // flag it — tab-order reachability failed if this path is taken.
    await page.evaluate(() => document.querySelector('.vault-receipt-toggle').focus());
  }
  await page.keyboard.press('Enter');
  await wait(400);

  const afterOpen = await page.evaluate(() => {
    const chip = document.querySelector('.vault-receipt-toggle');
    const ariaControls = chip ? chip.getAttribute('aria-controls') : null;
    const target = ariaControls ? document.getElementById(ariaControls) : null;
    return {
      ariaExpanded: chip ? chip.getAttribute('aria-expanded') : null,
      targetExistsAfterExpand: !!target,
      targetVisible: target ? target.offsetParent !== null : false,
      targetTag: target ? target.tagName : null,
      targetTestId: target ? target.getAttribute('data-testid') : null,
      targetTextSample: target ? target.textContent.slice(0, 120) : null,
    };
  });

  // Keyboard-reach INTO the expanded body: Tab a few more times and confirm
  // focus lands somewhere whose closest ancestor is the receipt container
  // (or at minimum the body is traversable in DOM order right after the
  // toggle — normal-flow sibling, no tabindex trap).
  const focusEntersBody = await page.evaluate(() => {
    const target = document.getElementById('vault-settled-receipt');
    if (!target) return null;
    // DOM-order check: is target the toggle's very next sibling (or inside
    // the same parent, immediately after) — i.e. genuinely reachable in
    // natural tab/reading order, not off in an unrelated part of the tree.
    const chip = document.querySelector('.vault-receipt-toggle');
    const chipCard = chip.closest('[data-testid="vault-gutter-card-c"]');
    const parent = target.parentElement;
    return {
      sameParentAsChipCard: parent === chipCard.parentElement,
      domPositionAfterChipCard: !!(chipCard.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING),
    };
  });

  // CLOSE via keyboard (Enter again on the same focused toggle) to prove the
  // toggle remains focused/functional after DOM churn from expansion.
  const stillFocused = await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('vault-receipt-toggle'));
  await page.keyboard.press('Enter');
  await wait(400);
  const afterClose = await page.evaluate(() => {
    const chip = document.querySelector('.vault-receipt-toggle');
    const target = document.getElementById('vault-settled-receipt');
    return { ariaExpanded: chip ? chip.getAttribute('aria-expanded') : null, targetStillInDom: !!target };
  });

  return { before, reachedByTab, afterOpen, focusEntersBody, stillFocusedAfterExpand: stillFocused, afterClose };
}

// ---- ITEM 3: quick contrast/focus/motion-reduce spot-check ----
async function quickRegressionSweep(page) {
  // Focus ring visibility on the receipt toggle (before vs after focus).
  await page.evaluate(() => document.querySelector('.vault-receipt-toggle').blur());
  const unfocusedShot = await page.screenshot({ clip: await boxOf(page, '.vault-receipt-toggle', 12) });
  await page.evaluate(() => document.querySelector('.vault-receipt-toggle').focus());
  await wait(150);
  const focusedShot = await page.screenshot({ clip: await boxOf(page, '.vault-receipt-toggle', 12) });
  fs.writeFileSync(`${OUT}/toggle-unfocused.png`, unfocusedShot);
  fs.writeFileSync(`${OUT}/toggle-focused.png`, focusedShot);
  const diffPixels = diffPngBuffers(unfocusedShot, focusedShot);

  // Contrast of the receipt body text against its card background (canvas-
  // adjacent DOM text, not axe-visible) — sample via computed styles + a
  // manual luminance calc (no extra deps).
  // Composited-layer approximation (no PNG-decode dep available): walk from
  // the ink/coal page base UP through every ancestor's backgroundColor (rgba)
  // and backgroundImage (linear-gradient stops, averaged) to the text
  // element, alpha-compositing each layer in paint order, then contrast the
  // text color against the resulting flattened background. Conservative/
  // approximate but sufficient to corroborate "unchanged" since these are
  // the SAME style tokens as the pre-relocation body (verbatim lift).
  const contrast = await page.evaluate(() => {
    function parseRgba(c) {
      const m = c && c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(',').map((x) => parseFloat(x));
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    }
    function parseGradientAvg(img) {
      if (!img || img === 'none') return null;
      const stops = [...img.matchAll(/rgba?\([^)]+\)/g)].map((m) => parseRgba(m[0])).filter(Boolean);
      if (!stops.length) return null;
      const avg = stops.reduce((acc, s) => ({ r: acc.r + s.r, g: acc.g + s.g, b: acc.b + s.b, a: acc.a + s.a }), { r: 0, g: 0, b: 0, a: 0 });
      const n = stops.length;
      return { r: avg.r / n, g: avg.g / n, b: avg.b / n, a: avg.a / n };
    }
    function composite(top, base) {
      if (!top) return base;
      const a = top.a;
      return { r: top.r * a + base.r * (1 - a), g: top.g * a + base.g * (1 - a), b: top.b * a + base.b * (1 - a) };
    }
    function luminance({ r, g, b }) {
      const [R, G, B] = [r, g, b].map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * R + 0.7152 * G + 0.0722 * B;
    }
    function ratio(a, b) {
      const L1 = luminance(a) + 0.05;
      const L2 = luminance(b) + 0.05;
      return L1 > L2 ? L1 / L2 : L2 / L1;
    }
    function flattenedBgAt(el) {
      const chain = [];
      let node = el;
      while (node) {
        chain.unshift(node);
        node = node.parentElement;
      }
      let base = { r: 7, g: 8, b: 12 }; // ink #07080C page floor
      for (const n of chain) {
        const st = getComputedStyle(n);
        const bgColor = parseRgba(st.backgroundColor);
        const bgGrad = parseGradientAvg(st.backgroundImage);
        if (bgColor && bgColor.a > 0) base = composite(bgColor, base);
        if (bgGrad && bgGrad.a > 0) base = composite(bgGrad, base);
      }
      return base;
    }
    const body = document.getElementById('vault-settled-receipt');
    if (!body) return null;
    const p = body.querySelector('p');
    const code = body.querySelector('code');
    const dt = body.querySelector('dt');
    const results = {};
    for (const [label, el] of [['summary-p', p], ['hex-code', code], ['row-label-dt', dt]]) {
      if (!el) continue;
      const fgParsed = parseRgba(getComputedStyle(el).color);
      if (!fgParsed) continue;
      const bg = flattenedBgAt(el.parentElement || el);
      // The text color itself can be translucent (e.g. rgba(255,255,255,0.4)
      // secondary captions) — composite it over the flattened background
      // BEFORE computing contrast, or a low-alpha color falsely reports the
      // ratio of pure opaque white instead of what actually renders.
      const fgComposited = composite(fgParsed, bg);
      results[label] = { ratio: ratio(fgComposited, bg).toFixed(2), fgRaw: fgParsed, fgComposited, flattenedBg: bg };
    }
    return results;
  });

  const motionReduceCheck = await page.evaluate(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const toggleTransition = getComputedStyle(document.querySelector('.vault-receipt-toggle')).transition;
    return { mqMatches: mq.matches, toggleTransition };
  });

  return { diffPixels, contrast, motionReduceCheck };
}
async function boxOf(page, sel, pad) {
  return await page.evaluate(({ sel, pad }) => {
    const el = document.querySelector(sel);
    const r = el.getBoundingClientRect();
    return { x: Math.max(0, r.left - pad), y: Math.max(0, r.top - pad), width: r.width + pad * 2, height: r.height + pad * 2 };
  }, { sel, pad });
}
function diffPngBuffers(a, b) {
  // Coarse proxy (no png decode dep available): byte-length + content diff
  // count on raw PNG buffers is not pixel-accurate but a nonzero binary diff
  // combined with the visual screenshots (saved to disk for manual look)
  // is sufficient corroboration alongside the outline/box-shadow read below.
  let diffBytes = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) if (a[i] !== b[i]) diffBytes++;
  return diffBytes;
}

async function runMotionReducedContext(browser, w, h, { forceWin }) {
  const ctx = await browser.createBrowserContext();
  await ctx.overridePermissions?.(`http://localhost:${PORT}`, []);
  const page = await ctx.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await reachDesktopSettled(page, w, h, { forceWin });
  const state = await page.evaluate(() => {
    const heroOverlayEls = [...document.querySelectorAll('*')].filter((e) => getComputedStyle(e).zIndex === '12');
    return {
      reducedMotionActive: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      heroOverlayStillPresent: heroOverlayEls.length,
    };
  });
  await page.close();
  await ctx.close();
  return state;
}

async function runDesktop(browser, w, h, { forceWin }) {
  const page = await browser.newPage();
  const reached = await reachDesktopSettled(page, w, h, { forceWin });
  fs.mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: `${OUT}/settled-${forceWin ? 'win' : 'loss'}-${w}x${h}.png`, fullPage: true });

  const announcerTexts = await checkAnnouncer(page);
  const receiptCheck = await checkReceiptControlsKeyboard(page);
  // checkReceiptControlsKeyboard leaves the receipt CLOSED (open+close
  // roundtrip) — reopen it (same focused toggle, Enter) so the contrast
  // spot-check has a live `#vault-settled-receipt` to sample.
  await page.keyboard.press('Enter');
  await wait(400);
  const sweep = await quickRegressionSweep(page);

  await page.screenshot({ path: `${OUT}/settled-${forceWin ? 'win' : 'loss'}-${w}x${h}-expanded.png`, fullPage: true });
  await page.close();
  return { reached, announcerTexts, receiptCheck, sweep };
}

async function runMobile(browser, w, h) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in');
  await wait(600);
  // `vault-betentry-confirm` is a DESKTOP-ONLY wrapper testid (documented
  // gotcha) — mobile's commit button is the shared, unscoped <BetConsole>.
  // Try the scoped click first, fall back to an unscoped text click.
  const scopedOk = await clickTextWithin(page, '[data-testid="vault-betentry-confirm"]', 'SEND IT');
  if (!scopedOk) await clickText(page, 'SEND IT');
  await wait(700);
  const reached = await reachSettled(page, { forceWin: true });
  await wait(1200);

  const settlementPanel = await page.evaluate(() => {
    const panel = document.querySelector('[data-testid="vault-settledpanel"]');
    return {
      found: !!panel,
      ariaLive: panel ? panel.getAttribute('aria-live') : null,
      ariaLabel: panel ? panel.getAttribute('aria-label') : null,
      hasDesktopGutterCards: !!document.querySelector('[data-testid="vault-gutter-left"],[data-testid="vault-gutter-right"],[data-testid="vault-settled-left"]'),
    };
  });
  // Try to expand the mobile receipt (own toggle inside Settlement()).
  await clickText(page, 'view receipt');
  await wait(400);
  const receiptMobile = await page.evaluate(() => {
    const target = document.getElementById('vault-settled-receipt');
    return { targetExists: !!target, targetVisible: target ? target.offsetParent !== null : false };
  });
  await page.screenshot({ path: `${OUT}/mobile-settled-${w}x${h}.png`, fullPage: true });
  await page.close();
  return { reached, settlementPanel, receiptMobile };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const R = {};

  R.desktop_win_1440x900 = await runDesktop(browser, 1440, 900, { forceWin: true });
  R.desktop_loss_1440x900 = await runDesktop(browser, 1440, 900, { forceWin: false });
  R.motionReduce_1440x900 = await runMotionReducedContext(browser, 1440, 900, { forceWin: true });
  R.mobile_390x844 = await runMobile(browser, 390, 844);

  await browser.close();
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();
