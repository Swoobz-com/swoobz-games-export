// FINAL decisive re-measure (2026-07-03, vault-betentry-rightcol-migration).
// Confirms BOTH fixes simultaneously, live-measured, against a FRESH dev
// server (no stale HMR history):
//   1. boardHeightCss = min(89vh,1000px) desktop -> internal SEND IT clip fix
//   2. pageStyle.padding bottom 28->6 on isWide -> page-scrollbar fix
// Refresh of holdgate-betentry-rightcol-fix-0703.mjs, own output dir.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5333';
const OUT = 'shots-betentry-rightcol-final-0703';
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

async function clickTextWithin(page, selector, t) {
  return clickText(page, t, selector);
}

async function rectOf(page, selector) {
  return await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
  }, selector);
}

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

async function overflowState(page) {
  return await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    hasVScroll: document.documentElement.scrollHeight > window.innerHeight + 1,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    hasHScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }));
}

async function measureViewport(browser, w, h, label) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in');
  await wait(700);

  const shell = await rectOf(page, '[data-testid="vault-canvas-shell"]');
  const left = await rectOf(page, '[data-testid="vault-betentry-left"]');
  const world = await rectOf(page, '[data-testid="vault-betentry-world"]');
  const yourbet = await rectOf(page, '[data-testid="vault-betentry-yourbet"]');
  const confirm = await rectOf(page, '[data-testid="vault-betentry-confirm"]');
  const boardHeight = shell ? shell.height : null;

  const leftChildCount = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-betentry-left"]');
    return el ? el.childElementCount : null;
  });

  const order = await page.evaluate(() => {
    const right = document.querySelector('[data-testid="vault-betentry-right"]');
    if (!right) return null;
    return [...right.children].map((c) => c.getAttribute('data-testid'));
  });

  const sendItInfo = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="vault-betentry-confirm"]');
    if (!card) return null;
    const btn = [...card.querySelectorAll('button')][0];
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    const cs = getComputedStyle(btn);
    return {
      text: btn.textContent.trim(),
      rect: { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height },
      opacity: cs.opacity,
      backgroundImage: cs.backgroundImage,
      backgroundColor: cs.backgroundColor,
      color: cs.color,
      visibility: cs.visibility,
      display: cs.display,
    };
  });

  // Clip check: is SEND IT rect fully inside the shell's bottom edge (no clip)?
  const sendItClipped = shell && sendItInfo ? sendItInfo.rect.bottom > shell.bottom + 0.5 : null;

  const usableGutterHeight = shell ? shell.bottom - (shell.top + 72) : null;
  const slack = shell && confirm ? shell.bottom - confirm.bottom : null;

  await page.screenshot({ path: `${OUT}/${label}-full.png` });
  if (shell) {
    await page.screenshot({
      path: `${OUT}/${label}-shell.png`,
      clip: { x: Math.max(0, shell.left), y: Math.max(0, shell.top), width: Math.min(w, shell.width), height: Math.min(h, shell.height) },
    });
  }
  if (confirm) {
    await page.screenshot({
      path: `${OUT}/${label}-confirm-card.png`,
      clip: { x: Math.max(0, confirm.left - 10), y: Math.max(0, confirm.top - 10), width: Math.min(w, confirm.width + 20), height: Math.min(h - Math.max(0, confirm.top - 10), confirm.height + 20) },
    });
  }

  const ov = await overflowState(page);

  await page.close();

  return {
    viewport: { w, h },
    shell,
    boardHeight,
    usableGutterHeight,
    left,
    leftChildCount,
    world,
    yourbet,
    confirm,
    slack,
    order,
    sendItInfo,
    sendItClipped,
    scrollHeight: ov.scrollHeight,
    hasVScroll: ov.hasVScroll,
    hasHScroll: ov.hasHScroll,
    innerHeight: h,
  };
}

