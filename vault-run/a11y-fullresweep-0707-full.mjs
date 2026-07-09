// FULL FRESH accessibility re-sweep — vault (RUG OR RICHES), 2026-07-07.
// Independent, self-contained: spawns its OWN dev server (port 5284),
// launches its OWN Chrome, runs every probe in the foreground, kills the
// dev server in a `finally` block. Does NOT reuse any prior agent's driver
// logic verbatim (rewritten from scratch per the task's independent-
// reconfirmation instruction), though it reuses the established TECHNIQUES
// documented in AGENT_MEMORY.md (screenshot-pair pixel-diff for a
// canvas-drawn focus ring, live getImageData contrast sampling instead of
// trusting source-level color tokens, exact-string phase polling).
import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import fs from 'fs';
import http from 'http';

const PORT = 5284;
const URL = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad/a11y-fullresweep-0707';
fs.mkdirSync(OUT, { recursive: true });

const R = {}; // results accumulator
const log = (...a) => console.log(...a);

function srgbToLin(c) {
  const cs = c / 255;
  return cs <= 0.04045 ? cs / 12.92 : ((cs + 0.055) / 1.055) ** 2.4;
}
function relLum([r, g, b]) {
  return 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b);
}
function contrast(rgb1, rgb2) {
  const L1 = relLum(rgb1);
  const L2 = relLum(rgb2);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}
