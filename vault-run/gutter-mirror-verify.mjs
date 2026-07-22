// Self-verification for the RIGHT-GUTTER MIRROR (vault-side-margin-chrome
// continuation, 2026-07-03): during Lobby/BetEntry/Playing, mirror Card A
// (SidebarPulseStrip) into the right gutter using byte-identical
// gutterRightStack/gutterCard/GLASS tokens. Own driver, own math.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5181';
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

async function cellCenter(page, idx, g) {
  return await page.evaluate(
    ({ idx, g }) => {
      const c = document.querySelector('canvas');
      const r = c.getBoundingClientRect();
      const W = r.width, H = r.height;
      const wide = W / H > 1.2;
      const tR = H * (wide ? 0.12 : 0.15);
      const bR = H * (wide ? 0.14 : 0.18);
      const sF = 0.08;
      const sW = W * (1 - sF * 2);
      const sH = (H - tR - bR) * 0.96;
      const av = Math.min(sW, sH);
      const gap = Math.max(6, av * 0.026);
      const tile = (av - gap * (g - 1)) / g;
      const full = tile * g + gap * (g - 1);
      const x0 = (W - full) / 2;
      const by = tR + (H - tR - bR) / 2;
      const y0 = by - full / 2;
      const col = idx % g, row = Math.floor(idx / g);
      return { cx: r.left + x0 + col * (tile + gap) + tile / 2, cy: r.top + y0 + row * (tile + gap) + tile / 2 };
    },
    { idx, g }
  );
}

async function settledNow(page) {
  return await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'));
}

// Grid safe-area edges per the task's own formula.
async function gridEdges(page) {
  return await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]');
    if (!shell) return null;
    const r = shell.getBoundingClientRect();
    const W = r.width, H = r.height;
    const wide = W / H > 1.2;
    const top = wide ? H * 0.12 : H * 0.15;
    const bottom = wide ? H * 0.14 : H * 0.18;
    const safeW = W * 0.84;
    const safeH = (H - top - bottom) * 0.96;
    const available = Math.min(safeW, safeH);
    const gridLeft = r.left + (W - available) / 2;
    const gridRight = r.left + W - (W - available) / 2;
    return { gridLeft, gridRight };
  });
}

function rectOf(sel) {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return {
    top: r.top, left: r.left, right: r.right, bottom: r.bottom,
    width: r.width, height: r.height,
    backdropFilter: cs.backdropFilter,
    backgroundImage: cs.backgroundImage,
    backgroundColor: cs.backgroundColor,
  };
}

async function ctaCheck(page, barSelector, wantedText) {
  return await page.evaluate(({ barSelector, wantedText }) => {
    const bar = document.querySelector(barSelector);
    if (!bar) return null;
    const btn = [...bar.querySelectorAll('button')].find(
      (b) => b.offsetParent !== null && b.textContent.trim().toLowerCase().includes(wantedText.toLowerCase())
    );
    if (!btn) return null;
    const barR = bar.getBoundingClientRect();
    const btnR = btn.getBoundingClientRect();
    const cs = getComputedStyle(btn);
    const inBar = btnR.top >= barR.top - 1 && btnR.bottom <= barR.bottom + 1 &&
                  btnR.left >= barR.left - 1 && btnR.right <= barR.right + 1;
    return { text: btn.textContent.trim(), opacity: cs.opacity, backgroundColor: cs.backgroundColor, inBar };
  }, { barSelector, wantedText });
}

