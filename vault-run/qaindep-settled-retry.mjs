import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto('http://localhost:5183/', { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 700));
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => /ape in/i.test(x.textContent || ''));
    if (b) b.click();
  });
  await new Promise((r) => setTimeout(r, 500));
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => /send it/i.test(x.textContent || ''));
    if (b) b.click();
  });
  await new Promise((r) => setTimeout(r, 900));
  // direct pixel click at a known tile position from the screenshot (row0 col0 ~ 516,213)
  await page.mouse.click(516, 213);
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: 'shots/qaindep-retry-afterclick.png' });
  const btnTexts = await page.evaluate(() => Array.from(document.querySelectorAll('button')).map(b => b.textContent));
  console.log(JSON.stringify(btnTexts));
  // click TAKE PROFIT / cash out
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => /take profit|cash/i.test(x.textContent || ''));
    if (b && !b.disabled) b.click();
  });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: 'shots/qaindep-retry-settled.png' });
  const hasConsole = await page.evaluate(() => !!document.querySelector('[data-testid="bet-console"]'));
  console.log('hasConsole settled:', hasConsole);
  await browser.close();
})();
