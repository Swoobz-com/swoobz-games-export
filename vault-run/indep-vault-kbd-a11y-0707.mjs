// INDEPENDENT accessibility verifier for VaultGridCanvas keyboard fix.
// Does NOT reuse the maker's driver logic — separate script, separate checks,
// including full-page tab-order regression, held-Enter repeat probe, pointer
// regression, and a real screenshot-pair pixel-contrast measurement of the
// focus ring (not a getComputedStyle trust).
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad/a11y0707';
const URL = 'http://localhost:5311/';

const log = (...a) => console.log(...a);
const R = {};

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

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));

  // ---------- get to 'playing' phase via a REAL mouse click ----------
  const cta = await page.$('[data-testid="vault-ctl-cta"]');
  if (!cta) {
    log('FATAL: no vault-ctl-cta found on load');
  } else {
    await cta.click();
    await new Promise((r) => setTimeout(r, 900));
  }

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
            colcount: c.getAttribute('aria-colcount'),
          }
        : null;
    });
  R.canvasAttrsAfterCta = await readCanvasAttrs();
  log('canvas attrs after CTA click:', JSON.stringify(R.canvasAttrsAfterCta));

  const readStatus = () =>
    page.evaluate(() => document.querySelector('[data-testid="vault-grid-status"]')?.textContent ?? null);
  R.statusAfterCta = await readStatus();
  log('status after CTA:', R.statusAfterCta);

  // ---------- GATE 2.1.2 / single-tab-stop: enumerate ALL focusable elements
  // on the page in DOM tab-order, find where the grid sits relative to
  // neighbors, confirm no trap (before/after both reachable). ----------
  const focusablesInfo = await page.evaluate(() => {
    const sel =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const nodes = Array.from(document.querySelectorAll(sel));
    return nodes.map((n, i) => ({
      i,
      tag: n.tagName,
      testid: n.getAttribute('data-testid'),
      role: n.getAttribute('role'),
      tabindex: n.getAttribute('tabindex'),
    }));
  });
  R.focusablesInfo = focusablesInfo;
  const gridPos = focusablesInfo.findIndex((f) => f.testid === 'vault-grid-canvas');
  R.gridPositionInFocusOrder = gridPos;
  R.focusableCountInsideCanvasSubtree = await page.evaluate(() => {
    const c = document.querySelector('[data-testid="vault-grid-canvas"]');
    if (!c) return null;
    // children of a canvas ARE real DOM nodes (fallback content) -- confirm
    // none of them are independently focusable (no tabindex/native-focusable
    // tags), which is what makes the canvas itself the ONLY tab stop.
    const inside = c.querySelectorAll('a[href], button, input, select, textarea, [tabindex]');
    return inside.length;
  });
  log('Total page-level focusable elements:', focusablesInfo.length, ' grid at index:', gridPos);
  log('Focusable elements nested inside canvas fallback content (should be 0):', R.focusableCountInsideCanvasSubtree);
  log('Full focus order:', JSON.stringify(focusablesInfo.map((f) => f.testid || f.tag)));

  // Tab from body all the way to the grid, counting presses + confirming
  // exactly ONE tab press lands on it (not 25/49 individual tile stops).
  await page.evaluate(() => document.body.focus());
  let tabsToGrid = 0;
  let landedOnGrid = false;
  let prevWasGridMinus1 = null;
  for (let i = 0; i < 60; i++) {
    const beforeTag = await page.evaluate(() => document.activeElement?.getAttribute('data-testid') || document.activeElement?.tagName);
    await page.keyboard.press('Tab');
    tabsToGrid++;
    const info = await page.evaluate(() => {
      const a = document.activeElement;
      return { testid: a?.getAttribute('data-testid') || null, tag: a?.tagName || null };
    });
    if (info.testid === 'vault-grid-canvas') {
      landedOnGrid = true;
      prevWasGridMinus1 = beforeTag;
      break;
    }
  }
  R.tabsToGrid = tabsToGrid;
  R.landedOnGrid = landedOnGrid;
  R.elementImmediatelyBeforeGridInTabOrder = prevWasGridMinus1;
  log('Tab presses from body to grid:', tabsToGrid, 'landed:', landedOnGrid, 'prev el:', prevWasGridMinus1);

  // One more Tab MUST leave the grid (no trap) — record what it lands on.
  await page.keyboard.press('Tab');
  const afterLeaving = await page.evaluate(() => {
    const a = document.activeElement;
    return { testid: a?.getAttribute('data-testid') || null, tag: a?.tagName || null };
  });
  R.elementAfterLeavingGrid = afterLeaving;
  log('Element focused after Tab OUT of grid:', JSON.stringify(afterLeaving));
  const noTrap = afterLeaving.testid !== 'vault-grid-canvas';
  R.noKeyboardTrap = noTrap;

  // Shift+Tab back onto the grid, to confirm reverse direction also works.
  await page.keyboard.down('Shift');
  await page.keyboard.press('Tab');
  await page.keyboard.up('Shift');
  const backOnGrid = await page.evaluate(
    () => document.activeElement?.getAttribute('data-testid') === 'vault-grid-canvas',
  );
  R.shiftTabReturnsToGrid = backOnGrid;
  log('Shift+Tab returns focus to grid:', backOnGrid);

  // ---------- GATE 4.1.2 aria-activedescendant tracks cursor ----------
  const descAfterFocus = await page.evaluate(() =>
    document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('aria-activedescendant'),
  );
  R.activedescendantOnFocus = descAfterFocus;
  const cell0Label = await page.evaluate((id) => document.getElementById(id)?.getAttribute('aria-label'), descAfterFocus);
  R.cell0LabelOnFocus = cell0Label;
  log('activedescendant on (re)focus:', descAfterFocus, ' label:', cell0Label);

  await page.screenshot({ path: `${OUT}/01-focus-default-tile.png` });

  // Move cursor with arrows -> confirm activedescendant + label update.
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await new Promise((r) => setTimeout(r, 150));
  const descAfterArrows = await page.evaluate(() =>
    document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('aria-activedescendant'),
  );
  const labelAfterArrows = await page.evaluate(
    (id) => document.getElementById(id)?.getAttribute('aria-label'),
    descAfterArrows,
  );
  R.activedescendantAfterArrows = descAfterArrows;
  R.labelAfterArrows = labelAfterArrows;
  log('activedescendant after RIGHT,RIGHT,DOWN:', descAfterArrows, 'label:', labelAfterArrows);
  await page.screenshot({ path: `${OUT}/02-focus-after-arrows.png` });

  // ---------- GATE clamping (no wrap, no throw at edges) ----------
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowLeft');
  }
  const descAfterClampTL = await page.evaluate(() =>
    document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('aria-activedescendant'),
  );
  R.activedescendantAfterClampTopLeft = descAfterClampTL;
  log('activedescendant after clamp toward top-left corner (expect vault-tile-0):', descAfterClampTL);

  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
  }
  const descAfterClampBR = await page.evaluate(() =>
    document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('aria-activedescendant'),
  );
  R.activedescendantAfterClampBottomRight = descAfterClampBR;
  log('activedescendant after clamp toward bottom-right corner:', descAfterClampBR);

  const gridSize = await page.evaluate(() =>
    Number(document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('aria-rowcount')),
  );
  R.gridSize = gridSize;
  R.expectedBottomRightIdx = gridSize * gridSize - 1;

  // ---------- GATE 2.1.1: Enter reveal via SAME activateTile as pointer ----
  // Move to a known fresh tile (top-left corner tile idx 0, currently there
  // after the clamp-loop above's first pass) then bounce back to a clean
  // untouched tile for the Enter test: go to (row2,col2) => idx 2*gridSize+2.
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowLeft');
  } // back to tile 0
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  const descBeforeEnter = await page.evaluate(() =>
    document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('aria-activedescendant'),
  );
  const labelBeforeEnter = await page.evaluate(
    (id) => document.getElementById(id)?.getAttribute('aria-label'),
    descBeforeEnter,
  );
  R.cursorBeforeEnter = descBeforeEnter;
  R.labelBeforeEnter = labelBeforeEnter;
  const statusBeforeEnter = await readStatus();
  R.statusBeforeEnter = statusBeforeEnter;
  log('Before ENTER -> cursor:', descBeforeEnter, 'label:', labelBeforeEnter, 'status:', statusBeforeEnter);

  await page.keyboard.press('Enter');
  await new Promise((r) => setTimeout(r, 500));
  const labelAfterEnter = await page.evaluate(
    (id) => document.getElementById(id)?.getAttribute('aria-label'),
    descBeforeEnter,
  );
  const statusAfterEnter = await readStatus();
  const phaseAfterEnter = await readCanvasAttrs();
  R.labelAfterEnter = labelAfterEnter;
  R.statusAfterEnter = statusAfterEnter;
  R.canvasAttrsAfterEnter = phaseAfterEnter;
  log('After ENTER -> label:', labelAfterEnter, 'status:', statusAfterEnter);
  await page.screenshot({ path: `${OUT}/03-after-enter-reveal.png` });

  // ---------- RG-C5 GATE: held Enter must not machine-gun reveals ----------
  // Move to a fresh untouched tile, then hold Enter down for 1200ms (long
  // enough for native browser auto-repeat keydown events to fire many times
  // if the handler doesn't guard), release, and confirm only ONE state
  // change happened (the tile flips exactly once; the underlying provider's
  // revealTile() has its own `if already revealed return` guard, but we are
  // independently probing for any OTHER runaway effect e.g. multiplier
  // jumping several steps, or the round ending prematurely from multiple
  // phase-advancing calls).
  await page.keyboard.press('ArrowRight'); // move to a fresh tile
  const cursorBeforeHold = await page.evaluate(() =>
    document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('aria-activedescendant'),
  );
  const labelBeforeHold = await page.evaluate(
    (id) => document.getElementById(id)?.getAttribute('aria-label'),
    cursorBeforeHold,
  );
  R.cursorBeforeHold = cursorBeforeHold;
  R.labelBeforeHold = labelBeforeHold;
  const statusBeforeHold = await readStatus();
  R.statusBeforeHold = statusBeforeHold;
  log('Before HOLD-ENTER -> cursor:', cursorBeforeHold, 'label:', labelBeforeHold, 'status:', statusBeforeHold);

  await page.keyboard.down('Enter');
  await new Promise((r) => setTimeout(r, 1200)); // hold long enough for OS auto-repeat
  await page.keyboard.up('Enter');
  await new Promise((r) => setTimeout(r, 400));

  const labelAfterHold = await page.evaluate(
    (id) => document.getElementById(id)?.getAttribute('aria-label'),
    cursorBeforeHold,
  );
  const statusAfterHold = await readStatus();
  const phaseAfterHold = await readCanvasAttrs();
  R.labelAfterHold = labelAfterHold;
  R.statusAfterHold = statusAfterHold;
  R.canvasAttrsAfterHold = phaseAfterHold;
  log('After HOLD-ENTER(1200ms) -> label:', labelAfterHold, 'status:', statusAfterHold, 'phase-attrs:', JSON.stringify(phaseAfterHold));

  // ---------- Space also reveals (same handler) ----------
  if (phaseAfterHold?.ariaLabel && phaseAfterHold.ariaLabel.includes('grid') && phaseAfterHold.role === 'grid') {
    // still playing (not settled) -- try Space on a fresh tile.
    await page.keyboard.press('ArrowRight');
    const cursorBeforeSpace = await page.evaluate(() =>
      document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('aria-activedescendant'),
    );
    const labelBeforeSpace = await page.evaluate(
      (id) => document.getElementById(id)?.getAttribute('aria-label'),
      cursorBeforeSpace,
    );
    R.cursorBeforeSpace = cursorBeforeSpace;
    R.labelBeforeSpace = labelBeforeSpace;
    await page.keyboard.press(' ');
    await new Promise((r) => setTimeout(r, 500));
    const labelAfterSpace = await page.evaluate(
      (id) => document.getElementById(id)?.getAttribute('aria-label'),
      cursorBeforeSpace,
    );
    R.labelAfterSpace = labelAfterSpace;
    log('Space reveal -> before:', labelBeforeSpace, 'after:', labelAfterSpace);
  } else {
    R.spaceTestSkippedReason = 'round already ended (mine-hit/settled) before Space test could run';
    log('Space test skipped:', R.spaceTestSkippedReason, JSON.stringify(phaseAfterHold));
  }

  await page.screenshot({ path: `${OUT}/04-after-hold-and-space.png` });

  // ---------- GATE regression: pointer/tap reveal still works ----------
  // If the round is still playing, click a fresh tile directly with the
  // mouse (bypassing keyboard entirely) and confirm the SAME reveal path
  // fires (label flips / status updates).
  const stillPlayingForClick = await readCanvasAttrs();
  R.stillPlayingBeforeClickTest = stillPlayingForClick;
  if (stillPlayingForClick?.role === 'grid') {
    const box = await page.evaluate(() => {
      const c = document.querySelector('[data-testid="vault-grid-canvas"]');
      const r = c.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
    // Click roughly the center of the grid canvas -- should land on some
    // sealed tile (grid is centered in the canvas per computeGridLayout).
    const clickX = box.x + box.width / 2;
    const clickY = box.y + box.height / 2;
    // find which tile is currently under that pixel by reading revealed
    // status before/after
    const statusBeforeClick = await readStatus();
    await page.mouse.click(clickX, clickY);
    await new Promise((r) => setTimeout(r, 500));
    const statusAfterClick = await readStatus();
    R.statusBeforeClick = statusBeforeClick;
    R.statusAfterClick = statusAfterClick;
    log('Pointer-click regression -> status before:', statusBeforeClick, 'after:', statusAfterClick);
  } else {
    R.pointerRegressionSkippedReason = 'round already settled before pointer regression test';
    log('Pointer regression test skipped:', R.pointerRegressionSkippedReason);
  }

  // ---------- GATE 2.4.7: focus-ring contrast via real screenshot pair ----
  // Reset by clicking bet-entry-> playing again for a clean board if needed,
  // then compare a FOCUSED-cursor screenshot vs an UNFOCUSED (blurred) one
  // of the exact same tile, sample pixels, compute WCAG contrast between
  // the ring's white line and the immediately-adjacent tile background.
  // Reload for a clean deterministic board.
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 900));
  const cta2 = await page.$('[data-testid="vault-ctl-cta"]');
  if (cta2) {
    await cta2.click();
    await new Promise((r) => setTimeout(r, 900));
  }
  await page.evaluate(() => document.body.focus());
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab');
    const isGrid = await page.evaluate(
      () => document.activeElement?.getAttribute('data-testid') === 'vault-grid-canvas',
    );
    if (isGrid) break;
  }
  await new Promise((r) => setTimeout(r, 200));

  const gridBox = await page.evaluate(() => {
    const c = document.querySelector('[data-testid="vault-grid-canvas"]');
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  R.gridBox = gridBox;

  // Crop tight around where tile-0 (top-left, cursor default) should be:
  // computeGridLayout with domHudActive true (desktop) => FIXED_TILE 96,
  // FIXED_GAP 16, W=gridBox.width,H=gridBox.height. Reimplement the exact
  // formula from VaultGridCanvas.tsx to locate tile 0's top-left corner.
  const layout = await page.evaluate((box) => {
    const W = box.width, H = box.height;
    const wide = W / H > 1.2;
    const minimalBands = true; // desktop isWide chassis => domHudActive true
    const topReserved = minimalBands ? H * 0.035 : H * (wide ? 0.12 : 0.15);
    const bottomReserved = minimalBands ? H * 0.035 : H * (wide ? 0.14 : 0.18);
    const sideFrac = minimalBands ? 0.04 : 0.08;
    const safeW = W * (1 - sideFrac * 2);
    const safeH = (H - topReserved - bottomReserved) * 0.96;
    const available = Math.min(safeW, safeH);
    const FIXED_TILE = 96, FIXED_GAP = 16;
    const gridSize = 5;
    const fixedFull = FIXED_TILE * gridSize + FIXED_GAP * (gridSize - 1);
    if (minimalBands && fixedFull <= available + 0.5) {
      const x = (W - fixedFull) / 2;
      const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2;
      const y = bandCenterY - fixedFull / 2;
      return { x, y, tile: FIXED_TILE, gap: FIXED_GAP, full: fixedFull, usedFixed: true };
    }
    const gap = Math.max(6, available * 0.026);
    const tile = (available - gap * (gridSize - 1)) / gridSize;
    const full = tile * gridSize + gap * (gridSize - 1);
    const x = (W - full) / 2;
    const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2;
    const y = bandCenterY - full / 2;
    return { x, y, tile, gap, full, usedFixed: false };
  }, gridBox);
  R.layout = layout;
  log('Reimplemented grid layout for contrast probe:', JSON.stringify(layout));

  // Focused screenshot (full page, we'll crop after) - grid currently focused
  // with cursor default idx 0.
  await page.screenshot({ path: `${OUT}/focused-full.png` });
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await new Promise((r) => setTimeout(r, 250));
  await page.screenshot({ path: `${OUT}/unfocused-full.png` });

  // Sample pixels directly from the CANVAS's own pixel buffer (device-scale
  // aware) rather than the PNG screenshot, for exact ground truth -- read
  // getImageData along a horizontal scanline through the ring's expected
  // stroke position on tile 0 (top-left tile), both focused and blurred.
  await page.evaluate(() => document.querySelector('[data-testid="vault-grid-canvas"]').focus());
  await new Promise((r) => setTimeout(r, 250));
  const focusedScan = await page.evaluate((L) => {
    const c = document.querySelector('[data-testid="vault-grid-canvas"]');
    const ctx = c.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // scan a horizontal line through y = tile*0.035 + ~half of the ring
    // thickness (ring drawn at x+tile*0.035 .. x+tile*0.965, stroked with
    // ~max(5, tile*0.09) dark halo then ~max(2.5, tile*0.045) white on top)
    const yCss = L.y + L.tile * 0.035;
    const yPx = Math.round(yCss * dpr);
    const xStartPx = Math.round((L.x - 4) * dpr);
    const xEndPx = Math.round((L.x + L.tile * 0.5) * dpr);
    const w = Math.max(1, xEndPx - xStartPx);
    const data = ctx.getImageData(xStartPx, yPx, w, 1).data;
    const pixels = [];
    for (let i = 0; i < data.length; i += 4) {
      pixels.push([data[i], data[i + 1], data[i + 2], data[i + 3]]);
    }
    return { yPx, xStartPx, w, pixels };
  }, layout);
  R.focusedScan = { yPx: focusedScan.yPx, xStartPx: focusedScan.xStartPx, w: focusedScan.w, pixelCount: focusedScan.pixels.length };

  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await new Promise((r) => setTimeout(r, 250));
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
    for (let i = 0; i < data.length; i += 4) {
      pixels.push([data[i], data[i + 1], data[i + 2], data[i + 3]]);
    }
    return pixels;
  }, layout);

  // Find the brightest pixel in the FOCUSED scanline (should be the white
  // inner ring stroke) and compare it against the pixel at the SAME index
  // in the BLURRED (no-ring) scanline (the plain tile/background under it).
  let maxBrightIdx = -1;
  let maxBright = -1;
  focusedScan.pixels.forEach((p, i) => {
    const b = p[0] + p[1] + p[2];
    if (b > maxBright) {
      maxBright = b;
      maxBrightIdx = i;
    }
  });
  const ringPixelFocused = focusedScan.pixels[maxBrightIdx];
  const samePixelBlurred = blurredScan[maxBrightIdx];
  R.ringPixelFocused = ringPixelFocused;
  R.samePixelUnfocused = samePixelBlurred;
  const ringContrast = contrast(ringPixelFocused.slice(0, 3), samePixelBlurred.slice(0, 3));
  R.ringVsUnderlyingContrastRatio = ringContrast;
  log('Ring pixel (focused):', ringPixelFocused, ' same-position pixel (unfocused):', samePixelBlurred);
  log('Measured focus-ring contrast ratio (ring vs what was there without focus):', ringContrast.toFixed(2));

  // Also compute the dark-halo-vs-tile contrast is not the relevant WCAG
  // pair; the relevant pair per spec is ring-color vs ADJACENT tile color.
  // Cross-check: sample a pixel further along the same scanline that is
  // clearly OUTSIDE the ring (tile interior) in the focused frame, and
  // compute ring-vs-tile-interior contrast too (a stricter/more standard
  // "outline vs background" pair).
  const interiorIdx = Math.min(focusedScan.pixels.length - 1, maxBrightIdx + Math.round(layout.tile * 0.15 * 2));
  const interiorPixelFocused = focusedScan.pixels[interiorIdx];
  const ringVsInterior = contrast(ringPixelFocused.slice(0, 3), interiorPixelFocused.slice(0, 3));
  R.interiorPixelFocused = interiorPixelFocused;
  R.ringVsTileInteriorContrastRatio = ringVsInterior;
  log('Ring vs tile-interior (same frame) contrast ratio:', ringVsInterior.toFixed(2));

  await page.evaluate(() => document.querySelector('[data-testid="vault-grid-canvas"]').focus());
  await new Promise((r) => setTimeout(r, 200));
  // Crop screenshot around tile 0 at high zoom for visual evidence.
  await page.screenshot({
    path: `${OUT}/05-focusring-crop.png`,
    clip: {
      x: Math.max(0, gridBox.x + layout.x - 10),
      y: Math.max(0, gridBox.y + layout.y - 10),
      width: layout.tile + 20,
      height: layout.tile + 20,
    },
  });

  // ---------- GATE 2.3.1: no >3Hz flash from the focus ring itself --------
  // The ring is drawn with NO time-based term at all in the source (static
  // strokeStyle every frame) -- confirm empirically by sampling the same
  // pixel across many animation frames while focused+idle and checking it
  // never toggles off/on (a real flash would alternate brightness).
  const flashSamples = [];
  for (let i = 0; i < 30; i++) {
    const v = await page.evaluate((L) => {
      const c = document.querySelector('[data-testid="vault-grid-canvas"]');
      const ctx = c.getContext('2d');
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const xPx = Math.round((L.x + L.tile * 0.035 + 2) * dpr);
      const yPx = Math.round((L.y + L.tile * 0.5) * dpr);
      const d = ctx.getImageData(xPx, yPx, 1, 1).data;
      return [d[0], d[1], d[2]];
    }, layout);
    flashSamples.push(v[0] + v[1] + v[2]);
    await new Promise((r) => setTimeout(r, 33)); // ~30fps sampling
  }
  const flashChanges = flashSamples.filter((v, i) => i > 0 && Math.abs(v - flashSamples[i - 1]) > 40).length;
  R.flashSamples = flashSamples;
  R.flashTransitionsOver900ms = flashChanges;
  log('Flash-probe brightness samples (ring edge, 30 frames @ ~33ms):', flashSamples.join(','));
  log('Large brightness transitions counted (should be 0 for a static ring):', flashChanges);

  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(R, null, 2));
  console.log('\n=== FULL RESULTS WRITTEN TO results.json ===');
  await browser.close();
}

main().catch((e) => {
  console.error('DRIVER ERROR', e);
  process.exit(1);
});
