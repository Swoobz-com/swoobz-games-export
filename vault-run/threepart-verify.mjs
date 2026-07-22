// Verifies the 3-part vault change (2026-07-02):
//  1. SESSION PULSE removed from the SETTLED panel only (Lobby/Playing keep it).
//  2. "bet again · same trail" reuse-pattern preset.
//  3. Instant reveal-pace is a true one-frame simultaneous batch, not a 50ms cascade.
// Reuses the tap-based paintTrail + retry-until-outcome pattern established in
// crashfix-verify.mjs / revealpace-verify.mjs / polishcheck.mjs.
import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.argv[2] || '5185';
const S = 'shots/threepart-';

async function newPage(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));
  await page.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch {} });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1200);
  return { page, consoleErrors };
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
  async function settledPanelText() {
    return await page.evaluate(() => {
      const el = document.querySelector('div[aria-live="polite"][aria-label]');
      return el ? el.textContent : null;
    });
  }
  async function settledPanelLabel() {
    return await page.evaluate(() => {
      const el = document.querySelector('div[aria-live="polite"][aria-label]');
      return el ? el.getAttribute('aria-label') : null;
    });
  }
  async function setInstantPace() {
    const btns = await page.evaluate(() => [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null).map(b => ({ t: b.textContent.trim(), pressed: b.getAttribute('aria-pressed') })));
    const instant = btns.find(b => b.t.toLowerCase() === 'instant');
    if (instant && instant.pressed !== 'true') await clickText('instant');
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
  return { clickText, cc, snake, tapTrail, goAriaLabel, settledPanelText, settledPanelLabel, setInstantPace, bodyHasText, balanceText, footerRevealedCount, findButtonByText };
}

async function pollSettled(page, maxMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const el = await page.evaluate(() => {
      const e = document.querySelector('div[aria-live="polite"][aria-label]');
      return e ? e.getAttribute('aria-label') : null;
    });
    if (el) return el;
    await wait(150);
  }
  return null;
}

// ── TEST 1: SESSION PULSE removed from settled, present in Lobby/Playing ──
async function testPart1(browser) {
  const { page, consoleErrors } = await newPage(browser);
  const h = helpers(page);
  const lobbyHasPulse = await h.bodyHasText('SESSION PULSE');
  await h.clickText('ape in');
  await wait(600);
  const betEntryHasPulse = await h.bodyHasText('SESSION PULSE'); // bet-entry has no sidebar pulse call — informational only
  await h.clickText('send it');
  await wait(900);
  const playingHasPulse = await h.bodyHasText('SESSION PULSE');
  await page.screenshot({ path: `${S}playing-with-pulse.png` });
  // Reveal a couple of tiles manually (MANUAL mode, default) then cash out to settle.
  await h.tapTrail([0, 1], 5);
  await wait(500);
  await h.clickText('take profit');
  const settled1 = await pollSettled(page, 8000);
  await wait(300);
  const settledHasPulseR1 = await h.bodyHasText('SESSION PULSE');
  const settledHasTrendR1 = await h.bodyHasText('SESSION TREND');
  await page.screenshot({ path: `${S}settled-r1-no-pulse.png` });
  // second round to get history.length>=2 so SESSION TREND actually renders
  await h.clickText('bet again');
  await wait(700);
  await h.tapTrail([0, 1], 5);
  await wait(500);
  await h.clickText('take profit');
  const settled2 = await pollSettled(page, 8000);
  await wait(300);
  const settledHasPulseR2 = await h.bodyHasText('SESSION PULSE');
  const settledHasTrendR2 = await h.bodyHasText('SESSION TREND');
  await page.screenshot({ path: `${S}settled-r2-no-pulse-with-trend.png` });
  const result = {
    lobbyHasPulse, betEntryHasPulse, playingHasPulse,
    settled1, settledHasPulseR1, settledHasTrendR1,
    settled2, settledHasPulseR2, settledHasTrendR2,
    pageErrorCount: consoleErrors.filter(e => e.startsWith('pageerror:')).length,
  };
  console.log('[part1] RESULT:', JSON.stringify(result, null, 2));
  await page.close();
  return result;
}

// Runs the currently-planned trail via GO, then GUARANTEES a settle: if a
// mine ends it, settleAt() fires automatically; if the WHOLE trail clears
// clean, control hands back to the player (phase stays 'playing' by design —
// "hand control back, not auto-cash") so we then manually TAKE PROFIT.
async function runTrailAndSettle(page, h) {
  await h.clickText('GO');
  let settledLabel = await pollSettled(page, 4500);
  if (!settledLabel) {
    const deadline = Date.now() + 6000;
    while (Date.now() < deadline) {
      const stopBtn = await h.findButtonByText('STOP');
      if (!stopBtn) break;
      await wait(150);
    }
    await wait(250);
    await h.clickText('take profit');
    settledLabel = await pollSettled(page, 8000);
  }
  return settledLabel;
}

