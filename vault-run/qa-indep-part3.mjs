import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.argv[2] || '5181';
const browser = await puppeteer.launch({ executablePath: EXE, headless: false, defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 }, args: ['--window-size=1460,1040','--autoplay-policy=no-user-gesture-required'] });
const page = (await browser.pages())[0];
page.on('pageerror', e => console.log('PAGEERROR:', e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
await wait(1200);
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
async function tapTrail(indices, g) {
  for (const idx of indices) { const c = await cc(idx,g); await page.mouse.move(c.cx,c.cy); await page.mouse.down(); await wait(30); await page.mouse.up(); await wait(60); }
}
await clickText('ape in'); await wait(700);
await clickText('send it'); await wait(900);
await clickText('TRAIL'); await wait(300);
const trail = [6,7,8,12,13,14,18];
await tapTrail(trail, 5);
await wait(200);
// set instant pace (button only mounts once trail painted)
const btns = await page.evaluate(() => [...document.querySelectorAll('button')].filter(e=>e.offsetParent!==null).map(b=>({t:b.textContent.trim(), pressed:b.getAttribute('aria-pressed')})));
console.log('buttons after paint:', JSON.stringify(btns));
await clickText('instant'); await wait(200);
await page.screenshot({ path: 'shots/qaindep-part3-pretrail-instant-primed.png' });
await clickText('GO');
await wait(120); // catch it right after the one-shot batch commit
await page.screenshot({ path: 'shots/qaindep-part3-instant-postbatch-120ms.png' });
await wait(600);
await page.screenshot({ path: 'shots/qaindep-part3-instant-postbatch-720ms.png' });
const footer = await page.evaluate(() => { const m = document.body.textContent.match(/(\d+)\s+of\s+(\d+)\s+safe compartments/); return m ? m[0] : null; });
console.log('footer text:', footer);
await browser.close();
console.log('DONE part3');
