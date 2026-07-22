import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = process.argv[2] || '5317';
const S = 'shots-holisticaudit0703/a11y/';
const browser = await puppeteer.launch({
  executablePath: EXE, headless: false,
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 3 },
  args: ['--window-size=1460,1040'],
});
const page = (await browser.pages())[0];
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
await wait(1200);
await page.evaluate(() => document.activeElement && document.activeElement.blur());
await page.keyboard.press('Tab');
await wait(150);
const rect = await page.evaluate(() => {
  const r = document.activeElement.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
await page.screenshot({
  path: S + 'ZOOM-lobby-apein-focus.png',
  clip: { x: Math.max(0, rect.x - 40), y: Math.max(0, rect.y - 40), width: rect.w + 80, height: rect.h + 80 },
});
console.log('rect', rect);
await browser.close();
