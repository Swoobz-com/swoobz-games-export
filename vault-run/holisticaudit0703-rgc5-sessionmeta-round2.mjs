import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5309';
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
async function cellCenter(page, idx, gridSize) {
  return await page.evaluate(({ idx, gridSize }) => {
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    const W = r.width, H = r.height;
    const wide = W / H > 1.2;
    const topReserved = H * (wide ? 0.12 : 0.15), bottomReserved = H * (wide ? 0.14 : 0.18), sideFrac = 0.08;
    const safeW = W * (1 - sideFrac * 2);
    const safeH = (H - topReserved - bottomReserved) * 0.96;
    const available = Math.min(safeW, safeH);
    const gap = Math.max(6, available * 0.026);
    const tile = (available - gap * (gridSize - 1)) / gridSize;
    const full = tile * gridSize + gap * (gridSize - 1);
    const x0 = (W - full) / 2;
    const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2;
    const y0 = bandCenterY - full / 2;
    const col = idx % gridSize, row = Math.floor(idx / gridSize);
    const cx = r.left + x0 + col * (tile + gap) + tile / 2;
    const cy = r.top + y0 + row * (tile + gap) + tile / 2;
    return { cx, cy };
  }, { idx, gridSize });
}
const dump = async (page, label) => {
  const txt = await page.evaluate(() => [...document.querySelectorAll('span')].map(s=>s.textContent).filter(Boolean)
    .filter(t => t.toUpperCase().includes('SESSION') || t.toUpperCase().includes('BALANCE') || t.toUpperCase().includes('ROUND')));
  console.log(label, JSON.stringify(txt));
};
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in');
  await wait(400);
  await clickText(page, 'bluechips', '[data-testid="vault-betentry-world"]');
  await wait(300);
  await clickText(page, 'SEND IT', '[data-testid="vault-betentry-confirm"]');
  await wait(700);
  let revealed = false;
  for (let i = 0; i < 25 && !revealed; i++) {
    const { cx, cy } = await cellCenter(page, i, 5);
    await page.mouse.click(cx, cy);
    await wait(350);
    const canCashOutNow = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="vault-playing-actions"]');
      if (!el) return false;
      const btns = [...el.querySelectorAll('button')];
      const b = btns.find((x) => x.textContent.toLowerCase().includes('take profit'));
      return b ? !b.disabled : false;
    });
    if (canCashOutNow) { revealed = true; break; }
  }
  console.log('revealed', revealed);
  await clickText(page, 'take profit', '[data-testid="vault-playing-actions"]');
  await wait(700);
  await dump(page, 'SETTLED (round1 done)');
  // go back to bet-entry via "change mode"
  await clickText(page, 'change mode');
  await wait(500);
  await dump(page, 'BETENTRY (round2, rounds=1 already)');
  await browser.close();
})();
