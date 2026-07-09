import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.argv[2] || '5184';
const S = 'shots/revealpace-';

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: false,
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  args: [`--window-size=1460,1040`, '--autoplay-policy=no-user-gesture-required'],
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

async function cc(idx, g) {
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
async function eyebrow() {
  return await page.evaluate(() => {
    // the action-bar eyebrow text (RUNNING TRAIL / TRAIL READY / PLAN YOUR TRAIL / PUMPING).
    // Scoped to the VISIBLE .vault-actionbar only — an unscoped search can hit a
    // same-text decoy elsewhere in the DOM (e.g. hidden copy), which is what
    // caused a false-premature "completed" read in an earlier debug pass.
    const bar = document.querySelector('.vault-actionbar');
    if (!bar) return null;
    const els = [...bar.querySelectorAll('span')];
    const el = els.find(
      e => e.offsetParent !== null && /^(RUNNING TRAIL|TRAIL READY|PLAN YOUR TRAIL|PUMPING)$/.test(e.textContent.trim()),
    );
    return el ? el.textContent.trim() : null;
  });
}
async function isRunning() {
  return await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null);
    return btns.some(b => b.textContent.trim() === 'STOP ⚡');
  });
}

// Paint a trail by dragging through an ordered list of tile indices.
async function paintTrail(indices, g) {
  const first = await cc(indices[0], g);
  await page.mouse.move(first.cx, first.cy);
  await page.mouse.down();
  await wait(40);
  for (const idx of indices.slice(1)) {
    const { cx, cy } = await cc(idx, g);
    await page.mouse.move(cx, cy, { steps: 3 });
    await wait(10);
  }
  await page.mouse.up();
  await wait(300);
}

// Snake order for a 5x5 grid (adjacent-cell drag path), n tiles.
function snake(n, g = 5) {
  const out = [];
  for (let row = 0; row < g && out.length < n; row++) {
    const cols = row % 2 === 0 ? [0, 1, 2, 3, 4] : [4, 3, 2, 1, 0];
    for (const col of cols) {
      if (out.length >= n) break;
      out.push(row * g + col);
    }
  }
  return out;
}

async function enterPlayingFreshOrAgain() {
  const clickedApe = await clickText('ape in');
  if (!clickedApe) await clickText('bet again');
  await wait(700);
  await clickText('send it'); // no-op (NO BTN) on subsequent rounds via bet-again
  await wait(900);
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
      staggeredColor: staggered ? getComputedStyle(staggered).color : null,
      instantColor: instant ? getComputedStyle(instant).color : null,
    };
  });
}

const results = {};

// ── STEP 1: enter playing, confirm pill absent in MANUAL mode ──────────────
await enterPlayingFreshOrAgain();
results.pillAbsentInManual = !(await pillState()).pillPresent;
console.log('STEP1 pill absent in MANUAL:', results.pillAbsentInManual);

// ── STEP 2: switch to TRAIL, paint a small trail so the pill (near GO) renders, confirm default ──
await clickText('TRAIL');
await wait(300);
await paintTrail(snake(4), 5);
const afterPaint = await pillState();
results.pillPresentInTrail = afterPaint.pillPresent;
results.defaultIsStaggered = afterPaint.staggeredPressed === 'true' && afterPaint.instantPressed === 'false';
console.log('STEP2 pill present in TRAIL (near GO):', results.pillPresentInTrail);
console.log('STEP2 default = staggered:', results.defaultIsStaggered, JSON.stringify(afterPaint));
await page.screenshot({ path: S + 'pill-default-staggered.png' });

// crop tight around the action bar right column for the deliverable screenshot
const barRect = await page.evaluate(() => {
  const el = document.querySelector('.vault-actionbar-actions');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: Math.max(0, r.left - 20), y: Math.max(0, r.top - 20), width: r.width + 40, height: r.height + 40 };
});
if (barRect) {
  await page.screenshot({ path: S + 'pill-crop.png', clip: barRect });
}

// ── STEP 3: STAGGERED timing baseline (run the 4-tile trail we just painted) ──
let t0 = Date.now();
await clickText('GO');
await wait(60); // let the STOP button actually mount before we start polling for it to vanish
let staggeredElapsed = null;
for (let i = 0; i < 80; i++) {
  await wait(100);
  const running = await isRunning();
  if (await settled()) { staggeredElapsed = Date.now() - t0; results.staggeredOutcome = 'rug'; break; }
  if (!running) { staggeredElapsed = Date.now() - t0; results.staggeredOutcome = 'completed'; break; }
}
results.staggeredElapsedMs = staggeredElapsed;
console.log('STEP3 STAGGERED 4-tile run:', results.staggeredOutcome, staggeredElapsed, 'ms (expect ~4*430=1720ms if completed)');

// finish this round (rug already settled it; otherwise take profit)
if (!(await settled())) {
  await clickText('take profit');
  await wait(900);
}
await wait(600);

