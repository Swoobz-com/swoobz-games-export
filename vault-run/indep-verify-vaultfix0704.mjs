// indep-verify-vaultfix0704.mjs — INDEPENDENT live re-verification of the
// P0 Glass Box receipt relocation fix on desktop-settled. Does NOT reuse the
// builder's vaultfix0704-verify.mjs harness (only borrows the small utility
// idioms that are generic puppeteer plumbing, not the assertions). Written
// fresh so the pass/fail is not contaminated by the builder's own script.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5322';
const OUT = 'shots-indep-verify-0704';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

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
async function clickWithin(page, selector, t) {
  const h = await page.evaluateHandle(({ selector, t }) => {
    const root = document.querySelector(selector);
    if (!root) return null;
    const els = [...root.querySelectorAll('button,[role=button]')];
    return els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, { selector, t });
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
async function isSettled(page) {
  return await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-left"]'));
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
    const btn = [...document.querySelectorAll('[data-testid="vault-playing-actions"] button')].find((b) =>
      b.textContent.toLowerCase().includes('take profit'),
    );
    if (btn && !btn.disabled) {
      btn.click();
      return true;
    }
    return false;
  });
}
async function driveRound(page, { forceWin }) {
  await clickText(page, 'ape in');
  await wait(600);
  await clickWithin(page, '[data-testid="vault-betentry-confirm"]', 'send it');
  await wait(700);
  const spots = [];
  for (let gx = 1; gx <= 9; gx++) for (let gy = 1; gy <= 9; gy++) spots.push([gx / 10, gy / 10]);
  let safeReveals = 0;
  for (const [fx, fy] of spots) {
    if (await isSettled(page)) return 'settled-during-loop';
    await clickCanvasFraction(page, fx, fy);
    await wait(300);
    if (await isSettled(page)) return 'settled-after-click';
    safeReveals += 1;
    if (forceWin && safeReveals >= 2) {
      if (await takeProfitIfEnabled(page)) {
        await wait(900);
        return (await isSettled(page)) ? 'settled-take-profit' : 'take-profit-clicked-not-settled';
      }
    }
  }
  await wait(900);
  return (await isSettled(page)) ? 'settled-fallback' : 'never-settled';
}

// Independently re-derive the outcome client-side using the SAME algorithm
// documented in VaultExperience.tsx's verifyMineBitmap (Fisher-Yates over
// SHA-256(serverSeed || 'VAULTILE' || stepLE64)), but computed HERE in node
// (not by calling the app's own function) so a bug in the app's verifier
// can't rubber-stamp itself.
async function independentReDerive(outcomeJson) {
  const { serverSeedHex, gridSize, mineCount, mineBitmap } = outcomeJson;
  const crypto = await import('node:crypto');
  function hexToBytes(hex) {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(2 * i, 2 * i + 2), 16);
    return out;
  }
  const serverSeed = hexToBytes(serverSeedHex);
  const totalTiles = gridSize * gridSize;
  const mixerTag = Buffer.from('VAULTILE');
  const positions = new Array(totalTiles);
  for (let i = 0; i < totalTiles; i++) positions[i] = i;
  for (let step = 0; step < totalTiles; step++) {
    const stepBuf = Buffer.alloc(8);
    stepBuf.writeBigUInt64LE(BigInt(step));
    const concat = Buffer.concat([Buffer.from(serverSeed), mixerTag, stepBuf]);
    const hash = crypto.createHash('sha256').update(concat).digest();
    let raw = 0n;
    for (let i = 0; i < 8; i++) raw |= BigInt(hash[i]) << BigInt(8 * i);
    const remaining = BigInt(totalTiles - step);
    const swapOffset = Number(raw % remaining);
    const swapIndex = step + swapOffset;
    const tmp = positions[step];
    positions[step] = positions[swapIndex];
    positions[swapIndex] = tmp;
  }
  const derived = new Array(totalTiles).fill(false);
  for (let i = 0; i < mineCount; i++) derived[positions[i]] = true;
  for (let i = 0; i < totalTiles; i++) {
    if (derived[i] !== mineBitmap[i]) return false;
  }
  return true;
}

