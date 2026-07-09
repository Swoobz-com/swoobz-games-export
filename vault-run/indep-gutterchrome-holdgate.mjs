// INDEPENDENT holdgate for vault-side-margin-chrome (visual-regression-qa,
// 2026-07-03). Own driver, own math, does NOT reuse the maker's script.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 5183;
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

// Grid safe-area edges per the TASK's OWN formula (independent transcription,
// not copy-pasted from the maker's driver).
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
    return { shellW: W, shellH: H, gridLeft, gridRight, shellLeft: r.left, shellRight: r.right };
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

async function ancestorStretchCheck(page, sel) {
  // Walk ancestors of the gutter card up to (and incl) vault-canvas-shell,
  // flag any flex:1 / height:100% / alignItems:stretch that could couple
  // the card's size to the board.
  return await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const findings = [];
    let node = el;
    let depth = 0;
    while (node && depth < 8) {
      const cs = getComputedStyle(node);
      const testid = node.dataset ? node.dataset.testid : undefined;
      if (cs.flexGrow !== '0' && cs.flexGrow !== '') findings.push({ depth, testid, prop: 'flexGrow', v: cs.flexGrow });
      if (cs.height === '100%') findings.push({ depth, testid, prop: 'height', v: cs.height });
      if (cs.alignItems === 'stretch' && node !== el) findings.push({ depth, testid, prop: 'alignItems(on ancestor, informational)', v: cs.alignItems });
      if (node.dataset && node.dataset.testid === 'vault-canvas-shell') break;
      node = node.parentElement;
      depth++;
    }
    return findings;
  }, sel);
}