// ── TEST 2: "bet again · same trail" reuse preset ──
async function testPart2(browser) {
  const { page, consoleErrors } = await newPage(browser);
  const h = helpers(page);
  await h.clickText('ape in');
  await wait(600);
  await h.clickText('send it');
  await wait(900);
  await h.clickText('TRAIL');
  await wait(300);
  const trail = h.snake(3, 5);
  await h.tapTrail(trail, 5);
  const goLabel = await h.goAriaLabel();
  console.log('[part2] GO aria-label before first run:', goLabel);
  const settledLabel = await runTrailAndSettle(page, h);
  console.log('[part2] settled label:', settledLabel);
  await wait(400);
  const balanceBefore = await h.balanceText();
  const reuseBtn = await h.findButtonByText('same trail');
  console.log('[part2] reuse button:', JSON.stringify(reuseBtn));
  await page.screenshot({ path: `${S}settled-reuse-row.png` });
  let clickedOk = false, balanceAfter = null, plannedNoAutoRun = null, trailPrepainted = null;
  if (reuseBtn && !reuseBtn.disabled) {
    clickedOk = await h.clickText('same trail');
    await wait(500);
    balanceAfter = await h.balanceText();
    // Should now be in 'playing' phase, TRAIL mode, trail pre-painted, NOT auto-running.
    const goLabelAfterReuse = await h.goAriaLabel();
    const stopBtn = await h.findButtonByText('STOP');
    plannedNoAutoRun = { goLabelAfterReuse, stopBtnPresent: !!stopBtn };
    trailPrepainted = /^Run your trail of 3 tiles/.test(goLabelAfterReuse || '');
    await page.screenshot({ path: `${S}reuse-prepainted-planning.png` });
    // Now actually press GO to confirm it reveals.
    if (goLabelAfterReuse) {
      await h.clickText('GO');
      await wait(1200);
    }
  }
  const result = {
    goLabel, settledLabel, reuseBtn, clickedOk,
    balanceBefore, balanceAfter,
    plannedNoAutoRun, trailPrepainted,
    pageErrorCount: consoleErrors.filter(e => e.startsWith('pageerror:')).length,
  };
  console.log('[part2] RESULT:', JSON.stringify(result, null, 2));
  await page.close();
  return result;
}

// ── TEST 2b: reuse button disappears after a gridSize (mode) change ──
async function testPart2ModeInvalidation(browser) {
  const { page, consoleErrors } = await newPage(browser);
  const h = helpers(page);
  await h.clickText('ape in');
  await wait(600);
  await h.clickText('send it'); // bluechips default, 5x5
  await wait(900);
  await h.clickText('TRAIL');
  await wait(300);
  await h.tapTrail(h.snake(3, 5), 5);
  const settledLabel = await runTrailAndSettle(page, h);
  await wait(400);
  const reuseBtnBefore = await h.findButtonByText('same trail');
  await h.clickText('change mode');
  await wait(600);
  await h.clickText('SHITCOIN'); // 7x7 grid
  await wait(300);
  await h.clickText('SEND IT');
  await wait(900);
  const reuseBtnDuringPlay = await h.findButtonByText('same trail'); // n/a while playing (not settled panel), sanity only
  // cash out immediately isn't possible with 0 revealed tiles; tap once then settle
  await h.tapTrail([0], 7);
  await wait(500);
  await h.clickText('take profit');
  const settledLabel2 = await pollSettled(page, 15000);
  await wait(400);
  const reuseBtnAfterModeChange = await h.findButtonByText('same trail');
  await page.screenshot({ path: `${S}reuse-invalidated-after-mode-change.png` });
  const result = {
    settledLabel, reuseBtnBefore, settledLabel2, reuseBtnAfterModeChange,
    pageErrorCount: consoleErrors.filter(e => e.startsWith('pageerror:')).length,
  };
  console.log('[part2-invalidation] RESULT:', JSON.stringify(result, null, 2));
  await page.close();
  return result;
}

