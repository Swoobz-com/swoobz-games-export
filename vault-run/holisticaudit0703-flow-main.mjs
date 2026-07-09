import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 5305;
const SHOTS = 'shots-holisticaudit0703/flow/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const WORLDS = [
  { mode: 'bluechips', grid: 5, mines: 3, winReveals: 3 },
  { mode: 'altseason', grid: 5, mines: 5, winReveals: 2 },
  { mode: 'shitcoin', grid: 7, mines: 24, winReveals: 1 },
];

async function clickText(page, t, within) {
  const h = await page.evaluateHandle(({ t, within }) => {
    const root = within ? document.querySelector(within) : document;
    if (!root) return null;
    const els = [...root.querySelectorAll('button,[role=button]')];
    return (
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
  }, { t, within });
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}

async function cellCenter(page, idx, g) {
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

async function settledLabel(page) {
  // FIX (holisticaudit0703): the original selector `[aria-live="polite"][aria-label]`
  // only matches the MOBILE-ONLY Settlement() panel (data-testid=vault-settledpanel,
  // isWide-gated to null on desktop by PhaseSurface). On desktop the settle signal is
  // (a) vault-hero-overlay's aria-label (role=dialog, NO aria-live, auto-dismisses
  // after 2000ms) or (b) the persistent vault-settled-result narrative text (desktop
  // gutter) / settledpanel (mobile). Check both, preferring the persistent one.
  return await page.evaluate(() => {
    const mobilePanel = document.querySelector('div[aria-live="polite"][aria-label]');
    if (mobilePanel) return mobilePanel.getAttribute('aria-label');
    const hero = document.querySelector('[data-testid="vault-hero-overlay"]');
    if (hero) return hero.getAttribute('aria-label');
    // desktop persistent fallback: read the settled-result big span + narrative
    const result = document.querySelector('[data-testid="vault-settled-result"]');
    if (result) {
      const text = result.textContent || '';
      if (/BUST/.test(text)) return `Rugged (desktop-result-read): ${text}`;
      if (result.offsetParent !== null) return `Took profit (desktop-result-read): ${text}`;
    }
    return null;
  });
}

async function phaseKind(page) {
  // Infer phase from which gutter testid is present (desktop-only signal).
  return await page.evaluate(() => {
    const ids = [
      ['lobby', 'vault-lobby-apein'],
      ['bet-entry', 'vault-betentry-confirm'],
      ['playing', 'vault-playing-actions'],
      ['settled', 'vault-settled-betagain'],
    ];
    for (const [name, id] of ids) {
      const el = document.querySelector(`[data-testid="${id}"]`);
      if (el && el.offsetParent !== null) return name;
    }
    return 'unknown';
  });
}

async function canvasRect(page) {
  return await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return null;
    return c.getBoundingClientRect().toJSON();
  });
}

