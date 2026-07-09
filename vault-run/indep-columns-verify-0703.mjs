import puppeteer from 'puppeteer-core';
import fs from 'fs';

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = process.argv[2] || '5182';
const S = 'shots/indepcol0703-';

const results = {};

async function newPage(browser, w, h) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.reload({ waitUntil: 'networkidle2' });
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

function toR(r) {
  if (!r) return null;
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
}

// ---- Core BetEntry columns measurement ----
async function measureBetEntryColumns(page, tag) {
  await page.screenshot({ path: `${S}${tag}-betentry-full.png` });
  const data = await page.evaluate(() => {
    const toRect = (el) => el ? (({ top, bottom, left, right, width, height }) => ({ top, bottom, left, right, width, height }))(el.getBoundingClientRect()) : null;
    const panel = document.querySelector('[data-testid="bet-console"]');
    if (!panel) return { error: 'no panel found' };
    const directChildren = [...panel.children];
    // header is child 0; columnsRow (if columns mode) is child 1
    const columnsRow = directChildren[1];
    const isColumnsRowFlex = columnsRow ? getComputedStyle(columnsRow).display === 'flex' && columnsRow.children.length === 3 : false;
    let col1 = null, col2 = null, col3 = null, col2Style = null, col3Style = null;
    if (isColumnsRowFlex) {
      col1 = columnsRow.children[0];
      col2 = columnsRow.children[1];
      col3 = columnsRow.children[2];
      const cs2 = getComputedStyle(col2);
      const cs3 = getComputedStyle(col3);
      col2Style = { borderLeftWidth: cs2.borderLeftWidth, borderLeftColor: cs2.borderLeftColor, borderLeftStyle: cs2.borderLeftStyle, paddingLeft: cs2.paddingLeft };
      col3Style = { borderLeftWidth: cs3.borderLeftWidth, borderLeftColor: cs3.borderLeftColor, borderLeftStyle: cs3.borderLeftStyle, paddingLeft: cs3.paddingLeft };
    }
    // mode-card widths
    const modeCards = [...document.querySelectorAll('.vault-mode-row button')];
    const modeCardRects = modeCards.map((b) => toRect(b));
    // footer (last child of panel) - balance-left, actions-right
    const footer = directChildren[directChildren.length - 1];
    let balanceRect = null, actionsRect = null, sendItRect = null;
    if (footer) {
      const bal = footer.children[0];
      const acts = footer.children[1];
      balanceRect = toRect(bal);
      actionsRect = toRect(acts);
      if (acts) {
        const btns = [...acts.querySelectorAll('button')];
        const sendIt = btns.find(b => b.textContent.toLowerCase().includes('send it'));
        sendItRect = toRect(sendIt);
      }
    }
    // cyan probe scoped to panel subtree
    const all = [...panel.querySelectorAll('*'), panel];
    const cyanEls = [];
    for (const el of all) {
      const cs = getComputedStyle(el);
      for (const prop of ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderLeftColor', 'boxShadow']) {
        const v = cs[prop];
        if (!v) continue;
        const matches = [...v.matchAll(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/g)];
        for (const m of matches) {
          const rr = +m[1], g = +m[2], b = +m[3];
          if (g > 140 && b > 140 && rr < 100 && Math.abs(g - b) < 60) {
            cyanEls.push({ tag: el.tagName, cls: el.className, prop, value: v });
          }
        }
      }
    }
    return {
      panel: toRect(panel),
      isColumnsRowFlex,
      columnsRow: toRect(columnsRow),
      col1: toRect(col1),
      col2: toRect(col2),
      col3: toRect(col3),
      col2Style,
      col3Style,
      modeCardCount: modeCardRects.length,
      modeCardRects,
      footer: toRect(footer),
      balanceRect,
      actionsRect,
      sendItRect,
      cyanCount: cyanEls.length,
      cyanSample: cyanEls.slice(0, 8),
      panelChildCount: directChildren.length,
    };
  });
  return data;
}

// crop a region and save
async function cropShot(page, rect, path) {
  if (!rect) return;
  await page.screenshot({ path, clip: { x: Math.max(0, rect.left - 4), y: Math.max(0, rect.top - 4), width: rect.width + 8, height: rect.height + 8 } });
}

async function measurePhase(page, tag, name) {
  await page.screenshot({ path: `${S}${tag}-${name}.png` });
  const rects = await page.evaluate(() => {
    const board = document.querySelector('[data-testid="vault-canvas-shell"]');
    const panel = document.querySelector('[data-testid="bet-console"]')
      || document.querySelector('div[aria-live="polite"]');
    const toRect = (el) => el ? (({ top, bottom, left, right, width, height }) => ({ top, bottom, left, right, width, height }))(el.getBoundingClientRect()) : null;
    return { board: toRect(board), panel: toRect(panel) };
  });
  return rects;
}

