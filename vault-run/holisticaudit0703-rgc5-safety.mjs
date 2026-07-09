// HOLISTIC AUDIT 2026-07-03 — rg-c5 lane. Fresh independent driver, port 5309.
// Focus: RG-C5 structural + RG-C6 always-reachable + RG-C8 safety-surface
// reachability, re-verified AFTER today's BetEntry board-gap fix
// (BETENTRY_PANEL_GAP=32 / onBoardLayout threading).
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

async function cellCenter(page, idx, gridSize) {
  return await page.evaluate(({ idx, gridSize }) => {
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    const W = r.width, H = r.height;
    const topReserved = H * 0.15, bottomReserved = H * 0.18, sideFrac = 0.08;
    const safeW = W * (1 - sideFrac * 2);
    const safeH = (H - topReserved - bottomReserved) * 0.96;
    const available = Math.min(safeW, safeH);
    const gap = Math.max(6, available * 0.026);
    const tile = (available - gap * (gridSize - 1)) / gridSize;
    const full = tile * gridSize + gap * (gridSize - 1);
    const x0 = (W - full) / 2;
    const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2;
    const y0 = bandCenterY - full / 2;
    const col = idx % gridSize, row = Math.floor(idx / gridSize);
    const cx = r.left + x0 + col * (tile + gap) + tile / 2;
    const cy = r.top + y0 + row * (tile + gap) + tile / 2;
    return { cx, cy };
  }, { idx, gridSize });
}

async function safetyProbe(page, label, R) {
  // AutopickSafetySurface (RG-C8 structural plant) — text signature "AUTO-PICK" + "PHASE 2"
  const autopick = await page.evaluate(() => {
    const body = document.body.textContent;
    return {
      hasAutopickLabel: body.includes('AUTO-PICK'),
      hasPhase2Badge: body.includes('PHASE 2'),
      hasAutopickCopy: body.toLowerCase().includes('max session loss'),
      autopickBlockNodes: document.querySelectorAll('button[title*="Auto-pick"]').length,
    };
  });
  const sessionMeta = await page.evaluate(() => ({
    hasBalance: document.body.textContent.includes('BALANCE'),
    hasSessionMetaText: !!document.querySelector('.tape-session, [data-testid*=session]') || document.body.textContent.includes('SESSION'),
  }));
  const help = await page.evaluate(() => ({
    mobileHelp: !!document.querySelector('[aria-label*="Help"]'),
    cornerHelp: !!document.querySelector('[data-testid="vault-corner-help"]'),
  }));
  R[label] = { autopick, sessionMeta, help };
}

async function boardGapProbe(page, label, R) {
  const gap = await page.evaluate(() => {
    const board = document.querySelector('canvas');
    const right = document.querySelector('[data-testid="vault-betentry-right"]');
    if (!board || !right) return { found: false };
    const b = board.getBoundingClientRect();
    const rr = right.getBoundingClientRect();
    return {
      found: true,
      boardRight: b.right,
      panelLeft: rr.left,
      gap: rr.left - b.right,
      panelRect: { top: rr.top, bottom: rr.bottom, left: rr.left, right: rr.right },
      viewportRight: window.innerWidth,
      overlaps: rr.left < b.right,
    };
  });
  R[label] = gap;
}

async function cashOutReachProbe(page, label, R) {
  const style = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="vault-playing-actions"]');
    if (!card) return { found: false };
    const btns = [...card.querySelectorAll('button')];
    const b = btns.find((x) => x.textContent.toLowerCase().includes('take profit'));
    if (!b) return { found: false, cardExists: true };
    const cs = getComputedStyle(b);
    const r = b.getBoundingClientRect();
    return {
      found: true,
      display: cs.display,
      visibility: cs.visibility,
      opacity: cs.opacity,
      disabled: b.disabled,
      rect: { w: r.width, h: r.height, top: r.top, left: r.left },
      inViewport: r.top >= 0 && r.left >= 0,
    };
  });
  R[label] = style;
}

