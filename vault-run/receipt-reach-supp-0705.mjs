// receipt-reach-supp-0705.mjs — supplementary check: after expanding the
// Glass Box receipt in settled phase, is the receipt body genuinely
// SCROLLABLE-reachable (overflow:auto) or hard-clipped (overflow:hidden /
// never enters viewport even after scrollIntoView)?
import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5413';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return (
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
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
    if (document.querySelector('[data-testid="vault-ctl-cta"]')) {
      const cta = document.querySelector('[data-testid="vault-ctl-cta"]');
      const txt = cta.innerText.toLowerCase();
      if (txt.includes('get started')) return 'lobby';
      if (txt.includes('send it') || txt.includes('your bet')) return 'bet-entry';
      return 'playing';
    }
    return 'unknown';
  });
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--window-size=1500,1000'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
  await wait(600);
  await clickText(page, 'ape in');
  await wait(500);
  await clickText(page, 'SEND IT');
  await wait(700);
  await clickText(page, 'TRAIL');
  await wait(300);
  const p1 = await tileCenter(page, 5, true, 1, 1);
  const p2 = await tileCenter(page, 5, true, 2, 1);
  const p3 = await tileCenter(page, 5, true, 3, 1);
  await page.mouse.move(p1.cx, p1.cy); await page.mouse.down();
  await page.mouse.move(p2.cx, p2.cy, { steps: 3 }); await wait(60);
  await page.mouse.move(p3.cx, p3.cy, { steps: 3 }); await wait(60);
  await page.mouse.up(); await wait(300);
  await clickText(page, 'GO');
  for (let i = 0; i < 40; i++) {
    if ((await phaseTestid(page)) === 'settled') break;
    await wait(300);
  }
  const took = await clickText(page, 'take profit');
  if (took) { for (let i = 0; i < 20; i++) { if ((await phaseTestid(page)) === 'settled') break; await wait(300); } }
  await wait(400);

  const before = await page.evaluate(() => {
    const col = document.querySelector('[data-testid="vault-control-column"]');
    return { scrollHeight: col.scrollHeight, clientHeight: col.clientHeight };
  });
  await clickText(page, 'view receipt');
  await wait(300);
  const afterExpand = await page.evaluate(() => {
    const col = document.querySelector('[data-testid="vault-control-column"]');
    const receipt = document.getElementById('vault-settled-receipt');
    const cs = col ? getComputedStyle(col) : null;
    const r = receipt ? receipt.getBoundingClientRect() : null;
    const colRect = col ? col.getBoundingClientRect() : null;
    return {
      overflowY: cs ? cs.overflowY : null,
      scrollHeight: col ? col.scrollHeight : null,
      clientHeight: col ? col.clientHeight : null,
      hasInternalScroll: col ? col.scrollHeight > col.clientHeight + 1 : null,
      receiptRect: r ? { top: r.top, bottom: r.bottom, height: r.height } : null,
      colVisibleBottom: colRect ? colRect.bottom : null,
      receiptClippedBeforeScroll: r && colRect ? r.bottom > colRect.bottom : null,
    };
  });
  // Now actually scroll the column and confirm the receipt becomes visible
  await page.evaluate(() => {
    const col = document.querySelector('[data-testid="vault-control-column"]');
    const receipt = document.getElementById('vault-settled-receipt');
    if (col && receipt) receipt.scrollIntoView({ block: 'end' });
  });
  await wait(200);
  const afterScroll = await page.evaluate(() => {
    const col = document.querySelector('[data-testid="vault-control-column"]');
    const receipt = document.getElementById('vault-settled-receipt');
    const r = receipt ? receipt.getBoundingClientRect() : null;
    const colRect = col ? col.getBoundingClientRect() : null;
    return {
      scrollTop: col ? col.scrollTop : null,
      receiptRectAfterScroll: r ? { top: r.top, bottom: r.bottom } : null,
      colRect: colRect ? { top: colRect.top, bottom: colRect.bottom } : null,
      receiptFullyVisibleNow: r && colRect ? (r.top >= colRect.top - 1 && r.bottom <= colRect.bottom + 1) : null,
    };
  });
  await page.screenshot({ path: 'receipt-reach-supp-afterscroll-0705.png' });
  console.log(JSON.stringify({ before, afterExpand, afterScroll }, null, 2));
  await browser.close();
}
run().catch((e) => { console.error(e); process.exit(1); });
