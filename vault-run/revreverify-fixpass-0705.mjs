// revreverify-fixpass-0705.mjs — INDEPENDENT re-verification of the 4-defect
// vault grid-refactor FIX PASS (game-art-director, 2026-07-05). Fresh driver
// (not the maker's fixpass-verify-0705.mjs, though the proven mechanics —
// computeGridLayout replica, phase polling, take-profit fallback, manual-loss
// drive — are reused per prior-run memory). Covers holdgate A-H.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5413';
const OUT = process.argv[3] || 'shots-visreg-fixpass-0705';
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
    if (document.body.innerText.includes('SETTLED') && document.body.innerText.toLowerCase().includes('bag')) return 'settled';
    if (document.querySelector('[data-testid="vault-ctl-cta"]')) {
      const cta = document.querySelector('[data-testid="vault-ctl-cta"]');
      const txt = cta.innerText.toLowerCase();
      if (txt.includes('get started')) return 'lobby';
      if (txt.includes('send it') || txt.includes('your bet')) return 'bet-entry';
      if (txt.includes('rugged') || txt.includes('settling')) return 'mine-hit-or-settling';
      return 'playing';
    }
    return 'unknown';
  });
}

// Replicates VaultGridCanvas.tsx computeGridLayout() EXACTLY (read from
// source at originals/vault/VaultGridCanvas.tsx, not guessed).
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
  for (let i = 0; i < 40; i++) {
    const ph = await phaseTestid(page);
    if (ph === 'settled') return true;
    await wait(300);
  }
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

// Forces a guaranteed LOSS via MANUAL mode raster-order taps (5x5, 3 rugs).
async function driveManualLoss(page, minimalBands) {
  await clickText(page, 'SEND IT');
  await wait(700);
  await clickText(page, 'MANUAL');
  await wait(200);
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const ph = await phaseTestid(page);
      if (ph === 'mine-hit-or-settling' || ph === 'settled') {
        return await captureLossHud(page, ph);
      }
      const p = await tileCenter(page, 5, minimalBands, col, row);
      if (!p) return { reason: 'no-tile-center' };
      await page.mouse.click(p.cx, p.cy);
      await wait(180);
      const ph2 = await phaseTestid(page);
      if (ph2 === 'mine-hit-or-settling') {
        return await captureLossHud(page, ph2);
      }
    }
  }
  return { reason: 'exhausted-board-no-rug' };
}

async function captureLossHud(page) {
  const hudAtHit = await page.evaluate(() => {
    const row = document.querySelector('[data-testid="vault-hud-row"]');
    return row ? row.innerText : null;
  });
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
  return { reason: 'rug-hit', hudAtHit, hudAtSettled, bannerText };
}

