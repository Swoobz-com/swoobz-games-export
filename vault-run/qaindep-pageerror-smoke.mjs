import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.argv[2] || '5181';
const browser = await puppeteer.launch({ executablePath: EXE, headless: false, defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 }, args: ['--window-size=1460,1040'] });
const page = (await browser.pages())[0];
let errCount = 0;
page.on('pageerror', (e) => { errCount++; console.log('PAGEERROR:', e.message); });
page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) console.log('CONSOLE ERROR:', m.text().slice(0,150)); });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
await wait(1300);
async function clickText(t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return els.find(e => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase())
      || els.find(e => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, t);
  const el = h.asElement(); if (!el) return false; await el.click(); return true;
}
await clickText('ape in'); await wait(700);
await clickText('send it'); await wait(900);
await clickText('take profit'); await wait(900);
await clickText('bet again'); await wait(900);
console.log('pageerror total:', errCount);
await browser.close();
