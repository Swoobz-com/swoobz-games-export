import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const W = 390, H = 844;
const PORT = process.argv[2] || '5183';
const OUTCOME = process.argv[3] || 'win';
const S = 'shots/iv-mobile-';

const browser = await puppeteer.launch({
  executablePath: EXE, headless: false,
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
async function settled() { return await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again')); }
async function getOutcomeLabel() { return await page.evaluate(() => { const p = document.querySelector('div[aria-live="polite"][aria-label]'); return p ? p.getAttribute('aria-label') : null; }); }
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
await playOneRound(OUTCOME === 'rug' ? 'win' : 'rug');
await wait(500);
let attempts = 0, matched = false, label = null;
while (!matched && attempts < 10) {
  attempts++;
  await playOneRound(OUTCOME);
  label = await getOutcomeLabel();
  const lower = (label || '').toLowerCase();
  matched = OUTCOME === 'rug' ? lower.startsWith('rugged') : lower.startsWith('took profit');
}
await wait(1500);
await page.screenshot({ path: S + `${OUTCOME}.png` });
const dom = await page.evaluate(() => {
  const panelEl = document.querySelector('div[aria-live="polite"][aria-label]');
  const kids = panelEl ? [...panelEl.children] : [];
  const order = kids.map(k => {
    const t = k.textContent;
    if (/^SESSION PULSE/.test(t) || /SESSION PULSE/.test(t)) return 'PULSE_OR_FILL';
    if (/^\s*[+-]?\d|pts ·|view receipt|verified|verifying/i.test(t)) return 'META';
    if (/NEXT BET/i.test(t)) return 'NEXT';
    if (/change mode/i.test(t)) return 'LINKS';
    if (/RESULT|Took profit|Rugged|USDC/i.test(t) && kids.indexOf(k) === 0) return 'RESULT';
    return t.slice(0, 30);
  });
  const svgCount = panelEl ? panelEl.querySelectorAll('svg').length : 0;
  const hasSessionTrend = panelEl ? /SESSION TREND/i.test(panelEl.textContent) : false;
  return { childCount: kids.length, order, svgCount, hasSessionTrend, isWideEval: window.innerWidth };
});
console.log('MOBILE-DOM', OUTCOME, JSON.stringify(dom, null, 1));
await browser.close();
console.log('DONE mobile', OUTCOME);
