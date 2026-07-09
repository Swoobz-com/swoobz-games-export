import puppeteer from 'puppeteer-core';

const PORT = process.argv[2] || '5182';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function clickByText(page, regex) {
  return page.evaluate((src) => {
    const re = new RegExp(src, 'i');
    const els = Array.from(document.querySelectorAll('button'));
    const el = els.find((b) => re.test(b.textContent || '') && !b.disabled);
    if (el) { el.click(); return true; }
    return false;
  }, regex.source);
}

async function openedCount(page) {
  return page.evaluate(() => {
    const m = document.body.textContent.match(/OPEN\s*(\d+)\s+of\s+\d+/i);
    return m ? parseInt(m[1], 10) : -1;
  });
}

async function run(vp, tag) {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1, isMobile: vp.mobile || false });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await delay(500);
  await page.screenshot({ path: `shots/regress2-${tag}-lobby.png`, fullPage: true });

  await clickByText(page, /ape in/);
  await delay(400);
  await page.screenshot({ path: `shots/regress2-${tag}-betentry.png`, fullPage: true });

  await clickByText(page, /send it/);
  await delay(700);
  await page.screenshot({ path: `shots/regress2-${tag}-playing.png`, fullPage: true });

  // Real mouse taps across a grid of candidate points within the canvas until
  // at least one tile opens (grid position unknown in advance per viewport).
  const canvasRect = await page.evaluate(() => {
    const c = document.querySelector('[data-testid="vault-canvas-shell"] canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  });

  let opened = await openedCount(page);
  const fracs = [];
  for (let ry = 0.18; ry <= 0.82; ry += 0.16) {
    for (let rx = 0.35; rx <= 0.68; rx += 0.078) {
      fracs.push([rx, ry]);
    }
  }
  for (const [rx, ry] of fracs) {
    if (opened >= 3) break;
    const x = canvasRect.left + canvasRect.width * rx;
    const y = canvasRect.top + canvasRect.height * ry;
    await page.mouse.click(x, y);
    await delay(350);
    opened = await openedCount(page);
  }

  await delay(300);
  const cashedOut = await clickByText(page, /take profit/);
  await delay(1300);
  await page.screenshot({ path: `shots/regress2-${tag}-settled.png`, fullPage: true });

  await browser.close();
  return { tag, opened, cashedOut };
}

(async () => {
  const results = [];
  results.push(await run({ width: 1440, height: 900 }, 'D1440'));
  results.push(await run({ width: 1920, height: 1080 }, 'D1920'));
  results.push(await run({ width: 390, height: 844, mobile: true }, 'M390'));
  console.log(JSON.stringify(results, null, 2));
})();
