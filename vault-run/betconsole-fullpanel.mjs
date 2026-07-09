import puppeteer from 'puppeteer-core';

const PORT = process.argv[2] || '5182';
const TAG = process.argv[3] || 'after';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1920', width: 1920, height: 1080 },
];

async function shot(browser, vp) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 600));
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const apeBtn = btns.find((b) => /ape in/i.test(b.textContent || ''));
    if (apeBtn) apeBtn.click();
  });
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: `shots/betconsole-fullpanel-${TAG}-D${vp.name}.png`, fullPage: true });
  await page.close();
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  for (const vp of VIEWPORTS) await shot(browser, vp);
  await browser.close();
})();
