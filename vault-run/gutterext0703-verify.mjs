// Self-verification for the LOBBY/PLAYING/SETTLED GUTTER EXTENSION
// (2026-07-03+2, task_category vault-side-margin-chrome, round 4/4). Mirrors
// the structure of betentry-gutter-verify.mjs (prior round's driver, kept as
// the house template) but drives all 4 phases (lobby/bet-entry/playing/
// settled win+rug) and targets the NEW vault-lobby-*/vault-playing-*/
// vault-settled-* testids.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5198';
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

function rectOf(sel) {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
}

async function panelEmptyCheck(page) {
  return await page.evaluate(() => {
    const panel = document.querySelector('[aria-live="polite"]');
    if (!panel) return { panelFound: false };
    return {
      panelFound: true,
      childElementCount: panel.childElementCount,
      innerHTMLLength: panel.innerHTML.length,
    };
  });
}

async function overflowCheck(page) {
  return await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
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
          if (r < 90 && g > 150 && b > 150 && Math.abs(g - b) < 60) {
            cyanish.push({ tag: el.tagName, testid: el.dataset ? el.dataset.testid : undefined, color: p });
          }
        }
      }
    }
    return cyanish;
  });
}

async function buttonComputedStyle(page, containerSel, matchText) {
  return await page.evaluate(({ containerSel, matchText }) => {
    const root = document.querySelector(containerSel);
    if (!root) return null;
    const btn = [...root.querySelectorAll('button')].find((b) =>
      b.textContent.toLowerCase().includes(matchText.toLowerCase()),
    );
    if (!btn) return null;
    const cs = getComputedStyle(btn);
    const r = btn.getBoundingClientRect();
    return {
      text: btn.textContent.trim(),
      disabled: btn.disabled,
      opacity: cs.opacity,
      backgroundImage: cs.backgroundImage,
      backgroundColor: cs.backgroundColor,
      color: cs.color,
      width: r.width,
      parentWidth: root.getBoundingClientRect().width,
      minWidth: cs.minWidth,
    };
  }, { containerSel, matchText });
}

function clipAround(...rects) {
  const rs = rects.filter(Boolean);
  if (rs.length === 0) return undefined;
  const pad = 80;
  const left = Math.min(...rs.map((r) => r.left));
  const top = Math.min(...rs.map((r) => r.top));
  const right = Math.max(...rs.map((r) => r.right));
  const bottom = Math.max(...rs.map((r) => r.bottom));
  return {
    x: Math.max(0, Math.round(left - pad)),
    y: Math.max(0, Math.round(top - pad)),
    width: Math.round(right - left + pad * 2),
    height: Math.round(bottom - top + pad * 2),
  };
}

// sRGB relative luminance / WCAG contrast — used to grade the CORE ACTION
// buttons (TAKE PROFIT most critical). Gradient backgrounds are graded at
// their darkest stop (worst case for contrast against the fixed ink text).
function relLum([r, g, b]) {
  const f = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [rl, gl, bl] = [f(r), f(g), f(b)];
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}
function contrast(rgbA, rgbB) {
  const l1 = relLum(rgbA) + 0.05;
  const l2 = relLum(rgbB) + 0.05;
  return l1 > l2 ? l1 / l2 : l2 / l1;
}
function parseRgb(s) {
  const m = s.match(/(\d+),\s*(\d+),\s*(\d+)/);
  return m ? [+m[1], +m[2], +m[3]] : null;
}
// ink #04130b (T.accentInk) vs the two gradient stops used by primaryButton/
// cashOutButton/settledBetAgain (T.accentSolid #00E676 -> #00a85a).
const INK = [0x04, 0x13, 0x0b];
const STOP_TOP = [0x00, 0xe6, 0x76];
const STOP_BOTTOM = [0x00, 0xa8, 0x5a];

async function clickCanvasFraction(page, fx, fy) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (!box) return false;
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy);
  return true;
}

async function selectMode(page, modeName) {
  await clickTextWithin(page, '[data-testid="vault-betentry-world"]', modeName);
}

