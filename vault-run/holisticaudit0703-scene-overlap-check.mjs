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
async function overlapCheck(page, gridSize) {
  return await page.evaluate((gridSize) => {
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    const W = r.width, H = r.height;
    const wide = W / H > 1.2;
    const topReserved = H * (wide ? 0.12 : 0.15);
    const bottomReserved = H * (wide ? 0.14 : 0.18);
    const sideFrac = 0.08;
    const safeW = W * (1 - sideFrac * 2);
    const safeH = (H - topReserved - bottomReserved) * 0.96;
    const available = Math.min(safeW, safeH);
    const gap = Math.max(6, available * 0.026);
    const tile = (available - gap * (gridSize - 1)) / gridSize;
    const full = tile * gridSize + gap * (gridSize - 1);
    const x = (W - full) / 2;
    const gridRightCss = r.left + x + full;

    const actionsCard = document.querySelector('[data-testid="vault-playing-right"]');
    const cardRect = actionsCard ? actionsCard.getBoundingClientRect() : null;

    return {
      W, H,
      gridRightPageX: gridRightCss,
      cardLeftPageX: cardRect ? cardRect.left : null,
      overlapPx: cardRect ? gridRightCss - cardRect.left : null,
      cardRect: cardRect ? { top: cardRect.top, left: cardRect.left, right: cardRect.right, bottom: cardRect.bottom } : null,
    };
  }, gridSize);
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', defaultViewport: { width: 1024, height: 768 } });
const page = await browser.newPage();
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
await wait(500);
await clickText(page, 'ape in');
await wait(400);
await clickText(page, 'send it'); // BLUECHIPS default, 5x5
await wait(900);
const bluechips = await overlapCheck(page, 5);
console.log('BLUECHIPS (5x5) @1024x768:', JSON.stringify(bluechips, null, 2));
await page.screenshot({ path: 'shots-holisticaudit0703/scene/overlapcheck-bluechips-1024x768.png' });
await browser.close();
