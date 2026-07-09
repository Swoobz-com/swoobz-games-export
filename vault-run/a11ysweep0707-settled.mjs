// a11ysweep0707-settled.mjs — reliable (polling + retry) reach of SETTLED
// WIN and SETTLED LOSS per world, live contrast of the HUD-ZONE settled
// banner (hero multiplier / outcome kicker / delta) which re-tints to
// T.accent/T.danger over the SETTLED_BANNER_FILL gradient.
import puppeteer from 'puppeteer-core';
import { PNG } from 'pngjs';
import fs from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUTDIR = 'shots-a11ysweep-2026-07-07';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function luminance([r, g, b]) { const a = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; }
function ratio(fg, bg) { const L1 = luminance(fg) + 0.05, L2 = luminance(bg) + 0.05; return L1 > L2 ? L1 / L2 : L2 / L1; }
function px(png, x, y) { const idx = (png.width * Math.min(Math.max(y, 0), png.height - 1) + Math.min(Math.max(x, 0), png.width - 1)) << 2; return [png.data[idx], png.data[idx + 1], png.data[idx + 2]]; }
function extremes(png) { let minL = Infinity, maxL = -Infinity, minC = null, maxC = null; for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) { const c = px(png, x, y); const l = luminance(c); if (l < minL) { minL = l; minC = c; } if (l > maxL) { maxL = l; maxC = c; } } return { minC, maxC }; }
async function shot(page, clip) { if (clip.width < 1 || clip.height < 1) return null; const buf = await page.screenshot({ clip }); return PNG.sync.read(Buffer.from(buf)); }
function rectClip(r, pad = 1) { return { x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad), width: Math.max(1, r.width + pad * 2), height: Math.max(1, r.height + pad * 2) }; }
async function sample(page, rect, pad = 1) { if (!rect) return null; const png = await shot(page, rectClip(rect, pad)); if (!png) return null; const { minC, maxC } = extremes(png); return { fg: maxC, bg: minC, ratio: +ratio(maxC, minC).toFixed(2) }; }

async function status(page) {
  return page.evaluate(() => ({
    playing: !!document.querySelector('[data-testid="vault-ctl-wager-locked"]'),
    body: (document.body.innerText || '').slice(0, 120),
  }));
}
async function settledRects(page) {
  return page.evaluate(() => {
    const hud = document.querySelector('[data-testid="DesktopHudRow"]');
    if (!hud) return null;
    const spans = [...hud.querySelectorAll('span')];
    const r = (el) => el ? (() => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; })() : null;
    return {
      heroMult: r(document.querySelector('[data-testid="vault-hud-pump-value"]')),
      kicker: r(spans.find(s => /SECURED THE BAG|RUGGED/i.test(s.textContent))),
      delta: r(spans.find(s => /^[+-][\d.]+\s*USDC/.test(s.textContent.trim()))),
    };
  });
}
async function tileC(page, idx, g) {
  return page.evaluate(({ idx, g }) => {
    const cv = document.querySelector('canvas'); const r = cv.getBoundingClientRect();
    const W = r.width, H = r.height; const tR = H * 0.15, bR = H * 0.18, sF = 0.08;
    const sW = W * (1 - sF * 2), sH = (H - tR - bR) * 0.96; const av = Math.min(sW, sH);
    const gap = Math.max(6, av * 0.026); const tile = (av - gap * (g - 1)) / g; const full = tile * g + gap * (g - 1);
    const x0 = (W - full) / 2; const by = tR + (H - tR - bR) / 2; const y0 = by - full / 2;
    const col = idx % g, row = Math.floor(idx / g);
    return { cx: r.left + x0 + col * (tile + gap) + tile / 2, cy: r.top + y0 + row * (tile + gap) + tile / 2 };
  }, { idx, g });
}
async function freshPlaying(browser, world) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 3 });
  await page.evaluateOnNewDocument(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto('http://localhost:5390/', { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1000);
  await page.evaluate((s) => { document.querySelector(`[data-testid="vault-world-card-${s}"]`).click(); }, world);
  await wait(300);
  await page.evaluate(() => { [...document.querySelectorAll('button')].find(b => /send it/i.test(b.textContent)).click(); });
  let s = await status(page);
  for (let i = 0; i < 10 && !s.playing; i++) { await wait(200); s = await status(page); }
  return page;
}

const worlds = ['bluechips', 'altseason', 'shitcoin'];
const results = {};

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  for (const world of worlds) {
    const g = world === 'shitcoin' ? 7 : 5;
    const wres = {};
    // ---- WIN: reveal 1 tile then Enter/click TAKE PROFIT ----
    for (let attempt = 1; attempt <= 6 && !wres.win; attempt++) {
      const page = await freshPlaying(browser, world);
      const c = await tileC(page, attempt, g);
      await page.mouse.click(c.cx, c.cy);
      let s = await status(page);
      for (let i = 0; i < 10; i++) { await wait(200); s = await status(page); if (!s.playing) break; }
      if (s.playing) {
        await page.evaluate(() => { [...document.querySelectorAll('button')].find(b => /take profit/i.test(b.textContent))?.click(); });
        for (let i = 0; i < 10; i++) { await wait(200); if (/SETTLED . WIN/i.test((await status(page)).body)) break; }
        const finalBody = (await status(page)).body;
        if (/SETTLED . WIN/i.test(finalBody)) {
          const rects = await settledRects(page);
          wres.win = { heroMult: await sample(page, rects?.heroMult), kicker: await sample(page, rects?.kicker), delta: await sample(page, rects?.delta) };
          await page.screenshot({ path: `${OUTDIR}/settled-${world}-WIN.png` });
        }
      }
      await page.close();
    }
    // ---- LOSS: click tiles until BUST ----
    for (let attempt = 1; attempt <= 3 && !wres.loss; attempt++) {
      const page = await freshPlaying(browser, world);
      let bodyText = '';
      for (let i = 0; i < g * g; i++) {
        const c = await tileC(page, i, g);
        await page.mouse.click(c.cx, c.cy);
        await wait(250);
        bodyText = (await status(page)).body;
        if (/SETTLED . LOSS/i.test(bodyText)) break;
      }
      for (let i = 0; i < 6 && !/SETTLED . LOSS/i.test(bodyText); i++) { await wait(200); bodyText = (await status(page)).body; }
      if (/SETTLED . LOSS/i.test(bodyText)) {
        const rects = await settledRects(page);
        wres.loss = { heroMult: await sample(page, rects?.heroMult), kicker: await sample(page, rects?.kicker), delta: await sample(page, rects?.delta) };
        await page.screenshot({ path: `${OUTDIR}/settled-${world}-LOSS.png` });
      }
      await page.close();
    }
    results[world] = wres;
    console.log(world, JSON.stringify(wres, null, 2));
  }
  fs.writeFileSync(`${OUTDIR}/settled-results.json`, JSON.stringify(results, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
