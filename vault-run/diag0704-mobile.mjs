import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickText(page, t, within) {
  const h = await page.evaluateHandle(({ t, within }) => {
    const root = within ? document.querySelector(within) : document;
    if (!root) return null;
    const els = [...root.querySelectorAll('button,[role=button]')];
    return els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, { t, within });
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:5340/', { waitUntil: 'networkidle0' });
  await wait(500);
  await page.screenshot({ path: 'shots-vaultfix-0704/mobile-lobby.png', fullPage: true });
  await clickText(page, 'ape in'); await wait(600);
  await page.screenshot({ path: 'shots-vaultfix-0704/mobile-betentry.png', fullPage: true });
  await clickText(page, 'SEND IT'); await wait(700);
  await page.screenshot({ path: 'shots-vaultfix-0704/mobile-playing.png', fullPage: true });
  await browser.close();
})();
