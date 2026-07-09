import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5311';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()));
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
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
  await wait(500);
  await clickText(page, 'ape in');
  await wait(500);
  // click gear icon (corner top-left) to sanity-check EXIT AT popover still works
  await page.evaluate(() => document.querySelector('[data-testid="vault-corner-gear"] button')?.click());
  await wait(300);
  const gearPopoverPresent = await page.evaluate(() => !!document.querySelector('[data-testid="vault-corner-gear-popover"]'));
  await clickText(page, 'SEND IT');
  await wait(700);
  await clickText(page, 'MANUAL');
  await wait(400);
  console.log(JSON.stringify({ errors, gearPopoverPresent }, null, 2));
  await browser.close();
}
run().catch((e) => { console.error(e); process.exit(1); });
