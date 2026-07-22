import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.argv[2] || '5183';
const browser = await puppeteer.launch({ executablePath: EXE, headless: false, defaultViewport: { width: 390, height: 844, deviceScaleFactor: 1 }, args: ['--window-size=410,984','--autoplay-policy=no-user-gesture-required'] });
const page = (await browser.pages())[0];
async function clickText(t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return els.find(e => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase())
      || els.find(e => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, t);
  const el = h.asElement(); if (!el) return false; await el.click(); return true;
}
async function cc(idx, g) {
  return await page.evaluate(({ idx, g }) => {
    const c = document.querySelector('canvas'); const r = c.getBoundingClientRect();
    const W = r.width, H = r.height; const tR = H*0.15, bR=H*0.18, sF=0.08;
    const sW=W*(1-sF*2), sH=(H-tR-bR)*0.96; const av=Math.min(sW,sH);
    const gap=Math.max(6, av*0.026); const tile=(av-gap*(g-1))/g; const full=tile*g+gap*(g-1);
    const x0=(W-full)/2; const by=tR+(H-tR-bR)/2; const y0=by-full/2;
    const col=idx%g, row=Math.floor(idx/g);
    return { cx: r.left+x0+col*(tile+gap)+tile/2, cy: r.top+y0+row*(tile+gap)+tile/2 };
  }, {idx,g});
}
async function tapTrail(indices, g) { for (const idx of indices) { const c = await cc(idx,g); await page.mouse.move(c.cx,c.cy); await page.mouse.down(); await wait(30); await page.mouse.up(); await wait(60); } }
async function settledLabel(){ return await page.evaluate(()=>{const e=document.querySelector('div[aria-live="polite"][aria-label]'); return e?e.getAttribute('aria-label'):null;}); }
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
await wait(1200);
await clickText('ape in'); await wait(700);
await clickText('send it'); await wait(900);
await clickText('TRAIL'); await wait(300);
await tapTrail([0,1,2], 5);
await clickText('GO'); await wait(1000);
let lbl = await settledLabel();
if (!lbl) { await clickText('take profit'); await wait(1200); lbl = await settledLabel(); }
console.log('settled:', lbl);
// find reuse button, scroll it into view, screenshot
const found = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  const b = btns.find(e => e.textContent.toLowerCase().includes('same trail'));
  if (!b) return false;
  b.scrollIntoView({block:'center'});
  return true;
});
console.log('reuse button found + scrolled:', found);
await wait(300);
await page.screenshot({ path: 'shots/qaindep-M390-reuse-scrolled-into-view.png' });
await browser.close();
console.log('DONE mobscroll');
