// a11ysweep0707-focus-cashout.mjs — after a real (mouse) tile reveal, is the
// TAKE PROFIT CTA reachable via Tab, and does Enter/Space fire it (keyboard
// parity for the one gesture that CAN have a conventional button-based
// equivalent, as distinct from the canvas-tile-reveal gesture which cannot).
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUTDIR = 'shots-a11ysweep-2026-07-07';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.evaluateOnNewDocument(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto('http://localhost:5390/', { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1200);
  async function tileC(idx, g) {
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
  let canCashOutNow = false;
  for (let attempt = 0; attempt < 8 && !canCashOutNow; attempt++) {
    if (attempt > 0) {
      await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
      await page.goto('http://localhost:5390/', { waitUntil: 'networkidle2', timeout: 60000 });
      await wait(1000);
      await page.evaluate(() => { document.querySelector('[data-testid="vault-world-card-bluechips"]').click(); });
      await wait(300);
      await page.evaluate(() => { [...document.querySelectorAll('button')].find(b => /send it/i.test(b.textContent)).click(); });
      await wait(700);
    }
    const phaseBefore = await page.evaluate(() => ({
      betEntry: !!document.querySelector('[data-testid="vault-board-worldpicker"]'),
      playing: !!document.querySelector('[data-testid="vault-ctl-wager-locked"]'),
    }));
    const c = await tileC(attempt % 25, 5);
    await page.mouse.click(c.cx, c.cy);
    await wait(600);
    const settled = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settledpanel"]'));
    const phaseAfter = await page.evaluate(() => ({
      betEntry: !!document.querySelector('[data-testid="vault-board-worldpicker"]'),
      playing: !!document.querySelector('[data-testid="vault-ctl-wager-locked"]'),
    }));
    if (!settled && phaseAfter.playing) canCashOutNow = true;
    console.log('attempt', attempt, 'phaseBefore', phaseBefore, 'settled', settled, 'phaseAfter', phaseAfter, 'click@', c);
  }

  // Tab from neutral, log each stop's text, looking for TAKE PROFIT
  await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
  const stops = [];
  let found = -1;
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    await wait(100);
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? { tag: el.tagName, text: (el.textContent || '').trim().slice(0, 30), disabled: el.disabled } : null;
    });
    stops.push(info);
    if (info && /take profit/i.test(info.text)) { found = i; break; }
  }
  console.log('tab stops:', JSON.stringify(stops, null, 2));
  console.log('TAKE PROFIT reached at tab step:', found);

  if (found >= 0) {
    const beforeSettled = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settledpanel"]'));
    await page.keyboard.press('Enter');
    await wait(700);
    const afterSettled = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settledpanel"]'));
    console.log('Enter on TAKE PROFIT: beforeSettled', beforeSettled, 'afterSettled', afterSettled, '=> keyboard cash-out works:', !beforeSettled && afterSettled);
    await page.screenshot({ path: `${OUTDIR}/focus-cashout-enter-result.png` });
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
