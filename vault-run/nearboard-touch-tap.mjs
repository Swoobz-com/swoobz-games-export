import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.argv[2] || '5182';
const OUTCOME = process.argv[3] || 'rug';

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
async function panelAriaLabel() {
  return await page.evaluate(() => {
    const el = document.querySelector('div[aria-live="polite"][aria-label]');
    return el ? el.getAttribute('aria-label') : null;
  });
}

let attempts = 0, gotOutcome = false;
while (!gotOutcome && attempts < 8) {
  attempts++;
  const clickedApe = await clickText('ape in');
  if (!clickedApe) await clickText('bet again');
  await wait(700);
  await clickText('send it'); await wait(900);
  let settledNow = false;
  if (OUTCOME === 'rug') {
    for (let k = 0; k < 25 && !settledNow; k++) {
      const { cx, cy } = await cellCenter(k, 5);
      await page.mouse.click(cx, cy); await wait(150);
      settledNow = await settled();
    }
  } else {
    for (let k = 0; k < 4 && !settledNow; k++) {
      const { cx, cy } = await cellCenter([1, 6, 11, 17, 22][k] || 2, 5);
      await page.mouse.click(cx, cy); await wait(500);
      settledNow = await settled();
    }
    if (!settledNow) { await clickText('take profit'); await wait(900); settledNow = await settled(); }
  }
  await wait(400);
  const label = await panelAriaLabel();
  gotOutcome = OUTCOME === 'rug'
    ? !!(label && label.toLowerCase().startsWith('rugged'))
    : !!(label && label.toLowerCase().startsWith('took profit'));
  console.log('attempt', attempts, 'settled', settledNow, 'label', label, 'gotOutcome', gotOutcome);
}

// wait past the misclick-guard delay (240ms) well past
await wait(2600);

const touchAction = await page.evaluate(() => {
  const w = document.querySelector('[data-testid="vault-board-rebet"]');
  const b = w ? w.querySelector('button') : null;
  return b ? getComputedStyle(b).touchAction : null;
});
console.log('NEAR-BOARD touch-action:', touchAction);

const rect = await page.evaluate(() => {
  const w = document.querySelector('[data-testid="vault-board-rebet"]');
  const b = w ? w.querySelector('button') : null;
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top, bottom: r.bottom, w: r.width, h: r.height };
});
console.log('near-board rect for tap:', rect);

if (rect) {
  const t0 = Date.now();
  await page.touchscreen.tap(rect.x, rect.y);
  let changed = false;
  for (let i = 0; i < 20; i++) {
    await wait(50);
    const stillSettled = await settled();
    const hasSendIt = await page.evaluate(() => document.body.textContent.toLowerCase().includes('send it'));
    if (!stillSettled || hasSendIt) { changed = true; console.log('STATE CHANGED after touchscreen.tap in', Date.now() - t0, 'ms — stillSettled:', stillSettled, 'hasSendIt:', hasSendIt); break; }
  }
  if (!changed) console.log('NO STATE CHANGE detected within 1000ms after touchscreen.tap on NEAR-BOARD BET AGAIN — FAIL');
} else {
  console.log('NEAR-BOARD BUTTON NOT FOUND — FAIL');
}

await browser.close();
