import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = '5322';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, t);
  const el = h.asElement(); if (!el) return false; await el.click(); return true;
}
async function clickWithin(page, selector, t) {
  const h = await page.evaluateHandle(({ selector, t }) => {
    const root = document.querySelector(selector); if (!root) return null;
    const els = [...root.querySelectorAll('button,[role=button]')];
    return els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, { selector, t });
  const el = h.asElement(); if (!el) return false; await el.click(); return true;
}
async function isSettled(page) { return await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-left"]')); }
async function clickCanvasFraction(page, fx, fy) {
  const box = await page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  if (!box) return false; await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy); return true;
}
async function takeProfitIfEnabled(page) {
  return await page.evaluate(() => {
    const btn = [...document.querySelectorAll('[data-testid="vault-playing-actions"] button')].find((b) => b.textContent.toLowerCase().includes('take profit'));
    if (btn && !btn.disabled) { btn.click(); return true; } return false;
  });
}
async function run(browser, w, h) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in'); await wait(600);
  await clickWithin(page, '[data-testid="vault-betentry-confirm"]', 'send it'); await wait(700);
  const spots = []; for (let gx = 1; gx <= 9; gx++) for (let gy = 1; gy <= 9; gy++) spots.push([gx/10, gy/10]);
  let safe = 0;
  for (const [fx, fy] of spots) {
    if (await isSettled(page)) break;
    await clickCanvasFraction(page, fx, fy); await wait(300);
    if (await isSettled(page)) break;
    safe += 1;
    if (safe >= 2 && (await takeProfitIfEnabled(page))) { await wait(900); break; }
  }
  await wait(1200);
  await page.evaluate(() => { const chip = document.querySelector('.vault-receipt-toggle'); if (chip) chip.click(); });
  await wait(500);
  const rects = await page.evaluate(() => {
    const rect = (sel) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, w: r.width, h: r.height }; };
    return {
      cardC: rect('[data-testid="vault-gutter-card-c"]'),
      gutterRight: rect('[data-testid="vault-gutter-right"]'),
      receiptBody: rect('#vault-settled-receipt'),
      receiptGutterCard: (() => { const el = document.getElementById('vault-settled-receipt'); return el ? (() => { const p = el.closest('[data-testid]'); return p ? { testid: p.getAttribute('data-testid'), ...(() => { const r = p.getBoundingClientRect(); return {top:r.top,bottom:r.bottom,left:r.left,right:r.right}; })() } : null; })() : null; })(),
    };
  });
  function overlaps(a, b) {
    if (!a || !b) return null;
    return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
  }
  const overlap = overlaps(rects.cardC, rects.receiptGutterCard);
  await page.screenshot({ path: `shots-indep-verify-0704/overlapcheck-${w}x${h}.png`, fullPage: true });
  await page.close();
  return { w, h, rects, overlapCardC_vs_ReceiptCard: overlap };
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const out = {};
  out.v1440 = await run(browser, 1440, 900);
  out.v1920 = await run(browser, 1920, 1080);
  out.v1150 = await run(browser, 1150, 850);
  await browser.close();
  fs.writeFileSync('overlap-check-0704-results.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
})();
