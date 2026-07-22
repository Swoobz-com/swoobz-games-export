// a11ysweep0707-mobile.mjs — mobile pass: Pixel 7 (412x915) + iPhone 14 Pro
// (393x852), bluechips world (representative). Contrast is NOT desktop-only
// per brief; hit-target sizing (WCAG 2.2 2.5.8, >=24x24 floor / 44x44 rec).
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
function rectClip(r, pad = 0) { return { x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad), width: Math.max(1, r.width + pad * 2), height: Math.max(1, r.height + pad * 2) }; }
async function sample(page, rect, pad = 2) { if (!rect) return null; const png = await shot(page, rectClip(rect, pad)); if (!png) return null; const { minC, maxC } = extremes(png); return { fg: maxC, bg: minC, ratio: +ratio(maxC, minC).toFixed(2) }; }
async function rectOf(page, sel) { return page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; }, sel); }
async function clickText(page, t) { const h = await page.evaluateHandle((t) => { const els = [...document.querySelectorAll('button,[role=button]')]; const norm = (e) => e.textContent.replace(/\s+/g, ' ').trim().toLowerCase(); return els.find(e => e.offsetParent !== null && !e.disabled && norm(e) === t.toLowerCase()) || els.find(e => e.offsetParent !== null && !e.disabled && norm(e).includes(t.toLowerCase())); }, t); const el = h.asElement(); if (!el) return false; await el.click(); return true; }

async function hitTargets(page) {
  return page.evaluate(() => {
    const els = [...document.querySelectorAll('button,[role=button],a')].filter(e => e.offsetParent !== null);
    return els.map(e => { const r = e.getBoundingClientRect(); return { text: (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 24), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; });
  });
}

const VIEWPORTS = { pixel7: { width: 412, height: 915 }, iphone14pro: { width: 393, height: 852 } };
const results = {};

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  for (const [name, vp] of Object.entries(VIEWPORTS)) {
    const page = await browser.newPage();
    await page.setViewport({ ...vp, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    await page.evaluateOnNewDocument(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto('http://localhost:5390/', { waitUntil: 'networkidle2', timeout: 60000 });
    await wait(1200);
    const r = {};
    r.testidsBetEntry = await page.evaluate(() => [...new Set([...document.querySelectorAll('[data-testid]')].map(e => e.getAttribute('data-testid')))]);
    r.hitTargetsBetEntry = await hitTargets(page);
    // wager unlocked contrast
    r.wagerUnlocked = await sample(page, await rectOf(page, '[data-testid="vault-ctl-wager"]'));
    r.ctaBetEntry = await sample(page, await rectOf(page, '[data-testid="vault-ctl-cta"] button'));
    await page.screenshot({ path: `${OUTDIR}/mobile-${name}-betentry.png` });

    await page.evaluate(() => { const el = document.querySelector('[data-testid="vault-world-card-bluechips"]'); if (el) el.click(); });
    await wait(300);
    await clickText(page, 'send it');
    await wait(700);
    r.hitTargetsPlaying = await hitTargets(page);
    r.lockedWagerCaption = await (async () => {
      const capRect = await page.evaluate(() => { const c = document.querySelector('[data-testid="vault-ctl-wager-locked"]'); const s = c?.querySelector('span'); if (!s) return null; const b = s.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; });
      return capRect ? sample(page, capRect, 1) : null;
    })();
    await page.screenshot({ path: `${OUTDIR}/mobile-${name}-playing.png` });

    results[name] = r;
    await page.close();
  }
  fs.writeFileSync(`${OUTDIR}/mobile-results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
