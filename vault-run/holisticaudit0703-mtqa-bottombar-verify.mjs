// Quick supplementary check: confirm the ORIGINAL mobile bottom bar DOM
// (per-phase root, not the shared <BetConsole> which only mounts during
// bet-entry) is present at Lobby/Playing/Settled on mobile widths, plus
// re-run the 1024x768 / 992x850 edge-zone geometry check.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = '5301';
const OUT_DIR = 'shots-holisticaudit0703/mtqa';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function findButtonByText(page, t) {
  return await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return (
      els.find((e) => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
  }, t);
}
async function tapButtonByText(page, t) {
  const h = await findButtonByText(page, t);
  const el = h.asElement();
  if (!el) return { ok: false };
  await page.evaluate((e) => e.scrollIntoView({ block: 'center' }), el);
  await wait(150);
  const box = await el.boundingBox();
  if (!box) return { ok: false };
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  return { ok: true };
}

const GUTTER_TESTIDS = [
  'vault-gutter-left', 'vault-gutter-right', 'vault-gutter-card-a',
  'vault-gutter-card-a-right', 'vault-gutter-card-b', 'vault-gutter-card-c',
  'vault-betentry-left', 'vault-betentry-right', 'vault-betentry-yourbet',
  'vault-betentry-confirm', 'vault-betentry-world',
  'vault-lobby-left', 'vault-lobby-right', 'vault-lobby-hero', 'vault-lobby-apein',
  'vault-playing-left', 'vault-playing-right', 'vault-playing-status', 'vault-playing-actions',
  'vault-settled-left', 'vault-settled-right-new', 'vault-settled-result',
  'vault-settled-meta', 'vault-settled-nextbet', 'vault-settled-betagain',
];
async function gutterDomCounts(page) {
  return await page.evaluate((ids) => {
    const out = {};
    for (const id of ids) out[id] = document.querySelectorAll(`[data-testid="${id}"]`).length;
    return out;
  }, GUTTER_TESTIDS);
}

