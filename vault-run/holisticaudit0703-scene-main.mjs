// Holistic audit — 3D/canvas-scene lane, adapted for Vault's flat 2D canvas.
// Measures: real fps, onBoardLayout call frequency, asset 404s, missing-tex
// purple pixels, tile/panel alignment (shitcoin 7x7), viewport resize glitching.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5313';
const SHOTDIR = 'shots-holisticaudit0703/scene';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return (
      els.find((e) => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}

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

async function injectInstrumentation(page) {
  // Runs BEFORE any page script — installs:
  //  1) a fake React DevTools global hook so we can count fiber-root commits
  //     (a real re-render of VaultExperience shows up as a commit; if
  //     onBoardLayout's setState fires every rAF tick, commits will track
  //     the rAF cadence instead of staying near-zero at steady state).
  //  2) a CanvasRenderingContext2D.clearRect counter (VaultGridCanvas's
  //     frame() calls ctx.clearRect(0,0,W,H) exactly once per rAF tick —
  //     a direct proxy for the app's actual per-frame draw-loop rate).
  await page.evaluateOnNewDocument(() => {
    window.__commitCount = 0;
    window.__commitLog = [];
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      isDisabled: false,
      supportsFiber: true,
      renderers: new Map(),
      inject(renderer) {
        const id = this.renderers.size + 1;
        this.renderers.set(id, renderer);
        return id;
      },
      onCommitFiberRoot(id, root, priority) {
        window.__commitCount++;
        window.__commitLog.push(performance.now());
      },
      onCommitFiberUnmount() {},
      onPostCommitFiberRoot() {},
      checkDCE() {},
    };

    window.__clearRectCount = 0;
    const origClearRect = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      window.__clearRectCount++;
      return origClearRect.apply(this, args);
    };

    // Track any drawImage calls with undefined/broken image args (a proxy
    // for "missing asset drawn as blank/undefined" in a pure-canvas game —
    // Vault appears to draw everything procedurally with fillRect/arc/text,
    // not drawImage, but we instrument it anyway in case any world adds
    // image-based icons later).
    window.__drawImageCalls = [];
    const origDrawImage = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (img, ...rest) {
      const broken = !img || (img.complete === false) || (img.naturalWidth === 0 && img.tagName === 'IMG');
      if (broken) window.__drawImageCalls.push({ broken, src: img && img.src });
      return origDrawImage.apply(this, [img, ...rest]);
    };
  });
}

async function goWorldAndPlay(page, world) {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(600);
  await clickText(page, 'ape in');
  await wait(500);
  if (world !== 'BLUECHIPS') {
    await clickTextWithin(page, '[data-testid="vault-betentry-world"]', world);
    await wait(300);
  }
  await clickText(page, 'send it');
  await wait(900);
}

async function measureFpsAndCallbacks(page, ms = 3000) {
  await page.evaluate(() => {
    window.__commitCount = 0;
    window.__commitLog = [];
    window.__clearRectCount = 0;
  });
  const t0 = Date.now();
  const rafCount = await page.evaluate((durationMs) => new Promise((resolve) => {
    let frames = 0;
    const start = performance.now();
    function measure() {
      frames++;
      if (performance.now() - start < durationMs) {
        requestAnimationFrame(measure);
      } else {
        resolve(frames);
      }
    }
    requestAnimationFrame(measure);
  }), ms);
  const elapsedMs = Date.now() - t0;
  const { commitCount, clearRectCount, commitLog } = await page.evaluate(() => ({
    commitCount: window.__commitCount,
    clearRectCount: window.__clearRectCount,
    commitLog: window.__commitLog.slice(),
  }));
  const fps = rafCount / (elapsedMs / 1000);
  const clearRectFps = clearRectCount / (elapsedMs / 1000);
  return { fps, clearRectFps, commitCount, elapsedMs, rafCount, clearRectCount, commitLog };
}

async function purplePixelCheck(page) {
  return await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return { found: false, reason: 'no canvas' };
    const r = c.getBoundingClientRect();
    const off = document.createElement('canvas');
    off.width = c.width; off.height = c.height;
    const octx = off.getContext('2d');
    octx.drawImage(c, 0, 0);
    const samples = [];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const x = Math.floor((c.width * (i + 0.5)) / 3);
        const y = Math.floor((c.height * (j + 0.5)) / 3);
        const d = octx.getImageData(x, y, 1, 1).data;
        samples.push({ x, y, r: d[0], g: d[1], b: d[2], a: d[3] });
      }
    }
    const purpleHits = samples.filter(
      (s) => Math.abs(s.r - 255) <= 10 && Math.abs(s.g - 0) <= 10 && Math.abs(s.b - 255) <= 10
    );
    return { found: purpleHits.length > 0, purpleHits, samples };
  });
}

