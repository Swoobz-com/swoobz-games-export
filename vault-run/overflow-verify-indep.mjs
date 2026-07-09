import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.argv[2] || '5183';
const browser = await puppeteer.launch({ executablePath: EXE, headless: false, defaultViewport: { width: 390, height: 844, deviceScaleFactor: 1 }, args: ['--window-size=410,984','--autoplay-policy=no-user-gesture-required'] });
const page = (await browser.pages())[0];
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
await wait(1500);
const r = await page.evaluate(() => {
  const iw = window.innerWidth;
  const wide = [...document.querySelectorAll('*')].filter(e => e.getBoundingClientRect().right > iw + 1).map(e => ({tag:e.tagName, cls:(e.className||'').toString().slice(0,40), right: e.getBoundingClientRect().right}));
  return { innerWidth: iw, docScrollWidth: document.documentElement.scrollWidth, docClientWidth: document.documentElement.clientWidth, bodyScrollWidth: document.body.scrollWidth, wideElementCount: wide.length, wideElements: wide.slice(0,10), hasVerticalScrollbar: window.innerWidth !== document.documentElement.clientWidth };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
