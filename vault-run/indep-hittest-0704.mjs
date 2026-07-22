import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = '5322';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, t);
  const el = h.asElement(); if (!el) return false; await el.click(); return true;
}
async function clickWithin(page, selector, t) {
  const h = await page.evaluateHandle(({ selector, t }) => {
    const root = document.querySelector(selector); if (!root) return null;
    const els = [...root.querySelectorAll('button,[role=button]')];
    return els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, { selector, t });
  const el = h.asElement(); if (!el) return false; await el.click(); return true;
}
async function isSettled(page) { return await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-left"]')); }
async function clickCanvasFraction(page, fx, fy) {
  const box = await page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  if (!box) return false; await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy); return true;
}
async function takeProfitIfEnabled(page) {
  return await page.evaluate(() => {
    const btn = [...document.querySelectorAll('[data-testid="vault-playing-actions"] button')].find((b) => b.textContent.toLowerCase().includes('take profit'));
    if (btn && !btn.disabled) { btn.click(); return true; } return false;
  });
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in'); await wait(600);
  await clickWithin(page, '[data-testid="vault-betentry-confirm"]', 'send it'); await wait(700);
  const spots = []; for (let gx = 1; gx <= 9; gx++) for (let gy = 1; gy <= 9; gy++) spots.push([gx/10, gy/10]);
  let safe = 0;
  for (const [fx, fy] of spots) {
    if (await isSettled(page)) break;
    await clickCanvasFraction(page, fx, fy); await wait(300);
    if (await isSettled(page)) break;
    safe += 1;
    if (safe >= 2 && (await takeProfitIfEnabled(page))) { await wait(900); break; }
  }
  await wait(1200);
  // Real mouse click on the "view receipt" toggle (Card C) to expand.
  const chipBox = await page.evaluate(() => { const el = document.querySelector('.vault-receipt-toggle'); const r = el.getBoundingClientRect(); return {x: r.left + r.width/2, y: r.top + r.height/2}; });
  await page.mouse.click(chipBox.x, chipBox.y);
  await wait(500);

  // Now find where the (now "hide receipt") toggle SHOULD be, and hit-test with elementFromPoint.
  const hitTest = await page.evaluate(() => {
    const chip = document.querySelector('.vault-receipt-toggle');
    const r = chip.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const topEl = document.elementFromPoint(cx, cy);
    return {
      chipRect: { top: r.top, bottom: r.bottom, left: r.left, right: r.right },
      pointChecked: { cx, cy },
      elementAtPoint_tag: topEl ? topEl.tagName : null,
      elementAtPoint_class: topEl ? topEl.className : null,
      elementAtPoint_testid: topEl ? topEl.getAttribute('data-testid') : null,
      elementAtPoint_isChipOrDescendant: topEl ? (topEl === chip || chip.contains(topEl)) : false,
      elementAtPoint_text: topEl ? topEl.textContent.slice(0,60) : null,
    };
  });
  console.log(JSON.stringify({ hitTest }, null, 2));

  // Now attempt an ACTUAL mouse click (not JS .click()) at that point and see what happens.
  await page.mouse.click(chipBox.x, chipBox.y);
  await wait(400);
  const stateAfterRealClick = await page.evaluate(() => {
    const chip = document.querySelector('.vault-receipt-toggle');
    return {
      ariaExpanded: chip ? chip.getAttribute('aria-expanded') : null,
      chipText: chip ? chip.textContent : null,
      receiptStillInDom: !!document.getElementById('vault-settled-receipt'),
    };
  });
  console.log(JSON.stringify({ stateAfterRealClick }, null, 2));
  await page.screenshot({ path: 'shots-indep-verify-0704/hittest-1440.png', fullPage: true });
  await browser.close();
})();
