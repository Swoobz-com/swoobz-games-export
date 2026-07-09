import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise(r=>setTimeout(r,ms));
async function clickText(page, t, within) {
  const h = await page.evaluateHandle(({ t, within }) => {
    const root = within ? document.querySelector(within) : document;
    if (!root) return null;
    const els = [...root.querySelectorAll('button,[role=button]')];
    return els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, { t, within });
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5190/', { waitUntil: 'networkidle0' });
  await wait(400);
  await clickText(page, 'ape in');
  await wait(400);
  await clickText(page, 'bluechips', '[data-testid="vault-betentry-world"]');
  await wait(200);
  await clickText(page, 'SEND IT');
  await wait(600);
  // TAKE PROFIT must be present + disabled BEFORE any reveal (RG-C6 always-reachable, disabled-not-hidden)
  const beforeReveal = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-playing-actions"]');
    const btn = el ? [...el.querySelectorAll('button')].find(b=>b.textContent.toLowerCase().includes('take profit')) : null;
    if (!btn) return { present: false };
    const cs = getComputedStyle(btn);
    return { present: true, disabled: btn.disabled, display: cs.display, visibility: cs.visibility, opacity: cs.opacity };
  });
  console.log('BEFORE REVEAL:', JSON.stringify(beforeReveal));

  // check right-gutter Group1 (@72) vs Group2 (@400, none b/c playing has no Card B/C at this phase) - actually Card A/mirror is at 400 in Playing per spec
  const rects = await page.evaluate(() => {
    const g1 = document.querySelector('[data-testid="vault-playing-right"]');
    const cardA = document.querySelector('[data-testid="vault-gutter-right"]');
    return {
      g1: g1 ? g1.getBoundingClientRect().toJSON() : null,
      cardAMirror: cardA ? cardA.getBoundingClientRect().toJSON() : null,
    };
  });
  console.log('RECTS:', JSON.stringify(rects));
  await browser.close();
})();
