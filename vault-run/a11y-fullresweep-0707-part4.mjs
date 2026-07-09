// Part 4 — precise per-text-element contrast crops for the new mobile HUD
// band (FIX #2 collateral risk zone) and the rhythm badge (cross-check),
// tightly cropped to each individual <span> so the pixel analysis targets
// the SPECIFIC text run instead of a "farthest pixel in a big region"
// heuristic that gets fooled by a nearby high-contrast sibling.
import puppeteer from 'puppeteer-core';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import http from 'http';
import { PNG } from 'pngjs';

const PORT = 5287;
const URL = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad/a11y-fullresweep-0707';
fs.mkdirSync(OUT, { recursive: true });
const R = {};
const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function srgbToLin(c) { const cs = c / 255; return cs <= 0.04045 ? cs / 12.92 : ((cs + 0.055) / 1.055) ** 2.4; }
function relLum([r, g, b]) { return 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b); }
function contrast(a, b) { const L1 = relLum(a), L2 = relLum(b); const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1]; return (hi + 0.05) / (lo + 0.05); }
function waitForServer(url, timeoutMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(url, (res) => { res.resume(); resolve(true); });
      req.on('error', () => { if (Date.now() - start > timeoutMs) reject(new Error('server not up')); else setTimeout(tryOnce, 300); });
    };
    tryOnce();
  });
}
async function clickByText(page, re, root = 'body') {
  return page.evaluate((reSrc, rootSel) => {
    const root = document.querySelector(rootSel) || document.body;
    const re = new RegExp(reSrc[0], reSrc[1]);
    const btns = Array.from(root.querySelectorAll('button'));
    const b = btns.find((n) => re.test((n.textContent || '').trim()));
    if (b) { b.click(); return true; }
    return false;
  }, [re.source, re.flags], root);
}
function analyzeCrop(buf) {
  const png = PNG.sync.read(Buffer.isBuffer(buf) ? buf : Buffer.from(buf));
  const { width, height, data: px } = png;
  const pixels = [];
  for (let i = 0; i < width * height; i++) {
    const idx = i << 2;
    pixels.push([px[idx], px[idx + 1], px[idx + 2]]);
  }
  // background estimate = the MODE color (most frequent, quantized) since
  // text occupies a small minority of pixels in a tight single-line crop.
  const counts = new Map();
  for (const p of pixels) {
    const key = `${p[0] >> 3},${p[1] >> 3},${p[2] >> 3}`; // quantize to reduce AA noise
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  let bestKey = null, bestCount = -1;
  for (const [k, c] of counts) if (c > bestCount) { bestCount = c; bestKey = k; }
  const bg = bestKey.split(',').map((v) => Number(v) * 8 + 4);
  let maxDist = -1, extreme = null;
  for (const p of pixels) {
    const d = Math.hypot(p[0] - bg[0], p[1] - bg[1], p[2] - bg[2]);
    if (d > maxDist) { maxDist = d; extreme = p; }
  }
  return { width, height, bg, extreme, maxDist, contrastExtremeVsBg: contrast(extreme, bg) };
}

async function main() {
  log('Spawning vite dev server on port', PORT);
  const devProc = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    cwd: 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/vault-run',
    shell: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let browser;
  try {
    await waitForServer(URL, 30000);
    browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
    const devices = [
      { name: 'Pixel7', width: 412, height: 915 },
      { name: 'iPhone14Pro', width: 393, height: 852 },
    ];
    R.mobile = {};
    for (const dev of devices) {
      R.mobile[dev.name] = {};
      const page = await browser.newPage();
      await page.setViewport({ width: dev.width, height: dev.height, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
      await page.goto(URL, { waitUntil: 'networkidle0' });
      await sleep(700);
      await clickByText(page, /SEND IT/i, '[data-testid="bet-console"]');
      await sleep(900);

      // Precise element rects for the 3 text runs inside the playing HUD band
      const rects = await page.evaluate(() => {
        const band = document.querySelector('[data-testid="vault-grid-hud-inner"]');
        if (!band) return null;
        const mult = document.querySelector('[data-testid="vault-hud-pump-value"]');
        const spans = Array.from(band.querySelectorAll('span'));
        // kicker = smallest font-size span with uppercase text (PUMP)
        const kicker = spans.find((s) => /^PUMP$/i.test((s.textContent || '').trim()));
        const bagText = spans.find((s) => /^BAG/i.test((s.textContent || '').trim()));
        const rightCaption = spans.find((s) => /RUG RISK/i.test(s.textContent || ''));
        const rectOf = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
        return { mult: rectOf(mult), kicker: rectOf(kicker), bagText: rectOf(bagText), rightCaption: rectOf(rightCaption) };
      });
      R.mobile[dev.name].playingBluechipsRects = rects;
      log(`[M-${dev.name}] playing HUD text rects (bluechips):`, JSON.stringify(rects));

      const crops = {};
      for (const [key, r] of Object.entries(rects || {})) {
        if (!r || r.w <= 0 || r.h <= 0) continue;
        const buf = await page.screenshot({ clip: { x: Math.max(0, r.x - 2), y: Math.max(0, r.y - 2), width: r.w + 4, height: r.h + 4 } });
        fs.writeFileSync(`${OUT}/mobile-${dev.name}-hudtext-${key}-bluechips.png`, buf);
        try { crops[key] = analyzeCrop(buf); } catch (e) { crops[key] = { error: e.message }; }
      }
      R.mobile[dev.name].playingBluechipsCropAnalysis = crops;
      log(`[M-${dev.name}] playing HUD text contrast (bluechips):`, JSON.stringify(crops));

      // Switch to SHITCOIN (narrower board width -> worst-case for the kicker text)
      await page.goto(URL, { waitUntil: 'networkidle0' });
      await sleep(700);
      await clickByText(page, /shitcoin/i);
      await sleep(300);
      await clickByText(page, /SEND IT/i, '[data-testid="bet-console"]');
      await sleep(900);
      const rectsSC = await page.evaluate(() => {
        const band = document.querySelector('[data-testid="vault-grid-hud-inner"]');
        if (!band) return null;
        const mult = document.querySelector('[data-testid="vault-hud-pump-value"]');
        const spans = Array.from(band.querySelectorAll('span'));
        const kicker = spans.find((s) => /^PUMP$/i.test((s.textContent || '').trim()));
        const rightCaption = spans.find((s) => /RUG RISK/i.test(s.textContent || ''));
        const rectOf = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
        return { mult: rectOf(mult), kicker: rectOf(kicker), rightCaption: rectOf(rightCaption) };
      });
      R.mobile[dev.name].playingShitcoinRects = rectsSC;
      const cropsSC = {};
      for (const [key, r] of Object.entries(rectsSC || {})) {
        if (!r || r.w <= 0 || r.h <= 0) continue;
        const buf = await page.screenshot({ clip: { x: Math.max(0, r.x - 2), y: Math.max(0, r.y - 2), width: r.w + 4, height: r.h + 4 } });
        fs.writeFileSync(`${OUT}/mobile-${dev.name}-hudtext-${key}-shitcoin.png`, buf);
        try { cropsSC[key] = analyzeCrop(buf); } catch (e) { cropsSC[key] = { error: e.message }; }
      }
      R.mobile[dev.name].playingShitcoinCropAnalysis = cropsSC;
      log(`[M-${dev.name}] playing HUD text contrast (shitcoin):`, JSON.stringify(cropsSC));

      // ---- settled banner text (win + loss), shitcoin world already active ----
      let settled = false;
      for (let t = 0; t < 12; t++) {
        const stillPlaying = await page.evaluate(() => document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('role') === 'grid');
        if (!stillPlaying) break;
        const box = await page.evaluate(() => { const cv = document.querySelector('[data-testid="vault-grid-canvas"]'); const r = cv.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
        const cols = 7, rows = 7;
        const col = t % cols, row = Math.floor(t / cols) % rows;
        await page.touchscreen.tap(box.x + box.w * ((col + 0.5) / cols), box.y + box.h * ((row + 0.5) / rows));
        await sleep(280);
      }
      const stillPlaying2 = await page.evaluate(() => document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('role') === 'grid');
      if (stillPlaying2) {
        const info = await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const b = btns.find((n) => /take profit/i.test(n.textContent || ''));
          if (!b) return null;
          b.scrollIntoView({ block: 'center' });
          const r = b.getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        });
        if (info) { await page.touchscreen.tap(info.x, info.y); }
      }
      for (let p = 0; p < 25; p++) {
        const txt = await page.evaluate(() => document.body.innerText);
        if (/SETTLED\s*[·.]\s*(WIN|LOSS)/i.test(txt)) { settled = true; break; }
        await sleep(250);
      }
      R.mobile[dev.name].reachedSettledForHudText = settled;
      const outcomeTxt = await page.evaluate(() => document.body.innerText.match(/SETTLED[^\n]*/)?.[0] || null);
      R.mobile[dev.name].outcomeText = outcomeTxt;
      log(`[M-${dev.name}] settled for HUD-text sample:`, settled, outcomeTxt);
      if (settled) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await sleep(150);
        const rectsSettled = await page.evaluate(() => {
          const band = document.querySelector('[data-testid="vault-settled-banner"]');
          if (!band) return null;
          const mult = document.querySelector('[data-testid="vault-hud-pump-value"]');
          const spans = Array.from(band.querySelectorAll('span'));
          const kicker = spans.find((s) => /SECURED|RUGGED/i.test((s.textContent || '').trim()));
          const rightAmt = spans[spans.length - 1];
          const rectOf = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
          return { mult: rectOf(mult), kicker: rectOf(kicker), rightAmt: rectOf(rightAmt) };
        });
        R.mobile[dev.name].settledRects = rectsSettled;
        const cropsSettled = {};
        for (const [key, r] of Object.entries(rectsSettled || {})) {
          if (!r || r.w <= 0 || r.h <= 0) continue;
          const buf = await page.screenshot({ clip: { x: Math.max(0, r.x - 2), y: Math.max(0, r.y - 2), width: r.w + 4, height: r.h + 4 } });
          fs.writeFileSync(`${OUT}/mobile-${dev.name}-hudtext-settled-${key}.png`, buf);
          try { cropsSettled[key] = analyzeCrop(buf); } catch (e) { cropsSettled[key] = { error: e.message }; }
        }
        R.mobile[dev.name].settledCropAnalysis = cropsSettled;
        log(`[M-${dev.name}] settled HUD text contrast:`, JSON.stringify(cropsSettled));
      }

      await page.close();
    }

    fs.writeFileSync(`${OUT}/results-part4.json`, JSON.stringify(R, null, 2));
    log('\n=== PART4 RESULTS WRITTEN ===');
  } finally {
    if (browser) await browser.close().catch(() => {});
    try { execSync(`taskkill /pid ${devProc.pid} /T /F`, { stdio: 'ignore' }); } catch (e) { log('taskkill warn:', e.message); }
  }
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
