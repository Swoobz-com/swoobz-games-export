import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const W = parseInt(process.argv[2] || '1440'), H = parseInt(process.argv[3] || '900'), TAG = process.argv[4] || 'D1440';
const PORT = process.argv[5] || '5183';
const OUTCOME = process.argv[6] || 'win'; // 'win' or 'rug'
const S = 'shots/iv-';

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
    for (let k = 0; k < 25 && !settledNow; k++) {
      const { cx, cy } = await cellCenter(k, 5);
      await page.mouse.click(cx, cy); await wait(150);
      settledNow = await settled();
    }
  } else {
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

// warm-up round so SessionTrendSpark's history.length>=2 guard is satisfied
await playOneRound(OUTCOME === 'rug' ? 'win' : 'rug');
await wait(600);

let attempts = 0, matched = false, label = null;
while (!matched && attempts < 12) {
  attempts++;
  await playOneRound(OUTCOME);
  label = await getOutcomeLabel();
  const lower = (label || '').toLowerCase();
  matched = OUTCOME === 'rug' ? lower.startsWith('rugged') : lower.startsWith('took profit');
}
if (!matched) { console.log('FAILED to reach outcome', OUTCOME, 'after', attempts, 'attempts, label=', label); }

await wait(1800);

const fullPath = S + `${TAG}-${OUTCOME}-full.png`;
await page.screenshot({ path: fullPath });

const measure = await page.evaluate(() => {
  const panelEl = document.querySelector('div[aria-live="polite"][aria-label]');
  const kids = panelEl ? [...panelEl.children] : [];
  const kidInfo = kids.map((k, i) => ({
    i, text: k.textContent.slice(0, 50),
    rect: (() => { const r = k.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height }; })(),
  }));
  const panelRect = panelEl ? panelEl.getBoundingClientRect() : null;

  // find SESSION TREND svg specifically
  const allSvgs = panelEl ? [...panelEl.querySelectorAll('svg')] : [];
  const trendHead = [...(panelEl ? panelEl.querySelectorAll('*') : [])].find(e => e.children.length === 0 && /SESSION TREND/i.test(e.textContent || ''));
  const trendModule = trendHead ? trendHead.closest('[aria-hidden="true"]') : null;
  const trendRect = trendModule ? (() => { const r = trendModule.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height }; })() : null;
  const polyline = trendModule ? trendModule.querySelector('polyline') : null;
  const polylineStroke = polyline ? getComputedStyle(polyline).stroke : null;
  const polylinePointsAttr = polyline ? polyline.getAttribute('points') : null;
  const svgWrapperRect = trendModule ? (() => { const svg = trendModule.querySelector('svg'); if(!svg) return null; const r = svg.getBoundingClientRect(); return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}; })() : null;

  // links footer row (change mode / share)
  const linksEl = [...kids].find(k => /change mode|share/i.test(k.textContent));
  const linksRect = linksEl ? (() => { const r = linksEl.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; })() : null;

  // settled panel computed style — flex, etc
  const panelComputed = panelEl ? (() => { const cs = getComputedStyle(panelEl); return { display: cs.display, flexGrow: cs.flexGrow, flexBasis: cs.flexBasis, flexDirection: cs.flexDirection }; })() : null;
  // find the settledPulseFill wrapper (direct child containing SESSION PULSE or SESSION TREND)
  const fillWrapper = kids.find(k => /SESSION PULSE|SESSION TREND/i.test(k.textContent));
  const fillWrapperComputed = fillWrapper ? (() => { const cs = getComputedStyle(fillWrapper); return { flexGrow: cs.flexGrow, marginTop: cs.marginTop }; })() : null;
  const fillWrapperRect = fillWrapper ? (() => { const r = fillWrapper.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; })() : null;

  const linksComputed = linksEl ? (() => { const cs = getComputedStyle(linksEl); return { marginTop: cs.marginTop, flexGrow: cs.flexGrow }; })() : null;

  const gapFillToLinks = fillWrapperRect && linksRect ? (linksRect.top - fillWrapperRect.bottom) : null;

  const lastRect = kids.length ? (() => { const r = kids[kids.length - 1].getBoundingClientRect(); return { bottom: r.bottom }; })() : null;
  const voidBelowLast = panelRect && lastRect ? (panelRect.bottom - lastRect.bottom) : null;

  return {
    panel: panelRect && { top: panelRect.top, bottom: panelRect.bottom, left: panelRect.left, right: panelRect.right, height: panelRect.height, width: panelRect.width },
    panelComputed,
    kids: kidInfo,
    hasSessionTrend: !!trendModule,
    svgCountInPanel: allSvgs.length,
    trendRect,
    svgWrapperRect,
    polylineStroke,
    polylinePointsAttr,
    fillWrapperComputed,
    fillWrapperRect,
    linksComputed,
    linksRect,
    gapFillToLinks,
    voidBelowLast,
  };
});
console.log('MEASURE', TAG, OUTCOME, JSON.stringify(measure, null, 1));

// crop sidebar region for pixel-based color verification
if (measure.panel) {
  const p = measure.panel;
  const clip = { x: Math.max(0, p.top >= 0 ? 0 : 0), y: 0, width: W, height: H }; // placeholder, real crop done via full page + panel rect below
}

await browser.close();
console.log('DONE', TAG, OUTCOME);
