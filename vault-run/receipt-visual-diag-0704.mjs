import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = '5460';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickText(page, t, within) {
  const h = await page.evaluateHandle(({ t, within }) => {
    const root = within ? document.querySelector(within) : document;
    if (!root) return null;
    const els = [...root.querySelectorAll('button,[role=button]')];
    return els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, { t, within });
  const el = h.asElement(); if (!el) return false; await el.click(); return true;
}
async function isSettled(page) { return await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-left"]')); }
async function clickCanvasFraction(page, fx, fy) {
  const box = await page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  if (!box) return false; await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy); return true;
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in'); await wait(600);
  await clickText(page, 'send it', '[data-testid="vault-betentry-confirm"]'); await wait(700);
  const spots = []; for (let gx=1;gx<=9;gx++) for (let gy=1;gy<=9;gy++) spots.push([gx/10,gy/10]);
  for (const [fx,fy] of spots) { if (await isSettled(page)) break; await clickCanvasFraction(page, fx, fy); await wait(300); }
  await wait(1300);
  const toggle = await page.evaluate(() => { const c=document.querySelector('.vault-receipt-toggle'); const r=c.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; });
  await page.mouse.click(toggle.x, toggle.y);
  await wait(500);
  const diag = await page.evaluate(() => {
    const drawer = document.getElementById('vault-settled-receipt');
    const cardRect = drawer.getBoundingClientRect();
    const dl = drawer.querySelector('dl');
    const dlRect = dl.getBoundingClientRect();
    const dlCs = getComputedStyle(dl);
    const rows = [...dl.children].map(el => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { tag: el.tagName, text: el.textContent.slice(0,40), rect: {x:r.x,y:r.y,w:r.width,h:r.height}, color: cs.color, overflow: cs.overflow, whiteSpace: cs.whiteSpace, display: cs.display };
    });
    return { cardRect: {x:cardRect.x,y:cardRect.y,w:cardRect.width,h:cardRect.height}, dlRect: {x:dlRect.x,y:dlRect.y,w:dlRect.width,h:dlRect.height}, dlGridTemplateColumns: dlCs.gridTemplateColumns, rows };
  });
  console.log(JSON.stringify(diag, null, 2));
  // crop screenshot of just the receipt card region
  const clip = await page.evaluate(() => { const el = document.getElementById('vault-settled-receipt'); const r = el.getBoundingClientRect(); return {x:Math.max(0,r.x-10), y:Math.max(0,r.y-10), width: r.width+40, height: r.height+20}; });
  await page.screenshot({ path: 'receipt-crop-0704.png', clip });
  await browser.close();
})();