// Forces a guaranteed WIN: tap ONE tile then take-profit immediately.
// Retries on an accidental rug (bluechips = 3 rugs of 25, ~12% chance).
async function driveManualWin(page, minimalBands, attempts = 6) {
  for (let a = 0; a < attempts; a++) {
    await clickText(page, 'SEND IT');
    await wait(700);
    await clickText(page, 'MANUAL');
    await wait(200);
    const p = await tileCenter(page, 5, minimalBands, 0, 0);
    if (p) {
      await page.mouse.click(p.cx, p.cy);
      await wait(250);
    }
    const ph = await phaseTestid(page);
    if (ph === 'mine-hit-or-settling') {
      // hit a rug on the very first tile — restart with a fresh bet-entry
      await clickText(page, 'new setup');
      await wait(300);
      for (let i = 0; i < 20; i++) {
        if (await phaseTestid(page) === 'lobby') break;
        await wait(150);
      }
      await reachBetEntry(page);
      continue;
    }
    const took = await clickText(page, 'take profit');
    if (!took) continue;
    for (let i = 0; i < 20; i++) {
      if ((await phaseTestid(page)) === 'settled') break;
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
    return { reason: 'win', attemptsUsed: a + 1, hudAtSettled, bannerText };
  }
  return { reason: 'gave-up', attemptsUsed: attempts };
}

async function duplicateWagerCensus(page) {
  return page.evaluate(() => {
    const all = [...document.querySelectorAll('*')]
      .filter((e) => e.children.length === 0 && e.textContent && /INZET|YOUR BET/i.test(e.textContent.trim()))
      .map((e) => e.textContent.trim());
    const labels = [...new Set(all)].filter((t) => /^(INZET|YOUR BET)$/i.test(t));
    return { labelsFound: labels, rawCount: all.length };
  });
}

async function panelWidths(page) {
  return page.evaluate(() => {
    const ids = ['vault-ctl-wager', 'vault-ctl-mode', 'vault-ctl-cta', 'vault-ctl-takeprofit', 'vault-ctl-session', 'vault-ctl-receipt'];
    const col = document.querySelector('[data-testid="vault-control-column"]');
    const colRect = col ? col.getBoundingClientRect() : null;
    const widths = ids.map((t) => {
      const el = document.querySelector(`[data-testid="${t}"]`);
      if (!el) return { testid: t, present: false };
      const r = el.getBoundingClientRect();
      return { testid: t, present: true, width: Math.round(r.width * 100) / 100, y: Math.round(r.y) };
    });
    return {
      widths,
      colWidth: colRect ? Math.round(colRect.width * 100) / 100 : null,
      colScrollHeight: col ? col.scrollHeight : null,
      colClientHeight: col ? col.clientHeight : null,
      colHasInternalScroll: col ? col.scrollHeight > col.clientHeight + 1 : null,
    };
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
    const topMargin = boardColumnRect && gridRect ? null : null;
    // symmetric-margin check: distance from boardColumn top to its first
    // visible child (HUD or banner or shell) vs distance from its last
    // visible child (caption or worldpicker) to boardColumn bottom.
    let marginTop = null, marginBottom = null;
    if (boardColumn && boardColumnRect) {
      const kids = [...boardColumn.children].filter((k) => k.getBoundingClientRect().height > 0);
      if (kids.length) {
        const first = kids[0].getBoundingClientRect();
        const last = kids[kids.length - 1].getBoundingClientRect();
        marginTop = first.top - boardColumnRect.top;
        marginBottom = boardColumnRect.bottom - last.bottom;
      }
    }
    return {
      gridBottom: gridRect ? gridRect.bottom : null,
      boardColumnTop: boardColumnRect ? boardColumnRect.top : null,
      boardColumnBottom: boardColumnRect ? boardColumnRect.bottom : null,
      boardColumnHeight: boardColumnRect ? boardColumnRect.height : null,
      colBottom: colRect ? colRect.bottom : null,
      colHeight: colRect ? colRect.height : null,
      shellRect: shellRect ? { top: shellRect.top, bottom: shellRect.bottom } : null,
      captionRect: captionRect ? { top: captionRect.top, bottom: captionRect.bottom } : null,
      worldPickerPresent: !!worldPicker,
      worldPickerRect: wpRect ? { top: wpRect.top, bottom: wpRect.bottom } : null,
      gapBelowGrid,
      marginTop,
      marginBottom,
    };
  });
}

async function gridAssertions(page) {
  return page.evaluate(() => {
    const grid = document.querySelector('[data-testid="vault-main-grid"]');
    const cs = grid ? getComputedStyle(grid) : null;
    const anyGutterAttr = [...document.querySelectorAll('[data-testid]')]
      .map((e) => e.getAttribute('data-testid'))
      .filter((t) => t && t.toLowerCase().includes('gutter'));
    const panelIds = ['vault-ctl-wager', 'vault-ctl-mode', 'vault-ctl-cta', 'vault-ctl-takeprofit', 'vault-ctl-session', 'vault-ctl-receipt'];
    const panels = panelIds.map((t) => ({ testid: t, present: !!document.querySelector(`[data-testid="${t}"]`) }));
    const hudRow = document.querySelector('[data-testid="vault-hud-row"]');
    const hudRows = document.querySelectorAll('[data-testid="vault-hud-row"]');
    const settledBanner = document.querySelector('[data-testid="vault-settled-banner"]');
    const recentsAll = [...document.querySelectorAll('[aria-label="recent rounds"]')];
    // header-tape detection via the brand text node's own parent, not a
    // blind firstElementChild walk (prior probe false-positive, see memory).
    const brand = [...document.querySelectorAll('span')].find((e) => e.textContent.trim() === 'RUG OR RICHES');
    const headerTape = brand ? brand.parentElement : null;
    const headerRect = headerTape ? headerTape.getBoundingClientRect() : null;
    const recentsInHeader = recentsAll.filter((e) => headerTape && headerTape.contains(e));
    return {
      gridTemplateColumns: cs ? cs.gridTemplateColumns : null,
      anyGutterAttr,
      panels,
      hudRowCount: hudRows.length,
      hudRowPresent: !!hudRow,
      settledBannerPresent: !!settledBanner,
      recentsCount: recentsAll.length,
      recentsInHeaderCount: recentsInHeader.length,
      headerRect: headerRect ? { top: headerRect.top, bottom: headerRect.bottom, height: headerRect.height } : null,
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
      hasVScroll: document.documentElement.scrollHeight > window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      hasHScroll: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
}

async function receiptReachCheck(page) {
  // settled phase only — click "view receipt" and confirm the expandable body appears
  const clicked = await clickText(page, 'view receipt');
  await wait(200);
  const body = await page.evaluate(() => !!document.getElementById('vault-settled-receipt'));
  return { clicked, receiptBodyVisible: body };
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--window-size=1500,1000'] });
  const results = { port: PORT, ts: new Date().toISOString() };

  // ══════════════ DESKTOP 1440×900 — full 4-phase pass ══════════════
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
    await wait(600);
    await page.screenshot({ path: `${OUT}/d1440/01-lobby-full.png` });
    results.d1440_lobby_grid = await gridAssertions(page);
    results.d1440_lobby_widths = await panelWidths(page);

    await reachBetEntry(page);
    await wait(400);
    await page.screenshot({ path: `${OUT}/d1440/02-betentry-full.png` });
    results.d1440_betentry_grid = await gridAssertions(page);
    results.d1440_betentry_widths = await panelWidths(page);
    results.d1440_betentry_dupWager = await duplicateWagerCensus(page);
    results.d1440_betentry_ctaFold = await ctaFoldCheck(page);
    results.d1440_betentry_centering = await boardCenteringCheck(page);

    await reachPlayingViaTrail(page, true);
    await wait(400);
    await page.screenshot({ path: `${OUT}/d1440/03-playing-full.png` });
    results.d1440_playing_grid = await gridAssertions(page);
    results.d1440_playing_widths = await panelWidths(page);

    const settled = await goAndSettle(page);
    await wait(500);
    await page.screenshot({ path: `${OUT}/d1440/04-settled-full.png` });
    results.d1440_settled_grid = await gridAssertions(page);
    results.d1440_settled_widths = await panelWidths(page);
    results.d1440_settledReached = settled;
    results.d1440_receiptCheck = await receiptReachCheck(page);
    await page.screenshot({ path: `${OUT}/d1440/04b-settled-receipt-open.png` });

    await page.close();
  }

  // Fresh page, 1440x900 — forced LOSS drive (Defect 3, G)
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
    await wait(600);
    await reachBetEntry(page);
    await wait(400);
    results.d1440_manualLoss = await driveManualLoss(page, true);
    await wait(400);
    await page.screenshot({ path: `${OUT}/d1440/05-settled-loss-full.png` });
    await page.close();
  }

  // Fresh page, 1440x900 — forced WIN drive (confirm loss-fix didn't
  // suppress the real win amount)
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
    await wait(600);
    await reachBetEntry(page);
    await wait(400);
    results.d1440_manualWin = await driveManualWin(page, true);
    await wait(400);
    await page.screenshot({ path: `${OUT}/d1440/06-settled-win-full.png` });
    await page.close();
  }

  // ══════════════ DESKTOP 1920×1080 — full 4-phase pass ══════════════
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
    await wait(600);
    await page.screenshot({ path: `${OUT}/d1920/01-lobby-full.png` });
    results.d1920_lobby_grid = await gridAssertions(page);
    results.d1920_lobby_widths = await panelWidths(page);

    await reachBetEntry(page);
    await wait(400);
    await page.screenshot({ path: `${OUT}/d1920/02-betentry-full.png` });
    results.d1920_betentry_grid = await gridAssertions(page);
    results.d1920_betentry_widths = await panelWidths(page);
    results.d1920_betentry_dupWager = await duplicateWagerCensus(page);
    results.d1920_betentry_ctaFold = await ctaFoldCheck(page);
    results.d1920_betentry_centering = await boardCenteringCheck(page);

    await reachPlayingViaTrail(page, true);
    await wait(400);
    await page.screenshot({ path: `${OUT}/d1920/03-playing-full.png` });
    results.d1920_playing_grid = await gridAssertions(page);
    results.d1920_playing_widths = await panelWidths(page);

    const settled = await goAndSettle(page);
    await wait(500);
    await page.screenshot({ path: `${OUT}/d1920/04-settled-full.png` });
    results.d1920_settled_grid = await gridAssertions(page);
    results.d1920_settled_widths = await panelWidths(page);
    results.d1920_settledReached = settled;

    await page.close();
  }

  await browser.close();

  // ══════════════ MOBILE 390×844 — full 4-phase sanity ══════════════
  const browser2 = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--window-size=430,900'] });
  const mpage = await browser2.newPage();
  await mpage.setViewport({ width: 390, height: 844 });
  await mpage.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
  await wait(600);
  await mpage.screenshot({ path: `${OUT}/m390/01-lobby-full.png` });
  results.m390_lobby_grid = await gridAssertions(mpage);

  await reachBetEntry(mpage);
  await wait(400);
  await mpage.screenshot({ path: `${OUT}/m390/02-betentry-full.png` });
  results.m390_betentry_grid = await gridAssertions(mpage);
  results.m390_betentry_dupWager = await duplicateWagerCensus(mpage);

  await reachPlayingViaTrail(mpage, false);
  await wait(400);
  await mpage.screenshot({ path: `${OUT}/m390/03-playing-full.png` });
  results.m390_playing_grid = await gridAssertions(mpage);

  const settledM = await goAndSettle(mpage);
  await wait(500);
  await mpage.screenshot({ path: `${OUT}/m390/04-settled-full.png` });
  results.m390_settled_grid = await gridAssertions(mpage);
  results.m390_settledReached = settledM;

  // separate mobile loss drive
  await mpage.close();
  const mpage2 = await browser2.newPage();
  await mpage2.setViewport({ width: 390, height: 844 });
  await mpage2.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
  await wait(600);
  await reachBetEntry(mpage2);
  await wait(400);
  results.m390_manualLoss = await driveManualLoss(mpage2, false);
  await wait(400);
  await mpage2.screenshot({ path: `${OUT}/m390/05-settled-loss-full.png` });

  await browser2.close();

  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
  console.log('DONE. Wrote', `${OUT}/results.json`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
