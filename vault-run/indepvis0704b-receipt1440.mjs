import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 5403;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickText(page, t, within) {
  const h = await page.evaluateHandle(({ t, within }) => {
    const root = within ? document.querySelector(within) : document;
    if (!root) return null;
    const els = [...root.querySelectorAll('button,[role=button]')];
    return els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, { t, within });
  const el = h.asElement(); if (!el) return false; await el.click(); return true;
}
async function clickCanvasFraction(page, fx, fy) {
  const box = await page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  if (!box) return false; await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy); return true;
}
async function isSettled(page) { return await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-left"]')); }
async function takeProfitIfEnabled(page) {
  return await page.evaluate(() => { const btn = [...document.querySelectorAll('[data-testid="vault-playing-actions"] button')].find((b) => b.textContent.toLowerCase().includes('take profit')); if (btn && !btn.disabled) { btn.click(); return true; } return false; });
}
async function reachSettled(page) {
  const spots = []; for (let gx=1; gx<=9; gx++) for (let gy=1; gy<=9; gy++) spots.push([gx/10, gy/10]);
  let safe = 0;
  for (const [fx, fy] of spots) {
    if (await isSettled(page)) return true;
    await clickCanvasFraction(page, fx, fy); await wait(300);
    if (await isSettled(page)) return true;
    safe += 1;
    if (safe >= 2) { if (await takeProfitIfEnabled(page)) { await wait(900); return await isSettled(page); } }
  }
  await wait(900); return await isSettled(page);
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in'); await wait(600);
  await clickText(page, 'send it', '[data-testid="vault-betentry-confirm"]'); await wait(700);
  await reachSettled(page); await wait(1200);
  const toggleBox = await page.evaluate(() => { const chip = document.querySelector('.vault-receipt-toggle'); if (!chip) return null; const r = chip.getBoundingClientRect(); return { x: r.left + r.width/2, y: r.top + r.height/2 }; });
  await page.mouse.click(toggleBox.x, toggleBox.y); await wait(400);
  const shell = await page.evaluate(() => { const s = document.querySelector('[data-testid="vault-canvas-shell"]'); const r = s.getBoundingClientRect(); return {top:r.top,bottom:r.bottom}; });
  const body = await page.evaluate(() => { const b = document.getElementById('vault-settled-receipt'); if (!b) return null; const r = b.getBoundingClientRect(); return {top:r.top,bottom:r.bottom}; });
  console.log(JSON.stringify({shell, body, exceedsShellBottom: body ? body.bottom - shell.bottom : null}, null, 2));
  await page.screenshot({ path: 'shots-indepvis0704b/v1440-receipt-expanded.png', fullPage: true });
  await browser.close();
})();
