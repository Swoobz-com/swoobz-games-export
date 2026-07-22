import puppeteer from 'puppeteer-core';
import { PNG } from 'pngjs';
import fs from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = process.argv[2] || '5902';
const OUTDIR = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad';
const DPR = 3;

function luminance([r, g, b]) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
function ratio(fg, bg) {
  const L1 = luminance(fg) + 0.05;
  const L2 = luminance(bg) + 0.05;
  return L1 > L2 ? L1 / L2 : L2 / L1;
}
function px(png, x, y) {
  const idx = (png.width * Math.min(Math.max(y, 0), png.height - 1) + Math.min(Math.max(x, 0), png.width - 1)) << 2;
  return [png.data[idx], png.data[idx + 1], png.data[idx + 2]];
}
function extremes(png) {
  let minL = Infinity, maxL = -Infinity, minC = null, maxC = null;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const c = px(png, x, y);
      const l = luminance(c);
      if (l < minL) { minL = l; minC = c; }
      if (l > maxL) { maxL = l; maxC = c; }
    }
  }
  return { minC, maxC, minL, maxL };
}
async function shot(page, clip) {
  if (clip.width < 1 || clip.height < 1) return null;
  const buf = await page.screenshot({ clip });
  return PNG.sync.read(Buffer.from(buf));
}
function rectClip(rect, padCss = 0) {
  return {
    x: Math.max(0, rect.x - padCss),
    y: Math.max(0, rect.y - padCss),
    width: Math.max(1, rect.width + padCss * 2),
    height: Math.max(1, rect.height + padCss * 2),
  };
}
async function sampleTextVsLocalBg(page, rect, padCss = 2) {
  const png = await shot(page, rectClip(rect, padCss));
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

// Reuse the byte-identical RUGS-stepper method for the regression guard.
async function measureRugsRow(page) {
  const rects = await page.evaluate(() => {
    const spans = [...document.querySelectorAll('span')];
    const rugsLabel = spans.find((s) => s.textContent.trim() === 'RUGS');
    const hint = spans.find((s) => s.textContent.includes('per tap starts'));
    const minusBtn = [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Fewer rugs');
    if (!rugsLabel || !hint || !minusBtn) return { present: false };
    const stepWrap = minusBtn.parentElement;
    const stepSpans = [...stepWrap.querySelectorAll('span')];
    const r = (el) => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; };
    return { present: true, label: r(rugsLabel), hint: r(hint) };
  });
  if (!rects.present) return { note: 'RUGS row not present' };
  const bgClip = {
    x: rects.label.x + rects.label.width + 2,
    y: rects.label.y + rects.label.height / 2 - 1,
    width: Math.max(2, rects.hint.x - (rects.label.x + rects.label.width) - 4),
    height: 2,
  };
  const bgPng = bgClip.width > 1 ? await shot(page, bgClip) : null;
  const rowBg = bgPng ? extremes(bgPng).minC : null;
  const labelPng = await shot(page, rectClip(rects.label, 1));
  const { maxC } = extremes(labelPng);
  return { labelRatio: rowBg ? +ratio(maxC, rowBg).toFixed(2) : null };
}

async function measureLockedWager(page, worldSlug) {
  const rects = await page.evaluate(() => {
    const container = document.querySelector('[data-testid="vault-ctl-wager-locked"]');
    if (!container) return { present: false };
    const caption = container.querySelector('span');
    const window_ = container.querySelector('div');
    const minusBtn = window_?.querySelector('button[aria-label*="decrease"]');
    const plusBtn = window_?.querySelector('button[aria-label*="increase"]');
    const outerValueSpan = window_ ? [...window_.querySelectorAll('span')].find(s => /\d/.test(s.textContent) && s.querySelector('span')) : null;
    const usdcSpan = outerValueSpan ? outerValueSpan.querySelector('span') : null;
    const r = (el) => el ? (() => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; })() : null;
    // Range over just the first text node of outerValueSpan (the numeric part, excludes the nested USDC span)
    let numRect = null;
    if (outerValueSpan) {
      const textNode = [...outerValueSpan.childNodes].find(n => n.nodeType === 3 && n.textContent.trim().length > 0);
      if (textNode) {
        const range = document.createRange();
        range.selectNodeContents(textNode);
        const rb = range.getBoundingClientRect();
        numRect = { x: rb.x, y: rb.y, width: rb.width, height: rb.height };
      }
    }
    return {
      present: true,
      caption: r(caption),
      minusBtn: r(minusBtn),
      plusBtn: r(plusBtn),
      minusDisabled: minusBtn ? minusBtn.disabled : null,
      plusDisabled: plusBtn ? plusBtn.disabled : null,
      minusOpacity: minusBtn ? getComputedStyle(minusBtn).opacity : null,
      plusOpacity: plusBtn ? getComputedStyle(plusBtn).opacity : null,
      numRect,
      usdcRect: r(usdcSpan),
      captionText: caption ? caption.textContent.trim() : null,
      valueText: outerValueSpan ? outerValueSpan.textContent.trim() : null,
    };
  });
  if (!rects.present) return { world: worldSlug, error: 'vault-ctl-wager-locked not found (round not active/locked)' };

  const out = { world: worldSlug, captionText: rects.captionText, valueText: rects.valueText, minusDisabled: rects.minusDisabled, plusDisabled: rects.plusDisabled, minusOpacity: rects.minusOpacity, plusOpacity: rects.plusOpacity };
  if (rects.caption) out.caption = await sampleTextVsLocalBg(page, rects.caption, 1);
  if (rects.numRect) out.wagerValue = await sampleTextVsLocalBg(page, rects.numRect, 1);
  if (rects.usdcRect) out.usdcSuffix = await sampleTextVsLocalBg(page, rects.usdcRect, 1);
  return out;
}

