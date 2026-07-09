import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.argv[2] || '5181';

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

const clickedApe = await clickText('ape in');
if (!clickedApe) await clickText('bet again');
await wait(700);
await clickText('send it'); await wait(900);
let settledNow = false;
for (let k = 0; k < 4 && !settledNow; k++) {
  const { cx, cy } = await cellCenter([1, 6, 11, 17, 22][k] || 2, 5);
  await page.mouse.click(cx, cy); await wait(500);
  settledNow = await settled();
}
if (!settledNow) { await clickText('take profit'); await wait(900); }
await wait(400);
console.log('settled before tap:', await settled());

// check touch-action CSS on the BET AGAIN button
const touchAction = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(
    e => e.offsetParent !== null && e.textContent.trim().toLowerCase().includes('bet again'),
  );
  return btn ? getComputedStyle(btn).touchAction : null;
});
console.log('BET AGAIN touch-action:', touchAction);

// get bet again center and TAP it via touchscreen (not click/mouse)
// scroll it into view first (a real mobile user would scroll to reach it)
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(
    e => e.offsetParent !== null && e.textContent.trim().toLowerCase().includes('bet again'),
  );
  btn && btn.scrollIntoView({ block: 'center' });
});
await wait(200);
const rect = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(
    e => e.offsetParent !== null && e.textContent.trim().toLowerCase().includes('bet again'),
  );
  const r = btn.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
console.log('tapping at', rect);
const t0 = Date.now();
await page.touchscreen.tap(rect.x, rect.y);
// poll for visible state change (settled panel gone / bet-again text gone / balance changed)
let changed = false;
for (let i = 0; i < 20; i++) {
  await wait(50);
  const stillSettled = await settled();
  if (!stillSettled) { changed = true; console.log('state changed after', Date.now() - t0, 'ms (settled panel gone)'); break; }
}
if (!changed) console.log('NO STATE CHANGE detected within 1000ms after touchscreen.tap on BET AGAIN');

// stepper touch test
const stepRect = await page.evaluate(() => {
  const b = document.querySelector('button[aria-label="Increase next bet"]');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
});
console.log('stepper rect (if still on settled panel, else null post-navigation):', stepRect);

await browser.close();
