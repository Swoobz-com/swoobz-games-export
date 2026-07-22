// a11ysweep0707-pickorder.mjs — instrument fillText to find the EXACT canvas
// pixel location of the pick-order numeral drawn in drawCoin (VaultGridCanvas.tsx
// ~L1436-1441), then live-sample contrast at that exact spot. Zero source edits
// (monkeypatch via evaluateOnNewDocument), per the assay/ABYSS canvas-instrumentation
// lesson: fillText coords are CANVAS-LOCAL CSS px (ctx.setTransform(dpr,...) already
// applied), so page coord = canvas.getBoundingClientRect().left/top + local x/y.
import puppeteer from 'puppeteer-core';
import { PNG } from 'pngjs';
import fs from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5390';
const OUTDIR = 'shots-a11ysweep-2026-07-07';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

function luminance([r, g, b]) { const a = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; }
function ratio(fg, bg) { const L1 = luminance(fg) + 0.05, L2 = luminance(bg) + 0.05; return L1 > L2 ? L1 / L2 : L2 / L1; }
function px(png, x, y) { const idx = (png.width * Math.min(Math.max(y, 0), png.height - 1) + Math.min(Math.max(x, 0), png.width - 1)) << 2; return [png.data[idx], png.data[idx + 1], png.data[idx + 2]]; }
function extremes(png) {
  let minL = Infinity, maxL = -Infinity, minC = null, maxC = null;
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) { const c = px(png, x, y); const l = luminance(c); if (l < minL) { minL = l; minC = c; } if (l > maxL) { maxL = l; maxC = c; } }
  return { minC, maxC, minL, maxL };
}
async function shot(page, clip) { if (clip.width < 1 || clip.height < 1) return null; const buf = await page.screenshot({ clip }); return PNG.sync.read(Buffer.from(buf)); }

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    const norm = (e) => e.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
    return els.find(e => e.offsetParent !== null && !e.disabled && norm(e) === t.toLowerCase())
      || els.find(e => e.offsetParent !== null && !e.disabled && norm(e).includes(t.toLowerCase()));
  }, t);
  const el = h.asElement(); if (!el) return false; await el.click(); return true;
}

async function instrumentPage(browser) {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    localStorage.clear(); sessionStorage.clear();
    window.__fillTextLog = [];
    const orig = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      try {
        if (/^\d{1,3}$/.test(String(text))) {
          const style = this.fillStyle;
          window.__fillTextLog.push({ text: String(text), x, y, style: String(style), font: String(this.font), t: performance.now() });
          if (window.__fillTextLog.length > 500) window.__fillTextLog.shift();
        }
      } catch (e) { /* ignore */ }
      return orig.apply(this, arguments);
    };
  });
  return page;
}

async function tileClickCoord(page, idx, g) {
  return page.evaluate(({ idx, g }) => {
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

const worlds = ['bluechips', 'altseason', 'shitcoin'];
const results = {};

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  for (const world of worlds) {
    const page = await instrumentPage(browser);
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 3 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
    await wait(1200);
    await page.evaluate((s) => { const el = document.querySelector(`[data-testid="vault-world-card-${s}"]`); if (el) el.click(); }, world);
    await wait(300);
    await clickText(page, 'send it');
    await wait(700);
    const g = world === 'shitcoin' ? 7 : 5;
    // reveal several tiles so we get multiple numerals (1,2,3...) to sample,
    // in case one lands on a mine early (stop once settled).
    const revealed = [];
    for (let i = 0; i < g * g && revealed.length < 4; i++) {
      const settled = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settledpanel"]'));
      if (settled) break;
      const c = await tileClickCoord(page, i, g);
      if (!c) break;
      await page.mouse.click(c.cx, c.cy);
      await wait(650); // let the reveal animation ease fully (eased -> 1)
      revealed.push(i);
    }
    const canvasRect = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left: r.left, top: r.top }; });
    const log = await page.evaluate(() => window.__fillTextLog || []);
    // filter to entries whose fillStyle matches the pick-order rgba(255,255,255,alpha) pattern
    const candidates = log.filter(e => /^rgba\(255,\s*255,\s*255,/.test(e.style));
    // de-dup by (text,x,y) keeping the LAST logged instance (closest to fully-eased alpha)
    const seen = new Map();
    for (const e of candidates) seen.set(`${e.text}@${Math.round(e.x)},${Math.round(e.y)}`, e);
    const uniq = [...seen.values()];

    const samples = [];
    for (const e of uniq.slice(-6)) {
      const pageX = canvasRect.left + e.x;
      const pageY = canvasRect.top + e.y;
      // textAlign 'center' + textBaseline 'middle' -> (x,y) IS the glyph's own
      // visual center already, no offset needed. Parse the actual font px
      // logged (e.g. "700 15.2px ..."), size a TIGHT symmetric box around it
      // (glyph height + text-length aware width) so we never spill into the
      // inter-tile gap or the coin's brighter dome — a wide/offset crop was
      // the bug in the first pass (inflated false-high ratios on 2 of 3 worlds).
      const m = /([\d.]+)px/.exec(e.font);
      const fontPx = m ? parseFloat(m[1]) : 12;
      const halfW = Math.max(6, fontPx * 0.55 * e.text.length);
      const halfH = Math.max(6, fontPx * 0.62);
      const clip = { x: Math.max(0, pageX - halfW), y: Math.max(0, pageY - halfH), width: halfW * 2, height: halfH * 2 };
      const png = await shot(page, clip);
      if (!png) continue;
      const { minC, maxC } = extremes(png);
      samples.push({ text: e.text, style: e.style, font: e.font, fontPx, pageX, pageY, clip, ratio: +ratio(maxC, minC).toFixed(2), fg: maxC, bg: minC });
    }
    await page.screenshot({ path: `${OUTDIR}/pickorder-${world}-fullboard.png` });
    // save a wide (visual sanity) crop AND the exact tight measurement clip per sample
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const wide = { x: Math.max(0, s.pageX - 20), y: Math.max(0, s.pageY - 20), width: 40, height: 40 };
      const bufWide = await page.screenshot({ clip: wide });
      fs.writeFileSync(`${OUTDIR}/pickorder-${world}-${s.text}-wide.png`, bufWide);
      const bufTight = await page.screenshot({ clip: s.clip });
      fs.writeFileSync(`${OUTDIR}/pickorder-${world}-${s.text}-tight.png`, bufTight);
    }
    results[world] = { revealedCount: revealed.length, totalFillTextLogged: log.length, candidateCount: candidates.length, samples };
    console.log(world, JSON.stringify(results[world], null, 2));
    await page.close();
  }
  fs.writeFileSync(`${OUTDIR}/pickorder-results.json`, JSON.stringify(results, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
