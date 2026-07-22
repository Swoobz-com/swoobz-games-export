// Independent Mobile Touch QA — FINAL ROUND verification of the Rug or
// Riches (Vault) gutter migration. Verifies mobile is TRULY unchanged
// (not merely assumed from the `isWide` gate) across 3 mobile-chrome
// viewports: Pixel 7 (412x915), iPhone 14 Pro (393x852), and the maker's
// baseline (390x844). Covers all 4 phases: Lobby, BetEntry, Playing, Settled.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5193';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const DEVICES = [
  { name: 'pixel7', width: 412, height: 915, dpr: 2.625 },
  { name: 'iphone14pro', width: 393, height: 852, dpr: 3 },
  { name: 'baseline390', width: 390, height: 844, dpr: 2 },
];

// All gutter-card / desktop-only testids that must be ABSENT on mobile.
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
  // Real mobile users scroll a below-the-fold CTA into view before tapping —
  // mirror that so we tap the button's ACTUAL on-screen (viewport-relative)
  // position rather than a page coordinate that may sit below the fold.
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

// Post-scroll thumb-zone: on a long stacked mobile page, a below-the-fold CTA
// is reached by the player scrolling it into view first (normal mobile UX,
// not a defect by itself). This measures the REAL reachability once visible
// (viewport-relative rect after scrollIntoView), which is the standard way
// to grade a CTA that lives below the fold.
async function postScrollThumbZone(page, buttonText, viewportHeight) {
  const h = await findButtonByText(page, buttonText);
  const el = h.asElement();
  if (!el) return { verdict: 'N/A', pct: null, requiredScroll: null };
  const scrollYBefore = await page.evaluate(() => window.scrollY);
  await page.evaluate((e) => e.scrollIntoView({ block: 'center' }), el);
  await wait(150);
  const scrollYAfter = await page.evaluate(() => window.scrollY);
  const rect = await page.evaluate((e) => {
    const r = e.getBoundingClientRect();
    return { top: r.top, height: r.height };
  }, el);
  const centerY = rect.top + rect.height / 2;
  const pct = (centerY / viewportHeight) * 100;
  const inZone = pct >= 30 && pct <= 90;
  return {
    verdict: inZone ? 'PASS' : 'FAIL',
    pct: pct.toFixed(1),
    requiredScroll: Math.abs(scrollYAfter - scrollYBefore) > 5,
    scrollYBefore,
    scrollYAfter,
  };
}

async function overflowCheck(page) {
  return await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
    hasVerticalScroll: document.documentElement.scrollHeight > document.documentElement.clientHeight + 1,
  }));
}

async function selectModeIfPresent(page, modeName) {
  // BLUECHIPS / other mode buttons in BetConsole — best-effort tap.
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

async function takeProfitEnabled(page) {
  return await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.toLowerCase().includes('take profit'));
    return btn ? !btn.disabled : false;
  });
}

// Reveal a tile via genuine TOUCH (page.touchscreen.tap), retried across a
// center-weighted spread of canvas fractions, verified against the ground
// truth (TAKE PROFIT's own `disabled` flag flipping false). This directly
// probes Probe 3/7: does the canvas's tile-tap handler respond to touch
// events (onTouchStart/onPointerDown), not just mouse (onClick/onMouseDown)?
async function isStillPlaying(page) {
  return await page.evaluate(() => document.body.textContent.includes('PUMPING') || document.body.textContent.includes('TRAIL') || document.body.textContent.includes('MANUAL'));
}

