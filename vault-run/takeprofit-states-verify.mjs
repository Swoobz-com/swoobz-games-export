// CAPTURE-ONLY follow-up to gutterext0703-verify.mjs (round 4/4 taste-guardian
// gap): captures the CORE ACTION TAKE PROFIT button (PlayingGutterCards,
// VaultExperience.tsx L3084) in its ENABLED (canCashOut, non-dramatic) and
// DRAMATIC (cumulativeMultiplierBps > 15_000n, i.e. >1.5x) states, since every
// prior Playing screenshot in shots-gutterext/ happened to be captured at
// 0 safe reveals (DISABLED state only). BLUECHIPS mode (25 tiles, 3 mines,
// 3% edge) needs exactly 4 safe reveals to cross 1.5x (see vaultMath.ts
// multiplierAfterSafeTiles: 0->1.00x,1->1.10x,2->1.22x,3->1.36x,4->1.53x).
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5195';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickTextWithin(page, selector, t) {
  const h = await page.evaluateHandle(({ selector, t }) => {
    const root = document.querySelector(selector);
    if (!root) return null;
    const els = [...root.querySelectorAll('button')];
    return (
      els.find((e) => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
  }, { selector, t });
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}

function rectOf(sel) {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
}

function clipAround(...rects) {
  const rs = rects.filter(Boolean);
  if (rs.length === 0) return undefined;
  const pad = 80;
  const left = Math.min(...rs.map((r) => r.left));
  const top = Math.min(...rs.map((r) => r.top));
  const right = Math.max(...rs.map((r) => r.right));
  const bottom = Math.max(...rs.map((r) => r.bottom));
  return {
    x: Math.max(0, Math.round(left - pad)),
    y: Math.max(0, Math.round(top - pad)),
    width: Math.round(right - left + pad * 2),
    height: Math.round(bottom - top + pad * 2),
  };
}

async function selectMode(page, modeName) {
  await clickTextWithin(page, '[data-testid="vault-betentry-world"]', modeName);
}

async function isSettled(page) {
  return await page.evaluate(() => document.body.textContent.includes('BUST') || !!document.querySelector('[data-testid="vault-settled-betagain"]'));
}
async function isPlaying(page) {
  return await page.evaluate(() => document.body.textContent.includes('PUMPING') || document.body.textContent.includes('TRAIL'));
}

async function clickCanvasFraction(page, fx, fy) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (!box) return false;
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy);
  return true;
}

// Mirrors VaultGridCanvas.tsx computeGridLayout (L842) exactly so we can
// target a SPECIFIC, never-before-clicked tile index each reveal — the
// fixed 8-fraction-spot approach only ever hits the FIRST spot's tile (0.5,
// 0.5) since a re-click on an already-revealed tile is a harmless no-op, so
// naive fraction-cycling silently plateaus at safeCount=1 forever.
function computeGridLayoutJs(W, H, gridSize) {
  const wide = W / H > 1.2;
  const topReserved = H * (wide ? 0.12 : 0.15);
  const bottomReserved = H * (wide ? 0.14 : 0.18);
  const sideFrac = 0.08;
  const safeW = W * (1 - sideFrac * 2);
  const safeH = (H - topReserved - bottomReserved) * 0.96;
  const available = Math.min(safeW, safeH);
  const gap = Math.max(6, available * 0.026);
  const tile = (available - gap * (gridSize - 1)) / gridSize;
  const full = tile * gridSize + gap * (gridSize - 1);
  const x = (W - full) / 2;
  const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2;
  const y = bandCenterY - full / 2;
  return { x, y, tile, gap, full };
}

function tileCenter(canvasW, canvasH, gridSize, idx) {
  const grid = computeGridLayoutJs(canvasW, canvasH, gridSize);
  const row = Math.floor(idx / gridSize);
  const col = idx % gridSize;
  const cx = grid.x + col * (grid.tile + grid.gap) + grid.tile / 2;
  const cy = grid.y + row * (grid.tile + grid.gap) + grid.tile / 2;
  return { cx, cy };
}