function waitForServer(url, timeoutMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve(true);
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) reject(new Error('server did not come up'));
        else setTimeout(tryOnce, 300);
      });
    };
    tryOnce();
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  log('Spawning vite dev server on port', PORT);
  const devProc = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    cwd: 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/vault-run',
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let devLog = '';
  devProc.stdout.on('data', (d) => (devLog += d.toString()));
  devProc.stderr.on('data', (d) => (devLog += d.toString()));

  let browser;
  try {
    await waitForServer(URL, 30000);
    log('Dev server up.');

    browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });

    // =========================================================================
    // SECTION A — DESKTOP (1440x900)
    // =========================================================================
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    page.on('pageerror', (e) => {
      R.consoleErrors = R.consoleErrors || [];
      R.consoleErrors.push(String(e));
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        R.consoleErrors = R.consoleErrors || [];
        R.consoleErrors.push(msg.text());
      }
    });

    await page.goto(URL, { waitUntil: 'networkidle0' });
    await sleep(800);

    const readStatus = () =>
      page.evaluate(() => document.querySelector('[data-testid="vault-grid-status"]')?.textContent ?? null);
    const readCanvasAttrs = () =>
      page.evaluate(() => {
        const c = document.querySelector('[data-testid="vault-grid-canvas"]');
        return c
          ? {
              role: c.getAttribute('role'),
              ariaLabel: c.getAttribute('aria-label'),
              tabIndex: c.tabIndex,
              activedescendant: c.getAttribute('aria-activedescendant'),
              rowcount: c.getAttribute('aria-rowcount'),
            }
          : null;
      });

    // ---- reach 'playing' via real mouse click on the commit CTA ----
    const cta = await page.$('[data-testid="vault-ctl-cta"]');
    if (cta) {
      await cta.click();
      await sleep(900);
    }
    R.desktop = {};
    R.desktop.canvasAttrsAfterCta = await readCanvasAttrs();
    log('[D] canvas attrs after CTA:', JSON.stringify(R.desktop.canvasAttrsAfterCta));

    // =================== FIX #1 RE-CONFIRM (grid keyboard) =================
    // (a) single tab-stop in / no trap
    await page.evaluate(() => document.body.focus());
    let tabsToGrid = 0;
    let landed = false;
    let prevTag = null;
    for (let i = 0; i < 40; i++) {
      const before = await page.evaluate(
        () => document.activeElement?.getAttribute('data-testid') || document.activeElement?.tagName,
      );
      await page.keyboard.press('Tab');
      tabsToGrid++;
      const info = await page.evaluate(() => ({
        testid: document.activeElement?.getAttribute('data-testid') || null,
      }));
      if (info.testid === 'vault-grid-canvas') {
        landed = true;
        prevTag = before;
        break;
      }
    }
    R.desktop.fix1_tabsToGrid = tabsToGrid;
    R.desktop.fix1_landedOnGrid = landed;
    R.desktop.fix1_elementBeforeGrid = prevTag;
    log('[D] FIX1 tabs-to-grid:', tabsToGrid, 'landed:', landed, 'prev:', prevTag);

    await page.keyboard.press('Tab'); // one more MUST leave
    const afterLeave = await page.evaluate(() => document.activeElement?.getAttribute('data-testid') || null);
    R.desktop.fix1_noTrap = afterLeave !== 'vault-grid-canvas';
    R.desktop.fix1_elementAfterLeave = afterLeave;
    log('[D] FIX1 element after leaving grid (no-trap check):', afterLeave);

    await page.keyboard.down('Shift');
    await page.keyboard.press('Tab');
    await page.keyboard.up('Shift');
    const backOnGrid = await page.evaluate(
      () => document.activeElement?.getAttribute('data-testid') === 'vault-grid-canvas',
    );
    R.desktop.fix1_shiftTabReturns = backOnGrid;

    // (b) arrow keys move cursor
    const descDefault = await page.evaluate(() =>
      document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('aria-activedescendant'),
    );
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    await sleep(150);
    const descAfterArrows = await page.evaluate(() =>
      document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('aria-activedescendant'),
    );
    const labelAfterArrows = await page.evaluate(
      (id) => document.getElementById(id)?.getAttribute('aria-label'),
      descAfterArrows,
    );
    R.desktop.fix1_cursorDefault = descDefault;
    R.desktop.fix1_cursorAfterArrows = descAfterArrows;
    R.desktop.fix1_labelAfterArrows = labelAfterArrows;
    R.desktop.fix1_arrowsMovedCursor = descDefault !== descAfterArrows;
    log('[D] FIX1 cursor default->after RIGHT,RIGHT,DOWN:', descDefault, '->', descAfterArrows, labelAfterArrows);

    // clamp check (top-left corner, no throw/wrap)
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowLeft');
    }
    const descClampTL = await page.evaluate(() =>
      document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('aria-activedescendant'),
    );
    R.desktop.fix1_clampTopLeft = descClampTL; // expect vault-tile-0

    // (c) Enter reveal via activateTile — move to a fresh tile, Enter, confirm state changed
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    const beforeEnterStatus = await readStatus();
    const cursorBeforeEnter = await page.evaluate(() =>
      document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('aria-activedescendant'),
    );
    const labelBeforeEnter = await page.evaluate(
      (id) => document.getElementById(id)?.getAttribute('aria-label'),
      cursorBeforeEnter,
    );
    await page.keyboard.press('Enter');
    await sleep(400);
    const afterEnterStatus = await readStatus();
    const labelAfterEnter = await page.evaluate(
      (id) => document.getElementById(id)?.getAttribute('aria-label'),
      cursorBeforeEnter,
    );
    R.desktop.fix1_statusBeforeEnter = beforeEnterStatus;
    R.desktop.fix1_statusAfterEnter = afterEnterStatus;
    R.desktop.fix1_labelBeforeEnter = labelBeforeEnter;
    R.desktop.fix1_labelAfterEnter = labelAfterEnter;
    R.desktop.fix1_enterRevealFired = beforeEnterStatus !== afterEnterStatus || labelBeforeEnter !== labelAfterEnter;
    log('[D] FIX1 ENTER reveal -> status', beforeEnterStatus, '->', afterEnterStatus, '| label', labelBeforeEnter, '->', labelAfterEnter);

    // (c2) Space reveal, if round still playing
    let phaseNow = await readCanvasAttrs();
    if (phaseNow?.role === 'grid') {
      await page.keyboard.press('ArrowRight');
      const cursorBeforeSpace = await page.evaluate(() =>
        document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('aria-activedescendant'),
      );
      const labelBeforeSpace = await page.evaluate(
        (id) => document.getElementById(id)?.getAttribute('aria-label'),
        cursorBeforeSpace,
      );
      const statusBeforeSpace = await readStatus();
      await page.keyboard.press(' ');
      await sleep(400);
      const labelAfterSpace = await page.evaluate(
        (id) => document.getElementById(id)?.getAttribute('aria-label'),
        cursorBeforeSpace,
      );
      const statusAfterSpace = await readStatus();
      R.desktop.fix1_spaceReveal = {
        labelBeforeSpace,
        labelAfterSpace,
        statusBeforeSpace,
        statusAfterSpace,
        fired: labelBeforeSpace !== labelAfterSpace || statusBeforeSpace !== statusAfterSpace,
      };
      log('[D] FIX1 SPACE reveal fired:', R.desktop.fix1_spaceReveal.fired);
    } else {
      R.desktop.fix1_spaceSkippedReason = 'round ended before Space test (mine-hit/settled)';
      log('[D] Space test skipped:', R.desktop.fix1_spaceSkippedReason);
    }

    // (e) POINTER regression — reload for a clean board, click CTA, then a
    // real mouse click on a fresh tile must still reveal (same activateTile).
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await sleep(700);
    const cta2 = await page.$('[data-testid="vault-ctl-cta"]');
    if (cta2) {
      await cta2.click();
      await sleep(900);
    }
    const canvasBox = await page.evaluate(() => {
      const c = document.querySelector('[data-testid="vault-grid-canvas"]');
      const r = c.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    const statusBeforeClick = await readStatus();
    // click near top-left region where tile 0 typically sits (grid centered)
    await page.mouse.click(canvasBox.x + canvasBox.w * 0.5, canvasBox.y + canvasBox.h * 0.5);
    await sleep(500);
    const statusAfterClick = await readStatus();
    R.desktop.fix1_pointerRegression = {
      statusBeforeClick,
      statusAfterClick,
      fired: statusBeforeClick !== statusAfterClick,
    };
    log('[D] FIX1 POINTER click regression -> status', statusBeforeClick, '->', statusAfterClick);

    // (d) FOCUS RING VISIBILITY — screenshot-pair pixel-diff (canvas-drawn, not CSS)
    await page.evaluate(() => document.body.focus());
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const isGrid = await page.evaluate(
        () => document.activeElement?.getAttribute('data-testid') === 'vault-grid-canvas',
      );
      if (isGrid) break;
    }
    await sleep(200);
    const gridBox = await page.evaluate(() => {
      const c = document.querySelector('[data-testid="vault-grid-canvas"]');
      const r = c.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
    // Re-derive tile-0 top-left corner from live measured grid box using the
    // SAME formula VaultGridCanvas.tsx's computeGridLayout uses when
    // minimalBands/domHudActive is true (desktop isWide chassis).
    const layout = await page.evaluate((box) => {
      const W = box.width, H = box.height;
      const minimalBands = true;
      const topReserved = H * 0.035;
      const bottomReserved = H * 0.035;
      const sideFrac = 0.04;
      const safeW = W * (1 - sideFrac * 2);
      const safeH = (H - topReserved - bottomReserved) * 0.96;
      const available = Math.min(safeW, safeH);
      const FIXED_TILE = 96, FIXED_GAP = 16;
      const gridSize = 5;
      const fixedFull = FIXED_TILE * gridSize + FIXED_GAP * (gridSize - 1);
      let x, y, tile, full;
      if (fixedFull <= available + 0.5) {
        x = (W - fixedFull) / 2;
        const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2;
        y = bandCenterY - fixedFull / 2;
        tile = FIXED_TILE; full = fixedFull;
      } else {
        const gap = Math.max(6, available * 0.026);
        tile = (available - gap * (gridSize - 1)) / gridSize;
        full = tile * gridSize + gap * (gridSize - 1);
        x = (W - full) / 2;
        const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2;
        y = bandCenterY - full / 2;
      }
      return { x, y, tile, full };
    }, gridBox);
    R.desktop.focusRingLayout = layout;

    await page.evaluate(() => document.querySelector('[data-testid="vault-grid-canvas"]').focus());
    await sleep(250);
    const focusedScan = await page.evaluate((L) => {
      const c = document.querySelector('[data-testid="vault-grid-canvas"]');
      const ctx = c.getContext('2d');
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const yCss = L.y + L.tile * 0.035;
      const yPx = Math.round(yCss * dpr);
      const xStartPx = Math.round((L.x - 4) * dpr);
      const xEndPx = Math.round((L.x + L.tile * 0.5) * dpr);
      const w = Math.max(1, xEndPx - xStartPx);
      const data = ctx.getImageData(xStartPx, yPx, w, 1).data;
      const pixels = [];
      for (let i = 0; i < data.length; i += 4) pixels.push([data[i], data[i + 1], data[i + 2]]);
      return pixels;
    }, layout);
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await sleep(250);
    const blurredScan = await page.evaluate((L) => {
      const c = document.querySelector('[data-testid="vault-grid-canvas"]');
      const ctx = c.getContext('2d');
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const yCss = L.y + L.tile * 0.035;
      const yPx = Math.round(yCss * dpr);
      const xStartPx = Math.round((L.x - 4) * dpr);
      const xEndPx = Math.round((L.x + L.tile * 0.5) * dpr);
      const w = Math.max(1, xEndPx - xStartPx);
      const data = ctx.getImageData(xStartPx, yPx, w, 1).data;
      const pixels = [];
      for (let i = 0; i < data.length; i += 4) pixels.push([data[i], data[i + 1], data[i + 2]]);
      return pixels;
    }, layout);
    let maxDiffIdx = -1, maxDiff = -1;
    focusedScan.forEach((p, i) => {
      const b = blurredScan[i];
      const d = Math.abs(p[0] - b[0]) + Math.abs(p[1] - b[1]) + Math.abs(p[2] - b[2]);
      if (d > maxDiff) { maxDiff = d; maxDiffIdx = i; }
    });
    const ringPx = focusedScan[maxDiffIdx];
    const underlyingPx = blurredScan[maxDiffIdx];
    const ringVsUnderlying = contrast(ringPx, underlyingPx);
    // also grab an interior (tile face) pixel from the SAME focused scanline for a
    // ring-vs-tile-content contrast pair.
    const interiorPx = focusedScan[Math.min(focusedScan.length - 1, maxDiffIdx + Math.round(layout.tile * 0.3))];
    const ringVsInterior = contrast(ringPx, interiorPx);
    R.desktop.focusRing = { ringPx, underlyingPx, interiorPx, ringVsUnderlying, ringVsInterior };
    log('[D] FIX1 focus-ring pixel-diff: ring', ringPx, 'vs unfocused-same-pos', underlyingPx, '-> contrast', ringVsUnderlying.toFixed(2), '| vs tile-interior', ringVsInterior.toFixed(2));

    await page.evaluate(() => document.querySelector('[data-testid="vault-grid-canvas"]').focus());
    await sleep(150);
    await page.screenshot({
      path: `${OUT}/desktop-focusring-crop.png`,
      clip: { x: Math.max(0, gridBox.x + layout.x - 12), y: Math.max(0, gridBox.y + layout.y - 12), width: layout.tile + 24, height: layout.tile + 24 },
    });

    // ================= FIX #6 — desktop control-column focus rings ==========
    // (bet-entry phase controls: vault-ctl-wager stepper, mode chips, options
    // pill, commit CTA — confirm each is >=24x24, and each gets a VISIBLE
    // (non-cyan-on-cyan) focus indicator on Tab.)
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await sleep(700);
    const focusables = await page.evaluate(() => {
      const wager = document.querySelector('[data-testid="vault-ctl-wager"]');
      const cta = document.querySelector('[data-testid="vault-ctl-cta"]');
      const scope = document.body;
      const sel = 'button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled])';
      const nodes = Array.from(scope.querySelectorAll(sel));
      return nodes
        .filter((n) => n.offsetParent !== null)
        .map((n, i) => ({
          i,
          text: (n.textContent || '').trim().slice(0, 30),
          ariaLabel: n.getAttribute('aria-label'),
          rect: n.getBoundingClientRect().toJSON ? null : (() => {
            const r = n.getBoundingClientRect();
            return { w: r.width, h: r.height, x: r.x, y: r.y };
          })(),
        }));
    });
    R.desktop.betEntryFocusables = focusables;
    R.desktop.betEntrySmallHitTargets = focusables.filter((f) => f.rect && (f.rect.w < 24 || f.rect.h < 24));
    log('[D] FIX6 bet-entry focusable count:', focusables.length, 'small(<24x24):', R.desktop.betEntrySmallHitTargets.length);

    // Tab through first 10 focusables, screenshot focused vs a computed-style
    // read of outline, to spot any cyan-on-cyan invisible ring.
    await page.evaluate(() => document.body.focus());
    const focusRingReport = [];
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          text: (el.textContent || '').trim().slice(0, 24),
          outlineWidth: cs.outlineWidth,
          outlineColor: cs.outlineColor,
          outlineStyle: cs.outlineStyle,
          boxShadow: cs.boxShadow,
          rectWH: [Math.round(r.width), Math.round(r.height)],
        };
      });
      if (info) focusRingReport.push(info);
    }
    R.desktop.focusRingReport = focusRingReport;
    log('[D] FIX6 focus-ring computed-style trace (10 tab stops):', JSON.stringify(focusRingReport));
    await page.screenshot({ path: `${OUT}/desktop-betentry-tabtrace-lastfocus.png` });

    // =================== FIX #7 — Glass Box receipt SR structure ============
    // Reach settled (force a fresh round + reveal a tile, retry until settled
    // one way or the other), then expand the receipt (isWide desktop uses the
    // right-gutter Card C toggle) and inspect DOM structure.
    let settledOK = false;
    for (let attempt = 0; attempt < 30 && !settledOK; attempt++) {
      await page.goto(URL, { waitUntil: 'networkidle0' });
      await sleep(600);
      const c = await page.$('[data-testid="vault-ctl-cta"]');
      if (c) { await c.click(); await sleep(800); }
      // click several tiles to try to reach settle quickly (rug or enough safes)
      for (let t = 0; t < 6; t++) {
        const stillPlaying = await page.evaluate(
          () => document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('role') === 'grid',
        );
        if (!stillPlaying) break;
        const box = await page.evaluate(() => {
          const cv = document.querySelector('[data-testid="vault-grid-canvas"]');
          const r = cv.getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height };
        });
        // click a grid of positions to hit different tiles each time
        const fx = 0.2 + (t % 3) * 0.25;
        const fy = 0.2 + Math.floor(t / 3) * 0.25;
        await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy);
        await sleep(350);
      }
      // if still playing, force cash-out via CTA to settle as a WIN
      const stillPlaying2 = await page.evaluate(
        () => document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('role') === 'grid',
      );
      if (stillPlaying2) {
        const cashout = await page.$('[data-testid="vault-ctl-cta"]');
        if (cashout) { await cashout.click(); await sleep(600); }
      }
      // poll for exact settled string
      for (let p = 0; p < 20; p++) {
        const txt = await page.evaluate(() => document.body.innerText);
        if (/SETTLED\s*[·.]\s*(WIN|LOSS)/i.test(txt)) { settledOK = true; break; }
        await sleep(200);
      }
    }
    R.desktop.reachedSettled = settledOK;
    log('[D] FIX7 reached settled:', settledOK);

    if (settledOK) {
      // expand receipt via right-gutter Card C toggle text "view receipt" or
      // the mobile-style inline toggle (desktop right gutter uses its own).
      const expanded = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find((b) => /view receipt/i.test(b.textContent || ''));
        if (btn) { btn.click(); return true; }
        return false;
      });
      await sleep(400);
      R.desktop.receiptToggleClicked = expanded;
      const receiptInfo = await page.evaluate(() => {
        const dl = document.querySelector('dl');
        if (!dl) return { found: false };
        const dts = Array.from(dl.querySelectorAll('dt')).map((d) => d.textContent);
        const dds = Array.from(dl.querySelectorAll('dd')).map((d) => d.textContent);
        return {
          found: true,
          rowCount: dts.length,
          labels: dts,
          hasMixerRow: dts.some((t) => /mixer/i.test(t || '')),
          anyOrphanDescribedby: Array.from(document.querySelectorAll('[aria-describedby]')).map((n) => ({
            tag: n.tagName,
            describedby: n.getAttribute('aria-describedby'),
            targetExists: !!document.getElementById(n.getAttribute('aria-describedby')),
          })),
        };
      });
      R.desktop.receiptInfo = receiptInfo;
      log('[D] FIX7 receipt dl found:', receiptInfo.found, 'rows:', receiptInfo.rowCount, 'hasMixerRow(should be false):', receiptInfo.hasMixerRow);
      log('[D] FIX7 labels:', JSON.stringify(receiptInfo.labels));
      await page.screenshot({ path: `${OUT}/desktop-settled-receipt.png`, fullPage: false });
    }

    // =================== FIX #5 — rhythm badge aria-live + contrast =========
    // Force a fast chain of reveals on SHITCOIN (low mine density relative to
    // tiles, easier to build a chain) to try to surface the badge; measure
    // aria-live presence + live composited contrast if/when it appears.
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await sleep(700);
    // switch to shitcoin mode if a mode selector is present pre-commit
    const modeSwitched = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[data-testid="vault-board-worldpicker"] *'));
      const target = cards.find((n) => /shitcoin/i.test(n.textContent || '') && n.tagName === 'BUTTON');
      if (target) { target.click(); return true; }
      // fallback: any element with role button containing text
      const btns = Array.from(document.querySelectorAll('button'));
      const b2 = btns.find((n) => /shitcoin/i.test(n.textContent || ''));
      if (b2) { b2.click(); return true; }
      return false;
    });
    R.desktop.modeSwitchedToShitcoin = modeSwitched;
    await sleep(300);
    const cta3 = await page.$('[data-testid="vault-ctl-cta"]');
    if (cta3) { await cta3.click(); await sleep(800); }

    let badgeSeen = null;
    for (let t = 0; t < 20; t++) {
      const stillPlaying = await page.evaluate(
        () => document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('role') === 'grid',
      );
      if (!stillPlaying) break;
      const box = await page.evaluate(() => {
        const cv = document.querySelector('[data-testid="vault-grid-canvas"]');
        const r = cv.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      });
      const cols = 7, rows = 7;
      const col = t % cols, row = Math.floor(t / cols) % rows;
      await page.mouse.click(box.x + box.w * ((col + 0.5) / cols), box.y + box.h * ((row + 0.5) / rows));
      await sleep(250);
      const badge = await page.evaluate(() => {
        const b = document.querySelector('[data-testid="vault-rhythm-badge"]');
        if (!b) return null;
        return {
          tier: b.getAttribute('data-tier'),
          ariaLive: b.getAttribute('aria-live'),
          text: b.textContent,
          rect: (() => { const r = b.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })(),
        };
      });
      if (badge) { badgeSeen = badge; break; }
    }
    R.desktop.rhythmBadge = badgeSeen;
    log('[D] FIX5 rhythm badge seen:', JSON.stringify(badgeSeen));

    if (badgeSeen) {
      // live contrast: label text color vs its immediate background pixel
      const badgeContrast = await page.evaluate((rect) => {
        const el = document.querySelector('[data-testid="vault-rhythm-badge"]');
        const label = el.querySelector('span:last-child');
        const cs = getComputedStyle(label);
        return { color: cs.color, bg: getComputedStyle(el).backgroundColor };
      }, badgeSeen.rect);
      R.desktop.rhythmBadgeComputedColors = badgeContrast;
      // real composited pixel sample: screenshot the badge region + sample
      const shot = await page.screenshot({
        clip: { x: Math.max(0, badgeSeen.rect.x - 4), y: Math.max(0, badgeSeen.rect.y - 4), width: badgeSeen.rect.w + 8, height: badgeSeen.rect.h + 8 },
      });
      fs.writeFileSync(`${OUT}/desktop-rhythmbadge-crop.png`, shot);
      log('[D] FIX5 rhythm badge computed colors:', JSON.stringify(badgeContrast));
    } else {
      R.desktop.rhythmBadgeSkippedReason = 'badge never surfaced in 20 reveal attempts (round likely settled early)';
    }

    // =================== REDUCED MOTION — full sweep ========================
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await sleep(700);
    // liveDot must have animation:none under reduce
    const liveDotAnim = await page.evaluate(() => {
      const dots = Array.from(document.querySelectorAll('span'));
      // find the LIVE badge span structure
      const liveBadge = dots.find((d) => d.textContent?.trim() === 'LIVE');
      return liveBadge ? getComputedStyle(liveBadge.previousElementSibling || liveBadge).animationName : 'not-found';
    });
    R.desktop.reducedMotion_liveDotAnimationName = liveDotAnim;

    // RhythmBadge under reduce — synthetic node using the real class name is not
    // applicable (inline style, not a CSS class) so probe live: reach playing on
    // shitcoin, force the chain, and read getComputedStyle(animationName) at
    // the moment it mounts.
    const cta4 = await page.$('[data-testid="vault-ctl-cta"]');
    if (cta4) { await cta4.click(); await sleep(800); }
    let badgeAnimUnderReduce = null;
    for (let t = 0; t < 20; t++) {
      const stillPlaying = await page.evaluate(
        () => document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('role') === 'grid',
      );
      if (!stillPlaying) break;
      const box = await page.evaluate(() => {
        const cv = document.querySelector('[data-testid="vault-grid-canvas"]');
        const r = cv.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      });
      const cols = 5, rows = 5;
      const col = t % cols, row = Math.floor(t / cols) % rows;
      await page.mouse.click(box.x + box.w * ((col + 0.5) / cols), box.y + box.h * ((row + 0.5) / rows));
      await sleep(200);
      const anim = await page.evaluate(() => {
        const b = document.querySelector('[data-testid="vault-rhythm-badge"]');
        if (!b) return null;
        return getComputedStyle(b).animationName;
      });
      if (anim !== null) { badgeAnimUnderReduce = anim; break; }
    }
    R.desktop.reducedMotion_rhythmBadgeAnimationName = badgeAnimUnderReduce;
    log('[D] Reduced-motion: liveDot animationName =', liveDotAnim, '| rhythmBadge animationName under reduce =', badgeAnimUnderReduce);

    // hero overlay (settle celebration) under reduce
    // force settle quickly
    let settledUnderReduce = false;
    for (let t = 0; t < 8; t++) {
      const stillPlaying = await page.evaluate(
        () => document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('role') === 'grid',
      );
      if (!stillPlaying) break;
      const box = await page.evaluate(() => {
        const cv = document.querySelector('[data-testid="vault-grid-canvas"]');
        const r = cv.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      });
      await page.mouse.click(box.x + box.w * 0.5, box.y + box.h * 0.5);
      await sleep(250);
    }
    const cashout2 = await page.$('[data-testid="vault-ctl-cta"]');
    const stillPlaying3 = await page.evaluate(
      () => document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('role') === 'grid',
    );
    if (stillPlaying3 && cashout2) { await cashout2.click(); await sleep(300); }
    for (let p = 0; p < 15; p++) {
      const txt = await page.evaluate(() => document.body.innerText);
      if (/SETTLED\s*[·.]\s*(WIN|LOSS)/i.test(txt)) { settledUnderReduce = true; break; }
      await sleep(200);
    }
    R.desktop.reducedMotion_reachedSettled = settledUnderReduce;
    if (settledUnderReduce) {
      const heroAnim = await page.evaluate(() => {
        const nodes = Array.from(document.querySelectorAll('*'));
        const named = nodes
          .map((n) => ({ tag: n.tagName, cls: n.className, anim: getComputedStyle(n).animationName }))
          .filter((n) => n.anim && n.anim !== 'none');
        return named;
      });
      R.desktop.reducedMotion_animatedElementsAtSettle = heroAnim;
      log('[D] Reduced-motion: animated elements at settle (should be empty or near-empty):', JSON.stringify(heroAnim));
    }
    await page.screenshot({ path: `${OUT}/desktop-reducedmotion-settled.png` });

    // reset media emulation
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);

    await page.close();

    // =========================================================================
    // SECTION B — MOBILE (Pixel 7 412x915, iPhone 14 Pro 393x852)
    // =========================================================================
    const devices = [
      { name: 'Pixel7', width: 412, height: 915 },
      { name: 'iPhone14Pro', width: 393, height: 852 },
    ];
    R.mobile = {};

    for (const dev of devices) {
      R.mobile[dev.name] = {};
      const mpage = await browser.newPage();
      await mpage.setViewport({ width: dev.width, height: dev.height, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      await mpage.goto(URL, { waitUntil: 'networkidle0' });
      await sleep(700);

      // ---- FIX #6: BetConsole touch targets + reachability on bet-entry ----
      const console_ = await mpage.evaluate(() => {
        const bc = document.querySelector('[data-testid="bet-console"]');
        if (!bc) return { found: false };
        const btns = Array.from(bc.querySelectorAll('button')).filter((b) => b.offsetParent !== null);
        return {
          found: true,
          buttons: btns.map((b) => {
            const r = b.getBoundingClientRect();
            return { text: (b.textContent || '').trim().slice(0, 20), ariaLabel: b.getAttribute('aria-label'), w: r.width, h: r.height };
          }),
        };
      });
      R.mobile[dev.name].betConsole = console_;
      const smallTargets = (console_.buttons || []).filter((b) => b.w < 24 || b.h < 24);
      R.mobile[dev.name].betConsoleSmallTargets = smallTargets;
      log(`[M-${dev.name}] FIX6 bet-console buttons:`, JSON.stringify(console_.buttons));

      // Tab-focus one of the stepper buttons and confirm a visible outline (computed-style)
      await mpage.evaluate(() => document.body.focus());
      const tabTrace = [];
      for (let i = 0; i < 15; i++) {
        await mpage.keyboard.press('Tab');
        const info = await mpage.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const cs = getComputedStyle(el);
          return { tag: el.tagName, text: (el.textContent || '').trim().slice(0, 20), outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle };
        });
        if (info) tabTrace.push(info);
      }
      R.mobile[dev.name].tabTraceBetEntry = tabTrace;

      // ---- reach playing, then settled (mine-hit or cashout) ----
      const cta = await mpage.$('[data-testid="vault-ctl-cta"]');
      if (cta) { await cta.click(); await sleep(900); }

      // sample HUD band contrast in 'playing' (bluechips, default world)
      const hudPlaying = await mpage.evaluate(() => {
        const band = document.querySelector('[data-testid="vault-grid-hud-inner"]');
        if (!band) return null;
        const r = band.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      });
      R.mobile[dev.name].hudBandRectPlaying_bluechips = hudPlaying;
      if (hudPlaying) {
        // sample text pixel (kicker "PUMP", small muted caption -- worst-case)
        // via a screenshot + pixel read (real composited render, not computed style)
        const shot = await mpage.screenshot({ clip: { x: hudPlaying.x, y: hudPlaying.y, width: hudPlaying.w, height: hudPlaying.h } });
        fs.writeFileSync(`${OUT}/mobile-${dev.name}-hud-playing-bluechips.png`, shot);
      }

      // switch to shitcoin (harder to read HUD, per brief) — go back to bet-entry
      await mpage.goto(URL, { waitUntil: 'networkidle0' });
      await sleep(700);
      const switched = await mpage.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const b = btns.find((n) => /shitcoin/i.test(n.textContent || ''));
        if (b) { b.click(); return true; }
        return false;
      });
      R.mobile[dev.name].switchedToShitcoin = switched;
      await sleep(300);
      const ctaSC = await mpage.$('[data-testid="vault-ctl-cta"]');
      if (ctaSC) { await ctaSC.click(); await sleep(900); }
      const hudPlayingSC = await mpage.evaluate(() => {
        const band = document.querySelector('[data-testid="vault-grid-hud-inner"]');
        if (!band) return null;
        const r = band.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      });
      R.mobile[dev.name].hudBandRectPlaying_shitcoin = hudPlayingSC;
      if (hudPlayingSC) {
        const shot = await mpage.screenshot({ clip: { x: hudPlayingSC.x, y: hudPlayingSC.y, width: hudPlayingSC.w, height: hudPlayingSC.h } });
        fs.writeFileSync(`${OUT}/mobile-${dev.name}-hud-playing-shitcoin.png`, shot);
      }

      // ---- FIX #3: drive to settled, measure fold + tab order to BET AGAIN ----
      let settledMobile = false;
      for (let t = 0; t < 10; t++) {
        const stillPlaying = await mpage.evaluate(
          () => document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('role') === 'grid',
        );
        if (!stillPlaying) break;
        const box = await mpage.evaluate(() => {
          const cv = document.querySelector('[data-testid="vault-grid-canvas"]');
          const r = cv.getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height };
        });
        const cols = 7, rows = 7;
        const col = t % cols, row = Math.floor(t / cols) % rows;
        await mpage.touchscreen.tap(box.x + box.w * ((col + 0.5) / cols), box.y + box.h * ((row + 0.5) / rows));
        await sleep(300);
      }
      const stillPlayingAfterTaps = await mpage.evaluate(
        () => document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('role') === 'grid',
      );
      if (stillPlayingAfterTaps) {
        const cashoutBtn = await mpage.$('[data-testid="vault-ctl-cta"]');
        if (cashoutBtn) {
          await cashoutBtn.evaluate((el) => el.scrollIntoView({ block: 'center' }));
          const box = await cashoutBtn.boundingBox();
          if (box) await mpage.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
          await sleep(400);
        }
      }
      for (let p = 0; p < 20; p++) {
        const txt = await mpage.evaluate(() => document.body.innerText);
        if (/SETTLED\s*[·.]\s*(WIN|LOSS)/i.test(txt)) { settledMobile = true; break; }
        await sleep(250);
      }
      R.mobile[dev.name].reachedSettled = settledMobile;
      log(`[M-${dev.name}] reached settled:`, settledMobile);

      if (settledMobile) {
        await mpage.evaluate(() => window.scrollTo(0, 0));
        await sleep(150);
        // HUD settled banner contrast (shitcoin world, worst case)
        const hudSettled = await mpage.evaluate(() => {
          const band = document.querySelector('[data-testid="vault-settled-banner"]');
          if (!band) return null;
          const r = band.getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height };
        });
        R.mobile[dev.name].hudBandRectSettled_shitcoin = hudSettled;
        if (hudSettled) {
          const shot = await mpage.screenshot({ clip: { x: hudSettled.x, y: hudSettled.y, width: hudSettled.w, height: hudSettled.h } });
          fs.writeFileSync(`${OUT}/mobile-${dev.name}-hud-settled-shitcoin.png`, shot);
        }

        // Fold measurement: BET AGAIN rect.bottom vs viewport height (raw, chrome-less)
        const betAgainRect = await mpage.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const b = btns.find((n) => /^bet again/i.test((n.textContent || '').trim()));
          if (!b) return null;
          const r = b.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, text: b.textContent };
        });
        R.mobile[dev.name].betAgainRectRaw = betAgainRect;
        R.mobile[dev.name].viewportHeight = dev.height;
        if (betAgainRect) {
          R.mobile[dev.name].betAgainMarginRaw = dev.height - betAgainRect.bottom;
          log(`[M-${dev.name}] FIX3 BET AGAIN raw margin above fold:`, R.mobile[dev.name].betAgainMarginRaw);
        }

        // Text truncation check on the shrunk settled board area — screenshot full settled panel
        const fullShot = await mpage.screenshot({ fullPage: false });
        fs.writeFileSync(`${OUT}/mobile-${dev.name}-settled-full.png`, fullShot);

        // Keyboard tab-order still reaches BET AGAIN after the board shrink —
        // drive real Tab presses from body and confirm we land on it within a
        // bounded number of presses (external-keyboard-on-mobile scenario).
        await mpage.evaluate(() => document.body.focus());
        let reachedBetAgain = false;
        let presses = 0;
        for (let i = 0; i < 40; i++) {
          await mpage.keyboard.press('Tab');
          presses++;
          const isBetAgain = await mpage.evaluate(
            () => /^bet again/i.test((document.activeElement?.textContent || '').trim()),
          );
          if (isBetAgain) { reachedBetAgain = true; break; }
        }
        R.mobile[dev.name].fix3_tabReachesBetAgain = reachedBetAgain;
        R.mobile[dev.name].fix3_tabPressesToReachBetAgain = presses;
        log(`[M-${dev.name}] FIX3 keyboard reaches BET AGAIN:`, reachedBetAgain, 'in', presses, 'presses');

        // Activate it via keyboard (Enter) to confirm it's actually operable,
        // not just focusable.
        if (reachedBetAgain) {
          const phaseBefore = await mpage.evaluate(() => document.body.innerText.match(/SETTLED[^\n]*/)?.[0] || null);
          await mpage.keyboard.press('Enter');
          await sleep(500);
          const phaseAfter = await mpage.evaluate(() =>
            document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('role'),
          );
          R.mobile[dev.name].fix3_betAgainKeyboardActivates = phaseAfter === 'grid';
          log(`[M-${dev.name}] FIX3 BET AGAIN keyboard-Enter activated (back to playing grid):`, R.mobile[dev.name].fix3_betAgainKeyboardActivates);
        }

        // ---- FIX #7 mobile: expand receipt, check semantic structure ----
        const toggled = await mpage.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const b = btns.find((n) => /view receipt/i.test(n.textContent || ''));
          if (b) { b.click(); return true; }
          return false;
        });
        await sleep(400);
        if (toggled) {
          const receiptInfoM = await mpage.evaluate(() => {
            const dl = document.querySelector('dl');
            if (!dl) return { found: false };
            const dts = Array.from(dl.querySelectorAll('dt')).map((d) => d.textContent);
            return { found: true, rowCount: dts.length, labels: dts, hasMixerRow: dts.some((t) => /mixer/i.test(t || '')) };
          });
          R.mobile[dev.name].receiptInfo = receiptInfoM;
          log(`[M-${dev.name}] FIX7 mobile receipt rows:`, receiptInfoM.rowCount, 'hasMixerRow:', receiptInfoM.hasMixerRow);
        }
      }

      await mpage.close();
    }

    fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(R, null, 2));
    fs.writeFileSync(`${OUT}/devlog.txt`, devLog);
    log('\n=== FULL RESULTS WRITTEN ===', `${OUT}/results.json`);
  } finally {
    if (browser) await browser.close().catch(() => {});
    log('Killing dev server tree...');
    try {
      // Windows: kill the whole process tree rooted at the shell PID.
      const { execSync } = await import('child_process');
      execSync(`taskkill /pid ${devProc.pid} /T /F`, { stdio: 'ignore' });
    } catch (e) {
      log('taskkill warning (may already be dead):', e.message);
    }
  }
}

main().catch((e) => {
  console.error('DRIVER FATAL ERROR', e);
  process.exit(1);
});