async function isSettledBust(page) {
  return await page.evaluate(() => document.body.textContent.includes('BUST'));
}
async function isPlaying(page) {
  return await page.evaluate(() => document.body.textContent.includes('PUMPING') || document.body.textContent.includes('TRAIL'));
}

// Retry-with-verification reveal (avoids the false-negative risk of a single
// blind coordinate): clicks a small spread of canvas fractions in MANUAL mode
// until the TAKE PROFIT button's own `disabled` attribute flips false (the
// ground truth for `canCashOut`/`revealedTiles.length>0`), bounded attempts.
async function revealOneTileVerified(page, actionsSel) {
  // Center-weighted spots — see the trail-toggle smoke test's coordinate
  // comment below for why 0.3/0.8-style extremes can miss the drawn grid on
  // a wide-aspect viewport (`computeGridLayout`'s height-bound `available`
  // leaves real margin outside the reserved 8% `sideFrac`).
  const spots = [[0.5, 0.5], [0.45, 0.4], [0.55, 0.6], [0.4, 0.55], [0.6, 0.45], [0.5, 0.35]];
  for (const [fx, fy] of spots) {
    const stillPlaying = await isPlaying(page);
    if (!stillPlaying) return false; // busted before we got a safe reveal
    await clickCanvasFraction(page, fx, fy);
    await wait(500);
    const enabled = await page.evaluate((sel) => {
      const root = sel ? document.querySelector(sel) : document.body;
      if (!root) return false;
      const btn = [...root.querySelectorAll('button')].find((b) => b.textContent.toLowerCase().includes('take profit'));
      return btn ? !btn.disabled : false;
    }, actionsSel);
    if (enabled) return true;
  }
  return false;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  fs.mkdirSync('shots-gutterext', { recursive: true });
  const R = {};

  // ================= 1440x900 — full desktop walk (LOBBY -> PLAYING -> WIN) =================
  {
    const page = await browser.newPage();
    page.on('pageerror', (e) => ((R.pageerrors_1440 ??= []).push(String(e))));
    page.on('console', (m) => { if (m.type() === 'error') (R.consoleerrors_1440 ??= []).push(m.text()); });
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(600);

    // ---- LOBBY ----
    R.panel_lobby_1440 = await panelEmptyCheck(page);
    R.lobby_hero_1440 = await page.evaluate(rectOf, '[data-testid="vault-lobby-hero"]');
    R.lobby_apein_1440 = await page.evaluate(rectOf, '[data-testid="vault-lobby-apein"]');
    R.lobby_cardA_1440 = await page.evaluate(rectOf, '[data-testid="vault-gutter-card-a"]');
    R.lobby_cardA_mirror_1440 = await page.evaluate(rectOf, '[data-testid="vault-gutter-card-a-right"]');
    R.lobby_apein_style_1440 = await buttonComputedStyle(page, '[data-testid="vault-lobby-apein"]', 'ape in');
    await page.screenshot({ path: 'shots-gutterext/01-lobby-1440-left-wide.png', clip: clipAround(R.lobby_hero_1440, R.lobby_cardA_1440) });
    await page.screenshot({ path: 'shots-gutterext/01-lobby-1440-right-wide.png', clip: clipAround(R.lobby_apein_1440, R.lobby_cardA_mirror_1440) });
    await page.screenshot({ path: 'shots-gutterext/01-lobby-1440-full.png' });
    R.overflow_lobby_1440 = await overflowCheck(page);
    R.cyan_lobby_1440 = (await cyanProbe(page)).length;

    // APE IN functional
    R.apein_click_ok = await clickTextWithin(page, '[data-testid="vault-lobby-apein"]', 'ape in');
    await wait(500);
    R.after_apein_isBetEntry = await page.evaluate(() => !!document.querySelector('[data-testid="vault-betentry-world"]'));

    // pick BLUECHIPS (low rug density, reliable WIN path) + SEND IT
    await selectMode(page, 'BLUECHIPS');
    await wait(300);
    await clickTextWithin(page, '[data-testid="vault-betentry-confirm"]', 'SEND IT');
    await wait(800);

    // ---- PLAYING ----
    R.panel_playing_1440 = await panelEmptyCheck(page);
    R.playing_status_1440 = await page.evaluate(rectOf, '[data-testid="vault-playing-status"]');
    R.playing_actions_1440 = await page.evaluate(rectOf, '[data-testid="vault-playing-actions"]');
    R.playing_cardA_1440 = await page.evaluate(rectOf, '[data-testid="vault-gutter-card-a"]');
    R.playing_cardA_mirror_1440 = await page.evaluate(rectOf, '[data-testid="vault-gutter-card-a-right"]');
    await page.screenshot({ path: 'shots-gutterext/02-playing-1440-left-wide.png', clip: clipAround(R.playing_status_1440, R.playing_cardA_1440) });
    await page.screenshot({ path: 'shots-gutterext/02-playing-1440-right-wide.png', clip: clipAround(R.playing_actions_1440, R.playing_cardA_mirror_1440) });
    await page.screenshot({ path: 'shots-gutterext/02-playing-1440-full.png' });
    R.overflow_playing_1440 = await overflowCheck(page);
    R.cyan_playing_1440 = (await cyanProbe(page)).length;

    // reveal one tile (verified retry, safe-odds BLUECHIPS 5x5/3-rug board),
    // then read TAKE PROFIT style before (disabled) vs after (enabled).
    R.takeprofit_style_disabled_1440 = await buttonComputedStyle(page, '[data-testid="vault-playing-actions"]', 'take profit');
    R.reveal_ok_1440 = await revealOneTileVerified(page, '[data-testid="vault-playing-actions"]');
    R.takeprofit_style_enabled_1440 = await buttonComputedStyle(page, '[data-testid="vault-playing-actions"]', 'take profit');

    // TAKE PROFIT functional -> settled (win)
    R.takeprofit_click_ok = await clickTextWithin(page, '[data-testid="vault-playing-actions"]', 'take profit');
    await wait(900);

    // ---- SETTLED (WIN) ----
    R.panel_settled_win_1440 = await panelEmptyCheck(page);
    R.settled_result_win_1440 = await page.evaluate(rectOf, '[data-testid="vault-settled-result"]');
    R.settled_meta_win_1440 = await page.evaluate(rectOf, '[data-testid="vault-settled-meta"]');
    R.settled_nextbet_win_1440 = await page.evaluate(rectOf, '[data-testid="vault-settled-nextbet"]');
    R.settled_betagain_win_1440 = await page.evaluate(rectOf, '[data-testid="vault-settled-betagain"]');
    R.settled_cardB_1440 = await page.evaluate(rectOf, '[data-testid="vault-gutter-card-b"]');
    R.settled_cardC_1440 = await page.evaluate(rectOf, '[data-testid="vault-gutter-card-c"]');
    R.settled_betagain_style_1440 = await buttonComputedStyle(page, '[data-testid="vault-settled-betagain"]', 'bet again');
    await page.screenshot({ path: 'shots-gutterext/03-settled-win-1440-left-wide.png', clip: clipAround(R.settled_result_win_1440, R.settled_meta_win_1440) });
    await page.screenshot({ path: 'shots-gutterext/03-settled-win-1440-right-wide.png', clip: clipAround(R.settled_nextbet_win_1440, R.settled_betagain_win_1440) });
    await page.screenshot({ path: 'shots-gutterext/03-settled-win-1440-full.png' });
    R.overflow_settled_win_1440 = await overflowCheck(page);
    R.cyan_settled_win_1440 = (await cyanProbe(page)).length;

    // BET AGAIN functional -> back to playing (round 2), to get history>=2 for
    // Card B (SessionTrendSpark), then cash out again to get a 2nd settled +
    // confirm Card B now present.
    R.betagain_click_ok = await clickTextWithin(page, '[data-testid="vault-settled-betagain"]', 'bet again');
    await wait(800);
    R.after_betagain_isPlaying = await isPlaying(page);
    R.reveal_ok_round2_1440 = await revealOneTileVerified(page, '[data-testid="vault-playing-actions"]');
    await clickTextWithin(page, '[data-testid="vault-playing-actions"]', 'take profit');
    await wait(900);
    R.settled_cardB_round2_1440 = await page.evaluate(rectOf, '[data-testid="vault-gutter-card-b"]');
    await page.screenshot({ path: 'shots-gutterext/04-settled-win-round2-cardB-1440.png' });

    await page.close();
  }

  // ================= MANUAL|TRAIL toggle — isolated smoke test (own page, =================
  // ================= no coupling with any reveal-critical flow above)     =================
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(600);
    await clickTextWithin(page, '[data-testid="vault-lobby-apein"]', 'ape in');
    await wait(500);
    await selectMode(page, 'BLUECHIPS');
    await wait(300);
    await clickTextWithin(page, '[data-testid="vault-betentry-confirm"]', 'SEND IT');
    await wait(800);
    R.trailtoggle_click_ok = await clickTextWithin(page, '[data-testid="vault-playing-actions"]', 'TRAIL');
    await wait(300);
    R.after_trailtoggle_isTrailMode = await page.evaluate(() => document.body.textContent.includes('PLAN YOUR TRAIL'));
    await page.screenshot({ path: 'shots-gutterext/15-trailtoggle-smoketest.png' });

    // toggle back to MANUAL, confirm, then back to TRAIL for the paint test
    R.trailtoggle_back_click_ok = await clickTextWithin(page, '[data-testid="vault-playing-actions"]', 'MANUAL');
    await wait(300);
    R.after_trailtoggle_back_isManual = await page.evaluate(() => document.body.textContent.includes('PUMPING'));
    await clickTextWithin(page, '[data-testid="vault-playing-actions"]', 'TRAIL');
    await wait(300);

    // Paint a short trail (clean taps in TRAIL mode toggle a tile onto the
    // path — VaultGridCanvas's own `handlePointerUp` -> `onTileTrail`
    // contract, see that file's header comment), then exercise CLEAR + GO.
    // NOTE: coordinates kept close to canvas CENTER (not 0.3/0.8 extremes) —
    // `computeGridLayout` (VaultGridCanvas.tsx:842) centers the drawn grid
    // and, on a WIDE aspect ratio, the height-bound `available` size leaves
    // real side margins OUTSIDE the reserved 8% `sideFrac` (confirmed by
    // hand for 1440x900: grid occupies only x-fraction ~[0.307, 0.693] of
    // the canvas, not the full [0.08, 0.92] `sideFrac` allowance) — a 0.3/0.8
    // fraction can land just outside the actual tiles on some viewports.
    await clickCanvasFraction(page, 0.45, 0.4);
    await wait(400);
    await clickCanvasFraction(page, 0.55, 0.6);
    await wait(400);
    R.after_paint_isTrailReady = await page.evaluate(() => document.body.textContent.includes('TRAIL READY'));
    R.clear_click_ok = await clickTextWithin(page, '[data-testid="vault-playing-actions"]', 'CLEAR');
    await wait(400);
    R.after_clear_isTrailReady = await page.evaluate(() => document.body.textContent.includes('TRAIL READY'));
    await page.screenshot({ path: 'shots-gutterext/16-trail-clear-smoketest.png' });

    // paint again (fresh center-ish coordinate), then GO
    await clickCanvasFraction(page, 0.5, 0.5);
    await wait(400);
    R.go_click_ok = await clickTextWithin(page, '[data-testid="vault-playing-actions"]', 'GO');
    await wait(700);
    R.after_go_isRunningOrSettled = await page.evaluate(
      () => document.body.textContent.includes('RUNNING TRAIL') || document.body.textContent.includes('SETTLED') || document.body.textContent.includes('RUGGED'),
    );
    await page.screenshot({ path: 'shots-gutterext/17-trail-go-smoketest.png' });
    await page.close();
  }

  // ================= 1440x900 — SETTLED (RUG/BUST) path, SHITCOIN mode =================
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(600);
    await clickTextWithin(page, '[data-testid="vault-lobby-apein"]', 'ape in');
    await wait(500);
    await selectMode(page, 'SHITCOIN');
    await wait(300);

    let busted = false;
    // Center-weighted spread — see revealOneTileVerified's comment for why
    // 0.15/0.85-style extremes can miss the drawn grid entirely on a
    // wide-aspect viewport.
    const spots = [
      [0.5, 0.5], [0.35, 0.35], [0.65, 0.35], [0.35, 0.65], [0.65, 0.65],
      [0.4, 0.5], [0.6, 0.5], [0.5, 0.4], [0.5, 0.6], [0.45, 0.55],
    ];
    for (let round = 0; round < 8 && !busted; round++) {
      if (round === 0) {
        await clickTextWithin(page, '[data-testid="vault-betentry-confirm"]', 'SEND IT');
      } else {
        // ran out of tiles without a rug this round — cash out (if possible)
        // then bet again with the SAME mode (handleBetAgain keeps state.mode).
        const cashed = await clickTextWithin(page, '[data-testid="vault-playing-actions"]', 'take profit');
        await wait(800);
        if (cashed) {
          await clickTextWithin(page, '[data-testid="vault-settled-betagain"]', 'bet again');
        }
      }
      await wait(700);
      for (const [fx, fy] of spots) {
        const stillPlaying = await isPlaying(page);
        if (!stillPlaying) break;
        await clickCanvasFraction(page, fx, fy);
        // mine-hit -> settling -> settled is a short multi-phase transition
        // (seed-verify spinner in between) — poll rather than a single wait.
        let gotBust = false;
        for (let poll = 0; poll < 4; poll++) {
          await wait(400);
          if (await isSettledBust(page)) { gotBust = true; break; }
          if (await isPlaying(page)) break; // still on the same live tile, keep clicking
        }
        if (gotBust) { busted = true; break; }
      }
    }
    R.bust_achieved = busted;
    R.panel_settled_bust_1440 = await panelEmptyCheck(page);
    R.settled_result_bust_1440 = await page.evaluate(rectOf, '[data-testid="vault-settled-result"]');
    R.settled_result_bust_text_1440 = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="vault-settled-result"]');
      return el ? el.textContent : null;
    });
    await page.screenshot({ path: 'shots-gutterext/05-settled-bust-1440-full.png' });
    R.overflow_settled_bust_1440 = await overflowCheck(page);
    await page.close();
  }

  // ================= 1440x1920 — height-invariance proof (Lobby/Playing/Settled) =================
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1920, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(600);
    R.panel_lobby_1440h1920 = await panelEmptyCheck(page);
    R.lobby_hero_1440h1920 = await page.evaluate(rectOf, '[data-testid="vault-lobby-hero"]');
    R.lobby_apein_1440h1920 = await page.evaluate(rectOf, '[data-testid="vault-lobby-apein"]');
    await page.screenshot({ path: 'shots-gutterext/06-lobby-1440x1920-full.png' });
    R.overflow_lobby_1440h1920 = await overflowCheck(page);

    await clickTextWithin(page, '[data-testid="vault-lobby-apein"]', 'ape in');
    await wait(500);
    await selectMode(page, 'BLUECHIPS');
    await wait(300);
    await clickTextWithin(page, '[data-testid="vault-betentry-confirm"]', 'SEND IT');
    await wait(800);
    R.panel_playing_1440h1920 = await panelEmptyCheck(page);
    R.playing_status_1440h1920 = await page.evaluate(rectOf, '[data-testid="vault-playing-status"]');
    R.playing_actions_1440h1920 = await page.evaluate(rectOf, '[data-testid="vault-playing-actions"]');
    await page.screenshot({ path: 'shots-gutterext/07-playing-1440x1920-full.png' });
    R.overflow_playing_1440h1920 = await overflowCheck(page);

    R.reveal_ok_1440h1920 = await revealOneTileVerified(page, '[data-testid="vault-playing-actions"]');
    await clickTextWithin(page, '[data-testid="vault-playing-actions"]', 'take profit');
    await wait(900);
    R.settled_result_win_1440h1920 = await page.evaluate(rectOf, '[data-testid="vault-settled-result"]');
    R.settled_meta_win_1440h1920 = await page.evaluate(rectOf, '[data-testid="vault-settled-meta"]');
    R.settled_nextbet_win_1440h1920 = await page.evaluate(rectOf, '[data-testid="vault-settled-nextbet"]');
    R.settled_betagain_win_1440h1920 = await page.evaluate(rectOf, '[data-testid="vault-settled-betagain"]');
    R.panel_settled_1440h1920 = await panelEmptyCheck(page);
    await page.screenshot({ path: 'shots-gutterext/08-settled-win-1440x1920-full.png' });
    R.overflow_settled_1440h1920 = await overflowCheck(page);
    await page.close();
  }

  // ================= 1920x1080 — second desktop viewport =================
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(600);
    R.panel_lobby_1920 = await panelEmptyCheck(page);
    R.lobby_hero_1920 = await page.evaluate(rectOf, '[data-testid="vault-lobby-hero"]');
    R.lobby_apein_1920 = await page.evaluate(rectOf, '[data-testid="vault-lobby-apein"]');
    await page.screenshot({ path: 'shots-gutterext/09-lobby-1920-full.png' });
    R.overflow_lobby_1920 = await overflowCheck(page);

    await clickTextWithin(page, '[data-testid="vault-lobby-apein"]', 'ape in');
    await wait(500);
    await selectMode(page, 'BLUECHIPS');
    await wait(300);
    await clickTextWithin(page, '[data-testid="vault-betentry-confirm"]', 'SEND IT');
    await wait(800);
    R.panel_playing_1920 = await panelEmptyCheck(page);
    R.playing_status_1920 = await page.evaluate(rectOf, '[data-testid="vault-playing-status"]');
    R.playing_actions_1920 = await page.evaluate(rectOf, '[data-testid="vault-playing-actions"]');
    await page.screenshot({ path: 'shots-gutterext/10-playing-1920-full.png' });
    R.overflow_playing_1920 = await overflowCheck(page);
    R.cyan_playing_1920 = (await cyanProbe(page)).length;

    R.reveal_ok_1920 = await revealOneTileVerified(page, '[data-testid="vault-playing-actions"]');
    await clickTextWithin(page, '[data-testid="vault-playing-actions"]', 'take profit');
    await wait(900);
    R.settled_result_win_1920 = await page.evaluate(rectOf, '[data-testid="vault-settled-result"]');
    R.settled_meta_win_1920 = await page.evaluate(rectOf, '[data-testid="vault-settled-meta"]');
    R.settled_nextbet_win_1920 = await page.evaluate(rectOf, '[data-testid="vault-settled-nextbet"]');
    R.settled_betagain_win_1920 = await page.evaluate(rectOf, '[data-testid="vault-settled-betagain"]');
    await page.screenshot({ path: 'shots-gutterext/11-settled-win-1920-full.png' });
    R.overflow_settled_1920 = await overflowCheck(page);
    R.cyan_settled_1920 = (await cyanProbe(page)).length;
    R.panel_settled_1920 = await panelEmptyCheck(page);
    await page.close();
  }

  // ================= 390x844 mobile — ALL 4 phases UNCHANGED =================
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(600);
    R.mobile_lobby_hasApeInText = await page.evaluate(() => document.body.textContent.includes('ape in'));
    R.mobile_lobby_gutterDom = await page.evaluate(() => ({
      hero: document.querySelectorAll('[data-testid="vault-lobby-hero"]').length,
      apein: document.querySelectorAll('[data-testid="vault-lobby-apein"]').length,
    }));
    await page.screenshot({ path: 'shots-gutterext/12-mobile-390-lobby-full.png', fullPage: true });

    await clickText(page, 'ape in');
    await wait(500);
    R.mobile_hasSetYourPlay = await page.evaluate(() => document.body.textContent.includes('SET YOUR PLAY'));
    R.mobile_hasBetConsoleRoot = await page.evaluate(() => !!document.querySelector('[data-testid="bet-console"]'));
    await selectMode(page, 'BLUECHIPS');
    await wait(300);
    await clickText(page, 'SEND IT');
    await wait(800);
    R.mobile_playing_hasTakeProfitText = await page.evaluate(() => document.body.textContent.includes('take profit') || document.body.textContent.includes('TAKE PROFIT'));
    R.mobile_playing_gutterDom = await page.evaluate(() => ({
      status: document.querySelectorAll('[data-testid="vault-playing-status"]').length,
      actions: document.querySelectorAll('[data-testid="vault-playing-actions"]').length,
    }));
    await page.screenshot({ path: 'shots-gutterext/13-mobile-390-playing-full.png', fullPage: true });

    R.reveal_ok_mobile = await revealOneTileVerified(page, null);
    await clickText(page, 'take profit');
    await wait(900);
    R.mobile_settled_gutterDom = await page.evaluate(() => ({
      result: document.querySelectorAll('[data-testid="vault-settled-result"]').length,
      betagain: document.querySelectorAll('[data-testid="vault-settled-betagain"]').length,
    }));
    R.mobile_settled_hasBetAgainText = await page.evaluate(() => document.body.textContent.includes('bet again'));
    await page.screenshot({ path: 'shots-gutterext/14-mobile-390-settled-full.png', fullPage: true });
    await page.close();
  }

  // ================= Source hygiene =================
  const src = fs.readFileSync('../originals/vault/VaultExperience.tsx', 'utf8');
  const lines = src.split('\n');
  const codeLines = lines.filter((l) => {
    const t = l.trim();
    return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*'));
  });
  const codeText = codeLines.join('\n');
  R.grep_topOffset_400_all = (src.match(/topOffset:\s*400/g) || []).length;
  R.grep_topOffset_400_codeOnly = (codeText.match(/topOffset:\s*400/g) || []).length;
  R.grep_BETENTRY_GUTTER_topOffset_72 = (src.match(/topOffset:\s*72/g) || []).length;
  R.grep_new_components = {
    LobbyGutterCards: (src.match(/function LobbyGutterCards/g) || []).length,
    PlayingGutterCards: (src.match(/function PlayingGutterCards/g) || []).length,
    SettledGutterCards: (src.match(/function SettledGutterCards/g) || []).length,
  };
  R.grep_gutterCardCta_reused = (src.match(/styles\.gutterCardCta\b/g) || []).length;
  R.grep_PhaseSurface_isWide_null_count = (src.match(/isWide \? null : </g) || []).length;

  // ================= Contrast — CORE ACTION buttons (TAKE PROFIT most critical) =================
  function gradeContrast(label, computedStyle) {
    if (!computedStyle) return { label, error: 'button not found' };
    const colorRgb = parseRgb(computedStyle.color);
    // These 3 buttons all reuse the SAME unchanged gradient family
    // (T.accentSolid -> #00a85a) with T.accentInk text — grade against both
    // stops, report the worse (min) ratio.
    const cTop = colorRgb ? contrast(colorRgb, STOP_TOP) : null;
    const cBottom = colorRgb ? contrast(colorRgb, STOP_BOTTOM) : null;
    return {
      label,
      text: computedStyle.text,
      opacity: computedStyle.opacity,
      color: computedStyle.color,
      contrastVsTopStop: cTop ? cTop.toFixed(2) : null,
      contrastVsBottomStop: cBottom ? cBottom.toFixed(2) : null,
      worstCaseAA_normalText: cBottom !== null ? cBottom >= 4.5 : null,
      widthVsParent: computedStyle.width && computedStyle.parentWidth
        ? `${computedStyle.width.toFixed(1)} / ${computedStyle.parentWidth.toFixed(1)}`
        : null,
      minWidthComputed: computedStyle.minWidth,
    };
  }
  R.contrast_apein = gradeContrast('APE IN', R.lobby_apein_style_1440);
  R.contrast_takeprofit_enabled = gradeContrast('TAKE PROFIT (enabled)', R.takeprofit_style_enabled_1440);
  R.contrast_betagain = gradeContrast('BET AGAIN', R.settled_betagain_style_1440);

  await browser.close();
  fs.writeFileSync('gutterext0703-results.json', JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();