async function revealOneTileByTouch(page) {
  const spots = [[0.5, 0.5], [0.45, 0.4], [0.55, 0.6], [0.4, 0.55], [0.6, 0.45], [0.5, 0.35]];
  const canvasHandle = await page.evaluateHandle(() => document.querySelector('canvas'));
  const canvasEl = canvasHandle.asElement();
  if (!canvasEl) return { ok: false, reason: 'no canvas found' };
  for (const [fx, fy] of spots) {
    if (!(await isStillPlaying(page))) {
      return { ok: false, reason: 'round ended (bust) before a safe reveal landed — RNG, not a touch-handling defect' };
    }
    const cbox = await canvasEl.boundingBox();
    if (!cbox) return { ok: false, reason: 'canvas has no boundingBox' };
    const x = cbox.x + cbox.width * fx;
    const y = cbox.y + cbox.height * fy;
    try {
      await page.touchscreen.tap(x, y);
    } catch (e) {
      return { ok: false, reason: `touchscreen.tap threw: ${e.message}` };
    }
    await wait(450);
    if (await takeProfitEnabled(page)) {
      return { ok: true, mode: 'canvas-touchscreen-tap', spotUsed: [fx, fy] };
    }
  }
  return { ok: false, reason: 'take profit never enabled after touch taps across spread' };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const R = { port: PORT, timestamp: new Date().toISOString(), devices: {} };

  for (const dev of DEVICES) {
    const D = { device: dev, phases: {} };
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));
    await page.setViewport({ width: dev.width, height: dev.height, deviceScaleFactor: dev.dpr, hasTouch: true, isMobile: true });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(500);

    // ---------------- LOBBY ----------------
    {
      const gutters = await gutterDomCounts(page);
      const bodyText = await page.evaluate(() => document.body.textContent || '');
      const overflow = await overflowCheck(page);
      const apeIn = await hitTargetAndTouchAction(page, 'ape in');
      const apeInHandle = await findButtonByText(page, 'ape in');
      const apeInEl = apeInHandle.asElement();
      const apeInBox = apeInEl ? await apeInEl.boundingBox() : null;
      const thumb = thumbZoneVerdict(apeInBox, dev.height);
      await fs.promises.mkdir('shots-mtqa-final', { recursive: true }).catch(() => {});
      await page.screenshot({ path: `shots-mtqa-final/${dev.name}-01-lobby.png`, fullPage: false });
      D.phases.lobby = {
        gutterLeaks: Object.entries(gutters).filter(([, v]) => v > 0),
        hasApeInText: bodyText.toLowerCase().includes('ape in'),
        hasHorizontalScroll: overflow.hasHorizontalScroll,
        overflow,
        apeInHitTarget: apeIn,
        apeInThumbZone: thumb,
        apeInHitTargetPass: apeIn.found && apeIn.width >= 44 && apeIn.height >= 44,
      };

      // Tap APE IN via touchscreen (not click) to enter bet-entry.
      const tapResult = await tapButtonByText(page, 'ape in');
      await wait(500);
      D.phases.lobby.apeInTapDrivesTransition = tapResult;
    }

    // ---------------- BET ENTRY ----------------
    {
      const gutters = await gutterDomCounts(page);
      const bodyText = await page.evaluate(() => document.body.textContent || '');
      const overflow = await overflowCheck(page);
      const hasBetConsole = await page.evaluate(() => !!document.querySelector('[data-testid="bet-console"]'));
      await selectModeIfPresent(page, 'BLUECHIPS');
      await wait(300);
      const sendIt = await hitTargetAndTouchAction(page, 'send it');
      const sendItHandle = await findButtonByText(page, 'send it');
      const sendItEl = sendItHandle.asElement();
      const sendItBox = sendItEl ? await sendItEl.boundingBox() : null;
      const thumb = thumbZoneVerdict(sendItBox, dev.height);
      const postScrollThumb = await postScrollThumbZone(page, 'send it', dev.height);
      await page.screenshot({ path: `shots-mtqa-final/${dev.name}-02-betentry.png`, fullPage: false });

      // Stepper tap check — look for +/- stake stepper controls.
      const stepperHandle = await page.evaluateHandle(() => {
        const els = [...document.querySelectorAll('button')];
        return els.find((e) => e.offsetParent !== null && (e.textContent.trim() === '+' || e.textContent.trim() === '-' || e.getAttribute('aria-label')?.toLowerCase().includes('stake')));
      });
      const stepperEl = stepperHandle.asElement();
      let stepperTap = { found: !!stepperEl };
      if (stepperEl) {
        const box = await stepperEl.boundingBox();
        stepperTap.box = box;
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

      D.phases.betEntry = {
        gutterLeaks: Object.entries(gutters).filter(([, v]) => v > 0),
        hasSetYourPlayText: bodyText.includes('SET YOUR PLAY'),
        hasBetConsoleRoot: hasBetConsole,
        hasHorizontalScroll: overflow.hasHorizontalScroll,
        overflow,
        sendItHitTarget: sendIt,
        sendItThumbZone: thumb,
        sendItPostScrollThumbZone: postScrollThumb,
        sendItHitTargetPass: sendIt.found && sendIt.width >= 44 && sendIt.height >= 44,
        stepperTap,
      };

      const tapResult = await tapButtonByText(page, 'send it');
      await wait(800);
      D.phases.betEntry.sendItTapDrivesTransition = tapResult;
    }

    // ---------------- PLAYING ----------------
    {
      const gutters = await gutterDomCounts(page);
      const bodyText = await page.evaluate(() => document.body.textContent || '');
      const overflow = await overflowCheck(page);
      await page.screenshot({ path: `shots-mtqa-final/${dev.name}-03-playing-pre-reveal.png`, fullPage: false });

      // Tile tap gesture (primary game input) — genuine touch, verified against ground truth.
      const tileTap = await revealOneTileByTouch(page);
      await wait(400);

      const takeProfit = await hitTargetAndTouchAction(page, 'take profit');
      const tpHandle = await findButtonByText(page, 'take profit');
      const tpEl = tpHandle.asElement();
      const tpBox = tpEl ? await tpEl.boundingBox() : null;
      const thumb = thumbZoneVerdict(tpBox, dev.height);
      const postScrollThumb = tpEl ? await postScrollThumbZone(page, 'take profit', dev.height) : { verdict: 'N/A', pct: null };
      await page.screenshot({ path: `shots-mtqa-final/${dev.name}-04-playing-post-reveal.png`, fullPage: false });

      D.phases.playing = {
        gutterLeaks: Object.entries(gutters).filter(([, v]) => v > 0),
        hasTakeProfitText: bodyText.toLowerCase().includes('take profit'),
        hasHorizontalScroll: overflow.hasHorizontalScroll,
        overflow,
        tileTapGesture: tileTap,
        takeProfitHitTarget: takeProfit,
        takeProfitThumbZone: thumb,
        takeProfitPostScrollThumbZone: postScrollThumb,
        takeProfitHitTargetPass: takeProfit.found && takeProfit.width >= 44 && takeProfit.height >= 44,
      };

      const tapResult = await tapButtonByText(page, 'take profit');
      await wait(900);
      D.phases.playing.takeProfitTapDrivesTransition = tapResult;
    }

    // ---------------- SETTLED ----------------
    {
      const gutters = await gutterDomCounts(page);
      const bodyText = await page.evaluate(() => document.body.textContent || '');
      const overflow = await overflowCheck(page);
      const betAgain = await hitTargetAndTouchAction(page, 'bet again');
      const baHandle = await findButtonByText(page, 'bet again');
      const baEl = baHandle.asElement();
      const baBox = baEl ? await baEl.boundingBox() : null;
      const thumb = thumbZoneVerdict(baBox, dev.height);
      const postScrollThumb = baEl ? await postScrollThumbZone(page, 'bet again', dev.height) : { verdict: 'N/A', pct: null };

      // Safe-area-inset-bottom check on the action bar / bottom-most panel.
      const safeArea = await page.evaluate(() => {
        const candidates = [...document.querySelectorAll('div')].filter((d) => {
          const r = d.getBoundingClientRect();
          return r.bottom >= window.innerHeight - 4 && r.height > 20 && r.width > window.innerWidth * 0.5;
        });
        return candidates.slice(0, 5).map((d) => ({
          testid: d.dataset ? d.dataset.testid : undefined,
          paddingBottom: getComputedStyle(d).paddingBottom,
        }));
      });

      // Glass Box receipt — expandable by tap.
      const receiptToggle = await page.evaluateHandle(() => document.querySelector('[aria-controls="vault-settled-receipt"]'));
      const receiptEl = receiptToggle.asElement();
      let receiptTap = { found: !!receiptEl };
      if (receiptEl) {
        const box = await receiptEl.boundingBox();
        if (box) {
          await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
          await wait(300);
          receiptTap.expandedAfterTap = await page.evaluate(() => !!document.getElementById('vault-settled-receipt'));
        }
      }

      await page.screenshot({ path: `shots-mtqa-final/${dev.name}-05-settled.png`, fullPage: false });

      D.phases.settled = {
        gutterLeaks: Object.entries(gutters).filter(([, v]) => v > 0),
        hasBetAgainText: bodyText.toLowerCase().includes('bet again'),
        hasHorizontalScroll: overflow.hasHorizontalScroll,
        overflow,
        betAgainHitTarget: betAgain,
        betAgainThumbZone: thumb,
        betAgainPostScrollThumbZone: postScrollThumb,
        betAgainHitTargetPass: betAgain.found && betAgain.width >= 44 && betAgain.height >= 44,
        bottomPanelSafeAreaCandidates: safeArea,
        receiptTap,
      };
    }

    D.consoleErrors = consoleErrors;
    R.devices[dev.name] = D;
    await page.close();

    // ---------------- ISOLATED: hold+drag TRAIL gesture (own session, doesn't corrupt core walk) ----------------
    // Retried across up to 3 fresh rounds — a mine-hit bust on the first
    // reveal tap (RNG, ~12% per-tile on BLUECHIPS) ends the round before the
    // MANUAL|TRAIL toggle can be exercised; retrying isolates that from a
    // real touch-handling defect.
    {
      const p2 = await browser.newPage();
      let trailDrag = { attempted: false };
      let trailEl = null;
      for (let attempt = 0; attempt < 3 && !trailEl; attempt++) {
        await p2.setViewport({ width: dev.width, height: dev.height, deviceScaleFactor: dev.dpr, hasTouch: true, isMobile: true });
        await p2.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
        await p2.reload({ waitUntil: 'networkidle0' });
        await wait(400);
        await tapButtonByText(p2, 'ape in');
        await wait(400);
        await selectModeIfPresent(p2, 'BLUECHIPS');
        await wait(200);
        await tapButtonByText(p2, 'send it');
        await wait(700);
        const revealResult = await revealOneTileByTouch(p2);
        await wait(300);
        trailDrag.lastRevealResult = revealResult;
        const trailHandle = await findButtonByText(p2, 'trail');
        trailEl = trailHandle.asElement();
        trailDrag.attemptsUsed = attempt + 1;
      }
      if (trailEl) {
        trailDrag.attempted = true;
        await p2.evaluate((e) => e.scrollIntoView({ block: 'center' }), trailEl);
        await wait(120);
        const box = await trailEl.boundingBox();
        if (box) {
          await p2.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
          await wait(300);
          trailDrag.modeSwitchedToTrail = await p2.evaluate(() => document.body.textContent.includes('CLEAR') || document.body.textContent.includes('GO'));
          const canvasHandle = await p2.evaluateHandle(() => document.querySelector('canvas'));
          const canvasEl = canvasHandle.asElement();
          if (canvasEl) {
            const cbox = await canvasEl.boundingBox();
            if (cbox) {
              try {
                await p2.touchscreen.touchStart(cbox.x + cbox.width * 0.3, cbox.y + cbox.height * 0.3);
                await p2.touchscreen.touchMove(cbox.x + cbox.width * 0.4, cbox.y + cbox.height * 0.35);
                await p2.touchscreen.touchMove(cbox.x + cbox.width * 0.5, cbox.y + cbox.height * 0.4);
                await p2.touchscreen.touchEnd();
                trailDrag.dragOk = true;
              } catch (e) {
                trailDrag.dragOk = false;
                trailDrag.error = e.message;
              }
            }
          }
        }
      } else {
        trailDrag.reason = 'no TRAIL toggle button found after 3 fresh-round attempts (likely repeated bust RNG)';
      }
      R.devices[dev.name].isolatedTrailGestureCheck = trailDrag;
      await p2.close();
    }
  }

  await browser.close();
  fs.writeFileSync('mtqa-final-round-0703-results.json', JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();
