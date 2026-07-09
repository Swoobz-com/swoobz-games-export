import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.argv[2] || '5182';
const W = parseInt(process.argv[3] || '1440');
const H = parseInt(process.argv[4] || '900');
const TAG = process.argv[5] || 'D1440';
const S = 'shots/holdgate-supp-';

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: false,
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
  args: [`--window-size=${W + 20},${H + 140}`, '--autoplay-policy=no-user-gesture-required'],
});
const page = (await browser.pages())[0];
const consoleErrors = [];
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));

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
async function settled() { return await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again')); }
async function playRound(outcome, maxAttempts = 10) {
  let attempts = 0, gotOutcome = false, lastLabel = null;
  while (!gotOutcome && attempts < maxAttempts) {
    attempts++;
    const clickedApe = await clickText('ape in');
    if (!clickedApe) await clickText('bet again');
    await wait(600);
    await clickText('send it'); await wait(800);
    let settledNow = false;
    if (outcome === 'rug') {
      for (let k = 0; k < 25 && !settledNow; k++) {
        const { cx, cy } = await cellCenter(k, 5);
        await page.mouse.click(cx, cy); await wait(140);
        settledNow = await settled();
      }
    } else {
      for (let k = 0; k < 4 && !settledNow; k++) {
        const { cx, cy } = await cellCenter([1, 6, 11, 17, 22][k] || 2, 5);
        await page.mouse.click(cx, cy); await wait(450);
        settledNow = await settled();
      }
      if (!settledNow) { await clickText('take profit'); await wait(800); settledNow = await settled(); }
    }
    await wait(350);
    lastLabel = await page.evaluate(() => {
      const el = document.querySelector('div[aria-live="polite"][aria-label]');
      return el ? el.getAttribute('aria-label') : null;
    });
    gotOutcome = outcome === 'rug'
      ? !!(lastLabel && lastLabel.toLowerCase().startsWith('rugged'))
      : !!(lastLabel && lastLabel.toLowerCase().startsWith('took profit'));
    if (!gotOutcome && settledNow) { const c = await clickText('bet again'); if (c) await wait(600); }
  }
  return { attempts, gotOutcome, lastLabel };
}

console.log(`\n=== [${TAG}] IN-CANVAS OVERLAP + RESTART LATENCY (WIN) ===`);
{
  const r = await playRound('win');
  console.log('outcome', JSON.stringify(r));
  await wait(300);
  await page.screenshot({ path: S + `${TAG}-settled-win.png` });

  const geom = await page.evaluate(() => {
    const plain = (r) => r && { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), height: Math.round(r.height) };
    const canvas = document.querySelector('canvas');
    const cr = canvas ? canvas.getBoundingClientRect() : null;
    const nearWrap = document.querySelector('[data-testid="vault-board-rebet"]');
    const nearBtn = nearWrap ? nearWrap.querySelector('button') : null;
    const nr = nearBtn ? nearBtn.getBoundingClientRect() : null;
    const docEl = document.documentElement;
    return {
      canvas: plain(cr),
      nearBtn: plain(nr),
      viewportH: window.innerHeight,
      viewportW: window.innerWidth,
      inFold: nr ? (nr.top >= 0 && nr.bottom <= window.innerHeight) : null,
      scrollHeight: docEl.scrollHeight,
    };
  });
  console.log('GEOM', JSON.stringify(geom));
  if (geom.canvas && geom.nearBtn) {
    const btnCx = geom.nearBtn.left + geom.nearBtn.width / 2;
    const canvasCx = geom.canvas.left + geom.canvas.width / 2;
    const horizOverlap = geom.nearBtn.right > geom.canvas.left && geom.nearBtn.left < geom.canvas.right;
    const vertOverlap = geom.nearBtn.bottom > geom.canvas.top && geom.nearBtn.top < geom.canvas.bottom;
    const centeredDeltaPx = Math.round(Math.abs(btnCx - canvasCx));
    console.log('IN-CANVAS-OVERLAP horizontal?', horizOverlap, 'vertical?', vertOverlap, 'centeredDeltaPx', centeredDeltaPx, 'inViewportFold', geom.inFold);
  }

  // Restart latency: click, then poll for the phase-advance signal ASAP.
  const nearRect = await page.evaluate(() => {
    const w = document.querySelector('[data-testid="vault-board-rebet"]');
    const b = w ? w.querySelector('button') : null;
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (nearRect) {
    const t0 = Date.now();
    await page.mouse.click(nearRect.x, nearRect.y);
    let advanced = false;
    let elapsed = null;
    for (let i = 0; i < 30; i++) {
      const still = await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'));
      if (!still) { advanced = true; elapsed = Date.now() - t0; break; }
      await wait(50);
    }
    console.log('RESTART LATENCY (near-board click -> settled UI gone) ms:', elapsed, 'advanced:', advanced);
  }
}

console.log(`\n=== [${TAG}] RUG round -> near-board reachable & clickable in fold ===`);
{
  // finish current round if mid-play, then force a rug
  let s = await settled();
  if (!s) {
    let guard = 0;
    while (!s && guard < 25) {
      const { cx, cy } = await cellCenter(guard, 5);
      await page.mouse.click(cx, cy); await wait(140);
      s = await settled();
      guard++;
    }
    if (!s) { await clickText('take profit'); await wait(800); }
  }
  await wait(300);
  const r = await playRound('rug');
  console.log('rug outcome', JSON.stringify(r));
  await wait(300);
  await page.screenshot({ path: S + `${TAG}-settled-rug.png` });
  const geom2 = await page.evaluate(() => {
    const nearWrap = document.querySelector('[data-testid="vault-board-rebet"]');
    const nearBtn = nearWrap ? nearWrap.querySelector('button') : null;
    if (!nearBtn) return null;
    const r = nearBtn.getBoundingClientRect();
    return {
      top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height),
      inFold: r.top >= 0 && r.bottom <= window.innerHeight,
      pointerEvents: getComputedStyle(nearBtn).pointerEvents,
      disabled: nearBtn.disabled,
    };
  });
  console.log('RUG near-board button geometry/fold', JSON.stringify(geom2));
  if (geom2 && geom2.inFold) {
    await wait(500);
    await page.mouse.click(geom2.left + geom2.width / 2, geom2.top + geom2.height / 2);
    await wait(600);
    const advanced = !(await settled());
    console.log('RUG near-board click advanced phase?', advanced);
  } else if (geom2) {
    console.log('RUG near-board button OUT OF FOLD -- would need scroll on this viewport');
  }
}

console.log(`\n=== [${TAG}] CONSOLE ERRORS ===`);
console.log(JSON.stringify(consoleErrors, null, 1));
console.log('TOTAL CONSOLE ERRORS:', consoleErrors.length);

await browser.close();
console.log('DONE holdgate-supplement', TAG);
