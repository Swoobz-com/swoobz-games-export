import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function findButtonByText(page, t) {
  return await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return els.find((e) => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, t);
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 800 });
  await page.goto('http://localhost:5301/', { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(400);
  const apeH = await findButtonByText(page, 'ape in'); await apeH.asElement().click(); await wait(400);
  const sendH = await findButtonByText(page, 'send it'); await sendH.asElement().click(); await wait(600);
  await page.screenshot({ path: 'shots-holisticaudit0703/mtqa/reference-1440x800-playing.png' });
  await browser.close();
})();