async function measureLetterbox(browser, w, h, label) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);

  const cabinet = await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]');
    if (!shell) return null;
    const cabinetEl = shell.parentElement;
    const r = cabinetEl.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
  });
  const shell = await rectOf(page, '[data-testid="vault-canvas-shell"]');

  const ov = await overflowState(page);

  await page.screenshot({ path: `${OUT}/${label}-ultrawide-full.png` });

  const topLetterbox = cabinet ? cabinet.top : null;
  const bottomLetterbox = cabinet ? h - cabinet.bottom : null;

  await page.close();
  return {
    viewport: { w, h }, cabinet, shell, boardHeight: shell ? shell.height : null,
    topLetterbox, bottomLetterbox,
    scrollHeight: ov.scrollHeight, hasVScroll: ov.hasVScroll, innerHeight: h,
  };
}

async function measureMobile(browser, w, h, label) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in');
  await wait(700);

  const gutterDom = await page.evaluate(() => ({
    left: document.querySelectorAll('[data-testid="vault-betentry-left"]').length,
    right: document.querySelectorAll('[data-testid="vault-betentry-right"]').length,
    world: document.querySelectorAll('[data-testid="vault-betentry-world"]').length,
    yourbet: document.querySelectorAll('[data-testid="vault-betentry-yourbet"]').length,
    confirm: document.querySelectorAll('[data-testid="vault-betentry-confirm"]').length,
  }));
  const hasSetYourPlay = await page.evaluate(() => document.body.textContent.includes('SET YOUR PLAY'));
  const sendItPresent = await page.evaluate(() => {
    const els = [...document.querySelectorAll('button')];
    const b = els.find((e) => e.textContent.toUpperCase().includes('SEND IT'));
    return b ? { text: b.textContent.trim(), disabled: b.disabled } : null;
  });

  const ov = await overflowState(page);

  await page.screenshot({ path: `${OUT}/${label}-mobile-full.png`, fullPage: true });
  await page.close();
  return {
    viewport: { w, h }, gutterDom, hasSetYourPlay, sendItPresent,
    scrollHeight: ov.scrollHeight, hasVScroll: ov.hasVScroll,
  };
}

