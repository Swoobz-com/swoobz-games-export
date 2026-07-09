import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.argv[2] || '5182';

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: false,
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  args: [`--window-size=1460,1040`, '--autoplay-policy=no-user-gesture-required'],
});
const page = (await browser.pages())[0];
page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
page.on('pageerror', err => console.log('PAGEERROR:', err.message));
page.on('requestfailed', req => console.log('REQFAIL:', req.url(), req.failure()?.errorText));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
await wait(2000);

const bodyHtmlLen = await page.evaluate(() => document.body.innerHTML.length);
console.log('bodyHtmlLen', bodyHtmlLen);
const hasErrorOverlay = await page.evaluate(() => !!document.querySelector('vite-error-overlay'));
console.log('hasErrorOverlay', hasErrorOverlay);
if (hasErrorOverlay) {
  const errText = await page.evaluate(() => document.querySelector('vite-error-overlay').shadowRoot.textContent);
  console.log('ERROR OVERLAY TEXT:', errText);
}
await page.screenshot({ path: 'shots/rebet-probe-initial.png' });
await browser.close();
