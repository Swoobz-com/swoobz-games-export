import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.argv[2] || '5182';
const S = 'shots/indep-final-';

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: false,
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  args: [`--window-size=1460,1040`, '--autoplay-policy=no-user-gesture-required'],
});
const page = (await browser.pages())[0];
const consoleErrors = [];
page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', err => consoleErrors.push('pageerror: ' + err.message));
await page.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch {} });
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
async function cc(idx, g) {
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
function snake(n, g = 5) {
  const out = [];
  for (let row = 0; row < g && out.length < n; row++) {
    const cols = row % 2 === 0 ? [0, 1, 2, 3, 4] : [4, 3, 2, 1, 0];
    for (const col of cols) { if (out.length >= n) break; out.push(row * g + col); }
  }
  return out;
}
// Build a trail via discrete quick TAPS (down+up at the same coords, well
// under the canvas's 220ms HOLD_MS and 10px DRAG_THRESHOLD_PX) instead of a
// continuous drag — VaultGridCanvas.tsx's handlePointerUp treats a clean tap
// with no movement as `onTileTrail(idx)` (a deterministic per-tile TOGGLE),
// which is far more reliable to script than the drag-paint gesture (which
// dropped tiles unpredictably in a prior attempt: 20/20 requested vs 8/20
// requested across two otherwise-identical runs).
async function tapTrail(indices, g) {
  for (const idx of indices) {
    const c = await cc(idx, g);
    if (!c) continue;
    await page.mouse.move(c.cx, c.cy);
    await page.mouse.down();
    await wait(30); // well under HOLD_MS=220
    await page.mouse.up();
    await wait(60);
  }
}
async function trailLength() {
  return await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null);
    for (const b of btns) {
      const al = b.getAttribute('aria-label') || '';
      const m = al.match(/Run your trail of (\d+) tiles/);
      if (m) return parseInt(m[1], 10);
    }
    return null;
  });
}
async function buttons() {
  return await page.evaluate(() => [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null).map(b => b.textContent.trim()));
}
async function settled() { return await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again')); }
async function getOutcomeLabel() {
  return await page.evaluate(() => {
    const p = document.querySelector('div[aria-live="polite"][aria-label]');
    return p ? p.getAttribute('aria-label') : null;
  });
}
async function panelText() {
  return await page.evaluate(() => {
    const p = document.querySelector('div[aria-live="polite"][aria-label]');
    return p ? p.textContent : '';
  });
}
async function pillState() {
  return await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null);
    const staggered = btns.find(b => b.textContent.trim().toLowerCase() === 'staggered');
    const instant = btns.find(b => b.textContent.trim().toLowerCase() === 'instant');
    const label = [...document.querySelectorAll('span')].find(e => e.textContent.trim().toLowerCase() === 'reveal pace');
    return {
      pillPresent: !!(staggered && instant),
      labelPresent: !!label,
      staggeredPressed: staggered ? staggered.getAttribute('aria-pressed') : null,
      instantPressed: instant ? instant.getAttribute('aria-pressed') : null,
    };
  });
}

async function freshRound() {
  const clickedApe = await clickText('ape in');
  if (!clickedApe) { await clickText('bet again'); await wait(900); }
  else { await wait(700); await clickText('send it'); await wait(900); }
}

console.log('\n### ITEM 1 — pill TRAIL-only, default staggered ###');
await freshRound();
console.log('MANUAL mode, pill state:', JSON.stringify(await pillState()));
await clickText('TRAIL');
await wait(300);
await tapTrail(snake(3, 5), 5);
console.log('after painting 3 tiles in TRAIL mode, pill state:', JSON.stringify(await pillState()));
console.log('registered trail length:', await trailLength());
const barRect = await page.evaluate(() => {
  const el = document.querySelector('.vault-actionbar-actions');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: Math.max(0, r.left - 20), y: Math.max(0, r.top - 20), width: r.width + 40, height: r.height + 40 };
});
if (barRect) await page.screenshot({ path: S + 'pill-crop.png', clip: barRect });
await page.screenshot({ path: S + 'pill-full.png' });

