// Dedicated check: at 1024x768, does the shitcoin (7x7, largest grid) board's
// terminal panel (drawTerminalPanel) actually enclose the full tile grid, or
// does it visually "bleed" (tiles rendered outside the panel backing, direct
// on the scene backdrop)? Compares LIVE getBoundingClientRect-derived grid
// math (same formula as computeGridLayout) against actual pixel color
// sampled just outside the last row/col's tile edge.
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5313';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return (
      els.find((e) => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
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
    return (
      els.find((e) => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
  }, { selector, t });
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', defaultViewport: { width: 1024, height: 768 } });
try {
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in');
  await wait(400);
  await clickTextWithin(page, '[data-testid="vault-betentry-world"]', 'SHITCOIN');
  await wait(300);
  await clickText(page, 'send it');
  await wait(900);

  const data = await page.evaluate((gridSize) => {
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
    const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2;
    const y = bandCenterY - full / 2;
    const pad = Math.max(14, full * 0.045);
    const panel = { px: x - pad, py: y - pad, pw: full + pad * 2, ph: full + pad * 2 };

    // Sample canvas pixel colors (CSS coords -> canvas buffer coords via dpr)
    const dpr = c.width / W;
    function sample(cssX, cssY) {
      const bx = Math.min(c.width - 1, Math.max(0, Math.round(cssX * dpr)));
      const by = Math.min(c.height - 1, Math.max(0, Math.round(cssY * dpr)));
      const ctx = c.getContext('2d');
      const d = ctx.getImageData(bx, by, 1, 1).data;
      return [d[0], d[1], d[2], d[3]];
    }

    // Center of the panel (should be panel dark fill) vs a point WAY outside
    // panel bounds near the canvas edge (should be scene backdrop, brighter/
    // more colorful reddish tones per the screenshots).
    const panelCenter = sample(x + full / 2, y + full / 2);
    const panelJustInsideBottomRight = sample(panel.px + panel.pw - 3, panel.py + panel.ph - 3);
    const panelJustOutsideBottomRight = sample(panel.px + panel.pw + 6, panel.py + panel.ph + 6);
    const lastTileCenterRowCol = { row: gridSize - 1, col: gridSize - 1 };
    const lastTileX = x + lastTileCenterRowCol.col * (tile + gap) + tile / 2;
    const lastTileY = y + lastTileCenterRowCol.row * (tile + gap) + tile / 2;
    const lastTileSample = sample(lastTileX, lastTileY);
    const firstTileX = x + tile / 2;
    const firstTileY = y + tile / 2;
    const firstTileSample = sample(firstTileX, firstTileY);

    return {
      W, H, x, y, tile, gap, full, panel,
      canvasBufW: c.width, canvasBufH: c.height, dpr,
      panelCenter, panelJustInsideBottomRight, panelJustOutsideBottomRight,
      lastTileSample, firstTileSample,
      panelBottomRightWithinCanvas: panel.py + panel.ph <= H && panel.px + panel.pw <= W,
      gridBottomRightWithinCanvas: (y + full) <= H && (x + full) <= W,
      gridBottomRightWithinPanel: (y + full) <= (panel.py + panel.ph) && (x + full) <= (panel.px + panel.pw),
    };
  }, 7);

  console.log(JSON.stringify(data, null, 2));
  await page.screenshot({ path: 'shots-holisticaudit0703/scene/panelcheck-shitcoin-1024x768.png' });
} finally {
  await browser.close();
}
