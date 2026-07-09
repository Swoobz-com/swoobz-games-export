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
async function cellCenter(page, idx, gridSize) {
  return await page.evaluate(({ idx, gridSize }) => {
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    const W = r.width, H = r.height;
    const topReserved = H * 0.15, bottomReserved = H * 0.18, sideFrac = 0.08;
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
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5190/', { waitUntil: 'networkidle0' });
  await wait(400);
  await clickText(page, 'ape in'); await wait(400);
  await clickText(page, 'bluechips', '[data-testid="vault-betentry-world"]'); await wait(200);
  await clickText(page, 'SEND IT'); await wait(600);
  // reveal until settled either win or rug
  let settled=false;
  for (let i=0;i<25 && !settled;i++){
    const {cx,cy}=await cellCenter(page,i,5);
    await page.mouse.click(cx,cy); await wait(350);
    const txt = await page.evaluate(()=>document.body.textContent);
    if (/BET AGAIN/i.test(txt)) settled=true;
  }
  const rects = await page.evaluate(() => {
    const g1 = document.querySelector('[data-testid="vault-settled-right-new"]');
    const cardBC = document.querySelector('[data-testid="vault-gutter-right"]');
    const leftNew = document.querySelector('[data-testid="vault-settled-left"]');
    return {
      rightGroup1: g1 ? g1.getBoundingClientRect().toJSON() : null,
      rightCardBC: cardBC ? cardBC.getBoundingClientRect().toJSON() : null,
      leftNew: leftNew ? leftNew.getBoundingClientRect().toJSON() : null,
    };
  });
  console.log('settled:', settled);
  console.log(JSON.stringify(rects, null, 2));
  await browser.close();
})();
