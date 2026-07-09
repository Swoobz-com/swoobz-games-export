// a11ysweep0707-hudzone.mjs — live composited contrast of the HUD-ZONE
// textDim items that a prior sweep documented as explicitly OUT OF SCOPE
// ("a different surface... outside this pass's scope"): hudHeroKicker "PUMP",
// desktopGridHudRight "RUG RISK N%" / "N RUGS · FIRST TAP X" — now sitting
// over TODAY's new full-bleed per-world backdrop art + a 55%-alpha HUD bar,
// a genuinely composited render that cannot be read from hex source alone.
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
async function sample(page, rect, pad = 1) { if (!rect) return null; const png = await shot(page, rectClip(rect, pad)); if (!png) return null; const { minC, maxC } = extremes(png); return { fg: maxC, bg: minC, ratio: +ratio(maxC, minC).toFixed(2) }; }
async function clickText(page, t) { const h = await page.evaluateHandle((t) => { const els = [...document.querySelectorAll('button,[role=button]')]; const norm = (e) => e.textContent.replace(/\s+/g, ' ').trim().toLowerCase(); return els.find(e => e.offsetParent !== null && !e.disabled && norm(e) === t.toLowerCase()) || els.find(e => e.offsetParent !== null && !e.disabled && norm(e).includes(t.toLowerCase())); }, t); const el = h.asElement(); if (!el) return false; await el.click(); return true; }

async function hudRects(page) {
  return page.evaluate(() => {
    const hud = document.querySelector('[data-testid="DesktopHudRow"]');
    if (!hud) return null;
    const spans = [...hud.querySelectorAll('span')];
    const r = (el) => el ? (() => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; })() : null;
    const byText = (re) => spans.find(s => re.test(s.textContent));
    return {
      rugsFirstTap: r(byText(/RUGS.*FIRST TAP/i)),
      pumpKicker: r(byText(/^PUMP$/i)),
      rugRisk: r(byText(/RUG RISK/i)),
      heroBag: r(byText(/^BAG /i)),
      kicker: r(byText(/SECURED THE BAG|RUGGED/i)),
      delta: r(spans.find(s => /^[+-][\d.]+\s*USDC/.test(s.textContent.trim()))),
    };
  });
}

const worlds = ['bluechips', 'altseason', 'shitcoin'];
const results = {};

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  for (const world of worlds) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 3 });
    await page.evaluateOnNewDocument(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto('http://localhost:5390/', { waitUntil: 'networkidle2', timeout: 60000 });
    await wait(1200);
    await page.evaluate((s) => { document.querySelector(`[data-testid="vault-world-card-${s}"]`).click(); }, world);
    await wait(300);
    const wres = {};
    const betEntryRects = await hudRects(page);
    wres.betEntry_rugsFirstTap = await sample(page, betEntryRects?.rugsFirstTap);
    await page.screenshot({ path: `${OUTDIR}/hudzone-${world}-betentry.png` });

    await clickText(page, 'send it');
    await wait(700);
    // reveal 1 tile so PUMP/RUG RISK have live values (also true at 0 reveals, but be representative)
    const g = world === 'shitcoin' ? 7 : 5;
    const c = await page.evaluate(({ g }) => {
      const cv = document.querySelector('canvas'); const r = cv.getBoundingClientRect();
      const W = r.width, H = r.height; const tR = H * 0.15, bR = H * 0.18, sF = 0.08;
      const sW = W * (1 - sF * 2), sH = (H - tR - bR) * 0.96; const av = Math.min(sW, sH);
      const gap = Math.max(6, av * 0.026); const tile = (av - gap * (g - 1)) / g; const full = tile * g + gap * (g - 1);
      const x0 = (W - full) / 2; const by = tR + (H - tR - bR) / 2; const y0 = by - full / 2;
      return { cx: r.left + x0 + tile / 2, cy: r.top + y0 + tile / 2 };
    }, { g });
    await page.mouse.click(c.cx, c.cy);
    await wait(500);
    const playingRects = await hudRects(page);
    wres.playing_pumpKicker = await sample(page, playingRects?.pumpKicker);
    wres.playing_rugRisk = await sample(page, playingRects?.rugRisk);
    wres.playing_heroBag = await sample(page, playingRects?.heroBag);
    await page.screenshot({ path: `${OUTDIR}/hudzone-${world}-playing.png` });

    results[world] = wres;
    console.log(world, JSON.stringify(wres, null, 2));
    await page.close();
  }
  fs.writeFileSync(`${OUTDIR}/hudzone-results.json`, JSON.stringify(results, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
