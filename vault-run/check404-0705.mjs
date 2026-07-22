import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5311';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false });
  const page = await browser.newPage();
  const fails = [];
  page.on('response', (r) => { if (r.status() === 404) fails.push(r.url()); });
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
  await wait(1500);
  console.log(JSON.stringify(fails, null, 2));
  await browser.close();
}
run();
