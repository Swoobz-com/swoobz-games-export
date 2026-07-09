// fixpass-verify-0705.mjs — FIX PASS verification driver for the 4 grid-
// refactor defects (game-art-director, 2026-07-05). Adapts the proven
// helpers from visreg-gridrefactor-indep-0705.mjs (computeGridLayout
// replica, phase polling, take-profit fallback) and adds: a single-wager
// census, a CTA-below-fold rect check at 1440x900 + 1920x1080, a forced
// MANUAL-mode LOSS (rug) drive to inspect the HUD BAGGED line, and a
// board-vertical-centering / gapBelowGrid measurement.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5567';
const OUT = process.argv[3] || 'shots-fixpass-0705';
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
    if (document.querySelector('[data-testid="vault-settled-banner"]')) return 'settled';
    if (document.querySelector('[data-testid="vault-ctl-cta"]')) {
      const cta = document.querySelector('[data-testid="vault-ctl-cta"]');
      const txt = cta.innerText.toLowerCase();
      if (txt.includes('get started')) return 'lobby';
      if (txt.includes('send it') || txt.includes('pick your world')) return 'bet-entry';
      if (txt.includes('rugged') || txt.includes('settling')) return 'mine-hit-or-settling';
      return 'playing';
    }
    return 'unknown';
  });
}

// Replicates VaultGridCanvas.tsx computeGridLayout() EXACTLY.
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

// Forces a LOSS: MANUAL mode, taps every tile in raster order (5x5 board,
// bluechips = 3 rugs among 25) until a rug is hit — guaranteed before the
// board is exhausted. Captures the HUD row's left text at the moment
// mine-hit fires AND once settled.
async function driveManualLoss(page, minimalBands) {
  await clickText(page, 'SEND IT');
  await wait(700);
  // Ensure MANUAL (not TRAIL) is active.
  await clickText(page, 'MANUAL');
  await wait(200);
  const hudSnapshots = [];
  for (let row = 0; row < 5 && true; row++) {
    for (let col = 0; col < 5; col++) {
      const ph = await phaseTestid(page);
      if (ph === 'mine-hit-or-settling' || ph === 'settled') {
        return { hudSnapshots, reason: 'rug-detected-before-tap', lastPhase: ph };
      }
      const p = await tileCenter(page, 5, minimalBands, col, row);
      if (!p) return { hudSnapshots, reason: 'no-tile-center' };
      await page.mouse.click(p.cx, p.cy);
      await wait(180);
      const hud = await page.evaluate(() => {
        const row = document.querySelector('[data-testid="vault-hud-row"]');
        return row ? row.innerText : null;
      });
      hudSnapshots.push({ col, row, hud });
      const ph2 = await phaseTestid(page);
      if (ph2 === 'mine-hit-or-settling') {
        // mid mine-hit beat — grab HUD text right now
        const hudAtHit = await page.evaluate(() => {
          const row = document.querySelector('[data-testid="vault-hud-row"]');
          return row ? row.innerText : null;
        });
        // poll to settled
        for (let i = 0; i < 30; i++) {
          const ph3 = await phaseTestid(page);
          if (ph3 === 'settled') break;
          await wait(200);
        }
        const hudAtSettled = await page.evaluate(() => {
          const row = document.querySelector('[data-testid="vault-hud-row"]');
          return row ? row.innerText : null;
        });
        const bannerText = await page.evaluate(() => {
          const b = document.querySelector('[data-testid="vault-settled-banner"]');
          return b ? b.innerText : null;
        });
        return { hudSnapshots, hudAtHit, hudAtSettled, bannerText, reason: 'rug-hit', tileCol: col, tileRow: row };
      }
    }
  }
  return { hudSnapshots, reason: 'exhausted-board-no-rug' };
}

async function duplicateWagerCensus(page) {
  return page.evaluate(() => {
    const all = [...document.querySelectorAll('*')]
      .filter((e) => e.children.length === 0 && e.textContent && /INZET|YOUR BET/i.test(e.textContent.trim()))
      .map((e) => e.textContent.trim());
    // dedupe adjacent duplicates from nested text nodes
    const labels = [...new Set(all)].filter((t) => /^(INZET|YOUR BET)$/i.test(t));
    return { labelsFound: labels, rawCount: all.length };
  });
}

async function ctaFoldCheck(page) {
  const sendItRect = await rectByText(page, 'SEND IT');
  const colRect = await page.evaluate(() => {
    const col = document.querySelector('[data-testid="vault-control-column"]');
    if (!col) return null;
    const r = col.getBoundingClientRect();
    return {
      top: r.top, bottom: r.bottom, width: r.width,
      scrollTop: col.scrollTop, scrollHeight: col.scrollHeight, clientHeight: col.clientHeight,
      hasInternalScroll: col.scrollHeight > col.clientHeight + 1,
    };
  });
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  return { sendItRect, colRect, viewportHeight };
}

