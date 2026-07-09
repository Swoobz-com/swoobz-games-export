import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const W = parseInt(process.argv[2] || '375'), H = parseInt(process.argv[3] || '667'), TAG = process.argv[4] || 'M375';
const PORT = process.argv[5] || '5182';
const OUTCOME = process.argv[6] || 'win';

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
  if (!el) return false;
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

console.log('scrollY before any interaction:', await page.evaluate(() => window.scrollY));
await clickText('ape in'); await wait(700);
console.log('scrollY after ape-in:', await page.evaluate(() => window.scrollY));
await clickText('send it'); await wait(900);
console.log('scrollY after send-it:', await page.evaluate(() => window.scrollY));

let settledNow = false;
if (OUTCOME === 'win') {
  for (let k = 0; k < 1 && !settledNow; k++) {
    const { cx, cy } = await cellCenter(2, 5);
    await page.mouse.click(cx, cy); await wait(500);
    settledNow = await settled();
    console.log('scrollY after tile tap', k, ':', await page.evaluate(() => window.scrollY));
  }
  if (!settledNow) {
    await clickText('take profit'); await wait(900);
    console.log('scrollY after take-profit:', await page.evaluate(() => window.scrollY));
  }
} else {
  for (let k = 0; k < 25 && !settledNow; k++) {
    const { cx, cy } = await cellCenter(k, 5);
    await page.mouse.click(cx, cy); await wait(150);
    settledNow = await settled();
  }
  console.log('scrollY after rug tap sequence:', await page.evaluate(() => window.scrollY));
}
await wait(400);

const measure = await page.evaluate(() => {
  const nearWrap = document.querySelector('[data-testid="vault-board-rebet"]');
  const nearBtn = nearWrap ? nearWrap.querySelector('button') : null;
  const nearRect = nearBtn ? nearBtn.getBoundingClientRect() : null;
  return {
    scrollY: window.scrollY,
    viewportH: window.innerHeight,
    nearBoard: nearRect && { top: Math.round(nearRect.top), bottom: Math.round(nearRect.bottom) },
    nearVisibleWithoutScroll: nearRect ? (nearRect.top >= 0 && nearRect.bottom <= window.innerHeight) : null,
  };
});
console.log('FINAL', TAG, OUTCOME, JSON.stringify(measure));
await page.screenshot({ path: `shots/clean-${TAG}-${OUTCOME}.png` });
await browser.close();
