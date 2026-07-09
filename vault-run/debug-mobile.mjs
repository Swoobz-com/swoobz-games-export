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
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(400);
  console.log('ape in click:', await clickText(page, 'ape in'));
  await wait(500);
  console.log('SEND IT click:', await clickText(page, 'SEND IT'));
  await wait(600);
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  console.log('canvas box', box);
  for (let gx=1; gx<=9; gx++) for (let gy=1; gy<=9; gy++) {
    const settled = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settledpanel"]'));
    if (settled) break;
    await page.mouse.click(box.x+box.w*gx/10, box.y+box.h*gy/10);
    await wait(250);
  }
  await wait(1000);
  const settled = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settledpanel"]'));
  console.log('settled?', settled);
  const bodyText = await page.evaluate(()=>document.body.innerText.slice(0,2000));
  console.log(bodyText);
  await page.screenshot({path:'debug-mobile.png', fullPage:true});
  await browser.close();
})();
