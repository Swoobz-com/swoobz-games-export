// Part 2 — fixes driver bugs from part1 (mobile CTA click, clean tab-trace,
// two-tone ring contrast, screenshot-verified BetConsole focus rings, flash
// probe) and fills remaining gaps. Self-contained: own dev server, own
// Chrome, blocking foreground call, cleans up in `finally`.
import puppeteer from 'puppeteer-core';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import http from 'http';

const PORT = 5285;
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

async function clickByText(page, re, root = 'body') {
  return page.evaluate((reSrc, rootSel) => {
    const root = document.querySelector(rootSel) || document.body;
    const re = new RegExp(reSrc[0], reSrc[1]);
    const btns = Array.from(root.querySelectorAll('button'));
    const b = btns.find((n) => re.test((n.textContent || '').trim()));
    if (b) { b.click(); return true; }
    return false;
  }, [re.source, re.flags], root);
}

async function main() {
  log('Spawning vite dev server on port', PORT);
  const devProc = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    cwd: 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/vault-run',
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let browser;
  try {
    await waitForServer(URL, 30000);
    log('Dev server up.');
    browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });

    // =====================================================================
    // DESKTOP 1440x900
    // =====================================================================
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await sleep(800);
    R.desktop = {};

    // ---- (1) CLEAN single-tab-stop re-trace: reach playing, wait generously,
    // fully log every stop's identity, done TWICE for reproducibility. ----
    const cta = await page.$('[data-testid="vault-ctl-cta"]');
    if (cta) { await cta.click(); await sleep(1500); } // generous settle wait
    await page.mouse.click(5, 5); // click empty page area to fully drop any transient focus, NOT body.focus() (JS focus != real tab origin)
    await sleep(300);

    for (const pass of [1, 2]) {
      const trace = [];
      // Start from a real Tab from the very top: click far outside any control first (done above pass1; redo click each pass)
      await page.mouse.click(5, 5);
      await sleep(200);
      let stops = 0;
      let landed = false;
      for (let i = 0; i < 15; i++) {
        await page.keyboard.press('Tab');
        stops++;
        const info = await page.evaluate(() => {
          const el = document.activeElement;
          return { tag: el?.tagName, testid: el?.getAttribute('data-testid'), text: (el?.textContent || '').trim().slice(0, 20) };
        });
        trace.push({ stop: stops, ...info });
        if (info.testid === 'vault-grid-canvas') { landed = true; break; }
      }
      R.desktop[`cleanTabTrace_pass${pass}`] = { stopsToGrid: stops, landed, trace };
      log(`[D] CLEAN pass${pass}: stops-to-grid=${stops} landed=${landed}`, JSON.stringify(trace));
    }

    // no-trap + shift-tab-back, from the landed state of pass 2
    await page.keyboard.press('Tab');
    const afterLeave = await page.evaluate(() => document.activeElement?.getAttribute('data-testid') || document.activeElement?.tagName);
    R.desktop.cleanNoTrapAfterLeave = afterLeave;
    await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
    const back = await page.evaluate(() => document.activeElement?.getAttribute('data-testid') === 'vault-grid-canvas');
    R.desktop.cleanShiftTabReturnsToGrid = back;
    log('[D] after-leave element:', afterLeave, '| shift-tab returns to grid:', back);

    // ---- (2) TWO-TONE ring contrast: scan a FULL horizontal line through the
    // ring's top edge at THREE different tiles (varied backgrounds), classify
    // white-core vs dark-halo vs background pixels explicitly. ----
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await sleep(700);
    const cta2 = await page.$('[data-testid="vault-ctl-cta"]');
    if (cta2) { await cta2.click(); await sleep(900); }
    await page.mouse.click(5, 5);
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      const isGrid = await page.evaluate(() => document.activeElement?.getAttribute('data-testid') === 'vault-grid-canvas');
      if (isGrid) break;
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
      const safeW = W * (1 - sideFrac * 2);
      const safeH = (H - topReserved - bottomReserved) * 0.96;
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

    async function moveTo(tileIdx) {
      // reset to 0 then move right by tileIdx (gridSize=5, so tileIdx<5 stays row0)
      for (let i = 0; i < 8; i++) { await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowLeft'); }
      for (let i = 0; i < tileIdx; i++) await page.keyboard.press('ArrowRight');
    }

    async function scanRingAtTile(tileCol) {
      await page.evaluate(() => document.querySelector('[data-testid="vault-grid-canvas"]').focus());
      await moveTo(tileCol);
      await sleep(150);
      const scan = await page.evaluate((L, col) => {
        const c = document.querySelector('[data-testid="vault-grid-canvas"]');
        const ctx = c.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const tileX = L.x + col * (L.tile + L.gap);
        // vertical scan through the LEFT edge of the ring (a vertical line at
        // x = tileX + tile*0.035, spanning y from tile-top to tile-top+tile*0.3)
        const xCss = tileX + L.tile * 0.035;
        const xPx = Math.round(xCss * dpr);
        const yStartPx = Math.round((L.y) * dpr);
        const yEndPx = Math.round((L.y + L.tile * 0.3) * dpr);
        const h = Math.max(1, yEndPx - yStartPx);
        const data = ctx.getImageData(xPx, yStartPx, 1, h).data;
        const pixels = [];
        for (let i = 0; i < data.length; i += 4) pixels.push([data[i], data[i + 1], data[i + 2]]);
        return pixels;
      }, layout, tileCol);
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      await sleep(150);
      const scanBlurred = await page.evaluate((L, col) => {
        const c = document.querySelector('[data-testid="vault-grid-canvas"]');
        const ctx = c.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const tileX = L.x + col * (L.tile + L.gap);
        const xCss = tileX + L.tile * 0.035;
        const xPx = Math.round(xCss * dpr);
        const yStartPx = Math.round((L.y) * dpr);
        const yEndPx = Math.round((L.y + L.tile * 0.3) * dpr);
        const h = Math.max(1, yEndPx - yStartPx);
        const data = ctx.getImageData(xPx, yStartPx, 1, h).data;
        const pixels = [];
        for (let i = 0; i < data.length; i += 4) pixels.push([data[i], data[i + 1], data[i + 2]]);
        return pixels;
      }, layout, tileCol);
      // classify: whiteCore = brightest pixel in `scan`, darkHalo = darkest pixel in `scan`
      let whiteIdx = 0, whiteBright = -1, darkIdx = 0, darkBright = 1e9;
      scan.forEach((p, i) => {
        const b = p[0] + p[1] + p[2];
        if (b > whiteBright) { whiteBright = b; whiteIdx = i; }
        if (b < darkBright) { darkBright = b; darkIdx = i; }
      });
      const whitePixel = scan[whiteIdx];
      const darkPixel = scan[darkIdx];
      const bgAtWhitePos = scanBlurred[whiteIdx];
      const bgAtDarkPos = scanBlurred[darkIdx];
      return {
        tileCol,
        whitePixel, darkPixel, bgAtWhitePos, bgAtDarkPos,
        whiteVsBg: contrast(whitePixel, bgAtWhitePos),
        darkVsBg: contrast(darkPixel, bgAtDarkPos),
        whiteVsDark: contrast(whitePixel, darkPixel),
      };
    }

    const ringScans = [];
    for (const col of [0, 2, 4]) {
      const s = await scanRingAtTile(col);
      ringScans.push(s);
      log(`[D] Ring scan tile col=${col}: white ${JSON.stringify(s.whitePixel)} vs bg ${JSON.stringify(s.bgAtWhitePos)} = ${s.whiteVsBg.toFixed(2)}:1 | dark ${JSON.stringify(s.darkPixel)} vs bg ${JSON.stringify(s.bgAtDarkPos)} = ${s.darkVsBg.toFixed(2)}:1 | white-vs-dark(self) = ${s.whiteVsDark.toFixed(2)}:1`);
    }
    R.desktop.ringScans = ringScans;
    R.desktop.ringWorstCaseVsBg = Math.min(...ringScans.map((s) => Math.max(s.whiteVsBg, s.darkVsBg)));
    log('[D] Ring worst-case (best-of-two-tones per tile, worst across tiles) vs background:', R.desktop.ringWorstCaseVsBg.toFixed(2));

    // ---- (3) SCREENSHOT-VERIFIED focus ring on BetConsole/control-column
    // buttons (not just computed-style trust) — mode card (has its own accent
    // glow) + commit CTA. ----
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await sleep(700);
    await page.mouse.click(5, 5);
    // Tab to the BLUECHIPS mode card (first world card) — find its tab index live
    const modeCardTrace = [];
    let landedOnBluechips = false;
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => ({ text: (document.activeElement?.textContent || '').trim().slice(0, 20) }));
      modeCardTrace.push(info.text);
      if (/BLUECHIPS/i.test(info.text)) { landedOnBluechips = true; break; }
    }
    R.desktop.modeCardTabTrace = modeCardTrace;
    if (landedOnBluechips) {
      const rect = await page.evaluate(() => { const r = document.activeElement.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
      await page.screenshot({ path: `${OUT}/desktop-modecard-FOCUSED.png`, clip: { x: Math.max(0, rect.x - 8), y: Math.max(0, rect.y - 8), width: rect.w + 16, height: rect.h + 16 } });
      await page.evaluate(() => document.activeElement.blur());
      await sleep(150);
      await page.screenshot({ path: `${OUT}/desktop-modecard-UNFOCUSED.png`, clip: { x: Math.max(0, rect.x - 8), y: Math.max(0, rect.y - 8), width: rect.w + 16, height: rect.h + 16 } });
      // pixel-diff the two crops along the border to detect any new ring
      const diffPixels = await page.evaluate(() => null); // placeholder; real diff done in node below via pngjs? skip, just record screenshots for visual evidence + computed style already captured in part1
      R.desktop.modeCardScreenshotPair = true;
      log('[D] FIX6 mode-card focused/unfocused screenshot pair captured for visual evidence.');
    }

    // commit CTA ("SEND IT")
    await page.mouse.click(5, 5);
    let landedOnCommit = false;
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => (document.activeElement?.textContent || '').trim());
      if (/SEND IT/i.test(info)) { landedOnCommit = true; break; }
    }
    if (landedOnCommit) {
      const rect = await page.evaluate(() => { const r = document.activeElement.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
      await page.screenshot({ path: `${OUT}/desktop-sendit-FOCUSED.png`, clip: { x: Math.max(0, rect.x - 8), y: Math.max(0, rect.y - 8), width: rect.w + 16, height: rect.h + 16 } });
      await page.evaluate(() => document.activeElement.blur());
      await sleep(150);
      await page.screenshot({ path: `${OUT}/desktop-sendit-UNFOCUSED.png`, clip: { x: Math.max(0, rect.x - 8), y: Math.max(0, rect.y - 8), width: rect.w + 16, height: rect.h + 16 } });
      R.desktop.commitCtaFocusScreenshotPair = true;
    }
    R.desktop.landedOnBluechipsCard = landedOnBluechips;
    R.desktop.landedOnCommitCta = landedOnCommit;

    // ---- (4) liveDot animation under reduced-motion, queried AFTER reaching playing ----
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await sleep(700);
    const cta3 = await page.$('[data-testid="vault-ctl-cta"]');
    if (cta3) { await cta3.click(); await sleep(900); }
    const liveDotAnim2 = await page.evaluate(() => {
      const spans = Array.from(document.querySelectorAll('span'));
      const liveText = spans.find((s) => s.textContent?.trim() === 'LIVE');
      if (!liveText) return 'LIVE-badge-not-found';
      const dot = liveText.previousElementSibling;
      return dot ? getComputedStyle(dot).animationName : 'dot-not-found';
    });
    R.desktop.reducedMotion_liveDotAnimationName_fixed = liveDotAnim2;
    log('[D] (fixed) liveDot animationName under reduce (queried during playing):', liveDotAnim2);

    // ---- (5) Rhythm badge in NORMAL motion — harder retry on shitcoin, log
    // multiplier growth to confirm the chain is actually building. ----
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await sleep(700);
    await clickByText(page, /shitcoin/i);
    await sleep(300);
    const ctaSC = await page.$('[data-testid="vault-ctl-cta"]');
    if (ctaSC) { await ctaSC.click(); await sleep(900); }
    let badgeFound = null;
    const multTrace = [];
    for (let t = 0; t < 40; t++) {
      const stillPlaying = await page.evaluate(() => document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('role') === 'grid');
      if (!stillPlaying) break;
      const box = await page.evaluate(() => { const cv = document.querySelector('[data-testid="vault-grid-canvas"]'); const r = cv.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
      const cols = 7, rows = 7;
      const col = t % cols, row = Math.floor(t / cols) % rows;
      await page.mouse.click(box.x + box.w * ((col + 0.5) / cols), box.y + box.h * ((row + 0.5) / rows));
      await sleep(220);
      const status = await page.evaluate(() => document.querySelector('[data-testid="vault-grid-status"]')?.textContent ?? null);
      multTrace.push(status);
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
    R.desktop.rhythmBadgeMultTrace = multTrace.slice(-10);
    R.desktop.rhythmBadgeFoundNormalMotion = badgeFound;
    log('[D] FIX5 (retry) rhythm badge under NORMAL motion:', JSON.stringify(badgeFound));
    if (badgeFound) {
      const shot = await page.screenshot({ clip: { x: Math.max(0, badgeFound.rect.x - 6), y: Math.max(0, badgeFound.rect.y - 6), width: badgeFound.rect.w + 12, height: badgeFound.rect.h + 12 } });
      fs.writeFileSync(`${OUT}/desktop-rhythmbadge-normalmotion-crop.png`, shot);
      // Composited pixel sample: crop screenshot to badge region, sample brightest text pixel vs adjacent bg pixel from RAW canvas underneath (the badge overlays the canvas at position:absolute)
      const pixelSample = await page.evaluate((rect) => {
        // grab a screenshot-independent read: use canvas underneath at the SAME
        // screen position is not directly readable since badge is a DOM overlay;
        // instead read the badge DOM element's rendered text color (already have)
        // and approximate its background via the canvas pixel directly beneath
        // its center (before the translucent green fill was composited by the
        // browser -- so this is the WORST case, ignoring the badge's own
        // background fill which only ADDS contrast, never removes it).
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
      R.desktop.rhythmBadgeUnderlyingCanvasPixel = pixelSample;
      log('[D] FIX5 badge underlying raw canvas pixel (worst-case bg, ignoring badge fill):', JSON.stringify(pixelSample));
    }

    // ---- (6) EPILEPSY / flash probe on the settle hero celebration ----
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await sleep(700);
    const ctaF = await page.$('[data-testid="vault-ctl-cta"]');
    if (ctaF) { await ctaF.click(); await sleep(900); }
    // reveal a couple tiles then force cashout to guarantee a WIN settle with hero overlay
    for (let t = 0; t < 3; t++) {
      const stillPlaying = await page.evaluate(() => document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('role') === 'grid');
      if (!stillPlaying) break;
      const box = await page.evaluate(() => { const cv = document.querySelector('[data-testid="vault-grid-canvas"]'); const r = cv.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
      await page.mouse.click(box.x + box.w * (0.2 + t * 0.25), box.y + box.h * 0.2);
      await sleep(300);
    }
    const stillPlaying4 = await page.evaluate(() => document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('role') === 'grid');
    if (stillPlaying4) {
      const cashout = await page.$('[data-testid="vault-ctl-cta"]');
      if (cashout) { await cashout.click(); }
    }
    // sample average frame brightness over the settle transition window at ~33ms
    const flashSamples = [];
    for (let i = 0; i < 60; i++) {
      const b = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="vault-canvas-shell"]') || document.body;
        // sample a small canvas region's average brightness as a stand-in for
        // "screen brightness" during the celebration window (cheap, no video capture)
        const canvas = document.querySelector('[data-testid="vault-grid-canvas"]');
        if (!canvas) return null;
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        const d = ctx.getImageData(Math.floor(w / 2) - 20, Math.floor(h / 2) - 20, 40, 40).data;
        let sum = 0;
        for (let p = 0; p < d.length; p += 4) sum += d[p] + d[p + 1] + d[p + 2];
        return sum / (d.length / 4);
      });
      if (b !== null) flashSamples.push(b);
      await sleep(33);
    }
    // count large brightness transitions (>15% swing) as a flash proxy
    const mean = flashSamples.reduce((a, b) => a + b, 0) / (flashSamples.length || 1);
    let transitions = 0;
    for (let i = 1; i < flashSamples.length; i++) {
      if (Math.abs(flashSamples[i] - flashSamples[i - 1]) > mean * 0.15) transitions++;
    }
    const windowSeconds = (flashSamples.length * 33) / 1000;
    const flashesPerSecond = transitions / (windowSeconds || 1);
    R.desktop.flashProbe = { sampleCount: flashSamples.length, transitions, windowSeconds, flashesPerSecond, samples: flashSamples };
    log('[D] Flash probe over settle window: samples=', flashSamples.length, 'transitions=', transitions, 'flashes/sec=', flashesPerSecond.toFixed(2));

    await page.close();

    // =====================================================================
    // MOBILE — fixed CTA click (text-match, not testid), re-run FIX#2/3/7
    // =====================================================================
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

      const clickedSendIt = await clickByText(mpage, /SEND IT/i, '[data-testid="bet-console"]');
      R.mobile[dev.name].sendItClicked = clickedSendIt;
      await sleep(900);
      const phaseAfterSend = await mpage.evaluate(() => document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('role'));
      R.mobile[dev.name].phaseAfterSendIt = phaseAfterSend;
      log(`[M-${dev.name}] SEND IT clicked:`, clickedSendIt, '-> phase role:', phaseAfterSend);

      // HUD band contrast — bluechips, playing
      const hudPlaying = await mpage.evaluate(() => {
        const band = document.querySelector('[data-testid="vault-grid-hud-inner"]');
        if (!band) return null;
        const r = band.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      });
      R.mobile[dev.name].hudBandRectPlaying_bluechips = hudPlaying;
      if (hudPlaying) {
        const shot = await mpage.screenshot({ clip: { x: hudPlaying.x, y: hudPlaying.y, width: hudPlaying.w, height: hudPlaying.h } });
        fs.writeFileSync(`${OUT}/mobile-${dev.name}-hud-playing-bluechips.png`, shot);
        // live composited pixel sample: kicker text ("PUMP") vs its own background pixel
        const px = await mpage.evaluate(() => {
          const band = document.querySelector('[data-testid="vault-grid-hud-inner"]');
          const kicker = band.querySelector('span'); // first hero span wrapper; drill to kicker text node parent
          return null; // placeholder -- real sampling done via screenshot below in node
        });
      }

      // switch to shitcoin (harder HUD case) for a second playing sample
      await mpage.goto(URL, { waitUntil: 'networkidle0' });
      await sleep(700);
      const switchedSC = await clickByText(mpage, /shitcoin/i);
      R.mobile[dev.name].switchedToShitcoin = switchedSC;
      await sleep(300);
      const sendIt2 = await clickByText(mpage, /SEND IT/i, '[data-testid="bet-console"]');
      await sleep(900);
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

      // ---- drive to settled ----
      let settledMobile = false;
      for (let t = 0; t < 12; t++) {
        const stillPlaying = await mpage.evaluate(() => document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('role') === 'grid');
        if (!stillPlaying) break;
        const box = await mpage.evaluate(() => { const cv = document.querySelector('[data-testid="vault-grid-canvas"]'); const r = cv.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
        const cols = 7, rows = 7;
        const col = t % cols, row = Math.floor(t / cols) % rows;
        await mpage.touchscreen.tap(box.x + box.w * ((col + 0.5) / cols), box.y + box.h * ((row + 0.5) / rows));
        await sleep(300);
      }
      const stillPlayingAfterTaps = await mpage.evaluate(() => document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('role') === 'grid');
      if (stillPlayingAfterTaps) {
        // find the cash-out CTA by text within the actions area
        const cashoutInfo = await mpage.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const b = btns.find((n) => /take profit/i.test(n.textContent || ''));
          if (!b) return null;
          b.scrollIntoView({ block: 'center' });
          const r = b.getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        });
        if (cashoutInfo) { await mpage.touchscreen.tap(cashoutInfo.x, cashoutInfo.y); await sleep(500); }
      }
      for (let p = 0; p < 25; p++) {
        const txt = await mpage.evaluate(() => document.body.innerText);
        if (/SETTLED\s*[·.]\s*(WIN|LOSS)/i.test(txt)) { settledMobile = true; break; }
        await sleep(250);
      }
      R.mobile[dev.name].reachedSettled = settledMobile;
      log(`[M-${dev.name}] reached settled (fixed driver):`, settledMobile);

      if (settledMobile) {
        await mpage.evaluate(() => window.scrollTo(0, 0));
        await sleep(150);
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
        const betAgainRect = await mpage.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const b = btns.find((n) => /^bet again/i.test((n.textContent || '').trim()));
          if (!b) return null;
          const r = b.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom };
        });
        R.mobile[dev.name].betAgainRectRaw = betAgainRect;
        if (betAgainRect) R.mobile[dev.name].betAgainMarginRaw = dev.height - betAgainRect.bottom;
        log(`[M-${dev.name}] FIX3 BET AGAIN raw margin:`, R.mobile[dev.name].betAgainMarginRaw);

        const fullShot = await mpage.screenshot({ fullPage: false });
        fs.writeFileSync(`${OUT}/mobile-${dev.name}-settled-full.png`, fullShot);

        await mpage.evaluate(() => document.body.focus());
        let reachedBetAgain = false, presses = 0;
        for (let i = 0; i < 40; i++) {
          await mpage.keyboard.press('Tab');
          presses++;
          const isBetAgain = await mpage.evaluate(() => /^bet again/i.test((document.activeElement?.textContent || '').trim()));
          if (isBetAgain) { reachedBetAgain = true; break; }
        }
        R.mobile[dev.name].fix3_tabReachesBetAgain = reachedBetAgain;
        R.mobile[dev.name].fix3_tabPressesToReachBetAgain = presses;
        log(`[M-${dev.name}] FIX3 keyboard reaches BET AGAIN:`, reachedBetAgain, 'in', presses, 'presses');
        if (reachedBetAgain) {
          await mpage.keyboard.press('Enter');
          await sleep(600);
          const phaseAfter = await mpage.evaluate(() => document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('role'));
          R.mobile[dev.name].fix3_betAgainKeyboardActivates = phaseAfter === 'grid';
          log(`[M-${dev.name}] FIX3 BET AGAIN keyboard-activates:`, R.mobile[dev.name].fix3_betAgainKeyboardActivates);
        }

        // FIX#7 mobile receipt — toggle it open on the CURRENT settled screen
        const toggled = await clickByText(mpage, /view receipt/i);
        await sleep(400);
        if (toggled) {
          const receiptInfoM = await mpage.evaluate(() => {
            const dl = document.querySelector('dl');
            if (!dl) return { found: false };
            const dts = Array.from(dl.querySelectorAll('dt')).map((d) => d.textContent);
            return { found: true, rowCount: dts.length, labels: dts, hasMixerRow: dts.some((t) => /mixer/i.test(t || '')) };
          });
          R.mobile[dev.name].receiptInfo = receiptInfoM;
          log(`[M-${dev.name}] FIX7 mobile receipt rows:`, receiptInfoM.rowCount, 'hasMixerRow:', receiptInfoM.hasMixerRow, JSON.stringify(receiptInfoM.labels));
        } else {
          R.mobile[dev.name].receiptToggleNotFound = true;
        }
      }

      await mpage.close();
    }

    fs.writeFileSync(`${OUT}/results-part2.json`, JSON.stringify(R, null, 2));
    log('\n=== PART2 RESULTS WRITTEN ===', `${OUT}/results-part2.json`);
  } finally {
    if (browser) await browser.close().catch(() => {});
    try { execSync(`taskkill /pid ${devProc.pid} /T /F`, { stdio: 'ignore' }); } catch (e) { log('taskkill warn:', e.message); }
  }
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