console.log('\n### ITEM 2 — STAGGERED timing (4-tile clean run) ###');
await clickText('CLEAR');
await wait(200);
await tapTrail(snake(4, 5), 5);
console.log('registered trail length:', await trailLength());
let t0 = Date.now();
await clickText('GO');
let staggeredResult = null;
for (let i = 0; i < 60; i++) {
  await wait(100);
  const b = await buttons();
  if (b.length === 0) { staggeredResult = { crash: true, ms: Date.now() - t0 }; break; }
  if (await settled()) { staggeredResult = { outcome: 'rug', ms: Date.now() - t0 }; break; }
  if (!b.some(x => x === 'STOP ⚡')) { staggeredResult = { outcome: 'completed', ms: Date.now() - t0 }; break; }
}
console.log('STAGGERED 4-tile result:', JSON.stringify(staggeredResult), '(expect ~4*430=1720ms if completed)');
if (!(await settled())) { await clickText('take profit'); await wait(900); }
await wait(600);

console.log('\n### ITEM 3 — INSTANT timing (4-tile clean run) ###');
await freshRound();
await clickText('TRAIL');
await wait(300);
await tapTrail(snake(4, 5), 5);
console.log('registered trail length:', await trailLength());
await clickText('instant');
await wait(200);
console.log('pill state after toggle:', JSON.stringify(await pillState()));
await page.screenshot({ path: S + 'pill-instant.png' });
t0 = Date.now();
await clickText('GO');
let instantResult = null;
for (let i = 0; i < 60; i++) {
  await wait(30);
  const b = await buttons();
  if (b.length === 0) { instantResult = { crash: true, ms: Date.now() - t0 }; break; }
  if (await settled()) { instantResult = { outcome: 'rug', ms: Date.now() - t0 }; break; }
  if (!b.some(x => x === 'STOP ⚡')) { instantResult = { outcome: 'completed', ms: Date.now() - t0 }; break; }
}
console.log('INSTANT 4-tile result:', JSON.stringify(instantResult), '(expect ~4*50=200ms + overhead if completed)');
if (staggeredResult && staggeredResult.ms && instantResult && instantResult.ms) {
  console.log('speed ratio staggered/instant:', (staggeredResult.ms / instantResult.ms).toFixed(2), 'x');
}
if (!(await settled())) { await clickText('take profit'); await wait(900); }
await wait(600);

console.log('\n### ITEM CRASH-BOUNDARY CHECK — confirm pre-existing (pace-independent) crash for long trails ###');
// Established from prior probes: trailTargetBps preview (VaultExperience.tsx
// ~L1134-1145) computes safeCount = revealedTiles.length + trail.length
// WITHOUT subtracting already-consumed trail tiles, so once trail.length >
// ~11 (half of the 22 safe tiles on default BLUECHIPS), a mid-cascade
// render can exceed the safe-tile cap and throw uncaught. Confirm boundary
// at trail=12 (expect crash) vs trail=10 (expect clean) — INSTANT pace, to
// keep this fast.
for (const size of [10, 12]) {
  await freshRound();
  await clickText('TRAIL');
  await wait(300);
  await tapTrail(snake(size, 5), 5);
  const regLen = await trailLength();
  console.log(`\n-- trail size ${size}, registered=${regLen} --`);
  const pace = await pillState();
  if (pace.instantPressed !== 'true') { await clickText('instant'); await wait(150); }
  await clickText('GO');
  let outcome = 'timeout';
  let stoppedAt = null;
  const tGo = Date.now();
  for (let i = 0; i < 100; i++) {
    await wait(50);
    const b = await buttons();
    if (b.length === 0) { outcome = 'CRASH'; break; }
    if (await settled()) { outcome = 'rug-settled'; break; }
    const running = b.some(x => x === 'STOP ⚡');
    if (!running && stoppedAt === null) stoppedAt = Date.now() - tGo;
    if (!running && stoppedAt !== null && Date.now() - tGo - stoppedAt > 1200) {
      outcome = b.length >= 3 ? 'completed-no-rug' : 'STUCK-BLANK';
      break;
    }
  }
  console.log(`trail size ${size} -> ${outcome}`);
  if (outcome === 'CRASH' || outcome === 'STUCK-BLANK') {
    console.log('  console errors:', JSON.stringify(consoleErrors.slice(-3)));
  }
  if (outcome !== 'CRASH' && outcome !== 'STUCK-BLANK' && !(await settled())) { await clickText('take profit'); await wait(900); }
  await wait(500);
}

