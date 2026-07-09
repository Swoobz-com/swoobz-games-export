import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
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
async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--window-size=1500,1000'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5567/', { waitUntil: 'networkidle2' });
  await wait(500);
  await clickText(page, 'ape in'); await wait(400);
  await clickText(page, 'SEND IT'); await wait(600);
  await clickText(page, 'take profit').catch(()=>{});
  await wait(300);
  const p = await tileCenter(page, 5, true, 0, 0);
  await page.mouse.click(p.cx, p.cy); await wait(300);
  await clickText(page, 'take profit'); await wait(800);
  const info = await page.evaluate(() => {
    const recents = [...document.querySelectorAll('[aria-label="recent rounds"]')];
    const brandEl = [...document.querySelectorAll('*')].find(e => e.children.length===0 && e.textContent.trim()==='RUG OR RICHES');
    const headerRow = brandEl ? brandEl.closest('div') : null;
    // walk up to find the actual header-tape flex row (parent of the brand span)
    let headerCandidate = brandEl ? brandEl.parentElement : null;
    const headerRect = headerCandidate ? headerCandidate.getBoundingClientRect() : null;
    const results = recents.map(r => {
      const rr = r.getBoundingClientRect();
      const insideHeader = headerCandidate ? headerCandidate.contains(r) : null;
      return { top: rr.top, bottom: rr.bottom, insideHeader };
    });
    return { recentsCount: recents.length, headerRect: headerRect ? {top: headerRect.top, bottom: headerRect.bottom} : null, results };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
}
run();
