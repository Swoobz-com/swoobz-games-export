// visreg-gridrefactor-indep-0705.mjs — INDEPENDENT visual-regression verification
// of the CSS-grid chassis refactor (VaultExperience.tsx / VaultGridCanvas.tsx,
// game-art-director 2026-07-05). Fresh driver, NOT the maker's own
// gridrefactor-verify-0705.mjs — written from scratch by swoobz-visual-
// regression-qa against the live render only. Covers holdgate A-K.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5404';
const OUT = process.argv[3] || 'shots-visreg-gridrefactor-0705';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

for (const sub of ['', '/d1440', '/d1920', '/m390']) {
  const p = `${OUT}${sub}`;
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return (
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}

async function rectByText(page, t) {
  return page.evaluate((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    const el =
      els.find((e) => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()));
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, bottom: r.bottom, left: r.left, right: r.right };
  }, t);
}

async function phaseTestid(page) {
  return page.evaluate(() => {
    if (document.querySelector('[data-testid="vault-settled-banner"], [data-testid="vault-settledpanel"]')) return 'settled';
    if (document.querySelector('[data-testid="vault-ctl-cta"]')) {
      // distinguish lobby / bet-entry / playing by DOM content heuristics
      const cta = document.querySelector('[data-testid="vault-ctl-cta"]');
      const txt = cta.innerText.toLowerCase();
      if (txt.includes('get started')) return 'lobby';
      if (txt.includes('your bet') || txt.includes('pick your world')) return 'bet-entry';
      return 'playing';
    }
    return 'unknown';
  });
}

// Replicates VaultGridCanvas.tsx computeGridLayout() EXACTLY (read from
// source, not guessed) so painted tile centers land on real tiles.
async function tileCenter(page, gridSize, minimalBands, col, row) {
  return page.evaluate(
    (gridSize, minimalBands, col, row) => {
      const c = document.querySelector('canvas');
      if (!c) return null;
      const rect = c.getBoundingClientRect();
      const W = rect.width, H = rect.height;
      const wide = W / H > 1.2;
      const topReserved = minimalBands ? H * 0.035 : H * (wide ? 0.12 : 0.15);
      const bottomReserved = minimalBands ? H * 0.035 : H * (wide ? 0.14 : 0.18);
      const sideFrac = minimalBands ? 0.04 : 0.08;
      const safeW = W * (1 - sideFrac * 2);
      const safeH = (H - topReserved - bottomReserved) * 0.96;
      const available = Math.min(safeW, safeH);
      const gap = Math.max(6, available * 0.026);
      const tile = (available - gap * (gridSize - 1)) / gridSize;
      const full = tile * gridSize + gap * (gridSize - 1);
      const x = (W - full) / 2;
      const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2;
      const y = bandCenterY - full / 2;
      const cx = rect.left + x + col * (tile + gap) + tile / 2;
      const cy = rect.top + y + row * (tile + gap) + tile / 2;
      return { cx, cy };
    },
    gridSize,
    minimalBands,
    col,
    row,
  );
}

async function reachBetEntry(page) {
  await clickText(page, 'ape in');
  await wait(500);
}

async function reachPlayingViaTrail(page, minimalBands) {
  await clickText(page, 'SEND IT');
  await wait(700);
  await clickText(page, 'TRAIL');
  await wait(300);
  // paint 3 tiles: (1,1) -> (2,1) -> (3,1) with a real drag gesture
  // (mousedown / mousemove{steps:3} / mouseup on tile centers), gridSize=5
  // (default bluechips mode, vaultMath.ts DEFAULT_GRID_SIZE/GRID_SIZE_BLUECHIPS).
  const p1 = await tileCenter(page, 5, minimalBands, 1, 1);
  const p2 = await tileCenter(page, 5, minimalBands, 2, 1);
  const p3 = await tileCenter(page, 5, minimalBands, 3, 1);
  if (!p1 || !p2 || !p3) return false;
  await page.mouse.move(p1.cx, p1.cy);
  await page.mouse.down();
  await page.mouse.move(p2.cx, p2.cy, { steps: 3 });
  await wait(60);
  await page.mouse.move(p3.cx, p3.cy, { steps: 3 });
  await wait(60);
  await page.mouse.up();
  await wait(300);
  return true;
}

async function goAndSettle(page) {
  await clickText(page, 'GO');
  // trail auto-runs to completion (win or rug) — poll for settled
  for (let i = 0; i < 40; i++) {
    const ph = await phaseTestid(page);
    if (ph === 'settled') return true;
    await wait(300);
  }
  // Trail run resolved all-safe and the round is still PLAYING (no rug hit) —
  // force settlement via "take profit" (same fallback pattern the maker's
  // own driver uses), rather than mis-report a still-playing state as settled.
  const took = await clickText(page, 'take profit');
  if (took) {
    for (let i = 0; i < 20; i++) {
      const ph = await phaseTestid(page);
      if (ph === 'settled') return true;
      await wait(300);
    }
  }
  return (await phaseTestid(page)) === 'settled';
}

