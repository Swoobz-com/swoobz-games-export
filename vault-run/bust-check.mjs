import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const W = parseInt(process.argv[2] || '390'), H = parseInt(process.argv[3] || '844'), TAG = process.argv[4] || 'M390';
const PORT = process.argv[5] || '5181';
const S = 'shots/bust-';

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: false,
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
  args: [`--window-size=${W + 20},${H + 140}`, '--autoplay-policy=no-user-gesture-required'],
});
const page = (await browser.pages())[0];
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
await wait(1500);

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
async function isBust() {
  return await page.evaluate(() => document.body.textContent.toLowerCase().includes('bust'));
}

let attempts = 0;
let gotBust = false;
while (!gotBust && attempts < 6) {
  attempts++;
  const clickedApe = await clickText('ape in');
  if (!clickedApe) await clickText('bet again');
  await wait(600);
  await clickText('send it'); await wait(800);
  let settledNow = false;
  // tap ALL 25 tiles rapidly to maximize chance of hitting the mine (forces a bust)
  for (let k = 0; k < 25 && !settledNow; k++) {
    const { cx, cy } = await cellCenter(k, 5);
    await page.mouse.click(cx, cy); await wait(150);
    settledNow = await settled();
  }
  if (!settledNow) { await clickText('take profit'); await wait(600); settledNow = await settled(); }
  await wait(400);
  gotBust = await isBust();
  console.log('attempt', attempts, 'settled', settledNow, 'bust', gotBust);
}

await wait(300);
await page.screenshot({ path: S + `${TAG}-settled.png` });

const layout = await page.evaluate(() => {
  const panelEl = document.querySelector('div[aria-live="polite"][aria-label]');
  const btn = [...document.querySelectorAll('button')].find(
    e => e.offsetParent !== null && e.textContent.trim().toLowerCase().includes('bet again'),
  );
  const panelRect = panelEl ? panelEl.getBoundingClientRect() : null;
  const btnRect = btn ? btn.getBoundingClientRect() : null;
  const kids = panelEl ? [...panelEl.children].map((k, i) => ({
    i, text: k.textContent.slice(0, 40),
    top: Math.round(k.getBoundingClientRect().top), bottom: Math.round(k.getBoundingClientRect().bottom),
  })) : [];
  const docEl = document.documentElement;
  return {
    bust: document.body.textContent.toLowerCase().includes('bust'),
    viewportH: window.innerHeight,
    scrollHeight: docEl.scrollHeight,
    hasVerticalOverflow: docEl.scrollHeight > window.innerHeight,
    panel: panelRect && { top: Math.round(panelRect.top), bottom: Math.round(panelRect.bottom) },
    betAgain: btnRect && { top: Math.round(btnRect.top), bottom: Math.round(btnRect.bottom), width: Math.round(btnRect.width), height: Math.round(btnRect.height) },
    kids,
  };
});
console.log('LAYOUT', TAG, JSON.stringify(layout, null, 1));

await browser.close();
console.log('DONE', TAG);
