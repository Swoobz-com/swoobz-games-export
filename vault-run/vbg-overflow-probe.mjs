// Overflow measurement + screenshot for a given viewport, tagged before/after.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PORT = process.argv[2] || '5181';
const TAG = process.argv[3] || 'before';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const VIEWPORTS = [
  { name: 'D1440', width: 1440, height: 900 },
  { name: 'D1920', width: 1920, height: 1080 },
  { name: 'M390', width: 390, height: 844 },
];

async function overflowWalk(page) {
  return await page.evaluate(() => {
    const doc = document.documentElement;
    const scrollWidth = doc.scrollWidth;
    const clientWidth = doc.clientWidth;
    const overflowing = [];
    const all = document.querySelectorAll('body *');
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.right > clientWidth + 0.5 || r.left < -0.5) {
        overflowing.push({
          tag: el.tagName,
          cls: (el.className || '').toString().slice(0, 80),
          testid: el.getAttribute && el.getAttribute('data-testid'),
          left: Math.round(r.left),
          right: Math.round(r.right),
          width: Math.round(r.width),
          overflowRight: Math.round(r.right - clientWidth),
        });
      }
    }
    // Sort by how far right they overflow, most offending first.
    overflowing.sort((a, b) => b.overflowRight - a.overflowRight);
    return { scrollWidth, clientWidth, hasOverflow: scrollWidth > clientWidth + 1, topOffenders: overflowing.slice(0, 8) };
  });
}

async function run(browser, vp) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 600));

  // Navigate to bet-entry (the reported bug phase).
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const apeBtn = btns.find((b) => /ape in/i.test(b.textContent || ''));
    if (apeBtn) apeBtn.click();
  });
  await new Promise((r) => setTimeout(r, 500));

  const betentry = await overflowWalk(page);
  fs.mkdirSync('shots', { recursive: true });
  await page.screenshot({ path: `shots/vbg-overflow-${TAG}-${vp.name}-betentry.png`, fullPage: true });

  await page.close();
  return { vp: vp.name, phase: 'betentry', ...betentry };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const results = [];
  for (const vp of VIEWPORTS) {
    results.push(await run(browser, vp));
  }
  await browser.close();
  fs.writeFileSync(`vbg-overflow-${TAG}.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})();
