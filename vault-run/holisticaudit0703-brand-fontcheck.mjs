import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5311';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickText(page, t, within) {
  const h = await page.evaluateHandle(({ t, within }) => {
    const root = within ? document.querySelector(within) : document;
    if (!root) return null;
    const els = [...root.querySelectorAll('button,[role=button]')];
    return els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase())
      || els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, { t, within });
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in', '[data-testid="vault-lobby-apein"]');
  await wait(400);
  await clickText(page, 'bluechips', '[data-testid="vault-betentry-world"]');
  await wait(200);
  await clickText(page, 'SEND IT', '[data-testid="vault-betentry-confirm"]');
  await wait(700);
  const fonts = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="vault-playing-status"]');
    if (!card) return { error: 'no status card' };
    const leaves = [...card.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent.trim().length > 0);
    return leaves.map(e => ({ text: e.textContent.trim(), fontFamily: getComputedStyle(e).fontFamily, tag: e.tagName }));
  });
  console.log('STATUS CARD LEAF FONTS:', JSON.stringify(fonts, null, 1));

  const actionsFonts = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="vault-playing-actions"]');
    if (!card) return { error: 'no actions card' };
    const leaves = [...card.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent.trim().length > 0);
    return leaves.map(e => ({ text: e.textContent.trim(), fontFamily: getComputedStyle(e).fontFamily, tag: e.tagName }));
  });
  console.log('ACTIONS CARD LEAF FONTS:', JSON.stringify(actionsFonts, null, 1));

  // reveal a tile to get a live numeric multiplier
  const cellInfo = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  });
  await page.mouse.click(cellInfo.left + cellInfo.width * 0.5, cellInfo.top + cellInfo.height * 0.45);
  await wait(500);
  const actionsFonts2 = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="vault-playing-actions"]');
    if (!card) return { error: 'no actions card' };
    const leaves = [...card.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent.trim().length > 0);
    return leaves.map(e => ({ text: e.textContent.trim(), fontFamily: getComputedStyle(e).fontFamily, tag: e.tagName }));
  });
  console.log('ACTIONS CARD LEAF FONTS AFTER REVEAL:', JSON.stringify(actionsFonts2, null, 1));
  const statusFonts2 = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="vault-playing-status"]');
    if (!card) return { error: 'no status card' };
    const leaves = [...card.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent.trim().length > 0);
    return leaves.map(e => ({ text: e.textContent.trim(), fontFamily: getComputedStyle(e).fontFamily, tag: e.tagName }));
  });
  console.log('STATUS CARD LEAF FONTS AFTER REVEAL:', JSON.stringify(statusFonts2, null, 1));

  await browser.close();
})();
