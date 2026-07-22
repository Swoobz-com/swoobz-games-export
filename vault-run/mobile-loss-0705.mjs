import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return (els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase())));
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
async function phaseTestid(page) {
  return page.evaluate(() => {
    if (document.querySelector('[data-testid="vault-settled-banner"]')) return 'settled';
    const body = document.body.innerText.toLowerCase();
    if (body.includes('rugged')) return 'mine-hit-or-settling';
    return 'unknown';
  });
}
async function tileCenter(page, gridSize, minimalBands, col, row) {
  return page.evaluate((gridSize, minimalBands, col, row) => {
    const c = document.querySelector('canvas');
    const rect = c.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    const wide = W / H > 1.2;
    const topReserved = minimalBands ? H * 0.035 : H * (wide ? 0.12 : 0.15);
    const bottomReserved = minimalBands ? H * 0.035 : H * (wide ? 0.14 : 0.18);
    const sideFrac = minimalBands ? 0.04 : 0.08;
    const safeW = W * (1 - sideFrac * 2);
    const safeH = (H - topReserved - bottomReserved) * 0.96;
    const available = Math.min(safeW, safeH);
    const gap = Math.max(6, available * 0.026);
    const tile = (available - gap * (gridSize - 1)) / gridSize;
    const full = tile * gridSize + gap * (gridSize - 1);
    const x = (W - full) / 2;
    const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2;
    const y = bandCenterY - full / 2;
    const cx = rect.left + x + col * (tile + gap) + tile / 2;
    const cy = rect.top + y + row * (tile + gap) + tile / 2;
    return { cx, cy };
  }, gridSize, minimalBands, col, row);
}
async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--window-size=430,900'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:5567/', { waitUntil: 'networkidle2' });
  await wait(500);
  await clickText(page, 'ape in'); await wait(400);
  await clickText(page, 'SEND IT'); await wait(600);
  await clickText(page, 'MANUAL'); await wait(200);
  let hit = false;
  for (let row = 0; row < 5 && !hit; row++) {
    for (let col = 0; col < 5; col++) {
      const p = await tileCenter(page, 5, false, col, row);
      if (!p) continue;
      await page.touchscreen.tap(p.cx, p.cy);
      await wait(200);
      if ((await phaseTestid(page)) === 'mine-hit-or-settling') { hit = true; break; }
    }
  }
  for (let i = 0; i < 30; i++) {
    if ((await phaseTestid(page)) === 'settled') break;
    await wait(200);
  }
  const reached = (await phaseTestid(page)) === 'settled';
  await page.screenshot({ path: 'shots-fixpass-0705/m390/04-settled-loss-full.png' });
  console.log('mobile settled reached:', reached);
  await browser.close();
}
run();
