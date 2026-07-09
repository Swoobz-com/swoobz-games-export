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
function relLum([r,g,b]) { const f=(c)=>{c=c/255; return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);}; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); }
function contrastRatio(a,b){const l1=relLum(a),l2=relLum(b);const[hi,lo]=l1>l2?[l1,l2]:[l2,l1];return (hi+0.05)/(lo+0.05);}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(600); await clickText(page,'ape in'); await wait(600); await clickText(page,'send it'); await wait(800);
  await forceLoss(page);
  await wait(3000);

  const rect = await page.evaluate(() => {
    const b = document.querySelector('[data-testid="vault-settled-betagain"] button');
    const r = b.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.evaluate(() => document.body.focus());
  for (let i=0;i<40;i++){ await page.keyboard.press('Tab'); await wait(30);
    const isIt = await page.evaluate(() => document.activeElement === document.querySelector('[data-testid="vault-settled-betagain"] button'));
    if (isIt) break;
  }
  await wait(150);
  const png = await page.screenshot({ encoding: 'base64' });
  // sample a strip of pixels just outside the button's top edge (where the ring should be) at several x offsets
  const samples = await page.evaluate(async (b64, rect) => {
    const img = new Image(); const loaded = new Promise((res,rej)=>{img.onload=res;img.onerror=rej;});
    img.src = 'data:image/png;base64,'+b64; await loaded;
    const c = document.createElement('canvas'); c.width=img.width; c.height=img.height;
    const ctx = c.getContext('2d'); ctx.drawImage(img,0,0);
    const pts = [];
    for (let dy=-6; dy<=0; dy++) {
      const d = ctx.getImageData(Math.round(rect.x + rect.w/2), Math.round(rect.y + dy), 1, 1).data;
      pts.push({ dy, rgb: [d[0],d[1],d[2]] });
    }
    return pts;
  }, png, rect);
  console.log(JSON.stringify(samples, null, 2));

  // background reference just further out (10px above button, clear of ring)
  const bgRef = await page.evaluate(async (b64, rect) => {
    const img = new Image(); const loaded = new Promise((res,rej)=>{img.onload=res;img.onerror=rej;});
    img.src = 'data:image/png;base64,'+b64; await loaded;
    const c = document.createElement('canvas'); c.width=img.width; c.height=img.height;
    const ctx = c.getContext('2d'); ctx.drawImage(img,0,0);
    const d = ctx.getImageData(Math.round(rect.x + rect.w/2), Math.round(rect.y - 10), 1, 1).data;
    return [d[0],d[1],d[2]];
  }, png, rect);
  console.log('bgRef (10px above, outside ring):', bgRef);

  // find the ring pixel = the one differing most from bgRef among the dy samples
  let best = null;
  for (const s of samples) {
    const c1 = contrastRatio(s.rgb, bgRef);
    if (!best || c1 > best.contrast) best = { ...s, contrast: c1 };
  }
  console.log('best ring pixel vs bg:', JSON.stringify(best));

  await browser.close();
})();
