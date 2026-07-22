// Mobile Touch QA — verify mobile TRULY unchanged after the DESKTOP-ONLY
// BetEntry gutter consolidation (right-gutter column, Route-1 compaction +
// Route-2 boardHeightCss 78vh->84vh, both isWide-gated). Task category
// vault-side-margin-chrome, continuation. Fresh driver, fresh port (5230,
// none of the maker's or other agents' 5181-5199/5201/5207/5219/5225 ports).
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5230';
const OUTDIR = process.argv[3] || 'shots-mtqa-betentry-gutter-0703';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const DEVICES = [
  { name: 'pixel7', width: 412, height: 915, dpr: 2.625 },
  { name: 'iphone14pro', width: 393, height: 852, dpr: 3 },
  { name: 'baseline390', width: 390, height: 844, dpr: 2 },
];

// Every gutter/desktop-only testid that must be ABSENT below 960px, incl.
// the specific BetEntry gutter ids named in the task.
const GUTTER_TESTIDS = [
  'vault-gutter-left', 'vault-gutter-right', 'vault-gutter-card-a',
  'vault-gutter-card-a-right', 'vault-gutter-card-b', 'vault-gutter-card-c',
  'vault-betentry-left', 'vault-betentry-right', 'vault-betentry-world',
  'vault-betentry-yourbet', 'vault-betentry-confirm',
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
  return { found: true, width: box?.width, height: box?.height, touchAction, top: box?.y, bottom: (box?.y ?? 0) + (box?.height ?? 0) };
}

function thumbZoneVerdict(box, viewportHeight) {
  if (!box) return { verdict: 'N/A', pct: null };
  const centerY = box.y + box.height / 2;
  const pct = (centerY / viewportHeight) * 100;
  const inZone = pct >= 30 && pct <= 90;
  return { verdict: inZone ? 'PASS' : 'FAIL', pct: pct.toFixed(1) };
}

