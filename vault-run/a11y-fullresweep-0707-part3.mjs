// Part 3 — corrected ring-scan (proper stroke cross-section via diff-based
// classification), rhythm-badge reliable trigger (BLUECHIPS sparse mines,
// fast clicks inside the 1400ms RHYTHM_WINDOW_MS, retry across fresh rounds),
// liveDot-under-reduce with confirmed 'playing' phase before query.
import puppeteer from 'puppeteer-core';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import http from 'http';

const PORT = 5286;
const URL = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad/a11y-fullresweep-0707';
fs.mkdirSync(OUT, { recursive: true });
const R = {};
const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function srgbToLin(c) { const cs = c / 255; return cs <= 0.04045 ? cs / 12.92 : ((cs + 0.055) / 1.055) ** 2.4; }
function relLum([r, g, b]) { return 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b); }
function contrast(a, b) { const L1 = relLum(a), L2 = relLum(b); const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1]; return (hi + 0.05) / (lo + 0.05); }
function waitForServer(url, timeoutMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(url, (res) => { res.resume(); resolve(true); });
      req.on('error', () => { if (Date.now() - start > timeoutMs) reject(new Error('server not up')); else setTimeout(tryOnce, 300); });
    };
    tryOnce();
  });
}

async function main() {
  log('Spawning vite dev server on port', PORT);
  const devProc = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    cwd: 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/vault-run',
    shell: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let browser;
  try {
    await waitForServer(URL, 30000);
    browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await sleep(700);
    R.desktop = {};

    // ---- CORRECTED ring scan: horizontal cross-section at mid-height of the
    // LEFT edge (guaranteed inside the straight segment, well clear of the
    // rounded-corner radius), diff-based (focused vs blurred) classification
    // so background-only pixels (identical in both frames) are excluded. ----
    const cta = await page.$('[data-testid="vault-ctl-cta"]');
    if (cta) { await cta.click(); await sleep(1200); }
    await page.mouse.click(5, 5);
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const g = await page.evaluate(() => document.activeElement?.getAttribute('data-testid') === 'vault-grid-canvas');
      if (g) break;
    }
    await sleep(200);
    const gridBox = await page.evaluate(() => {
      const c = document.querySelector('[data-testid="vault-grid-canvas"]');
      const r = c.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
    const layout = await page.evaluate((box) => {
      const W = box.width, H = box.height;
      const topReserved = H * 0.035, bottomReserved = H * 0.035, sideFrac = 0.04;
      const safeW = W * (1 - sideFrac * 2), safeH = (H - topReserved - bottomReserved) * 0.96;
      const available = Math.min(safeW, safeH);
      const FIXED_TILE = 96, FIXED_GAP = 16, gridSize = 5;
      const fixedFull = FIXED_TILE * gridSize + FIXED_GAP * (gridSize - 1);
      let x, y, tile, full;
      if (fixedFull <= available + 0.5) {
        x = (W - fixedFull) / 2;
        const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2;
        y = bandCenterY - fixedFull / 2; tile = FIXED_TILE; full = fixedFull;
      } else {
        const gap = Math.max(6, available * 0.026);
        tile = (available - gap * (gridSize - 1)) / gridSize;
        full = tile * gridSize + gap * (gridSize - 1);
        x = (W - full) / 2;
        const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2;
        y = bandCenterY - full / 2;
      }
      return { x, y, tile, full, gap: FIXED_GAP };
    }, gridBox);

    async function moveTo(col) {
      for (let i = 0; i < 8; i++) { await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowLeft'); }
      for (let i = 0; i < col; i++) await page.keyboard.press('ArrowRight');
    }

    async function scanEdgeAtTile(col) {
      await page.evaluate(() => document.querySelector('[data-testid="vault-grid-canvas"]').focus());
      await moveTo(col);
      await sleep(150);
      const focused = await page.evaluate((L, c) => {
        const canvas = document.querySelector('[data-testid="vault-grid-canvas"]');
        const ctx = canvas.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const tileX = L.x + c * (L.tile + L.gap);
        const boxLeft = tileX + L.tile * 0.035;
        const yMid = L.y + L.tile * 0.5; // guaranteed within straight-edge segment (radius=0.18*tile)
        const halfSpan = Math.max(10, L.tile * 0.12);
        const xStart = Math.round((boxLeft - halfSpan) * dpr);
        const w = Math.round(halfSpan * 2 * dpr);
        const yPx = Math.round(yMid * dpr);
        const data = ctx.getImageData(xStart, yPx, w, 1).data;
        const px = [];
        for (let i = 0; i < data.length; i += 4) px.push([data[i], data[i + 1], data[i + 2]]);
        return { px, xStart, dpr };
      }, layout, col);
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      await sleep(150);
      const blurred = await page.evaluate((L, c) => {
        const canvas = document.querySelector('[data-testid="vault-grid-canvas"]');
        const ctx = canvas.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const tileX = L.x + c * (L.tile + L.gap);
        const boxLeft = tileX + L.tile * 0.035;
        const yMid = L.y + L.tile * 0.5;
        const halfSpan = Math.max(10, L.tile * 0.12);
        const xStart = Math.round((boxLeft - halfSpan) * dpr);
        const w = Math.round(halfSpan * 2 * dpr);
        const yPx = Math.round(yMid * dpr);
        const data = ctx.getImageData(xStart, yPx, w, 1).data;
        const px = [];
        for (let i = 0; i < data.length; i += 4) px.push([data[i], data[i + 1], data[i + 2]]);
        return px;
      }, layout, col);

      const diffs = focused.px.map((p, i) => {
        const b = blurred[i];
        return Math.abs(p[0] - b[0]) + Math.abs(p[1] - b[1]) + Math.abs(p[2] - b[2]);
      });
      // restrict to pixels genuinely changed by the ring (diff above noise floor)
      const candidateIdx = diffs.map((d, i) => (d > 25 ? i : -1)).filter((i) => i >= 0);
      if (candidateIdx.length === 0) {
        return { col, error: 'no-ring-pixels-found-in-window', focusedRow: focused.px, blurredRow: blurred };
      }
      let whiteIdx = candidateIdx[0], whiteBright = -1;
      let darkIdx = candidateIdx[0], darkBright = 1e9;
      for (const i of candidateIdx) {
        const p = focused.px[i];
        const b = p[0] + p[1] + p[2];
        if (b > whiteBright) { whiteBright = b; whiteIdx = i; }
        if (b < darkBright) { darkBright = b; darkIdx = i; }
      }
      const whitePixel = focused.px[whiteIdx], darkPixel = focused.px[darkIdx];
      const bgAtWhitePos = blurred[whiteIdx], bgAtDarkPos = blurred[darkIdx];
      return {
        col, whitePixel, darkPixel, bgAtWhitePos, bgAtDarkPos,
        whiteVsBg: contrast(whitePixel, bgAtWhitePos),
        darkVsBg: contrast(darkPixel, bgAtDarkPos),
        whiteVsDark: contrast(whitePixel, darkPixel),
        candidatesFound: candidateIdx.length,
      };
    }

    const scans = [];
    for (const col of [0, 1, 2, 3, 4]) {
      const s = await scanEdgeAtTile(col);
      scans.push(s);
      log(`[D] Corrected ring scan col=${col}:`, JSON.stringify(s));
    }
    R.desktop.correctedRingScans = scans;
    const valid = scans.filter((s) => !s.error);
    if (valid.length) {
      R.desktop.ringWorstCaseVsBg_corrected = Math.min(...valid.map((s) => Math.max(s.whiteVsBg, s.darkVsBg)));
      log('[D] CORRECTED ring worst-case (best-tone-per-tile, worst-across-tiles) vs bg:', R.desktop.ringWorstCaseVsBg_corrected.toFixed(2));
    }

    // ---- Rhythm badge — BLUECHIPS (sparse mines, default world), fast clicks
    // inside 1400ms window, retry across up to 15 fresh rounds. ----
    let badgeFound = null;
    let roundsAttempted = 0;
    for (let round = 0; round < 15 && !badgeFound; round++) {
      roundsAttempted++;
      await page.goto(URL, { waitUntil: 'networkidle0' });
      await sleep(600);
      const ctaR = await page.$('[data-testid="vault-ctl-cta"]');
      if (ctaR) { await ctaR.click(); await sleep(700); }
      for (let t = 0; t < 8; t++) {
        const stillPlaying = await page.evaluate(() => document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('role') === 'grid');
        if (!stillPlaying) break;
        const box = await page.evaluate(() => { const cv = document.querySelector('[data-testid="vault-grid-canvas"]'); const r = cv.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
        const cols = 5, rows = 5;
        const col = t % cols, row = Math.floor(t / cols) % rows;
        await page.mouse.click(box.x + box.w * ((col + 0.5) / cols), box.y + box.h * ((row + 0.5) / rows));
        await sleep(180); // well inside RHYTHM_WINDOW_MS=1400
        const badge = await page.evaluate(() => {
          const b = document.querySelector('[data-testid="vault-rhythm-badge"]');
          if (!b) return null;
          const label = b.querySelector('span:last-child');
          const cs = label ? getComputedStyle(label) : null;
          const csBg = getComputedStyle(b);
          const rect = b.getBoundingClientRect();
          return { tier: b.getAttribute('data-tier'), ariaLive: b.getAttribute('aria-live'), text: b.textContent, color: cs?.color, bg: csBg.backgroundColor, rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height } };
        });
        if (badge) { badgeFound = badge; break; }
      }
    }
    R.desktop.rhythmBadgeRoundsAttempted = roundsAttempted;
    R.desktop.rhythmBadgeFound = badgeFound;
    log('[D] FIX5 rhythm badge found after', roundsAttempted, 'round(s):', JSON.stringify(badgeFound));
    if (badgeFound) {
      const shot = await page.screenshot({ clip: { x: Math.max(0, badgeFound.rect.x - 6), y: Math.max(0, badgeFound.rect.y - 6), width: badgeFound.rect.w + 12, height: badgeFound.rect.h + 12 } });
      fs.writeFileSync(`${OUT}/desktop-rhythmbadge-bluechips-crop.png`, shot);
      const underlyingCanvasPixel = await page.evaluate((rect) => {
        const canvas = document.querySelector('[data-testid="vault-grid-canvas"]');
        const cr = canvas.getBoundingClientRect();
        const ctx = canvas.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const localX = (rect.x + rect.w / 2 - cr.left) * dpr;
        const localY = (rect.y + rect.h / 2 - cr.top) * dpr;
        if (localX < 0 || localY < 0 || localX > canvas.width || localY > canvas.height) return null;
        const d = ctx.getImageData(Math.round(localX), Math.round(localY), 1, 1).data;
        return [d[0], d[1], d[2]];
      }, badgeFound.rect);
      R.desktop.rhythmBadgeUnderlyingCanvasPixel = underlyingCanvasPixel;
      // parse computed 'rgb(r,g,b)' color strings to arrays for contrast calc
      const parseRgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      const labelRgb = parseRgb(badgeFound.color);
      if (underlyingCanvasPixel) {
        R.desktop.rhythmBadgeLabelVsUnderlyingCanvas = contrast(labelRgb, underlyingCanvasPixel);
        log('[D] FIX5 badge label color', labelRgb, 'vs raw underlying canvas pixel', underlyingCanvasPixel, '-> contrast', R.desktop.rhythmBadgeLabelVsUnderlyingCanvas.toFixed(2));
      }
    }

    // ---- liveDot under reduced-motion, confirmed 'playing' phase first ----
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await sleep(700);
    const ctaLD = await page.$('[data-testid="vault-ctl-cta"]');
    if (ctaLD) { await ctaLD.click(); }
    let phaseConfirmed = false;
    for (let i = 0; i < 20; i++) {
      const role = await page.evaluate(() => document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('role'));
      if (role === 'grid') { phaseConfirmed = true; break; }
      await sleep(200);
    }
    R.desktop.liveDot_phaseConfirmedPlaying = phaseConfirmed;
    const liveDotAnim3 = await page.evaluate(() => {
      const spans = Array.from(document.querySelectorAll('span'));
      const liveText = spans.find((s) => s.textContent?.trim() === 'LIVE' && s.children.length === 0 === false);
      const liveBadgeCandidates = spans.filter((s) => /LIVE/.test(s.textContent || '') && s.textContent.trim().length < 8);
      if (liveBadgeCandidates.length === 0) return { found: false };
      const liveBadge = liveBadgeCandidates[0];
      const dot = liveBadge.firstElementChild;
      return { found: true, dotAnimationName: dot ? getComputedStyle(dot).animationName : null, badgeHTML: liveBadge.outerHTML.slice(0, 200) };
    });
    R.desktop.reducedMotion_liveDot_final = liveDotAnim3;
    log('[D] (final) liveDot under reduce, phase-confirmed-playing:', phaseConfirmed, JSON.stringify(liveDotAnim3));

    fs.writeFileSync(`${OUT}/results-part3.json`, JSON.stringify(R, null, 2));
    log('\n=== PART3 RESULTS WRITTEN ===');
  } finally {
    if (browser) await browser.close().catch(() => {});
    try { execSync(`taskkill /pid ${devProc.pid} /T /F`, { stdio: 'ignore' }); } catch (e) { log('taskkill warn:', e.message); }
  }
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
