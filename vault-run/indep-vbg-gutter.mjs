// Supplemental independent probe: measure the actual GUTTER (px gap between
// adjacent columns) on all 4 rows at 1440 + 1920, to confirm the "single
// shared 32px gap" claim with left/right coordinates (not just widths).
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5181';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickButtonText(page, matcher) {
  const h = await page.evaluateHandle((m) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    const visible = els.filter((e) => e.offsetParent !== null);
    return visible.find((e) => e.textContent.trim().toLowerCase() === m.toLowerCase()) ||
      visible.find((e) => e.textContent.toLowerCase().includes(m.toLowerCase()));
  }, matcher);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}

async function tileCenter(page, idx, g) {
  return page.evaluate(({ idx, g }) => {
    const c = document.querySelector('canvas');
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

async function gutterProbe(page, sel) {
  return page.evaluate((s) => {
    const bar = document.querySelector(s);
    if (!bar) return null;
    const kids = [...bar.children].filter((k) => getComputedStyle(k).display !== 'none');
    const rects = kids.map((k) => k.getBoundingClientRect());
    const gaps = [];
    for (let i = 0; i < rects.length - 1; i++) gaps.push(+(rects[i + 1].left - rects[i].right).toFixed(2));
    const barCs = getComputedStyle(bar);
    return { colCount: rects.length, gaps, barPadding: barCs.padding, barGap: barCs.gap, barDisplay: barCs.display, barFlexDirection: barCs.flexDirection };
  }, sel);
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const out = {};
  for (const vp of [{ w: 1440, h: 900 }, { w: 1920, h: 1080 }]) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(700);
    const key = `${vp.w}x${vp.h}`;
    out[key] = {};
    out[key].lobby = await gutterProbe(page, '[data-testid="vault-controlcard"]');
    await clickButtonText(page, 'ape in');
    await wait(600);
    await page.evaluate(() => window.scrollTo(0, 0));
    out[key].betentry = await gutterProbe(page, '[data-testid="bet-console"] > div:nth-child(2)');
    await clickButtonText(page, 'send it');
    await wait(900);
    await page.evaluate(() => window.scrollTo(0, 0));
    out[key].playing = await gutterProbe(page, '.vault-actionbar');
    // drive to settled (take-profit after a couple safe reveals) for the
    // settled-panel gutter measurement
    let settled = false;
    for (let i = 0; i < 6 && !settled; i++) {
      await page.evaluate(() => window.scrollTo(0, 0));
      const { cx, cy } = await tileCenter(page, [12, 6, 18][i] ?? i, 5);
      await page.mouse.click(cx, cy);
      await wait(500);
      settled = await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'));
    }
    if (!settled) {
      await clickButtonText(page, 'take profit');
      await wait(900);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    out[key].settled = await gutterProbe(page, '[data-testid="vault-settledpanel"]');
    await page.close();
  }
  await browser.close();
  fs.writeFileSync('indep-vbg-gutter-results.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
})();
