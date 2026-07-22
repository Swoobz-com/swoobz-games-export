import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5196';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickButtonContaining(page, needle) {
  const handle = await page.evaluateHandle((needle) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const lower = needle.toLowerCase();
    return buttons.find((b) => b.offsetParent !== null && b.textContent.trim().toLowerCase().includes(lower)) || null;
  }, needle);
  const el = handle.asElement();
  if (!el) throw new Error(`Button containing "${needle}" not found`);
  await el.click();
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(500);
  await clickButtonContaining(page, 'ape in');
  await wait(600);
  // in bet-entry: place the bet to reach 'playing'
  await clickButtonContaining(page, 'send it');
  await wait(900);
  const phaseText = await page.evaluate(() => document.body.textContent.slice(0, 400));
  const pulse = await page.evaluate(() => ({
    cardA: document.querySelectorAll('[data-testid="vault-gutter-card-a"]').length,
    cardAright: document.querySelectorAll('[data-testid="vault-gutter-card-a-right"]').length,
  }));
  console.log(JSON.stringify({ phaseSnippetHasPumping: phaseText.includes('PUMPING'), pulse }, null, 2));
  await browser.close();
})();
