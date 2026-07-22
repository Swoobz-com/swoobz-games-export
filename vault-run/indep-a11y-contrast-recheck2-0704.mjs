// Third pass: single full-VIEWPORT screenshot (no element/clip crop) to avoid
// the headless backdrop-filter-on-crop rendering artifact seen in pass 2.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 5350;
const OUT = 'shots-indep-a11y-0704-recheck2';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return (
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
async function isSettled(page) {
  return await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-left"]'));
}
async function clickCanvasFraction(page, fx, fy) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (!box) return false;
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy);
  return true;
}
async function forceLoss(page) {
  const spots = [];
  for (let gx = 1; gx <= 9; gx++) for (let gy = 1; gy <= 9; gy++) spots.push([gx / 10, gy / 10]);
  for (const [fx, fy] of spots) {
    if (await isSettled(page)) return true;
    await clickCanvasFraction(page, fx, fy);
    await wait(250);
    if (await isSettled(page)) return true;
  }
  await wait(900);
  return await isSettled(page);
}
function relLum([r, g, b]) {
  const f = (c) => { c = c / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const [rl, gl, bl] = [f(r), f(g), f(b)];
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}
function contrastRatio(rgb1, rgb2) {
  const l1 = relLum(rgb1), l2 = relLum(rgb2);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(600);
  await clickText(page, 'ape in');
  await wait(600);
  await clickText(page, 'send it');
  await wait(800);
  await forceLoss(page);
  await wait(1300);

  const rects = await page.evaluate(() => {
    const q = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    };
    return {
      gutterBtn: q('[data-testid="vault-settled-betagain"] button'),
      gutterCard: q('[data-testid="vault-settled-betagain"]'),
      nextBetCard: q('[data-testid="vault-settled-nextbet"]'),
      ledgeBtn: q('[data-testid="vault-board-rebet"] button'),
      ledgeWrap: q('[data-testid="vault-board-rebet"]'),
      scrollY: window.scrollY,
      scrollX: window.scrollX,
    };
  });

  // full viewport screenshot, no clip
  const fullPng = await page.screenshot({ encoding: 'base64' }); // viewport only (fullPage defaults false)
  fs.writeFileSync(`${OUT}/full.png`, Buffer.from(fullPng, 'base64'));

  const sample = await page.evaluate(async (b64, points) => {
    const img = new Image();
    const loaded = new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    img.src = 'data:image/png;base64,' + b64;
    await loaded;
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const out = {};
    for (const [name, x, y] of points) {
      const px = Math.max(0, Math.min(img.width - 1, Math.round(x)));
      const py = Math.max(0, Math.min(img.height - 1, Math.round(y)));
      const d = ctx.getImageData(px, py, 1, 1).data;
      out[name] = [d[0], d[1], d[2], d[3]];
    }
    out._imgSize = [img.width, img.height];
    return out;
  }, fullPng, [
    ['gutterBtnCenter', rects.gutterBtn.x + rects.gutterBtn.w * 0.5, rects.gutterBtn.y + rects.gutterBtn.h * 0.5],
    ['gutterCardTop', rects.gutterCard.x + rects.gutterCard.w * 0.5, rects.gutterCard.y + rects.gutterCard.h * 0.03],
    ['nextBetCardBg', rects.nextBetCard.x + rects.nextBetCard.w * 0.9, rects.nextBetCard.y + rects.nextBetCard.h * 0.06],
    ['ledgeBtnCenter', rects.ledgeBtn.x + rects.ledgeBtn.w * 0.5, rects.ledgeBtn.y + rects.ledgeBtn.h * 0.5],
    ['ledgeWrapBg', rects.ledgeWrap.x + rects.ledgeWrap.w * 0.03, rects.ledgeWrap.y + rects.ledgeWrap.h * 0.03],
  ]);

  const out = {
    rects,
    sample,
    contrast_gutterBtn_vs_gutterCardTop: contrastRatio(sample.gutterBtnCenter.slice(0,3), sample.gutterCardTop.slice(0,3)),
    contrast_gutterBtn_vs_nextBetCardBg: contrastRatio(sample.gutterBtnCenter.slice(0,3), sample.nextBetCardBg.slice(0,3)),
    contrast_ledgeBtn_vs_ledgeWrapBg: contrastRatio(sample.ledgeBtnCenter.slice(0,3), sample.ledgeWrapBg.slice(0,3)),
    contrast_textInk_vs_gutterBtnFill: contrastRatio([4,19,11], sample.gutterBtnCenter.slice(0,3)),
  };
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));

  await browser.close();
})();
