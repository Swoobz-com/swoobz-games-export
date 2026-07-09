import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PORT = process.argv[2] || '5182';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const VIEWPORTS = [
  { name: 'Pixel7-390x844', width: 390, height: 844 },
  { name: 'iPhone14Pro-393x852', width: 393, height: 852 },
];

async function overflowWalk(page) {
  return await page.evaluate(() => {
    const doc = document.documentElement;
    const scrollWidth = doc.scrollWidth;
    const clientWidth = doc.clientWidth;
    const overflowing = [];
    const all = document.querySelectorAll('body *');
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.right > clientWidth + 0.5 || r.left < -0.5) {
        overflowing.push({
          tag: el.tagName,
          cls: (el.className || '').toString().slice(0, 90),
          testid: el.getAttribute && el.getAttribute('data-testid'),
          left: Math.round(r.left),
          right: Math.round(r.right),
          overflowRight: Math.round(r.right - clientWidth),
        });
      }
    }
    overflowing.sort((a, b) => b.overflowRight - a.overflowRight);
    return { scrollWidth, clientWidth, hasOverflow: scrollWidth > clientWidth + 1, topOffenders: overflowing.slice(0, 8) };
  });
}

async function cyanProbe(page) {
  return await page.evaluate(() => {
    const isCyan = (c) => {
      const m = c && c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
      if (!m) return false;
      const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
      return g > 140 && b > 140 && r < 100 && Math.abs(g - b) < 40;
    };
    const hits = [];
    document.querySelectorAll('body *').forEach((el) => {
      const cs = getComputedStyle(el);
      for (const prop of ['color', 'backgroundColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor']) {
        if (isCyan(cs[prop])) hits.push({ tag: el.tagName, prop, val: cs[prop], text: (el.textContent || '').slice(0, 30) });
      }
    });
    return hits.slice(0, 20);
  });
}

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
  // ElementHandle.click() auto-scrolls the element into view first — required
  // on mobile where BetEntry's stacked content exceeds the viewport height.
  await el.click();
  return true;
}

async function elementRect(page, selectorFn, ...args) {
  return await page.evaluate(selectorFn, ...args);
}

// Measure a button matched by text (exact or includes), returns bounding box + touchAction + vertical-center%.
async function measureButtonByText(page, text, viewportHeight) {
  return await page.evaluate(
    (text, viewportHeight) => {
      const els = [...document.querySelectorAll('button,[role=button]')];
      const el =
        els.find((e) => e.offsetParent !== null && e.textContent.trim().toLowerCase() === text.toLowerCase()) ||
        els.find((e) => e.offsetParent !== null && e.textContent.toLowerCase().includes(text.toLowerCase()));
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const vCenterPct = ((r.top + r.height / 2) / viewportHeight) * 100;
      return {
        width: Math.round(r.width * 10) / 10,
        height: Math.round(r.height * 10) / 10,
        touchAction: cs.touchAction,
        vCenterPct: Math.round(vCenterPct * 10) / 10,
        text: el.textContent.trim().slice(0, 40),
      };
    },
    text,
    viewportHeight
  );
}

async function measureAllByAriaLabel(page, label, viewportHeight) {
  return await page.evaluate(
    (label, viewportHeight) => {
      const els = [...document.querySelectorAll(`[aria-label="${label}"]`)];
      return els
        .filter((e) => e.offsetParent !== null)
        .map((el) => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return {
            width: Math.round(r.width * 10) / 10,
            height: Math.round(r.height * 10) / 10,
            touchAction: cs.touchAction,
            vCenterPct: Math.round(((r.top + r.height / 2) / viewportHeight) * 1000) / 10,
          };
        });
    },
    label,
    viewportHeight
  );
}

async function measureModeCards(page, viewportHeight) {
  return await page.evaluate((viewportHeight) => {
    // Mode cards are the world-select buttons in ModeSelector; find buttons whose text includes 'rugs ·'
    const btns = [...document.querySelectorAll('button')].filter(
      (b) => b.offsetParent !== null && /rugs\s*·/i.test(b.textContent)
    );
    return btns.map((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        width: Math.round(r.width * 10) / 10,
        height: Math.round(r.height * 10) / 10,
        touchAction: cs.touchAction,
        vCenterPct: Math.round(((r.top + r.height / 2) / viewportHeight) * 1000) / 10,
      };
    });
  }, viewportHeight);
}

async function betConsoleColumnsCheck(page) {
  return await page.evaluate(() => {
    const panel = document.querySelector('[data-testid="bet-console"]');
    if (!panel) return { found: false };
    const columnsRowPresent = !!panel.querySelector(':scope > div > div'); // loose
    // Detect the columns=true structure by checking for a direct child div with 'display:flex' row containing 3 columns,
    // vs columns=false which renders header + a single Wrap element (Fragment => children directly, or div.innerContent).
    const directChildren = [...panel.children];
    return {
      found: true,
      panelChildCount: directChildren.length,
      childTags: directChildren.map((c) => c.tagName),
      panelRect: panel.getBoundingClientRect().toJSON ? JSON.parse(JSON.stringify(panel.getBoundingClientRect())) : null,
    };
  });
}

async function cellCenter(page, idx, g) {
  return await page.evaluate(
    ({ idx, g }) => {
      const c = document.querySelector('canvas');
      const r = c.getBoundingClientRect();
      const W = r.width,
        H = r.height;
      const tR = H * 0.15,
        bR = H * 0.18,
        sF = 0.08;
      const sW = W * (1 - sF * 2);
      const sH = (H - tR - bR) * 0.96;
      const av = Math.min(sW, sH);
      const gap = Math.max(6, av * 0.026);
      const tile = (av - gap * (g - 1)) / g;
      const full = tile * g + gap * (g - 1);
      const x0 = (W - full) / 2;
      const by = tR + (H - tR - bR) / 2;
      const y0 = by - full / 2;
      const col = idx % g,
        row = Math.floor(idx / g);
      return { cx: r.left + x0 + col * (tile + gap) + tile / 2, cy: r.top + y0 + row * (tile + gap) + tile / 2 };
    },
    { idx, g }
  );
}

