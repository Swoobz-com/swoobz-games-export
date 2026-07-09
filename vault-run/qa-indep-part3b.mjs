import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.argv[2] || '5181';
const browser = await puppeteer.launch({ executablePath: EXE, headless: false, defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 }, args: ['--window-size=1460,1040','--autoplay-policy=no-user-gesture-required'] });
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
async function tapTrail(indices, g) {
  for (const idx of indices) { const c = await cc(idx,g); await page.mouse.move(c.cx,c.cy); await page.mouse.down(); await wait(30); await page.mouse.up(); await wait(60); }
}
async function settledLabel(){ return await page.evaluate(()=>{const e=document.querySelector('div[aria-live="polite"][aria-label]'); return e?e.getAttribute('aria-label'):null;}); }
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
await wait(1200);
let clean = false;
for (let attempt=1; attempt<=6 && !clean; attempt++) {
  if (attempt>1) { await page.goto(`http://localhost:${PORT}/`, {waitUntil:'networkidle2',timeout:60000}); await wait(1000); }
  await clickText('ape in'); await wait(700);
  await clickText('send it'); await wait(900);
  await clickText('TRAIL'); await wait(300);
  const trail = [0,1,2];
  await tapTrail(trail, 5);
  await wait(200);
  await clickText('instant'); await wait(200);
  await clickText('GO');
  await wait(150);
  const c = await page.evaluate(() => { const m = document.body.textContent.match(/(\d+)\s+of\s+(\d+)\s+safe compartments/); return m?parseInt(m[1]):null; });
  console.log(`attempt ${attempt} count@150ms:`, c);
  if (c === 3) { clean = true; await page.screenshot({ path: 'shots/qaindep-part3-instant-clean-batch-150ms.png' }); await wait(600); await page.screenshot({ path: 'shots/qaindep-part3-instant-clean-batch-750ms.png' }); }
}
console.log('clean run achieved:', clean);
await browser.close();
console.log('DONE part3b');
