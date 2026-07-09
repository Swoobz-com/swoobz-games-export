import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return (
      els.find((e) => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
async function barH(page) {
  return await page.evaluate(() => {
    const el = document.querySelector('.vault-actionbar');
    if (!el) return null;
    return Math.round(el.getBoundingClientRect().height * 100) / 100;
  });
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const out = {};
  for (const h of [900, 1920]) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: h, deviceScaleFactor: 1 });
    await page.goto('http://localhost:5183/', { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(500);
    await clickText(page, 'ape in');
    await wait(400);
    await clickText(page, 'send it');
    await wait(700);
    out[`playing_barHeight_h${h}`] = await barH(page);
    await page.close();
  }
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
