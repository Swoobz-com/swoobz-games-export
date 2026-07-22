// Holistic Mobile-Touch QA audit — Rug or Riches (vault) gutter migration.
// Confirms mobile (<960) is genuinely unaffected, measures hit-targets across
// all 4 phases, and exercises win+rug outcomes across all 3 worlds.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = '5301';
const OUT_DIR = 'shots-holisticaudit0703/mtqa';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function betConsolePresent(page) {
  return await page.evaluate(() => {
    const el = document.querySelector('[data-testid="bet-console"]');
    if (!el) return { present: false };
    const r = el.getBoundingClientRect();
    return { present: true, width: r.width, height: r.height, top: r.top, bottom: r.bottom, fullWidth: r.width >= window.innerWidth * 0.85 };
  });
}

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
  if (!el) return { ok: false, reason: 'not found' };
  await page.evaluate((e) => e.scrollIntoView({ block: 'center' }), el);
  await wait(120);
  const box = await el.boundingBox();
  if (!box) return { ok: false, reason: 'no boundingBox' };
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  try {
    await page.touchscreen.tap(x, y);
  } catch (e) {
    return { ok: false, reason: `tap threw: ${e.message}` };
  }
  return { ok: true, box };
}

async function hitTargetAndTouchAction(page, t) {
  const h = await findButtonByText(page, t);
  const el = h.asElement();
  if (!el) return { found: false };
  const box = await el.boundingBox();
  const touchAction = await page.evaluate((e) => getComputedStyle(e).touchAction, el);
  const disabled = await page.evaluate((e) => !!e.disabled, el);
  return { found: true, width: box?.width, height: box?.height, touchAction, top: box?.y, bottom: (box?.y ?? 0) + (box?.height ?? 0), disabled };
}

function thumbZoneVerdict(box, viewportHeight) {
  if (!box) return { verdict: 'N/A', pct: null };
  const centerY = box.y + box.height / 2;
  const pct = (centerY / viewportHeight) * 100;
  const inZone = pct >= 30 && pct <= 90;
  return { verdict: inZone ? 'PASS' : 'FAIL', pct: pct.toFixed(1) };
}

async function overflowCheck(page) {
  return await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
  }));
}

async function selectModeIfPresent(page, modeName) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button')];
    return els.find((e) => e.offsetParent !== null && e.textContent.toUpperCase().includes(t));
  }, modeName);
  const el = h.asElement();
  let result = { found: !!el };
  if (el) {
    await page.evaluate((e) => e.scrollIntoView({ block: 'center' }), el);
    await wait(100);
    const box = await el.boundingBox();
    if (box) {
      result.box = box;
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      result.tapped = true;
    }
  }
  return result;
}

async function takeProfitEnabled(page) {
  return await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.toLowerCase().includes('take profit'));
    return btn ? !btn.disabled : false;
  });
}

async function isSettled(page) {
  return await page.evaluate(() => {
    const t = document.body.textContent || '';
    return t.toLowerCase().includes('bet again');
  });
}

async function outcomeText(page) {
  return await page.evaluate(() => {
    const t = (document.body.textContent || '').toUpperCase();
    if (t.includes('RUGGED') || t.includes('RUG PULLED') || t.includes('RUG!') || t.includes('BUSTED')) return 'rug';
    if (t.includes('CASHED OUT') || t.includes('SECURED') || t.includes('YOU WON') || t.includes('PROFIT')) return 'win';
    return 'unknown';
  });
}

async function canvasBox(page) {
  const h = await page.evaluateHandle(() => document.querySelector('canvas'));
  const el = h.asElement();
  if (!el) return null;
  return await el.boundingBox();
}

