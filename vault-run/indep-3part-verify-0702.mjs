// INDEPENDENT re-verification of the "3-part" vault change (2026-07-02):
//  1. INSTANT reveal-pace is a true one-frame simultaneous batch (not a
//     50ms/tile cascade, not a no-flip instant pop).
//  2. STAGGERED mode unchanged (~430ms/tile).
//  3. Long-trail (18/20) crash-fix holds in BOTH paces, rug-stop still seals
//     post-mine tiles.
//  4. "bet again · same trail" reuse flow: exactly one placeBet, pre-painted
//     planning state, no auto-reveal, GO works, gridSize-invalidates.
//  5. Regression smoke: normal loop + MANUAL tap-to-reveal unaffected.
//
// Written FRESH (not the maker's threepart-verify.mjs) per the "always run an
// independent verifier, don't trust the maker's own script/screenshots"
// house rule. Reuses only the PROVEN helper *patterns* (tap-based paintTrail,
// retry-until-outcome, div[aria-live="polite"][aria-label] settled panel,
// child-span "N before the rug" text) documented in AGENT_MEMORY.md — every
// assertion below is independently computed from raw DOM/canvas reads.
//
// page.on('pageerror') is wired FIRST, before any navigation, per the brief.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.argv[2] || '5185';
const S = 'shots/indep0702-';

function log(...a) { console.log(...a); }

async function newPage(browser, label) {
  const page = await browser.newPage();
  // WIRE page.on('pageerror') FIRST, before setViewport/goto.
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e && e.message || e)));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch {} });
  const t0 = Date.now();
  const httpResp = await page.goto(`http://localhost:${PORT}/originals/vault`, { waitUntil: 'networkidle2', timeout: 60000 });
  const httpStatus = httpResp ? httpResp.status() : null;
  await wait(1200);
  log(`[${label}] HTTP ${httpStatus} loaded in ${Date.now() - t0}ms`);
  return { page, pageErrors, consoleErrors, httpStatus };
}

function helpers(page) {
  async function clickText(t) {
    const h = await page.evaluateHandle((t) => {
      const els = [...document.querySelectorAll('button,[role=button]')];
      return els.find(e => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase())
        || els.find(e => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()));
    }, t);
    const el = h.asElement();
    if (!el) return false;
    await el.click();
    return true;
  }
  async function cc(idx, g) {
    return await page.evaluate(({ idx, g }) => {
      const c = document.querySelector('canvas'); if (!c) return null;
      const r = c.getBoundingClientRect();
      const W = r.width, H = r.height;
      const tR = H * 0.15, bR = H * 0.18, sF = 0.08;
      const sW = W * (1 - sF * 2), sH = (H - tR - bR) * 0.96;
      const av = Math.min(sW, sH);
      const gap = Math.max(6, av * 0.026);
      const tile = (av - gap * (g - 1)) / g;
      const full = tile * g + gap * (g - 1);
      const x0 = (W - full) / 2;
      const by = tR + (H - tR - bR) / 2;
      const y0 = by - full / 2;
      const col = idx % g, row = Math.floor(idx / g);
      return { cx: r.left + x0 + col * (tile + gap) + tile / 2, cy: r.top + y0 + row * (tile + gap) + tile / 2 };
    }, { idx, g });
  }
  function snake(n, g = 5) {
    const out = [];
    for (let row = 0; row < g && out.length < n; row++) {
      const cols = row % 2 === 0 ? [0, 1, 2, 3, 4] : [4, 3, 2, 1, 0];
      for (const col of cols) { if (out.length >= n) break; out.push(row * g + col); }
    }
    return out;
  }
  // discrete quick taps: down < HOLD_MS(220) then up — drag-paint is unreliable per memory.
  async function tapTrail(indices, g) {
    for (const idx of indices) {
      const c = await cc(idx, g); if (!c) continue;
      await page.mouse.move(c.cx, c.cy);
      await page.mouse.down();
      await wait(30);
      await page.mouse.up();
      await wait(60);
    }
  }
  async function goAriaLabel() {
    return await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null);
      for (const b of btns) { const al = b.getAttribute('aria-label') || ''; if (/^Run your trail of/.test(al)) return al; }
      return null;
    });
  }
  async function trailTileCount() {
    const al = await goAriaLabel();
    const m = al && al.match(/Run your trail of (\d+) tiles/);
    return m ? parseInt(m[1], 10) : null;
  }
  async function settledPanelLabel() {
    return await page.evaluate(() => {
      const el = document.querySelector('div[aria-live="polite"][aria-label]');
      return el ? el.getAttribute('aria-label') : null;
    });
  }
  // "N before the rug" lives in a CHILD span's textContent, NOT the outer aria-label.
  async function beforeRugCount() {
    return await page.evaluate(() => {
      const el = document.querySelector('div[aria-live="polite"][aria-label]');
      if (!el) return null;
      const spans = [...el.querySelectorAll('span')];
      for (const s of spans) {
        const m = s.textContent.match(/(\d+)\s+before the rug/i);
        if (m) return parseInt(m[1], 10);
      }
      return null;
    });
  }
  async function setPace(target) {
    const btns = await page.evaluate(() => [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null).map(b => ({ t: b.textContent.trim(), pressed: b.getAttribute('aria-pressed') })));
    const btn = btns.find(b => b.t.toLowerCase() === target.toLowerCase());
    if (btn && btn.pressed !== 'true') await clickText(target);
  }
  async function bodyHasText(needle) {
    return await page.evaluate((needle) => document.body.textContent.includes(needle), needle);
  }
  async function balanceText() {
    return await page.evaluate(() => {
      const spans = [...document.querySelectorAll('span')];
      for (const s of spans) {
        const t = s.textContent.trim();
        if (/^\d+\.\d{2}\s*USDC$/.test(t)) return t;
      }
      return null;
    });
  }
  async function footerRevealedCount() {
    return await page.evaluate(() => {
      const m = document.body.textContent.match(/(\d+)\s+of\s+(\d+)\s+safe compartments/);
      return m ? parseInt(m[1], 10) : null;
    });
  }
  async function findButtonByText(needle) {
    return await page.evaluate((needle) => {
      const btns = [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null);
      const b = btns.find(e => e.textContent.trim().toLowerCase().includes(needle.toLowerCase()));
      return b ? { text: b.textContent.trim(), ariaLabel: b.getAttribute('aria-label'), disabled: b.disabled } : null;
    }, needle);
  }
  async function isAutoActive() {
    // STOP button only exists while autoActive is true — unambiguous signal (per memory).
    const stop = await findButtonByText('STOP');
    return !!stop;
  }
  return {
    clickText, cc, snake, tapTrail, goAriaLabel, trailTileCount, settledPanelLabel,
    beforeRugCount, setPace, bodyHasText, balanceText, footerRevealedCount,
    findButtonByText, isAutoActive,
  };
}

