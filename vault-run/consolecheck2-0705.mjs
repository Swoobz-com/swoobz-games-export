import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--window-size=1500,1000'] });
  const page = await browser.newPage();
  const fails = [];
  page.on('response', (r) => { if (r.status() >= 400) fails.push(r.status() + ' ' + r.url()); });
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5567/', { waitUntil: 'networkidle2' });
  await wait(800);
  console.log(JSON.stringify(fails, null, 2));
  await browser.close();
}
run();
