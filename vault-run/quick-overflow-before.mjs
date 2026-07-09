import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickButtonText(page, matcher) {
  const h = await page.evaluateHandle((m) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    const visible = els.filter((e) => e.offsetParent !== null);
    return visible.find((e) => e.textContent.trim().toLowerCase() === m.toLowerCase()) || visible.find((e) => e.textContent.toLowerCase().includes(m.toLowerCase()));
  }, matcher);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
async function overflow(page) {
  return page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const out = {};
  for (const w of [1440, 1920, 390, 1608]) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: w === 390 ? 844 : (w === 1608 ? 872 : (w === 1920 ? 1080 : 900)), deviceScaleFactor: 1 });
    await page.goto('http://localhost:5181/', { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(600);
    const lobby = await overflow(page);
    await clickButtonText(page, 'ape in');
    await wait(500);
    const betentry = await overflow(page);
    out[w] = { lobby, betentry };
    await page.close();
  }
  await browser.close();
  console.log(JSON.stringify(out, null, 2));
})();
