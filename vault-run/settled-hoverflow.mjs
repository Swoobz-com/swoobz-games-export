import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const W = parseInt(process.argv[2] || '390'), H = parseInt(process.argv[3] || '844'), TAG = process.argv[4] || 'M390';
const PORT = process.argv[5] || '5182';

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

await clickText('ape in'); await wait(700);
await clickText('send it'); await wait(900);
let settledNow = false;
for (let k = 0; k < 25 && !settledNow; k++) {
  const { cx, cy } = await cellCenter(k, 5);
  await page.mouse.click(cx, cy); await wait(150);
  settledNow = await settled();
}
await wait(500);

const overflow = await page.evaluate(() => ({
  docScrollWidth: document.documentElement.scrollWidth,
  bodyScrollWidth: document.body.scrollWidth,
  innerWidth: window.innerWidth,
  hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth || document.body.scrollWidth > window.innerWidth,
}));
console.log('SETTLED-OVERFLOW', TAG, JSON.stringify(overflow));
await browser.close();
