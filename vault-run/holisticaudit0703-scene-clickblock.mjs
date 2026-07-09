import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5313';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return els.find((e) => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase())
      || els.find((e) => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', defaultViewport: { width: 1024, height: 768 } });
const page = await browser.newPage();
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
await wait(500);
await clickText(page, 'ape in');
await wait(400);
await clickText(page, 'send it'); // BLUECHIPS 5x5
await wait(900);

const data = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  const r = c.getBoundingClientRect();
  const W = r.width, H = r.height;
  const sideFrac = 0.08;
  const safeW = W * (1 - sideFrac * 2);
  const wide = W / H > 1.2;
  const topReserved = H * (wide ? 0.12 : 0.15);
  const bottomReserved = H * (wide ? 0.14 : 0.18);
  const safeH = (H - topReserved - bottomReserved) * 0.96;
  const available = Math.min(safeW, safeH);
  const gap = Math.max(6, available * 0.026);
  const gridSize = 5;
  const tile = (available - gap * (gridSize - 1)) / gridSize;
  const full = tile * gridSize + gap * (gridSize - 1);
  const x = (W - full) / 2;
  const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2;
  const y = bandCenterY - full / 2;
  // Tile (row 0, col 4 = last col) center, in PAGE coords
  const cx = r.left + x + 4 * (tile + gap) + tile / 2;
  const cy = r.top + y + 0 * (tile + gap) + tile / 2;
  const topEl = document.elementFromPoint(cx, cy);
  return {
    cx, cy,
    topElTag: topEl ? topEl.tagName : null,
    topElTestId: topEl ? topEl.getAttribute('data-testid') : null,
    topElClass: topEl ? topEl.className : null,
    isCanvas: topEl ? topEl.tagName === 'CANVAS' : null,
  };
});
console.log('elementFromPoint at tile(row0,col4) center:', JSON.stringify(data, null, 2));

// Try an actual click there and see if a tile reveal happened (SAFE LEFT count decrements) or nothing changed.
const before = await page.evaluate(() => document.body.textContent.match(/SAFE LEFT (\d+)/)?.[1]);
await page.mouse.click(data.cx, data.cy);
await wait(400);
const after = await page.evaluate(() => document.body.textContent.match(/SAFE LEFT (\d+)/)?.[1]);
console.log('SAFE LEFT before/after click on obscured tile:', before, after, before === after ? '=> CLICK DID NOT REACH CANVAS (blocked)' : '=> click reached canvas (tile revealed)');
await browser.close();