async function pollSettled(page, maxMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const el = await page.evaluate(() => {
      const e = document.querySelector('div[aria-live="polite"][aria-label]');
      return e ? e.getAttribute('aria-label') : null;
    });
    if (el) return { label: el, ms: Date.now() - start };
    await wait(40);
  }
  return null;
}

async function enterPlayingWithTrail(h, size, g = 5) {
  await h.clickText('ape in');
  await wait(600);
  await h.clickText('send it');
  await wait(900);
  await h.clickText('TRAIL');
  await wait(300);
  await h.tapTrail(h.snake(size, g), g);
  return await h.trailTileCount();
}

// ── PART A: simultaneity timing + state-jump proof + STOP-button tell,
// at a 6-tile trail, both paces, on the SAME board size. Also captures a
// mid-flip screenshot ~1 frame after GO for the instant path, plus a
// pre-GO (sealed) and post-settle (open) reference for visual comparison.
async function testSimultaneity(browser, pace, size = 6, maxAttempts = 6) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { page, pageErrors } = await newPage(browser, `sim-${pace}-a${attempt}`);
    const h = helpers(page);
    const landed = await enterPlayingWithTrail(h, size, 5);
    if (pace === 'instant') await h.setPace('instant'); else await h.setPace('staggered');
    await wait(150);
    const goLabel = await h.goAriaLabel();
    const paceAriaPressed = await page.evaluate((p) => {
      const btns = [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null);
      const b = btns.find(e => e.textContent.trim().toLowerCase() === p);
      return b ? b.getAttribute('aria-pressed') : null;
    }, pace);
    await page.screenshot({ path: `${S}${pace}-${size}t-pregoV-sealed.png` });

    const t0 = Date.now();
    const samples = [];
    let sawStopButton = false;
    let firstFrameShotTaken = false;
    await h.clickText('GO');
    // fire an immediate + ~30ms screenshot capture for the instant path to catch mid-flip.
    if (pace === 'instant') {
      await page.screenshot({ path: `${S}instant-${size}t-a${attempt}-t0ms.png` });
      await wait(30);
      await page.screenshot({ path: `${S}instant-${size}t-a${attempt}-t30ms.png` });
      firstFrameShotTaken = true;
    }
    const deadline = Date.now() + 3200;
    let lastCount = -1;
    while (Date.now() < deadline) {
      const c = await h.footerRevealedCount();
      const stop = await h.findButtonByText('STOP');
      if (stop) sawStopButton = true;
      const t = Date.now() - t0;
      if (c !== lastCount) { samples.push({ t, count: c }); lastCount = c; }
      if (c !== null && c >= size) break;
      // if mine hit mid-cascade, footer text disappears (phase left playing) — detect via settle poll below
      const settledEarly = await page.evaluate(() => !!document.querySelector('div[aria-live="polite"][aria-label]'));
      if (settledEarly) break;
      await wait(10);
    }
    await wait(250);
    await page.screenshot({ path: `${S}${pace}-${size}t-a${attempt}-postreveal.png` });
    const settledLabel = await h.settledPanelLabel();
    const beforeRug = await h.beforeRugCount();
    const cleanRun = lastCount === size && !settledLabel;
    const mixedRun = !!settledLabel && beforeRug !== null;
    const elapsedTotal = samples.length ? samples[samples.length - 1].t : null;

    const result = {
      pace, attempt, size, goLabel, paceAriaPressed, samples, sawStopButton,
      cleanRun, mixedRun, settledLabel, beforeRug, elapsedTotalMs: elapsedTotal,
      pageErrorCount: pageErrors.length, pageErrors,
    };
    log(`[sim-${pace}] a${attempt} RESULT:`, JSON.stringify(result));
    await page.close();
    if (cleanRun || mixedRun) return result; // got a usable measurement either way
  }
  return { pace, size, error: 'no usable run after retries' };
}

