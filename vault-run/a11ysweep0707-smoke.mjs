import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ERR', m.text()); });
  await page.evaluateOnNewDocument(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto('http://localhost:5390/', { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1500);
  const testids = await page.evaluate(() => [...document.querySelectorAll('[data-testid]')].map(e => e.getAttribute('data-testid')));
  console.log('TESTIDS:', JSON.stringify([...new Set(testids)], null, 2));
  const buttons = await page.evaluate(() => [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(Boolean));
  console.log('BUTTONS:', JSON.stringify(buttons));
  await page.screenshot({ path: 'shots-a11ysweep-2026-07-07/smoke-betentry.png', fullPage: false });
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
