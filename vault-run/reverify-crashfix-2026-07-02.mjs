// INDEPENDENT re-verification of the L1134-1145 trailTargetBps double-count
// crash fix (VaultExperience.tsx). Written fresh for this holdgate — does NOT
// import/reuse the maker's crashfix-verify.mjs, only mirrors the previously
// PROVEN-RELIABLE tap-based paintTrail approach from my own earlier
// indep-crash-confirm.mjs (drag-based paintTrail was unreliable per memory).
// Every scenario retries-until-observed (mine placement is genuine
// crypto.getRandomValues randomness; no fixed sequence forces an outcome).
import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.argv[2] || '5181';
const S = 'shots/reverify-2026-07-02-';

async function newPage(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  await page.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch {} });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1200);
  return { page, pageErrors, consoleErrors };
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
  async function goSubText() {
    return await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null);
      for (const b of btns) { const al = b.getAttribute('aria-label') || ''; if (/^Run your trail of/.test(al)) return b.textContent.trim(); }
      return null;
    });
  }
  async function setInstantPace() {
    const btns = await page.evaluate(() => [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null).map(b => ({ t: b.textContent.trim(), pressed: b.getAttribute('aria-pressed') })));
    const instant = btns.find(b => b.t.toLowerCase() === 'instant');
    if (instant && instant.pressed !== 'true') await clickText('instant');
  }
  async function domSnapshot() {
    return await page.evaluate(() => ({
      bodyTextLen: document.body.textContent.length,
      hasCanvas: !!document.querySelector('canvas'),
      hasActionBar: !!document.querySelector('.vault-actionbar'),
      buttonCount: document.querySelectorAll('button').length,
    }));
  }
  async function settledLabel() {
    return await page.evaluate(() => {
      const el = document.querySelector('div[aria-live="polite"][aria-label]');
      return el ? el.getAttribute('aria-label') : null;
    });
  }
  async function settledPanelText() {
    return await page.evaluate(() => {
      const el = document.querySelector('div[aria-live="polite"][aria-label]');
      return el ? el.textContent : null;
    });
  }
  return { clickText, cc, snake, tapTrail, goAriaLabel, goSubText, setInstantPace, domSnapshot, settledLabel, settledPanelText };
}

async function pollSettledOrCrash(page, pageErrors, maxMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (pageErrors.length > 0) return { crashed: true, settledLabelText: null };
    const el = await page.evaluate(() => {
      const e = document.querySelector('div[aria-live="polite"][aria-label]');
      return e ? e.getAttribute('aria-label') : null;
    });
    if (el) return { crashed: false, settledLabelText: el };
    await wait(200);
  }
  return { crashed: false, settledLabelText: null, timedOut: true };
}

async function runLongTrail(browser, { pace, size, tag }) {
  const { page, pageErrors, consoleErrors } = await newPage(browser);
  const h = helpers(page);
  let attempt = 0, outcome = null, goLabel = null, blankScreenDetail = null;
  while (attempt < 5 && !outcome) {
    attempt++;
    if (attempt > 1) {
      await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
      await wait(1000);
    }
    await h.clickText('ape in');
    await wait(600);
    await h.clickText('send it');
    await wait(900);
    if (pace === 'instant') await h.setInstantPace();
    await wait(200);
    await h.clickText('TRAIL');
    await wait(300);
    await h.tapTrail(h.snake(size, 5), 5);
    goLabel = await h.goAriaLabel();
    if (!goLabel) { console.log(`[${tag}] attempt ${attempt}: GO button missing, retrying`); continue; }
    if (pageErrors.length > 0) { console.log(`[${tag}] pageerror BEFORE clicking GO:`, pageErrors); outcome = { crashed: true }; break; }
    await h.clickText('GO');
    const r = await pollSettledOrCrash(page, pageErrors, 15000);
    if (r.crashed) {
      const snap = await h.domSnapshot().catch(() => null);
      blankScreenDetail = snap;
      outcome = { crashed: true, settledLabelText: null };
      break;
    }
    if (r.settledLabelText) {
      outcome = { crashed: false, settledLabelText: r.settledLabelText };
    } else {
      console.log(`[${tag}] attempt ${attempt}: no settle within 15s, no pageerror yet — treating as stall, retrying`);
    }
  }
  const snap = await h.domSnapshot();
  await page.screenshot({ path: `${S}${tag}-final.png` });
  const result = {
    tag, pace, size, attempts: attempt,
    goLabel,
    settledLabelText: outcome ? outcome.settledLabelText : null,
    crashed: outcome ? !!outcome.crashed : true,
    finalDomSnapshot: snap,
    blankScreenDetail,
    pageErrorCount: pageErrors.length,
    pageErrors: [...pageErrors],
    consoleErrorCount: consoleErrors.length,
  };
  console.log(`[${tag}] RESULT:`, JSON.stringify(result, null, 2));
  await page.close();
  return result;
}