// ── PART B: STAGGERED per-tile ms/tile unchanged — repeats the timing
// sample explicitly to report an ms/tile figure comparable to the historical
// 430ms/tile baseline.
function msPerTileFromSamples(samples, size) {
  // samples: [{t,count}] with count going 0->1->2...->size (or fewer if rugged)
  const clean = samples.filter(s => s.count !== null);
  if (clean.length < 2) return null;
  const first = clean.find(s => s.count === 1);
  const last = clean[clean.length - 1];
  if (!first || last.count < 2) return null;
  return (last.t - first.t) / (last.count - first.count);
}

// ── PART C: long-trail (18/20) crash retest in BOTH paces, rug-stop check.
async function testLongTrail(browser, size, pace, maxAttempts = 4) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { page, pageErrors } = await newPage(browser, `long${size}-${pace}-a${attempt}`);
    const h = helpers(page);
    const landed = await enterPlayingWithTrail(h, size, 5);
    if (!landed) { await page.close(); continue; }
    await h.setPace(pace);
    await wait(150);
    await h.clickText('GO');
    const settled = await pollSettled(page, 15000);
    const bodyLen = await page.evaluate(() => document.body.textContent.length);
    const blankScreen = bodyLen < 200;
    const beforeRug = settled ? await h.beforeRugCount() : null;
    await page.screenshot({ path: `${S}long${size}-${pace}-a${attempt}.png` });
    const result = {
      size, pace, attempt, landed, settledLabel: settled ? settled.label : null,
      settleMs: settled ? settled.ms : null, blankScreen, bodyLen, beforeRug,
      pageErrorCount: pageErrors.length, pageErrors,
    };
    log(`[long${size}-${pace}] a${attempt} RESULT:`, JSON.stringify(result));
    await page.close();
    if (settled) return result;
  }
  return { size, pace, error: 'never settled after retries' };
}

// ── PART D: reuse flow end-to-end — balance delta, pre-painted no auto-reveal, GO works, gridSize invalidation.
async function testReuseFlow(browser) {
  const { page, pageErrors } = await newPage(browser, 'reuse');
  const h = helpers(page);
  await enterPlayingWithTrail(h, 3, 5);
  const balancePreRound = await h.balanceText();
  await h.clickText('GO');
  let settled = await pollSettled(page, 4500);
  if (!settled) {
    // full clean trail cleared, control handed back — manually take profit
    const deadline = Date.now() + 6000;
    while (Date.now() < deadline) { const s = await h.findButtonByText('STOP'); if (!s) break; await wait(150); }
    await wait(250);
    await h.clickText('take profit');
    settled = await pollSettled(page, 8000);
  }
  await wait(400);
  const balanceAfterRound1 = await h.balanceText();
  const reuseBtn = await h.findButtonByText('same trail');
  await page.screenshot({ path: `${S}reuse-settled-row.png` });

  let balanceAfterReuseClick = null, goLabelAfterReuse = null, stopPresentAfterReuse = null, revealedCountAfterReuse = null;
  let goAfterReusePresses = null, settledAfterReuseGo = null;
  if (reuseBtn && !reuseBtn.disabled) {
    await h.clickText('same trail');
    await wait(600);
    balanceAfterReuseClick = await h.balanceText();
    goLabelAfterReuse = await h.goAriaLabel();
    stopPresentAfterReuse = await h.isAutoActive();
    revealedCountAfterReuse = await h.footerRevealedCount();
    await page.screenshot({ path: `${S}reuse-prepainted.png` });
    goAfterReusePresses = await h.clickText('GO');
    await wait(1200);
    settledAfterReuseGo = await pollSettled(page, 8000);
    if (!settledAfterReuseGo) {
      const deadline = Date.now() + 6000;
      while (Date.now() < deadline) { const s = await h.findButtonByText('STOP'); if (!s) break; await wait(150); }
      await wait(250);
      await h.clickText('take profit');
      settledAfterReuseGo = await pollSettled(page, 8000);
    }
  }
  await page.close();
  return {
    balancePreRound, settledLabel: settled ? settled.label : settled, balanceAfterRound1,
    reuseBtn, balanceAfterReuseClick, goLabelAfterReuse, stopPresentAfterReuse,
    revealedCountAfterReuse, goAfterReusePresses, settledAfterReuseGo: settledAfterReuseGo ? settledAfterReuseGo.label : null,
    pageErrorCount: pageErrors.length,
  };
}

