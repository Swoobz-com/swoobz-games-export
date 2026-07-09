import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5311';
const SHOTS = 'shots-holisticaudit0703/brand';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  // open help / how-to-play via corner-help testid
  const opened = await page.evaluate(() => {
    const b = document.querySelector('[data-testid="vault-corner-help"]');
    if (b) { b.click(); return true; }
    return false;
  });
  await wait(400);
  const bodyText = await page.evaluate(() => document.body.textContent);
  const emDashCount = (bodyText.match(/—/g) || []).length;
  console.log('HELP MODAL opened:', opened, 'live em-dash count on page:', emDashCount);
  await page.screenshot({ path: `${SHOTS}/howtoplay-modal-emdash-live.png` });
  await browser.close();
})();
