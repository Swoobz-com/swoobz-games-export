import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PORT = process.argv[2] || '5183';
const TAG = process.argv[3] || 'before';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1920', width: 1920, height: 1080 },
];

async function measure(browser, vp) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 600));

  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const apeBtn = btns.find((b) => /ape in/i.test(b.textContent || ''));
    if (apeBtn) { apeBtn.click(); return true; }
    return false;
  });
  await new Promise((r) => setTimeout(r, 500));

  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="bet-console"]');
    if (el) el.scrollIntoView({ block: 'end' });
  });
  await new Promise((r) => setTimeout(r, 300));

  const data = await page.evaluate(() => {
    const toRect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
    };
    // Locate the TO WIN column via the label text "TO WIN".
    const labels = Array.from(document.querySelectorAll('span')).filter((s) => /^TO WIN$/i.test((s.textContent || '').trim()));
    const label = labels[0] || null;
    const toWinBox = label ? label.closest('div') : null; // the s.toWin flex row
    const column = toWinBox ? toWinBox.parentElement : null; // the s.columnToWin
    const value = toWinBox ? toWinBox.children[1] : null; // toWinValue span
    const sub = toWinBox ? toWinBox.children[2] : null; // toWinSub span (if present)
    return {
      column: toRect(column),
      pill: toRect(toWinBox),
      value: toRect(value),
      sub: toRect(sub),
      gapValueToSub: value && sub ? toRect(sub).left - toRect(value).right : null,
    };
  });

  fs.mkdirSync('shots', { recursive: true });
  await page.screenshot({ path: `shots/towinfix-${TAG}-D${vp.name}.png`, fullPage: false });
  await page.close();
  return { vp: vp.name, clicked, ...data };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const results = [];
  for (const vp of VIEWPORTS) {
    results.push(await measure(browser, vp));
  }
  await browser.close();
  fs.writeFileSync(`towin-gap-${TAG}.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})();
