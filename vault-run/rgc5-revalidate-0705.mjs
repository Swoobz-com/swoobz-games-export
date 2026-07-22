// rgc5-revalidate-0705.mjs — independent RG-C5/RG-C3 re-verify driver
// (swoobz-rg-c5-compliance-qa, 2026-07-05, audit-only, no game edits).
// Drives BOTH a WIN and a LOSS settle on desktop 1440x900, checks:
//  - CTA symmetry (position/size unchanged, only fill color follows outcome)
//  - no near-miss / counterfactual reveal on the loss settle
//  - receipt panel reachable + expandable + not clipped
//  - AutopickSafetySurface reachability (known dead per memory, re-check live)
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5403';
const OUT = process.argv[3] || 'shots-rgc5-revalidate-0705';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return (
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}

async function isSettled(page) {
  return page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]'));
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

async function startRound(page) {
  await clickText(page, 'ape in');
  await wait(500);
  await clickText(page, 'SEND IT');
  await wait(700);
  await clickText(page, 'MANUAL');
  await wait(300);
}

// Drive to a WIN: tap a few tiles, then take profit. Retries a fresh round
// if a mine is hit before we can cash out.
// Central-board fractional points — avoids the outer padding/gutter band
// that surrounds the tile grid (edge fractions like 0.1 can miss the grid
// entirely once domHudActive shrinks/repositions the reserved bands).
const CENTER_POINTS = [
  [0.3, 0.3], [0.5, 0.3], [0.7, 0.3],
  [0.3, 0.5], [0.7, 0.5],
  [0.3, 0.7], [0.5, 0.7], [0.7, 0.7],
  [0.4, 0.4], [0.6, 0.4], [0.4, 0.6], [0.6, 0.6],
];

async function driveToWin(page, maxRounds = 10) {
  for (let attempt = 0; attempt < maxRounds; attempt++) {
    await startRound(page);
    let taps = 0;
    let settledNow = false;
    for (const [fx, fy] of CENTER_POINTS) {
      if (await isSettled(page)) { settledNow = true; break; }
      await clickCanvasFraction(page, fx, fy);
      taps++;
      await wait(280);
      if (await isSettled(page)) { settledNow = true; break; }
      if (taps >= 2) {
        const took = await clickText(page, 'take profit');
        if (took) {
          await wait(900);
          if (await isSettled(page)) { settledNow = true; break; }
        }
      }
    }
    console.log(`[driveToWin] attempt ${attempt}: taps=${taps} settled=${settledNow}`);
    if (settledNow) {
      const bannerText = await page.evaluate(() => document.querySelector('[data-testid="vault-settled-banner"]')?.textContent);
      console.log(`[driveToWin] attempt ${attempt}: banner="${bannerText}"`);
      const won = !!bannerText && bannerText.includes('secured');
      if (won) return true;
      const clicked = await clickText(page, 'new setup');
      console.log(`[driveToWin] attempt ${attempt}: reset clicked=${clicked}`);
      await wait(500);
    } else {
      await page.reload({ waitUntil: 'networkidle2' });
      await wait(500);
    }
  }
  return false;
}

// Drive to a LOSS: tap through the whole grid in raster order, NEVER taking
// profit, until a mine is hit (near-certain given 3/25 mines) or the board
// clears (rare natural win — retry fresh in that case).
async function driveToLoss(page, maxRounds = 6) {
  for (let attempt = 0; attempt < maxRounds; attempt++) {
    await startRound(page);
    outer: for (let gx = 1; gx <= 9; gx++) {
      for (let gy = 1; gy <= 9; gy++) {
        if (await isSettled(page)) break outer;
        await clickCanvasFraction(page, gx / 10, gy / 10);
        await wait(180);
        if (await isSettled(page)) break outer;
      }
    }
    const settled = await isSettled(page);
    if (settled) {
      const won = await page.evaluate(() => document.querySelector('[data-testid="vault-settled-banner"]')?.textContent.includes('secured'));
      if (!won) return true;
      await clickText(page, 'new setup');
      await wait(400);
    } else {
      await page.reload({ waitUntil: 'networkidle2' });
      await wait(500);
    }
  }
  return false;
}

