import puppeteer from 'puppeteer-core';
import fs from 'fs';

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = process.argv[2] || '5182';
const S = 'shots/indepbc0703-';

const results = {};

async function newPage(browser, w, h) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.reload({ waitUntil: 'networkidle2' }); // hard reload, bypass stale HMR state
  await wait(1200);
  return page;
}

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return els.find(e => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase())
      || els.find(e => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, t);
  const el = h.asElement();
  if (!el) { return false; }
  await el.click();
  return true;
}

async function cellCenter(page, idx, g) {
  return await page.evaluate(({ idx, g }) => {
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
    const col = idx % g, row = Math.floor(idx / g);
    return { cx: r.left + x0 + col * (tile + gap) + tile / 2, cy: r.top + y0 + row * (tile + gap) + tile / 2 };
  }, { idx, g });
}

async function settled(page) {
  return await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'));
}
async function panelAriaLabel(page) {
  return await page.evaluate(() => {
    const el = document.querySelector('div[aria-live="polite"][aria-label]');
    return el ? el.getAttribute('aria-label') : null;
  });
}

function toRect(r) {
  if (!r) return null;
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
}

async function measureBetEntry(page, tag) {
  const clicked = await clickText(page, 'ape in') || await clickText(page, 'bet again');
  await wait(600);
  const rects = await page.evaluate(() => {
    const board = document.querySelector('[data-testid="vault-canvas-shell"]');
    const panel = document.querySelector('[data-testid="bet-console"]');
    const inner = panel ? panel.querySelector(':scope > div:nth-child(2)') : null; // Wrap element (2nd child, after header)
    const toR = (el) => el ? (({ top, bottom, left, right, width, height }) => ({ top, bottom, left, right, width, height }))(el.getBoundingClientRect()) : null;
    // detect cyan-ish colors on the bet-entry surface
    const all = panel ? [...panel.querySelectorAll('*')] : [];
    const cyanEls = [];
    for (const el of all) {
      const cs = getComputedStyle(el);
      for (const prop of ['color', 'backgroundColor', 'borderColor', 'borderTopColor']) {
        const v = cs[prop];
        const m = v && v.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
        if (m) {
          const rr = +m[1], g = +m[2], b = +m[3];
          // cyan-ish: high G and B, low-ish R, and G/B close together
          if (g > 140 && b > 140 && rr < 100 && Math.abs(g - b) < 60) {
            cyanEls.push({ tag: el.tagName, prop, value: v });
          }
        }
      }
    }
    return {
      board: toR(board),
      panel: toR(panel),
      inner: toR(inner),
      cyanCount: cyanEls.length,
      cyanSample: cyanEls.slice(0, 5),
    };
  });
  await page.screenshot({ path: `${S}${tag}-betentry.png` });
  return { clicked, rects };
}

