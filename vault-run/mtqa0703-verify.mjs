import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.argv[2] || '5181';
const S = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/vault-run/shots/mtqa0703-';

const VIEWPORTS = [
  { w: 390, h: 844, tag: 'M390' },
  { w: 412, h: 915, tag: 'M412P7' },
  { w: 393, h: 852, tag: 'M393iP14' },
];

// Match existing repo drivers' launch config EXACTLY (deviceScaleFactor:1, no isMobile/hasTouch)
// for the screenshot/layout captures -- per memory gotcha, avoids DPR raster mismatch vs stored
// baselines. A SEPARATE real-touch probe below uses isMobile/hasTouch on its own page.
const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: false,
  protocolTimeout: 60000,
  args: ['--autoplay-policy=no-user-gesture-required'],
});

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return els.find(e => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase())
      || els.find(e => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, t);
  const el = h.asElement();
  if (!el) { console.log('NO BTN:', t); return false; }
  await el.click();
  return true;
}

async function cellCenter(page, idx, g) {
  return await page.evaluate(({ idx, g }) => {
    const c = document.querySelector('canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    const W = r.width, H = r.height;
    const tR = H * 0.15, bR = H * 0.18, sF = 0.08;
    const sW = W * (1 - sF * 2);
    const sH = (H - tR - bR) * 0.96;
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

async function settled(page) {
  return await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'));
}
async function isWin(page) {
  return await page.evaluate(() => {
    const el = document.querySelector('div[aria-live="polite"][aria-label]');
    const label = el ? el.getAttribute('aria-label') || '' : '';
    return /took profit/i.test(label);
  });
}
async function isRug(page) {
  return await page.evaluate(() => {
    const el = document.querySelector('div[aria-live="polite"][aria-label]');
    const label = el ? el.getAttribute('aria-label') || '' : '';
    return /rugged/i.test(label);
  });
}

async function startRound(page) {
  const clickedApe = await clickText(page, 'ape in');
  if (!clickedApe) await clickText(page, 'bet again');
  await wait(700);
  await clickText(page, 'send it');
  await wait(900);
}

async function playToWin(page) {
  // take profit immediately after 1 safe tile (or straight take-profit if available)
  await clickText(page, 'take profit');
  await wait(900);
}

async function playToRug(page, maxAttempts = 8) {
  // tap all 25 tiles rapidly to maximize mine-hit chance
  let settledNow = false;
  for (let k = 0; k < 25 && !settledNow; k++) {
    const c = await cellCenter(page, k, 5);
    if (!c) break;
    await page.mouse.click(c.cx, c.cy);
    await wait(140);
    settledNow = await settled(page);
  }
  if (!settledNow) { await clickText(page, 'take profit'); await wait(700); }
  await wait(500);
}

async function getSettledOutcome(page, wantWin) {
  let attempts = 0;
  while (attempts < 8) {
    attempts++;
    await startRound(page);
    if (wantWin) {
      // try 1-tap-then-take-profit first (fast path to WIN)
      const c = await cellCenter(page, 12, 5);
      if (c) { await page.mouse.click(c.cx, c.cy); await wait(500); }
      if (!(await settled(page))) { await playToWin(page); }
    } else {
      await playToRug(page);
    }
    await wait(500);
    const now = await settled(page);
    if (!now) continue;
    const win = await isWin(page);
    const rug = await isRug(page);
    if (wantWin && win) return { attempts, outcome: 'win' };
    if (!wantWin && rug) return { attempts, outcome: 'rug' };
    // wrong outcome landed -- go again via bet again
  }
  return { attempts, outcome: 'unresolved' };
}

async function measureTouchTargets(page) {
  return await page.evaluate(() => {
    const q = (sel) => document.querySelector(sel);
    const betAgainBtn = [...document.querySelectorAll('button')].find(
      e => e.offsetParent !== null && e.textContent.trim().toLowerCase().includes('bet again') && !e.textContent.toLowerCase().includes('same trail'),
    );
    const stepDec = q('button[aria-label="Decrease next bet"]');
    const stepInc = q('button[aria-label="Increase next bet"]');
    function raw(el) {
      if (!el) return null;
      const r = el.getBoundingClientRect(); // raw float, no rounding
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
    }
    function touchAction(el) { return el ? getComputedStyle(el).touchAction : null; }
    return {
      betAgain: raw(betAgainBtn),
      betAgainTouchAction: touchAction(betAgainBtn),
      betAgainDisabled: betAgainBtn ? betAgainBtn.disabled : null,
      stepDec: raw(stepDec),
      stepDecTouchAction: touchAction(stepDec),
      stepInc: raw(stepInc),
      stepIncTouchAction: touchAction(stepInc),
      viewportH: window.innerHeight,
      viewportW: window.innerWidth,
      scrollY: window.scrollY,
      docScrollHeight: document.documentElement.scrollHeight,
    };
  });
}

const results = {};

for (const vp of VIEWPORTS) {
  results[vp.tag] = {};
  const page = await browser.newPage();
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1200);

  // LOBBY
  await page.screenshot({ path: `${S}${vp.tag}-lobby.png` });
  console.log('shot', vp.tag, 'lobby');

  // BET-ENTRY
  await clickText(page, 'ape in');
  await wait(700);
  await page.screenshot({ path: `${S}${vp.tag}-betentry.png` });
  console.log('shot', vp.tag, 'betentry');

  // PLAYING
  await clickText(page, 'send it');
  await wait(900);
  await page.screenshot({ path: `${S}${vp.tag}-playing.png` });
  console.log('shot', vp.tag, 'playing');

  // Settle whatever's in flight (finish this round first so state is clean)
  {
    const c = await cellCenter(page, 2, 5);
    if (c) { await page.mouse.click(c.cx, c.cy); await wait(400); }
    if (!(await settled(page))) { await clickText(page, 'take profit'); await wait(800); }
  }

  // SETTLED - WIN (retry until win)
  const winRes = await getSettledOutcome(page, true);
  results[vp.tag].winAttempts = winRes.attempts;
  results[vp.tag].winOutcomeConfirmed = winRes.outcome === 'win';
  await wait(500);
  await page.screenshot({ path: `${S}${vp.tag}-settled-win.png` });
  const winTargets = await measureTouchTargets(page);
  results[vp.tag].winTargets = winTargets;
  console.log('shot', vp.tag, 'settled-win', 'attempts=', winRes.attempts, 'confirmed=', winRes.outcome);

  // SETTLED - RUG (retry until rug)
  const rugRes = await getSettledOutcome(page, false);
  results[vp.tag].rugAttempts = rugRes.attempts;
  results[vp.tag].rugOutcomeConfirmed = rugRes.outcome === 'rug';
  await wait(500);
  await page.screenshot({ path: `${S}${vp.tag}-settled-rug.png` });
  const rugTargets = await measureTouchTargets(page);
  results[vp.tag].rugTargets = rugTargets;
  console.log('shot', vp.tag, 'settled-rug', 'attempts=', rugRes.attempts, 'confirmed=', rugRes.outcome);

  await page.close();
}

console.log('RESULTS_JSON_START');
console.log(JSON.stringify(results, null, 2));
console.log('RESULTS_JSON_END');

await browser.close();
console.log('DONE');
