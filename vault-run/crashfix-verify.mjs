// Verifies the L1134-1145 double-count crash fix (VaultExperience.tsx
// trailTargetBps preview). Reuses the tap-based paintTrail approach from
// indep-crash-confirm.mjs (drag-based paintTrail is unreliable per memory).
import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.argv[2] || '5182';
const S = 'shots/crashfix-';

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
  async function buttons() { return await page.evaluate(() => [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null).map(b => b.textContent.trim())); }
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
  async function setInstantPace() {
    const btns = await page.evaluate(() => [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null).map(b => ({ t: b.textContent.trim(), pressed: b.getAttribute('aria-pressed') })));
    const instant = btns.find(b => b.t.toLowerCase() === 'instant');
    if (instant && instant.pressed !== 'true') await clickText('instant');
  }
  async function paceState() {
    return await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null);
      const instant = btns.find(b => b.textContent.trim().toLowerCase() === 'instant');
      return instant ? instant.getAttribute('aria-pressed') : null;
    });
  }
  return { clickText, cc, snake, tapTrail, buttons, goAriaLabel, goSubText, settledLabel, settledPanelText, setInstantPace, paceState };
}

async function pollSettled(page, maxMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const el = await page.evaluate(() => {
      const e = document.querySelector('div[aria-live="polite"][aria-label]');
      return e ? e.getAttribute('aria-label') : null;
    });
    if (el) return el;
    await wait(200);
  }
  return null;
}

async function runLongTrailScenario(browser, { pace, size = 18, tag }) {
  const { page, consoleErrors } = await newPage(browser);
  const h = helpers(page);
  let attempt = 0;
  let settledLabelText = null;
  let goLabel = null;
  let blankScreen = false;
  while (attempt < 4 && !settledLabelText) {
    attempt++;
    // reset by reload if not first attempt (fresh round)
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
    console.log(`[${tag}] pace state:`, JSON.stringify(await h.paceState()));
    await h.clickText('TRAIL');
    await wait(300);
    await h.tapTrail(h.snake(size, 5), 5);
    goLabel = await h.goAriaLabel();
    console.log(`[${tag}] attempt ${attempt} GO aria-label:`, goLabel);
    if (!goLabel) { console.log(`[${tag}] GO button missing (no trail registered) — retrying`); continue; }
    await h.clickText('GO');
    console.log(`[${tag}] GO clicked, polling for settle...`);
    settledLabelText = await pollSettled(page, 15000);
    if (!settledLabelText) {
      // Check if the app went blank (Playing/action-bar unmounted with no settled panel either)
      const bodyLen = await page.evaluate(() => document.body.textContent.length);
      blankScreen = bodyLen < 200;
      console.log(`[${tag}] attempt ${attempt} did NOT settle within 15s. bodyTextLen=${bodyLen} blankScreen=${blankScreen}`);
    }
  }
  await page.screenshot({ path: `${S}${tag}-final.png`, fullPage: false });
  const result = {
    tag, pace, size, attempts: attempt, goLabel, settledLabelText, blankScreen,
    pageErrorCount: consoleErrors.filter(e => e.startsWith('pageerror:')).length,
    pageErrors: consoleErrors.filter(e => e.startsWith('pageerror:')),
  };
  console.log(`[${tag}] RESULT:`, JSON.stringify(result, null, 2));
  await page.close();
  return result;
}

async function runRugStopInstant(browser) {
  const { page, consoleErrors } = await newPage(browser);
  const h = helpers(page);
  let attempt = 0;
  let settledLabelText = null;
  let panelText = null;
  let revealedBeforeRug = null;
  const SIZE = 20;
  // Retry until we land a genuine MID-cascade rug (not tile-0), so we can
  // actually prove tiles beyond the rug stay sealed (memory: mine placement
  // is real crypto.getRandomValues randomness, a fixed sequence won't force
  // a specific outcome — retry-until-observed is the correct pattern here).
  while (attempt < 10 && (revealedBeforeRug === null || revealedBeforeRug < 3)) {
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
    if (!goLabel) { console.log('[rugstop] no trail registered, retrying'); continue; }
    await h.clickText('GO');
    settledLabelText = await pollSettled(page, 15000);
    if (!settledLabelText) { console.log(`[rugstop] attempt ${attempt} did NOT settle (crash?)`); continue; }
    panelText = await h.settledPanelText();
    const m = panelText ? panelText.match(/(\d+)\s+before the rug/i) : null;
    revealedBeforeRug = m ? parseInt(m[1], 10) : null;
    console.log(`[rugstop] attempt ${attempt} settledLabel:`, settledLabelText, 'revealedBeforeRug:', revealedBeforeRug);
  }
  await page.screenshot({ path: `${S}rugstop-instant-final.png` });
  const isRug = settledLabelText ? /rug/i.test(settledLabelText) : false;
  const result = {
    settledLabelText, panelText, isRug, revealedBeforeRug, trailSize: SIZE,
    sealedTilesBeyondRug: revealedBeforeRug !== null ? SIZE - revealedBeforeRug - 1 : null,
    pageErrorCount: consoleErrors.filter(e => e.startsWith('pageerror:')).length,
    attempts: attempt,
  };
  console.log('[rugstop] RESULT:', JSON.stringify(result, null, 2));
  await page.close();
  return result;
}

async function runShortTrailPreview(browser) {
  const { page, consoleErrors } = await newPage(browser);
  const h = helpers(page);
  await h.clickText('ape in');
  await wait(600);
  await h.clickText('send it');
  await wait(900);
  await h.clickText('TRAIL');
  await wait(300);
  const SIZE = 4; // short trail, no overlap with revealedTiles (fresh round)
  await h.tapTrail(h.snake(SIZE, 5), 5);
  const goLabel = await h.goAriaLabel();
  const subText = await h.goSubText();
  console.log('[shorttrail] GO aria-label:', goLabel);
  console.log('[shorttrail] GO sub text:', subText);
  await page.screenshot({ path: `${S}shorttrail-preview.png` });
  const result = {
    goLabel, subText,
    pageErrorCount: consoleErrors.filter(e => e.startsWith('pageerror:')).length,
  };
  console.log('[shorttrail] RESULT:', JSON.stringify(result, null, 2));
  await page.close();
  return result;
}

const browser = await puppeteer.launch({
  executablePath: EXE, headless: false,
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  args: [`--window-size=1460,1040`, '--autoplay-policy=no-user-gesture-required'],
});

const staggered = await runLongTrailScenario(browser, { pace: 'staggered', size: 18, tag: 'staggered18' });
const instant = await runLongTrailScenario(browser, { pace: 'instant', size: 18, tag: 'instant18' });
const rugstop = await runRugStopInstant(browser);
const shortTrail = await runShortTrailPreview(browser);

console.log('=== SUMMARY ===');
console.log(JSON.stringify({ staggered, instant, rugstop, shortTrail }, null, 2));

await browser.close();
console.log('DONE');
