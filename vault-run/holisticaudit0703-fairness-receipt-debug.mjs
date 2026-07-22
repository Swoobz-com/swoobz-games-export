import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return els.find(e => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase())
      || els.find(e => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
async function cellCenter(page, idx, g) {
  return await page.evaluate(({ idx, g }) => {
    const c = document.querySelector('canvas');
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
async function settled(page) { return await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again')); }

const browser = await puppeteer.launch({ executablePath: EXE, headless: false, defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 }, args: ['--window-size=1460,1040','--autoplay-policy=no-user-gesture-required'] });
const page = (await browser.pages())[0];
await page.goto('http://localhost:5307/', { waitUntil: 'networkidle2', timeout: 60000 });
await wait(1000);
await clickText(page, 'ape in'); await wait(500);
await clickText(page, 'send it'); await wait(700);
let s = false;
for (let k = 0; k < 25 && !s; k++) {
  const { cx, cy } = await cellCenter(page, k, 5);
  await page.mouse.click(cx, cy);
  await wait(160);
  s = await settled(page);
}
await wait(1800);
const before = await page.evaluate(() => ({
  hasEl: !!document.getElementById('vault-settled-receipt'),
  toggleButtons: [...document.querySelectorAll('.vault-receipt-toggle')].map(b => ({ text: b.textContent, ariaExpanded: b.getAttribute('aria-expanded'), visible: b.offsetParent !== null, rect: b.getBoundingClientRect().toJSON ? undefined : null })),
}));
console.log('BEFORE TOGGLE', JSON.stringify(before, null, 1));
const toggled = await clickText(page, 'view receipt');
console.log('toggled?', toggled);
await wait(600);
const after = await page.evaluate(() => {
  const el = document.getElementById('vault-settled-receipt');
  const toggles = [...document.querySelectorAll('.vault-receipt-toggle')].map(b => ({ text: b.textContent, ariaExpanded: b.getAttribute('aria-expanded') }));
  return {
    hasEl: !!el,
    elVisible: el ? el.offsetParent !== null : null,
    elText: el ? el.textContent.slice(0, 400) : null,
    toggles,
    bodyHasServerSeed: document.body.textContent.includes('server seed'),
  };
});
console.log('AFTER TOGGLE', JSON.stringify(after, null, 1));
await page.screenshot({ path: 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/vault-run/shots-holisticaudit0703/fairness/debug-after-toggle.png', fullPage: true });
await browser.close();
