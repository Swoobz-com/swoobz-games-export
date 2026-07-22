import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.argv[2] || '5181';

// Real touch-emulation context (isMobile/hasTouch) -- separate probe from the
// screenshot/layout captures per memory gotcha (DPR mismatch vs stored baselines
// only matters for pixel-diffing; here we WANT real touch dispatch).
const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: false,
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
  args: ['--window-size=410,984', '--autoplay-policy=no-user-gesture-required'],
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
async function settled() {
  return await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'));
}
async function balanceText() {
  return await page.evaluate(() => {
    const m = document.body.textContent.match(/BALANCE\s*[·:]?\s*([\d.,]+)\s*USDC/i);
    return m ? m[1] : null;
  });
}

// Reach settled (WIN via take-profit, fast + reliable).
await clickText('ape in'); await wait(700);
await clickText('send it'); await wait(900);
{
  const c = await cellCenter(12, 5);
  if (c) { await page.mouse.click(c.cx, c.cy); await wait(500); }
}
if (!(await settled())) { await clickText('take profit'); await wait(900); }
console.log('settled reached:', await settled());
const balBefore = await balanceText();
console.log('balance before tap:', balBefore);

// scrollIntoView guard, then real touchscreen.tap
const preTapCheck = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(
    e => e.offsetParent !== null && e.textContent.trim().toLowerCase().includes('bet again') && !e.textContent.toLowerCase().includes('same trail'),
  );
  if (!btn) return { found: false };
  btn.scrollIntoView({ block: 'center' });
  return { found: true };
});
console.log('scrollIntoView guard:', JSON.stringify(preTapCheck));
await wait(250);

const rect = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(
    e => e.offsetParent !== null && e.textContent.trim().toLowerCase().includes('bet again') && !e.textContent.toLowerCase().includes('same trail'),
  );
  if (!btn) return null;
  const r = btn.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top, bottom: r.bottom, viewportH: window.innerHeight };
});
console.log('BET AGAIN rect for tap (raw):', JSON.stringify(rect));
console.log('within viewport (0..H)?', rect && rect.top >= 0 && rect.bottom <= rect.viewportH);

const t0 = Date.now();
await page.touchscreen.tap(rect.x, rect.y);
let changed = false, changedAt = null;
for (let i = 0; i < 20; i++) {
  await wait(50);
  if (!(await settled())) { changed = true; changedAt = Date.now() - t0; break; }
}
console.log('handleBetAgain fired (settled panel gone) via touchscreen.tap:', changed, changed ? `after ${changedAt}ms` : '');
const balAfter = await balanceText();
console.log('balance after tap (should have moved by -1 wager if a new round started):', balAfter);

await browser.close();
console.log('DONE');
