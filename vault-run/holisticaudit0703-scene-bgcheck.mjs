import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5313';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', defaultViewport: { width: 1440, height: 900 } });
const page = await browser.newPage();
const bgReqs = [];
page.on('response', (resp) => {
  if (resp.url().includes('backdrop-')) bgReqs.push(`${resp.status()} ${resp.url()}`);
});
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
await wait(3000); // let all 3 lazy-load if preloaded, or just default world
console.log(JSON.stringify(bgReqs, null, 2));
await browser.close();
