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
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 600));

  // Navigate to bet-entry: click "ape in ->" button on lobby
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const apeBtn = btns.find((b) => /ape in/i.test(b.textContent || ''));
    if (apeBtn) { apeBtn.click(); return true; }
    return false;
  });
  await new Promise((r) => setTimeout(r, 500));

  // The console can be taller than the viewport (board + panel stacked in a
  // scrolling page) — scroll the panel fully into view before measuring/
  // screenshotting so the footer/TO-WIN/mode-row aren't clipped off-frame.
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="bet-console"]');
    if (el) el.scrollIntoView({ block: 'end' });
  });
  await new Promise((r) => setTimeout(r, 300));

  const measure = await page.evaluate(() => {
    const toRect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
    };
    const board = document.querySelector('[data-testid="vault-canvas-shell"]');
    const panel = document.querySelector('[data-testid="bet-console"]');
    // The wager stepper block, mode-selector row, and TO WIN block — used to
    // gauge how wide col2 (the mode-card grid) actually renders.
    const modeRows = Array.from(document.querySelectorAll('.vault-mode-row'));
    const modeRow = modeRows[0] || null;
    const modeCards = modeRow ? Array.from(modeRow.querySelectorAll('button')) : [];
    const modeCardRect = modeCards[0] ? toRect(modeCards[0]) : null;
    return {
      board: toRect(board),
      panel: toRect(panel),
      modeRow: toRect(modeRow),
      modeRowCount: modeRows.length,
      modeCardWidth: modeCardRect ? modeCardRect.width : null,
      modeCardCount: modeCards.length,
    };
  });

  fs.mkdirSync('shots', { recursive: true });
  await page.screenshot({ path: `shots/columnsfix-${TAG}-D${vp.name}.png`, fullPage: false });
  await page.close();
  return { vp: vp.name, clicked, measure };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const results = [];
  for (const vp of VIEWPORTS) {
    results.push(await shot(browser, vp));
  }
  await browser.close();
  fs.writeFileSync(`columnsfix-${TAG}-measure.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})();