async function clickTileIndex(page, idx, gridSize) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (!box) return false;
  const { cx, cy } = tileCenter(box.w, box.h, gridSize, idx);
  await page.mouse.click(box.x + cx, box.y + cy);
  return true;
}

async function takeProfitState(page) {
  return await page.evaluate(() => {
    const root = document.querySelector('[data-testid="vault-playing-actions"]');
    if (!root) return null;
    const btn = [...root.querySelectorAll('button')].find((b) => b.textContent.toLowerCase().includes('take profit'));
    if (!btn) return null;
    const cs = getComputedStyle(btn);
    const r = btn.getBoundingClientRect();
    const parentR = root.getBoundingClientRect();
    return {
      text: btn.textContent.trim(),
      disabled: btn.disabled,
      isDramatic: btn.className.includes('vault-cashout-dramatic'),
      opacity: cs.opacity,
      backgroundImage: cs.backgroundImage,
      backgroundColor: cs.backgroundColor,
      color: cs.color,
      fontSize: cs.fontSize,
      width: r.width,
      parentWidth: parentR.width,
      minWidth: cs.minWidth,
    };
  });
}

// Reveal ONE safe tile at a SPECIFIC, never-before-tried grid index (see
// clickTileIndex/tileCenter above — re-clicking an already-revealed tile is
// a silent no-op, which was the root cause of the first attempt's plateau at
// safeCount=1). Returns 'safe' | 'bust'.
async function revealTileAtIndex(page, idx, gridSize) {
  if (!(await isPlaying(page))) return 'bust';
  const before = await takeProfitState(page);
  await clickTileIndex(page, idx, gridSize);
  await wait(550);
  if (await isSettled(page)) return 'bust';
  const after = await takeProfitState(page);
  if (!after) return 'bust';
  // Ground truth: the Pump stat / TAKE PROFIT subtext multiplier increased.
  if (!before || before.text !== after.text) return 'safe';
  return 'bust'; // no visible change at all — treat as inconclusive/failed tap
}

// sRGB contrast helpers (same math as gutterext0703-verify.mjs).
function relLum([r, g, b]) {
  const f = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  const [rl, gl, bl] = [f(r), f(g), f(b)];
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}
function contrast(a, b) { const l1 = relLum(a) + 0.05, l2 = relLum(b) + 0.05; return l1 > l2 ? l1 / l2 : l2 / l1; }
function parseRgb(s) { const m = s.match(/(\d+),\s*(\d+),\s*(\d+)/); return m ? [+m[1], +m[2], +m[3]] : null; }
const INK = [0x04, 0x13, 0x0b];
const STOP_TOP = [0x00, 0xe6, 0x76];
const STOP_BOTTOM = [0x00, 0xa8, 0x5a];

function gradeContrast(label, cs) {
  if (!cs) return { label, error: 'button not found' };
  const colorRgb = parseRgb(cs.color);
  const cTop = colorRgb ? contrast(colorRgb, STOP_TOP) : null;
  const cBottom = colorRgb ? contrast(colorRgb, STOP_BOTTOM) : null;
  return {
    label,
    text: cs.text,
    isDramatic: cs.isDramatic,
    disabled: cs.disabled,
    opacity: cs.opacity,
    color: cs.color,
    backgroundImage: cs.backgroundImage,
    fontSize: cs.fontSize,
    contrastVsTopStop: cTop ? cTop.toFixed(2) : null,
    contrastVsBottomStop: cBottom ? cBottom.toFixed(2) : null,
    worstCaseAA_normalText: cBottom !== null ? cBottom >= 4.5 : null,
    widthVsParent: cs.width && cs.parentWidth ? `${cs.width.toFixed(1)} / ${cs.parentWidth.toFixed(1)}` : null,
    minWidthComputed: cs.minWidth,
  };
}

async function startRound(page, mode) {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(600);
  await clickTextWithin(page, '[data-testid="vault-lobby-apein"]', 'ape in');
  await wait(500);
  await selectMode(page, mode);
  await wait(300);
  await clickTextWithin(page, '[data-testid="vault-betentry-confirm"]', 'SEND IT');
  await wait(800);
}

