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
  await page.setViewport({ width: 412, height: 915, hasTouch: true, isMobile: true });
  await page.goto('http://localhost:5301/', { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(400);
  const apeH = await findButtonByText(page, 'ape in'); await apeH.asElement().click(); await wait(400);
  const sendH = await findButtonByText(page, 'send it'); await sendH.asElement().click(); await wait(700);
  const canvasBox = await (async () => {
    const h = await page.evaluateHandle(() => document.querySelector('canvas'));
    const el = h.asElement();
    return el ? await el.boundingBox() : null;
  })();
  await page.touchscreen.tap(canvasBox.x + canvasBox.width*0.5, canvasBox.y + canvasBox.height*0.5);
  await wait(500);
  const tpEnabled = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x=>x.textContent.toLowerCase().includes('take profit'));
    return b ? !b.disabled : false;
  });
  if (tpEnabled) {
    const tp = await findButtonByText(page, 'take profit');
    await tp.asElement().click();
    await wait(700);
  }
  const texts = await page.evaluate(() => [...document.querySelectorAll('button')].filter(b=>b.textContent.toLowerCase().includes('bet again')).map(b=>({text: b.textContent.trim(), box: b.getBoundingClientRect().toJSON()})));
  console.log(JSON.stringify(texts, null, 2));
  await browser.close();
})();
