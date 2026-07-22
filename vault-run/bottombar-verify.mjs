import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const W = parseInt(process.argv[2] || '1440'), H = parseInt(process.argv[3] || '900'), TAG = process.argv[4] || 'D1440';
const PORT = process.argv[5] || '5181';
const S = 'shots/bottombar-';

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: false,
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
  args: [`--window-size=${W + 20},${H + 140}`, '--autoplay-policy=no-user-gesture-required'],
});
const page = (await browser.pages())[0];
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
await wait(1200);

async function clickText(t) {
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

async function cellCenter(idx, g) {
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

async function settled() {
  return await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'));
}

// ── 1. LOBBY ────────────────────────────────────────────────────────────
await page.screenshot({ path: S + `${TAG}-lobby.png`, fullPage: false });
console.log('shot: lobby', TAG);

// ── 2. BET-ENTRY ────────────────────────────────────────────────────────
await clickText('ape in');
await wait(700);
await page.screenshot({ path: S + `${TAG}-betentry.png`, fullPage: false });
console.log('shot: betentry', TAG);

// ── 3. PLAYING ──────────────────────────────────────────────────────────
await clickText('send it');
await wait(900);
await page.screenshot({ path: S + `${TAG}-playing.png`, fullPage: false });
console.log('shot: playing', TAG);

// ── 4. SETTLED ──────────────────────────────────────────────────────────
let settledNow = false;
for (let k = 0; k < 6 && !settledNow; k++) {
  const { cx, cy } = await cellCenter([1, 6, 11, 17, 22, 3][k] || 2, 5);
  await page.mouse.click(cx, cy); await wait(500);
  settledNow = await settled();
}
if (!settledNow) { await clickText('take profit'); await wait(900); settledNow = await settled(); }
await wait(600);
await page.screenshot({ path: S + `${TAG}-settled.png`, fullPage: false });
console.log('shot: settled', TAG, 'settledNow=', settledNow);

// Layout sanity numbers (viewport height, void below last panel child on wide).
const layout = await page.evaluate(() => {
  const panelEl = document.querySelector('div[aria-live="polite"][aria-label]');
  const panelRect = panelEl ? panelEl.getBoundingClientRect() : null;
  const lastChild = panelEl ? panelEl.children[panelEl.children.length - 1] : null;
  const lastRect = lastChild ? lastChild.getBoundingClientRect() : null;
  const kids = panelEl ? [...panelEl.children].map((k) => ({
    tag: k.tagName, cls: k.className, text: k.textContent.slice(0, 30),
    top: Math.round(k.getBoundingClientRect().top), bottom: Math.round(k.getBoundingClientRect().bottom),
    left: Math.round(k.getBoundingClientRect().left), right: Math.round(k.getBoundingClientRect().right),
  })) : [];
  const cabinet = document.querySelector('[data-testid="vault-canvas-shell"]')?.parentElement;
  const cabinetRect = cabinet ? cabinet.getBoundingClientRect() : null;
  return {
    panel: panelRect && { top: Math.round(panelRect.top), bottom: Math.round(panelRect.bottom), height: Math.round(panelRect.height) },
    voidBelowLast: panelRect && lastRect ? Math.round(panelRect.bottom - lastRect.bottom) : null,
    kids,
    cabinetBottom: cabinetRect ? Math.round(cabinetRect.bottom) : null,
  };
});
console.log('LAYOUT', TAG, JSON.stringify(layout, null, 1));

await browser.close();
console.log('DONE', TAG);
