import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.argv[2] || '5182';
const S = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/vault-run/shots/indep-rugstop-';

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
async function isRunning() {
  return await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null);
    return btns.some(b => b.textContent.trim() === 'STOP ⚡');
  });
}
async function phaseSnapshot() {
  return await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null).map(b => b.textContent.trim());
    const settledPanel = document.querySelector('div[aria-live="polite"][aria-label]');
    return {
      buttons: btns,
      settledPanelLabel: settledPanel ? settledPanel.getAttribute('aria-label') : null,
      bodyHasBetAgain: document.body.textContent.toLowerCase().includes('bet again'),
      bodyHasRugged: document.body.textContent.toLowerCase().includes('rugged'),
    };
  });
}

async function paintTrail(indices, g) {
  const first = await cc(indices[0], g);
  if (!first) { console.log('paintTrail: no canvas found, aborting paint'); return 0; }
  await page.mouse.move(first.cx, first.cy);
  await page.mouse.down();
  await wait(40);
  let count = 1;
  for (const idx of indices.slice(1)) {
    const c = await cc(idx, g);
    if (!c) continue;
    await page.mouse.move(c.cx, c.cy, { steps: 3 });
    await wait(10);
    count++;
  }
  await page.mouse.up();
  await wait(300);
  return count;
}

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

async function trailLength() {
  // best-effort: read the GO button's aria-label "Run your trail of N tiles..."
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

// ── NOTE: found (and separately logging) a pre-existing, feature-UNRELATED
// crash: painting a trail whose length exceeds the safe-tile capacity
// (totalTiles - mineCount = 22 for default BLUECHIPS 5x5/3-mine) throws
// uncaught inside the unguarded `multiplierAfterSafeTiles(...)` preview calc
// at VaultExperience.tsx ~L1136 (no try/catch, unlike revealTile's guarded
// call to the sibling `cumulativeMultiplierBps`), unmounting the whole
// <Playing> tree. Confirmed via a 23/25-tile paint attempt (raw log kept
// above in shell history). This is orthogonal to reveal-pace — it happens
// at PAINT time, before GO/pace is even touched — so for the load-bearing
// rug-stop probe below we stay safely under that cap (20-tile trail on a
// 22-safe-tile board), matching the maker's own sizing.

async function freshRound(tag) {
  const clickedApe = await clickText('ape in');
  if (!clickedApe) {
    // settled from a prior attempt — go through bet-again -> new round
    const ok = await clickText('bet again');
    if (!ok) {
      console.log(`freshRound(${tag}): neither 'ape in' nor 'bet again' found — dumping state`);
      console.log('  snapshot:', JSON.stringify(await phaseSnapshot()));
      await page.screenshot({ path: S + `stuck-${tag}.png` });
    }
    await wait(900);
  } else {
    await wait(700);
    await clickText('send it');
    await wait(900);
  }
}

let settledAt = null, outcome = null, painted = 0;
let revealedBeforeRug = null, label = null, pt = '';
const TRAIL_SIZE = 20; // < 22 safe tiles on default BLUECHIPS board — avoids the unrelated preview-crash bug above
const order = snake(TRAIL_SIZE, 5);

for (let attempt = 1; attempt <= 6 && outcome !== 'rug'; attempt++) {
 try {
  await freshRound(attempt);
  console.log(`\n--- attempt ${attempt} --- buttons now:`, (await phaseSnapshot()).buttons);
  await clickText('TRAIL');
  await wait(300);
  painted = await paintTrail(order, 5);
  const registeredTrailLen = await trailLength();
  console.log('painted (requested) tiles:', painted, 'of', order.length, '| GAME-REGISTERED trail length (from GO aria-label):', registeredTrailLen);

  const paceState = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null);
    const instant = btns.find(b => b.textContent.trim().toLowerCase() === 'instant');
    return instant ? instant.getAttribute('aria-pressed') : null;
  });
  if (paceState !== 'true') { await clickText('instant'); await wait(150); }

  const t0 = Date.now();
  await clickText('GO');
  let running = true;
  let stoppedRunningAt = null;
  for (let i = 0; i < 100; i++) { // up to 5s
    await wait(50);
    const isSettled = await settled();
    running = await isRunning();
    if (isSettled) { settledAt = Date.now() - t0; outcome = 'rug'; break; }
    if (!running && stoppedRunningAt === null) { stoppedRunningAt = Date.now() - t0; }
    if (!running && !isSettled) {
      // cascade finished handing control back to the player WITHOUT hitting
      // a mine (the "completed" no-rug outcome) — stop polling, this attempt
      // didn't produce a rug, retry with a fresh round.
      outcome = 'completed-no-rug';
      break;
    }
  }
  console.log(`attempt ${attempt} outcome=${outcome} elapsed=${outcome === 'rug' ? settledAt : (stoppedRunningAt ?? Date.now() - t0)}ms`);
  console.log('  post-run snapshot:', JSON.stringify(await phaseSnapshot()));
  console.log('  console errors so far:', JSON.stringify(consoleErrors));
  if (outcome === 'completed-no-rug') {
    await page.screenshot({ path: S + `attempt${attempt}-completed-no-rug.png` });
    // hand control back so freshRound()'s 'bet again' path can start a new one via take-profit first
    if (!(await settled())) {
      const ok = await clickText('take profit');
      console.log('  clicked take profit:', ok, '-> settled after:', await settled());
      await wait(900);
    }
    outcome = null;
    continue;
  }
 } catch (err) {
  console.log(`attempt ${attempt} THREW:`, err.message);
  console.log('  console errors so far:', JSON.stringify(consoleErrors));
  await page.screenshot({ path: S + `attempt${attempt}-threw.png` }).catch(() => {});
 }
}

console.log('=== RESULT ===');
console.log('final outcome:', outcome, 'settledAt(ms):', settledAt);
if (outcome !== 'rug') {
  console.log('DID NOT OBSERVE A RUG within retry budget — cannot confirm item 4 this run.');
  await page.screenshot({ path: S + 'no-rug-final-state.png' });
} else {
  await wait(1000); // let settle animation + panel finish
  label = await getOutcomeLabel();
  pt = await panelText();
  const beforeRugMatch = pt.match(/(\d+)\s+before the rug/i);
  revealedBeforeRug = beforeRugMatch ? parseInt(beforeRugMatch[1], 10) : null;
  console.log('outcome label:', label);
  console.log('panel text:', pt);
  console.log('revealedBeforeRug:', revealedBeforeRug);
  console.log('trail painted:', painted, '-> tiles left sealed in trail (painted - revealedBeforeRug - 1 mine):', painted - (revealedBeforeRug ?? 0) - 1);
  await page.screenshot({ path: S + 'settled.png' });
  const gridRect = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: Math.max(0, r.left), y: Math.max(0, r.top), width: r.width, height: r.height };
  });
  if (gridRect) await page.screenshot({ path: S + 'grid-crop.png', clip: gridRect });

  // ── item 5: single GO per round / no auto-chain ──────────────────────
  await wait(2500); // wait extra, watching for any auto-advance
  const afterWaitSnap = await phaseSnapshot();
  console.log('2.5s after settle, still on settled panel (no auto-chain)?', afterWaitSnap.bodyHasBetAgain, JSON.stringify(afterWaitSnap.buttons));
  await page.screenshot({ path: S + 'no-auto-chain.png' });
}

console.log('CONSOLE ERRORS:', JSON.stringify(consoleErrors, null, 2));
await browser.close();
console.log('DONE');