async function runRugMidLongInstant(browser) {
  const tag = 'rugstop-instant20';
  const { page, pageErrors, consoleErrors } = await newPage(browser);
  const h = helpers(page);
  const SIZE = 20;
  let attempt = 0, settledLabelText = null, panelText = null, revealedBeforeRug = null, crashed = false;
  while (attempt < 12 && (revealedBeforeRug === null || revealedBeforeRug < 3) && !crashed) {
    attempt++;
    if (attempt > 1) {
      await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
      await wait(1000);
    }
    await h.clickText('ape in');
    await wait(600);
    await h.clickText('send it');
    await wait(900);
    await h.setInstantPace();
    await wait(200);
    await h.clickText('TRAIL');
    await wait(300);
    await h.tapTrail(h.snake(SIZE, 5), 5);
    const goLabel = await h.goAriaLabel();
    if (!goLabel) { console.log(`[${tag}] attempt ${attempt}: no trail registered, retrying`); continue; }
    await h.clickText('GO');
    const r = await pollSettledOrCrash(page, pageErrors, 15000);
    if (r.crashed) { crashed = true; break; }
    if (!r.settledLabelText) { console.log(`[${tag}] attempt ${attempt}: stalled, retrying`); continue; }
    settledLabelText = r.settledLabelText;
    panelText = await h.settledPanelText();
    const m = panelText ? panelText.match(/(\d+)\s+before the rug/i) : null;
    revealedBeforeRug = m ? parseInt(m[1], 10) : null;
    console.log(`[${tag}] attempt ${attempt} settledLabel:`, settledLabelText, 'revealedBeforeRug:', revealedBeforeRug);
  }
  // Independent pixel-level corroboration: sample the tile centers PAST the
  // rug index (in the painted trail order) and confirm none show the
  // "revealed-safe" bright green ring styling — cross-check against the DOM
  // text claim rather than trusting the text alone.
  let pixelCheck = null;
  if (!crashed && revealedBeforeRug !== null) {
    const order = h.snake(SIZE, 5);
    const beyondRugIndices = order.slice(revealedBeforeRug + 1); // tiles after the rug tile itself
    const samples = [];
    for (const idx of beyondRugIndices.slice(0, 5)) {
      const c = await h.cc(idx, 5);
      if (!c) continue;
      const rgb = await page.evaluate(({ cx, cy }) => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return null;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const px = Math.round((cx - rect.left) * (canvas.width / rect.width));
        const py = Math.round((cy - rect.top) * (canvas.height / rect.height));
        try {
          const d = ctx.getImageData(px, py, 1, 1).data;
          return [d[0], d[1], d[2], d[3]];
        } catch (e) { return null; }
      }, c);
      samples.push({ idx, rgb });
    }
    pixelCheck = { beyondRugIndicesSampled: beyondRugIndices.slice(0, 5), samples };
  }
  await page.screenshot({ path: `${S}${tag}-final.png` });
  const result = {
    tag, trailSize: SIZE, attempts: attempt, crashed,
    settledLabelText, panelText, revealedBeforeRug,
    sealedTilesBeyondRug: revealedBeforeRug !== null ? SIZE - revealedBeforeRug - 1 : null,
    pixelCheck,
    pageErrorCount: pageErrors.length,
    pageErrors: [...pageErrors],
  };
  console.log(`[${tag}] RESULT:`, JSON.stringify(result, null, 2));
  await page.close();
  return result;
}

async function runShortTrailRegression(browser) {
  const tag = 'shorttrail4-regression';
  const { page, pageErrors, consoleErrors } = await newPage(browser);
  const h = helpers(page);
  let attempt = 0, settledLabelText = null, goLabel = null, subText = null, crashed = false;
  while (attempt < 5 && !settledLabelText && !crashed) {
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
    const SIZE = 4;
    await h.tapTrail(h.snake(SIZE, 5), 5);
    goLabel = await h.goAriaLabel();
    subText = await h.goSubText();
    if (!goLabel) { console.log(`[${tag}] attempt ${attempt}: no GO label, retrying`); continue; }
    console.log(`[${tag}] attempt ${attempt} GO aria-label:`, goLabel, 'subText:', subText);
    await h.clickText('GO');
    const r = await pollSettledOrCrash(page, pageErrors, 15000);
    if (r.crashed) { crashed = true; break; }
    settledLabelText = r.settledLabelText;
  }
  await page.screenshot({ path: `${S}${tag}-final.png` });
  const result = {
    tag, attempts: attempt, goLabel, subText, settledLabelText, crashed,
    pageErrorCount: pageErrors.length,
    pageErrors: [...pageErrors],
  };
  console.log(`[${tag}] RESULT:`, JSON.stringify(result, null, 2));
  await page.close();
  return result;
}

const browser = await puppeteer.launch({
  executablePath: EXE, headless: false,
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  args: [`--window-size=1460,1040`, '--autoplay-policy=no-user-gesture-required'],
});

console.log(`=== INDEPENDENT RE-VERIFICATION, port ${PORT} ===`);

const staggered18 = await runLongTrail(browser, { pace: 'staggered', size: 18, tag: 'staggered18' });
const staggered20 = await runLongTrail(browser, { pace: 'staggered', size: 20, tag: 'staggered20' });
const instant18 = await runLongTrail(browser, { pace: 'instant', size: 18, tag: 'instant18' });
const instant20 = await runLongTrail(browser, { pace: 'instant', size: 20, tag: 'instant20' });
const rugMid = await runRugMidLongInstant(browser);
const shortTrail = await runShortTrailRegression(browser);

console.log('=== FINAL SUMMARY ===');
console.log(JSON.stringify({ staggered18, staggered20, instant18, instant20, rugMid, shortTrail }, null, 2));

await browser.close();
console.log('DONE');
