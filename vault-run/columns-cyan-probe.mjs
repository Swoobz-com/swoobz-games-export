import puppeteer from 'puppeteer-core';

const PORT = process.argv[2] || '5182';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function isCyanish(rgb) {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(rgb || '');
  if (!m) return false;
  const [, r, g, b] = m.map(Number);
  return g > 140 && b > 140 && r < 120 && Math.abs(g - b) < 60;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(600);
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find((x) => (x.textContent || '').toLowerCase().includes('ape in'));
    if (b) b.click();
  });
  await wait(500);
  const hits = await page.evaluate((fnStr) => {
    const isCyanish = new Function('rgb', fnStr);
    const panel = document.querySelector('[data-testid="bet-console"]');
    if (!panel) return { error: 'no panel' };
    const all = [panel, ...panel.querySelectorAll('*')];
    const found = [];
    for (const el of all) {
      const cs = getComputedStyle(el);
      for (const prop of ['color', 'backgroundColor', 'borderColor', 'borderLeftColor', 'boxShadow']) {
        const v = cs[prop];
        if (v && isCyanish(v)) found.push({ tag: el.tagName, cls: el.className, prop, v });
      }
    }
    return { count: found.length, found: found.slice(0, 20) };
  }, `return (${isCyanish.toString()})(rgb)`);
  console.log(JSON.stringify(hits, null, 2));
  await browser.close();
})();