// ── TEST 3: instant simultaneity — 4-tile trail, poll revealed-count text.
// Retries on a fresh page until a CLEAN (no mid-cascade rug) run lands, since
// mine placement is genuine crypto randomness (memory: a fixed tap sequence
// does not reliably avoid a mine) — a rug mid-measurement would corrupt the
// timing sample (footer text disappears once phase leaves 'playing').
async function testPart3Simultaneity(browser, pace, maxAttempts = 6) {
  const SIZE = 4;
  let lastResult = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { page, consoleErrors } = await newPage(browser);
    const h = helpers(page);
    await h.clickText('ape in');
    await wait(600);
    await h.clickText('send it');
    await wait(900);
    await h.clickText('TRAIL');
    await wait(300);
    await h.tapTrail(h.snake(SIZE, 5), 5);
    // The reveal-pace pill only mounts once a trail is actually painted
    // (trailPending) — must toggle AFTER painting, not before (an earlier
    // driver revision toggled before painting and silently no-op'd, since
    // clickText('instant') found no button yet).
    if (pace === 'instant') await h.setInstantPace();
    await wait(200);
    const goLabel = await h.goAriaLabel();
    console.log(`[part3-${pace}] attempt ${attempt} GO aria-label:`, goLabel);
    const t0 = Date.now();
    const samples = [];
    let sawStopButton = false;
    await h.clickText('GO');
    const deadline = Date.now() + 2500;
    let lastCount = -1;
    while (Date.now() < deadline) {
      const c = await h.footerRevealedCount();
      const stopBtn = await h.findButtonByText('STOP');
      if (stopBtn) sawStopButton = true;
      const t = Date.now() - t0;
      if (c !== lastCount) {
        samples.push({ t, count: c });
        lastCount = c;
      }
      if (c !== null && c >= SIZE) break; // fully revealed, clean run
      await wait(15);
    }
    await wait(300);
    const cleanRun = lastCount === SIZE;
    await page.screenshot({ path: `${S}sim-${pace}-attempt${attempt}.png` });
    const result = {
      pace, attempt, goLabel, samples, sawStopButton, cleanRun,
      pageErrorCount: consoleErrors.filter(e => e.startsWith('pageerror:')).length,
    };
    console.log(`[part3-${pace}] attempt ${attempt} RESULT:`, JSON.stringify(result, null, 2));
    await page.close();
    lastResult = result;
    if (cleanRun) return result; // got our measurement, done
    console.log(`[part3-${pace}] attempt ${attempt} hit a mine mid-measurement (or trail didn't register) — retrying`);
  }
  return lastResult;
}

// ── TEST 4: long trail (18-20) instant — must not blank-screen ──
async function testLongTrailInstant(browser, size) {
  const { page, consoleErrors } = await newPage(browser);
  const h = helpers(page);
  let attempt = 0;
  let settledLabelText = null;
  while (attempt < 4 && !settledLabelText) {
    attempt++;
    if (attempt > 1) {
      await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
      await wait(1000);
    }
    await h.clickText('ape in');
    await wait(600);
    await h.clickText('send it');
    await wait(900);
    await h.clickText('TRAIL');
    await wait(300);
    await h.tapTrail(h.snake(size, 5), 5);
    // Pace pill only mounts once trail is painted — toggle AFTER, not before.
    await h.setInstantPace();
    await wait(200);
    const goLabel = await h.goAriaLabel();
    if (!goLabel) { console.log(`[longtrail${size}] no trail registered, retrying`); continue; }
    const paceCheck = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null);
      const instant = btns.find(b => b.textContent.trim().toLowerCase() === 'instant');
      return instant ? instant.getAttribute('aria-pressed') : null;
    });
    console.log(`[longtrail${size}] pace instant aria-pressed:`, paceCheck);
    await h.clickText('GO');
    settledLabelText = await pollSettled(page, 15000);
    if (!settledLabelText) console.log(`[longtrail${size}] attempt ${attempt} did NOT settle`);
  }
  const bodyLen = await page.evaluate(() => document.body.textContent.length);
  await page.screenshot({ path: `${S}longtrail${size}-instant.png` });
  const result = {
    size, attempts: attempt, settledLabelText, bodyLen, blankScreen: bodyLen < 200,
    pageErrorCount: consoleErrors.filter(e => e.startsWith('pageerror:')).length,
    pageErrors: consoleErrors.filter(e => e.startsWith('pageerror:')),
  };
  console.log(`[longtrail${size}] RESULT:`, JSON.stringify(result, null, 2));
  await page.close();
  return result;
}

const browser = await puppeteer.launch({
  executablePath: EXE, headless: false,
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  args: [`--window-size=1460,1040`, '--autoplay-policy=no-user-gesture-required'],
});

const part1 = await testPart1(browser);
const part2 = await testPart2(browser);
const part2inv = await testPart2ModeInvalidation(browser);
const simStaggered = await testPart3Simultaneity(browser, 'staggered');
const simInstant = await testPart3Simultaneity(browser, 'instant');
const long18 = await testLongTrailInstant(browser, 18);
const long20 = await testLongTrailInstant(browser, 20);

console.log('=== SUMMARY ===');
console.log(JSON.stringify({ part1, part2, part2inv, simStaggered, simInstant, long18, long20 }, null, 2));

await browser.close();
console.log('DONE');
