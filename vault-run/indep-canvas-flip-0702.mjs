// Dedicated mid-flip visual capture, canvas-native (avoids the OS-level
// page.screenshot() latency discovered in indep-timing-visual-0702.mjs's
// visual-a1 run, where a full-page screenshot taken "immediately after
// GO" already showed the fully-settled RUGGED view -- proving
// page.screenshot() itself costs several hundred ms of wall clock in this
// environment, which is worthless for catching a 180ms (TILE_FLIP_MS)
// animation window). Instead: page.evaluate() a canvas.toDataURL() capture
// gated on requestAnimationFrame COUNT (frame 1, 2, 3, 5, 10 after the
// evaluate call is dispatched) -- this stays inside the renderer process,
// no cross-process screenshot round-trip, so it reliably lands inside the
// flip window.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.argv[2] || '5185';
const S = 'shots/canvasflip0702-';

async function newPage(browser) {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e && e.message || e)));
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch {} });
  await page.goto(`http://localhost:${PORT}/originals/vault`, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1200);
  return { page, pageErrors };
}
function helpers(page) {
  async function clickText(t) {
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
  async function cc(idx, g) {
    return await page.evaluate(({ idx, g }) => {
      const c = document.querySelector('canvas'); if (!c) return null;
      const r = c.getBoundingClientRect();
      const W = r.width, H = r.height;
      const tR = H * 0.15, bR = H * 0.18, sF = 0.08;
      const sW = W * (1 - sF * 2), sH = (H - tR - bR) * 0.96;
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
  function snake(n, g = 5) {
    const out = [];
    for (let row = 0; row < g && out.length < n; row++) {
      const cols = row % 2 === 0 ? [0, 1, 2, 3, 4] : [4, 3, 2, 1, 0];
      for (const col of cols) { if (out.length >= n) break; out.push(row * g + col); }
    }
    return out;
  }
  async function tapTrail(indices, g) {
    for (const idx of indices) {
      const c = await cc(idx, g); if (!c) continue;
      await page.mouse.move(c.cx, c.cy);
      await page.mouse.down();
      await wait(30);
      await page.mouse.up();
      await wait(60);
    }
  }
  async function goAriaLabel() {
    return await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null);
      for (const b of btns) { const al = b.getAttribute('aria-label') || ''; if (/^Run your trail of/.test(al)) return al; }
      return null;
    });
  }
  async function setPace(target) {
    const btns = await page.evaluate(() => [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null).map(b => ({ t: b.textContent.trim(), pressed: b.getAttribute('aria-pressed') })));
    const btn = btns.find(b => b.t.toLowerCase() === target.toLowerCase());
    if (btn && btn.pressed !== 'true') await clickText(target);
  }
  return { clickText, cc, snake, tapTrail, goAriaLabel, setPace };
}
async function enterPlayingWithTrail(h, size, g = 5) {
  await h.clickText('ape in');
  await wait(600);
  await h.clickText('send it');
  await wait(900);
  await h.clickText('TRAIL');
  await wait(300);
  await h.tapTrail(h.snake(size, g), g);
  return await h.goAriaLabel();
}
// captures canvas.toDataURL() after exactly `frames` requestAnimationFrame ticks
// from the moment this evaluate call is scheduled.
async function captureAtFrame(page, frames) {
  return await page.evaluate((frames) => new Promise((resolve) => {
    const c = document.querySelector('canvas');
    if (!c) { resolve(null); return; }
    let n = 0;
    function tick() {
      n++;
      if (n >= frames) { resolve(c.toDataURL('image/png')); return; }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }), frames);
}
function saveDataUrl(dataUrl, path) {
  if (!dataUrl) return false;
  const b64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(path, Buffer.from(b64, 'base64'));
  return true;
}

async function run(browser, size = 6, maxAttempts = 6) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { page, pageErrors } = await newPage(browser);
    const h = helpers(page);
    await enterPlayingWithTrail(h, size, 5);
    await h.setPace('instant');
    await wait(150);
    // pre-GO sealed frame
    const sealedUrl = await captureAtFrame(page, 1);
    saveDataUrl(sealedUrl, `${S}sealed-a${attempt}.png`);
    const t0 = Date.now();
    await h.clickText('GO');
    // Fire off frame-gated captures at 1, 2, 3, 6, 12 frames after click (~16/33/50/100/200ms @60fps)
    const frame1 = await captureAtFrame(page, 1);
    const t1 = Date.now() - t0;
    saveDataUrl(frame1, `${S}f1-a${attempt}.png`);
    const frame2 = await captureAtFrame(page, 2);
    const t2 = Date.now() - t0;
    saveDataUrl(frame2, `${S}f2-a${attempt}.png`);
    const frame3 = await captureAtFrame(page, 3);
    const t3 = Date.now() - t0;
    saveDataUrl(frame3, `${S}f3-a${attempt}.png`);
    const frame6 = await captureAtFrame(page, 6);
    const t6 = Date.now() - t0;
    saveDataUrl(frame6, `${S}f6-a${attempt}.png`);
    const frame12 = await captureAtFrame(page, 12);
    const t12 = Date.now() - t0;
    saveDataUrl(frame12, `${S}f12-a${attempt}.png`);
    await wait(400);
    const finalUrl = await captureAtFrame(page, 1);
    saveDataUrl(finalUrl, `${S}final-a${attempt}.png`);
    const settledLabel = await page.evaluate(() => {
      const el = document.querySelector('div[aria-live="polite"][aria-label]');
      return el ? el.getAttribute('aria-label') : null;
    });
    const bodyText = await page.evaluate(() => document.body.textContent);
    const mHit = bodyText.match(/(\d+)\s+of\s+(\d+)\s+safe compartments/);
    const cleanRun = !settledLabel || (mHit && parseInt(mHit[1], 10) === size);
    console.log(`[canvasflip] a${attempt} frame timestamps(ms): f1=${t1} f2=${t2} f3=${t3} f6=${t6} f12=${t12} settledLabel=${settledLabel} cleanRun=${cleanRun} pageErrors=${pageErrors.length}`);
    await page.close();
    if (cleanRun || attempt === maxAttempts) {
      return { attempt, t1, t2, t3, t6, t12, settledLabel, cleanRun, pageErrorCount: pageErrors.length };
    }
    // else: fall through to next attempt (mine hit early, retry for a clean multi-tile batch)
  }
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EXE, headless: false,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
    args: [`--window-size=1460,1040`, '--autoplay-policy=no-user-gesture-required'],
  });
  const result = await run(browser, 6);
  console.log('RESULT', JSON.stringify(result));
  await browser.close();
  console.log('DONE');
})();