async function runWorldViewport(browser, viewport, worldLabel, R) {
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));
  await page.setViewport({ width: viewport.w, height: viewport.h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);

  const prefix = `${worldLabel}_${viewport.w}x${viewport.h}`;

  // LOBBY
  await safetyProbe(page, `${prefix}_lobby_safety`, R);
  await page.screenshot({ path: `${OUT}/${prefix}-lobby.png` });

  // -> BETENTRY
  await clickText(page, 'ape in');
  await wait(400);
  await clickText(page, worldLabel, '[data-testid="vault-betentry-world"]');
  await wait(200);
  await safetyProbe(page, `${prefix}_betentry_safety`, R);
  await boardGapProbe(page, `${prefix}_betentry_boardgap`, R);
  await page.screenshot({ path: `${OUT}/${prefix}-betentry.png` });

  // -> PLAYING
  const sendItClicked = await clickText(page, 'SEND IT', '[data-testid="vault-betentry-confirm"]');
  R[`${prefix}_sendit_clicked`] = sendItClicked;
  await wait(700);
  await safetyProbe(page, `${prefix}_playing_safety_beforereveal`, R);
  await cashOutReachProbe(page, `${prefix}_playing_takeprofit_beforereveal`, R);
  await page.screenshot({ path: `${OUT}/${prefix}-playing-beforereveal.png` });

  const gridSize = worldLabel === 'shitcoin' ? 7 : 5;
  let revealed = false;
  for (let i = 0; i < gridSize * gridSize && !revealed; i++) {
    const { cx, cy } = await cellCenter(page, i, gridSize);
    await page.mouse.click(cx, cy);
    await wait(350);
    const canCashOutNow = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="vault-playing-actions"]');
      if (!el) return false;
      const btns = [...el.querySelectorAll('button')];
      const b = btns.find((x) => x.textContent.toLowerCase().includes('take profit'));
      return b ? !b.disabled : false;
    });
    const stillPlaying = await page.evaluate(() => document.body.textContent.includes('PUMPING') || document.body.textContent.includes('TRAIL') || document.body.textContent.includes('RUNNING'));
    if (canCashOutNow) { revealed = true; break; }
    if (!stillPlaying) break;
  }
  R[`${prefix}_gotSafeReveal`] = revealed;

  if (revealed) {
    await cashOutReachProbe(page, `${prefix}_playing_takeprofit_afterreveal`, R);
    await page.screenshot({ path: `${OUT}/${prefix}-playing-afterreveal.png` });

    const cashoutClicked = await clickText(page, 'take profit', '[data-testid="vault-playing-actions"]');
    R[`${prefix}_cashout_clicked`] = cashoutClicked;
    await wait(700);

    // -> SETTLED
    await safetyProbe(page, `${prefix}_settled_safety`, R);
    R[`${prefix}_settled_betAgainReachable`] = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="vault-settled-betagain"]');
      if (!el) return { found: false };
      const btns = [...el.querySelectorAll('button')];
      const b = btns.find((x) => x.textContent.toLowerCase().includes('bet again') && !x.textContent.toLowerCase().includes('same trail'));
      if (!b) return { found: false };
      const cs = getComputedStyle(b);
      return { found: true, display: cs.display, visibility: cs.visibility, disabled: b.disabled };
    });
    await page.screenshot({ path: `${OUT}/${prefix}-settled.png` });
  } else {
    // mine-hit happened before any safe reveal -> also lands on settled (BUST); still probe safety
    await wait(300);
    R[`${prefix}_bustPathTaken`] = true;
    await safetyProbe(page, `${prefix}_settled_safety_bustpath`, R);
    await page.screenshot({ path: `${OUT}/${prefix}-settled-bust.png` });
  }

  R[`${prefix}_consoleErrors`] = consoleErrors;
  await page.close();
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  fs.mkdirSync(OUT, { recursive: true });
  const R = {};

  const viewports = [{ w: 1440, h: 900 }, { w: 1920, h: 1080 }];
  const worlds = ['bluechips', 'altseason', 'shitcoin'];

  for (const vp of viewports) {
    for (const world of worlds) {
      await runWorldViewport(browser, vp, world, R);
    }
  }

  // ---- MOBILE 390x844 — must be fully byte-unchanged ----
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await wait(500);
    R.mobile_gutterDom = await page.evaluate(() => ({
      lobbyLeft: document.querySelectorAll('[data-testid="vault-lobby-left"]').length,
      lobbyRight: document.querySelectorAll('[data-testid="vault-lobby-right"]').length,
      betentryLeft: document.querySelectorAll('[data-testid="vault-betentry-left"]').length,
      betentryRight: document.querySelectorAll('[data-testid="vault-betentry-right"]').length,
      playingLeft: document.querySelectorAll('[data-testid="vault-playing-left"]').length,
      playingRight: document.querySelectorAll('[data-testid="vault-playing-right"]').length,
      settledLeft: document.querySelectorAll('[data-testid="vault-settled-left"]').length,
      cornerGear: document.querySelectorAll('[data-testid="vault-corner-gear"]').length,
      cornerHelp: document.querySelectorAll('[data-testid="vault-corner-help"]').length,
    }));
    await safetyProbe(page, 'mobile_lobby_safety', R);
    R.mobile_helpButtonVisible = await page.evaluate(() => {
      const btn = document.querySelector('[aria-label*="Help"]');
      if (!btn) return { found: false };
      const cs = getComputedStyle(btn);
      return { found: true, display: cs.display, visibility: cs.visibility };
    });
    await page.screenshot({ path: `${OUT}/mobile-390-lobby.png` });
    await page.close();
  }

  await browser.close();
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();
