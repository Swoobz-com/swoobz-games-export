// Follow-up to indep-3part-verify-0702.mjs: the first-pass instant timing
// sample was contaminated by inline mid-flip screenshots taken INSIDE the
// polling loop (page.screenshot() on headed Chrome costs 100s of ms) --
// that run reported elapsedTotalMs=753 for a 6-tile instant reveal, which
// does not square with the documented ~232-283ms/4-tile baseline. This
// script separates the two concerns:
//   TEST 1: pure timing (zero screenshots in the critical polling window)
//   TEST 2: dedicated visual mid-flip capture (own page, timing not trusted)
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.argv[2] || '5185';
const S = 'shots/indeptiming0702-';

async function newPage(browser, label) {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e && e.message || e)));
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch {} });
  await page.goto(`http://localhost:${PORT}/originals/vault`, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1200);
  return { page, pageErrors };
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
  async function setPace(target) {
    const btns = await page.evaluate(() => [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null).map(b => ({ t: b.textContent.trim(), pressed: b.getAttribute('aria-pressed') })));
    const btn = btns.find(b => b.t.toLowerCase() === target.toLowerCase());
    if (btn && btn.pressed !== 'true') await clickText(target);
  }
  async function footerRevealedCount() {
    return await page.evaluate(() => {
      const m = document.body.textContent.match(/(\d+)\s+of\s+(\d+)\s+safe compartments/);
      return m ? parseInt(m[1], 10) : null;
    });
  }
  async function settledPanelLabel() {
    return await page.evaluate(() => {
      const el = document.querySelector('div[aria-live="polite"][aria-label]');
      return el ? el.getAttribute('aria-label') : null;
    });
  }
  async function findButtonByText(needle) {
    return await page.evaluate((needle) => {
      const btns = [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null);
      const b = btns.find(e => e.textContent.trim().toLowerCase().includes(needle.toLowerCase()));
      return b ? { text: b.textContent.trim(), disabled: b.disabled } : null;
    }, needle);
  }
  return { clickText, cc, snake, tapTrail, goAriaLabel, setPace, footerRevealedCount, settledPanelLabel, findButtonByText };
}

async function enterPlayingWithTrail(h, size, g = 5) {
  await h.clickText('ape in');
  await wait(600);
  await h.clickText('send it');
  await wait(900);
  await h.clickText('TRAIL');
  await wait(300);
  await h.tapTrail(h.snake(size, g), g);
  return await h.goAriaLabel();
}

// TEST 1: clean timing, NO screenshots in the polling window, high-frequency poll (~8ms).
async function cleanTiming(browser, pace, size, maxAttempts = 6) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { page, pageErrors } = await newPage(browser, `clean-${pace}-${size}-a${attempt}`);
    const h = helpers(page);
    const goLabel = await enterPlayingWithTrail(h, size, 5);
    await h.setPace(pace);
    await wait(150);
    const t0 = Date.now();
    const samples = [];
    let lastCount = -1;
    await h.clickText('GO');
    const deadline = Date.now() + 3000;
    let settledDuringPoll = null;
    while (Date.now() < deadline) {
      const c = await h.footerRevealedCount();
      const t = Date.now() - t0;
      if (c !== lastCount) { samples.push({ t, count: c }); lastCount = c; }
      if (c !== null && c >= size) break;
      const sl = await h.settledPanelLabel();
      if (sl) { settledDuringPoll = sl; break; }
      await wait(8);
    }
    const cleanRun = lastCount === size && !settledDuringPoll;
    const result = { pace, size, attempt, goLabel, samples, cleanRun, settledDuringPoll, pageErrorCount: pageErrors.length };
    console.log(`[clean-${pace}-${size}] a${attempt}:`, JSON.stringify(result));
    await page.close();
    if (cleanRun) return result;
  }
  return { pace, size, error: 'no clean run' };
}

// TEST 2: dedicated visual mid-flip capture (instant pace). Captures:
//  - sealed (pre-GO)
//  - t~0ms (immediately after click resolves)
//  - t~40ms, t~90ms (inside TILE_FLIP_MS=180 window)
//  - t~400ms (settled/open, for comparison)
async function visualMidFlip(browser, size = 6, maxAttempts = 5) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { page, pageErrors } = await newPage(browser, `visual-a${attempt}`);
    const h = helpers(page);
    await enterPlayingWithTrail(h, size, 5);
    await h.setPace('instant');
    await wait(150);
    await page.screenshot({ path: `${S}visual-sealed-a${attempt}.png` });
    await h.clickText('GO');
    await page.screenshot({ path: `${S}visual-t0-a${attempt}.png` });
    await wait(40);
    await page.screenshot({ path: `${S}visual-t40-a${attempt}.png` });
    await wait(50);
    await page.screenshot({ path: `${S}visual-t90-a${attempt}.png` });
    await wait(300);
    await page.screenshot({ path: `${S}visual-t400-a${attempt}.png` });
    const finalCount = await h.footerRevealedCount();
    const settledLabel = await h.settledPanelLabel();
    console.log(`[visual] a${attempt} finalCount=${finalCount} settledLabel=${settledLabel} pageErrors=${pageErrors.length}`);
    await page.close();
    if (finalCount === size || settledLabel) return { attempt, finalCount, settledLabel, pageErrorCount: pageErrors.length };
  }
  return { error: 'no usable attempt' };
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EXE, headless: false,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
    args: [`--window-size=1460,1040`, '--autoplay-policy=no-user-gesture-required'],
  });
  const out = {};
  out.cleanStaggered6 = await cleanTiming(browser, 'staggered', 6);
  out.cleanInstant6 = await cleanTiming(browser, 'instant', 6);
  out.cleanStaggered5 = await cleanTiming(browser, 'staggered', 5);
  out.cleanInstant5 = await cleanTiming(browser, 'instant', 5);
  out.visual = await visualMidFlip(browser, 6);

  fs.writeFileSync('indeptiming0702-results.json', JSON.stringify(out, null, 2));
  console.log('=== SUMMARY ===');
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
  console.log('DONE');
})();
