import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5960';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickText(page, t, within) {
  const h = await page.evaluateHandle(({ t, within }) => {
    const root = within ? document.querySelector(within) : document;
    if (!root) return null;
    const els = [...root.querySelectorAll('button,[role=button]')];
    const lc = t.toLowerCase();
    return els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(lc)) || null;
  }, { t, within });
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
async function skipIntro(page) { await clickText(page, 'got it'); await clickText(page, 'skip'); await clickText(page, 'tap'); await wait(200); }
async function box(page) { return page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }); }
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--autoplay-policy=no-user-gesture-required', '--window-size=1500,1000'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(800);
  await skipIntro(page);
  await clickText(page, 'ape in'); await wait(700);
  await clickText(page, 'send it', '[data-testid="vault-betentry-confirm"]'); await wait(900);
  const bx = await box(page);
  await page.mouse.click(bx.x + bx.w * 0.5, bx.y + bx.h * 0.5); await wait(600);
  await clickText(page, 'take profit'); await wait(1500);
  const data = await page.evaluate(() => {
    const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
    const settledRight = document.querySelector('[data-testid="vault-settled-right"]');
    const nextBet = document.querySelector('[data-testid="vault-settled-next"]');
    const window_ = nextBet?.querySelector('div'); // settledWagerWindow (first div child)
    const buttons = [...(window_?.querySelectorAll('button') || [])];
    const valueSpan = window_?.querySelector('span');
    return {
      settledRight: rect(settledRight),
      nextBet: rect(nextBet),
      window: rect(window_),
      buttons: buttons.map(b => rect(b)),
      valueSpan: rect(valueSpan),
      valueSpanText: valueSpan?.textContent,
      windowCS: window_ ? getComputedStyle(window_).padding : null,
    };
  });
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