async function testReuseModeInvalidation(browser) {
  const { page, pageErrors } = await newPage(browser, 'reuse-modeinv');
  const h = helpers(page);
  await enterPlayingWithTrail(h, 3, 5);
  await h.clickText('GO');
  let settled = await pollSettled(page, 4500);
  if (!settled) {
    const deadline = Date.now() + 6000;
    while (Date.now() < deadline) { const s = await h.findButtonByText('STOP'); if (!s) break; await wait(150); }
    await wait(250);
    await h.clickText('take profit');
    settled = await pollSettled(page, 8000);
  }
  await wait(400);
  const reuseBtnBefore = await h.findButtonByText('same trail');
  await h.clickText('change mode');
  await wait(600);
  await h.clickText('SHITCOIN'); // 7x7
  await wait(300);
  await h.clickText('SEND IT');
  await wait(900);
  await h.tapTrail([0], 7);
  await wait(500);
  await h.clickText('take profit');
  const settled2 = await pollSettled(page, 15000);
  await wait(400);
  const reuseBtnAfter = await h.findButtonByText('same trail');
  await page.screenshot({ path: `${S}reuse-modeinvalidated.png` });
  await page.close();
  return { reuseBtnBefore, settled2: settled2 ? settled2.label : null, reuseBtnAfter, pageErrorCount: pageErrors.length };
}

// ── PART E: regression smoke — MANUAL mode tap-to-reveal, normal loop.
async function testManualModeSmoke(browser) {
  const { page, pageErrors } = await newPage(browser, 'manual-smoke');
  const h = helpers(page);
  const onboardingPresent = await page.evaluate(() => document.body.textContent.length > 0);
  await h.clickText('ape in');
  await wait(600);
  await h.clickText('send it');
  await wait(900);
  // MANUAL mode is default (no TRAIL click) — tap-to-reveal directly.
  await h.tapTrail([0, 1], 5);
  await wait(500);
  const revealedAfterManualTaps = await h.footerRevealedCount();
  await h.clickText('take profit');
  const settled = await pollSettled(page, 8000);
  await wait(300);
  await h.clickText('bet again');
  await wait(700);
  const backToPlaying = await h.goAriaLabel(); // null expected (manual mode, no trail concept needed) -- just confirm phase advanced
  const insideRound = await page.evaluate(() => document.body.textContent.includes('PUMP') || document.body.textContent.includes('CASH OUT') || document.body.textContent.includes('cash out'));
  await page.screenshot({ path: `${S}manual-smoke-restart.png` });
  await page.close();
  return { onboardingPresent, revealedAfterManualTaps, settledLabel: settled ? settled.label : null, insideRound, pageErrorCount: pageErrors.length };
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EXE, headless: false,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
    args: [`--window-size=1460,1040`, '--autoplay-policy=no-user-gesture-required'],
  });

  const out = {};
  out.simStaggered = await testSimultaneity(browser, 'staggered', 6);
  out.simInstant = await testSimultaneity(browser, 'instant', 6);
  out.msPerTileStaggered = out.simStaggered.samples ? msPerTileFromSamples(out.simStaggered.samples, 6) : null;

  out.long18instant = await testLongTrail(browser, 18, 'instant');
  out.long20instant = await testLongTrail(browser, 20, 'instant');
  out.long18staggered = await testLongTrail(browser, 18, 'staggered');
  out.long20staggered = await testLongTrail(browser, 20, 'staggered');

  out.reuseFlow = await testReuseFlow(browser);
  out.reuseModeInv = await testReuseModeInvalidation(browser);

  out.manualSmoke = await testManualModeSmoke(browser);

  fs.writeFileSync('indep0702-results.json', JSON.stringify(out, null, 2));
  log('=== FULL SUMMARY ===');
  log(JSON.stringify(out, null, 2));

  await browser.close();
  log('DONE');
})();
