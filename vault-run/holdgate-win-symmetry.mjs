import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5184';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return (
      els.find((e) => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}

async function cellCenter(page, idx, g) {
  return await page.evaluate(
    ({ idx, g }) => {
      const c = document.querySelector('canvas');
      const r = c.getBoundingClientRect();
      const W = r.width, H = r.height;
      const tR = H * 0.15, bR = H * 0.18, sF = 0.08;
      const sW = W * (1 - sF * 2);
      const sH = (H - tR - bR) * 0.96;
      const av = Math.min(sW, sH);
      const gap = Math.max(6, av * 0.026);
      const tile = (av - gap * (g - 1)) / g;
      const full = tile * g + gap * (g - 1);
      const x0 = (W - full) / 2;
      const by = tR + (H - tR - bR) / 2;
      const y0 = by - full / 2;
      const col = idx % g, row = Math.floor(idx / g);
      return { cx: r.left + x0 + col * (tile + gap) + tile / 2, cy: r.top + y0 + row * (tile + gap) + tile / 2 };
    },
    { idx, g }
  );
}

async function settledNow(page) {
  return await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'));
}
async function isWin(page) {
  return await page.evaluate(() => /SETTLED\s*·\s*WIN/i.test(document.body.textContent));
}
async function dividers(page, sel) {
  return await page.evaluate((sel) => {
    const bar = document.querySelector(sel);
    if (!bar) return null;
    const kids = [...bar.children].filter((k) => getComputedStyle(k).display !== 'none');
    return kids.map((k) => {
      const r = k.getBoundingClientRect();
      const cs = getComputedStyle(k);
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height), borderRightWidth: cs.borderRightWidth, borderRightColor: cs.borderRightColor };
    });
  }, sel);
}
async function surface(page, sel) {
  return await page.evaluate((sel) => {
    const bar = document.querySelector(sel);
    if (!bar) return null;
    const cs = getComputedStyle(bar);
    return { background: cs.backgroundImage, borderTopColor: cs.borderTopColor, borderRadius: cs.borderRadius, padding: cs.padding, gap: cs.gap };
  }, sel);
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(700);

  await clickText(page, 'ape in');
  await wait(500);
  await clickText(page, 'send it');
  await wait(800);

  // click a single safe-looking tile then immediately take profit -> aim for WIN
  let attempt = 0;
  let win = false;
  while (attempt < 5 && !win) {
    attempt++;
    // reveal one tile
    const idx = [0, 4, 20, 24, 12][attempt - 1];
    const { cx, cy } = await cellCenter(page, idx, 5);
    await page.mouse.click(cx, cy);
    await wait(400);
    const done = await settledNow(page);
    if (done) {
      // mine-hit -> settled as loss; restart a fresh round
      win = await isWin(page);
      if (!win) {
        await clickText(page, 'bet again');
        await wait(700);
        continue;
      }
    } else {
      // still playing -> cash out now for a guaranteed WIN
      await clickText(page, 'take profit');
      await wait(800);
      win = await isWin(page);
    }
  }

  const out = {
    attempt,
    win,
    settledOutcome: win ? 'WIN' : 'UNKNOWN',
    settledDividers: await dividers(page, '[data-testid="vault-settledpanel"]'),
    settledSurface: await surface(page, '[data-testid="vault-settledpanel"]'),
  };
  await page.screenshot({ path: `shots/holdgate-win-1440.png`, fullPage: false });
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