async function driveToSettled(page, wantWin) {
  await clickText(page, 'send it');
  await wait(900);
  let isSettled = await settled(page);
  if (wantWin) {
    const tryIdx = [1, 6, 11, 17, 22];
    for (let k = 0; k < tryIdx.length && !isSettled; k++) {
      const c = await cellCenter(page, tryIdx[k], 5);
      await page.mouse.click(c.cx, c.cy);
      await wait(500);
      isSettled = await settled(page);
      if (!isSettled && k >= 2) { await clickText(page, 'take profit'); await wait(700); isSettled = await settled(page); if (isSettled) break; }
    }
    if (!isSettled) { await clickText(page, 'take profit'); await wait(700); isSettled = await settled(page); }
  } else {
    for (let k = 0; k < 25 && !isSettled; k++) {
      const c = await cellCenter(page, k, 5);
      await page.mouse.click(c.cx, c.cy);
      await wait(150);
      isSettled = await settled(page);
    }
  }
  await wait(500);
  const label = await panelAriaLabel(page);
  return { isSettled, label };
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EXE,
    headless: false,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });

  // ===== 1440 =====
  {
    const page = await newPage(browser, 1440, 900);
    await page.screenshot({ path: `${S}D1440-00-lobby.png` });
    // BetEntry
    await clickText(page, 'ape in') || await clickText(page, 'bet again');
    await wait(700);
    results.D1440_betentry = await measureBetEntryColumns(page, 'D1440');
    if (results.D1440_betentry.col2) await cropShot(page, results.D1440_betentry.col2, `${S}D1440-col2-crop.png`);
    if (results.D1440_betentry.col3) await cropShot(page, results.D1440_betentry.col3, `${S}D1440-col3-crop.png`);

    // Playing (retry until RUG observed)
    const outcome1 = await driveToSettled(page, false);
    results.D1440_settled_outcome_attempt1 = outcome1;
    results.D1440_settled_1 = await measurePhase(page, 'D1440', `settled-${outcome1.label && outcome1.label.toLowerCase().startsWith('rugged') ? 'RUG' : 'WIN'}`);

    // go again for the OTHER outcome
    await clickText(page, 'bet again');
    await wait(700);
    // measure playing phase mid-round for regression check
    await clickText(page, 'send it');
    await wait(900);
    {
      const c = await cellCenter(page, 12, 5);
      await page.mouse.click(c.cx, c.cy);
    }
    await wait(700);
    results.D1440_playing = await measurePhase(page, 'D1440', 'playing-midround');
    // try to reach WIN this time
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
    results.D1440_settled_outcome_attempt2 = { isSettled, label: label2 };
    results.D1440_settled_2 = await measurePhase(page, 'D1440', `settled-${label2 && label2.toLowerCase().startsWith('rugged') ? 'RUG' : 'WIN'}-2`);

    await page.close();
  }

  // ===== 1920 =====
  {
    const page = await newPage(browser, 1920, 1080);
    await page.screenshot({ path: `${S}D1920-00-lobby.png` });
    await clickText(page, 'ape in') || await clickText(page, 'bet again');
    await wait(700);
    results.D1920_betentry = await measureBetEntryColumns(page, 'D1920');
    if (results.D1920_betentry.col2) await cropShot(page, results.D1920_betentry.col2, `${S}D1920-col2-crop.png`);
    if (results.D1920_betentry.col3) await cropShot(page, results.D1920_betentry.col3, `${S}D1920-col3-crop.png`);

    const outcome1 = await driveToSettled(page, true);
    results.D1920_settled_outcome_attempt1 = outcome1;
    results.D1920_settled_1 = await measurePhase(page, 'D1920', `settled-${outcome1.label && outcome1.label.toLowerCase().startsWith('rugged') ? 'RUG' : 'WIN'}`);

    await clickText(page, 'bet again');
    await wait(700);
    await clickText(page, 'send it');
    await wait(900);
    {
      const c = await cellCenter(page, 12, 5);
      await page.mouse.click(c.cx, c.cy);
    }
    await wait(700);
    results.D1920_playing = await measurePhase(page, 'D1920', 'playing-midround');
    let isSettled = await settled(page);
    for (let k = 0; k < 25 && !isSettled; k++) {
      const c = await cellCenter(page, k, 5);
      await page.mouse.click(c.cx, c.cy);
      await wait(150);
      isSettled = await settled(page);
    }
    if (!isSettled) { await clickText(page, 'take profit'); await wait(700); isSettled = await settled(page); }
    await wait(500);
    const label2 = await panelAriaLabel(page);
    results.D1920_settled_outcome_attempt2 = { isSettled, label: label2 };
    results.D1920_settled_2 = await measurePhase(page, 'D1920', `settled-${label2 && label2.toLowerCase().startsWith('rugged') ? 'RUG' : 'WIN'}-2`);

    await page.close();
  }

  // ===== Mobile 390x844 =====
  {
    const page = await newPage(browser, 390, 844);
    await page.screenshot({ path: `${S}M390-00-lobby.png` });
    await clickText(page, 'ape in') || await clickText(page, 'bet again');
    await wait(700);
    results.M390_betentry = await measureBetEntryColumns(page, 'M390');
    // touch target measurement
    results.M390_touchTargets = await page.evaluate(() => {
      const panel = document.querySelector('[data-testid="bet-console"]');
      if (!panel) return null;
      const stepBtns = [...panel.querySelectorAll('button')].filter(b => b.textContent.trim() === '−' || b.textContent.trim() === '+');
      const sendIt = [...panel.querySelectorAll('button')].find(b => b.textContent.toLowerCase().includes('send it'));
      const toRect = (el) => el ? (({ width, height }) => ({ width, height }))(el.getBoundingClientRect()) : null;
      return { stepBtns: stepBtns.map(toRect), sendIt: toRect(sendIt) };
    });

    await clickText(page, 'send it');
    await wait(900);
    {
      const c = await cellCenter(page, 12, 5);
      await page.mouse.click(c.cx, c.cy);
    }
    await wait(700);
    results.M390_playing = await measurePhase(page, 'M390', 'playing-midround');

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
    results.M390_settled = await measurePhase(page, 'M390', `settled-${label3 && label3.toLowerCase().startsWith('rugged') ? 'RUG' : 'WIN'}`);

    await page.close();
  }

  await browser.close();
  fs.writeFileSync('indep-columns-verify-0703-results.json', JSON.stringify(results, null, 2));
  console.log('DONE');
})();