async function tileAlignmentProbe(page, gridSize) {
  // Sample the canvas grid layout math the same way clean-singleround.mjs
  // does, then check text/tile bounding via pixel inspection at tile
  // centers vs tile-edge midpoints for bleed/overlap signatures.
  return await page.evaluate((g) => {
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    const W = r.width, H = r.height;
    const tR = H * 0.15, bR = H * 0.18, sF = 0.08;
    const sW = W * (1 - sF * 2);
    const sH = (H - tR - bR) * 0.96;
    const av = Math.min(sW, sH);
    const gap = Math.max(6, av * 0.026);
    const tile = (av - gap * (g - 1)) / g;
    const full = tile * g + gap * (g - 1);
    const x0 = (W - full) / 2;
    const by = tR + (H - tR - bR) / 2;
    const y0 = by - full / 2;
    return {
      canvasW: W, canvasH: H, tile, gap, full, x0, y0,
      rightEdgePx: r.left + x0 + full,
      panelBleedRight: (r.left + x0 + full) - r.right,
      panelBleedLeft: (r.left + x0) - r.left,
      lastTileBottom: y0 + full,
      belowCanvas: (y0 + full) - H,
    };
  }, gridSize);
}

const results = {};

const HEADLESS = process.argv[3] !== 'headed';
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: HEADLESS ? 'new' : false,
  defaultViewport: HEADLESS ? { width: 1440, height: 900 } : null,
  args: HEADLESS ? [] : ['--window-size=1460,980'],
});
try {
  const page = await browser.newPage();
  await injectInstrumentation(page);
  await page.setViewport({ width: 1440, height: 900 });

  const failures = [];
  page.on('response', (resp) => {
    const url = resp.url();
    if (resp.status() >= 400 && /\.(glb|gltf|bin|png|jpg|jpeg|webp|ktx2|svg)(\?|$)/i.test(url)) {
      failures.push(`${resp.status()} ${url}`);
    }
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') results.consoleErrors = (results.consoleErrors || []).concat(msg.text());
  });

  const worlds = [
    { name: 'BLUECHIPS', gridSize: 5 },
    { name: 'ALTSEASON', gridSize: 5 },
    { name: 'SHITCOIN', gridSize: 7 },
  ];

  for (const w of worlds) {
    console.log(`=== ${w.name} ===`);
    await goWorldAndPlay(page, w.name);
    await wait(500);

    // Commits fired during the ENTIRE lobby->bet-entry->world-select->send-it
    // transition (legitimate layout-change territory: mount + world change +
    // phase change from bet-entry to playing all plausibly move the board).
    const preSteadyStateCommits = await page.evaluate(() => window.__commitCount);
    console.log(`${w.name} commits during mount->playing transition: ${preSteadyStateCommits}`);

    const purple = await purplePixelCheck(page);
    const align = await tileAlignmentProbe(page, w.gridSize);
    const perf = await measureFpsAndCallbacks(page, 3000);
    const drawImageCalls = await page.evaluate(() => window.__drawImageCalls.slice());

    await page.screenshot({ path: `${SHOTDIR}/${w.name.toLowerCase()}-playing-1440x900.png` });

    results[w.name] = { purple, align, perf, drawImageCalls };
    console.log(`${w.name} fps(raf)=${perf.fps.toFixed(1)} fps(clearRect)=${perf.clearRectFps.toFixed(1)} commitCount(3s)=${perf.commitCount} purpleFound=${purple.found}`);
  }

  results.assetFailures = failures;

  // ---- Resize test: same live page, no reload, across viewport range ----
  console.log('=== resize sequence (SHITCOIN board still mounted) ===');
  const resizeSeq = [
    { w: 1024, h: 768, tag: '1024x768' },
    { w: 1440, h: 900, tag: '1440x900' },
    { w: 1920, h: 1080, tag: '1920x1080' },
    { w: 1440, h: 1920, tag: '1440x1920' },
  ];
  const resizeResults = [];
  for (const step of resizeSeq) {
    await page.evaluate(() => { window.__commitCount = 0; });
    await page.setViewport({ width: step.w, height: step.h });
    await wait(500);
    const commitsDuringResize = await page.evaluate(() => window.__commitCount);
    const canvasState = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      if (!c) return null;
      const r = c.getBoundingClientRect();
      return { cssW: r.width, cssH: r.height, bufW: c.width, bufH: c.height };
    });
    const snap = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      const off = document.createElement('canvas');
      off.width = 8; off.height = 8;
      const octx = off.getContext('2d');
      octx.drawImage(c, 0, 0, 8, 8);
      return [...octx.getImageData(0, 0, 8, 8).data].join(',');
    });
    await page.screenshot({ path: `${SHOTDIR}/resize-${step.tag}.png` });
    resizeResults.push({ ...step, canvasState, snapHash: snap.length, commitsDuringResize });
    console.log(`resize ${step.tag}:`, JSON.stringify(canvasState), `commits=${commitsDuringResize}`);
    // Follow-up: hold still for another 1s post-resize with NO further
    // viewport change, and confirm commits settle back to 0 (i.e. the
    // ResizeObserver-triggered relayout fires once, not continuously).
    await page.evaluate(() => { window.__commitCount = 0; });
    await wait(1000);
    const commitsAfterSettle = await page.evaluate(() => window.__commitCount);
    resizeResults[resizeResults.length - 1].commitsAfterSettle = commitsAfterSettle;
    console.log(`  post-settle (1s, no further resize) commits=${commitsAfterSettle}`);
  }
  results.resizeResults = resizeResults;

  fs.writeFileSync('holisticaudit0703-scene-results.json', JSON.stringify(results, null, 2));
  console.log('DONE. Results written to holisticaudit0703-scene-results.json');
} finally {
  await browser.close();
}