async function settledInfo(page) {
  return await page.evaluate(() => {
    const body = document.body.textContent.toLowerCase();
    return {
      settled: body.includes('bet again'),
      rugged: body.includes('rugged'),
    };
  });
}

async function runOnePlaythrough(browser, vp, forceOutcome, consoleErrors) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => consoleErrors.push({ vp: vp.name, phase: 'pageerror', msg: String(e) }));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push({ vp: vp.name, phase: 'console.error', msg: msg.text().slice(0, 200) });
  });
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(700);

  const out = { vp: vp.name, forceOutcome };

  // ---- LOBBY ----
  out.lobby = {};
  out.lobby.overflow = await overflowWalk(page);
  out.lobby.cyan = await cyanProbe(page);
  out.lobby.apeInBtn = await measureButtonByText(page, 'ape in', vp.height);
  await page.screenshot({ path: `shots/mtqa-vbg-${vp.name}-${forceOutcome}-01-lobby.png`, fullPage: true });

  // ---- BET-ENTRY ----
  await clickText(page, 'ape in');
  await wait(600);
  out.betentry = {};
  out.betentry.overflow = await overflowWalk(page);
  out.betentry.cyan = await cyanProbe(page);
  out.betentry.columnsStructure = await betConsoleColumnsCheck(page);
  out.betentry.sendItBtn = await measureButtonByText(page, 'send it', vp.height);
  out.betentry.wagerSteppers = [
    ...(await measureAllByAriaLabel(page, 'Decrease bet', vp.height)),
    ...(await measureAllByAriaLabel(page, 'Increase bet', vp.height)),
  ];
  out.betentry.rugsSteppers = [
    ...(await measureAllByAriaLabel(page, 'Decrease rugs', vp.height)),
    ...(await measureAllByAriaLabel(page, 'Increase rugs', vp.height)),
  ];
  out.betentry.modeCards = await measureModeCards(page, vp.height);
  await page.screenshot({ path: `shots/mtqa-vbg-${vp.name}-${forceOutcome}-02-betentry.png`, fullPage: true });

  // ---- PLAYING ----
  await clickText(page, 'send it');
  await wait(900);
  out.playing = {};
  out.playing.overflow = await overflowWalk(page);
  out.playing.cyan = await cyanProbe(page);
  out.playing.takeProfitBtnDisabled = await measureButtonByText(page, 'take profit', vp.height);
  await page.screenshot({ path: `shots/mtqa-vbg-${vp.name}-${forceOutcome}-03-playing-precommit.png`, fullPage: true });

  // Reveal tiles: for WIN force -> tap exactly 1 tile then TAKE PROFIT (retry if mine hit first).
  // For RUG force -> keep tapping many tiles (up to grid size) until a mine is hit.
  let done = false;
  let sInfo = { settled: false, rugged: false };
  const gridSize = 5;
  const order = [1, 6, 11, 17, 22, 3, 8, 14, 19, 24, 0, 5, 10, 15, 20, 2, 7, 12, 16, 21, 4, 9, 13, 18, 23];
  const maxTaps = forceOutcome === 'win' ? 1 : order.length;
  // Scroll the canvas fully into view first (Playing's action bar/canvas can
  // sit lower than one mobile screen) so cellCenter's viewport-relative rect
  // matches what mouse.click actually hits.
  await page.evaluate(() => document.querySelector('canvas')?.scrollIntoView({ block: 'center' }));
  await wait(200);
  for (let k = 0; k < maxTaps && !done; k++) {
    const idx = order[k];
    const { cx, cy } = await cellCenter(page, idx, gridSize);
    await page.mouse.click(cx, cy);
    await wait(400);
    sInfo = await settledInfo(page);
    done = sInfo.settled;
    if (forceOutcome === 'win' && done) break; // hit a mine on first tap -> becomes a rug outcome, note it
  }
  if (!done && forceOutcome === 'win') {
    out.playing.takeProfitBtnEnabled = await measureButtonByText(page, 'take profit', vp.height);
    await clickText(page, 'take profit');
    await wait(900);
    sInfo = await settledInfo(page);
    done = sInfo.settled;
  }
  out.playing.reachedSettled = done;
  out.playing.actualOutcome = sInfo.rugged ? 'rug' : done ? 'win' : 'incomplete';

  await wait(500);
  out.settled = {};
  out.settled.overflow = await overflowWalk(page);
  out.settled.cyan = await cyanProbe(page);
  out.settled.betAgainBtn = await measureButtonByText(page, 'bet again', vp.height);
  await page.screenshot({ path: `shots/mtqa-vbg-${vp.name}-${forceOutcome}-04-settled.png`, fullPage: true });

  await page.close();
  return out;
}

(async () => {
  fs.mkdirSync('shots', { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const consoleErrors = [];
  const results = [];
  for (const vp of VIEWPORTS) {
    results.push(await runOnePlaythrough(browser, vp, 'win', consoleErrors));
    results.push(await runOnePlaythrough(browser, vp, 'rug', consoleErrors));
  }
  await browser.close();
  const output = { results, consoleErrors };
  fs.writeFileSync('mtqa-vbg-mobile-2026-07-03-results.json', JSON.stringify(output, null, 2));
  console.log(JSON.stringify(output, null, 2));
})();
