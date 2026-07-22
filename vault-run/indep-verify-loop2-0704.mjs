// indep-verify-loop2-0704.mjs — INDEPENDENT LOOP-2 re-verification of the
// "Rug or Riches" (vault) Glass Box close-trap fix, written fresh (not the
// builder's own vaultfix2-0704-verify.mjs). Fresh dev server on port 5460.
// Real page.mouse.click() only — never chip.click()/evaluate() for the
// click-trap assertions, per the prior FAIL's own lesson.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = '5460';
const OUT = 'shots-indep-loop2-0704';
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

async function isSettled(page) {
  return await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-left"]'));
}
async function canvasBox(page) {
  return await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
}
async function clickCanvasFraction(page, fx, fy) {
  const box = await canvasBox(page);
  if (!box) return false;
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy);
  return true;
}
async function takeProfitIfEnabled(page) {
  const box = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('[data-testid="vault-playing-actions"] button')].find((b) =>
      b.textContent.toLowerCase().includes('take profit'),
    );
    if (!btn || btn.disabled) return null;
    const r = btn.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (!box) return false;
  await page.mouse.click(box.x, box.y);
  return true;
}

// Drive to a settled round via REAL mouse clicks throughout (bet-entry ->
// SEND IT -> board taps). forceWin: take profit after 2 safe reveals via a
// real mouse click. forceRug: just keep tapping until a mine is hit (no
// take-profit) — first mine tap naturally settles as a rug.
async function reachSettled(page, { forceWin }) {
  await clickText(page, 'ape in');
  await wait(600);
  // real-mouse click on SEND IT inside the confirm card
  const sendIt = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="vault-betentry-confirm"]');
    if (!root) return null;
    const btn = [...root.querySelectorAll('button')].find((b) => b.textContent.toLowerCase().includes('send it'));
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (!sendIt) return false;
  await page.mouse.click(sendIt.x, sendIt.y);
  await wait(700);

  const spots = [];
  for (let gx = 1; gx <= 9; gx++) for (let gy = 1; gy <= 9; gy++) spots.push([gx / 10, gy / 10]);
  let safeReveals = 0;
  for (const [fx, fy] of spots) {
    if (await isSettled(page)) return true;
    await clickCanvasFraction(page, fx, fy);
    await wait(300);
    if (await isSettled(page)) return true;
    safeReveals += 1;
    if (forceWin && safeReveals >= 2) {
      if (await takeProfitIfEnabled(page)) {
        await wait(900);
        return await isSettled(page);
      }
    }
  }
  await wait(900);
  return await isSettled(page);
}

// In-browser re-derivation using the SAME sha256/Fisher-Yates algorithm as
// vaultProvider.ts's deriveMineBitmap, fed the seed/hash extracted straight
// from the rendered receipt DOM (not from any app-internal state).
async function rederiveInPage(page, { serverSeedHex, serverSeedHashHex, gridSize, mineCount }) {
  return await page.evaluate(
    async ({ serverSeedHex, serverSeedHashHex, gridSize, mineCount }) => {
      function fromHex(hex) {
        const out = new Uint8Array(hex.length / 2);
        for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
        return out;
      }
      function toHex(bytes) {
        let hex = '';
        for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
        return hex;
      }
      async function sha256(parts) {
        const total = parts.reduce((n, p) => n + p.length, 0);
        const buf = new Uint8Array(total);
        let offset = 0;
        for (const p of parts) { buf.set(p, offset); offset += p.length; }
        const digest = await crypto.subtle.digest('SHA-256', buf);
        return new Uint8Array(digest);
      }
      function u64Le(value) {
        const out = new Uint8Array(8);
        let v = value;
        for (let i = 0; i < 8; i++) { out[i] = Number(v & 0xffn); v >>= 8n; }
        return out;
      }
      const serverSeed = fromHex(serverSeedHex);
      const recomputedHash = toHex(await sha256([serverSeed]));
      const mixerTag = new TextEncoder().encode('VAULTILE');
      const totalTiles = gridSize * gridSize;
      const bitmap = new Array(totalTiles).fill(false);
      const positions = new Array(totalTiles);
      for (let i = 0; i < totalTiles; i++) positions[i] = i;
      for (let step = 0; step < totalTiles; step++) {
        const hash = await sha256([serverSeed, mixerTag, u64Le(BigInt(step))]);
        let raw = 0n;
        for (let i = 0; i < 8; i++) raw |= BigInt(hash[i]) << BigInt(8 * i);
        const remaining = BigInt(totalTiles - step);
        const swapOffset = Number(raw % remaining);
        const swapIndex = step + swapOffset;
        const tmp = positions[step];
        positions[step] = positions[swapIndex];
        positions[swapIndex] = tmp;
      }
      for (let i = 0; i < mineCount; i++) bitmap[positions[i]] = true;
      return {
        recomputedHashMatches: recomputedHash === serverSeedHashHex,
        recomputedHash,
        rederivedMineCount: bitmap.filter(Boolean).length,
        rederivedMineIdxs: bitmap.map((b, i) => (b ? i : null)).filter((x) => x !== null),
      };
    },
    { serverSeedHex, serverSeedHashHex, gridSize, mineCount },
  );
}

