import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const files = [
  { in: 'shots/qaindep-towin-before-D1920.png', out: 'shots/crop-before-col3-1920.png' },
  { in: 'shots/qaindep-towin-after-D1920.png', out: 'shots/crop-after-col3-1920.png' },
];
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  for (const f of files) {
    const buf = fs.readFileSync(f.in);
    const b64 = buf.toString('base64');
    await page.setViewport({ width: 1000, height: 300 });
    await page.setContent(`<img id="i" src="data:image/png;base64,${b64}">`);
    await page.evaluate(() => new Promise((res) => { const i = document.getElementById('i'); if (i.complete) res(); else i.onload = res; }));
    // crop region: x 1340-1920 (col3 area), y 800-960 (approx panel row for toWin at 1920 vp)
    await page.evaluate(() => {
      const i = document.getElementById('i');
      i.style.position = 'absolute';
      i.style.left = '-1340px';
      i.style.top = '-800px';
    });
    await page.screenshot({ path: f.out, clip: { x: 0, y: 0, width: 580, height: 160 } });
  }
  await browser.close();
})();