console.log('\n### ITEM 4 — RUG-STOP in INSTANT mode (safe trail size, avoiding the crash-boundary bug above) ###');
// Task asked for a 15-20 tile trail, but that size deterministically hits the
// crash-boundary bug documented above BEFORE a rug can be cleanly observed in
// most runs (crash fires once revealedTiles.length exceeds 22-trailLen, i.e.
// after only ~2-7 safe reveals for a 15-20 tile trail — usually before a mine
// is hit, since mineCount=3/25 tiles averages a first-mine-position around
// tile #6-7). Using trail=10 (just under the trail<=11 safe boundary) keeps
// the SAME rug-stop mechanism under test (revealTile's phase-guard + the
// auto-driver's `state.phase.kind !== 'playing'` early-return) while avoiding
// the unrelated crash, so the rug-stop claim can still be directly observed.
let rugFound = false;
for (let attempt = 1; attempt <= 8 && !rugFound; attempt++) {
  await freshRound();
  await clickText('TRAIL');
  await wait(300);
  const order = snake(10, 5);
  await tapTrail(order, 5);
  const regLen = await trailLength();
  const pace = await pillState();
  if (pace.instantPressed !== 'true') { await clickText('instant'); await wait(150); }
  const t0b = Date.now();
  await clickText('GO');
  // Classification is deliberately conservative: don't call it "completed"
  // the instant the STOP button disappears — a mine-hit ALSO removes STOP
  // (phase leaves 'playing' into 'mine-hit') and the settle-panel takes up
  // to settleAt's own 760ms rug-burst delay to actually mount. So once
  // running goes false, keep polling settled() for a GRACE window before
  // concluding "no rug, control handed back" — and only trust that
  // conclusion if the normal MANUAL/TRAIL/take-profit button set is back
  // (>=3 visible buttons), not a bare single "?" help button (which is the
  // mine-hit transitional state, not a legitimate hand-back-to-player state).
  let outcome = 'timeout';
  let stoppedAt = null;
  for (let i = 0; i < 100; i++) {
    await wait(50);
    const b = await buttons();
    if (await settled()) { outcome = 'rug-settled'; break; }
    const running = b.some(x => x === 'STOP ⚡');
    if (!running && stoppedAt === null) stoppedAt = Date.now() - t0b;
    if (!running && stoppedAt !== null && Date.now() - t0b - stoppedAt > 1200) {
      // grace window elapsed with no settle — genuinely handed back to player
      // only if the full control set re-rendered; a persistent bare "?" is a
      // real stuck/blank state (flag as CRASH-LIKE, not a clean completion).
      outcome = b.length >= 3 ? 'completed-no-rug' : 'STUCK-BLANK';
      break;
    }
  }
  const elapsed = Date.now() - t0b;
  console.log(`attempt ${attempt}: registeredTrail=${regLen} outcome=${outcome} elapsed=${elapsed}ms`);
  console.log('  buttons right after outcome detected:', JSON.stringify(await buttons()));
  if (outcome === 'rug-settled') {
    rugFound = true;
    await wait(1000);
    const label = await getOutcomeLabel();
    const pt = await panelText();
    const m = pt.match(/(\d+)\s+before the rug/i);
    const revealedBeforeRug = m ? parseInt(m[1], 10) : null;
    console.log('outcome label:', label);
    console.log('panel text:', pt);
    console.log('revealedBeforeRug:', revealedBeforeRug);
    console.log('trail painted (registered):', regLen, '-> tiles left sealed within the painted trail:', regLen - (revealedBeforeRug ?? 0) - 1);
    await page.screenshot({ path: S + 'rugstop-settled-full.png' });
    const gridRect = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      if (!c) return null;
      const r = c.getBoundingClientRect();
      return { x: Math.max(0, r.left), y: Math.max(0, r.top), width: r.width, height: r.height };
    });
    if (gridRect) await page.screenshot({ path: S + 'rugstop-grid-crop.png', clip: gridRect });

    console.log('\n### ITEM 5 — single GO per round / no auto-chain ###');
    await wait(3000);
    const afterWaitButtons = await buttons();
    const afterWaitSettled = await settled();
    console.log('3s after settle: still on settled panel (bet again present)?', afterWaitSettled, 'buttons:', JSON.stringify(afterWaitButtons));
    await page.screenshot({ path: S + 'no-auto-chain.png' });
  } else if (outcome === 'CRASH') {
    console.log('  unexpected crash at trail=10 (below the established boundary) — console tail:', JSON.stringify(consoleErrors.slice(-3)));
    await page.screenshot({ path: S + `rugstop-unexpected-crash-attempt${attempt}.png` });
  } else if (outcome === 'completed-no-rug') {
    if (!(await settled())) { await clickText('take profit'); await wait(900); }
  }
  await wait(500);
}
if (!rugFound) console.log('DID NOT OBSERVE A RUG within retry budget for item 4.');

console.log('\n### FULL CONSOLE ERROR LOG ###');
console.log(JSON.stringify(consoleErrors, null, 2));
await browser.close();
console.log('DONE');
