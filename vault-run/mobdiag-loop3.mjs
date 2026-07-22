import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickText(page, t, within) {
  const h = await page.evaluateHandle(({ t, within }) => {
    const root = within ? document.querySelector(within) : document;
    if (!root) return null;
    const els = [...root.querySelectorAll('button,[role=button]')];
    return (
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
  }, { t, within });
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
async function clickCanvasFraction(page, fx, fy) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (!box) return false;
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy);
  return true;
}
async function isSettled(page) {
  return await page.evaluate(() => !!document.querySelector('[data-testid="vault-settledpanel"]'));
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto('http://localhost:5500/', { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in');
  await wait(600);
  await clickText(page, 'SEND IT', '[data-testid="vault-betentry-confirm"]');
  await wait(700);
  const spots = [];
  for (let gx = 1; gx <= 9; gx++) for (let gy = 1; gy <= 9; gy++) spots.push([gx / 10, gy / 10]);
  let safeReveals = 0;
  for (const [fx, fy] of spots) {
    if (await isSettled(page)) break;
    await clickCanvasFraction(page, fx, fy);
    await wait(280);
    if (await isSettled(page)) break;
    safeReveals += 1;
    if (safeReveals >= 2) {
      const clicked = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-testid="vault-playing-actions"] button')].find((b) => b.textContent.toLowerCase().includes('take profit'));
        if (btn && !btn.disabled) { btn.click(); return true; }
        return false;
      });
      if (clicked) { await wait(900); break; }
    }
  }
  await wait(1200);
  const settled = await isSettled(page);
  console.log('settled:', settled);
  const buttons = await page.evaluate(() => [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(Boolean));
  console.log('buttons:', JSON.stringify(buttons));
  const verifyChip = await page.evaluate(() => !!document.querySelector('.vault-receipt-toggle'));
  console.log('receiptToggleExists:', verifyChip);
  const verifyState = await page.evaluate(() => document.body.textContent.includes('verified'));
  console.log('bodyHasVerified:', verifyState);
  await page.screenshot({ path: 'shots-vaultfix3-0704/mobdiag-settled.png', fullPage: true });
  await browser.close();
})();
