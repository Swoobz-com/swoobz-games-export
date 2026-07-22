// INDEPENDENT accessibility verifier, PART 2 — retries rounds to land on
// SAFE reveals (part 1 unluckily hit a rug on the very first Enter), and
// uses a robust FULL-EDGE pixel-diff to locate the focus ring's rendered
// stroke pixels (instead of a single scanline heuristic).
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
  await new Promise((r) => setTimeout(r, 900));

  const readStatus = () =>
    page.evaluate(() => document.querySelector('[data-testid="vault-grid-status"]')?.textContent ?? null);
  const readCanvasAttrs = () =>
    page.evaluate(() => {
      const c = document.querySelector('[data-testid="vault-grid-canvas"]');
      return c ? { role: c.getAttribute('role'), ariaLabel: c.getAttribute('aria-label') } : null;
    });
  const clickCta = async () => {
    const cta = await page.$('[data-testid="vault-ctl-cta"]');
    if (!cta) return false;
    await cta.click();
    await new Promise((r) => setTimeout(r, 700));
    return true;
  };
  const focusGrid = async () => {
    await page.evaluate(() => document.querySelector('[data-testid="vault-grid-canvas"]')?.focus());
    await new Promise((r) => setTimeout(r, 150));
  };
  const readLabel = (id) =>
    page.evaluate((tid) => document.getElementById(tid)?.getAttribute('aria-label'), id);
  const readActiveDesc = () =>
    page.evaluate(() => document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('aria-activedescendant'));

  // ---------- RETRY LOOP: keep starting fresh rounds via BET AGAIN/SEND IT
  // until Enter on tile-0 lands on a SAFE reveal (not a rug), so the
  // held-Enter (RG-C5) and Space tests run on a genuinely still-live round.
  let gotSafeStart = false;
  let attempts = 0;
  const MAX_ATTEMPTS = 15;
  while (!gotSafeStart && attempts < MAX_ATTEMPTS) {
    attempts++;
    await clickCta(); // SEND IT (bet-entry) or BET AGAIN (settled)
    const attrs = await readCanvasAttrs();
    if (!(attrs && attrs.role === 'grid' && attrs.ariaLabel.includes('coin grid'))) {
      // not in playing phase yet (maybe still bet-entry) -- try clicking again
      await clickCta();
    }
    await focusGrid();
    const desc0 = await readActiveDesc();
    if (!desc0) continue;
    const label0 = await readLabel(desc0);
    if (!label0 || !label0.includes('hidden')) continue; // stale/settled board
    await page.keyboard.press('Enter');
    await new Promise((r) => setTimeout(r, 350));
    const label0After = await readLabel(desc0);
    log(`attempt ${attempts}: tile0 label before='${label0}' after='${label0After}'`);
    if (label0After && label0After.includes('revealed, safe')) {
      gotSafeStart = true;
    }
  }
  R.attemptsToGetSafeStart = attempts;
  R.gotSafeStart = gotSafeStart;
  log('Got a safe first reveal after', attempts, 'attempt(s):', gotSafeStart);

  if (gotSafeStart) {
    const statusAfterFirstSafe = await readStatus();
    R.statusAfterFirstSafeReveal = statusAfterFirstSafe;
    log('Status after confirmed-safe first reveal:', statusAfterFirstSafe);

    // ---------- RG-C5 held-Enter probe on a FRESH untouched tile ----------
    await page.keyboard.press('ArrowRight'); // move cursor to a new, untouched tile
    const cursorBeforeHold = await readActiveDesc();
    const labelBeforeHold = await readLabel(cursorBeforeHold);
    R.cursorBeforeHold = cursorBeforeHold;
    R.labelBeforeHold = labelBeforeHold;
    const statusBeforeHold = await readStatus();
    log('Before HOLD -> cursor', cursorBeforeHold, 'label', labelBeforeHold, 'status', statusBeforeHold);

    await page.keyboard.down('Enter');
    await new Promise((r) => setTimeout(r, 1500)); // long hold -> native auto-repeat window
    await page.keyboard.up('Enter');
    await new Promise((r) => setTimeout(r, 400));

    const labelAfterHold = await readLabel(cursorBeforeHold);
    const statusAfterHold = await readStatus();
    R.labelAfterHold = labelAfterHold;
    R.statusAfterHold = statusAfterHold;
    log('After HOLD(1500ms) -> label', labelAfterHold, 'status', statusAfterHold);

    // Parse "OPEN n of m" counts from status text before/after to prove
    // EXACTLY one additional tile opened during the whole 1.5s hold, not
    // several (which would indicate key-repeat is machine-gunning reveals).
    const parseOpen = (s) => {
      const m = s && s.match(/OPEN (\d+) of/);
      return m ? Number(m[1]) : null;
    };
    R.openCountBeforeHold = parseOpen(statusBeforeHold);
    R.openCountAfterHold = parseOpen(statusAfterHold);
    log('Open-count before hold:', R.openCountBeforeHold, ' after hold:', R.openCountAfterHold, ' delta:', (R.openCountAfterHold ?? 0) - (R.openCountBeforeHold ?? 0));

    // ---------- Space reveal test (only if still playing) ----------
    const stillPlaying1 = await readCanvasAttrs();
    if (stillPlaying1 && stillPlaying1.ariaLabel.includes('coin grid')) {
      await page.keyboard.press('ArrowRight');
      const cursorBeforeSpace = await readActiveDesc();
      const labelBeforeSpace = await readLabel(cursorBeforeSpace);
      await page.keyboard.press(' ');
      await new Promise((r) => setTimeout(r, 400));
      const labelAfterSpace = await readLabel(cursorBeforeSpace);
      R.cursorBeforeSpace = cursorBeforeSpace;
      R.labelBeforeSpace = labelBeforeSpace;
      R.labelAfterSpace = labelAfterSpace;
      log('Space reveal -> before:', labelBeforeSpace, ' after:', labelAfterSpace);

      // ---------- Pointer regression: click a FRESH tile with the mouse ---
      const stillPlaying2 = await readCanvasAttrs();
      if (stillPlaying2 && stillPlaying2.ariaLabel.includes('coin grid')) {
        // Determine an untouched tile's screen coords: move keyboard cursor
        // there first (to know which idx it is / confirm hidden), read its
        // canvas-relative box, then click with the REAL mouse (bypassing
        // keyboard entirely) to prove pointer path is unregressed.
        await page.keyboard.press('ArrowRight');
        const cursorForClick = await readActiveDesc();
        const labelForClickBefore = await readLabel(cursorForClick);
        const idx = Number(cursorForClick.replace('vault-tile-', ''));
        const clickPoint = await page.evaluate(
          ({ idx }) => {
            const c = document.querySelector('[data-testid="vault-grid-canvas"]');
            const rect = c.getBoundingClientRect();
            const W = rect.width, H = rect.height;
            const wide = W / H > 1.2;
            const minimalBands = true;
            const topReserved = H * 0.035, bottomReserved = H * 0.035, sideFrac = 0.04;
            const safeW = W * (1 - sideFrac * 2);
            const safeH = (H - topReserved - bottomReserved) * 0.96;
            const available = Math.min(safeW, safeH);
            const FIXED_TILE = 96, FIXED_GAP = 16, gridSize = 5;
            const fixedFull = FIXED_TILE * gridSize + FIXED_GAP * (gridSize - 1);
            let x, y, tile, gap;
            if (fixedFull <= available + 0.5) {
              x = (W - fixedFull) / 2;
              const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2;
              y = bandCenterY - fixedFull / 2;
              tile = FIXED_TILE; gap = FIXED_GAP;
            } else {
              gap = Math.max(6, available * 0.026);
              tile = (available - gap * (gridSize - 1)) / gridSize;
              const full = tile * gridSize + gap * (gridSize - 1);
              x = (W - full) / 2;
              const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2;
              y = bandCenterY - full / 2;
            }
            const row = Math.floor(idx / gridSize);
            const col = idx % gridSize;
            const cx = rect.x + x + col * (tile + gap) + tile / 2;
            const cy = rect.y + y + row * (tile + gap) + tile / 2;
            return { cx, cy };
          },
          { idx },
        );
        const statusBeforeClick = await readStatus();
        await page.mouse.click(clickPoint.cx, clickPoint.cy);
        await new Promise((r) => setTimeout(r, 400));
        const labelForClickAfter = await readLabel(cursorForClick);
        const statusAfterClick = await readStatus();
        R.pointerRegression = {
          tileIdxClicked: idx,
          labelBefore: labelForClickBefore,
          labelAfter: labelForClickAfter,
          statusBefore: statusBeforeClick,
          statusAfter: statusAfterClick,
        };
        log('Pointer-click regression on tile', idx, '-> before:', labelForClickBefore, ' after:', labelForClickAfter);
      } else {
        R.pointerRegressionSkipped = 'round ended before pointer test';
      }
    } else {
      R.spaceTestSkipped = 'round ended (rug/settled) during held-Enter test';
      log('Space test skipped -- round ended during hold-Enter test:', JSON.stringify(stillPlaying1));
    }
  }

  // ---------- ROBUST FOCUS-RING CONTRAST: full top+left edge pixel diff ---
  // Fresh clean round for a deterministic tile-0 render (freshly sealed,
  // untouched -- consistent artwork every time).
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 900));
  await clickCta();
  await focusGrid();

  const gridBox = await page.evaluate(() => {
    const c = document.querySelector('[data-testid="vault-grid-canvas"]');
    const r = c.getBoundingClientRect();
    return { width: r.width, height: r.height };
  });
  const layout = await page.evaluate((box) => {
    const W = box.width, H = box.height;
    const topReserved = H * 0.035, bottomReserved = H * 0.035, sideFrac = 0.04;
    const safeW = W * (1 - sideFrac * 2);
    const safeH = (H - topReserved - bottomReserved) * 0.96;
    const available = Math.min(safeW, safeH);
    const FIXED_TILE = 96, FIXED_GAP = 16, gridSize = 5;
    const fixedFull = FIXED_TILE * gridSize + FIXED_GAP * (gridSize - 1);
    const x = (W - fixedFull) / 2;
    const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2;
    const y = bandCenterY - fixedFull / 2;
    return { x, y, tile: FIXED_TILE, gap: FIXED_GAP };
  }, gridBox);
  R.layout = layout;

  // Capture the FULL tile-0 region (with a small margin) as raw pixel data,
  // FOCUSED, then BLURRED, at native canvas resolution (dpr-aware).
  const captureTileRegion = async () =>
    page.evaluate((L) => {
      const c = document.querySelector('[data-testid="vault-grid-canvas"]');
      const ctx = c.getContext('2d');
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const margin = 6;
      const xPx = Math.round((L.x - margin) * dpr);
      const yPx = Math.round((L.y - margin) * dpr);
      const wPx = Math.round((L.tile + margin * 2) * dpr);
      const hPx = Math.round((L.tile + margin * 2) * dpr);
      const data = ctx.getImageData(xPx, yPx, wPx, hPx).data;
      return { xPx, yPx, wPx, hPx, data: Array.from(data) };
    }, layout);

  const focusedRegion = await captureTileRegion();
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await new Promise((r) => setTimeout(r, 250));
  const blurredRegion = await captureTileRegion();
  await focusGrid();

  // Diff pixel-by-pixel; the ring shows up as a high-diff RING SHAPE near
  // the tile border. Find the single pixel with the LARGEST diff (very
  // likely deep inside the white inner stroke), then walk outward along the
  // normal (toward tile center, and away from tile center) in the FOCUSED
  // buffer to find where the diff drops back near zero on both sides --
  // that gives us "ring color" plus "background just past each side of the
  // ring", sourced from the SAME focused frame (most representative of what
  // a sighted keyboard user actually sees).
  const w = focusedRegion.wPx, h = focusedRegion.hPx;
  const fd = focusedRegion.data, bd = blurredRegion.data;
  let bestDiff = -1, bestX = 0, bestY = 0;
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = (py * w + px) * 4;
      const diff = Math.abs(fd[i] - bd[i]) + Math.abs(fd[i + 1] - bd[i + 1]) + Math.abs(fd[i + 2] - bd[i + 2]);
      if (diff > bestDiff) {
        bestDiff = diff;
        bestX = px;
        bestY = py;
      }
    }
  }
  R.ringPeakDiffPixelLoc = { x: bestX, y: bestY, diff: bestDiff };
  const pixelAt = (buf, x, y) => {
    const i = (y * w + x) * 4;
    return [buf[i], buf[i + 1], buf[i + 2]];
  };
  const ringColorFocused = pixelAt(fd, bestX, bestY);
  R.ringColorFocused = ringColorFocused;
  log('Peak-diff pixel (the ring stroke):', JSON.stringify(R.ringPeakDiffPixelLoc), 'color:', ringColorFocused);

  // Walk inward (toward tile center, i.e. increasing x AND y since bestX/Y
  // is expected near the top-left corner region) in the FOCUSED buffer
  // until the color stabilizes (diff-to-neighbor small) -- that's the tile
  // interior seen alongside the ring, in the SAME rendered frame.
  const marginPx = Math.round(6 * 2); // dpr 2 * margin 6
  const centerBiasX = bestX < w / 2 ? 1 : -1;
  const centerBiasY = bestY < h / 2 ? 1 : -1;
  let interior = null;
  for (let step = 4; step <= 40; step += 2) {
    const x = Math.min(w - 1, Math.max(0, bestX + centerBiasX * step));
    const y = Math.min(h - 1, Math.max(0, bestY + centerBiasY * step));
    interior = pixelAt(fd, x, y);
    const d = Math.abs(interior[0] - ringColorFocused[0]) + Math.abs(interior[1] - ringColorFocused[1]) + Math.abs(interior[2] - ringColorFocused[2]);
    if (d > 60) break; // clearly different from ring = past the stroke, into tile fill
  }
  R.tileInteriorNearRing = interior;

  // Walk outward (away from tile center, toward the gap/background between
  // tiles) similarly.
  let outside = null;
  for (let step = 4; step <= 40; step += 2) {
    const x = Math.min(w - 1, Math.max(0, bestX - centerBiasX * step));
    const y = Math.min(h - 1, Math.max(0, bestY - centerBiasY * step));
    outside = pixelAt(fd, x, y);
    const d = Math.abs(outside[0] - ringColorFocused[0]) + Math.abs(outside[1] - ringColorFocused[1]) + Math.abs(outside[2] - ringColorFocused[2]);
    if (d > 60) break;
  }
  R.backgroundOutsideRing = outside;

  const contrastVsInterior = contrast(ringColorFocused, interior);
  const contrastVsOutside = contrast(ringColorFocused, outside);
  R.contrastRingVsTileInterior = contrastVsInterior;
  R.contrastRingVsOutsideBg = contrastVsOutside;
  log('Contrast ring-vs-tile-interior:', contrastVsInterior.toFixed(2), ' ring-vs-outside-bg:', contrastVsOutside.toFixed(2));
  R.worstCaseRingContrast = Math.min(contrastVsInterior, contrastVsOutside);
  log('WORST-CASE ring contrast (min of both sides):', R.worstCaseRingContrast.toFixed(2));

  // Also report the dark-halo pixel (should be near-black, the OTHER half
  // of the two-tone ring) for completeness -- sample a few px further out
  // from the white-peak location along the same bias.
  const haloProbe = pixelAt(fd, Math.min(w - 1, Math.max(0, bestX - centerBiasX * 6)), Math.min(h - 1, Math.max(0, bestY - centerBiasY * 6)));
  R.haloProbePixel = haloProbe;
  log('Halo-side probe pixel (expect near-black rgba(5,6,10,.92)):', haloProbe);

  // Visual evidence crop.
  const gridBoxFull = await page.evaluate(() => {
    const c = document.querySelector('[data-testid="vault-grid-canvas"]');
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y };
  });
  await page.screenshot({
    path: `${OUT}/06-focusring-tile0-crop-b.png`,
    clip: { x: gridBoxFull.x + layout.x - 10, y: gridBoxFull.y + layout.y - 10, width: layout.tile + 20, height: layout.tile + 20 },
  });

  fs.writeFileSync(`${OUT}/results-part2.json`, JSON.stringify(R, null, 2));
  console.log('\n=== PART 2 RESULTS WRITTEN ===');
  await browser.close();
}

main().catch((e) => {
  console.error('DRIVER ERROR', e);
  process.exit(1);
});
