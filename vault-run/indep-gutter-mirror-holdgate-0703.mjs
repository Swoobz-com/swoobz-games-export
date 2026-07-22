// INDEPENDENT holdgate verification for the RIGHT-GUTTER MIRROR
// (vault-side-margin-chrome continuation, 2026-07-03). Written fresh by the
// visual-regression QA agent -- own math, own selectors, own screenshots.
// Does NOT import/reuse the maker's gutter-mirror-verify.mjs or its JSON.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5181';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = {};

async function clickByText(page, needle) {
  const handle = await page.evaluateHandle((needle) => {
    const nodes = Array.from(document.querySelectorAll('button,[role="button"]'));
    const visible = nodes.filter((n) => n.offsetParent !== null);
    return (
      visible.find((n) => n.textContent.trim().toLowerCase() === needle.toLowerCase()) ||
      visible.find((n) => n.textContent.toLowerCase().includes(needle.toLowerCase()))
    );
  }, needle);
  const el = handle.asElement();
  if (!el) return false;
  await el.click();
  return true;
}

// Independent re-derivation of the game's own grid-safe-area formula, read
// directly from originals/vault/VaultGridCanvas.tsx:842-863 (computeGridLayout)
// by the QA agent (not copied from any driver): wide=W/H>1.2;
// topReserved/bottomReserved = H*(wide?0.12:0.15)/(wide?0.14:0.18);
// sideFrac=0.08 -> safeW=W*0.84; safeH=(H-top-bottom)*0.96;
// available=min(safeW,safeH); full===available (exact, no rounding slop);
// gridLeft = shellLeft + (W-available)/2; gridRight = shellLeft + W - (W-available)/2.
async function gridSafeEdges(page) {
  return page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]');
    if (!shell) return null;
    const r = shell.getBoundingClientRect();
    const W = r.width, H = r.height;
    const wide = W / H > 1.2;
    const topReserved = H * (wide ? 0.12 : 0.15);
    const bottomReserved = H * (wide ? 0.14 : 0.18);
    const safeW = W * (1 - 0.08 * 2);
    const safeH = (H - topReserved - bottomReserved) * 0.96;
    const available = Math.min(safeW, safeH);
    return {
      shellLeft: r.left, shellW: W, shellH: H,
      gridLeft: r.left + (W - available) / 2,
      gridRight: r.left + W - (W - available) / 2,
    };
  });
}

async function rectAndStyle(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      top: r.top, left: r.left, right: r.right, bottom: r.bottom,
      width: r.width, height: r.height,
      backgroundColor: cs.backgroundColor,
      backgroundImage: cs.backgroundImage,
      backdropFilter: cs.backdropFilter,
      display: cs.display,
      flexDirection: cs.flexDirection,
      alignItems: cs.alignItems,
    };
  }, sel);
}

async function cyanCount(page) {
  return page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('body *'));
    let hits = 0;
    for (const el of els) {
      const cs = getComputedStyle(el);
      for (const p of [cs.color, cs.backgroundColor, cs.borderColor]) {
        const m = p.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
        if (m) {
          const rr = +m[1], gg = +m[2], bb = +m[3], aa = m[4] === undefined ? 1 : +m[4];
          if (aa > 0.05 && rr < 90 && gg > 160 && bb > 160 && Math.abs(gg - bb) < 70) hits++;
        }
      }
    }
    return hits;
  });
}

async function domPresence(page, sel) {
  return page.evaluate((sel) => !!document.querySelector(sel), sel);
}

function clip(rect, pad) {
  if (!rect) return undefined;
  return {
    x: Math.max(0, Math.round(rect.left - pad)),
    y: Math.max(0, Math.round(rect.top - pad)),
    width: Math.round(rect.width + pad * 2),
    height: Math.round(rect.height + pad * 2),
  };
}

async function driveToPlaying(page) {
  await clickByText(page, 'ape in');
  await wait(450);
  await clickByText(page, 'send it');
  await wait(700);
}

