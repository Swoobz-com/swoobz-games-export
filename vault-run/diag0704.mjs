import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
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
  await page.setViewport({ width: 960, height: 768 });
  await page.goto('http://localhost:5340/', { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in'); await wait(600);
  await clickText(page, 'SEND IT', '[data-testid="vault-betentry-confirm"]'); await wait(700);

  const info = await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]');
    const shellRect = shell.getBoundingClientRect();
    const board = document.querySelector('[data-testid="vault-playing-left"]');
    const boardRect = board.getBoundingClientRect();
    const cs = getComputedStyle(board);
    return {
      shellRect: { left: shellRect.left, right: shellRect.right, width: shellRect.width },
      boardRect: { left: boardRect.left, right: boardRect.right, width: boardRect.width },
      inlineStyleLeft: board.style.left,
      inlineStyleMaxWidth: board.style.maxWidth,
      inlineStyleTransform: board.style.transform,
      computedLeft: cs.left,
      computedMaxWidth: cs.maxWidth,
      computedWidth: cs.width,
      computedTransform: cs.transform,
      computedPosition: cs.position,
      shellComputedOverflow: getComputedStyle(shell).overflow,
      shellComputedPosition: getComputedStyle(shell).position,
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
