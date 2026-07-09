// Recheck of BET AGAIN(loss)-vs-card contrast using elementHandle screenshots
// (avoids the page.screenshot({clip}) scroll-coordinate pitfall).
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 5350;
const OUT = 'shots-indep-a11y-0704-recheck';
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

async function decodeAndSample(page, base64, fx, fy) {
  return await page.evaluate(async (b64, x, y) => {
    const img = new Image();
    const loaded = new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    img.src = 'data:image/png;base64,' + b64;
    await loaded;
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const px = Math.max(0, Math.min(img.width - 1, Math.round(img.width * x)));
    const py = Math.max(0, Math.min(img.height - 1, Math.round(img.height * y)));
    const d = ctx.getImageData(px, py, 1, 1).data;
    return { w: img.width, h: img.height, rgba: [d[0], d[1], d[2], d[3]] };
  }, base64, fx, fy);
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

  const btnHandle = await page.$('[data-testid="vault-settled-betagain"] button');
  const cardHandle = await page.$('[data-testid="vault-settled-betagain"]');
  const nextBetCardHandle = await page.$('[data-testid="vault-settled-nextbet"]'); // sibling card, same gutterCard glass, no button overlapping - clean bg reference
  const ledgeBtnHandle = await page.$('[data-testid="vault-board-rebet"] button');
  const ledgeWrapHandle = await page.$('[data-testid="vault-board-rebet"]');

  const btnPng = await btnHandle.screenshot({ encoding: 'base64' });
  const cardPng = await cardHandle.screenshot({ encoding: 'base64' });
  const nextBetPng = nextBetCardHandle ? await nextBetCardHandle.screenshot({ encoding: 'base64' }) : null;
  const ledgeBtnPng = ledgeBtnHandle ? await ledgeBtnHandle.screenshot({ encoding: 'base64' }) : null;
  const ledgeWrapPng = ledgeWrapHandle ? await ledgeWrapHandle.screenshot({ encoding: 'base64' }) : null;

  fs.writeFileSync(`${OUT}/btn.png`, Buffer.from(btnPng, 'base64'));
  fs.writeFileSync(`${OUT}/card.png`, Buffer.from(cardPng, 'base64'));
  if (nextBetPng) fs.writeFileSync(`${OUT}/nextbetcard.png`, Buffer.from(nextBetPng, 'base64'));
  if (ledgeBtnPng) fs.writeFileSync(`${OUT}/ledgebtn.png`, Buffer.from(ledgeBtnPng, 'base64'));
  if (ledgeWrapPng) fs.writeFileSync(`${OUT}/ledgewrap.png`, Buffer.from(ledgeWrapPng, 'base64'));

  const btnCenter = await decodeAndSample(page, btnPng, 0.5, 0.5);
  const btnEdgeTop = await decodeAndSample(page, btnPng, 0.5, 0.08); // near top edge of button, avoid inset shadow center issues
  const cardTopStrip = await decodeAndSample(page, cardPng, 0.5, 0.03); // top sliver of card, above the button (card padding-top before button)
  const cardBottomStrip = await decodeAndSample(page, cardPng, 0.5, 0.97);
  const nextBetBgSample = nextBetPng ? await decodeAndSample(page, nextBetPng, 0.9, 0.05) : null; // corner away from stepper content

  const ledgeBtnCenter = ledgeBtnPng ? await decodeAndSample(page, ledgeBtnPng, 0.5, 0.5) : null;
  const ledgeWrapCorner = ledgeWrapPng ? await decodeAndSample(page, ledgeWrapPng, 0.05, 0.05) : null;

  // text color (accentInk) vs button fill — sample a pixel inside a glyph stroke is unreliable;
  // instead read computed style (already confirmed exact via CSS, not rendering-dependent for solid colors)
  const textColorComputed = await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="vault-settled-betagain"] button');
    return getComputedStyle(btn).color;
  });

  const out = {
    btnCenter, btnEdgeTop, cardTopStrip, cardBottomStrip, nextBetBgSample,
    ledgeBtnCenter, ledgeWrapCorner, textColorComputed,
    contrast_btnCenter_vs_cardTopStrip: contrastRatio(btnCenter.rgba.slice(0,3), cardTopStrip.rgba.slice(0,3)),
    contrast_btnCenter_vs_cardBottomStrip: contrastRatio(btnCenter.rgba.slice(0,3), cardBottomStrip.rgba.slice(0,3)),
    contrast_btnCenter_vs_nextBetCardBg: nextBetBgSample ? contrastRatio(btnCenter.rgba.slice(0,3), nextBetBgSample.rgba.slice(0,3)) : null,
    contrast_ledgeBtn_vs_ledgeWrapBg: ledgeBtnCenter && ledgeWrapCorner ? contrastRatio(ledgeBtnCenter.rgba.slice(0,3), ledgeWrapCorner.rgba.slice(0,3)) : null,
    contrast_textInk_vs_btnFill_ANALYTIC: contrastRatio([4,19,11], btnCenter.rgba.slice(0,3)),
  };
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));

  await browser.close();
})();
