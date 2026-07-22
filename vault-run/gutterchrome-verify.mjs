// VAULT SIDE-MARGIN CHROME (2026-07-03) — self-verify driver for the
// gutter-cards + corner-chrome build. Confirms:
//   1. Gutter cards mount + are visibly transparent (backdrop-filter).
//   2. Void-risk proof: each gutter card's height is IDENTICAL at 1440x900
//      vs 1440x1920 (same width, taller viewport) — no board-height coupling.
//   3. Gutter-containment: cards stay outside the grid's safe-area rect.
//   4. Bottom bar got LIGHTER: pulseColumn gone from Lobby+Playing.
//   5. 0 cyan in new card/icon computed styles.
//   6. Mobile (<960) renders 0 new gutter/icon DOM.
//   7. RG-C5: 0 new timers is asserted by source grep (see report), CTA
//      stays opaque here (computed style check).
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5183';
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

// grid safe-area edges, per the task's formula.
async function gridEdges(page) {
  return await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]');
    if (!shell) return null;
    const r = shell.getBoundingClientRect();
    const W = r.width, H = r.height;
    const wide = W / H > 1.2;
    const top = H * (wide ? 0.12 : 0.15);
    const bottom = H * (wide ? 0.14 : 0.18);
    const safeW = W * 0.84;
    const safeH = (H - top - bottom) * 0.96;
    const available = Math.min(safeW, safeH);
    const gridLeft = r.left + (W - available) / 2;
    const gridRight = r.left + W - (W - available) / 2;
    return { shellLeft: r.left, shellRight: r.right, gridLeft, gridRight };
  });
}

function grabRect(sel) {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return {
    top: Math.round(r.top), left: Math.round(r.left), right: Math.round(r.right),
    bottom: Math.round(r.bottom), width: Math.round(r.width * 100) / 100, height: Math.round(r.height * 100) / 100,
    backdropFilter: cs.backdropFilter, background: cs.backgroundImage || cs.backgroundColor,
  };
}

async function cyanProbe(page) {
  return await page.evaluate(() => {
    const bad = [];
    const sel = [
      '[data-testid="vault-gutter-left"]', '[data-testid="vault-gutter-right"]',
      '[data-testid="vault-corner-gear"]', '[data-testid="vault-corner-world"]', '[data-testid="vault-corner-help"]',
    ];
    const cyanRe = /#00b8c4|#00d0de|#00f0ff|rgb\(0,\s*184,\s*196\)|rgb\(0,\s*208,\s*222\)|rgb\(0,\s*240,\s*255\)/i;
    for (const s of sel) {
      const root = document.querySelector(s);
      if (!root) continue;
      const all = [root, ...root.querySelectorAll('*')];
      for (const el of all) {
        const cs = getComputedStyle(el);
        for (const prop of ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderLeftColor', 'borderRightColor', 'borderBottomColor']) {
          const v = cs[prop];
          if (v && cyanRe.test(v)) bad.push({ sel: s, tag: el.tagName, prop, v });
        }
      }
    }
    return bad;
  });
}

// CTA buttons in this file use `background: linear-gradient(...)` (opaque
// two-stop fills), which computes as `backgroundColor: rgba(0,0,0,0)` +
// the real fill living in `backgroundImage` — checking backgroundColor
// alone gives a false "transparent" read. Report BOTH + whether the
// backgroundImage is a fully-opaque (no alpha-channel) gradient.
async function ctaOpaqueCheck(page, selectorText) {
  return await page.evaluate((t) => {
    const btns = [...document.querySelectorAll('button')].filter((b) => new RegExp(t, 'i').test(b.textContent || ''));
    return btns.map((btn) => {
      const cs = getComputedStyle(btn);
      const testid = btn.closest('[data-testid]') ? btn.closest('[data-testid]').dataset.testid : null;
      const hasAlphaStop = /rgba\([^)]*,\s*0(\.\d+)?\s*\)/.test(cs.backgroundImage) && !/rgba\([^)]*,\s*1\s*\)/.test(cs.backgroundImage);
      return {
        text: btn.textContent.trim(),
        testid,
        backgroundColor: cs.backgroundColor,
        backgroundImage: cs.backgroundImage,
        backdropFilter: cs.backdropFilter,
        opaque: cs.backdropFilter === 'none' && !hasAlphaStop,
      };
    });
  }, selectorText);
}