async function gridAssertions(page) {
  return page.evaluate(() => {
    const grid = document.querySelector('[data-testid="vault-main-grid"]');
    const col = document.querySelector('[data-testid="vault-control-column"]');
    const cs = grid ? getComputedStyle(grid) : null;
    const gridRect = grid ? grid.getBoundingClientRect() : null;
    const colRect = col ? col.getBoundingClientRect() : null;

    const gutterTestids = [
      'vault-gutter-left', 'vault-gutter-right', 'vault-gutter-card-a', 'vault-gutter-card-a-right',
      'vault-gutter-card-b', 'vault-gutter-card-c', 'vault-settled-receipt-gutter', 'vault-settled-betagain',
      'vault-corner-gear-popover',
    ];
    const foundGutter = gutterTestids.filter((t) => !!document.querySelector(`[data-testid="${t}"]`));
    // broad sweep: ANY element whose testid contains "gutter"
    const anyGutterAttr = [...document.querySelectorAll('[data-testid]')]
      .map((e) => e.getAttribute('data-testid'))
      .filter((t) => t && t.toLowerCase().includes('gutter'));

    const panelIds = ['vault-ctl-wager', 'vault-ctl-mode', 'vault-ctl-cta', 'vault-ctl-takeprofit', 'vault-ctl-session', 'vault-ctl-receipt'];
    const panels = panelIds.map((t) => {
      const el = document.querySelector(`[data-testid="${t}"]`);
      if (!el) return { testid: t, present: false };
      const r = el.getBoundingClientRect();
      return { testid: t, present: true, x: r.x, y: r.y, width: r.width, height: r.height };
    });

    const hudRow = document.querySelector('[data-testid="vault-hud-row"]');
    const hudRowRect = hudRow ? hudRow.getBoundingClientRect() : null;
    const settledBanner = document.querySelector('[data-testid="vault-settled-banner"]');
    const settledBannerRect = settledBanner ? settledBanner.getBoundingClientRect() : null;

    const topbar = document.querySelector('body > div > div'); // headerTape is first child div
    const footer = document.querySelector('[data-testid="vault-board-caption"]')?.closest('div')?.parentElement;

    // recents location: HistoryStrip renders aria-label="recent rounds"
    const recentsAll = [...document.querySelectorAll('[aria-label="recent rounds"]')];
    const recentsRects = recentsAll.map((e) => {
      const r = e.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
    });
    // topbar bounding box (headerTape is a direct child of the page root, first div)
    const pageRoot = document.body.firstElementChild;
    const headerTape = pageRoot ? pageRoot.firstElementChild : null;
    const headerTapeRect = headerTape ? headerTape.getBoundingClientRect() : null;
    const recentsInHeaderTape = headerTapeRect
      ? recentsRects.filter((r) => r.top >= headerTapeRect.top && r.bottom <= headerTapeRect.bottom + 2)
      : [];

    // dead space below the grid: gap between grid bottom and the very next
    // sibling element (bottom status bar / gameFooter)
    let gapBelowGrid = null;
    if (grid && grid.nextElementSibling === null && grid.parentElement) {
      // cabinetStyle wraps mainGrid; look at cabinet's next sibling
      const cabinet = grid.parentElement;
      const next = cabinet.nextElementSibling;
      if (next) {
        const nr = next.getBoundingClientRect();
        const cr = cabinet.getBoundingClientRect();
        gapBelowGrid = nr.top - cr.bottom;
      }
    }

    return {
      display: cs ? cs.display : null,
      gridTemplateColumns: cs ? cs.gridTemplateColumns : null,
      gridRect: gridRect ? { x: gridRect.x, y: gridRect.y, width: gridRect.width, height: gridRect.height, bottom: gridRect.bottom } : null,
      colRect: colRect ? { x: colRect.x, y: colRect.y, width: colRect.width, height: colRect.height } : null,
      colScrollHeight: col ? col.scrollHeight : null,
      colClientHeight: col ? col.clientHeight : null,
      foundGutter,
      anyGutterAttr,
      panels,
      hudRowPresent: !!hudRow,
      hudRowRect: hudRowRect ? { top: hudRowRect.top, bottom: hudRowRect.bottom, left: hudRowRect.left, right: hudRowRect.right } : null,
      settledBannerPresent: !!settledBanner,
      settledBannerRect: settledBannerRect ? { top: settledBannerRect.top, bottom: settledBannerRect.bottom } : null,
      recentsCount: recentsAll.length,
      recentsRects,
      recentsInHeaderTapeCount: recentsInHeaderTape.length,
      gapBelowGrid,
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
      hasVScroll: document.documentElement.scrollHeight > window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      hasHScroll: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
}

// duplicate-wager measurement: rects of vault-ctl-wager panel AND any
// wager-stepper text inside vault-ctl-cta (BetEntry/BetConsole's own "YOUR
// BET" block), during bet-entry only.
async function duplicateWagerCheck(page) {
  return page.evaluate(() => {
    const inzet = document.querySelector('[data-testid="vault-ctl-wager"]');
    const cta = document.querySelector('[data-testid="vault-ctl-cta"]');
    const inzetText = inzet ? inzet.innerText : null;
    const ctaHasYourBet = cta ? /your bet/i.test(cta.innerText) : false;
    const ctaText = cta ? cta.innerText.slice(0, 400) : null;
    const inzetRect = inzet ? inzet.getBoundingClientRect() : null;
    const ctaRect = cta ? cta.getBoundingClientRect() : null;
    return {
      inzetPresent: !!inzet,
      inzetText,
      inzetRect: inzetRect ? { top: inzetRect.top, bottom: inzetRect.bottom, height: inzetRect.height } : null,
      ctaHasYourBet,
      ctaText,
      ctaRect: ctaRect ? { top: ctaRect.top, bottom: ctaRect.bottom, height: ctaRect.height } : null,
    };
  });
}

async function ctaBelowFoldCheck(page) {
  const sendItRect = await rectByText(page, 'SEND IT');
  const colRect = await page.evaluate(() => {
    const col = document.querySelector('[data-testid="vault-control-column"]');
    if (!col) return null;
    const r = col.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, scrollTop: col.scrollTop, scrollHeight: col.scrollHeight, clientHeight: col.clientHeight };
  });
  return { sendItRect, colRect, viewportHeight: await page.evaluate(() => window.innerHeight) };
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--window-size=1500,1000'] });
  const results = { port: PORT, ts: new Date().toISOString() };

  // ══════════════════════ DESKTOP 1440×900 — 4 phases ══════════════════════
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
    await wait(600);
    await page.screenshot({ path: `${OUT}/d1440/01-lobby-full.png` });
    results.d1440_lobby = await gridAssertions(page);

    await reachBetEntry(page);
    await wait(400);
    await page.screenshot({ path: `${OUT}/d1440/02-betentry-full.png` });
    results.d1440_betentry = await gridAssertions(page);
    results.d1440_betentry_dupWager = await duplicateWagerCheck(page);
    results.d1440_betentry_ctaFold = await ctaBelowFoldCheck(page);

    await reachPlayingViaTrail(page, true);
    await wait(400);
    await page.screenshot({ path: `${OUT}/d1440/03-playing-full.png` });
    // crop of the board frame only, to visually check for ghosted canvas HUD text
    const boardBox = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="vault-canvas-shell"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
    });
    if (boardBox) await page.screenshot({ path: `${OUT}/d1440/03b-playing-boardcrop.png`, clip: boardBox });
    results.d1440_playing = await gridAssertions(page);

    const settled = await goAndSettle(page);
    await wait(500);
    await page.screenshot({ path: `${OUT}/d1440/04-settled-full.png` });
    const boardBox2 = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="vault-canvas-shell"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
    });
    if (boardBox2) await page.screenshot({ path: `${OUT}/d1440/04b-settled-boardcrop.png`, clip: boardBox2 });
    results.d1440_settled = await gridAssertions(page);
    results.d1440_settledReached = settled;

    await page.close();
  }

  // ══════════════════════ DESKTOP 1920×1080 — 4 phases ══════════════════════
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
    await wait(600);
    await page.screenshot({ path: `${OUT}/d1920/01-lobby-full.png` });
    results.d1920_lobby = await gridAssertions(page);

    await reachBetEntry(page);
    await wait(400);
    await page.screenshot({ path: `${OUT}/d1920/02-betentry-full.png` });
    results.d1920_betentry = await gridAssertions(page);
    results.d1920_betentry_ctaFold = await ctaBelowFoldCheck(page);

    await reachPlayingViaTrail(page, true);
    await wait(400);
    await page.screenshot({ path: `${OUT}/d1920/03-playing-full.png` });
    results.d1920_playing = await gridAssertions(page);

    const settled = await goAndSettle(page);
    await wait(500);
    await page.screenshot({ path: `${OUT}/d1920/04-settled-full.png` });
    results.d1920_settled = await gridAssertions(page);
    results.d1920_settledReached = settled;

    await page.close();
  }

  await browser.close();

  // ══════════════════════ MOBILE 390×844 — 4 phases ══════════════════════
  const browser2 = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--window-size=430,900'] });
  const mpage = await browser2.newPage();
  await mpage.setViewport({ width: 390, height: 844 });
  await mpage.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
  await wait(600);
  await mpage.screenshot({ path: `${OUT}/m390/01-lobby-full.png` });
  results.m390_lobby = await gridAssertions(mpage);

  await reachBetEntry(mpage);
  await wait(400);
  await mpage.screenshot({ path: `${OUT}/m390/02-betentry-full.png` });
  results.m390_betentry = await gridAssertions(mpage);

  await reachPlayingViaTrail(mpage, false);
  await wait(400);
  await mpage.screenshot({ path: `${OUT}/m390/03-playing-full.png` });
  results.m390_playing = await gridAssertions(mpage);

  const settledM = await goAndSettle(mpage);
  await wait(500);
  await mpage.screenshot({ path: `${OUT}/m390/04-settled-full.png` });
  results.m390_settled = await gridAssertions(mpage);
  results.m390_settledReached = settledM;

  await browser2.close();

  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
  console.log('DONE. Wrote', `${OUT}/results.json`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