(async () => {
  await fs.promises.mkdir(OUT_DIR, { recursive: true }).catch(() => {});
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const R = {};

  // --- Part A: mobile per-phase bottom-bar root DOM presence (Pixel 7) ---
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(500);

    const lobbyControlCard = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="vault-controlcard"]');
      if (!el) return { present: false };
      const r = el.getBoundingClientRect();
      return { present: true, width: r.width, height: r.height, fullWidth: r.width >= window.innerWidth * 0.85 };
    });

    await tapButtonByText(page, 'ape in');
    await wait(500);
    await tapButtonByText(page, 'send it');
    await wait(700);

    // Playing phase — actionBar root has no explicit testid; verify via the
    // take-profit button's ANCESTOR full-width block instead.
    const playingActionBar = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.toLowerCase().includes('take profit'));
      if (!btn) return { present: false };
      let node = btn;
      for (let i = 0; i < 6 && node; i++) {
        const r = node.getBoundingClientRect();
        if (r.width >= window.innerWidth * 0.85) return { present: true, width: r.width, height: r.height, depth: i };
        node = node.parentElement;
      }
      return { present: false, reason: 'no full-width ancestor within 6 levels' };
    });

    // Reveal + take profit to reach Settled.
    const canvasBox = await (async () => {
      const h = await page.evaluateHandle(() => document.querySelector('canvas'));
      const el = h.asElement();
      return el ? await el.boundingBox() : null;
    })();
    let reachedSettled = false;
    if (canvasBox) {
      for (const [fx, fy] of [[0.5,0.5],[0.2,0.2],[0.8,0.2],[0.2,0.8],[0.8,0.8]]) {
        const stillPlaying = await page.evaluate(() => (document.body.textContent||'').toUpperCase().includes('TAKE PROFIT'));
        if (!stillPlaying) { reachedSettled = true; break; }
        await page.touchscreen.tap(canvasBox.x + canvasBox.width*fx, canvasBox.y + canvasBox.height*fy);
        await wait(350);
        const tpEnabled = await page.evaluate(() => {
          const b = [...document.querySelectorAll('button')].find((x) => x.textContent.toLowerCase().includes('take profit'));
          return b ? !b.disabled : false;
        });
        if (tpEnabled) {
          await tapButtonByText(page, 'take profit');
          await wait(700);
          reachedSettled = true;
          break;
        }
      }
    }
    await wait(300);
    const settledPanel = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="vault-settledpanel"]');
      if (!el) return { present: false };
      const r = el.getBoundingClientRect();
      return { present: true, width: r.width, height: r.height, fullWidth: r.width >= window.innerWidth * 0.85 };
    });

    R.mobilePerPhaseBottomBar = { lobbyControlCard, playingActionBar, reachedSettled, settledPanel };
    await page.screenshot({ path: `${OUT_DIR}/pixel7-bottombar-verify-settled.png` });
    await page.close();
  }

  // --- Part B: 1024x768 / 992x850 edge-zone geometry ---
  const EDGE_VIEWPORTS = [
    { name: 'edge-1024x768', width: 1024, height: 768 },
    { name: 'edge-992x850', width: 992, height: 850 },
  ];
  R.edgeZone = {};
  for (const vp of EDGE_VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(500);

    const phaseData = {};

    // LOBBY
    {
      const gutters = await gutterDomCounts(page);
      const rects = await page.evaluate(() => {
        const out = {};
        for (const id of ['vault-lobby-left', 'vault-lobby-right', 'vault-canvas-shell']) {
          const el = document.querySelector(`[data-testid="${id}"]`);
          out[id] = el ? el.getBoundingClientRect().toJSON() : null;
        }
        return out;
      });
      const canvasRect = await page.evaluate(() => {
        const c = document.querySelector('canvas');
        return c ? c.getBoundingClientRect().toJSON() : null;
      });
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      }));
      await page.screenshot({ path: `${OUT_DIR}/${vp.name}-01-lobby.png` });
      phaseData.lobby = { gutterCounts: gutters, rects, canvasRect, overflow };
      await tapButtonByText(page, 'ape in');
      await wait(500);
    }

    // BET ENTRY
    {
      const gutters = await gutterDomCounts(page);
      const rects = await page.evaluate(() => {
        const out = {};
        for (const id of ['vault-betentry-left', 'vault-betentry-right', 'vault-canvas-shell']) {
          const el = document.querySelector(`[data-testid="${id}"]`);
          out[id] = el ? el.getBoundingClientRect().toJSON() : null;
        }
        return out;
      });
      const canvasRect = await page.evaluate(() => {
        const c = document.querySelector('canvas');
        return c ? c.getBoundingClientRect().toJSON() : null;
      });
      // overlap check: does gutter-right rect intersect canvas rect?
      const overlap = (() => {
        const g = rects['vault-betentry-right'];
        if (!g || !canvasRect) return null;
        const ix = Math.max(0, Math.min(g.right, canvasRect.right) - Math.max(g.left, canvasRect.left));
        const iy = Math.max(0, Math.min(g.bottom, canvasRect.bottom) - Math.max(g.top, canvasRect.top));
        return { intersects: ix > 0 && iy > 0, ixWidth: ix, iyHeight: iy };
      })();
      const clipping = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="vault-betentry-right"]');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { clippedRight: r.right > window.innerWidth, clippedLeft: r.left < 0, right: r.right, innerWidth: window.innerWidth };
      });
      const sendIt = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.toLowerCase().includes('send it'));
        if (!btn) return { found: false };
        const r = btn.getBoundingClientRect();
        return { found: true, x: r.x, y: r.y, width: r.width, height: r.height, withinViewport: r.right <= window.innerWidth && r.left >= 0 };
      });
      await page.screenshot({ path: `${OUT_DIR}/${vp.name}-02-betentry.png` });
      phaseData.betEntry = { gutterCounts: gutters, rects, canvasRect, overlap, clipping, sendIt };

      // click SEND IT (desktop width — use click, real mouse, no touch)
      const h = await findButtonByText(page, 'send it');
      const el = h.asElement();
      if (el) { await el.click(); await wait(700); }
    }

    // PLAYING
    {
      const gutters = await gutterDomCounts(page);
      const canvasRect = await page.evaluate(() => {
        const c = document.querySelector('canvas');
        return c ? c.getBoundingClientRect().toJSON() : null;
      });
      const rects = await page.evaluate(() => {
        const out = {};
        for (const id of ['vault-playing-left', 'vault-playing-right']) {
          const el = document.querySelector(`[data-testid="${id}"]`);
          out[id] = el ? el.getBoundingClientRect().toJSON() : null;
        }
        return out;
      });
      const overlap = (() => {
        const g = rects['vault-playing-right'];
        if (!g || !canvasRect) return null;
        const ix = Math.max(0, Math.min(g.right, canvasRect.right) - Math.max(g.left, canvasRect.left));
        const iy = Math.max(0, Math.min(g.bottom, canvasRect.bottom) - Math.max(g.top, canvasRect.top));
        return { intersects: ix > 0 && iy > 0, ixWidth: ix, iyHeight: iy };
      })();
      await page.screenshot({ path: `${OUT_DIR}/${vp.name}-03-playing.png` });
      // click one tile
      if (canvasRect) {
        await page.mouse.click(canvasRect.x + canvasRect.width * 0.5, canvasRect.y + canvasRect.height * 0.5);
        await wait(400);
      }
      const takeProfit = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.toLowerCase().includes('take profit'));
        if (!btn) return { found: false };
        const r = btn.getBoundingClientRect();
        return { found: true, x: r.x, y: r.y, width: r.width, height: r.height, disabled: btn.disabled, withinViewport: r.right <= window.innerWidth && r.left >= 0 };
      });
      await page.screenshot({ path: `${OUT_DIR}/${vp.name}-04-playing-post-tap.png` });
      phaseData.playing = { gutterCounts: gutters, rects, canvasRect, overlap, takeProfit };
    }

    R.edgeZone[vp.name] = phaseData;
    await page.close();
  }

  await browser.close();
  fs.writeFileSync(`${OUT_DIR}/../holisticaudit0703-mtqa-supplement-results.json`, JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();
