import puppeteer from 'puppeteer-core';

const PORT = process.argv[2] || '5182';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function clickByText(page, regex) {
  return page.evaluate((src) => {
    const re = new RegExp(src, 'i');
    const els = Array.from(document.querySelectorAll('button'));
    const el = els.find((b) => re.test(b.textContent || ''));
    if (el) { el.click(); return true; }
    return false;
  }, regex.source);
}

async function run(vp, tag) {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1, isMobile: vp.mobile || false });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await delay(500);

  // Lobby
  await page.screenshot({ path: `shots/regress-${tag}-lobby.png`, fullPage: true });

  // -> bet-entry
  await clickByText(page, /ape in/);
  await delay(400);
  await page.screenshot({ path: `shots/regress-${tag}-betentry.png`, fullPage: true });

  // -> playing: click SEND IT
  await clickByText(page, /send it/);
  await delay(700);
  await page.screenshot({ path: `shots/regress-${tag}-playing.png`, fullPage: true });

  // tap a few tiles to try to settle (take-profit) — click canvas center a few times, then look for a TAKE PROFIT / CASH OUT button
  for (let i = 0; i < 3; i++) {
    const acted = await page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="vault-canvas-shell"] canvas');
      if (!canvas) return false;
      const r = canvas.getBoundingClientRect();
      const x = r.left + r.width * (0.35 + 0.1 * Math.random());
      const y = r.top + r.height * (0.3 + 0.1 * Math.random());
      const ev = new MouseEvent('click', { bubbles: true, clientX: x, clientY: y });
      canvas.dispatchEvent(ev);
      return true;
    });
    await delay(500);
    if (!acted) break;
  }
  await delay(300);
  const cashedOut = await clickByText(page, /take profit|cash out/);
  await delay(1200);
  await page.screenshot({ path: `shots/regress-${tag}-settled.png`, fullPage: true });

  await browser.close();
  return { tag, cashedOut };
}

(async () => {
  const results = [];
  results.push(await run({ width: 1440, height: 900 }, 'D1440'));
  results.push(await run({ width: 1920, height: 1080 }, 'D1920'));
  results.push(await run({ width: 390, height: 844, mobile: true }, 'M390'));
  console.log(JSON.stringify(results, null, 2));
})();
