import puppeteer from 'puppeteer-core';
import { PNG } from 'pngjs';
import fs from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const DPR = 3; // supersample so we can find pure fg/bg extremes despite AA
const OUTDIR = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad';

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
  const idx = (png.width * Math.min(y, png.height - 1) + Math.min(x, png.width - 1)) << 2;
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
  return { minC, maxC };
}
async function shot(page, clip) {
  const buf = await page.screenshot({ clip });
  return PNG.sync.read(Buffer.from(buf));
}

async function measureWorld(page, worldSlug, label) {
  await page.evaluate((slug) => {
    const el = document.querySelector(`[data-testid="vault-world-card-${slug}"]`);
    if (el) el.click();
  }, worldSlug);
  await wait(400);

  const rects = await page.evaluate(() => {
    const spans = [...document.querySelectorAll('span')];
    const rugsLabel = spans.find((s) => s.textContent.trim() === 'RUGS');
    const hint = spans.find((s) => s.textContent.includes('per tap starts'));
    const minusBtn = [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Fewer rugs');
    const plusBtn = [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'More rugs');
    if (!rugsLabel || !hint || !minusBtn) return { present: false };
    const container = rugsLabel.closest('div').parentElement;
    const stepWrap = minusBtn.parentElement; // rugsStepper row
    const stepSpans = [...stepWrap.querySelectorAll('span')];
    const stepValue = stepSpans[0];
    const unitSpan = stepSpans[1];
    const r = (el) => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; };
    return {
      present: true,
      container: r(container),
      label: r(rugsLabel),
      hint: r(hint),
      minusBtn: r(minusBtn),
      plusBtn: r(plusBtn),
      stepValue: r(stepValue),
      unit: r(unitSpan),
    };
  });
  if (!rects.present) return { world: worldSlug, error: 'RUGS row not present (expected for shitcoin)' };

  // NOTE: puppeteer's `clip` is in CSS-pixel page coordinates (same space as
  // getBoundingClientRect); it applies deviceScaleFactor internally to the
  // OUTPUT image resolution. Do not also multiply by DPR here.
  const clip = (rect, padCss = 0) => ({
    x: Math.max(0, rect.x - padCss),
    y: Math.max(0, rect.y - padCss),
    width: Math.max(1, rect.width + padCss * 2),
    height: Math.max(1, rect.height + padCss * 2),
  });

  // Row background — sample the gap between the RUGS label and the hint text
  // (guaranteed no glyph pixels there, per `rugsTunerHead`'s space-between).
  const bgClip = {
    x: rects.label.x + rects.label.width + 2,
    y: rects.label.y + rects.label.height / 2 - 1,
    width: Math.max(2, rects.hint.x - (rects.label.x + rects.label.width) - 4),
    height: 2,
  };
  const bgPng = bgClip.width > 1 ? await shot(page, bgClip) : null;
  const rowBg = bgPng ? extremes(bgPng).minC : null; // minC = darkest = pure bg (no AA lightening)

  const out = { world: worldSlug, rowBg };

  for (const [name, rect] of [['label', rects.label], ['hint', rects.hint], ['stepValue', rects.stepValue], ['unit', rects.unit]]) {
    const png = await shot(page, clip(rect, 1));
    const { maxC } = extremes(png); // brightest = the glyph (all our fg colors are lighter than the dark bg)
    out[name] = { glyph: maxC, contrastVsRowBg: rowBg ? ratio(maxC, rowBg).toFixed(2) : null };
  }

  // Button border strip: thin vertical strip at the LEFT edge only (avoids the
  // glyph in the button's center), for both stepper buttons.
  for (const [name, rect] of [['minusBtnBorder', rects.minusBtn], ['plusBtnBorder', rects.plusBtn]]) {
    const stripClip = {
      x: rect.x,
      y: rect.y + 6,
      width: 3,
      height: Math.max(1, rect.height - 12),
    };
    const png = await shot(page, stripClip);
    const { maxC } = extremes(png); // brightest in this strip = the border ring
    out[name] = { border: maxC, contrastVsRowBg: rowBg ? ratio(maxC, rowBg).toFixed(2) : null };
  }

  // Save a labeled crop for visual sanity check.
  const wide = clip(rects.container, 4);
  const buf = await page.screenshot({ clip: wide });
  fs.writeFileSync(`${OUTDIR}/rugs-row-${worldSlug}.png`, buf);

  return out;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: DPR });
  await page.goto('http://localhost:5181/', { waitUntil: 'networkidle0' });
  await wait(600);

  for (const w of ['bluechips', 'altseason']) {
    const res = await measureWorld(page, w, w);
    console.log(JSON.stringify(res, null, 2));
  }

  await page.close();
  await browser.close();
})();
