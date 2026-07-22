import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5193';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function findButtonByText(page, t) {
  return await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return (
      els.find((e) => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
  }, t);
}
async function tapButtonByText(page, t) {
  const h = await findButtonByText(page, t);
  const el = h.asElement();
  if (!el) return { ok: false };
  const box = await el.boundingBox();
  if (!box) return { ok: false };
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  return { ok: true };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(400);
  await tapButtonByText(page, 'ape in');
  await wait(400);
  const modeHandle = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button')];
    return els.find((e) => e.offsetParent !== null && e.textContent.toUpperCase().includes(t));
  }, 'BLUECHIPS');
  const modeEl = modeHandle.asElement();
  console.log('mode el found:', !!modeEl);
  if (modeEl) {
    const mbox = await modeEl.boundingBox();
    console.log('mode box:', mbox);
    if (mbox) await page.touchscreen.tap(mbox.x + mbox.width/2, mbox.y + mbox.height/2);
  }
  await wait(200);
  const sendItRes = await tapButtonByText(page, 'send it');
  console.log('sendItRes:', sendItRes);
  await wait(700);
  console.log('isStillPlaying check text includes PUMPING/TRAIL/MANUAL:', await page.evaluate(() => ({
    hasPUMPING: document.body.textContent.includes('PUMPING'),
    hasTRAIL: document.body.textContent.includes('TRAIL'),
    hasMANUAL: document.body.textContent.includes('MANUAL'),
    phaseGuessBetEntry: document.body.textContent.includes('SEND IT'),
  })));
  console.log('after send it, phase text sample:', (await page.evaluate(() => document.body.textContent.slice(0, 400))));
  console.log('buttons visible:', await page.evaluate(() => [...document.querySelectorAll('button')].filter(b=>b.offsetParent!==null).map(b=>b.textContent.trim())));

  // reveal one tile
  const canvasHandle = await page.evaluateHandle(() => document.querySelector('canvas'));
  const canvasEl = canvasHandle.asElement();
  const cbox = await canvasEl.boundingBox();
  await page.touchscreen.tap(cbox.x + cbox.width*0.5, cbox.y + cbox.height*0.5);
  await wait(500);
  console.log('after 1 reveal tap, buttons:', await page.evaluate(() => [...document.querySelectorAll('button')].filter(b=>b.offsetParent!==null).map(b=>b.textContent.trim())));
  const tpEnabled = await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.toLowerCase().includes('take profit')); return b ? !b.disabled : null; });
  console.log('take profit enabled:', tpEnabled);

  await page.screenshot({ path: 'shots-mtqa-final/diag-after-reveal.png' });
  await browser.close();
})();