async function boardCenteringCheck(page) {
  return page.evaluate(() => {
    const grid = document.querySelector('[data-testid="vault-main-grid"]');
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]');
    const caption = document.querySelector('[data-testid="vault-board-caption"]');
    const worldPicker = document.querySelector('[data-testid="vault-board-worldpicker"]');
    const col = document.querySelector('[data-testid="vault-control-column"]');
    const gridRect = grid ? grid.getBoundingClientRect() : null;
    const shellRect = shell ? shell.getBoundingClientRect() : null;
    const captionRect = caption ? caption.getBoundingClientRect() : null;
    const wpRect = worldPicker ? worldPicker.getBoundingClientRect() : null;
    const colRect = col ? col.getBoundingClientRect() : null;
    const boardColumn = shell ? shell.parentElement : null;
    const boardColumnRect = boardColumn ? boardColumn.getBoundingClientRect() : null;
    let gapBelowGrid = null;
    if (grid && grid.parentElement) {
      const cabinet = grid.parentElement;
      const next = cabinet.nextElementSibling;
      if (next) {
        const nr = next.getBoundingClientRect();
        const cr = cabinet.getBoundingClientRect();
        gapBelowGrid = nr.top - cr.bottom;
      }
    }
    const spaceBelowBoardColumn = gridRect && boardColumnRect ? gridRect.bottom - boardColumnRect.bottom : null;
    return {
      gridBottom: gridRect ? gridRect.bottom : null,
      boardColumnTop: boardColumnRect ? boardColumnRect.top : null,
      boardColumnBottom: boardColumnRect ? boardColumnRect.bottom : null,
      colBottom: colRect ? colRect.bottom : null,
      shellRect: shellRect ? { top: shellRect.top, bottom: shellRect.bottom } : null,
      captionRect: captionRect ? { top: captionRect.top, bottom: captionRect.bottom } : null,
      worldPickerPresent: !!worldPicker,
      worldPickerRect: wpRect ? { top: wpRect.top, bottom: wpRect.bottom } : null,
      spaceBelowBoardColumn,
      gapBelowGrid,
    };
  });
}

async function gridAssertions(page) {
  return page.evaluate(() => {
    const grid = document.querySelector('[data-testid="vault-main-grid"]');
    const cs = grid ? getComputedStyle(grid) : null;
    const gutterTestids = ['vault-gutter-left', 'vault-gutter-right', 'vault-gutter-card-a', 'vault-gutter-card-a-right', 'vault-gutter-card-b', 'vault-gutter-card-c'];
    const anyGutterAttr = [...document.querySelectorAll('[data-testid]')]
      .map((e) => e.getAttribute('data-testid'))
      .filter((t) => t && t.toLowerCase().includes('gutter'));
    const panelIds = ['vault-ctl-wager', 'vault-ctl-mode', 'vault-ctl-cta', 'vault-ctl-takeprofit', 'vault-ctl-session', 'vault-ctl-receipt'];
    const panels = panelIds.map((t) => ({ testid: t, present: !!document.querySelector(`[data-testid="${t}"]`) }));
    const recentsAll = [...document.querySelectorAll('[aria-label="recent rounds"]')];
    return {
      gridTemplateColumns: cs ? cs.gridTemplateColumns : null,
      anyGutterAttr,
      panels,
      recentsCount: recentsAll.length,
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
      hasVScroll: document.documentElement.scrollHeight > window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      hasHScroll: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--window-size=1500,1000'] });
  const results = { port: PORT, ts: new Date().toISOString() };

  // ══════════════ DESKTOP 1440×900 ══════════════
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
    await wait(600);
    results.d1440_lobby_grid = await gridAssertions(page);

    await reachBetEntry(page);
    await wait(400);
    await page.screenshot({ path: `${OUT}/d1440/02-betentry-full.png` });
    results.d1440_betentry_wagerCensus = await duplicateWagerCensus(page);
    results.d1440_betentry_ctaFold = await ctaFoldCheck(page);
    results.d1440_betentry_centering = await boardCenteringCheck(page);
    results.d1440_betentry_grid = await gridAssertions(page);

    await page.close();
  }

  // Fresh page for the manual-loss drive (1440x900) — separate page so
  // bet-entry measurements above aren't perturbed by tapping through to a
  // settled round.
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
    await wait(600);
    await reachBetEntry(page);
    await wait(400);
    const lossResult = await driveManualLoss(page, true);
    await wait(400);
    await page.screenshot({ path: `${OUT}/d1440/05-settled-loss-full.png` });
    results.d1440_manualLoss = lossResult;
    results.d1440_settledLoss_grid = await gridAssertions(page);
    await page.close();
  }

  // ══════════════ DESKTOP 1920×1080 ══════════════
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
    await wait(600);

    await reachBetEntry(page);
    await wait(400);
    await page.screenshot({ path: `${OUT}/d1920/02-betentry-full.png` });
    results.d1920_betentry_wagerCensus = await duplicateWagerCensus(page);
    results.d1920_betentry_ctaFold = await ctaFoldCheck(page);
    results.d1920_betentry_centering = await boardCenteringCheck(page);
    results.d1920_betentry_grid = await gridAssertions(page);

    await page.close();
  }

  await browser.close();

  // ══════════════ MOBILE 390×844 sanity ══════════════
  const browser2 = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--window-size=430,900'] });
  const mpage = await browser2.newPage();
  await mpage.setViewport({ width: 390, height: 844 });
  await mpage.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
  await wait(600);
  await mpage.screenshot({ path: `${OUT}/m390/01-lobby-full.png` });
  await reachBetEntry(mpage);
  await wait(400);
  await mpage.screenshot({ path: `${OUT}/m390/02-betentry-full.png` });
  results.m390_betentry_wagerCensus = await duplicateWagerCensus(mpage);
  results.m390_betentry_grid = await gridAssertions(mpage);
  await browser2.close();

  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
  console.log('DONE. Wrote', `${OUT}/results.json`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
