// HOLISTIC AUDIT 2026-07-03 — rg-c5 lane, board-gap precision check.
// Re-derives grid.x/full/pad EXACTLY per VaultGridCanvas.tsx's computeGridLayout
// (the `wide` branch, since 1440x900/1920x1080 both have W/H > 1.2), and
// compares the predicted `rightEdge` (per source, incl. the drawTerminalPanel
// pad term) against the LIVE measured left edge of the BetEntry right gutter
// column, to verify BETENTRY_PANEL_GAP=32 actually lands, and whether the
// panel overlaps the visible board panel at all.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5309';
const OUT = 'shots-holisticaudit0703/rgc5';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickText(page, t, within) {
  const h = await page.evaluateHandle(({ t, within }) => {
    const root = within ? document.querySelector(within) : document;
    if (!root) return null;
    const els = [...root.querySelectorAll('button,[role=button]')];
    return (
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
  }, { t, within });
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}

async function probeGap(page, gridSize) {
  return await page.evaluate((gridSize) => {
    const canvas = document.querySelector('canvas');
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]');
    const right = document.querySelector('[data-testid="vault-betentry-right"]');
    if (!canvas || !right) return { found: false, hasCanvas: !!canvas, hasRight: !!right, hasShell: !!shell };
    const cRect = canvas.getBoundingClientRect();
    const W = cRect.width, H = cRect.height;
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
    const pad = Math.max(14, full * 0.045);
    const predictedRightEdge = x + full + pad; // shell/canvas-relative
    const predictedPanelLeftPage = cRect.left + predictedRightEdge + 32; // BETENTRY_PANEL_GAP=32

    const rRect = right.getBoundingClientRect();
    return {
      found: true,
      wide,
      canvasRect: { left: cRect.left, right: cRect.right, width: W, height: H },
      predictedBoardVisibleRightEdgePage: cRect.left + predictedRightEdge,
      predictedPanelLeftPage,
      actualPanelLeftPage: rRect.left,
      actualPanelRect: { top: rRect.top, left: rRect.left, right: rRect.right, bottom: rRect.bottom },
      deltaPredictedVsActual: rRect.left - predictedPanelLeftPage,
      actualGapFromBoardVisibleEdge: rRect.left - (cRect.left + predictedRightEdge),
      overlapsVisibleBoardPanel: rRect.left < (cRect.left + predictedRightEdge),
      viewportWidth: window.innerWidth,
      distanceToViewportRightEdge: window.innerWidth - rRect.right,
    };
  }, gridSize);
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  fs.mkdirSync(OUT, { recursive: true });
  const R = {};
  const viewports = [{ w: 1440, h: 900 }, { w: 1920, h: 1080 }];
  const worlds = [{ name: 'bluechips', gridSize: 5 }, { name: 'altseason', gridSize: 5 }, { name: 'shitcoin', gridSize: 7 }];

  for (const vp of viewports) {
    for (const world of worlds) {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
      await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
      await wait(500);
      await clickText(page, 'ape in');
      await wait(400);
      await clickText(page, world.name, '[data-testid="vault-betentry-world"]');
      await wait(400); // let onBoardLayout report at least one rAF frame
      const key = `${world.name}_${vp.w}x${vp.h}`;
      R[key] = await probeGap(page, world.gridSize);
      await page.screenshot({ path: `${OUT}/boardgap-${key}.png` });
      await page.close();
    }
  }

  await browser.close();
  fs.writeFileSync(`${OUT}/boardgap-results.json`, JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();
