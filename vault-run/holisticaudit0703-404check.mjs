import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: false, defaultViewport: { width: 1440, height: 900 } });
  const page = (await browser.pages())[0];
  page.on('requestfailed', (r) => console.log('FAILED:', r.url(), r.failure()?.errorText));
  page.on('response', (r) => { if (r.status() >= 400) console.log('BAD STATUS', r.status(), r.url()); });
  await page.goto('http://localhost:5305/', { waitUntil: 'networkidle2' });
  await wait(1500);
  await browser.close();
})();
