import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.argv[2] || '5181';

const VIEWPORTS = [
  { w: 412, h: 915, tag: 'Pixel7' },
  { w: 393, h: 852, tag: 'iPhone14Pro' },
];

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: false,
  protocolTimeout: 60000,
  args: ['--autoplay-policy=no-user-gesture-required'],
});

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

async function settled(page) {
  return await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'));
}

async function playOneRound(page) {
  const clickedApe = await clickText(page, 'ape in');
  if (!clickedApe) await clickText(page, 'bet again');
  await wait(700);
  await clickText(page, 'send it'); await wait(900);
  let settledNow = false;
  for (let k = 0; k < 4 && !settledNow; k++) {
    const { cx, cy } = await cellCenter(page, [1, 6, 11, 17, 22][k] || 2, 5);
    await page.mouse.click(cx, cy); await wait(500);
    settledNow = await settled(page);
  }
  if (!settledNow) { await clickText(page, 'take profit'); await wait(900); }
  await wait(400);
}

for (const vp of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1200);

  await playOneRound(page);
  await wait(300);

  const isSettled = await settled(page);
  console.log(vp.tag, 'settled reached:', isSettled);

  await page.screenshot({ path: `shots/mobqa-${vp.tag}-settled.png`, fullPage: false });

  const data = await page.evaluate(() => {
    const panelEl = document.querySelector('div[aria-live="polite"][aria-label]');
    const btn = [...document.querySelectorAll('button')].find(
      e => e.offsetParent !== null && e.textContent.trim().toLowerCase().includes('bet again'),
    );
    const stepBtns = [...document.querySelectorAll('button[aria-label="Decrease next bet"], button[aria-label="Increase next bet"]')];
    const panelRect = panelEl ? panelEl.getBoundingClientRect() : null;
    const btnRect = btn ? btn.getBoundingClientRect() : null;
    const kids = panelEl ? [...panelEl.children].map((k, i) => ({
      i, text: k.textContent.slice(0, 50),
      top: Math.round(k.getBoundingClientRect().top), bottom: Math.round(k.getBoundingClientRect().bottom),
      height: Math.round(k.getBoundingClientRect().height),
    })) : [];
    const bodyRect = document.body.getBoundingClientRect();
    const docEl = document.documentElement;
    const stepRects = stepBtns.map(b => {
      const r = b.getBoundingClientRect();
      return { label: b.getAttribute('aria-label'), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), left: Math.round(r.left) };
    });
    const canvas = document.querySelector('canvas');
    const canvasRect = canvas ? canvas.getBoundingClientRect() : null;
    return {
      viewportW: window.innerWidth,
      viewportH: window.innerHeight,
      scrollWidth: docEl.scrollWidth,
      clientWidth: docEl.clientWidth,
      hasHorizontalOverflow: docEl.scrollWidth > docEl.clientWidth,
      panel: panelRect && { top: Math.round(panelRect.top), bottom: Math.round(panelRect.bottom), left: Math.round(panelRect.left), right: Math.round(panelRect.right), height: Math.round(panelRect.height) },
      betAgain: btnRect && { top: Math.round(btnRect.top), bottom: Math.round(btnRect.bottom), left: Math.round(btnRect.left), right: Math.round(btnRect.right), width: Math.round(btnRect.width), height: Math.round(btnRect.height) },
      betAgainVerticalCenterPct: btnRect ? Math.round(((btnRect.top + btnRect.bottom) / 2 / window.innerHeight) * 1000) / 10 : null,
      stepRects,
      kids,
      canvasRect: canvasRect && { top: Math.round(canvasRect.top), bottom: Math.round(canvasRect.bottom), left: Math.round(canvasRect.left), right: Math.round(canvasRect.right) },
    };
  });
  console.log('DATA', vp.tag, JSON.stringify(data, null, 1));

  // Overlap check: does panel top overlap canvas bottom in x-range (shouldn't - panel below board)
  await page.close();
}

await browser.close();
console.log('DONE');