async function rectOf(page, testid) {
  return await page.evaluate((id) => {
    const el = document.querySelector(`[data-testid="${id}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    return r.toJSON();
  }, testid);
}

function overlaps(a, b) {
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

async function gridPlayfieldRect(page, g) {
  // Same tile-layout formula as cellCenter — the actual mine-grid playfield
  // rect, a strict SUBSET of the full-bleed canvas element. Assertion-4 ("no
  // overlay covers the canvas") is only meaningfully violated if a gutter
  // card reaches into THIS rect (the tappable tile area) — cards floating
  // over the canvas's own side-margin backdrop art are the intended
  // "in-canvas HUD" design (2026-07-25 pivot), not a violation.
  return await page.evaluate((g) => {
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
    const left = r.left + x0, top = r.top + (by - full / 2);
    return { left, top, right: left + full, bottom: top + full, width: full, height: full };
  }, g);
}

async function checkOverlaps(page, phaseLabel, testids, gridSize) {
  const canvas = await canvasRect(page);
  const grid = gridSize ? await gridPlayfieldRect(page, gridSize) : null;
  const out = { phase: phaseLabel, canvas, grid, cards: {} };
  for (const id of testids) {
    const r = await rectOf(page, id);
    if (!r) { out.cards[id] = { present: false }; continue; }
    out.cards[id] = {
      present: true,
      rect: r,
      overlapsCanvasElement: canvas ? overlaps(canvas, r) : null,
      overlapsTilePlayfield: grid ? overlaps(grid, r) : null,
    };
  }
  return out;
}

async function measureTapLatency(page, clickAction) {
  await page.evaluate(() => {
    if (window.__mutObserver) window.__mutObserver.disconnect();
    window.__mutated = false;
    window.__mutObserver = new MutationObserver(() => { window.__mutated = true; });
    window.__mutObserver.observe(document.body, { attributes: true, childList: true, subtree: true, characterData: true });
  });
  const t0 = Date.now();
  const clicked = await clickAction();
  if (!clicked) return { clicked: false, ms: null };
  let ms = null;
  for (let i = 0; i < 30; i++) {
    const mutated = await page.evaluate(() => window.__mutated);
    if (mutated) { ms = Date.now() - t0; break; }
    await wait(8);
  }
  return { clicked: true, ms };
}

async function checkCashOutDisabledState(page, testid) {
  return await page.evaluate((id) => {
    const el = document.querySelector(`[data-testid="${id}"]`);
    if (!el) return { present: false };
    const btn = [...el.querySelectorAll('button')].find((b) => b.textContent.toLowerCase().includes('take profit'));
    if (!btn) return { present: false };
    return { present: true, disabled: btn.disabled, text: btn.textContent.trim() };
  }, testid);
}

async function checkReceiptToggle(page) {
  // Fresh-finding probe: on desktop, Card C's "view receipt" toggle
  // aria-controls="vault-settled-receipt" — but the element that OWNS that
  // id (#vault-settled-receipt) only exists inside Settlement(), which
  // PhaseSurface returns null for on desktop (isWide). Verify empirically.
  const before = await page.evaluate(() => {
    const chip = document.querySelector('[data-testid="vault-gutter-card-c"]');
    const toggle = chip ? [...chip.querySelectorAll('button')].find((b) => /receipt/i.test(b.textContent)) : null;
    const target = document.getElementById('vault-settled-receipt');
    return {
      chipPresent: !!chip,
      togglePresent: !!toggle,
      toggleText: toggle ? toggle.textContent.trim() : null,
      ariaExpanded: toggle ? toggle.getAttribute('aria-expanded') : null,
      targetElementExists: !!target,
    };
  });
  if (!before.togglePresent) return { before, after: null, clicked: false };
  await clickText(page, 'view receipt');
  await wait(300);
  const after = await page.evaluate(() => {
    const chip = document.querySelector('[data-testid="vault-gutter-card-c"]');
    const toggle = chip ? [...chip.querySelectorAll('button')].find((b) => /receipt/i.test(b.textContent)) : null;
    const target = document.getElementById('vault-settled-receipt');
    // Any NEW visible element containing seed/hash/hex copy anywhere in the doc?
    const bodyText = document.body.innerText;
    return {
      toggleText: toggle ? toggle.textContent.trim() : null,
      ariaExpanded: toggle ? toggle.getAttribute('aria-expanded') : null,
      targetElementExists: !!target,
      bodyTextLen: bodyText.length,
    };
  });
  return { before, after, clicked: true };
}

function consoleTracker(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push({ kind: 'console.error', text: msg.text() });
  });
  page.on('pageerror', (err) => {
    errors.push({ kind: 'pageerror', text: String(err) });
  });
  return errors;
}

async function selectWorld(page, mode) {
  if (mode === 'bluechips') return; // default
  await clickText(page, mode, '[data-testid="vault-betentry-world"]');
  await wait(250);
}

async function forceOutcome(page, world, outcome) {
  // outcome: 'win' | 'rug'
  const maxAttempts = outcome === 'win' ? 12 : 8;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const kind = await phaseKind(page);
    if (kind === 'settled') { await clickText(page, 'bet again'); await wait(600); }
    const kind2 = await phaseKind(page);
    if (kind2 === 'lobby') { await clickText(page, 'ape in'); await wait(500); }
    await selectWorld(page, world.mode);
    await clickText(page, 'SEND IT');
    await wait(700);
    let lbl = null;
    let clicks = 0;
    const totalTiles = world.grid * world.grid;
    const target = outcome === 'win' ? world.winReveals : totalTiles;
    for (let idx = 0; idx < target && !lbl; idx++) {
      const c = await cellCenter(page, idx, world.grid);
      if (!c) break;
      await page.mouse.click(c.cx, c.cy);
      clicks++;
      await wait(outcome === 'win' ? 350 : 150);
      lbl = await settledLabel(page);
    }
    if (outcome === 'win') {
      if (lbl && /rugged/i.test(lbl)) continue; // busted before we could bank — retry
      if (!lbl) {
        await clickText(page, 'take profit');
        await wait(700);
        lbl = await settledLabel(page);
      }
      if (lbl && /took profit/i.test(lbl)) return { ok: true, attempt, label: lbl, clicks };
      continue;
    } else {
      if (lbl && /rugged/i.test(lbl)) return { ok: true, attempt, label: lbl, clicks };
      // didn't rug within target clicks — keep clicking rest of board
      for (let idx = target; idx < totalTiles && !lbl; idx++) {
        const c = await cellCenter(page, idx, world.grid);
        if (!c) break;
        await page.mouse.click(c.cx, c.cy);
        clicks++;
        await wait(150);
        lbl = await settledLabel(page);
      }
      if (lbl && /rugged/i.test(lbl)) return { ok: true, attempt, label: lbl, clicks };
      continue;
    }
  }
  return { ok: false };
}

const results = { viewport1440: [], narrowZone: [], receiptProbe: null, staleClassCheck: null };

async function run1440ForWorld(browser, world) {
  const page = await browser.newPage();
  const errors = consoleTracker(page);
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  const nav = await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  const httpStatus = nav ? nav.status() : null;
  await wait(1200);

  const rec = { world: world.mode, httpStatus, errors: [], overlaps: {}, latency: {}, cashOutState: {}, phasesReached: [], loop: {} };

  // LOBBY
  rec.overlaps.lobby = await checkOverlaps(page, 'lobby', ['vault-lobby-left', 'vault-lobby-right', 'vault-gutter-left', 'vault-gutter-right'], world.grid);
  rec.phasesReached.push(await phaseKind(page));
  await page.screenshot({ path: SHOTS + `1440-${world.mode}-01-lobby.png` });

  // -> BET-ENTRY (measure tap latency on ape-in)
  rec.latency.apeIn = await measureTapLatency(page, () => clickText(page, 'ape in'));
  await wait(500);
  rec.overlaps.betentry = await checkOverlaps(page, 'bet-entry', ['vault-betentry-left', 'vault-betentry-right', 'vault-gutter-left', 'vault-gutter-right'], world.grid);
  rec.phasesReached.push(await phaseKind(page));
  await page.screenshot({ path: SHOTS + `1440-${world.mode}-02-betentry.png` });

  await selectWorld(page, world.mode);
  await wait(300);

  // -> PLAYING (measure tap latency on SEND IT)
  rec.latency.sendIt = await measureTapLatency(page, () => clickText(page, 'SEND IT'));
  await wait(700);
  rec.overlaps.playing = await checkOverlaps(page, 'playing', ['vault-playing-left', 'vault-playing-right', 'vault-gutter-right'], world.grid);
  rec.phasesReached.push(await phaseKind(page));
  rec.cashOutState.beforeReveal = await checkCashOutDisabledState(page, 'vault-playing-actions');
  await page.screenshot({ path: SHOTS + `1440-${world.mode}-03-playing-prereveal.png` });

  // reveal one tile, measure latency + re-check cash-out state
  const c0 = await cellCenter(page, 0, world.grid);
  rec.latency.firstTileTap = await measureTapLatency(page, async () => {
    if (!c0) return false;
    await page.mouse.click(c0.cx, c0.cy);
    return true;
  });
  await wait(400);
  const lblAfterFirst = await settledLabel(page);
  if (!lblAfterFirst) {
    rec.cashOutState.afterOneReveal = await checkCashOutDisabledState(page, 'vault-playing-actions');
  } else {
    rec.cashOutState.afterOneReveal = { present: true, disabled: null, note: `busted on tile 0 (label=${lblAfterFirst})` };
  }

  // finish this probe round (bet again fresh) before the deliberate win/rug forcing below
  if (!lblAfterFirst) { await clickText(page, 'take profit'); await wait(700); }

  // WIN outcome
  const win = await forceOutcome(page, world, 'win');
  rec.loop.win = win;
  await wait(400);
  if (win.ok) {
    rec.overlaps.settledWin = await checkOverlaps(page, 'settled-win', ['vault-settled-left', 'vault-settled-right-new', 'vault-gutter-right'], world.grid);
    await page.screenshot({ path: SHOTS + `1440-${world.mode}-04-settled-win.png` });
    // Glass Box probe on the WIN settle
    if (world.mode === 'bluechips') {
      results.receiptProbe = await checkReceiptToggle(page);
    }
    // restart loop timing
    const t0 = Date.now();
    await clickText(page, 'bet again');
    await wait(50);
    let restartMs = null;
    for (let i = 0; i < 40; i++) {
      const k = await phaseKind(page);
      if (k === 'bet-entry' || k === 'lobby') { restartMs = Date.now() - t0; break; }
      await wait(25);
    }
    rec.loop.restartMs = restartMs;
    rec.loop.restartPhase = await phaseKind(page);
    await page.screenshot({ path: SHOTS + `1440-${world.mode}-05-restart.png` });
  }

  // RUG outcome
  const rug = await forceOutcome(page, world, 'rug');
  rec.loop.rug = rug;
  await wait(400);
  if (rug.ok) {
    rec.overlaps.settledRug = await checkOverlaps(page, 'settled-rug', ['vault-settled-left', 'vault-settled-right-new', 'vault-gutter-right'], world.grid);
    await page.screenshot({ path: SHOTS + `1440-${world.mode}-06-settled-rug.png` });
  }

  rec.errors = errors.slice();
  await page.close();
  return rec;
}

async function runNarrowZone(browser, W, H) {
  const page = await browser.newPage();
  const errors = consoleTracker(page);
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  const nav = await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  const httpStatus = nav ? nav.status() : null;
  await wait(1200);

  const world = WORLDS[0]; // bluechips
  const rec = { W, H, httpStatus, isWideExpected: W >= 960, errors: [], overlaps: {}, phasesReached: [], loop: {} };

  rec.isWideActual = await page.evaluate(() => window.innerWidth >= 960);

  rec.overlaps.lobby = await checkOverlaps(page, 'lobby', ['vault-lobby-left', 'vault-lobby-right', 'vault-controlcard'], world.grid);
  rec.phasesReached.push(await phaseKind(page));
  await page.screenshot({ path: SHOTS + `narrow-${W}x${H}-01-lobby.png` });

  const apeInClicked = await clickText(page, 'ape in');
  rec.apeInClicked = apeInClicked;
  await wait(500);
  rec.overlaps.betentry = await checkOverlaps(page, 'bet-entry', ['vault-betentry-left', 'vault-betentry-right'], world.grid);
  rec.phasesReached.push(await phaseKind(page));
  await page.screenshot({ path: SHOTS + `narrow-${W}x${H}-02-betentry.png` });

  const sendItClicked = await clickText(page, 'SEND IT');
  rec.sendItClicked = sendItClicked;
  await wait(700);
  rec.overlaps.playing = await checkOverlaps(page, 'playing', ['vault-playing-left', 'vault-playing-right'], world.grid);
  rec.phasesReached.push(await phaseKind(page));
  await page.screenshot({ path: SHOTS + `narrow-${W}x${H}-03-playing.png` });

  // reveal tiles until settle (win-biased small reveal set then take-profit)
  let lbl = null;
  for (const idx of [1, 6, 11]) {
    const c = await cellCenter(page, idx, world.grid);
    if (!c) break;
    await page.mouse.click(c.cx, c.cy);
    await wait(400);
    lbl = await settledLabel(page);
    if (lbl) break;
  }
  if (!lbl) {
    const tpClicked = await clickText(page, 'take profit');
    rec.takeProfitClicked = tpClicked;
    await wait(700);
    lbl = await settledLabel(page);
  }
  rec.settleLabel = lbl;
  rec.overlaps.settled = await checkOverlaps(page, 'settled', ['vault-settled-left', 'vault-settled-right-new'], world.grid);
  rec.phasesReached.push(await phaseKind(page));
  await page.screenshot({ path: SHOTS + `narrow-${W}x${H}-04-settled.png` });

  const betAgainClicked = await clickText(page, 'bet again');
  rec.betAgainClicked = betAgainClicked;
  await wait(500);
  rec.loop.restartPhase = await phaseKind(page);
  await page.screenshot({ path: SHOTS + `narrow-${W}x${H}-05-restart.png` });

  rec.errors = errors.slice();
  await page.close();
  return rec;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EXE,
    headless: false,
    defaultViewport: null,
    args: ['--window-size=1500,1040', '--autoplay-policy=no-user-gesture-required'],
  });

  for (const world of WORLDS) {
    console.log('=== 1440x900 ===', world.mode);
    const rec = await run1440ForWorld(browser, world);
    console.log(JSON.stringify(rec, null, 1));
    results.viewport1440.push(rec);
  }

  console.log('=== narrow zone 1024x768 ===');
  results.narrowZone.push(await runNarrowZone(browser, 1024, 768));
  console.log('=== narrow zone 1120x800 ===');
  results.narrowZone.push(await runNarrowZone(browser, 1120, 800));

  await browser.close();
  fs.writeFileSync('holisticaudit0703-flow-main-results-v2.json', JSON.stringify(results, null, 2));
  console.log('ALL DONE');
  console.log(JSON.stringify(results.receiptProbe, null, 2));
})();
