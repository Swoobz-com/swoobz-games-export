import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5225';
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
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in');
  await wait(700);
  const info = await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]');
    const world = document.querySelector('[data-testid="vault-betentry-world"]');
    const confirm = document.querySelector('[data-testid="vault-betentry-confirm"]');
    const shellCs = getComputedStyle(shell);
    const modeRow = world.querySelector('.vault-mode-row') || world.querySelector('[class*=mode]');
    return {
      shellOverflow: shellCs.overflow,
      shellOverflowY: shellCs.overflowY,
      shellPosition: shellCs.position,
      worldHTML_len: world.innerHTML.length,
      worldChildrenTags: [...world.children].map(c => ({tag: c.tagName, class: c.className, h: c.getBoundingClientRect().height})),
      confirmComputedTop: getComputedStyle(confirm).top,
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await page.screenshot({ path: 'shots-betentry-rightcol-holdgate-0703/1440x900-recheck-full.png' });
  await browser.close();
})();
