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
  await forceLoss(page); await wait(1300);

  // BEFORE: normal
  const before = await sampleBtn(page);
  // Neutralize backdrop-filter + background gradient on the ancestor card to test the theory
  await page.evaluate(() => {
    const card = document.querySelector('[data-testid="vault-settled-betagain"]');
    let el = card;
    while (el) {
      el.style.backdropFilter = 'none';
      el.style.setProperty('-webkit-backdrop-filter', 'none');
      el = el.parentElement;
      if (el && el.tagName === 'BODY') break;
    }
  });
  await wait(200);
  const afterNoBackdrop = await sampleBtn(page);

  console.log(JSON.stringify({ before, afterNoBackdrop }, null, 2));
  await browser.close();

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
})();
