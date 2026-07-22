import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5196';
const OUT = process.argv[3] || 'shots-fabi0704-fix1fix2';
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
async function isSettled(page) {
  return await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-betagain"]') || !!document.querySelector('[data-testid="vault-settledpanel"]'));
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
async function takeProfitIfEnabled(page) {
  return await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.toLowerCase().includes('take profit') && !b.disabled);
    if (btn) { btn.click(); return true; }
    return false;
  });
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in'); await wait(600);
  const scoped = await clickText(page, 'SEND IT', '[data-testid="vault-betentry-confirm"]');
  if (!scoped) await clickText(page, 'SEND IT');
  await wait(700);
  await clickText(page, 'MANUAL'); await wait(300);
  outer: for (let gx=1; gx<=9; gx++) for (let gy=1; gy<=9; gy++) {
    if (await isSettled(page)) break outer;
    await clickCanvasFraction(page, gx/10, gy/10);
    await wait(180);
  }
  if (!(await isSettled(page))) await takeProfitIfEnabled(page);
  await wait(900);
  console.log('settled=', await isSettled(page));
  // scroll to the "new setup" button and screenshot a crop around it
  const rect = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => /new setup/i.test(b.textContent));
    if (!btn) return null;
    btn.scrollIntoView({ block: 'center' });
    return true;
  });
  await wait(300);
  const rect2 = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => /new setup/i.test(b.textContent));
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    return { x: Math.max(0, r.x - 30), y: Math.max(0, r.y - 60), width: Math.min(412, r.width + 60), height: Math.min(915, r.height + 120) };
  });
  console.log('rect found=', !!rect2);
  await page.screenshot({ path: `${OUT}/mobile-04-newsetup-scrolled-full.png`, fullPage: false });
  if (rect2) await page.screenshot({ path: `${OUT}/mobile-04-newsetup-crop.png`, clip: rect2 });
  await browser.close();
})();