async function cyanProbe(page) {
  return await page.evaluate(() => {
    const all = [...document.querySelectorAll('body *')];
    const cyanish = [];
    for (const el of all) {
      const cs = getComputedStyle(el);
      const props = [cs.color, cs.backgroundColor, cs.borderColor, cs.borderTopColor, cs.borderBottomColor];
      for (const p of props) {
        const m = p.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
        if (m) {
          const r = +m[1], g = +m[2], b = +m[3];
          if (r < 100 && g > 150 && b > 150 && Math.abs(g - b) < 60) {
            cyanish.push({ tag: el.tagName, testid: el.dataset ? el.dataset.testid : undefined, color: p });
          }
        }
      }
    }
    return cyanish;
  });
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  fs.mkdirSync('shots', { recursive: true });
  const R = {};

  // ============ 1440x900 full phase walk ============
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(500);

    // LOBBY
    R.lobby_1440_gutterARight = await page.evaluate(rectOf, '[data-testid="vault-gutter-card-a-right"]');
    R.lobby_1440_edges = await gridEdges(page);
    R.lobby_1440_cyan = (await cyanProbe(page)).length;
    await page.screenshot({ path: 'shots/mirror-1440x900-lobby-wide.png', clip: clipAround(R.lobby_1440_gutterARight) });
    await page.screenshot({ path: 'shots/mirror-1440x900-lobby-full.png' });

    // BET-ENTRY
    await clickText(page, 'ape in');
    await wait(500);
    R.betentry_1440_gutterARight = await page.evaluate(rectOf, '[data-testid="vault-gutter-card-a-right"]');
    await page.screenshot({ path: 'shots/mirror-1440x900-betentry-wide.png', clip: clipAround(R.betentry_1440_gutterARight) });

    // PLAYING
    await clickText(page, 'send it');
    await wait(700);
    R.playing_1440_gutterARight = await page.evaluate(rectOf, '[data-testid="vault-gutter-card-a-right"]');
    R.playing_1440_cta = await ctaCheck(page, '.vault-actionbar', 'take profit');
    await page.screenshot({ path: 'shots/mirror-1440x900-playing-wide.png', clip: clipAround(R.playing_1440_gutterARight) });

    // Drive to SETTLED — right card A-right must disappear, B/C rules unchanged
    let done = false;
    for (let k = 0; k < 12 && !done; k++) {
      const idx = [1, 6, 11, 17, 22, 3, 8, 14, 0, 24, 4, 20][k] || 2;
      const { cx, cy } = await cellCenter(page, idx, 5);
      await page.mouse.click(cx, cy);
      await wait(400);
      done = await settledNow(page);
    }
    if (!done) { await clickText(page, 'take profit'); await wait(800); done = await settledNow(page); }
    await wait(600);
    R.settled_1440_reached = done;
    R.settled_1440_gutterARight_absent = await page.evaluate(() => !document.querySelector('[data-testid="vault-gutter-card-a-right"]'));
    R.settled_1440_gutterCardA_absent = await page.evaluate(() => !document.querySelector('[data-testid="vault-gutter-card-a"]'));
    R.settled_1440_gutterB = await page.evaluate(rectOf, '[data-testid="vault-gutter-card-b"]');
    R.settled_1440_cta = await ctaCheck(page, '[data-testid="vault-settledpanel"]', 'bet again');
    await page.screenshot({ path: 'shots/mirror-1440x900-settled-full.png' });

    await page.close();
  }

  // ============ 1440x1920 — height-invariance / void-risk proof ============
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1920, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(500);
    R.lobby_1920h_gutterARight = await page.evaluate(rectOf, '[data-testid="vault-gutter-card-a-right"]');
    R.lobby_1920h_edges = await gridEdges(page);
    await page.screenshot({ path: 'shots/mirror-1440x1920-lobby-wide.png', clip: clipAround(R.lobby_1920h_gutterARight) });
    await page.close();
  }

  // ============ 1920x1080 — containment at second desktop viewport ============
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(500);
    R.lobby_1920_gutterARight = await page.evaluate(rectOf, '[data-testid="vault-gutter-card-a-right"]');
    R.lobby_1920_edges = await gridEdges(page);
    await page.screenshot({ path: 'shots/mirror-1920x1080-lobby-wide.png', clip: clipAround(R.lobby_1920_gutterARight) });
    await clickText(page, 'ape in');
    await wait(400);
    R.betentry_1920_gutterARight = await page.evaluate(rectOf, '[data-testid="vault-gutter-card-a-right"]');
    await page.screenshot({ path: 'shots/mirror-1920x1080-betentry-wide.png', clip: clipAround(R.betentry_1920_gutterARight) });
    await clickText(page, 'send it');
    await wait(700);
    R.playing_1920_gutterARight = await page.evaluate(rectOf, '[data-testid="vault-gutter-card-a-right"]');
    await page.screenshot({ path: 'shots/mirror-1920x1080-playing-wide.png', clip: clipAround(R.playing_1920_gutterARight) });
    await page.close();
  }

  // ============ 390x844 mobile — must render ZERO new DOM ============
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(500);
    R.mobile_lobby_domCounts = await page.evaluate(() => ({
      gutterARight: document.querySelectorAll('[data-testid="vault-gutter-card-a-right"]').length,
      gutterRight: document.querySelectorAll('[data-testid="vault-gutter-right"]').length,
    }));
    await clickText(page, 'ape in');
    await wait(400);
    R.mobile_betentry_domCounts = await page.evaluate(() => ({
      gutterARight: document.querySelectorAll('[data-testid="vault-gutter-card-a-right"]').length,
    }));
    await clickText(page, 'send it');
    await wait(700);
    R.mobile_playing_domCounts = await page.evaluate(() => ({
      gutterARight: document.querySelectorAll('[data-testid="vault-gutter-card-a-right"]').length,
    }));
    await page.screenshot({ path: 'shots/mirror-390x844-playing.png' });
    await page.close();
  }

  // ============ Source hygiene: confirm nothing else changed ============
  const src = fs.readFileSync('../originals/vault/VaultExperience.tsx', 'utf8');
  R.grep_gutterRightStack_uses = (src.match(/styles\.gutterRightStack/g) || []).length;
  R.grep_gutterCard_uses = (src.match(/styles\.gutterCard\b/g) || []).length;
  R.grep_topOffset_line = (src.match(/topOffset:\s*400/g) || []).length;

  await browser.close();
  fs.writeFileSync('gutter-mirror-verify-results.json', JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();

function clipAround(rect) {
  if (!rect) return undefined;
  const pad = 60;
  return {
    x: Math.max(0, Math.round(rect.left - pad)),
    y: Math.max(0, Math.round(rect.top - pad)),
    width: Math.round(rect.width + pad * 2),
    height: Math.round(rect.height + pad * 2),
  };
}
