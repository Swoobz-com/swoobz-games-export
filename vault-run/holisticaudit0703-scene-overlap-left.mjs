import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5313';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return els.find((e) => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase())
      || els.find((e) => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', defaultViewport: { width: 1024, height: 768 } });
const page = await browser.newPage();
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
await wait(500);
await clickText(page, 'ape in');
await wait(400);
await clickText(page, 'send it');
await wait(900);
const data = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  const r = c.getBoundingClientRect();
  const W = r.width, H = r.height;
  const sideFrac = 0.08;
  const safeW = W * (1 - sideFrac * 2);
  const wide = W / H > 1.2;
  const topReserved = H * (wide ? 0.12 : 0.15);
  const bottomReserved = H * (wide ? 0.14 : 0.18);
  const safeH = (H - topReserved - bottomReserved) * 0.96;
  const available = Math.min(safeW, safeH);
  const x = (W - available) / 2; // approx (full<=available, close enough for left edge est. use full formula properly below)
  const gridLeftCss = r.left + x;
  const leftCard = document.querySelector('[data-testid="vault-playing-left"]');
  const leftRect = leftCard ? leftCard.getBoundingClientRect() : null;
  return { gridLeftCss, leftRect: leftRect ? {left:leftRect.left, right:leftRect.right, top:leftRect.top, bottom:leftRect.bottom} : null,
    overlapPx: leftRect ? leftRect.right - gridLeftCss : null };
});
console.log('LEFT STATUS card vs grid left edge @1024x768:', JSON.stringify(data, null, 2));
await page.screenshot({ path: 'shots-holisticaudit0703/scene/overlapcheck-left-1024x768.png' });
await browser.close();
