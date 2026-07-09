import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--window-size=1500,1000'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5567/', { waitUntil: 'networkidle2' });
  await wait(500);
  const info = await page.evaluate(() => {
    const recents = document.querySelector('[aria-label="recent rounds"]');
    const pageRoot = document.body.firstElementChild;
    const headerTape = pageRoot ? pageRoot.firstElementChild : null;
    return {
      pageRootTag: pageRoot ? pageRoot.tagName + '.' + pageRoot.className : null,
      headerTapeTag: headerTape ? headerTape.tagName + ' testid=' + headerTape.getAttribute('data-testid') : null,
      headerTapeRect: headerTape ? headerTape.getBoundingClientRect().toJSON?.() ?? JSON.stringify(headerTape.getBoundingClientRect()) : null,
      recentsRect: recents ? JSON.stringify(recents.getBoundingClientRect()) : null,
      recentsCount: document.querySelectorAll('[aria-label="recent rounds"]').length,
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
}
run();