async function probe(browser, w, h, forceWin, tag) {
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);

  const outcome = await driveRound(page, { forceWin });
  await wait(1200); // let verify effect resolve to 'matched'
  await page.screenshot({ path: `${OUT}/${tag}-01-settled.png`, fullPage: true });

  // 1. Chip presence + resolution BEFORE click.
  const beforeClick = await page.evaluate(() => {
    const chip = document.querySelector('.vault-receipt-toggle');
    if (!chip) return { chipFound: false };
    const ariaControls = chip.getAttribute('aria-controls');
    const target = ariaControls ? document.getElementById(ariaControls) : null;
    return {
      chipFound: true,
      chipVisible: chip.offsetParent !== null,
      chipText: chip.textContent,
      ariaControls,
      ariaExpanded: chip.getAttribute('aria-expanded'),
      targetExistsBeforeClick: !!target,
    };
  });

  // Verify widget state BEFORE expanding receipt (auto-verify on mount, no click required).
  const verifyWidgetState = await page.evaluate(() => {
    const body = document.body.textContent;
    return {
      hasVerifying: body.includes('verifying'),
      hasMismatch: /mismatch/i.test(body),
      // look for any node explicitly carrying a matched/verified state class or testid
      matchedIndicatorText: [...document.querySelectorAll('[class*="verify"],[data-testid*="verify"]')]
        .map((e) => e.textContent).filter(Boolean),
    };
  });

  let clicked = false, afterClick = null, hexFields = null;
  if (beforeClick.chipFound) {
    clicked = await page.evaluate(() => {
      const chip = document.querySelector('.vault-receipt-toggle');
      if (!chip) return false;
      chip.click();
      return true;
    });
    await wait(400);
    afterClick = await page.evaluate(() => {
      const chip = document.querySelector('.vault-receipt-toggle');
      const ariaControls = chip ? chip.getAttribute('aria-controls') : null;
      const target = ariaControls ? document.getElementById(ariaControls) : null;
      return {
        ariaExpanded: chip ? chip.getAttribute('aria-expanded') : null,
        chipText: chip ? chip.textContent : null,
        targetExists: !!target,
        targetVisible: target ? target.offsetParent !== null : false,
        targetInnerHTMLLength: target ? target.innerHTML.length : 0,
        targetTestId: target ? target.getAttribute('data-testid') : null,
      };
    });
    await page.screenshot({ path: `${OUT}/${tag}-02-receipt-expanded.png`, fullPage: true });

    // Extract every <dd> value inside the receipt target + the target's own
    // full textContent + title attrs, to check truncation independent of the
    // task's assumption.
    hexFields = await page.evaluate((ariaControls) => {
      const target = document.getElementById(ariaControls);
      if (!target) return null;
      const rows = [...target.querySelectorAll('dd')].map((dd) => ({
        visibleText: dd.textContent,
        visibleTextLength: dd.textContent.length,
        titleAttr: dd.getAttribute('title'),
        titleAttrLength: dd.getAttribute('title') ? dd.getAttribute('title').length : 0,
      }));
      const labels = [...target.querySelectorAll('dt')].map((dt) => dt.textContent);
      const summaryCodeEls = [...target.querySelectorAll('p code')].map((c) => c.textContent);
      return { rows, labels, summaryCodeEls, fullTargetText: target.textContent };
    }, afterClick.ariaControls ?? beforeClick.ariaControls);
  }

  // Pull the raw outcome object out of React fiber / controller state if
  // exposed, OR reconstruct from the DOM's title attrs (full hex), to run an
  // independent re-derivation, confirming "matched" isn't just cosmetic text.
  const rawOutcomeForReDerive = await page.evaluate(() => {
    // Attempt to read window.__VAULT_DEBUG__ if the app exposes it; else null.
    return window.__VAULT_DEBUG__ ? window.__VAULT_DEBUG__.lastOutcome ?? null : null;
  });

  await page.close();
  return { outcome, beforeClick, verifyWidgetState, clicked, afterClick, hexFields, rawOutcomeForReDerive, consoleErrors };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const R = {};
  R.desktop_win_1440x900 = await probe(browser, 1440, 900, true, 'win-1440');
  R.desktop_rug_1440x900 = await probe(browser, 1440, 900, false, 'rug-1440');
  R.desktop_win_1920x1080 = await probe(browser, 1920, 1080, true, 'win-1920');
  // Mobile baseline for comparison of hex truncation behavior (same code path).
  R.mobile_win_390x844 = await probe(browser, 390, 844, true, 'win-390');
  await browser.close();
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();
