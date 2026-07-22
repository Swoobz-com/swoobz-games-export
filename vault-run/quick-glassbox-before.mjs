import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickButtonText(page, matcher) {
  const h = await page.evaluateHandle((m) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    const visible = els.filter((e) => e.offsetParent !== null);
    return visible.find((e) => e.textContent.trim().toLowerCase() === m.toLowerCase()) || visible.find((e) => e.textContent.toLowerCase().includes(m.toLowerCase()));
  }, matcher);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
async function tileCenter(page, idx, g) {
  return page.evaluate(({ idx, g }) => {
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
  }, { idx, g });
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto('http://localhost:5181/', { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(700);
  await clickButtonText(page, 'ape in');
  await wait(500);
  await clickButtonText(page, 'send it');
  await wait(800);
  let settled = false;
  for (let i = 0; i < 25 && !settled; i++) {
    await page.evaluate(() => window.scrollTo(0, 0));
    const { cx, cy } = await tileCenter(page, i, 5);
    await page.mouse.click(cx, cy);
    await wait(350);
    settled = await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'));
  }
  await wait(500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'shots/PREVBG-settled-before-glassbox.png' });
  await clickButtonText(page, 'view receipt');
  await wait(500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'shots/PREVBG-settled-glassbox-open.png' });
  await browser.close();
})();
