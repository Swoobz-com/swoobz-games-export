import puppeteer from 'puppeteer-core';
import { PNG } from 'pngjs';
import fs from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5390';
const OUTDIR = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function luminance([r, g, b]) {
  const a = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
function ratio(fg, bg) {
  const L1 = luminance(fg) + 0.05, L2 = luminance(bg) + 0.05;
  return L1 > L2 ? L1 / L2 : L2 / L1;
}
function px(png, x, y) {
  const idx = (png.width * Math.min(Math.max(y, 0), png.height - 1) + Math.min(Math.max(x, 0), png.width - 1)) << 2;
  return [png.data[idx], png.data[idx + 1], png.data[idx + 2]];
}
function extremes(png) {
  let minL = Infinity, maxL = -Infinity, minC = null, maxC = null;
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    const c = px(png, x, y); const l = luminance(c);
    if (l < minL) { minL = l; minC = c; }
    if (l > maxL) { maxL = l; maxC = c; }
  }
  return { minC, maxC };
}
function rectClip(rect, padCss = 0) {
  return { x: Math.max(0, rect.x - padCss), y: Math.max(0, rect.y - padCss), width: Math.max(1, rect.width + padCss * 2), height: Math.max(1, rect.height + padCss * 2) };
}
async function shot(page, clip) {
  if (clip.width < 1 || clip.height < 1) return null;
  const buf = await page.screenshot({ clip });
  return { png: PNG.sync.read(Buffer.from(buf)), buf };
}
async function sampleTextVsLocalBg(page, rect, padCss = 2) {
  const { png } = await shot(page, rectClip(rect, padCss));
  if (!png) return null;
  const { minC, maxC } = extremes(png);
  return { fg: maxC, bg: minC, ratio: +ratio(maxC, minC).toFixed(2) };
}
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

const WORLDS = [
  { slug: 'bluechips', g: 5 },
  { slug: 'altseason', g: 5 },
  { slug: 'shitcoin', g: 7 },
];

const results = { fix3: {}, fix2: {}, regression: {}, boardY: {}, notes: [] };

