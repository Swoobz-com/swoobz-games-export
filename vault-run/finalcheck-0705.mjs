import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5567';
const OUT = 'shots-fixpass-0705';
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
async function phaseTestid(page) {
  return page.evaluate(() => {
    if (document.querySelector('[data-testid="vault-settled-banner"]')) return 'settled';
    const cta = document.querySelector('[data-testid="vault-ctl-cta"]');
    if (cta) {
      const txt = cta.innerText.toLowerCase();
      if (txt.includes('get started')) return 'lobby';
      if (txt.includes('send it') || txt.includes('pick your world')) return 'bet-entry';
      if (txt.includes('rugged') || txt.includes('settling')) return 'mine-hit-or-settling';
      return 'playing';
    }
    return 'unknown';
  });
}
async function forceLoss(page, minimalBands) {
  await clickText(page, 'SEND IT'); await wait(600);
  await clickText(page, 'MANUAL'); await wait(200);
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const ph = await phaseTestid(page);
      if (ph === 'mine-hit-or-settling' || ph === 'settled') break;
      const p = await tileCenter(page, 5, minimalBands, col, row);
      await page.mouse.click(p.cx, p.cy);
      await wait(150);
    }
  }
  for (let i = 0; i < 30; i++) {
    if ((await phaseTestid(page)) === 'settled') return true;
    await wait(200);
  }
  return (await phaseTestid(page)) === 'settled';
}
async function gapBelowGrid(page) {
  return page.evaluate(() => {
    const grid = document.querySelector('[data-testid="vault-main-grid"]');
    if (!grid || !grid.parentElement) return null;
    const cabinet = grid.parentElement;
    const next = cabinet.nextElementSibling;
    if (!next) return null;
    const nr = next.getBoundingClientRect();
    const cr = cabinet.getBoundingClientRect();
    return nr.top - cr.bottom;
  });
}
async function recentsLocation(page) {
  return page.evaluate(() => {
    const recentsAll = [...document.querySelectorAll('[aria-label="recent rounds"]')];
    const pageRoot = document.body.firstElementChild;
    const headerTape = pageRoot ? pageRoot.firstElementChild : null;
    const headerTapeRect = headerTape ? headerTape.getBoundingClientRect() : null;
    const inHeader = recentsAll.filter((e) => {
      const r = e.getBoundingClientRect();
      return headerTapeRect && r.top >= headerTapeRect.top && r.bottom <= headerTapeRect.bottom + 2;
    });
    return { count: recentsAll.length, inHeaderCount: inHeader.length };
  });
}
async function receiptCheck(page) {
  // Panel-6 VERIFIED — click "view receipt" and check the receipt body appears.
  const clicked = await clickText(page, 'view receipt');
  await wait(300);
  return page.evaluate(() => {
    const body = document.getElementById('vault-settled-receipt');
    return { toggled: !!body, rowCount: body ? body.querySelectorAll('dt,dd,div').length : 0 };
  }).then((r) => ({ clicked, ...r }));
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--window-size=1500,1000'] });
  const results = {};

  // 1440x900 loss -> screenshot + regression checks
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
    await wait(500);
    results.d1440_lobby_gap = await gapBelowGrid(page);
    await clickText(page, 'ape in'); await wait(400);
    results.d1440_betentry_gap = await gapBelowGrid(page);
    const settled = await forceLoss(page, true);
    await wait(500);
    results.d1440_settled_reached = settled;
    results.d1440_settled_gap = await gapBelowGrid(page);
    results.d1440_recents = await recentsLocation(page);
    results.d1440_receipt = await receiptCheck(page);
    await page.screenshot({ path: `${OUT}/d1440/06-settled-loss-receipt.png` });
    await page.close();
  }

  // 1920x1080 loss -> screenshot
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
    await wait(500);
    await clickText(page, 'ape in'); await wait(400);
    const settled = await forceLoss(page, true);
    await wait(500);
    results.d1920_settled_reached = settled;
    results.d1920_settled_gap = await gapBelowGrid(page);
    await page.screenshot({ path: `${OUT}/d1920/06-settled-loss-full.png` });
    await page.close();
  }
  await browser.close();

  // Mobile 390x844 loss -> screenshot
  const browser2 = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--window-size=430,900'] });
  const mpage = await browser2.newPage();
  await mpage.setViewport({ width: 390, height: 844 });
  await mpage.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
  await wait(500);
  await clickText(mpage, 'ape in'); await wait(400);
  await mpage.screenshot({ path: `${OUT}/m390/03-betentry-full.png` });
  const settledM = await forceLoss(mpage, false);
  await wait(500);
  results.m390_settled_reached = settledM;
  await mpage.screenshot({ path: `${OUT}/m390/04-settled-loss-full.png` });
  await browser2.close();

  fs.writeFileSync(`${OUT}/finalcheck-results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
}
run().catch((e) => { console.error(e); process.exit(1); });
