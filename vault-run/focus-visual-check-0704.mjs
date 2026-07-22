import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 5350;
const OUT = 'shots-indep-a11y-0704-focus';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
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
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(600); await clickText(page,'ape in'); await wait(600); await clickText(page,'send it'); await wait(800);
  await forceLoss(page);
  await wait(3000); // steady state, past hero overlay

  const rect = await page.evaluate(() => {
    const b = document.querySelector('[data-testid="vault-settled-betagain"] button');
    const r = b.getBoundingClientRect();
    return { x: r.x - 12, y: r.y - 12, width: r.width + 24, height: r.height + 24 };
  });

  // unfocused
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await wait(100);
  await page.screenshot({ path: `${OUT}/betagain-unfocused.png`, clip: rect });

  // focus via keyboard tab to it specifically: click elsewhere then tab until it's active
  await page.evaluate(() => document.body.focus());
  let found = false;
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    await wait(40);
    const isIt = await page.evaluate(() => document.activeElement === document.querySelector('[data-testid="vault-settled-betagain"] button'));
    if (isIt) { found = true; break; }
  }
  await wait(150);
  await page.screenshot({ path: `${OUT}/betagain-focused.png`, clip: rect });
  console.log('foundViaTab:', found);

  await browser.close();
})();
