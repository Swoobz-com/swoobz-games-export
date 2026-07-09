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
async function scrollInfo(page, tag) {
  const info = await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]');
    return { scrollLeft: shell.scrollLeft, scrollWidth: shell.scrollWidth, clientWidth: shell.clientWidth, activeElement: document.activeElement ? document.activeElement.tagName + ':' + (document.activeElement.textContent||'').slice(0,20) : null };
  });
  console.log(tag, JSON.stringify(info));
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 768 });
  await page.goto('http://localhost:5340/', { waitUntil: 'networkidle0' });
  await wait(500);
  await scrollInfo(page, 'LOBBY');
  await clickText(page, 'ape in'); await wait(600);
  await scrollInfo(page, 'BETENTRY');
  await clickText(page, 'SEND IT', '[data-testid="vault-betentry-confirm"]'); await wait(700);
  await scrollInfo(page, 'PLAYING');
  await browser.close();
})();
