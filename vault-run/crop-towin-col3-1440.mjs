import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const files = [
  { in: 'shots/qaindep-towin-before-D1440.png', out: 'shots/crop-before-col3-1440.png' },
  { in: 'shots/qaindep-towin-after-D1440.png', out: 'shots/crop-after-col3-1440.png' },
];
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  for (const f of files) {
    const buf = fs.readFileSync(f.in);
    const b64 = buf.toString('base64');
    await page.setViewport({ width: 800, height: 300 });
    await page.setContent(`<img id="i" src="data:image/png;base64,${b64}">`);
    await page.evaluate(() => new Promise((res) => { const i = document.getElementById('i'); if (i.complete) res(); else i.onload = res; }));
    await page.evaluate(() => {
      const i = document.getElementById('i');
      i.style.position = 'absolute';
      i.style.left = '-1010px';
      i.style.top = '-620px';
    });
    await page.screenshot({ path: f.out, clip: { x: 0, y: 0, width: 400, height: 160 } });
  }
  await browser.close();
})();
