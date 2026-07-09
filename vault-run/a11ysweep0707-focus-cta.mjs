import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUTDIR = 'shots-a11ysweep-2026-07-07';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function shotFocused(page, tag) {
  const info = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return { text: (el.textContent || '').trim().slice(0, 30), rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, outlineStyle: cs.outlineStyle, outlineColor: cs.outlineColor, outlineWidth: cs.outlineWidth, boxShadow: cs.boxShadow };
  });
  if (!info) return null;
  const pad = 20;
  const clip = { x: Math.max(0, info.rect.x - pad), y: Math.max(0, info.rect.y - pad), width: info.rect.width + pad * 2, height: info.rect.height + pad * 2 };
  const buf = await page.screenshot({ clip });
  fs.writeFileSync(`${OUTDIR}/focus-CTA-${tag}-FOCUSED.png`, buf);
  await page.evaluate(() => document.activeElement.blur());
  await wait(60);
  const buf2 = await page.screenshot({ clip });
  fs.writeFileSync(`${OUTDIR}/focus-CTA-${tag}-UNFOCUSED.png`, buf2);
  return info;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.evaluateOnNewDocument(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto('http://localhost:5390/', { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1200);
  await page.evaluate(() => { document.querySelector('[data-testid="vault-world-card-bluechips"]').click(); });
  await wait(300);
  // Tab to SEND IT: keep tabbing (up to 20) until text matches
  let found = null;
  for (let i = 0; i < 20 && !found; i++) {
    await page.keyboard.press('Tab');
    await wait(80);
    const t = await page.evaluate(() => (document.activeElement.textContent || '').trim());
    if (/send it/i.test(t)) found = i;
  }
  console.log('SEND IT reached at step', found);
  const info1 = await shotFocused(page, 'send-it');
  console.log('SEND IT focus info:', JSON.stringify(info1));

  // enter playing, reveal a safe tile, tab to TAKE PROFIT
  await page.keyboard.press('Enter'); // fires SEND IT via keyboard too (bonus keyboard-parity proof)
  await wait(700);
  const c = await page.evaluate(({ g }) => {
    const cv = document.querySelector('canvas'); const r = cv.getBoundingClientRect();
    const W = r.width, H = r.height; const tR = H * 0.15, bR = H * 0.18, sF = 0.08;
    const sW = W * (1 - sF * 2), sH = (H - tR - bR) * 0.96; const av = Math.min(sW, sH);
    const gap = Math.max(6, av * 0.026); const tile = (av - gap * (g - 1)) / g; const full = tile * g + gap * (g - 1);
    const x0 = (W - full) / 2; const by = tR + (H - tR - bR) / 2; const y0 = by - full / 2;
    return { cx: r.left + x0 + tile / 2, cy: r.top + y0 + tile / 2 };
  }, { g: 5 });
  await page.mouse.click(c.cx, c.cy);
  await wait(600);
  const playing = await page.evaluate(() => !!document.querySelector('[data-testid="vault-ctl-wager-locked"]'));
  console.log('reached playing (not immediate mine)?', playing);
  if (playing) {
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    let found2 = null;
    for (let i = 0; i < 10 && found2 === null; i++) {
      await page.keyboard.press('Tab');
      await wait(80);
      const t = await page.evaluate(() => (document.activeElement.textContent || '').trim());
      if (/take profit/i.test(t)) found2 = i;
    }
    console.log('TAKE PROFIT reached at step', found2);
    const info2 = await shotFocused(page, 'take-profit');
    console.log('TAKE PROFIT focus info:', JSON.stringify(info2));
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