async function betAgainSameMode(page) {
  await clickTextWithin(page, '[data-testid="vault-settled-betagain"]', 'bet again');
  await wait(800);
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const outDir = 'shots-takeprofit-states';
  fs.mkdirSync(outDir, { recursive: true });
  const R = {};

  const GRID_SIZE = 5; // BLUECHIPS: 5x5, 3 mines

  // ================= ENABLED state (1 safe reveal, non-dramatic) =================
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    let safe = false;
    for (let attempt = 0; attempt < 8 && !safe; attempt++) {
      if (attempt === 0) await startRound(page, 'BLUECHIPS');
      else {
        if (await isSettled(page)) await betAgainSameMode(page);
        else await startRound(page, 'BLUECHIPS');
      }
      // try a handful of distinct tile indices this round until one lands safe
      for (let idx = 0; idx < 25 && !safe; idx++) {
        const result = await revealTileAtIndex(page, idx, GRID_SIZE);
        if (result === 'safe') { safe = true; break; }
        if (!(await isPlaying(page))) break; // busted — next attempt starts a fresh round
      }
      R[`enabled_attempt_${attempt}_result`] = safe ? 'safe' : 'bust';
    }
    R.enabled_reveal_achieved = safe;

    R.takeprofit_enabled_style = await takeProfitState(page);
    R.playing_actions_rect_enabled = await page.evaluate(rectOf, '[data-testid="vault-playing-actions"]');
    R.playing_status_rect_enabled = await page.evaluate(rectOf, '[data-testid="vault-playing-status"]');
    R.pump_stat_text_enabled = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="vault-playing-status"]');
      return root ? root.textContent : null;
    });

    await page.screenshot({ path: `${outDir}/playing-enabled-1440-full.png` });
    await page.screenshot({
      path: `${outDir}/playing-enabled-1440-rightwide.png`,
      clip: clipAround(R.playing_actions_rect_enabled),
    });
    await page.close();
  }

  // ================= DRAMATIC state (4 safe reveals, cumulative > 1.5x) =================
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    const TARGET_SAFE = 4;
    let dramaticAchieved = false;
    for (let roundAttempt = 0; roundAttempt < 10 && !dramaticAchieved; roundAttempt++) {
      if (roundAttempt === 0) await startRound(page, 'BLUECHIPS');
      else {
        if (await isSettled(page)) await betAgainSameMode(page);
        else await startRound(page, 'BLUECHIPS');
      }
      let safeCount = 0;
      let busted = false;
      for (let idx = 0; idx < 25 && safeCount < TARGET_SAFE && !busted; idx++) {
        const result = await revealTileAtIndex(page, idx, GRID_SIZE);
        if (result === 'bust') {
          if (!(await isPlaying(page))) { busted = true; break; }
          continue; // inconclusive tap (e.g. missed a gap) — try next index, same round
        }
        safeCount += 1;
        const st = await takeProfitState(page);
        if (st && st.isDramatic) { dramaticAchieved = true; break; }
      }
      R[`dramatic_roundAttempt_${roundAttempt}`] = { safeCount, busted, dramaticAchieved };
      if (busted) continue;
    }
    R.dramatic_reveal_achieved = dramaticAchieved;

    R.takeprofit_dramatic_style = await takeProfitState(page);
    R.playing_actions_rect_dramatic = await page.evaluate(rectOf, '[data-testid="vault-playing-actions"]');
    R.pump_stat_text_dramatic = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="vault-playing-status"]');
      return root ? root.textContent : null;
    });

    await page.screenshot({ path: `${outDir}/playing-dramatic-1440-full.png` });
    await page.screenshot({
      path: `${outDir}/playing-dramatic-1440-rightwide.png`,
      clip: clipAround(R.playing_actions_rect_dramatic),
    });
    await page.close();
  }

  // ================= Contrast grading =================
  R.contrast_enabled = gradeContrast('TAKE PROFIT (enabled, non-dramatic)', R.takeprofit_enabled_style);
  R.contrast_dramatic = gradeContrast('TAKE PROFIT (dramatic, >1.5x)', R.takeprofit_dramatic_style);

  await browser.close();
  fs.writeFileSync('takeprofit-states-results.json', JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();