async function captureSettledState(page, label) {
  await page.screenshot({ path: `${OUT}/${label}.png` });
  return page.evaluate(() => {
    const banner = document.querySelector('[data-testid="vault-settled-banner"]');
    const ctaPanel = document.querySelector('[data-testid="vault-ctl-cta"]');
    const betAgainBtn = ctaPanel?.querySelector('button');
    const btnRect = betAgainBtn?.getBoundingClientRect();
    const btnStyle = betAgainBtn ? getComputedStyle(betAgainBtn) : null;
    const receiptPanel = document.querySelector('[data-testid="vault-ctl-receipt"]');
    const toggleBtn = [...(receiptPanel?.querySelectorAll('button') || [])].find((b) =>
      b.textContent.toLowerCase().includes('receipt'),
    );
    const hudRow = document.querySelector('[data-testid="vault-hud-row"]')?.textContent || null;
    const heroOverlay = document.querySelector('[data-testid="vault-hero-overlay"]');
    const captionText = document.querySelector('[data-testid="vault-board-caption"]')?.textContent || null;
    return {
      bannerText: banner?.textContent || null,
      bannerBorderColor: banner ? getComputedStyle(banner).borderColor : null,
      ctaButtonText: betAgainBtn?.textContent || null,
      ctaButtonRect: btnRect ? { x: btnRect.x, y: btnRect.y, w: btnRect.width, h: btnRect.height } : null,
      ctaButtonBg: btnStyle?.backgroundColor || null,
      ctaButtonBgImage: btnStyle?.backgroundImage || null,
      receiptToggleExists: !!toggleBtn,
      receiptToggleText: toggleBtn?.textContent || null,
      hudRowText: hudRow,
      heroOverlayPresent: !!heroOverlay,
      heroOverlayAriaLabel: heroOverlay?.getAttribute('aria-label') || null,
      boardCaption: captionText,
      // RG-C8 dead-code re-check: is the AutopickSafetySurface (max-session-loss/
      // cool-off/60s-pause/1.5s-inter-round-delay copy) mounted anywhere?
      autopickBlockPresent: document.body.innerText.includes('AUTO-PICK') && document.body.innerText.includes('PHASE 2'),
      autopickCopyPresent: document.body.innerText.includes('mandatory pause'),
    };
  });
}

async function expandReceipt(page) {
  const clicked = await clickText(page, 'view receipt');
  await wait(300);
  if (!clicked) return { clicked: false };
  return page.evaluate(() => {
    const body = document.getElementById('vault-settled-receipt');
    if (!body) return { clicked: true, bodyFound: false };
    const rect = body.getBoundingClientRect();
    const cs = getComputedStyle(body);
    // "not clipped" check: content scrollHeight should be reachable via
    // internal scroll (overflowY) even if it exceeds the visible rect —
    // clipped/broken would be overflow:hidden with content cut with no
    // scroll affordance.
    return {
      clicked: true,
      bodyFound: true,
      rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
      overflowY: cs.overflowY,
      scrollHeight: body.scrollHeight,
      clientHeight: body.clientHeight,
      textSample: body.textContent.slice(0, 120),
    };
  });
}

async function run() {
  const results = {};
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--window-size=1500,1000'] });

  // ── WIN pass ──────────────────────────────────────────────────────────
  const winPage = await browser.newPage();
  await winPage.setViewport({ width: 1440, height: 900 });
  await winPage.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
  await wait(400);
  const gotWin = await driveToWin(winPage);
  results.gotWin = gotWin;
  if (gotWin) {
    results.win = await captureSettledState(winPage, 'win-settled');
    results.winReceipt = await expandReceipt(winPage);
  }
  await winPage.close();

  // ── LOSS pass (fresh page) ───────────────────────────────────────────
  const lossPage = await browser.newPage();
  await lossPage.setViewport({ width: 1440, height: 900 });
  await lossPage.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
  await wait(400);
  const gotLoss = await driveToLoss(lossPage);
  results.gotLoss = gotLoss;
  if (gotLoss) {
    results.loss = await captureSettledState(lossPage, 'loss-settled');
    results.lossReceipt = await expandReceipt(lossPage);
  }
  await lossPage.close();

  // ── Bet-entry AutopickSafetySurface live re-check (fresh page) ───────
  const betPage = await browser.newPage();
  await betPage.setViewport({ width: 1440, height: 900 });
  await betPage.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
  await wait(400);
  await clickText(betPage, 'ape in');
  await wait(500);
  await betPage.screenshot({ path: `${OUT}/bet-entry.png` });
  results.betEntryAutopick = await betPage.evaluate(() => ({
    hasAutopickLabel: document.body.innerText.includes('AUTO-PICK'),
    hasPhase2Badge: document.body.innerText.includes('PHASE 2'),
    hasMandatoryPauseCopy: document.body.innerText.includes('mandatory pause'),
    autopickBlockNodes: document.querySelectorAll('[class*="autopick" i]').length,
  }));
  await betPage.close();

  await browser.close();
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
}

run().catch((e) => { console.error(e); process.exit(1); });
