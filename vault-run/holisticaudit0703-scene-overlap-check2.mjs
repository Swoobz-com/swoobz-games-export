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
async function clickTextWithin(page, selector, t) {
  const h = await page.evaluateHandle(({ selector, t }) => {
    const root = document.querySelector(selector);
    if (!root) return null;
    const els = [...root.querySelectorAll('button')];
    return els.find((e) => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase())
      || els.find((e) => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, { selector, t });
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
    // Which tile columns/rows fall under the card (row 0/1 top area)?
    const y = (topReserved + (H - topReserved - bottomReserved) / 2) - full / 2;
    const affectedCols = [];
    for (let col = 0; col < gridSize; col++) {
      const tileLeft = r.left + x + col * (tile + gap);
      const tileRight = tileLeft + tile;
      if (cardRect && tileRight > cardRect.left) affectedCols.push(col);
    }
    return {
      W, H, gridSize,
      gridRightPageX: gridRightCss,
      cardLeftPageX: cardRect ? cardRect.left : null,
      cardTop: cardRect ? cardRect.top : null,
      cardBottom: cardRect ? cardRect.bottom : null,
      overlapPx: cardRect ? gridRightCss - cardRect.left : null,
      tileSize: tile,
      affectedCols,
      gridTopY: r.top + y,
    };
  }, gridSize);
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', defaultViewport: { width: 1024, height: 768 } });
const page = await browser.newPage();
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
await wait(500);
await clickText(page, 'ape in');
await wait(400);
await clickTextWithin(page, '[data-testid="vault-betentry-world"]', 'SHITCOIN');
await wait(300);
await clickText(page, 'send it');
await wait(900);
const shitcoin = await overlapCheck(page, 7);
console.log('SHITCOIN (7x7) @1024x768:', JSON.stringify(shitcoin, null, 2));
await browser.close();
