import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto('http://localhost:5183/', { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(500);
  const r = await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]');
    const cabinet = shell.parentElement;
    const cs = (el) => { const c = getComputedStyle(el); return { display: c.display, flexDirection: c.flexDirection, alignItems: c.alignItems, flexGrow: c.flexGrow, height: c.height }; };
    return { shell: cs(shell), cabinet: cs(cabinet) };
  });
  console.log(JSON.stringify(r, null, 2));
  await browser.close();
})();
