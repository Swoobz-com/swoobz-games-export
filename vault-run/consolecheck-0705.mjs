import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return (els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase())));
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--window-size=1500,1000'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => errors.push('requestfailed: ' + r.url()));
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5567/', { waitUntil: 'networkidle2' });
  await wait(500);
  await clickText(page, 'ape in'); await wait(400);
  await clickText(page, 'SEND IT'); await wait(600);
  await clickText(page, 'take profit'); await wait(600);
  await clickText(page, 'bet again'); await wait(500);
  console.log('CONSOLE ERRORS:', JSON.stringify(errors, null, 2));
  await browser.close();
}
run();
