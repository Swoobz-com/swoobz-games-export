import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const GUTTER_TESTIDS = [
  'vault-gutter-left', 'vault-gutter-right', 'vault-gutter-card-a',
  'vault-gutter-card-a-right', 'vault-gutter-card-b', 'vault-gutter-card-c',
  'vault-playing-left', 'vault-playing-right', 'vault-playing-status', 'vault-playing-actions',
];
async function findButtonByText(page, t) {
  return await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return els.find((e) => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, t);
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  for (const dev of [{ w: 412, h: 915 }, { w: 393, h: 852 }]) {
    const page = await browser.newPage();
    await page.setViewport({ width: dev.w, height: dev.h, hasTouch: true, isMobile: true });
    await page.goto('http://localhost:5301/', { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(400);
    const apeH = await findButtonByText(page, 'ape in'); await apeH.asElement().click(); await wait(400);
    const sendH = await findButtonByText(page, 'send it'); await sendH.asElement().click(); await wait(700);
    const counts = await page.evaluate((ids) => {
      const out = {};
      for (const id of ids) out[id] = document.querySelectorAll(`[data-testid="${id}"]`).length;
      return out;
    }, GUTTER_TESTIDS);
    console.log(`${dev.w}x${dev.h} PLAYING phase gutter counts:`, JSON.stringify(counts));
    await page.close();
  }
  await browser.close();
})();
