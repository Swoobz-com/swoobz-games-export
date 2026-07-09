import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const W = parseInt(process.argv[2] || '1440'), H = parseInt(process.argv[3] || '900'), TAG = process.argv[4] || 'D1440';
const PORT = process.argv[5] || '5182';
const OUTCOME = process.argv[6] || 'win'; // 'win' or 'rug'
const S = 'shots/polish-';

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: false,
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
  args: [`--window-size=${W + 20},${H + 140}`, '--autoplay-policy=no-user-gesture-required'],
});
const page = (await browser.pages())[0];
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
await wait(1500);

async function clickText(t) {
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

async function cellCenter(idx, g) {
  return await page.evaluate(({ idx, g }) => {
    const c = document.querySelector('canvas');
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

async function settled() {
  return await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'));
}

async function getOutcomeLabel() {
  return await page.evaluate(() => {
    const p = document.querySelector('div[aria-live="polite"][aria-label]');
    return p ? p.getAttribute('aria-label') : null;
  });
}

async function playOneRound(forceOutcome) {
  const clickedApe = await clickText('ape in');
  if (!clickedApe) await clickText('bet again');
  await wait(700);
  await clickText('send it'); await wait(900);
  let settledNow = false;
  if (forceOutcome === 'rug') {
    // tap ALL tiles rapidly to maximize chance of hitting the mine
    for (let k = 0; k < 25 && !settledNow; k++) {
      const { cx, cy } = await cellCenter(k, 5);
      await page.mouse.click(cx, cy); await wait(150);
      settledNow = await settled();
    }
  } else {
    // tap a few safe-ish tiles then bank the win via take profit
    for (let k = 0; k < 3 && !settledNow; k++) {
      const { cx, cy } = await cellCenter([1, 6, 11][k], 5);
      await page.mouse.click(cx, cy); await wait(500);
      settledNow = await settled();
    }
    if (!settledNow) { await clickText('take profit'); await wait(900); settledNow = await settled(); }
  }
  await wait(400);
  return settledNow;
}

let attempts = 0;
let matched = false;
let label = null;
while (!matched && attempts < 8) {
  attempts++;
  await playOneRound(OUTCOME);
  label = await getOutcomeLabel();
  const lower = (label || '').toLowerCase();
  matched = OUTCOME === 'rug' ? lower.startsWith('rugged') : lower.startsWith('took profit');
  console.log('attempt', attempts, 'label', label, 'matched', matched);
}

// let verify state settle (matched ~1-1.5s post-settle) so the receipt toggle
// is present before measuring the meta-row -> pulse-module gap.
await wait(1800);

await page.screenshot({ path: S + `${TAG}-settled-${OUTCOME}.png` });

const layout = await page.evaluate(() => {
  const panelEl = document.querySelector('div[aria-live="polite"][aria-label]');
  const kids = panelEl ? [...panelEl.children] : [];
  const kidInfo = kids.map((k, i) => ({
    i, text: k.textContent.slice(0, 50),
    top: k.getBoundingClientRect().top, bottom: k.getBoundingClientRect().bottom,
    height: k.getBoundingClientRect().height,
  }));
  const metaIdx = kids.findIndex(k => /pts ·|view receipt|verified|verifying/i.test(k.textContent));
  const pulseIdx = kids.findIndex(k => /SESSION PULSE/i.test(k.textContent));
  const metaRect = metaIdx >= 0 ? kids[metaIdx].getBoundingClientRect() : null;
  const pulseRect = pulseIdx >= 0 ? kids[pulseIdx].getBoundingClientRect() : null;
  const panelRect = panelEl ? panelEl.getBoundingClientRect() : null;
  const lastRect = kids.length ? kids[kids.length - 1].getBoundingClientRect() : null;
  // all "bet again" buttons (near-board + sidebar), UNROUNDED height
  const betAgainBtns = [...document.querySelectorAll('button')]
    .filter(e => e.offsetParent !== null && e.textContent.trim().toLowerCase().includes('bet again'))
    .map(e => {
      const r = e.getBoundingClientRect();
      return { ariaLabel: e.getAttribute('aria-label'), height: r.height, top: r.top, bottom: r.bottom };
    });
  return {
    metaIdx, pulseIdx,
    metaBottom: metaRect ? metaRect.bottom : null,
    pulseTop: pulseRect ? pulseRect.top : null,
    gapMetaToPulse: metaRect && pulseRect ? (pulseRect.top - metaRect.bottom) : null,
    voidBelowLast: panelRect && lastRect ? (panelRect.bottom - lastRect.bottom) : null,
    panel: panelRect && { top: panelRect.top, bottom: panelRect.bottom, height: panelRect.height },
    kids: kidInfo,
    betAgainBtns,
  };
});
console.log('LAYOUT', TAG, OUTCOME, JSON.stringify(layout, null, 1));

await browser.close();
console.log('DONE', TAG, OUTCOME);
