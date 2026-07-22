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
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto('http://localhost:5500/', { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in');
  await wait(600);
  await clickText(page, 'SEND IT');
  await wait(700);
  const spots = [];
  for (let gx = 1; gx <= 9; gx++) for (let gy = 1; gy <= 9; gy++) spots.push([gx / 10, gy / 10]);
  for (const [fx, fy] of spots) {
    const settled = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-left"]'));
    if (settled) break;
    await clickCanvasFraction(page, fx, fy);
    await wait(280);
  }
  await wait(1200);
  const chip = await page.evaluate(() => {
    const c = document.querySelector('.vault-receipt-toggle');
    return c ? { ariaControls: c.getAttribute('aria-controls'), ariaExpanded: c.getAttribute('aria-expanded') } : null;
  });
  console.log('chip before', JSON.stringify(chip));
  const toggleBox = await page.evaluate(() => {
    const chip = document.querySelector('.vault-receipt-toggle');
    const r = chip.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.click(toggleBox.x, toggleBox.y);
  await wait(400);
  const afterOpen = await page.evaluate(() => {
    const chip = document.querySelector('.vault-receipt-toggle');
    const target = document.getElementById(chip.getAttribute('aria-controls'));
    const srLive = [...document.querySelectorAll('[aria-live]')].map(s => ({tag:s.tagName, cls:s.className, text: s.textContent.slice(0,120)}));
    return {
      ariaControlsResolves: !!target,
      targetTestId: target ? target.getAttribute('data-testid') : null,
      ariaExpanded: chip.getAttribute('aria-expanded'),
      srLive,
    };
  });
  console.log('afterOpen', JSON.stringify(afterOpen, null, 2));
  await browser.close();
})();
