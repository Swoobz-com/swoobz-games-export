import puppeteer from 'puppeteer-core';
import fs from 'fs';
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
async function sampleBtn(page) {
  const rect = await page.evaluate(() => {
    const b = document.querySelector('[data-testid="vault-settled-betagain"] button');
    const r = b.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const png = await page.screenshot({ encoding: 'base64' });
  const px = await page.evaluate(async (b64, cx, cy) => {
    const img = new Image(); const loaded = new Promise((res,rej)=>{img.onload=res;img.onerror=rej;});
    img.src = 'data:image/png;base64,'+b64; await loaded;
    const c = document.createElement('canvas'); c.width=img.width; c.height=img.height;
    const ctx = c.getContext('2d'); ctx.drawImage(img,0,0);
    const d = ctx.getImageData(Math.round(cx), Math.round(cy), 1, 1).data;
    return [d[0],d[1],d[2],d[3]];
  }, png, rect.x + rect.w*0.5, rect.y + rect.h*0.5);
  return { rect, rgba: px };
}
async function heroPresent(page) {
  return page.evaluate(() => {
    const els = [...document.querySelectorAll('div')];
    return els.some(e => getComputedStyle(e).zIndex === '12');
  });
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(600); await clickText(page,'ape in'); await wait(600); await clickText(page,'send it'); await wait(800);
  await forceLoss(page);
  const t0 = Date.now();
  const timeline = [];
  for (const targetMs of [200, 800, 1400, 2000, 2600, 3200, 4000]) {
    const elapsed = Date.now() - t0;
    const toWait = targetMs - elapsed;
    if (toWait > 0) await wait(toWait);
    const s = await sampleBtn(page);
    const hero = await heroPresent(page);
    timeline.push({ targetMs, actualElapsed: Date.now() - t0, heroOverlayPresent: hero, rgba: s.rgba });
  }
  console.log(JSON.stringify(timeline, null, 2));
  await browser.close();
})();
