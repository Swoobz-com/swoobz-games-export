import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const W = parseInt(process.argv[2] || '1440');
const H = parseInt(process.argv[3] || '900');
const TAG = process.argv[4] || 'D1440';
const PORT = process.argv[5] || '5182';
const OUTCOME = process.argv[6] || 'rug'; // 'rug' | 'win'
const S = 'shots/rebet-';

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
async function panelAriaLabel() {
  return await page.evaluate(() => {
    const el = document.querySelector('div[aria-live="polite"][aria-label]');
    return el ? el.getAttribute('aria-label') : null;
  });
}

let attempts = 0;
let gotOutcome = false;
while (!gotOutcome && attempts < 8) {
  attempts++;
  const clickedApe = await clickText('ape in');
  if (!clickedApe) await clickText('bet again');
  await wait(700);
  await clickText('send it'); await wait(900);
  let settledNow = false;
  if (OUTCOME === 'rug') {
    // Tap ALL 25 tiles rapidly to maximize chance of hitting the mine.
    for (let k = 0; k < 25 && !settledNow; k++) {
      const { cx, cy } = await cellCenter(k, 5);
      await page.mouse.click(cx, cy); await wait(150);
      settledNow = await settled();
    }
  } else {
    for (let k = 0; k < 4 && !settledNow; k++) {
      const { cx, cy } = await cellCenter([1, 6, 11, 17, 22][k] || 2, 5);
      await page.mouse.click(cx, cy); await wait(500);
      settledNow = await settled();
    }
    if (!settledNow) { await clickText('take profit'); await wait(900); settledNow = await settled(); }
  }
  // Sample the misclick guard EARLY (well under REBET_LEDGE_ENTER_DELAY_MS
  // = 240ms) — before the settle-confirmation waits below give it time to
  // flip. Proves pointer-events starts 'none' and is not clickable yet.
  if (settledNow) {
    const early = await page.evaluate(() => {
      const w = document.querySelector('[data-testid="vault-board-rebet"]');
      const b = w ? w.querySelector('button') : null;
      return b ? getComputedStyle(b).pointerEvents : null;
    });
    console.log('GUARD-EARLY pointerEvents (<240ms post-settle):', early);
  }
  await wait(400);
  const label = await panelAriaLabel();
  gotOutcome = OUTCOME === 'rug'
    ? !!(label && label.toLowerCase().startsWith('rugged'))
    : !!(label && label.toLowerCase().startsWith('took profit'));
  console.log('attempt', attempts, 'settled', settledNow, 'label', label, 'gotOutcome', gotOutcome);
}

await wait(300);
await page.screenshot({ path: S + `${TAG}-${OUTCOME}.png` });

// Wait past HERO_VISIBLE_MS (2000ms) to prove the near-board CTA PERSISTS
// after VaultHeroOverlay auto-dismisses (it is an independent component).
await wait(2200);
await page.screenshot({ path: S + `${TAG}-${OUTCOME}-post2s.png` });

const measure = await page.evaluate(() => {
  const nearWrap = document.querySelector('[data-testid="vault-board-rebet"]');
  const nearBtn = nearWrap ? nearWrap.querySelector('button') : null;
  const allBetAgain = [...document.querySelectorAll('button')].filter(
    e => e.offsetParent !== null && e.textContent.trim().toLowerCase().includes('bet again'),
  );
  const sidebarBtn = allBetAgain.find(b => !nearWrap || !nearWrap.contains(b)) || null;
  const canvas = document.querySelector('canvas');
  const canvasRect = canvas ? canvas.getBoundingClientRect() : null;
  const boardCenter = canvasRect ? { x: canvasRect.left + canvasRect.width / 2, y: canvasRect.top + canvasRect.height * 0.72 } : null;
  const nearRect = nearBtn ? nearBtn.getBoundingClientRect() : null;
  const sidebarRect = sidebarBtn ? sidebarBtn.getBoundingClientRect() : null;
  const heroPresent = !!document.querySelector('[data-testid="vault-hero-overlay"]');
  function dist(r) {
    if (!r || !boardCenter) return null;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    return Math.round(Math.hypot(cx - boardCenter.x, cy - boardCenter.y));
  }
  return {
    heroStillPresent: heroPresent,
    viewportH: window.innerHeight,
    scrollY: window.scrollY,
    docScrollHeight: document.documentElement.scrollHeight,
    nearBoardExists: !!nearBtn,
    nearBoard: nearRect && { top: Math.round(nearRect.top), bottom: Math.round(nearRect.bottom), left: Math.round(nearRect.left), width: Math.round(nearRect.width), height: Math.round(nearRect.height), pointerEvents: getComputedStyle(nearBtn).pointerEvents, disabled: nearBtn.disabled, ariaLabel: nearBtn.getAttribute('aria-label') },
    sidebarExists: !!sidebarBtn,
    sidebar: sidebarRect && { top: Math.round(sidebarRect.top), bottom: Math.round(sidebarRect.bottom), left: Math.round(sidebarRect.left), width: Math.round(sidebarRect.width), height: Math.round(sidebarRect.height), ariaLabel: sidebarBtn.getAttribute('aria-label') },
    distNearToBoardCenter: dist(nearRect),
    distSidebarToBoardCenter: dist(sidebarRect),
    nearVisibleWithoutScroll: nearRect ? (nearRect.top >= 0 && nearRect.bottom <= window.innerHeight) : null,
  };
});
console.log('MEASURE', TAG, OUTCOME, JSON.stringify(measure, null, 1));

// Click-test: a REAL mouse click at the button's on-screen coordinates
// (respects pointer-events hit-testing, unlike a programmatic el.click())
// confirms the near-board CTA actually fires handleBetAgain once past the
// misclick-guard delay (we are >2.5s post-settle here, well past 240ms).
const before = await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'));
const nearRectForClick = await page.evaluate(() => {
  const w = document.querySelector('[data-testid="vault-board-rebet"]');
  const b = w ? w.querySelector('button') : null;
  if (!b || b.disabled) return null;
  const r = b.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
let clicked = false;
if (nearRectForClick) {
  await page.mouse.click(nearRectForClick.x, nearRectForClick.y);
  clicked = true;
}
await wait(600);
const after = await page.evaluate(() => document.body.textContent.toLowerCase());
console.log('CLICK-TEST', TAG, OUTCOME, 'clicked', clicked, 'before(settled)', before, 'afterHasSendIt', after.includes('send it'), 'afterHasPumping', after.includes('pumping') || after.includes('safe left'));

await browser.close();
console.log('DONE', TAG, OUTCOME);