async function measurePhase(page, tag, name) {
  await page.screenshot({ path: `${S}${tag}-${name}.png` });
  const rects = await page.evaluate(() => {
    const board = document.querySelector('[data-testid="vault-canvas-shell"]');
    // The one bounded controlPanel wrapper (sibling of boardStyle, div[aria-live="polite"]
    // at VaultExperience.tsx L552) seats bet-entry/playing HUD/settled across all phases.
    const panel = document.querySelector('[data-testid="bet-console"]')
      || document.querySelector(':scope > div > div[aria-live="polite"]')
      || document.querySelector('div[aria-live="polite"]');
    const toR = (el) => el ? (({ top, bottom, left, right, width, height }) => ({ top, bottom, left, right, width, height }))(el.getBoundingClientRect()) : null;
    return { board: toR(board), panel: toR(panel) };
  });
  return rects;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EXE,
    headless: false,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });

  // ---- 1440 desktop ----
  {
    const page = await newPage(browser, 1440, 900);
    // Lobby
    await page.screenshot({ path: `${S}D1440-00-lobby.png` });
    results.D1440_lobby = await page.evaluate(() => {
      const board = document.querySelector('[data-testid="vault-canvas-shell"]');
      const r = board ? board.getBoundingClientRect() : null;
      return r ? { width: r.width, height: r.height } : null;
    });

    // BetEntry
    const be = await measureBetEntry(page, 'D1440');
    results.D1440_betentry = be.rects;

    // Playing
    await clickText(page, 'send it');
    await wait(900);
    await page.mouse.click(...(await (async () => { const c = await cellCenter(page, 12, 5); return [c.cx, c.cy]; })()));
    await wait(700);
    results.D1440_playing = await measurePhase(page, 'D1440', '01-playing');

    // continue tapping to reach settlement (rug likely)
    let isSettled = await settled(page);
    for (let k = 0; k < 25 && !isSettled; k++) {
      const c = await cellCenter(page, k, 5);
      await page.mouse.click(c.cx, c.cy);
      await wait(150);
      isSettled = await settled(page);
    }
    if (!isSettled) { await clickText(page, 'take profit'); await wait(700); isSettled = await settled(page); }
    await wait(500);
    const label1 = await panelAriaLabel(page);
    results.D1440_settled_outcome = label1;
    results.D1440_settled = await measurePhase(page, 'D1440', `02-settled-${label1 && label1.toLowerCase().startsWith('rugged') ? 'RUG' : 'WIN'}`);

    await page.close();
  }

  // ---- 1920 desktop ----
  {
    const page = await newPage(browser, 1920, 1080);
    await page.screenshot({ path: `${S}D1920-00-lobby.png` });
    results.D1920_lobby = await page.evaluate(() => {
      const board = document.querySelector('[data-testid="vault-canvas-shell"]');
      const r = board ? board.getBoundingClientRect() : null;
      return r ? { width: r.width, height: r.height } : null;
    });

    const be = await measureBetEntry(page, 'D1920');
    results.D1920_betentry = be.rects;

    await clickText(page, 'send it');
    await wait(900);
    {
      const c = await cellCenter(page, 12, 5);
      await page.mouse.click(c.cx, c.cy);
    }
    await wait(700);
    results.D1920_playing = await measurePhase(page, 'D1920', '01-playing');

    // Aim for a WIN outcome this time (tap few safe-looking then take profit)
    let isSettled = await settled(page);
    const tryIdx = [1, 6, 11, 17, 22];
    for (let k = 0; k < tryIdx.length && !isSettled; k++) {
      const c = await cellCenter(page, tryIdx[k], 5);
      await page.mouse.click(c.cx, c.cy);
      await wait(500);
      isSettled = await settled(page);
    }
    if (!isSettled) { await clickText(page, 'take profit'); await wait(700); isSettled = await settled(page); }
    await wait(500);
    const label2 = await panelAriaLabel(page);
    results.D1920_settled_outcome = label2;
    results.D1920_settled = await measurePhase(page, 'D1920', `02-settled-${label2 && label2.toLowerCase().startsWith('rugged') ? 'RUG' : 'WIN'}`);

    await page.close();
  }

  // ---- Mobile 390x844 ----
  {
    const page = await newPage(browser, 390, 844);
    await page.screenshot({ path: `${S}M390-00-lobby.png` });
    const be = await measureBetEntry(page, 'M390');
    results.M390_betentry = be.rects;

    await clickText(page, 'send it');
    await wait(900);
    {
      const c = await cellCenter(page, 12, 5);
      await page.mouse.click(c.cx, c.cy);
    }
    await wait(700);
    results.M390_playing = await measurePhase(page, 'M390', '01-playing');

    let isSettled = await settled(page);
    for (let k = 0; k < 25 && !isSettled; k++) {
      const c = await cellCenter(page, k, 5);
      await page.mouse.click(c.cx, c.cy);
      await wait(150);
      isSettled = await settled(page);
    }
    if (!isSettled) { await clickText(page, 'take profit'); await wait(700); isSettled = await settled(page); }
    await wait(500);
    const label3 = await panelAriaLabel(page);
    results.M390_settled_outcome = label3;
    results.M390_settled = await measurePhase(page, 'M390', `02-settled-${label3 && label3.toLowerCase().startsWith('rugged') ? 'RUG' : 'WIN'}`);

    await page.close();
  }

  await browser.close();
  fs.writeFileSync('indep-betconsole-holdgate-0703-results.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})();
