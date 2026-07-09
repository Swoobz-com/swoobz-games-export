// a11ysweep0707-motion.mjs — prefers-reduced-motion verification via the
// synthetic-throwaway-DOM-node technique (avoids racing a live one-shot
// animation / unmounted-element gaps), PLUS a live canvas frame-diff check
// that the coin reveal actually collapses to a static render under reduced
// motion (not just that a CSS class exists).
import puppeteer from 'puppeteer-core';
import { PNG } from 'pngjs';
import fs from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUTDIR = 'shots-a11ysweep-2026-07-07';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function synthCheck(page, classNames) {
  return page.evaluate((names) => {
    const out = {};
    for (const cls of names) {
      const el = document.createElement('div');
      el.className = cls;
      document.body.appendChild(el);
      const cs = getComputedStyle(el);
      out[cls] = { animationName: cs.animationName, animationDuration: cs.animationDuration, transitionDuration: cs.transitionDuration };
      el.remove();
    }
    return out;
  }, classNames);
}

function pxDiffCount(a, b) {
  let n = 0;
  const len = Math.min(a.data.length, b.data.length);
  for (let i = 0; i < len; i += 4) {
    if (Math.abs(a.data[i] - b.data[i]) > 6 || Math.abs(a.data[i + 1] - b.data[i + 1]) > 6 || Math.abs(a.data[i + 2] - b.data[i + 2]) > 6) n++;
  }
  return n;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const CLASSES = ['vault-card-enter', 'vault-cashout-dramatic', 'vault-spinner', 'vault-world-card', 'vault-press', 'vault-receipt-toggle', 'vault-corner-btn'];
  const results = {};

  // ---- synthetic DOM node check, WITHOUT reduced motion (baseline) ----
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.evaluateOnNewDocument(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto('http://localhost:5390/', { waitUntil: 'networkidle2', timeout: 60000 });
    await wait(1000);
    results.baseline = await synthCheck(page, CLASSES);
    await page.close();
  }

  // ---- synthetic DOM node check, WITH reduced motion ----
  {
    const page = await browser.newPage();
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.setViewport({ width: 1440, height: 900 });
    await page.evaluateOnNewDocument(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto('http://localhost:5390/', { waitUntil: 'networkidle2', timeout: 60000 });
    await wait(1000);
    results.reduced = await synthCheck(page, CLASSES);
    await page.close();
  }

  // ---- Live canvas frame-diff: does the coin-reveal animation actually
  // collapse to near-static under reduced motion, vs clearly animating without it? ----
  async function revealFrameDiff(reduced) {
    const page = await browser.newPage();
    if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.evaluateOnNewDocument(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto('http://localhost:5390/', { waitUntil: 'networkidle2', timeout: 60000 });
    await wait(1000);
    await page.evaluate(() => { document.querySelector('[data-testid="vault-world-card-bluechips"]').click(); });
    await wait(300);
    await page.evaluate(() => { [...document.querySelectorAll('button')].find(b => /send it/i.test(b.textContent)).click(); });
    await wait(700);
    const rect = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
    const c = await page.evaluate(({ g }) => {
      const cv = document.querySelector('canvas'); const r = cv.getBoundingClientRect();
      const W = r.width, H = r.height;
      const tR = H * 0.15, bR = H * 0.18, sF = 0.08;
      const sW = W * (1 - sF * 2), sH = (H - tR - bR) * 0.96;
      const av = Math.min(sW, sH); const gap = Math.max(6, av * 0.026);
      const tile = (av - gap * 4) / g; const full = tile * g + gap * (g - 1);
      const x0 = (W - full) / 2; const by = tR + (H - tR - bR) / 2; const y0 = by - full / 2;
      return { cx: r.left + x0 + tile / 2, cy: r.top + y0 + tile / 2 };
    }, { g: 5 });
    await page.mouse.click(c.cx, c.cy);
    // capture frames at t=0(immediately after click),+80ms,+160ms,+320ms,+640ms over the board region
    const frames = [];
    const delays = [0, 80, 160, 320, 640];
    for (const d of delays) {
      if (d > 0) await wait(d - (delays[delays.indexOf(d) - 1] || 0));
      const buf = await page.screenshot({ clip: rect });
      frames.push(PNG.sync.read(Buffer.from(buf)));
    }
    const diffs = [];
    for (let i = 1; i < frames.length; i++) diffs.push(pxDiffCount(frames[i - 1], frames[i]));
    await page.close();
    return { delays, diffs, totalPixelsPerFrame: rect.width * rect.height };
  }

  results.revealAnimation = {
    withoutReducedMotion: await revealFrameDiff(false),
    withReducedMotion: await revealFrameDiff(true),
  };

  fs.writeFileSync(`${OUTDIR}/motion-results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