async function measureBetEntryAndLocked(page, slug) {
  const out = {};
  // world selection
  await page.evaluate((s) => { document.querySelector(`[data-testid="vault-world-card-${s}"]`)?.click(); }, slug);
  await wait(500);

  // board-Y (canvas rect top) at bet-entry
  const boardTop = await page.evaluate(() => {
    const c = document.querySelector('[data-testid="vault-canvas-shell"]') || document.querySelector('canvas');
    if (!c) return null;
    return c.getBoundingClientRect().top;
  });
  out.boardTopBetEntry = boardTop;

  // FIX3a: bet-entry HUD right "N RUGS · FIRST TAP X"
  const hudRightRect = await page.evaluate(() => {
    const hud = document.querySelector('[data-testid="vault-grid-hud-inner"]');
    if (!hud) return null;
    const spans = [...hud.querySelectorAll('span')].filter(s => s.querySelectorAll('span').length === 0);
    const el = spans.find(s => /RUG.*FIRST TAP/i.test(s.textContent));
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, width: b.width, height: b.height, text: el.textContent.trim() };
  });
  if (hudRightRect) out.betEntryHudRight = { text: hudRightRect.text, ...(await sampleTextVsLocalBg(page, hudRightRect, 1)) };
  else out.betEntryHudRight = { error: 'not found' };

  // REGRESSION: RUGS stepper row (label) if present
  const rugsRects = await page.evaluate(() => {
    const spans = [...document.querySelectorAll('span')];
    const rugsLabel = spans.find((s) => s.textContent.trim() === 'RUGS');
    if (!rugsLabel) return null;
    const b = rugsLabel.getBoundingClientRect();
    return { x: b.x, y: b.y, width: b.width, height: b.height };
  });
  if (rugsRects) out.rugsStepperLabel = await sampleTextVsLocalBg(page, rugsRects, 1);
  else out.rugsStepperLabel = { note: 'RUGS row not present (expected for shitcoin, fixed rug count)' };

  // Enter active phase
  await clickText(page, 'send it');
  await wait(700);

  // REGRESSION: locked wager caption "BET · LOCKED" (was "INZET · VERGRENDELD")
  const lockedRects = await page.evaluate(() => {
    const container = document.querySelector('[data-testid="vault-ctl-wager-locked"]');
    if (!container) return null;
    const cap = [...container.querySelectorAll('span')].find(s => /BET.*LOCKED/i.test(s.textContent) || /VERGRENDELD/i.test(s.textContent));
    // AnimatedUsdc renders <span style>{value} <span style="opacity:0.6">USDC</span></span>
    // — the innermost leaf span (no span children, exact text "USDC") is the nested suffix.
    const usdcEl = [...container.querySelectorAll('span')].find(s => s.querySelectorAll('span').length === 0 && s.textContent.trim() === 'USDC');
    const outerEl = usdcEl ? usdcEl.parentElement : null;
    const r = (el) => el ? (() => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height, text: el.textContent.trim() }; })() : null;
    const outerR = r(outerEl);
    const usdcR = r(usdcEl);
    // "value" region = the outer span's rect minus the nested USDC span's width (left portion, the numeral)
    let valR = null;
    if (outerR && usdcR) {
      valR = { x: outerR.x, y: outerR.y, width: Math.max(1, usdcR.x - outerR.x - 2), height: outerR.height, text: outerEl.textContent.replace('USDC', '').trim() };
    }
    return { cap: r(cap), val: valR, usdc: usdcR };
  });
  if (lockedRects) {
    out.lockedCaption = lockedRects.cap ? { text: lockedRects.cap.text, ...(await sampleTextVsLocalBg(page, lockedRects.cap, 1)) } : { error: 'caption not found' };
    out.lockedWagerValue = lockedRects.val ? { text: lockedRects.val.text, ...(await sampleTextVsLocalBg(page, lockedRects.val, 1)) } : { error: 'value not found' };
    out.lockedUsdcSuffix = lockedRects.usdc ? { text: lockedRects.usdc.text, ...(await sampleTextVsLocalBg(page, lockedRects.usdc, 1)) } : { error: 'usdc suffix not found' };
  } else {
    out.lockedPanel = { error: 'vault-ctl-wager-locked not found' };
  }

  // FIX3b: "PUMP" kicker + "RUG RISK N%" (should still be textMuted color while risk <=50%)
  const hudActive = await page.evaluate(() => {
    const hud = document.querySelector('[data-testid="vault-grid-hud-inner"]');
    if (!hud) return null;
    const spans = [...hud.querySelectorAll('span')];
    const pump = spans.find(s => s.textContent.trim() === 'PUMP');
    const rugRisk = spans.find(s => /RUG RISK/i.test(s.textContent));
    const r = (el) => el ? (() => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { x: b.x, y: b.y, width: b.width, height: b.height, text: el.textContent.trim(), color: cs.color }; })() : null;
    return { pump: r(pump), rugRisk: r(rugRisk) };
  });
  if (hudActive) {
    out.pumpKicker = hudActive.pump ? { text: hudActive.pump.text, color: hudActive.pump.color, ...(await sampleTextVsLocalBg(page, hudActive.pump, 1)) } : { error: 'PUMP not found' };
    out.rugRisk = hudActive.rugRisk ? { text: hudActive.rugRisk.text, color: hudActive.rugRisk.color, ...(await sampleTextVsLocalBg(page, hudActive.rugRisk, 1)) } : { error: 'RUG RISK not found' };
  }

  return out;
}