// ---- Other-desktop-phase spot check (Playing / Settled-win / Settled-bust) ----
// The bottom-padding trim (28->6, isWide only) is global for isWide, so this
// confirms it didn't clip/scroll Playing/Settled panels (whose chrome budget
// differs from BetEntry's null-branched left column per game-designer's note).
async function measurePlayingSettled(browser, w, h) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  const out = {};

  // ---- WIN path (BLUECHIPS, take-profit) ----
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in');
  await wait(500);
  await selectMode(page, 'BLUECHIPS');
  await wait(300);
  await clickTextWithin(page, '[data-testid="vault-betentry-confirm"]', 'SEND IT');
  await wait(800);

  const playingActions = await rectOf(page, '[data-testid="vault-playing-actions"]');
  const shellPlaying = await rectOf(page, '[data-testid="vault-canvas-shell"]');
  const ovPlaying = await overflowState(page);
  await page.screenshot({ path: `${OUT}/other-phase-playing-1440x900-full.png` });
  out.playing = {
    playingActions,
    shellPlaying,
    playingActionsBelowShell: playingActions && shellPlaying ? playingActions.top >= shellPlaying.top : null,
    scrollHeight: ovPlaying.scrollHeight,
    hasVScroll: ovPlaying.hasVScroll,
  };

  // reveal one tile (mine-hit or safe), then take profit if possible
  const spots = [[0.5, 0.5], [0.45, 0.4], [0.55, 0.6], [0.4, 0.55], [0.6, 0.45], [0.5, 0.35]];
  let cashedOut = false;
  for (const [fx, fy] of spots) {
    const stillPlaying = await isPlaying(page);
    if (!stillPlaying) break;
    await clickCanvasFraction(page, fx, fy);
    await wait(500);
    const enabled = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="vault-playing-actions"]');
      if (!root) return false;
      const btn = [...root.querySelectorAll('button')].find((b) => b.textContent.toLowerCase().includes('take profit'));
      return btn ? !btn.disabled : false;
    });
    if (enabled) {
      await clickTextWithin(page, '[data-testid="vault-playing-actions"]', 'take profit');
      await wait(900);
      cashedOut = true;
      break;
    }
  }
  out.cashedOut = cashedOut;

  const settledResult = await rectOf(page, '[data-testid="vault-settled-result"]');
  const settledBetagain = await rectOf(page, '[data-testid="vault-settled-betagain"]');
  const shellSettled = await rectOf(page, '[data-testid="vault-canvas-shell"]');
  const ovSettledWin = await overflowState(page);
  await page.screenshot({ path: `${OUT}/other-phase-settled-win-1440x900-full.png` });
  out.settledWin = {
    settledResult,
    settledBetagain,
    shellSettled,
    betagainBelowShellTop: settledBetagain && shellSettled ? settledBetagain.top >= shellSettled.top : null,
    scrollHeight: ovSettledWin.scrollHeight,
    hasVScroll: ovSettledWin.hasVScroll,
  };

  await page.close();

  // ---- BUST path (SHITCOIN, mine-hit -> settling -> settled) ----
  const page2 = await browser.newPage();
  await page2.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page2.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page2, 'ape in');
  await wait(500);
  await selectMode(page2, 'SHITCOIN');
  await wait(300);
  await clickTextWithin(page2, '[data-testid="vault-betentry-confirm"]', 'SEND IT');
  await wait(700);

  let busted = false;
  const spots2 = [
    [0.5, 0.5], [0.35, 0.35], [0.65, 0.35], [0.35, 0.65], [0.65, 0.65],
    [0.4, 0.5], [0.6, 0.5], [0.5, 0.4], [0.5, 0.6], [0.45, 0.55],
  ];
  for (let round = 0; round < 6 && !busted; round++) {
    if (round > 0) {
      const cashed = await clickTextWithin(page2, '[data-testid="vault-playing-actions"]', 'take profit');
      await wait(800);
      if (cashed) await clickTextWithin(page2, '[data-testid="vault-settled-betagain"]', 'bet again');
      await wait(700);
    }
    for (const [fx, fy] of spots2) {
      const stillPlaying = await isPlaying(page2);
      if (!stillPlaying) break;
      await clickCanvasFraction(page2, fx, fy);
      // mine-hit -> settling -> settled is a short multi-phase transition; poll
      for (let poll = 0; poll < 4; poll++) {
        await wait(400);
        if (await isSettledBust(page2)) { busted = true; break; }
        if (await isPlaying(page2)) break;
      }
      if (busted) break;
    }
  }
  out.bustAchieved = busted;
  const settledResultBust = await rectOf(page2, '[data-testid="vault-settled-result"]');
  const shellSettledBust = await rectOf(page2, '[data-testid="vault-canvas-shell"]');
  const ovSettledBust = await overflowState(page2);
  await page2.screenshot({ path: `${OUT}/other-phase-settled-bust-1440x900-full.png` });
  out.settledBust = {
    settledResultBust,
    shellSettledBust,
    scrollHeight: ovSettledBust.scrollHeight,
    hasVScroll: ovSettledBust.hasVScroll,
  };
  await page2.close();

  return out;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  fs.mkdirSync(OUT, { recursive: true });
  const R = {};

  R.v_1440x900 = await measureViewport(browser, 1440, 900, '1440x900');
  R.v_1440x1920 = await measureViewport(browser, 1440, 1920, '1440x1920');
  R.v_1920x1080 = await measureViewport(browser, 1920, 1080, '1920x1080');

  R.letterbox_1920x1080 = await measureLetterbox(browser, 1920, 1080, '1920x1080');
  R.letterbox_2560x1440 = await measureLetterbox(browser, 2560, 1440, '2560x1440');

  R.mobile_390x844 = await measureMobile(browser, 390, 844, '390x844');
  R.mobile_412x915 = await measureMobile(browser, 412, 915, '412x915-pixel7');

  R.otherPhases_1440x900 = await measurePlayingSettled(browser, 1440, 900);

  await browser.close();
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();