async function readReceipt(page) {
  return await page.evaluate(() => {
    const drawer = document.getElementById('vault-settled-receipt');
    if (!drawer) return null;
    const rows = {};
    const rowsFull = {};
    const dts = [...drawer.querySelectorAll('dt')];
    const dds = [...drawer.querySelectorAll('dd')];
    dts.forEach((dt, i) => {
      const dd = dds[i];
      const label = dt.textContent.trim();
      rows[label] = dd ? dd.textContent.trim() : null; // DISPLAY value (Row() truncates hex >30 chars — separate tracked ticket, not re-audited here)
      rowsFull[label] = dd ? (dd.getAttribute('title') ?? dd.textContent.trim()) : null; // FULL untruncated value via title=, per Row()'s own code
    });
    return {
      rows,
      rowsFull,
      verifiedChipText: document.querySelector('[data-testid="vault-gutter-card-c"]')?.textContent.slice(0, 60) ?? null,
      hasCodeTags: drawer.querySelectorAll('code').length,
    };
  });
}

// Random click-order lottery means a bare "safe reveal 0/1/2" attempt can hit
// a mine on the very FIRST tap (round seeds are fresh crypto.getRandomValues
// per round, independent of click order) and settle as a rug even when
// forceWin was requested. Retry with a fresh page/round (real "bet again" ->
// new random seed) up to maxAttempts until a genuine win (no "rug struck",
// >=1 safe tile actually revealed) — or genuine rug for forceWin:false —
// is reached, so the win/rug tags reflect the REAL outcome, not the request.
async function reachSettledMatchingOutcome(page, { forceWin, maxAttempts = 10 }) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt === 1) {
      await reachSettled(page, { forceWin });
    } else {
      // start a fresh round from the settled screen via a real mouse click
      // on "bet again", then drive it the same way.
      const betAgainBox = await page.evaluate(() => {
        const btn = document.querySelector('[data-testid="vault-settled-betagain"] button');
        if (!btn) return null;
        const r = btn.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      if (betAgainBox) {
        await page.mouse.click(betAgainBox.x, betAgainBox.y);
        await wait(700);
      } else {
        await page.reload({ waitUntil: 'networkidle0' });
        await wait(500);
      }
      const spots = [];
      for (let gx = 1; gx <= 9; gx++) for (let gy = 1; gy <= 9; gy++) spots.push([gx / 10, gy / 10]);
      let safeReveals = 0;
      for (const [fx, fy] of spots) {
        if (await isSettled(page)) break;
        await clickCanvasFraction(page, fx, fy);
        await wait(300);
        if (await isSettled(page)) break;
        safeReveals += 1;
        if (forceWin && safeReveals >= 2) {
          if (await takeProfitIfEnabled(page)) { await wait(900); break; }
        }
      }
      await wait(900);
    }
    await wait(1300); // let verify effect resolve to 'matched'
    const outcome = await page.evaluate(() => {
      const drawer = document.getElementById('vault-settled-receipt');
      const bodyText = document.body.textContent || '';
      return {
        isSettled: !!document.querySelector('[data-testid="vault-settled-left"]'),
        looksLikeWin: bodyText.includes('SECURED') || bodyText.includes('pumped'),
        looksLikeRug: bodyText.includes('RUGGED') || bodyText.includes('BUST'),
      };
    });
    if (!outcome.isSettled) continue;
    if (forceWin && outcome.looksLikeWin && !outcome.looksLikeRug) return { reached: true, attempt };
    if (!forceWin && outcome.looksLikeRug) return { reached: true, attempt };
    // wrong outcome for this attempt's goal (mine hit on the very first tap,
    // or a win where a rug was wanted) — loop again for a fresh seed.
  }
  return { reached: false, attempt: maxAttempts };
}

