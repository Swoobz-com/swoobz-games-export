import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 5350;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase())
      || els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, t);
  const el = h.asElement(); if (!el) return false; await el.click(); return true;
}
async function isSettled(page) { return page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-left"]')); }
async function clickCanvasFraction(page, fx, fy) {
  const box = await page.evaluate(() => { const c=document.querySelector('canvas'); if(!c) return null; const r=c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; });
  if (!box) return false; await page.mouse.click(box.x+box.w*fx, box.y+box.h*fy); return true;
}
async function forceLoss(page) {
  const spots=[]; for (let gx=1; gx<=9; gx++) for (let gy=1; gy<=9; gy++) spots.push([gx/10,gy/10]);
  for (const [fx,fy] of spots) { if (await isSettled(page)) return true; await clickCanvasFraction(page,fx,fy); await wait(250); if (await isSettled(page)) return true; }
  await wait(900); return isSettled(page);
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(600); await clickText(page,'ape in'); await wait(600); await clickText(page,'send it'); await wait(800);
  await forceLoss(page);
  await wait(2000);
  await page.evaluate(() => { const c = document.querySelector('.vault-receipt-toggle'); if (c) c.click(); });
  await wait(500);
  console.log('console/page errors:', JSON.stringify(errs, null, 2));
  await browser.close();
})();
