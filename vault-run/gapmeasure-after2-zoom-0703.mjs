// Tight zoomed crop around the board-panel-right-edge <-> BetEntry-card-left
// boundary, both desktop viewports, BLUECHIPS. Visual confirmation for the
// AFTER measurement (gapmeasure-after-0703.mjs) — dpr bumped to 3 on the
// crop region only, for pixel-level visual inspection of the tiny
// gapPanelToCard values (6.39px @1440, 1.27px @1920).
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5251';
const OUT = 'shots-gapmeasure-after2-0703';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickText(page, t) {
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

function panelGeometry(W, H, gridSize) {
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
  const px = x - pad;
  return { panelLocalRight: px + (full + pad * 2), pad, x, full };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  fs.mkdirSync(OUT, { recursive: true });
  for (const [w, h, tag] of [[1440, 900, '1440x900'], [1920, 1080, '1920x1080']]) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 3 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await wait(500);
    await clickText(page, 'ape in');
    await wait(700);

    const canvasRect = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      const r = c.getBoundingClientRect();
      return { top: r.top, left: r.left, width: r.width, height: r.height };
    });
    const right = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="vault-betentry-right"]');
      const r = el.getBoundingClientRect();
      return { top: r.top, left: r.left, right: r.right };
    });
    const geo = panelGeometry(canvasRect.width, canvasRect.height, 5);
    const panelRightViewport = canvasRect.left + geo.panelLocalRight;
    const midY = (canvasRect.top + canvasRect.top + canvasRect.height) / 2;

    const clip = {
      x: Math.max(0, panelRightViewport - 60),
      y: Math.max(0, midY - 120),
      width: Math.min(w - (panelRightViewport - 60), (right.left + 60) - (panelRightViewport - 60)),
      height: 240,
    };
    await page.screenshot({ path: `${OUT}/ZOOM-${tag}-panel-card-boundary.png`, clip });
    console.log(tag, JSON.stringify({ panelRightViewport, cardLeft: right.left, gap: right.left - panelRightViewport, clip }));
    await page.close();
  }
  await browser.close();
})();