async function barHeight(page, testid) {
  return await page.evaluate((tid) => {
    const el = document.querySelector(`[data-testid="${tid}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return Math.round(r.height * 100) / 100;
  }, testid);
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  fs.mkdirSync('shots', { recursive: true });
  const R = {};

  // ============ 1440x900 full walk ============
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(500);

    // LOBBY
    await page.screenshot({ path: 'shots/indep-1440x900-lobby.png' });
    R.lobby_1440_barHeight = await barHeight(page, 'vault-controlcard');
    R.lobby_1440_gutterA = await page.evaluate(rectOf, '[data-testid="vault-gutter-card-a"]');
    R.lobby_1440_edges = await gridEdges(page);
    R.lobby_1440_ancestorStretch = await ancestorStretchCheck(page, '[data-testid="vault-gutter-card-a"]');
    R.mobile_marker_gearAbsentOnLobby = await page.evaluate(() => !document.querySelector('[data-testid="vault-corner-gear"]'));
    R.lobby_1440_worldIcon = await page.evaluate(rectOf, '[data-testid="vault-corner-world"]');
    R.lobby_1440_helpIcon = await page.evaluate(rectOf, '[data-testid="vault-corner-help"]');

    // BET-ENTRY
    await clickText(page, 'ape in');
    await wait(500);
    await page.screenshot({ path: 'shots/indep-1440x900-betentry.png' });
    R.betentry_1440_gearIcon = await page.evaluate(rectOf, '[data-testid="vault-corner-gear"]');

    // PLAYING
    await clickText(page, 'send it');
    await wait(700);
    await page.screenshot({ path: 'shots/indep-1440x900-playing.png' });
    R.playing_1440_barHeight = await barHeight(page, 'vault-actionbar');
    R.playing_1440_gutterA = await page.evaluate(rectOf, '[data-testid="vault-gutter-card-a"]');
    R.playing_1440_ancestorStretch = await ancestorStretchCheck(page, '[data-testid="vault-gutter-card-a"]');

    // Reveal several tiles to build history>=2 in this SESSION (localStorage
    // persists across reloads in this dev origin — first round of a fresh
    // session may not show Card B). Force to SETTLED.
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
    await page.screenshot({ path: 'shots/indep-1440x900-settled.png' });
    R.settled_1440_barHeight = await barHeight(page, 'vault-settledpanel');
    R.settled_1440_gutterLeftAbsent = await page.evaluate(() => !document.querySelector('[data-testid="vault-gutter-left"]'));
    R.settled_1440_gutterB = await page.evaluate(rectOf, '[data-testid="vault-gutter-card-b"]');
    R.settled_1440_gutterC = await page.evaluate(rectOf, '[data-testid="vault-gutter-card-c"]');
    R.settled_1440_edges = await gridEdges(page);
    if (R.settled_1440_gutterC) {
      R.settled_1440_gutterC_ancestorStretch = await ancestorStretchCheck(page, '[data-testid="vault-gutter-card-c"]');
      await page.evaluate(() => { const b = document.querySelector('[data-testid="vault-gutter-card-c"] button'); if (b) b.click(); });
      await wait(300);
      await page.screenshot({ path: 'shots/indep-1440x900-settled-receipt-open.png' });
      R.settled_1440_receiptExpanded = await page.evaluate(() => !!document.getElementById('vault-settled-receipt'));
    }

    // Run again to try to get Card B (needs history.length>=2) — bet again.
    const betAgainClicked = await clickText(page, 'bet again');
    R.betAgainClicked = betAgainClicked;
    await wait(600);
    if (betAgainClicked) {
      // land back on lobby or bet-entry depending on handler; try SEND IT->reveal->cashout again
      await clickText(page, 'send it');
      await wait(700);
      done = false;
      for (let k = 0; k < 12 && !done; k++) {
        const idx = [2, 7, 12, 18, 23, 5, 9, 15, 0, 24, 4, 20][k] || 3;
        const { cx, cy } = await cellCenter(page, idx, 5);
        await page.mouse.click(cx, cy);
        await wait(400);
        done = await settledNow(page);
      }
      if (!done) { await clickText(page, 'take profit'); await wait(800); done = await settledNow(page); }
      await wait(600);
      R.settled2_1440_reached = done;
      R.settled2_1440_gutterB = await page.evaluate(rectOf, '[data-testid="vault-gutter-card-b"]');
      await page.screenshot({ path: 'shots/indep-1440x900-settled2.png' });
    }

    await page.close();
  }

  // ============ 1440x1920 — VOID-RISK PROOF (same width, taller viewport) ============
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1920, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(500);
    R.lobby_1920h_barHeight = await barHeight(page, 'vault-controlcard');
    R.lobby_1920h_gutterA = await page.evaluate(rectOf, '[data-testid="vault-gutter-card-a"]');
    R.lobby_1920h_edges = await gridEdges(page);
    await page.screenshot({ path: 'shots/indep-1440x1920-lobby.png' });

    await clickText(page, 'ape in');
    await wait(400);
    await clickText(page, 'send it');
    await wait(700);
    R.playing_1920h_barHeight = await barHeight(page, 'vault-actionbar');
    R.playing_1920h_gutterA = await page.evaluate(rectOf, '[data-testid="vault-gutter-card-a"]');
    await page.screenshot({ path: 'shots/indep-1440x1920-playing.png' });

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
    R.settled_1920h_reached = done;
    R.settled_1920h_barHeight = await barHeight(page, 'vault-settledpanel');
    R.settled_1920h_gutterB = await page.evaluate(rectOf, '[data-testid="vault-gutter-card-b"]');
    R.settled_1920h_gutterC = await page.evaluate(rectOf, '[data-testid="vault-gutter-card-c"]');
    R.settled_1920h_edges = await gridEdges(page);
    await page.screenshot({ path: 'shots/indep-1440x1920-settled.png' });
    await page.close();
  }

  // ============ 1920x1080 — containment check at a second desktop viewport ============
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(500);
    R.lobby_1920_gutterA = await page.evaluate(rectOf, '[data-testid="vault-gutter-card-a"]');
    R.lobby_1920_edges = await gridEdges(page);
    await page.screenshot({ path: 'shots/indep-1920x1080-lobby.png' });
    await clickText(page, 'ape in');
    await wait(400);
    await page.screenshot({ path: 'shots/indep-1920x1080-betentry.png' });
    await clickText(page, 'send it');
    await wait(700);
    await page.screenshot({ path: 'shots/indep-1920x1080-playing.png' });
    await page.close();
  }

  // ============ 390x844 mobile — must render ZERO new DOM ============
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(500);
    await page.screenshot({ path: 'shots/indep-390x844-lobby.png' });
    R.mobile_lobby_domCounts = await page.evaluate(() => ({
      gutterLeft: document.querySelectorAll('[data-testid="vault-gutter-left"]').length,
      gutterRight: document.querySelectorAll('[data-testid="vault-gutter-right"]').length,
      cornerGear: document.querySelectorAll('[data-testid="vault-corner-gear"]').length,
      cornerWorld: document.querySelectorAll('[data-testid="vault-corner-world"]').length,
      cornerHelp: document.querySelectorAll('[data-testid="vault-corner-help"]').length,
    }));
    await clickText(page, 'ape in');
    await wait(400);
    R.mobile_betentry_domCounts = await page.evaluate(() => ({
      gutterLeft: document.querySelectorAll('[data-testid="vault-gutter-left"]').length,
      cornerGear: document.querySelectorAll('[data-testid="vault-corner-gear"]').length,
    }));
    await page.screenshot({ path: 'shots/indep-390x844-betentry.png' });
    await clickText(page, 'send it');
    await wait(700);
    R.mobile_playing_domCounts = await page.evaluate(() => ({
      gutterLeft: document.querySelectorAll('[data-testid="vault-gutter-left"]').length,
      gutterRight: document.querySelectorAll('[data-testid="vault-gutter-right"]').length,
    }));
    await page.screenshot({ path: 'shots/indep-390x844-playing.png' });
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
    R.mobile_settled_reached = done;
    R.mobile_settled_domCounts = await page.evaluate(() => ({
      gutterRight: document.querySelectorAll('[data-testid="vault-gutter-right"]').length,
      cornerHelp: document.querySelectorAll('[data-testid="vault-corner-help"]').length,
    }));
    await page.screenshot({ path: 'shots/indep-390x844-settled.png' });
    await page.close();
  }

  // ============ RG-C5 / source hygiene grep ============
  const src = fs.readFileSync('../originals/vault/VaultExperience.tsx', 'utf8');
  R.grep_setTimeout = (src.match(/setTimeout\(/g) || []).length;
  R.grep_setInterval = (src.match(/setInterval\(/g) || []).length;
  R.grep_placeBet = (src.match(/controller\.placeBet\(\)/g) || []).length;
  R.grep_flex1_in_gutter_block = (() => {
    const start = src.indexOf('const GUTTER = {');
    const end = src.indexOf('// ─── Small primitives');
    const block = src.slice(start, end);
    return {
      flexGrow1: (block.match(/flex:\s*1\b/g) || []).length,
      height100pct: (block.match(/height:\s*['"]100%['"]/g) || []).length,
      alignItemsStretch: (block.match(/alignItems:\s*['"]stretch['"]/g) || []).length,
    };
  })();

  await browser.close();
  fs.writeFileSync('indep-gutterchrome-holdgate-results.json', JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();
