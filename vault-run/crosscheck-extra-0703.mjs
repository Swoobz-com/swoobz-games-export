import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5243';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase())
      || els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}

async function probe(browser, w, h, panelRightLocalX, panelLocalTop, panelLocalHeight) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in');
  await wait(700);
  const offsets = [-60, -40, -20, -10, -3, 0, 3, 10, 20, 40, 60, 100];
  const localY = Math.round(panelLocalTop + panelLocalHeight / 2);
  const result = await page.evaluate(({ offsets, panelRightLocalX, localY }) => {
    const canvas = document.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    return offsets.map((off) => {
      const lx = Math.round(panelRightLocalX + off);
      if (lx < 0 || lx >= canvas.width) return { off, oob: true };
      const d = ctx.getImageData(lx, localY, 1, 1).data;
      return { off, rgb: [d[0], d[1], d[2]] };
    });
  }, { offsets, panelRightLocalX, localY });
  await page.close();
  return result;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  console.log('1440x900:', JSON.stringify(await probe(browser, 1440, 900, 955.52, 82.368, 620.243), null, 1));
  console.log('1920x1080:', JSON.stringify(await probe(browser, 1920, 1080, 1195.141, 98.841, 744.282), null, 1));
  await browser.close();
})();