async function fullCycle(browser, w, h, { forceWin, tag }) {
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);

  const retryResult = await reachSettledMatchingOutcome(page, { forceWin });
  const reached = retryResult.reached;

  const R = { tag, viewport: `${w}x${h}`, reachedSettled: reached, attemptsUsed: retryResult.attempt };

  // --- ITEM 2: still reachable + verifiable ---------------------------------
  const preOpen = await page.evaluate(() => {
    const chip = document.querySelector('.vault-receipt-toggle');
    return {
      toggleFound: !!chip,
      ariaExpanded: chip ? chip.getAttribute('aria-expanded') : null,
      ariaControls: chip ? chip.getAttribute('aria-controls') : null,
      verifiedChipPresent: !!document.querySelector('[data-testid="vault-gutter-card-c"]'),
      verifiedChipText: document.querySelector('[data-testid="vault-gutter-card-c"]')?.textContent.slice(0, 40) ?? null,
    };
  });
  R.preOpen = preOpen;

  if (!preOpen.toggleFound) {
    R.FAIL = 'toggle not found (verifyState never reached matched, or showC gate failed)';
    await page.screenshot({ path: `${OUT}/${tag}-${w}x${h}-FAIL-no-toggle.png`, fullPage: true });
    await page.close();
    return R;
  }

  const toggleCoords = async () => page.evaluate(() => {
    const chip = document.querySelector('.vault-receipt-toggle');
    const r = chip.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });

  // OPEN #1 — real mouse click
  let coords = await toggleCoords();
  await page.mouse.click(coords.x, coords.y);
  await wait(450);
  const afterOpen1 = await page.evaluate(() => {
    const chip = document.querySelector('.vault-receipt-toggle');
    return {
      ariaExpanded: chip.getAttribute('aria-expanded'),
      bodyInDom: !!document.getElementById('vault-settled-receipt'),
    };
  });
  R.afterOpen1 = afterOpen1;
  await page.screenshot({ path: `${OUT}/${tag}-${w}x${h}-1-open.png`, fullPage: true });

  const receipt = await readReceipt(page);
  R.receiptContent = receipt;

  // --- ITEM 1: elementFromPoint at toggle while receipt is OPEN -------------
  coords = await toggleCoords(); // re-measure; body pushed things in normal flow, toggle itself shouldn't move but re-measure to be safe
  const hitTestOpen = await page.evaluate(({ x, y }) => {
    const chip = document.querySelector('.vault-receipt-toggle');
    const hit = document.elementFromPoint(x, y);
    return {
      hitTag: hit ? hit.tagName : null,
      hitClass: hit ? hit.className : null,
      hitTestId: hit ? hit.getAttribute('data-testid') : null,
      hitIsChipOrDescendant: hit ? (hit === chip || chip.contains(hit)) : false,
      hitText: hit ? (hit.textContent || '').slice(0, 60) : null,
    };
  }, coords);
  R.hitTestAtToggle_whileOpen = hitTestOpen;

  // CLOSE — real mouse click at the SAME point elementFromPoint just resolved
  await page.mouse.click(coords.x, coords.y);
  await wait(450);
  const afterClose = await page.evaluate(() => {
    const chip = document.querySelector('.vault-receipt-toggle');
    return {
      ariaExpanded: chip.getAttribute('aria-expanded'),
      bodyInDom: !!document.getElementById('vault-settled-receipt'),
    };
  });
  R.afterClose = afterClose;
  await page.screenshot({ path: `${OUT}/${tag}-${w}x${h}-2-closed.png`, fullPage: true });

  // hit-test again post-close to confirm the toggle is still the top element
  // at its own coords (sanity: nothing else slid in to cover it once collapsed)
  coords = await toggleCoords();
  const hitTestClosed = await page.evaluate(({ x, y }) => {
    const chip = document.querySelector('.vault-receipt-toggle');
    const hit = document.elementFromPoint(x, y);
    return { hitIsChipOrDescendant: hit ? (hit === chip || chip.contains(hit)) : false };
  }, coords);
  R.hitTestAtToggle_afterClose = hitTestClosed;

  // OPEN #2 — full cycle proof (open -> close -> open)
  await page.mouse.click(coords.x, coords.y);
  await wait(450);
  const afterOpen2 = await page.evaluate(() => {
    const chip = document.querySelector('.vault-receipt-toggle');
    return {
      ariaExpanded: chip.getAttribute('aria-expanded'),
      bodyInDom: !!document.getElementById('vault-settled-receipt'),
    };
  });
  R.afterOpen2 = afterOpen2;
  await page.screenshot({ path: `${OUT}/${tag}-${w}x${h}-3-reopen.png`, fullPage: true });

  // --- ITEM 3: re-derivation (fed straight from rendered receipt DOM) -------
  if (receipt && receipt.rowsFull) {
    const serverSeedHex = receipt.rowsFull['server seed'];
    const serverSeedHashHex = receipt.rowsFull['server seed hash'];
    const gridText = receipt.rowsFull['grid']; // "5×5"
    const gridSize = gridText ? parseInt(gridText.split('×')[0], 10) : null;
    const mineCount = receipt.rowsFull['rugs'] ? parseInt(receipt.rowsFull['rugs'], 10) : null;
    if (serverSeedHex && serverSeedHashHex && gridSize && mineCount != null) {
      const rederive = await rederiveInPage(page, { serverSeedHex, serverSeedHashHex, gridSize, mineCount });
      R.rederivation = {
        input: { serverSeedHex: serverSeedHex.slice(0, 16) + '…', serverSeedHashHex: serverSeedHashHex.slice(0, 16) + '…', gridSize, mineCount },
        ...rederive,
        mineCountMatchesReceipt: rederive.rederivedMineCount === mineCount,
      };
    } else {
      R.rederivation = { FAIL: 'missing field(s) in receipt', serverSeedHex, serverSeedHashHex, gridSize, mineCount };
    }
  } else {
    R.rederivation = { FAIL: 'no receipt content read' };
  }

  R.consoleErrors = consoleErrors;
  await page.close();
  return R;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  fs.mkdirSync(OUT, { recursive: true });
  const R = {};

  R.win_1440x900 = await fullCycle(browser, 1440, 900, { forceWin: true, tag: 'win' });
  R.rug_1440x900 = await fullCycle(browser, 1440, 900, { forceWin: false, tag: 'rug' });
  R.win_1920x1080 = await fullCycle(browser, 1920, 1080, { forceWin: true, tag: 'win' });
  R.rug_1920x1080 = await fullCycle(browser, 1920, 1080, { forceWin: false, tag: 'rug' });

  await browser.close();
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();
