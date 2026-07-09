import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.on('response', (r) => { if (r.status() >= 400) console.log(r.status(), r.url()); });
  await page.evaluateOnNewDocument(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto('http://localhost:5390/', { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1500);
  // click through worlds to trigger their backdrop loads
  for (const w of ['bluechips', 'altseason', 'shitcoin']) {
    await page.evaluate((slug) => { const el = document.querySelector(`[data-testid="vault-world-card-${slug}"]`); if (el) el.click(); }, w);
    await wait(600);
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