async function reachActiveLockedRound(page, worldSlug) {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1200);
  await page.evaluate((slug) => {
    const el = document.querySelector(`[data-testid="vault-world-card-${slug}"]`);
    if (el) el.click();
  }, worldSlug);
  await wait(400);
  await clickText(page, 'send it');
  await wait(700);
  // paint a short trail (don't cash out / don't let it bust immediately) so we
  // land squarely mid-round with the wager still locked.
  const first = await cc(page, 0, worldSlug === 'shitcoin' ? 7 : 5);
  if (first) {
    await page.mouse.move(first.cx, first.cy);
    await page.mouse.down();
    await wait(30);
    await page.mouse.up();
    await wait(200);
  }
  return true;
}

const results = { lockedWager: {}, rugsRegression: {}, notes: [] };

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: DPR });
  page.on('pageerror', (e) => results.notes.push('pageerror: ' + e.message));

  const worlds = ['bluechips', 'altseason', 'shitcoin'];
  for (const w of worlds) {
    await reachActiveLockedRound(page, w);
    // confirm we are actually in the active/locked phase
    const isActive = await page.evaluate(() => !!document.querySelector('[data-testid="vault-ctl-wager-locked"]'));
    results.notes.push(`${w}: reached locked phase = ${isActive}`);
    const lw = await measureLockedWager(page, w);
    results.lockedWager[w] = lw;
    // Screenshot for visual confirm of the locked affordance
    const container = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="vault-ctl-wager-locked"]');
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, width: b.width, height: b.height };
    });
    if (container) {
      const buf = await page.screenshot({ clip: rectClip(container, 6) });
      fs.writeFileSync(`${OUTDIR}/locked-wager-${w}.png`, buf);
    }
    // Reset for next world: reload page fresh
  }

  // Regression guard: RUGS-stepper still >= 7.58 (bluechips is the historical worst-case world)
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1000);
  await page.evaluate(() => { const el = document.querySelector('[data-testid="vault-world-card-bluechips"]'); if (el) el.click(); });
  await wait(400);
  results.rugsRegression.bluechips = await measureRugsRow(page);
  await page.evaluate(() => { const el = document.querySelector('[data-testid="vault-world-card-altseason"]'); if (el) el.click(); });
  await wait(400);
  results.rugsRegression.altseason = await measureRugsRow(page);

  fs.writeFileSync(`${OUTDIR}/lockedwager-holdgate-results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
