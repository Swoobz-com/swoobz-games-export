import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, t);
  const el = h.asElement(); if (!el) return false; await el.click(); return true;
}
async function clickCanvasFraction(page, fx, fy) {
  const box = await page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  if (!box) return false;
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy);
  return true;
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto('http://localhost:5501/', { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in'); await wait(600);
  await clickText(page, 'SEND IT'); await wait(700);
  const spots = []; for (let gx=1; gx<=9; gx++) for (let gy=1; gy<=9; gy++) spots.push([gx/10, gy/10]);
  for (const [fx, fy] of spots) {
    const settled = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-left"]'));
    if (settled) break;
    await clickCanvasFraction(page, fx, fy); await wait(280);
  }
  await wait(1200);
  await page.evaluate(() => document.body.focus());
  let landedOnToggle = false;
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    landedOnToggle = await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('vault-receipt-toggle'));
    if (landedOnToggle) break;
  }
  const info = await page.evaluate(() => {
    const el = document.activeElement;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName, cls: el.className,
      outline: cs.outline, outlineWidth: cs.outlineWidth, outlineColor: cs.outlineColor, outlineStyle: cs.outlineStyle, outlineOffset: cs.outlineOffset,
      boxShadow: cs.boxShadow, border: cs.border,
      rect: { top: r.top, left: r.left, width: r.width, height: r.height },
    };
  });
  console.log('TOGGLE_FOCUS_STATE', landedOnToggle, JSON.stringify(info, null, 2));
  await page.screenshot({ path: 'reverify-toggle-focused.png', clip: { x: 1150, y: 300, width: 290, height: 500 } });
  await browser.close();
})();
