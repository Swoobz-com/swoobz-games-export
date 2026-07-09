import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5567';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return (els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase())));
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
async function tileCenter(page, gridSize, minimalBands, col, row) {
  return page.evaluate((gridSize, minimalBands, col, row) => {
    const c = document.querySelector('canvas');
    if (!c) return null;
    const rect = c.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    const wide = W / H > 1.2;
    const topReserved = minimalBands ? H * 0.035 : H * (wide ? 0.12 : 0.15);
    const bottomReserved = minimalBands ? H * 0.035 : H * (wide ? 0.14 : 0.18);
    const sideFrac = minimalBands ? 0.04 : 0.08;
    const safeW = W * (1 - sideFrac * 2);
    const safeH = (H - topReserved - bottomReserved) * 0.96;
    const available = Math.min(safeW, safeH);
    const gap = Math.max(6, available * 0.026);
    const tile = (available - gap * (gridSize - 1)) / gridSize;
    const full = tile * gridSize + gap * (gridSize - 1);
    const x = (W - full) / 2;
    const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2;
    const y = bandCenterY - full / 2;
    const cx = rect.left + x + col * (tile + gap) + tile / 2;
    const cy = rect.top + y + row * (tile + gap) + tile / 2;
    return { cx, cy };
  }, gridSize, minimalBands, col, row);
}
async function hudText(page) {
  return page.evaluate(() => {
    const row = document.querySelector('[data-testid="vault-hud-row"]');
    const banner = document.querySelector('[data-testid="vault-settled-banner"]');
    return { hud: row ? row.innerText : null, banner: banner ? banner.innerText : null };
  });
}
async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--window-size=1500,1000'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
  await wait(500);
  await clickText(page, 'ape in'); await wait(400);
  await clickText(page, 'SEND IT'); await wait(600);
  await clickText(page, 'MANUAL'); await wait(200);
  // tap ONE safe-ish tile then take profit (retry a few times if we rug immediately)
  for (let attempt = 0; attempt < 5; attempt++) {
    const p = await tileCenter(page, 5, true, attempt, 2);
    await page.mouse.click(p.cx, p.cy);
    await wait(250);
    const isRugged = await page.evaluate(() => !!document.querySelector('[data-testid="vault-ctl-cta"]')?.innerText.toLowerCase().includes('rugged'));
    if (isRugged) { console.log('hit a rug during win-attempt, retrying with a fresh round'); await wait(1200); await clickText(page,'bet again'); await wait(500); continue; }
    const took = await clickText(page, 'take profit');
    if (took) { await wait(800); break; }
  }
  console.log('WIN-CASE', JSON.stringify(await hudText(page)));
  await browser.close();
}
run();
