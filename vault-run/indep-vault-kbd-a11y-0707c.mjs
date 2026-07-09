// INDEPENDENT accessibility verifier, PART 3 — retries harder to land a
// round with >=2 consecutive safe reveals so the RG-C5 held-Enter test and
// the Space-reveal test actually run on a still-playing board, and
// instruments a native keydown counter to PROVE whether real OS/browser
// key-repeat fires multiple keydown events during a 1.5s hold (rather than
// assuming it does).
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad/a11y0707';
const URL = 'http://localhost:5311/';
const log = (...a) => console.log(...a);
const R = {};

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
    await new Promise((r) => setTimeout(r, 650));
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
  const isPlaying = (attrs) => !!attrs && attrs.ariaLabel.includes('coin grid');

  // Install a persistent native keydown counter on the grid canvas (survives
  // across re-renders since the canvas element itself is stable while
  // mounted in 'playing' phase).
  const installCounter = () =>
    page.evaluate(() => {
      const c = document.querySelector('[data-testid="vault-grid-canvas"]');
      window.__kbCount = { total: 0, repeats: 0 };
      c.addEventListener('keydown', (e) => {
        window.__kbCount.total++;
        if (e.repeat) window.__kbCount.repeats++;
      });
    });
  const readCounter = () => page.evaluate(() => window.__kbCount);

  let attempts = 0;
  let gotTwoSafe = false;
  const MAX_ATTEMPTS = 25;
  while (!gotTwoSafe && attempts < MAX_ATTEMPTS) {
    attempts++;
    await clickCta();
    let attrs = await readCanvasAttrs();
    if (!isPlaying(attrs)) {
      await clickCta();
      attrs = await readCanvasAttrs();
    }
    if (!isPlaying(attrs)) continue;
    await focusGrid();
    await installCounter();

    // reveal tile 0
    const desc0 = await readActiveDesc();
    const label0 = await readLabel(desc0);
    if (!label0 || !label0.includes('hidden')) continue;
    await page.keyboard.press('Enter');
    await new Promise((r) => setTimeout(r, 350));
    const label0After = await readLabel(desc0);
    if (!label0After || !label0After.includes('revealed, safe')) {
      log(`attempt ${attempts}: tile0 hit -> ${label0After} (not safe, retrying)`);
      continue;
    }
    // reveal tile 1 (arrow right) to build a small safe streak before the
    // held-Enter test itself, so we can also see the multiplier delta.
    await page.keyboard.press('ArrowRight');
    const desc1 = await readActiveDesc();
    const label1 = await readLabel(desc1);
    if (!label1 || !label1.includes('hidden')) continue;
    await page.keyboard.press('Enter');
    await new Promise((r) => setTimeout(r, 350));
    const label1After = await readLabel(desc1);
    if (!label1After || !label1After.includes('revealed, safe')) {
      log(`attempt ${attempts}: tile1 hit -> ${label1After} (not safe, retrying)`);
      continue;
    }
    gotTwoSafe = true;
    log(`attempt ${attempts}: got two consecutive safe reveals (tile0, tile1)`);
  }
  R.attemptsFor2Safe = attempts;
  R.gotTwoSafe = gotTwoSafe;

  if (gotTwoSafe) {
    const statusBase = await readStatus();
    R.statusAfterTwoSafe = statusBase;
    log('Status after 2 safe reveals:', statusBase);

    // ---------- HELD-ENTER on a fresh tile, with native keydown counting --
    await page.keyboard.press('ArrowRight');
    const cursorBeforeHold = await readActiveDesc();
    const labelBeforeHold = await readLabel(cursorBeforeHold);
    R.cursorBeforeHold = cursorBeforeHold;
    R.labelBeforeHold = labelBeforeHold;
    const statusBeforeHold = await readStatus();
    log('Before HELD-ENTER -> cursor', cursorBeforeHold, 'label', labelBeforeHold, 'status', statusBeforeHold);

    await page.keyboard.down('Enter');
    await new Promise((r) => setTimeout(r, 1600));
    await page.keyboard.up('Enter');
    await new Promise((r) => setTimeout(r, 400));

    const kbCounter = await readCounter();
    R.nativeKeydownCounterDuringHold = kbCounter;
    log('Native keydown events fired during the 1.6s physical hold (total/repeat-flagged):', JSON.stringify(kbCounter));

    const labelAfterHold = await readLabel(cursorBeforeHold);
    const statusAfterHold = await readStatus();
    R.labelAfterHold = labelAfterHold;
    R.statusAfterHold = statusAfterHold;
    log('After HELD-ENTER -> label', labelAfterHold, 'status', statusAfterHold);

    const parseOpen = (s) => {
      const m = s && s.match(/OPEN (\d+) of/);
      return m ? Number(m[1]) : null;
    };
    R.openBeforeHold = parseOpen(statusBeforeHold);
    R.openAfterHold = parseOpen(statusAfterHold);
    log('Open count before/after hold:', R.openBeforeHold, '->', R.openAfterHold);

    const stillPlayingAfterHold = await readCanvasAttrs();
    R.stillPlayingAfterHold = isPlaying(stillPlayingAfterHold);

    if (isPlaying(stillPlayingAfterHold)) {
      // ---------- SPACE reveal test ----------
      await page.keyboard.press('ArrowRight');
      const cursorBeforeSpace = await readActiveDesc();
      const labelBeforeSpace = await readLabel(cursorBeforeSpace);
      const statusBeforeSpace = await readStatus();
      await page.keyboard.press(' ');
      await new Promise((r) => setTimeout(r, 400));
      const labelAfterSpace = await readLabel(cursorBeforeSpace);
      const statusAfterSpace = await readStatus();
      R.spaceTest = { cursorBeforeSpace, labelBeforeSpace, labelAfterSpace, statusBeforeSpace, statusAfterSpace };
      log('SPACE reveal test -> before:', labelBeforeSpace, ' after:', labelAfterSpace, ' status:', statusAfterSpace);

      // ---------- Pointer regression: real mouse click on a fresh tile ----
      const stillPlaying3 = await readCanvasAttrs();
      if (isPlaying(stillPlaying3)) {
        await page.keyboard.press('ArrowRight');
        const cursorForClick = await readActiveDesc();
        const labelForClickBefore = await readLabel(cursorForClick);
        const idx = Number(cursorForClick.replace('vault-tile-', ''));
        const clickPoint = await page.evaluate((idxIn) => {
          const c = document.querySelector('[data-testid="vault-grid-canvas"]');
          const rect = c.getBoundingClientRect();
          const W = rect.width, H = rect.height;
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
          const row = Math.floor(idxIn / gridSize);
          const col = idxIn % gridSize;
          return { cx: rect.x + x + col * (tile + gap) + tile / 2, cy: rect.y + y + row * (tile + gap) + tile / 2 };
        }, idx);
        const statusBeforeClick = await readStatus();
        await page.mouse.click(clickPoint.cx, clickPoint.cy);
        await new Promise((r) => setTimeout(r, 400));
        const labelForClickAfter = await readLabel(cursorForClick);
        const statusAfterClick = await readStatus();
        R.pointerRegression = { tileIdxClicked: idx, labelForClickBefore, labelForClickAfter, statusBeforeClick, statusAfterClick };
        log('Pointer regression click on tile', idx, '-> before:', labelForClickBefore, ' after:', labelForClickAfter);
      } else {
        R.pointerRegressionSkipped = 'round ended (rug) during/after Space test';
      }
    } else {
      R.spaceTestSkipped = 'round ended (rug) during held-Enter test';
    }
  }

  fs.writeFileSync(`${OUT}/results-part3.json`, JSON.stringify(R, null, 2));
  console.log('\n=== PART 3 RESULTS WRITTEN ===');
  await browser.close();
}

main().catch((e) => {
  console.error('DRIVER ERROR', e);
  process.exit(1);
});