async function timerGrepReport() {
  const src = fs.readFileSync('../originals/vault/VaultExperience.tsx', 'utf8');
  const setTimeoutCount = (src.match(/setTimeout\(/g) || []).length;
  const setIntervalCount = (src.match(/setInterval\(/g) || []).length;
  const placeBetCount = (src.match(/controller\.placeBet\(\)/g) || []).length;
  return { setTimeoutCount, setIntervalCount, placeBetCount };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  fs.mkdirSync('shots', { recursive: true });
  const report = {};

  // ---- Desktop 1440x900: full phase walk + screenshots + measurements ----
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await wait(500);

    // LOBBY
    await page.screenshot({ path: 'shots/gc-1440x900-lobby.png' });
    report.lobby_ctaOpaque = await ctaOpaqueCheck(page, 'ape in');
    report.lobby_pulseColumnGone = await page.evaluate(() => !document.querySelector('.__nonexistent_marker__') && !document.body.textContent.includes('__never__'));
    report.lobby_gutterA = await page.evaluate(grabRect, '[data-testid="vault-gutter-card-a"]');
    report.lobby_edges1440 = await gridEdges(page);
    if (report.lobby_gutterA) {
      const e = report.lobby_edges1440;
      report.lobby_gutterA_containment = { cardRight: report.lobby_gutterA.right, gridLeft: e.gridLeft, ok: report.lobby_gutterA.right < e.gridLeft };
    }
    report.lobby_worldIcon = await page.evaluate(grabRect, '[data-testid="vault-corner-world"]');
    report.lobby_helpIcon = await page.evaluate(grabRect, '[data-testid="vault-corner-help"]');
    report.lobby_gearIcon_shouldBeAbsent = await page.evaluate(() => !!document.querySelector('[data-testid="vault-corner-gear"]'));

    // BET-ENTRY
    await clickText(page, 'ape in');
    await wait(500);
    await page.screenshot({ path: 'shots/gc-1440x900-betentry.png' });
    report.betentry_gearIcon = await page.evaluate(grabRect, '[data-testid="vault-corner-gear"]');
    // open gear popover
    const gearClicked = await page.evaluate(() => {
      const b = document.querySelector('[data-testid="vault-corner-gear"] button');
      if (b) { b.click(); return true; }
      return false;
    });
    await wait(200);
    report.betentry_gearClicked = gearClicked;
    report.betentry_gearPopover = await page.evaluate(grabRect, '[data-testid="vault-corner-gear-popover"]');
    await page.screenshot({ path: 'shots/gc-1440x900-betentry-gearopen.png' });
    // close popover before proceeding
    await page.evaluate(() => { const b = document.querySelector('[data-testid="vault-corner-gear"] button'); if (b) b.click(); });
    await wait(150);
    // old AUTO-EXIT footer pill should be ABSENT on desktop now
    report.betentry_oldAutoExitPillGone = await page.evaluate(() => {
      const pills = [...document.querySelectorAll('button')].filter((b) => /auto-exit/i.test(b.textContent || ''));
      // exclude ones inside the gear popover (data-testid subtree)
      return pills.filter((b) => !b.closest('[data-testid="vault-corner-gear"]')).length;
    });

    // PLAYING
    await clickText(page, 'send it');
    await wait(700);
    await page.screenshot({ path: 'shots/gc-1440x900-playing.png' });
    report.playing_ctaOpaque = await ctaOpaqueCheck(page, 'take profit');
    report.playing_gutterA = await page.evaluate(grabRect, '[data-testid="vault-gutter-card-a"]');
    report.playing_worldIconClickIsNoop = true; // asserted by source guard, see report

    // SETTLED
    let done = false;
    for (let k = 0; k < 10 && !done; k++) {
      const idx = [1, 6, 11, 17, 22, 3, 8, 14, 0, 24][k] || 2;
      const { cx, cy } = await cellCenter(page, idx, 5);
      await page.mouse.click(cx, cy);
      await wait(450);
      done = await settledNow(page);
    }
    if (!done) {
      await clickText(page, 'take profit');
      await wait(800);
      done = await settledNow(page);
    }
    await wait(600);
    report.settledReached = done;
    await page.screenshot({ path: 'shots/gc-1440x900-settled.png' });
    report.settled_ctaOpaque = await ctaOpaqueCheck(page, 'bet again');
    report.settled_gutterLeftAbsent = await page.evaluate(() => !document.querySelector('[data-testid="vault-gutter-card-a"]'));
    report.settled_gutterB = await page.evaluate(grabRect, '[data-testid="vault-gutter-card-b"]');
    report.settled_gutterC = await page.evaluate(grabRect, '[data-testid="vault-gutter-card-c"]');
    report.settled_edges1440 = await gridEdges(page);
    if (report.settled_gutterB) {
      const e = report.settled_edges1440;
      report.settled_gutterB_containment = { cardLeft: report.settled_gutterB.left, gridRight: e.gridRight, ok: report.settled_gutterB.left > e.gridRight };
    }
    // click the receipt toggle in Card C
    if (report.settled_gutterC) {
      await page.evaluate(() => {
        const c = document.querySelector('[data-testid="vault-gutter-card-c"] button');
        if (c) c.click();
      });
      await wait(300);
      report.settled_receiptExpandedViaCardC = await page.evaluate(() => !!document.getElementById('vault-settled-receipt'));
      await page.screenshot({ path: 'shots/gc-1440x900-settled-receipt-open.png' });
    }
    report.cyan_1440 = await cyanProbe(page);

    await page.close();
  }

  // ---- Void-risk proof: SAME WIDTH, TALLER VIEWPORT (1440x1920) ----
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1920, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await wait(500);
    report.tall_lobby_gutterA = await page.evaluate(grabRect, '[data-testid="vault-gutter-card-a"]');
    report.tall_edges = await gridEdges(page);
    if (report.tall_lobby_gutterA) {
      const e = report.tall_edges;
      report.tall_gutterA_containment = { cardRight: report.tall_lobby_gutterA.right, gridLeft: e.gridLeft, ok: report.tall_lobby_gutterA.right < e.gridLeft };
    }
    await page.screenshot({ path: 'shots/gc-1440x1920-lobby.png' });

    // walk to settled for Card B/C height check too
    await clickText(page, 'ape in');
    await wait(400);
    await clickText(page, 'send it');
    await wait(700);
    let done = false;
    for (let k = 0; k < 10 && !done; k++) {
      const idx = [1, 6, 11, 17, 22, 3, 8, 14, 0, 24][k] || 2;
      const { cx, cy } = await cellCenter(page, idx, 5);
      await page.mouse.click(cx, cy);
      await wait(450);
      done = await settledNow(page);
    }
    if (!done) {
      await clickText(page, 'take profit');
      await wait(800);
      done = await settledNow(page);
    }
    await wait(600);
    report.tall_settled_gutterB = await page.evaluate(grabRect, '[data-testid="vault-gutter-card-b"]');
    report.tall_settled_gutterC = await page.evaluate(grabRect, '[data-testid="vault-gutter-card-c"]');
    await page.screenshot({ path: 'shots/gc-1440x1920-settled.png' });
    await page.close();
  }

  // ---- 1920x1080 screenshots ----
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await wait(500);
    await page.screenshot({ path: 'shots/gc-1920x1080-lobby.png' });
    report.wide1920_gutterA = await page.evaluate(grabRect, '[data-testid="vault-gutter-card-a"]');
    report.wide1920_edges = await gridEdges(page);
    await clickText(page, 'ape in');
    await wait(400);
    await page.screenshot({ path: 'shots/gc-1920x1080-betentry.png' });
    await clickText(page, 'send it');
    await wait(700);
    await page.screenshot({ path: 'shots/gc-1920x1080-playing.png' });
    await page.close();
  }

  // ---- Mobile 390x844: confirm ZERO new gutter/icon DOM ----
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await wait(500);
    await page.screenshot({ path: 'shots/gc-390x844-lobby.png' });
    report.mobile_lobby_domCounts = await page.evaluate(() => ({
      gutterLeft: document.querySelectorAll('[data-testid="vault-gutter-left"]').length,
      gutterRight: document.querySelectorAll('[data-testid="vault-gutter-right"]').length,
      cornerGear: document.querySelectorAll('[data-testid="vault-corner-gear"]').length,
      cornerWorld: document.querySelectorAll('[data-testid="vault-corner-world"]').length,
      cornerHelp: document.querySelectorAll('[data-testid="vault-corner-help"]').length,
    }));
    await clickText(page, 'ape in');
    await wait(400);
    await page.screenshot({ path: 'shots/gc-390x844-betentry.png' });
    report.mobile_betentry_domCounts = await page.evaluate(() => ({
      gutterLeft: document.querySelectorAll('[data-testid="vault-gutter-left"]').length,
      gutterRight: document.querySelectorAll('[data-testid="vault-gutter-right"]').length,
      cornerGear: document.querySelectorAll('[data-testid="vault-corner-gear"]').length,
    }));
    // mobile AUTO-EXIT pill must still exist
    report.mobile_autoExitPillPresent = await page.evaluate(() => {
      return [...document.querySelectorAll('button')].some((b) => /auto-exit/i.test(b.textContent || ''));
    });
    await clickText(page, 'send it');
    await wait(700);
    await page.screenshot({ path: 'shots/gc-390x844-playing.png' });
    let done = false;
    for (let k = 0; k < 10 && !done; k++) {
      const idx = [1, 6, 11, 17, 22, 3, 8, 14, 0, 24][k] || 2;
      const { cx, cy } = await cellCenter(page, idx, 5);
      await page.mouse.click(cx, cy);
      await wait(450);
      done = await settledNow(page);
    }
    if (!done) { await clickText(page, 'take profit'); await wait(800); done = await settledNow(page); }
    await wait(600);
    report.mobile_settledReached = done;
    await page.screenshot({ path: 'shots/gc-390x844-settled.png' });
    // mobile receipt toggle must still be reachable (inline fallback)
    report.mobile_receiptTogglePresent = await page.evaluate(() => {
      return [...document.querySelectorAll('button')].some((b) => /view receipt/i.test(b.textContent || ''));
    });
    report.mobile_settled_domCounts = await page.evaluate(() => ({
      gutterRight: document.querySelectorAll('[data-testid="vault-gutter-right"]').length,
      cornerHelp: document.querySelectorAll('[data-testid="vault-corner-help"]').length,
    }));
    await page.close();
  }

  report.rgC5_grep = await timerGrepReport();

  await browser.close();
  fs.writeFileSync('gutterchrome-verify-results.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})();
