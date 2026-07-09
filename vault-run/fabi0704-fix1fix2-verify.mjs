// fabi0704-fix1fix2-verify.mjs — evidence driver for the two Tim-approved
// fixes landed by game-art-director-as-MAKER (2026-07-04, task_category
// fabi-vault-fix1fix2):
//   FIX 1 — SESSION PULSE gutter card de-dup (removed right-gutter MIRROR,
//           `showA` && history.length > 0 gate) — proves: (a) absent with
//           0 rounds, (b) present exactly ONCE with >=1 round, live stats.
//   FIX 2 — "change mode" -> "new setup" copy at both button sites.
// Reuses the ape-in / wager / play / settle driver pattern established in
// changemode-verify-0704.mjs.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5196';
const OUT = process.argv[3] || 'shots-fabi0704-fix1fix2';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

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
async function clickTextWithin(page, selector, t) { return clickText(page, t, selector); }

async function isSettled(page) {
  // Desktop settles via SettledGutterCards (`vault-settled-betagain`);
  // mobile via Settlement()'s own panel (`vault-settledpanel`, no gutter
  // cards mount below 960px) — check both so this works on either viewport.
  return await page.evaluate(
    () =>
      !!document.querySelector('[data-testid="vault-settled-betagain"]') ||
      !!document.querySelector('[data-testid="vault-settledpanel"]'),
  );
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
async function takeProfitIfEnabled(page) {
  return await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent.toLowerCase().includes('take profit') && !b.disabled,
    );
    if (btn) { btn.click(); return true; }
    return false;
  });
}

async function startRound(page) {
  await clickText(page, 'ape in');
  await wait(600);
  // `vault-betentry-confirm` only exists in the desktop-only
  // BetEntryGutterCards rework — mobile's SEND IT lives in the shared
  // BetConsole bottom bar with no such wrapper testid, so fall back to an
  // unscoped text match there.
  const clickedScoped = await clickTextWithin(page, '[data-testid="vault-betentry-confirm"]', 'SEND IT')
  if (!clickedScoped) await clickText(page, 'SEND IT')
  await wait(700);
  // MANUAL tap-mode ensures plain canvas clicks reveal tiles (TRAIL mode
  // needs a drag path instead) — idempotent if already MANUAL.
  await clickText(page, 'MANUAL');
  await wait(300);
}

async function driveToSettled(page) {
  await startRound(page);
  for (let gx = 1; gx <= 9 && !(await isSettled(page)); gx++) {
    for (let gy = 1; gy <= 9; gy++) {
      if (await isSettled(page)) break;
      await clickCanvasFraction(page, gx / 10, gy / 10);
      await wait(180);
    }
  }
  if (!(await isSettled(page))) await takeProfitIfEnabled(page);
  await wait(900);
  return await isSettled(page);
}

// gutter-card DOM census, used at every checkpoint
async function census(page) {
  return await page.evaluate(() => {
    const q = (sel) => document.querySelectorAll(sel).length;
    return {
      gutterLeft: q('[data-testid="vault-gutter-left"]'),
      gutterCardA: q('[data-testid="vault-gutter-card-a"]'),
      gutterCardARight: q('[data-testid="vault-gutter-card-a-right"]'), // must be 0 forever now (removed)
      gutterRight: q('[data-testid="vault-gutter-right"]'),
      sidebarPulseEmptyText: document.body.innerText.includes('no rounds yet this session'),
      newSetupButtons: [...document.querySelectorAll('button')].filter((b) => /new setup/i.test(b.textContent)).length,
      changeModeButtons: [...document.querySelectorAll('button')].filter((b) => /change mode/i.test(b.textContent)).length,
      sessionPulseHeader: document.body.innerText.includes('SESSION PULSE'),
    };
  });
}

async function runViewport(browser, viewport, tag) {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  await page.setViewport(viewport);
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);

  // CHECKPOINT 1 — fresh session, 0 rounds settled yet: go straight into
  // Playing (first round in flight) WITHOUT settling, capture census +
  // screenshot proving SESSION PULSE is fully absent (no placeholder text).
  await startRound(page);
  await wait(400);
  const censusZeroRounds = await census(page);
  await page.screenshot({ path: `${OUT}/${tag}-01-zero-rounds-playing.png`, fullPage: false });

  // Settle round 1 (whatever outcome lands). Full 9x9 grid sweep (MANUAL
  // mode already selected in startRound) rather than a handful of guesses —
  // guarantees a bust or an enabled TAKE PROFIT regardless of mine layout.
  outer: for (let gx = 1; gx <= 9; gx++) {
    for (let gy = 1; gy <= 9; gy++) {
      if (await isSettled(page)) break outer;
      await clickCanvasFraction(page, gx / 10, gy / 10);
      await wait(180);
    }
  }
  if (!(await isSettled(page))) await takeProfitIfEnabled(page);
  await wait(900);
  const settled1 = await isSettled(page);

  // CHECKPOINT 2 — settled screen: confirm "new setup" copy, capture full +
  // crop of both button sites (linksTier column + gutter card, on desktop;
  // only linksTier renders on mobile since SettledGutterCards is isWide-gated).
  const censusSettled = await census(page);
  await page.screenshot({ path: `${OUT}/${tag}-02-settled-newsetup.png`, fullPage: false });

  // CHECKPOINT 3 — bet again into round 2 (history.length === 1 now):
  // SESSION PULSE should mount ONCE with live stats, no mirror.
  await clickText(page, 'bet again');
  await wait(700);
  const censusOneRound = await census(page);
  await page.screenshot({ path: `${OUT}/${tag}-03-one-round-playing.png`, fullPage: false });

  await page.close();
  return { tag, censusZeroRounds, settled1, censusSettled, censusOneRound, pageErrors };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });

  const desktop = await runViewport(browser, { width: 1440, height: 900, deviceScaleFactor: 1 }, 'desktop');
  const mobile = await runViewport(browser, { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, 'mobile');

  console.log(JSON.stringify({ desktop, mobile }, null, 2));
  await browser.close();
})();
