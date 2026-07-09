// Zoomed follow-up: confirm/deny the in-canvas Hero-PnL readout (VaultGridCanvas
// drawHeroPnl, "RUGGED/BUST/-$ the floor dropped out") visually collides with the
// new DOM left-gutter RESULT card (SettledGutterCards) in the same top-left region.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5315';
const SHOTDIR = 'shots-holisticaudit0703/grind';
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
async function cc(page, idx, g) {
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
async function paintTrail(page, indices, g) {
  const first = await cc(page, indices[0], g);
  await page.mouse.move(first.cx, first.cy);
  await page.mouse.down();
  await wait(40);
  for (const idx of indices.slice(1)) {
    const c = await cc(page, idx, g);
    if (!c) continue;
    await page.mouse.move(c.cx, c.cy, { steps: 3 });
    await wait(10);
  }
  await page.mouse.up();
  await wait(300);
}
function snake(n, g = 5) {
  const out = [];
  for (let row = 0; row < g && out.length < n; row++) {
    const cols = row % 2 === 0 ? [0, 1, 2, 3, 4] : [4, 3, 2, 1, 0];
    for (const col of cols) { if (out.length >= n) break; out.push(row * g + col); }
  }
  return out;
}
async function settled(page) {
  return await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'));
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, defaultViewport: null, args: ['--window-size=1470,1040'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(800);
  await clickText(page, 'ape in');
  await wait(600);
  await clickText(page, 'send it');
  await wait(700);
  await clickText(page, 'TRAIL');
  await wait(250);
  const order = snake(20, 5);
  await paintTrail(page, order, 5);
  const ps = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter((e) => e.offsetParent !== null);
    const instant = btns.find((b) => b.textContent.trim().toLowerCase() === 'instant');
    return instant ? instant.getAttribute('aria-pressed') : null;
  });
  if (ps !== 'true') { await clickText(page, 'instant'); await wait(150); }
  await clickText(page, 'GO');
  for (let i = 0; i < 100; i++) { await wait(60); if (await settled(page)) break; }
  await wait(700);

  const bodyText = await page.evaluate(() => document.body.textContent.includes('BUST'));
  console.log('bodyHasBUST:', bodyText);

  // Full screenshot for record
  await page.screenshot({ path: `${SHOTDIR}/07-zoom-settled-full.png` });
  // Tight crop on the canvas top-left hero-readout vs gutter RESULT card overlap zone
  const canvasRect = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  });
  const resultRect = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-settled-result"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  });
  console.log('canvasRect:', JSON.stringify(canvasRect));
  console.log('resultRect (DOM gutter RESULT card):', JSON.stringify(resultRect));

  const clip = { x: Math.max(0, canvasRect.left - 10), y: Math.max(0, canvasRect.top - 5), width: 420, height: 260 };
  await page.screenshot({ path: `${SHOTDIR}/08-zoom-topleft-overlap.png`, clip });
  console.log('clip used:', JSON.stringify(clip));

  fs.writeFileSync('holisticaudit0703-grind-zoom-results.json', JSON.stringify({ canvasRect, resultRect, clip }, null, 2));
  console.log('DONE ZOOM');
} finally {
  await browser.close();
}