async function postScrollThumbZone(page, buttonText, viewportHeight) {
  const h = await findButtonByText(page, buttonText);
  const el = h.asElement();
  if (!el) return { verdict: 'N/A', pct: null };
  await page.evaluate((e) => e.scrollIntoView({ block: 'center' }), el);
  await wait(150);
  const rect = await page.evaluate((e) => {
    const r = e.getBoundingClientRect();
    return { top: r.top, height: r.height };
  }, el);
  const centerY = rect.top + rect.height / 2;
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
  if (el) {
    await page.evaluate((e) => e.scrollIntoView({ block: 'center' }), el);
    await wait(100);
    const box = await el.boundingBox();
    if (box) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  }
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const R = { port: PORT, timestamp: new Date().toISOString(), devices: {} };
  await fs.promises.mkdir(OUTDIR, { recursive: true }).catch(() => {});

  for (const dev of DEVICES) {
    const D = { device: dev, betEntry: {} };
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));
    await page.setViewport({ width: dev.width, height: dev.height, deviceScaleFactor: dev.dpr, hasTouch: true, isMobile: true });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(500);

    // ---- LOBBY (baseline gutter check + get to bet-entry) ----
    const lobbyGutters = await gutterDomCounts(page);
    D.lobbyGutterLeaks = Object.entries(lobbyGutters).filter(([, v]) => v > 0);
    await page.screenshot({ path: path.join(OUTDIR, `${dev.name}-01-lobby.png`) });
    const apeInTap = await tapButtonByText(page, 'ape in');
    await wait(500);

    // ---- BET ENTRY (the phase under test) ----
    const gutters = await gutterDomCounts(page);
    const bodyText = await page.evaluate(() => document.body.textContent || '');
    const overflow = await overflowCheck(page);
    const hasBetConsole = await page.evaluate(() => !!document.querySelector('[data-testid="bet-console"]'));

    // Original mobile bottom-bar controls: wager stepper, mode/world selector,
    // RUGS tuner, BALANCE, SEND IT.
    const stepperHandle = await page.evaluateHandle(() => {
      const els = [...document.querySelectorAll('button')];
      return els.find((e) => e.offsetParent !== null && (e.textContent.trim() === '+' || e.textContent.trim() === '-'));
    });
    const stepperEl = stepperHandle.asElement();
    const stepperBox = stepperEl ? await stepperEl.boundingBox() : null;

    const modeButtons = await page.evaluate(() => {
      return [...document.querySelectorAll('.vault-mode-row button')].map((b) => b.textContent.trim().slice(0, 40));
    });

    const rugsPresent = bodyText.toUpperCase().includes('RUGS');
    const balancePresent = bodyText.toUpperCase().includes('BALANCE');

    const sendIt = await hitTargetAndTouchAction(page, 'send it');
    const sendItHandle = await findButtonByText(page, 'send it');
    const sendItEl = sendItHandle.asElement();
    const sendItBox = sendItEl ? await sendItEl.boundingBox() : null;
    const sendItThumb = thumbZoneVerdict(sendItBox, dev.height);
    const sendItPostScroll = await postScrollThumbZone(page, 'send it', dev.height);

    // Clip check: every core control's box must be fully inside [0, clientWidth].
    const clipCheck = { stepper: null, sendIt: null };
    if (stepperBox) {
      clipCheck.stepper = stepperBox.x >= -1 && stepperBox.x + stepperBox.width <= dev.width + 1;
    }
    if (sendItBox) {
      clipCheck.sendIt = sendItBox.x >= -1 && sendItBox.x + sendItBox.width <= dev.width + 1;
    }

    await page.screenshot({ path: path.join(OUTDIR, `${dev.name}-02-betentry-fold.png`) });

    // Tap the BLUECHIPS world card (core action: pick world) via touch.
    await selectModeIfPresent(page, 'BLUECHIPS');
    await wait(300);
    const afterModeTapBodyText = await page.evaluate(() => document.body.textContent || '');

    // Tap the wager stepper (+ ) via touch — core action: adjust bet.
    let stepperTap = { found: !!stepperEl };
    if (stepperEl) {
      const box = await stepperEl.boundingBox();
      if (box) {
        try {
          await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
          stepperTap.tapOk = true;
        } catch (e) {
          stepperTap.tapOk = false;
          stepperTap.error = e.message;
        }
      }
    }
    await wait(200);

    // Full-page screenshot too (to see whole stacked bottom-bar console).
    await page.screenshot({ path: path.join(OUTDIR, `${dev.name}-03-betentry-full.png`), fullPage: true });

    D.betEntry = {
      gutterLeaks: Object.entries(gutters).filter(([, v]) => v > 0),
      hasSetYourPlayText: bodyText.includes('SET YOUR PLAY'),
      hasBetConsoleRoot: hasBetConsole,
      modeButtons,
      rugsPresent,
      balancePresent,
      overflow,
      sendItHitTarget: sendIt,
      sendItThumbZone: sendItThumb,
      sendItPostScrollThumbZone: sendItPostScroll,
      sendItHitTargetPass: sendIt.found && sendIt.width >= 44 && sendIt.height >= 44,
      stepperBox,
      stepperHitTargetPass: stepperBox ? (stepperBox.width >= 44 && stepperBox.height >= 44) : null,
      stepperTap,
      clipCheck,
      afterModeTapChanged: afterModeTapBodyText !== bodyText,
    };

    // Finally tap SEND IT to confirm the core loop completes on touch.
    const sendItTap = await tapButtonByText(page, 'send it');
    await wait(700);
    const afterSendItBody = await page.evaluate(() => document.body.textContent || '');
    D.betEntry.sendItTapDrivesTransition = sendItTap;
    D.betEntry.leftBetEntryAfterSendIt = !afterSendItBody.includes('SET YOUR PLAY');

    D.consoleErrors = consoleErrors;
    R.devices[dev.name] = D;
    await page.close();
  }

  await fs.promises.writeFile(path.join(OUTDIR, 'results.json'), JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
  await browser.close();
})();
