import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUTDIR = 'shots-a11ysweep-2026-07-07';

async function status(page) {
  return page.evaluate(() => {
    const settled = !!document.querySelector('[data-testid="vault-settledpanel"]');
    const playing = !!document.querySelector('[data-testid="vault-ctl-wager-locked"]');
    const openMatch = (document.querySelector('[data-testid="vault-grid-status"]')?.textContent || '').match(/OPEN (\d+)/);
    return { settled, playing, openCount: openMatch ? parseInt(openMatch[1]) : null };
  });
}
async function tileC(page, idx, g) {
  return page.evaluate(({ idx, g }) => {
    const cv = document.querySelector('canvas'); const r = cv.getBoundingClientRect();
    const W = r.width, H = r.height;
    const tR = H * 0.15, bR = H * 0.18, sF = 0.08;
    const sW = W * (1 - sF * 2), sH = (H - tR - bR) * 0.96;
    const av = Math.min(sW, sH); const gap = Math.max(6, av * 0.026);
    const tile = (av - gap * (g - 1)) / g; const full = tile * g + gap * (g - 1);
    const x0 = (W - full) / 2; const by = tR + (H - tR - bR) / 2; const y0 = by - full / 2;
    const col = idx % g, row = Math.floor(idx / g);
    return { cx: r.left + x0 + col * (tile + gap) + tile / 2, cy: r.top + y0 + row * (tile + gap) + tile / 2 };
  }, { idx, g });
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  let ok = false, attempt = 0;
  let page;
  while (!ok && attempt < 8) {
    attempt++;
    if (page) await page.close();
    page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.evaluateOnNewDocument(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto('http://localhost:5390/', { waitUntil: 'networkidle2', timeout: 60000 });
    await wait(1000);
    await page.evaluate(() => { document.querySelector('[data-testid="vault-world-card-bluechips"]').click(); });
    await wait(300);
    await page.evaluate(() => { [...document.querySelectorAll('button')].find(b => /send it/i.test(b.textContent)).click(); });
    // poll until playing phase confirmed
    let s = await status(page);
    for (let i = 0; i < 10 && !s.playing; i++) { await wait(200); s = await status(page); }
    if (!s.playing) { console.log('attempt', attempt, 'never reached playing, retry'); continue; }
    const c = await tileC(page, attempt, 5); // vary tile index by attempt to dodge repeat-mine luck
    await page.mouse.click(c.cx, c.cy);
    // poll for up to 2.5s to let any settle animation resolve
    s = await status(page);
    for (let i = 0; i < 13; i++) { await wait(200); s = await status(page); if (s.settled || (s.playing && s.openCount > 0)) break; }
    console.log('attempt', attempt, 'final status', s);
    if (s.playing && !s.settled && s.openCount > 0) ok = true;
  }
  if (!ok) { console.log('GAVE UP after', attempt, 'attempts — could not reach a stable canCashOut state'); await browser.close(); return; }

  // Now Tab from neutral and look for TAKE PROFIT
  await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
  const stops = [];
  let found = -1;
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    await wait(120);
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? { tag: el.tagName, text: (el.textContent || '').trim().slice(0, 30), disabled: el.disabled, ariaLabel: el.getAttribute('aria-label') } : null;
    });
    stops.push(info);
    if (info && /take profit/i.test(info.text)) { found = i; break; }
  }
  console.log('tab stops:', JSON.stringify(stops, null, 2));
  console.log('TAKE PROFIT reached at tab step:', found);
  if (found >= 0) {
    const before = await status(page);
    await page.keyboard.press('Enter');
    await wait(1800);
    const after = await status(page);
    console.log('Enter on TAKE PROFIT -> before', before, 'after', after, 'worked:', !before.settled && after.settled);
    await page.screenshot({ path: `${OUTDIR}/focus-cashout2-result.png` });
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
