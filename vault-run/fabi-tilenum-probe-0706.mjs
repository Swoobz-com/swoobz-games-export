import puppeteer from 'puppeteer-core';
import { PNG } from 'pngjs';
import fs from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = process.argv[2] || '6612';
const OUTDIR = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad';
const DPR = 3;

function luminance([r, g, b]) {
  const a = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
function ratio(fg, bg) { const L1 = luminance(fg) + 0.05, L2 = luminance(bg) + 0.05; return L1 > L2 ? L1 / L2 : L2 / L1; }
function px(png, x, y) { const idx = (png.width * Math.min(Math.max(y, 0), png.height - 1) + Math.min(Math.max(x, 0), png.width - 1)) << 2; return [png.data[idx], png.data[idx + 1], png.data[idx + 2]]; }
function extremes(png) {
  let minL = Infinity, maxL = -Infinity, minC = null, maxC = null;
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    const c = px(png, x, y); const l = luminance(c);
    if (l < minL) { minL = l; minC = c; } if (l > maxL) { maxL = l; maxC = c; }
  }
  return { minC, maxC, minL, maxL };
}
async function shot(page, clip) { const buf = await page.screenshot({ clip }); return PNG.sync.read(Buffer.from(buf)); }
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    return els.find(e => e.offsetParent !== null && !e.disabled && norm(e) === t.toLowerCase())
      || els.find(e => e.offsetParent !== null && !e.disabled && norm(e).includes(t.toLowerCase()));
  }, t);
  const el = h.asElement(); if (!el) return false; await el.click(); return true;
}
async function cc(page, idx, g) {
  return await page.evaluate(({ idx, g }) => {
    const c = document.querySelector('canvas'); if (!c) return null;
    const r = c.getBoundingClientRect(); const W = r.width, H = r.height;
    const tR = H * 0.15, bR = H * 0.18, sF = 0.08;
    const sW = W * (1 - sF * 2); const sH = (H - tR - bR) * 0.96;
    const av = Math.min(sW, sH); const gap = Math.max(6, av * 0.026);
    const tile = (av - gap * (g - 1)) / g; const full = tile * g + gap * (g - 1);
    const x0 = (W - full) / 2; const by = tR + (H - tR - bR) / 2; const y0 = by - full / 2;
    const col = idx % g, row = Math.floor(idx / g);
    return { cx: r.left + x0 + col * (tile + gap) + tile / 2, cy: r.top + y0 + row * (tile + gap) + tile / 2, tileSize: tile };
  }, { idx, g });
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: DPR });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1200);
  await page.evaluate(() => { const el = document.querySelector('[data-testid="vault-world-card-bluechips"]'); if (el) el.click(); });
  await wait(300);
  await clickText(page, 'send it');
  await wait(700);
  const first = await cc(page, 0, 5);
  await page.mouse.move(first.cx, first.cy);
  await page.mouse.down(); await wait(30);
  const c1 = await cc(page, 1, 5); await page.mouse.move(c1.cx, c1.cy, { steps: 3 }); await wait(10);
  await page.mouse.up(); await wait(400);
  await clickText(page, 'instant'); await wait(150);
  await clickText(page, 'GO');
  for (let i = 0; i < 100; i++) {
    await wait(60);
    const isSettled = await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'));
    if (isSettled) break;
    const running = await page.evaluate(() => [...document.querySelectorAll('button')].some(b => b.offsetParent !== null && b.textContent.trim() === 'STOP ⚡'));
    if (!running) { const tp = await clickText(page, 'take profit'); if (tp) await wait(700); }
  }
  await wait(500);
  const tile0 = await cc(page, 0, 5);
  console.log('tile', tile0);
  // Full-tile crop for visual inspection
  const r = tile0.tileSize / 2;
  const fullClip = { x: tile0.cx - r, y: tile0.cy - r, width: r * 2, height: r * 2 };
  const fullPng = await shot(page, fullClip);
  fs.writeFileSync(`${OUTDIR}/tile0-fullcrop.png`, PNG.sync.write(fullPng));
  // Sample a horizontal strip at cy + size*0.3 (the number's baseline per drawCoin code)
  const numY = tile0.cy + tile0.tileSize * 0.3;
  const stripClip = { x: tile0.cx - 14, y: numY - 8, width: 28, height: 16 };
  const stripPng = await shot(page, stripClip);
  fs.writeFileSync(`${OUTDIR}/tile0-numstrip.png`, PNG.sync.write(stripPng));
  const { minC, maxC } = extremes(stripPng);
  console.log('numstrip extremes', { minC, maxC, ratio: +ratio(maxC, minC).toFixed(2) });
  await browser.close();
})();
