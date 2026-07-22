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
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto('http://localhost:5181/', { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(700);
  await clickButtonText(page, 'ape in');
  await wait(500);
  await clickButtonText(page, 'send it');
  await wait(800);
  const r = await page.evaluate(() => {
    const bar = document.querySelector('.vault-actionbar');
    const cs = getComputedStyle(bar);
    return { backgroundImage: cs.backgroundImage, borderTopColor: cs.borderTopColor, borderRadius: cs.borderRadius, backdropFilter: cs.backdropFilter };
  });
  console.log(JSON.stringify(r));
  await browser.close();
})();