async function tapCanvasFraction(page, fx, fy) {
  const box = await canvasBox(page);
  if (!box) return { ok: false, reason: 'no canvas' };
  const x = box.x + box.width * fx;
  const y = box.y + box.height * fy;
  try {
    await page.touchscreen.tap(x, y);
    return { ok: true, box };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

// Wide fraction spread to maximize chance of hitting distinct tiles across
// grids up to 7x7.
const TILE_SPOTS = [
  [0.5, 0.5], [0.15, 0.15], [0.85, 0.15], [0.15, 0.85], [0.85, 0.85],
  [0.3, 0.4], [0.7, 0.6], [0.4, 0.7], [0.6, 0.3], [0.2, 0.5],
  [0.5, 0.2], [0.8, 0.5], [0.5, 0.8], [0.35, 0.35], [0.65, 0.65],
];

async function playRound(page, dev, world, desiredOutcome, log) {
  // BET ENTRY phase already reached by caller. Select world.
  const modeSelect = await selectModeIfPresent(page, world.toUpperCase());
  await wait(300);
  log.modeSelect = modeSelect;

  const sendIt = await hitTargetAndTouchAction(page, 'send it');
  const sendItBox = (await (await findButtonByText(page, 'send it')).asElement())
    ? await (await (await findButtonByText(page, 'send it')).asElement()).boundingBox()
    : null;
  log.sendItHitTarget = sendIt;
  log.sendItThumbZone = thumbZoneVerdict(sendItBox, dev.height);
  await page.screenshot({ path: `${OUT_DIR}/${dev.name}-${world}-02-betentry.png` });

  const tapResult = await tapButtonByText(page, 'send it');
  await wait(700);
  log.sendItTap = tapResult;

  await page.screenshot({ path: `${OUT_DIR}/${dev.name}-${world}-03-playing-start.png` });

  const gridTiles = world === 'shitcoin' ? 7 : 5;
  const cbox = await canvasBox(page);
  log.canvasBox = cbox;
  log.tileHitTargetEstCss = cbox ? { width: cbox.width / gridTiles, height: cbox.height / gridTiles } : null;

  let taps = 0;
  let busted = false;
  let tookProfit = false;
  for (const [fx, fy] of TILE_SPOTS) {
    const stillPlaying = await page.evaluate(() => (document.body.textContent || '').toUpperCase().includes('TAKE PROFIT') || (document.body.textContent||'').toUpperCase().includes('TRAIL'));
    if (!stillPlaying) { busted = true; break; }
    const res = await tapCanvasFraction(page, fx, fy);
    taps++;
    await wait(350);
    const stillPlaying2 = await page.evaluate(() => (document.body.textContent || '').toUpperCase().includes('TAKE PROFIT') || (document.body.textContent||'').toUpperCase().includes('TRAIL'));
    if (!stillPlaying2) { busted = true; break; }
    if (desiredOutcome === 'win' && (await takeProfitEnabled(page))) {
      const tpResult = await tapButtonByText(page, 'take profit');
      await wait(700);
      tookProfit = true;
      log.takeProfitTap = tpResult;
      break;
    }
    if (taps >= 10) break; // safety cap
  }
  log.tapsUsed = taps;
  log.busted = busted;
  log.tookProfit = tookProfit;

  // If desiredOutcome === win but busted first, that's a rug (RNG) — accept
  // what happened, report honestly. If desiredOutcome === rug and never
  // busted within cap, force a cash-out to end the round cleanly (report
  // that rug wasn't achieved this round).
  if (!busted && !tookProfit) {
    const tp = await hitTargetAndTouchAction(page, 'take profit');
    if (tp.found && !tp.disabled) {
      await tapButtonByText(page, 'take profit');
      await wait(700);
      tookProfit = true;
    }
  }

  await wait(400);
  const settled = await isSettled(page);
  const outcome = await outcomeText(page);
  log.settledReached = settled;
  log.outcomeTextDetected = outcome;
  await page.screenshot({ path: `${OUT_DIR}/${dev.name}-${world}-04-settled-${outcome}.png` });
  return { settled, outcome };
}

const DEVICES = [
  { name: 'pixel7', width: 412, height: 915, dpr: 2.625 },
  { name: 'iphone14pro', width: 393, height: 852, dpr: 3 },
];

// (device, world, desiredOutcome) combos — 3 worlds x 2 outcomes, split
// across the two mobile devices, per the task brief.
const COMBOS = [
  { dev: 'pixel7', world: 'bluechips', desired: 'win' },
  { dev: 'pixel7', world: 'altseason', desired: 'rug' },
  { dev: 'pixel7', world: 'shitcoin', desired: 'rug' },
  { dev: 'iphone14pro', world: 'bluechips', desired: 'rug' },
  { dev: 'iphone14pro', world: 'altseason', desired: 'win' },
  { dev: 'iphone14pro', world: 'shitcoin', desired: 'win' },
];

(async () => {
  await fs.promises.mkdir(OUT_DIR, { recursive: true }).catch(() => {});
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const R = { port: PORT, timestamp: new Date().toISOString(), combos: [] };

  for (const combo of COMBOS) {
    const dev = DEVICES.find((d) => d.name === combo.dev);
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));
    await page.setViewport({ width: dev.width, height: dev.height, deviceScaleFactor: dev.dpr, hasTouch: true, isMobile: true });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(500);

    const log = { device: dev.name, world: combo.world, desiredOutcome: combo.desired };

    // LOBBY
    const gutterLobby = await gutterDomCounts(page);
    const betConsoleLobby = await betConsolePresent(page);
    const overflowLobby = await overflowCheck(page);
    const apeIn = await hitTargetAndTouchAction(page, 'ape in');
    const apeInBox = (await (await findButtonByText(page, 'ape in')).asElement())
      ? await (await (await findButtonByText(page, 'ape in')).asElement()).boundingBox()
      : null;
    log.lobby = {
      gutterLeaks: Object.entries(gutterLobby).filter(([, v]) => v > 0),
      betConsolePresent: betConsoleLobby,
      overflow: overflowLobby,
      apeInHitTarget: apeIn,
      apeInThumbZone: thumbZoneVerdict(apeInBox, dev.height),
    };
    await page.screenshot({ path: `${OUT_DIR}/${dev.name}-${combo.world}-01-lobby.png` });
    const apeTap = await tapButtonByText(page, 'ape in');
    log.lobby.apeInTap = apeTap;
    await wait(500);

    // BET ENTRY + PLAYING + SETTLED (combined in playRound)
    const gutterBetEntry = await gutterDomCounts(page);
    const betConsoleBetEntry = await betConsolePresent(page);
    log.betEntryGutterLeaks = Object.entries(gutterBetEntry).filter(([, v]) => v > 0);
    log.betEntryBetConsolePresent = betConsoleBetEntry;

    const roundLog = {};
    const result = await playRound(page, dev, combo.world, combo.desired, roundLog);
    log.round = roundLog;
    log.matchedDesired = result.outcome === combo.desired;

    // SETTLED
    const gutterSettled = await gutterDomCounts(page);
    const betConsoleSettled = await betConsolePresent(page);
    const overflowSettled = await overflowCheck(page);
    const betAgain = await hitTargetAndTouchAction(page, 'bet again');
    const betAgainBox = (await (await findButtonByText(page, 'bet again')).asElement())
      ? await (await (await findButtonByText(page, 'bet again')).asElement()).boundingBox()
      : null;
    log.settled = {
      gutterLeaks: Object.entries(gutterSettled).filter(([, v]) => v > 0),
      betConsolePresent: betConsoleSettled,
      overflow: overflowSettled,
      betAgainHitTarget: betAgain,
      betAgainThumbZone: thumbZoneVerdict(betAgainBox, dev.height),
    };

    log.consoleErrors = consoleErrors;
    R.combos.push(log);
    await page.close();
    console.log(`done: ${combo.dev}/${combo.world}/${combo.desired} -> outcome=${result.outcome}`);
  }

  await browser.close();
  fs.writeFileSync(`${OUT_DIR}/../holisticaudit0703-mtqa-mobile-results.json`, JSON.stringify(R, null, 2));
  console.log('ALL DONE');
})();