async function driveToSettled(page, gridSize = 5) {
  // Click a spread of tiles by re-deriving tile centers from the SAME
  // computeGridLayout formula (own math), then fall back to Take Profit.
  for (let attempt = 0; attempt < 14; attempt++) {
    const isSettled = await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'));
    if (isSettled) return true;
    const idx = [1, 7, 13, 19, 21, 3, 9, 15, 0, 24, 5, 11, 17, 23][attempt] ?? 2;
    const pt = await page.evaluate(({ idx, g }) => {
      const c = document.querySelector('canvas');
      const r = c.getBoundingClientRect();
      const W = r.width, H = r.height;
      const wide = W / H > 1.2;
      const topR = H * (wide ? 0.12 : 0.15);
      const botR = H * (wide ? 0.14 : 0.18);
      const safeW = W * 0.84;
      const safeH = (H - topR - botR) * 0.96;
      const available = Math.min(safeW, safeH);
      const gap = Math.max(6, available * 0.026);
      const tile = (available - gap * (g - 1)) / g;
      const full = tile * g + gap * (g - 1);
      const x0 = (W - full) / 2;
      const centerY = topR + (H - topR - botR) / 2;
      const y0 = centerY - full / 2;
      const col = idx % g, row = Math.floor(idx / g);
      return { cx: r.left + x0 + col * (tile + gap) + tile / 2, cy: r.top + y0 + row * (tile + gap) + tile / 2 };
    }, { idx, g: gridSize });
    await page.mouse.click(pt.cx, pt.cy);
    await wait(380);
  }
  const clicked = await clickByText(page, 'take profit');
  if (clicked) await wait(800);
  return page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'));
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  fs.mkdirSync('shots', { recursive: true });

  // ---------- 1440x900: Lobby / BetEntry / Playing / Settled ----------
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(600);

    OUT.lobby_1440_rightMirror = await rectAndStyle(page, '[data-testid="vault-gutter-card-a-right"]');
    OUT.lobby_1440_leftCardA = await rectAndStyle(page, '[data-testid="vault-gutter-card-a"]');
    OUT.lobby_1440_edges = await gridSafeEdges(page);
    OUT.lobby_1440_cyan = await cyanCount(page);
    await page.screenshot({
      path: 'shots/indepQA-1440x900-lobby-rightMirror-WIDE.png',
      clip: clip(OUT.lobby_1440_rightMirror, 160),
    });
    await page.screenshot({ path: 'shots/indepQA-1440x900-lobby-FULL.png' });

    await clickByText(page, 'ape in');
    await wait(500);
    OUT.betentry_1440_rightMirror = await rectAndStyle(page, '[data-testid="vault-gutter-card-a-right"]');
    await page.screenshot({
      path: 'shots/indepQA-1440x900-betentry-rightMirror-WIDE.png',
      clip: clip(OUT.betentry_1440_rightMirror, 160),
    });

    await clickByText(page, 'send it');
    await wait(700);
    OUT.playing_1440_rightMirror = await rectAndStyle(page, '[data-testid="vault-gutter-card-a-right"]');
    OUT.playing_1440_edges = await gridSafeEdges(page);
    OUT.playing_1440_cta = await page.evaluate(() => {
      const bar = document.querySelector('.vault-actionbar');
      if (!bar) return null;
      const btn = [...bar.querySelectorAll('button')].find(
        (b) => b.offsetParent !== null && b.textContent.toLowerCase().includes('take profit')
      );
      if (!btn) return null;
      const barR = bar.getBoundingClientRect(), btnR = btn.getBoundingClientRect();
      const cs = getComputedStyle(btn);
      return {
        text: btn.textContent.trim(),
        opacity: cs.opacity,
        backgroundColor: cs.backgroundColor,
        inBar: btnR.top >= barR.top - 1 && btnR.bottom <= barR.bottom + 1 && btnR.left >= barR.left - 1 && btnR.right <= barR.right + 1,
      };
    });
    await page.screenshot({
      path: 'shots/indepQA-1440x900-playing-rightMirror-WIDE.png',
      clip: clip(OUT.playing_1440_rightMirror, 160),
    });

    const reachedSettled = await driveToSettled(page, 5);
    await wait(700);
    OUT.settled_1440_reached = reachedSettled;
    OUT.settled_1440_rightMirror_absent = !(await domPresence(page, '[data-testid="vault-gutter-card-a-right"]'));
    OUT.settled_1440_leftCardA_absent = !(await domPresence(page, '[data-testid="vault-gutter-card-a"]'));
    OUT.settled_1440_cardB = await rectAndStyle(page, '[data-testid="vault-gutter-card-b"]');
    OUT.settled_1440_cardC = await rectAndStyle(page, '[data-testid="vault-gutter-card-c"]');
    OUT.settled_1440_cta = await page.evaluate(() => {
      const bar = document.querySelector('[data-testid="vault-settledpanel"]');
      if (!bar) return null;
      const btn = [...bar.querySelectorAll('button')].find(
        (b) => b.offsetParent !== null && b.textContent.toLowerCase().includes('bet again')
      );
      if (!btn) return null;
      const barR = bar.getBoundingClientRect(), btnR = btn.getBoundingClientRect();
      const cs = getComputedStyle(btn);
      return {
        text: btn.textContent.trim(),
        opacity: cs.opacity,
        backgroundColor: cs.backgroundColor,
        inBar: btnR.top >= barR.top - 1 && btnR.bottom <= barR.bottom + 1 && btnR.left >= barR.left - 1 && btnR.right <= barR.right + 1,
      };
    });
    OUT.settled_1440_cyan = await cyanCount(page);
    await page.screenshot({ path: 'shots/indepQA-1440x900-settled-FULL.png' });

    await page.close();
  }

  // ---------- 1440x1920: void-risk height-invariance proof ----------
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1920, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(600);
    OUT.lobby_1440x1920_rightMirror = await rectAndStyle(page, '[data-testid="vault-gutter-card-a-right"]');
    OUT.lobby_1440x1920_edges = await gridSafeEdges(page);
    await page.screenshot({
      path: 'shots/indepQA-1440x1920-lobby-rightMirror-WIDE.png',
      clip: clip(OUT.lobby_1440x1920_rightMirror, 160),
    });

    await clickByText(page, 'ape in'); await wait(450);
    OUT.betentry_1440x1920_rightMirror = await rectAndStyle(page, '[data-testid="vault-gutter-card-a-right"]');
    await clickByText(page, 'send it'); await wait(700);
    OUT.playing_1440x1920_rightMirror = await rectAndStyle(page, '[data-testid="vault-gutter-card-a-right"]');
    await page.close();
  }

  // ---------- 1920x1080: second desktop viewport containment ----------
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(600);
    OUT.lobby_1920_rightMirror = await rectAndStyle(page, '[data-testid="vault-gutter-card-a-right"]');
    OUT.lobby_1920_edges = await gridSafeEdges(page);
    await page.screenshot({
      path: 'shots/indepQA-1920x1080-lobby-rightMirror-WIDE.png',
      clip: clip(OUT.lobby_1920_rightMirror, 220),
    });
    await clickByText(page, 'ape in'); await wait(450);
    OUT.betentry_1920_rightMirror = await rectAndStyle(page, '[data-testid="vault-gutter-card-a-right"]');
    await clickByText(page, 'send it'); await wait(700);
    OUT.playing_1920_rightMirror = await rectAndStyle(page, '[data-testid="vault-gutter-card-a-right"]');
    OUT.playing_1920_edges = await gridSafeEdges(page);
    await page.screenshot({
      path: 'shots/indepQA-1920x1080-playing-rightMirror-WIDE.png',
      clip: clip(OUT.playing_1920_rightMirror, 220),
    });
    await page.close();
  }

  // ---------- 390x844 mobile: zero gutter DOM in all 3 phases ----------
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(600);
    OUT.mobile_lobby_counts = await page.evaluate(() => ({
      rightMirror: document.querySelectorAll('[data-testid="vault-gutter-card-a-right"]').length,
      leftCardA: document.querySelectorAll('[data-testid="vault-gutter-card-a"]').length,
      rightWrap: document.querySelectorAll('[data-testid="vault-gutter-right"]').length,
      leftWrap: document.querySelectorAll('[data-testid="vault-gutter-left"]').length,
    }));
    await clickByText(page, 'ape in'); await wait(450);
    OUT.mobile_betentry_counts = await page.evaluate(() => ({
      rightMirror: document.querySelectorAll('[data-testid="vault-gutter-card-a-right"]').length,
    }));
    await clickByText(page, 'send it'); await wait(700);
    OUT.mobile_playing_counts = await page.evaluate(() => ({
      rightMirror: document.querySelectorAll('[data-testid="vault-gutter-card-a-right"]').length,
    }));
    await page.screenshot({ path: 'shots/indepQA-390x844-playing-FULL.png' });
    await page.close();
  }

  await browser.close();
  fs.writeFileSync('indep-gutter-mirror-holdgate-0703-results.json', JSON.stringify(OUT, null, 2));
  console.log(JSON.stringify(OUT, null, 2));
})();