async function pickOrderForWorld(port, slug, g) {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  let out = null;
  for (let attempt = 0; attempt < 12 && !out; attempt++) {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
      localStorage.clear(); sessionStorage.clear();
      window.__log = [];
      window.__lastFill = null;
      const of = CanvasRenderingContext2D.prototype.fill;
      CanvasRenderingContext2D.prototype.fill = function (...args) {
        window.__lastFill = String(this.fillStyle);
        return of.apply(this, args);
      };
      const ot = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (t, x, y) {
        if (/^\d{1,3}$/.test(String(t))) {
          const fm = /([\d.]+)px/.exec(String(this.font));
          const fontPx = fm ? parseFloat(fm[1]) : 12;
          let plateR = fontPx * 0.62;
          try {
            const m = this.measureText(String(t));
            plateR = Math.max(fontPx * 0.62, m.width / 2 + fontPx * 0.22);
          } catch (e) {}
          window.__log.push({ t: String(t), x, y, style: String(this.fillStyle), font: String(this.font), plateFill: window.__lastFill, plateR, fontPx });
        }
        return ot.apply(this, arguments);
      };
    });
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 3 });
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle2', timeout: 60000 });
    await wait(1000);
    await page.evaluate((s) => { document.querySelector(`[data-testid="vault-world-card-${s}"]`)?.click(); }, slug);
    await wait(400);
    await page.evaluate(() => { [...document.querySelectorAll('button')].find(b => /send it/i.test(b.textContent))?.click(); });
    await wait(700);

    let bustedEarly = false;
    for (let k = 0; k < 2; k++) {
      const settled = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settledpanel"]'));
      if (settled) break;
      const c = await cc(page, attempt * 2 + k, g);
      if (!c) break;
      await page.mouse.click(c.cx, c.cy);
      await wait(650);
      if (k === 0) {
        const nowSettled = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settledpanel"]'));
        const anyNumeral = await page.evaluate(() => (window.__log || []).length > 0);
        if (nowSettled && !anyNumeral) bustedEarly = true;
      }
    }
    if (bustedEarly) { await page.close(); continue; }

    // try to reach settled cleanly via take profit / GO instant, so this is measured
    // "at the settled reveal" per the task's wording
    let settledOk = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settledpanel"]'));
    if (!settledOk) {
      const paceInstant = await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null);
        const instant = btns.find(b => b.textContent.trim().toLowerCase() === 'instant');
        return instant ? instant.getAttribute('aria-pressed') : null;
      });
      if (paceInstant !== 'true') { await clickText(page, 'instant'); await wait(150); }
      await clickText(page, 'take profit');
      for (let i = 0; i < 60 && !settledOk; i++) {
        await wait(80);
        settledOk = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settledpanel"]'));
      }
    }

    const canvasRect = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left: r.left, top: r.top }; });
    const log = await page.evaluate(() => window.__log || []);
    const cands = log.filter(e => /^rgba\(255,\s*255,\s*255,/.test(e.style) && e.plateFill && /^rgba\(6,\s*20,\s*14,/.test(e.plateFill));
    const seen = new Map();
    for (const e of cands) seen.set(`${e.t}@${Math.round(e.x)},${Math.round(e.y)}`, e);
    const uniq = [...seen.values()];
    if (uniq.length) {
      const samples = [];
      for (const e of uniq) {
        const pageX = canvasRect.left + e.x, pageY = canvasRect.top + e.y;
        const plateSide = e.plateR * 2 * 0.8; // stay strictly inside the plate circle, clear of AA edge
        const clip = { x: pageX - plateSide / 2, y: pageY - plateSide / 2, width: plateSide, height: plateSide };
        const { png, buf } = await shot(page, clip);
        fs.writeFileSync(`${OUTDIR}/fix2-${slug}-${e.t}-plate-tight.png`, buf);
        const { minC, maxC } = extremes(png);
        // cross-check: a plate-only offset sample away from the glyph, still inside plate
        const offClip = { x: pageX + e.plateR * 0.55 - 2, y: pageY - 2, width: 4, height: 4 };
        const off = await shot(page, offClip);
        const offColor = off.png ? extremes(off.png).minC : null;
        const wide = { x: pageX - 22, y: pageY - 22, width: 44, height: 44 };
        const { buf: wbuf } = await shot(page, wide);
        fs.writeFileSync(`${OUTDIR}/fix2-${slug}-${e.t}-wide.png`, wbuf);
        samples.push({
          text: e.t, x: e.x, y: e.y, plateR: e.plateR, fontPx: e.fontPx,
          glyphFg: maxC, plateBg: minC, ratioTightCrop: +ratio(maxC, minC).toFixed(2),
          plateOffsetSample: offColor, ratioVsOffsetSample: offColor ? +ratio(maxC, offColor).toFixed(2) : null,
        });
      }
      out = { attempt, settledOk, samples };
    }
    await page.close();
  }
  await browser.close();
  return out;
}

(async () => {
  const page0 = await (await puppeteer.launch({ executablePath: CHROME, headless: 'new' })).newPage();
  // separate browser instance per world for the DOM measurement pass (fresh storage each time)
  for (const w of WORLDS) {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 3 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
    await wait(1200);
    results.regression[w.slug] = await measureBetEntryAndLocked(page, w.slug);
    await browser.close();
  }

  // 1920x1080 board-Y spot check (bluechips only, per task's "spot" instruction)
  {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
    await wait(1200);
    await page.evaluate(() => { document.querySelector('[data-testid="vault-world-card-bluechips"]')?.click(); });
    await wait(500);
    const top = await page.evaluate(() => {
      const c = document.querySelector('[data-testid="vault-canvas-shell"]') || document.querySelector('canvas');
      return c ? c.getBoundingClientRect().top : null;
    });
    results.boardY['1920x1080-bluechips'] = top;
    await browser.close();
  }

  for (const w of WORLDS) {
    results.fix2[w.slug] = await pickOrderForWorld(PORT, w.slug, w.g);
  }

  fs.writeFileSync(`${OUTDIR}/reverify0707-fix2fix3-results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await page0.browser().close();
})();
