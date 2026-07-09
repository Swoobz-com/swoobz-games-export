import puppeteer from 'puppeteer-core';

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 5305;
const SHOTS = 'shots-holisticaudit0703/flow/';
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

async function cellCenter(page, idx, g) {
  return await page.evaluate(({ idx, g }) => {
    const c = document.querySelector('canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    const W = r.width, H = r.height;
    const tR = H * 0.15, bR = H * 0.18, sF = 0.08;
    const sW = W * (1 - sF * 2);
    const sH = (H - tR - bR) * 0.96;
    const av = Math.min(sW, sH);
    const gap = Math.max(6, av * 0.026);
    const tile = (av - gap * (g - 1)) / g;
    const full = tile * g + gap * (g - 1);
    const x0 = (W - full) / 2;
    const by = tR + (H - tR - bR) / 2;
    const y0 = by - full / 2;
    const col = idx % g, row = Math.floor(idx / g);
    return { cx: r.left + x0 + col * (tile + gap) + tile / 2, cy: r.top + y0 + row * (tile + gap) + tile / 2 };
  }, { idx, g });
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EXE, headless: false, defaultViewport: null,
    args: ['--window-size=1500,1040'],
  });
  const page = (await browser.pages())[0];
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
  await wait(1200);

  await clickText(page, 'ape in');
  await wait(600);
  await clickText(page, 'SEND IT');
  await wait(800);
  // reveal 3 tiles then take profit (bluechips, low bust risk)
  for (const idx of [0, 1, 2]) {
    const c = await cellCenter(page, idx, 5);
    await page.mouse.click(c.cx, c.cy);
    await wait(400);
  }
  await clickText(page, 'take profit');
  await wait(900);

  await page.screenshot({ path: SHOTS + 'receipt-01-settled-before-toggle.png' });

  const beforeDom = await page.evaluate(() => ({
    hasTargetEl: !!document.getElementById('vault-settled-receipt'),
    chipText: document.querySelector('[data-testid="vault-gutter-card-c"]')?.innerText,
  }));
  console.log('BEFORE:', JSON.stringify(beforeDom));

  const clicked = await clickText(page, 'view receipt');
  console.log('clicked toggle:', clicked);
  await wait(500);

  await page.screenshot({ path: SHOTS + 'receipt-02-settled-after-toggle.png' });
  await page.screenshot({ path: SHOTS + 'receipt-02-settled-after-toggle-fullpage.png', fullPage: true });

  const afterDom = await page.evaluate(() => ({
    hasTargetEl: !!document.getElementById('vault-settled-receipt'),
    chipText: document.querySelector('[data-testid="vault-gutter-card-c"]')?.innerText,
    ariaExpanded: document.querySelector('[data-testid="vault-gutter-card-c"] button')?.getAttribute('aria-expanded'),
    fullBodyIncludesSeed: document.body.innerText.includes('server seed'),
    fullBodyIncludesRoundId: document.body.innerText.includes('round id'),
  }));
  console.log('AFTER:', JSON.stringify(afterDom));

  await browser.close();
})();
