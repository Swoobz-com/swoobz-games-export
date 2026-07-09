import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PORT = process.argv[2] || '5182';
const TAG = process.argv[3] || 'before';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1920', width: 1920, height: 1080 },
];

async function shot(browser, vp) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 600));

  // Navigate to bet-entry: click "ape in ->" button on lobby
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const apeBtn = btns.find((b) => /ape in/i.test(b.textContent || ''));
    if (apeBtn) { apeBtn.click(); return true; }
    return false;
  });
  await new Promise((r) => setTimeout(r, 500));

  const rects = await page.evaluate(() => {
    const board = document.querySelector('[data-testid="vault-canvas-shell"]');
    const console_ = document.querySelector('[data-testid="bet-console"]');
    const toRect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
    };
    return { board: toRect(board), console: toRect(console_), clicked_ok: !!console_ };
  });

  await page.screenshot({ path: `shots/betconsole-width-${TAG}-D${vp.name}.png`, fullPage: false });
  await page.close();
  return { vp: vp.name, clicked, rects };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const results = [];
  for (const vp of VIEWPORTS) {
    results.push(await shot(browser, vp));
  }
  await browser.close();
  fs.writeFileSync(`betconsole-width-${TAG}-measure.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})();
