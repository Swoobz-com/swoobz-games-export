import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.argv[2] || '5181';
const S = 'shots/qaindep0703-supp-';

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return els.find(e => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase())
      || els.find(e => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, t);
  const el = h.asElement();
  if (!el) { console.log('NO BTN:', t); return false; }
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
async function settledLabel(page) {
  return await page.evaluate(() => {
    const el = document.querySelector('div[aria-live="polite"][aria-label]');
    return el ? el.getAttribute('aria-label') : null;
  });
}

const W = 1440, H = 900;
const browser = await puppeteer.launch({
  executablePath: EXE, headless: false,
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
  args: [`--window-size=${W + 20},${H + 140}`, '--autoplay-policy=no-user-gesture-required'],
});
const page = (await browser.pages())[0];
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
await wait(1400);

// drive to a WIN settle
let lbl = null;
for (let attempt = 0; attempt < 8 && !(lbl && /took profit/i.test(lbl)); attempt++) {
  const clickedApe = await clickText(page, 'ape in');
  if (!clickedApe) await clickText(page, 'bet again');
  await wait(700);
  await clickText(page, 'send it');
  await wait(900);
  let busted = false;
  for (const idx of [1, 6]) {
    const c = await cellCenter(page, idx, 5);
    await page.mouse.click(c.cx, c.cy);
    await wait(450);
    const l = await settledLabel(page);
    if (l) { busted = /rugged/i.test(l); lbl = l; break; }
  }
  if (busted) continue;
  await clickText(page, 'take profit');
  await wait(900);
  lbl = await settledLabel(page);
}
console.log('final label', lbl);

// ── geometry: near-board VaultBoardRebet vs bottom-bar top gap ──
const geom = await page.evaluate(() => {
  const nearBoard = document.querySelector('[data-testid="vault-board-rebet"]');
  const nbRect = nearBoard ? nearBoard.getBoundingClientRect() : null;
  const panelWrap = document.querySelector('[aria-live="polite"]:not([aria-label])');
  const barChild = panelWrap ? panelWrap.firstElementChild : null;
  const barRect = barChild ? barChild.getBoundingClientRect() : null;
  const barBtn = barChild ? [...barChild.querySelectorAll('button')].find(b => b.textContent.toLowerCase().includes('bet again')) : null;
  const barBtnRect = barBtn ? barBtn.getBoundingClientRect() : null;
  return {
    nearBoard: nbRect && { top: Math.round(nbRect.top), bottom: Math.round(nbRect.bottom), left: Math.round(nbRect.left), right: Math.round(nbRect.right) },
    bar: barRect && { top: Math.round(barRect.top), bottom: Math.round(barRect.bottom) },
    barBetAgainBtn: barBtnRect && { top: Math.round(barBtnRect.top), bottom: Math.round(barBtnRect.bottom), left: Math.round(barBtnRect.left), right: Math.round(barBtnRect.right) },
    gapNearBoardToBarTop: nbRect && barRect ? Math.round(barRect.top - nbRect.bottom) : null,
  };
});
console.log('GEOM', JSON.stringify(geom, null, 1));

await page.screenshot({ path: S + 'D1440-win-full.png' });

// ── crop-region screenshot of just the bottom bar for cohesion review ──
const barRect2 = await page.evaluate(() => {
  const panelWrap = document.querySelector('[aria-live="polite"]:not([aria-label])');
  const child = panelWrap ? panelWrap.firstElementChild : null;
  const r = child.getBoundingClientRect();
  return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
});
await page.screenshot({ path: S + 'D1440-win-barcrop.png', clip: { x: Math.max(0, barRect2.x - 4), y: Math.max(0, barRect2.y - 4), width: barRect2.width + 8, height: barRect2.height + 8 } });

// ── computed styles: BET AGAIN gradient (bar button) + near-board button + separator/highlight cyan check ──
const styles = await page.evaluate(() => {
  const nb = document.querySelector('[data-testid="vault-board-rebet"] button');
  const panelWrap = document.querySelector('[aria-live="polite"]:not([aria-label])');
  const barBtn = panelWrap ? [...panelWrap.querySelectorAll('button')].find(b => b.textContent.toLowerCase().includes('bet again')) : null;
  const cs = (el) => el ? { backgroundImage: getComputedStyle(el).backgroundImage, background: getComputedStyle(el).background, border: getComputedStyle(el).border } : null;
  return { nearBoardBtn: cs(nb), barBetAgainBtn: cs(barBtn) };
});
console.log('STYLES', JSON.stringify(styles, null, 1));

await browser.close();
console.log('DONE supplement');