// ── STEP 4: switch pace to INSTANT, verify pill flips ──────────────────────
await enterPlayingFreshOrAgain();
await clickText('TRAIL');
await wait(300);
await paintTrail(snake(4), 5); // paint first so the pill (rendered near GO) exists to click
const beforeToggle = await pillState();
await clickText('instant');
await wait(200);
const afterToggle = await pillState();
results.toggleFlipped = beforeToggle.staggeredPressed === 'true' && afterToggle.instantPressed === 'true' && afterToggle.staggeredPressed === 'false';
console.log('STEP4 toggle staggered->instant flipped:', results.toggleFlipped, JSON.stringify({ before: beforeToggle, after: afterToggle }));
await page.screenshot({ path: S + 'pill-instant-active.png' });

// ── STEP 5: INSTANT full-cascade timing (small trail, retry until a clean completion, not a rug) ──
let instantElapsed = null, instantOutcome = null;
for (let attempt = 0; attempt < 6 && instantOutcome !== 'completed'; attempt++) {
  if (attempt > 0) {
    // previous attempt hit a rug or we need a fresh round
    await enterPlayingFreshOrAgain();
    await clickText('TRAIL');
    await wait(250);
    // pace persists across rounds (session-scoped, not round-scoped) - confirm still instant
    const st = await pillState();
    if (st.instantPressed !== 'true') { await clickText('instant'); await wait(150); }
    await paintTrail(snake(4, 5), 5);
  }
  const tt0 = Date.now();
  await clickText('GO');
  await wait(30);
  for (let i = 0; i < 80; i++) {
    await wait(30);
    const running = await isRunning();
    if (await settled()) { instantElapsed = Date.now() - tt0; instantOutcome = 'rug'; break; }
    if (!running) { instantElapsed = Date.now() - tt0; instantOutcome = 'completed'; break; }
  }
  console.log('STEP5 attempt', attempt, 'instant 4-tile run:', instantOutcome, instantElapsed, 'ms (expect ~4*50=200ms + overhead if completed)');
  if (instantOutcome === 'rug') { await wait(600); }
}
results.instantOutcome = instantOutcome;
results.instantElapsedMs = instantElapsed;

if (!(await settled())) {
  await clickText('take profit');
  await wait(900);
}
await wait(600);

// ── STEP 6: RUG-STOP in INSTANT mode — paint a LARGE trail (20 of 25 tiles) to force a rug, prove tiles beyond it never opened ──
// Retry a few times seeking a "mixed" board (some tiles opened, then a rug,
// then several still sealed) — a more illustrative screenshot than a
// first-tile rug (which is a valid but visually thin proof point).
let rugAttempt = 0;
const bigTrail = snake(20, 5);
while (rugAttempt < 5) {
  rugAttempt++;
  if (rugAttempt > 1) {
    await clickText('bet again');
    await wait(900);
  } else {
    await enterPlayingFreshOrAgain();
  }
  await clickText('TRAIL');
  await wait(250);
  const stPace = await pillState();
  if (stPace.instantPressed !== 'true') { await clickText('instant'); await wait(150); }
  await paintTrail(bigTrail, 5);
  const rt0 = Date.now();
  await clickText('GO');
  let rugSettled = false;
  for (let i = 0; i < 200; i++) {
    await wait(50);
    if (await settled()) { rugSettled = true; break; }
  }
  const rugElapsed = Date.now() - rt0;
  await wait(1000); // let settle animation + panel finish
  const label = await getOutcomeLabel();
  const pt = await panelText();
  const beforeRugMatch = pt.match(/(\d+)\s+before the rug/i);
  const revealedBeforeRug = beforeRugMatch ? parseInt(beforeRugMatch[1], 10) : null;
  results.rugSettled = rugSettled;
  results.rugElapsedMs = rugElapsed;
  results.rugLabel = label;
  results.revealedBeforeRug = revealedBeforeRug;
  results.trailPaintedCount = bigTrail.length;
  results.rugAttempts = rugAttempt;
  results.tilesLeftSealedInTrail = revealedBeforeRug !== null
    ? bigTrail.length - revealedBeforeRug - 1 /* the mine itself */
    : null;
  console.log('STEP6 attempt', rugAttempt, 'RUG-STOP: settled=', rugSettled, 'elapsedMs=', rugElapsed,
    '(expect fast, well under 20*430=8600ms staggered-equivalent)',
    'label=', label, 'revealedBeforeRug=', revealedBeforeRug,
    'painted=', bigTrail.length, 'tilesLeftSealedInTrail=', results.tilesLeftSealedInTrail);
  if (revealedBeforeRug !== null && revealedBeforeRug >= 2) break; // good illustrative sample
}

await page.screenshot({ path: S + 'rug-stop-settled.png' });
const gridRect = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  if (!c) return null;
  const r = c.getBoundingClientRect();
  return { x: Math.max(0, r.left), y: Math.max(0, r.top), width: r.width, height: r.height };
});
if (gridRect) await page.screenshot({ path: S + 'rug-stop-grid-crop.png', clip: gridRect });
else console.log('gridRect null, skipping crop screenshot');

console.log('RESULTS', JSON.stringify(results, null, 2));
await browser.close();
console.log('DONE');
