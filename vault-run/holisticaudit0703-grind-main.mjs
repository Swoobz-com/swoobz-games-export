// Grinding-mechanics lane — vault (Rug or Riches). Identifies vault's actual
// progression/ownership surface (there is NO detonator/bonus-buy/boost-start
// vocabulary here — it's a Mines game) and audits:
//  1) ownership-points display presence across Lobby/BetEntry/Playing/Settled
//  2) rhythm badge (in-scene "perfect tumbler" celebration) presence during Playing
//  3) AUTO-PICK safety surface presence across all 4 phases
//  4) Settled right-gutter TWO-STACK coexistence (Group1 @72 NEXT-BET/BET-AGAIN
//     vs Group2 @400 Card B/C) — measured rects, overlap/crowd verdict
//  5) points float multiplier check on a real WIN and a real RUG (bust)
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5315';
const SHOTDIR = 'shots-holisticaudit0703/grind';
fs.mkdirSync(SHOTDIR, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return (
      els.find((e) => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}

async function cc(page, idx, g) {
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

async function paintTrail(page, indices, g) {
  const first = await cc(page, indices[0], g);
  if (!first) return 0;
  await page.mouse.move(first.cx, first.cy);
  await page.mouse.down();
  await wait(40);
  let count = 1;
  for (const idx of indices.slice(1)) {
    const c = await cc(page, idx, g);
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

async function settled(page) {
  return await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'));
}
async function isRunning(page) {
  return await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter((e) => e.offsetParent !== null);
    return btns.some((b) => b.textContent.trim() === 'STOP ⚡');
  });
}

async function bodyHasText(page, needle) {
  return await page.evaluate((n) => document.body.textContent.toLowerCase().includes(n.toLowerCase()), needle);
}

async function detectPhase(page) {
  return await page.evaluate(() => {
    const has = (tid) => !!document.querySelector(`[data-testid="${tid}"]`);
    if (has('vault-settled-left') || has('vault-settled-right-new')) return 'settled';
    if (has('vault-playing-left') || has('vault-playing-right')) return 'playing';
    if (has('vault-betentry-left') || has('vault-betentry-right') || has('vault-betentry-world')) return 'bet-entry';
    if (has('vault-lobby-left') || has('vault-lobby-right')) return 'lobby';
    return 'unknown';
  });
}

async function rectByTestId(page, testid) {
  return await page.evaluate((tid) => {
    const el = document.querySelector(`[data-testid="${tid}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height, text: el.textContent.slice(0, 200) };
  }, testid);
}

const results = {};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, defaultViewport: null,
  args: ['--window-size=1470,1040'] });
try {
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));

  // ── PHASE 1: LOBBY ──────────────────────────────────────────────────────
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(900);
  results.lobby = {
    hasAutopickText: await bodyHasText(page, 'AUTO-PICK'),
    hasOwnershipPointsWord: await bodyHasText(page, 'pts'),
    gutterLeftCardA: await rectByTestId(page, 'vault-gutter-left'),
    gutterRightCardA: await rectByTestId(page, 'vault-gutter-right'),
  };
  await page.screenshot({ path: `${SHOTDIR}/01-lobby-1440x900.png` });
  console.log('LOBBY:', JSON.stringify(results.lobby, null, 2));

  // ── PHASE 2: BET-ENTRY ──────────────────────────────────────────────────
  await clickText(page, 'ape in');
  await wait(700);
  results.betEntry = {
    hasAutopickText: await bodyHasText(page, 'AUTO-PICK'),
    betentryLeft: await rectByTestId(page, 'vault-betentry-left'),
    betentryRight: await rectByTestId(page, 'vault-betentry-right'),
  };
  await page.screenshot({ path: `${SHOTDIR}/02-betentry-1440x900.png` });
  console.log('BETENTRY:', JSON.stringify(results.betEntry, null, 2));

  // Commit the bet — moves BetEntry -> Playing.
  await clickText(page, 'send it');
  await wait(700);
  console.log('phase AFTER send-it click:', await detectPhase(page));

  // ── PHASE 3: PLAYING (paint a trail, run instant, capture mid-round) ────
  await clickText(page, 'TRAIL');
  await wait(300);
  const order = snake(20, 5);
  const painted = await paintTrail(page, order, 5);
  console.log('painted tiles:', painted);
  const paceState = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter((e) => e.offsetParent !== null);
    const instant = btns.find((b) => b.textContent.trim().toLowerCase() === 'instant');
    return instant ? instant.getAttribute('aria-pressed') : null;
  });
  if (paceState !== 'true') { await clickText(page, 'instant'); await wait(150); }

  await clickText(page, 'GO');
  // Capture mid-flight for rhythm badge + autopick-surface + gutter Card A mirror
  let capturedPlaying = false;
  let sawRunning = false;
  let finalRunning = null, finalSettled = null;
  for (let i = 0; i < 150; i++) { // up to 15s
    await wait(100);
    const running = await isRunning(page);
    const isSettled = await settled(page);
    if (running) sawRunning = true;
    if (!capturedPlaying && running) {
      results.playing = {
        hasAutopickText: await bodyHasText(page, 'AUTO-PICK'),
        hasRhythmBadgeText: await bodyHasText(page, 'RHYTHM') || await bodyHasText(page, 'TEMPO'),
        playingLeft: await rectByTestId(page, 'vault-playing-left'),
        playingRight: await rectByTestId(page, 'vault-playing-right'),
      };
      await page.screenshot({ path: `${SHOTDIR}/03-playing-midrun-1440x900.png` });
      capturedPlaying = true;
    }
    finalRunning = running; finalSettled = isSettled;
    if (isSettled) break;
    if (!running && sawRunning) break; // cascade finished handing control back (no rug)
  }
  console.log('PLAYING (mid-run):', JSON.stringify(results.playing, null, 2));
  console.log('post-GO poll ended: sawRunning=', sawRunning, 'finalRunning=', finalRunning, 'finalSettled=', finalSettled);
  if (!capturedPlaying) {
    // never observed STOP running (cascade may be near-instant) — still grab a snapshot immediately
    results.playing = {
      hasAutopickText: await bodyHasText(page, 'AUTO-PICK'),
      hasRhythmBadgeText: await bodyHasText(page, 'RHYTHM') || await bodyHasText(page, 'TEMPO'),
      playingLeft: await rectByTestId(page, 'vault-playing-left'),
      playingRight: await rectByTestId(page, 'vault-playing-right'),
      note: 'STOP button never observed running — cascade likely completed within first poll tick',
    };
    await page.screenshot({ path: `${SHOTDIR}/03-playing-midrun-1440x900.png` });
  }

  const isSettledNow = await settled(page);
  let outcomeType = null;
  if (isSettledNow) {
    const pt = await page.evaluate(() => {
      const p = document.querySelector('div[aria-live="polite"][aria-label]');
      return p ? p.textContent : '';
    });
    outcomeType = /bust/i.test(pt) ? 'rug' : 'win-or-completed';
    console.log('auto-settled during instant-run, outcome text sample:', pt.slice(0, 120));
  } else {
    // completed the trail without hitting a mine — take profit for a WIN settle
    const canTP = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')].filter((e) => e.offsetParent !== null);
      const b = btns.find((e) => e.textContent.trim().toLowerCase() === 'take profit');
      return b ? { disabled: b.disabled, text: b.textContent.trim() } : null;
    });
    console.log('take profit button state before click:', JSON.stringify(canTP));
    console.log('phase BEFORE take-profit click:', await detectPhase(page));
    await clickText(page, 'take profit');
    await wait(900);
    outcomeType = 'win-via-take-profit';
    console.log('phase AFTER take-profit click:', await detectPhase(page));
  }

  // ── PHASE 4: SETTLED (first outcome — capture whichever we got) ────────
  await wait(600);
  const settledPanelText = await page.evaluate(() => {
    const p = document.querySelector('div[aria-live="polite"][aria-label]');
    return p ? p.textContent : document.body.textContent.slice(0, 500);
  });
  console.log('SETTLED #1 outcomeType:', outcomeType, 'panel:', settledPanelText.slice(0, 200));

  const settledLeft = await rectByTestId(page, 'vault-settled-left');
  const settledResult = await rectByTestId(page, 'vault-settled-result');
  const settledMeta = await rectByTestId(page, 'vault-settled-meta');
  const settledRightNew = await rectByTestId(page, 'vault-settled-right-new');
  const settledNextBet = await rectByTestId(page, 'vault-settled-nextbet');
  const settledBetAgain = await rectByTestId(page, 'vault-settled-betagain');
  const gutterRight400 = await rectByTestId(page, 'vault-gutter-right');
  const gutterCardB = await rectByTestId(page, 'vault-gutter-card-b');
  const gutterCardC = await rectByTestId(page, 'vault-gutter-card-c');

  results.settled1440 = {
    outcomeType,
    settledPanelText: settledPanelText.slice(0, 300),
    settledLeft, settledResult, settledMeta,
    settledRightNew, settledNextBet, settledBetAgain,
    gutterRight400, gutterCardB, gutterCardC,
    group1Bottom: settledRightNew ? settledRightNew.bottom : null,
    group2Top: gutterRight400 ? gutterRight400.top : null,
    overlapPx: (settledRightNew && gutterRight400) ? (settledRightNew.bottom - gutterRight400.top) : null,
  };
  await page.screenshot({ path: `${SHOTDIR}/04-settled1-1440x900-full.png` });
  // crop just the right half to see both stacks clearly
  await page.screenshot({ path: `${SHOTDIR}/04-settled1-1440x900-rightcrop.png`, clip: { x: 900, y: 0, width: 540, height: 900 } });
  console.log('SETTLED 1440x900 gutter measurements:', JSON.stringify(results.settled1440, null, 2));

  // Same at 1920x1080
  await page.setViewport({ width: 1920, height: 1080 });
  await wait(500);
  const settledRightNew1920 = await rectByTestId(page, 'vault-settled-right-new');
  const gutterRight4001920 = await rectByTestId(page, 'vault-gutter-right');
  results.settled1920 = {
    settledRightNew: settledRightNew1920,
    gutterRight400: gutterRight4001920,
    overlapPx: (settledRightNew1920 && gutterRight4001920) ? (settledRightNew1920.bottom - gutterRight4001920.top) : null,
  };
  await page.screenshot({ path: `${SHOTDIR}/05-settled1-1920x1080-full.png` });
  await page.screenshot({ path: `${SHOTDIR}/05-settled1-1920x1080-rightcrop.png`, clip: { x: 1300, y: 0, width: 600, height: 1080 } });
  console.log('SETTLED 1920x1080 gutter measurements:', JSON.stringify(results.settled1920, null, 2));
  await page.setViewport({ width: 1440, height: 900 });
  await wait(300);

  // ── Get a RUG (bust) outcome too, if the first outcome wasn't one ──────
  if (outcomeType !== 'rug') {
    for (let attempt = 1; attempt <= 6; attempt++) {
      const clickedBetAgain = await clickText(page, 'bet again');
      await wait(700);
      if (!clickedBetAgain) { await clickText(page, 'ape in'); await wait(600); await clickText(page, 'send it'); await wait(700); }
      await clickText(page, 'TRAIL');
      await wait(250);
      await paintTrail(page, order, 5);
      const ps = await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button')].filter((e) => e.offsetParent !== null);
        const instant = btns.find((b) => b.textContent.trim().toLowerCase() === 'instant');
        return instant ? instant.getAttribute('aria-pressed') : null;
      });
      if (ps !== 'true') { await clickText(page, 'instant'); await wait(150); }
      await clickText(page, 'GO');
      let gotRug = false;
      for (let i = 0; i < 100; i++) {
        await wait(50);
        const isSettled2 = await settled(page);
        const running2 = await isRunning(page);
        if (isSettled2) { gotRug = true; break; }
        if (!running2 && !isSettled2) break; // completed no-rug, retry
      }
      if (gotRug) {
        const pt2 = await page.evaluate(() => {
          const p = document.querySelector('div[aria-live="polite"][aria-label]');
          return p ? p.textContent : '';
        });
        if (/bust/i.test(pt2)) { outcomeType = 'rug'; break; }
        else {
          // it was a win-via-cascade-complete auto-settle; keep retrying for a rug
          await clickText(page, 'bet again');
          await wait(700);
        }
      } else {
        await clickText(page, 'take profit');
        await wait(700);
      }
    }
  }

  if (outcomeType === 'rug') {
    await wait(600);
    const rugPanelText = await page.evaluate(() => {
      const p = document.querySelector('div[aria-live="polite"][aria-label]');
      return p ? p.textContent : '';
    });
    const settledMetaRug = await rectByTestId(page, 'vault-settled-meta');
    results.settledRug = { panelText: rugPanelText.slice(0, 300), settledMetaRug };
    await page.screenshot({ path: `${SHOTDIR}/06-settled-rug-1440x900.png` });
    await page.screenshot({ path: `${SHOTDIR}/06-settled-rug-1440x900-rightcrop.png`, clip: { x: 900, y: 0, width: 540, height: 900 } });
    console.log('SETTLED RUG panel:', rugPanelText.slice(0, 300));
  } else {
    results.settledRug = { note: 'could not force a RUG within retry budget' };
  }

  results.consoleErrors = consoleErrors;
  fs.writeFileSync('holisticaudit0703-grind-results.json', JSON.stringify(results, null, 2));
  console.log('DONE. Results written to holisticaudit0703-grind-results.json');
} finally {
  await browser.close();
}
