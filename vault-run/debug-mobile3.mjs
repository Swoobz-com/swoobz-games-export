import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 5540;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return (
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
async function isSettledMobile(page){ return page.evaluate(()=>!!document.querySelector('[data-testid="vault-settledpanel"]')); }
async function takeProfitIfEnabled(page) {
  return page.evaluate(() => {
    const btn = [...document.querySelectorAll('[data-testid="vault-playing-actions"] button')].find((b) =>
      b.textContent.toLowerCase().includes('take profit'),
    );
    if (btn && !btn.disabled) { btn.click(); return true; }
    return btn ? 'disabled:'+btn.textContent : 'not-found';
  });
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(400);
  await clickText(page, 'ape in'); await wait(500);
  await clickText(page, 'SEND IT'); await wait(600);
  const box = await page.evaluate(() => { const c = document.querySelector('canvas'); const r=c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; });
  let reveals=0;
  for (let gx=1; gx<=9; gx++) { 
    for (let gy=1; gy<=9; gy++) {
      if (await isSettledMobile(page)) break;
      await page.mouse.click(box.x+box.w*gx/10, box.y+box.h*gy/10); await wait(280);
      if (await isSettledMobile(page)) break;
      reveals+=1;
      console.log('reveal#',reveals);
      if (reveals>=2) {
        const tp = await takeProfitIfEnabled(page);
        console.log('takeProfit attempt result:', tp);
        if (tp === true) { await wait(1000); break; }
      }
    }
    if (await isSettledMobile(page)) break;
  }
  await wait(1000);
  console.log('settled?', await isSettledMobile(page));
  console.log(await page.evaluate(()=>document.body.innerText.slice(0,600)));
  await page.screenshot({path:'debug-mobile3.png', fullPage:true});
  await browser.close();
})();
