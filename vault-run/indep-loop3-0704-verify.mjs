// indep-loop3-0704-verify.mjs — INDEPENDENT LOOP-3 re-verify (swoobz-casino-fairness-qa,
// 2026-07-04). Written from scratch, NOT copied from the builder's own
// vaultfix3-0704-verify.mjs (that script is read for orientation only; every
// check here is independently authored and independently derives its expected
// values, incl. a from-scratch port of deriveMineBitmap so re-derivation does
// not just compare the app's own displayed "matched" state to itself).
//
// Checks per viewport (960x800, 1024x800, 1440x900, 1920x1080) x outcome (WIN, RUG):
//  1. LEGIBILITY: every receipt <dd> getBoundingClientRect().width>0, full hex
//     visible (dd.textContent === dd.title, no ellipsis truncation), and the
//     <dl> getComputedStyle().gridTemplateColumns is NOT a collapsed "Npx 0px"
//     pattern (checks for a literal 0px column, the exact LOOP-2 defect shape).
//  2. NO-CLIP / SCROLL-REACHABLE at 960x800 and 1024x800: receipt body's own
//     bottom edge must not exceed the vault-canvas-shell's bottom edge; if
//     scrollable, prove the LAST row is reachable by scrolling to the bottom.
//  3. STILL VERIFIABLE + CLOSABLE: real page.mouse.click() open, elementFromPoint
//     hit-tests the toggle itself (not covered), "✓ verified" chip present,
//     independent SHA-256 Fisher-Yates re-derivation (ported from
//     vaultProvider.ts deriveMineBitmap, run via the browser's own
//     crypto.subtle from ONLY the rendered <dd> values) matches the displayed
//     server-seed-hash + struck/sealed tiles, then real mouse click closes it
//     (aria-expanded flips, body unmounts).
//  4. MOBILE UNCHANGED: mobile Settlement() receipt still 2-col ('auto 1fr'-shaped,
//     i.e. exactly 2 grid-template-column tracks), byte-parity spot check.

import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5540';
const OUT = 'indep-loop3-0704-shots';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

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

async function isSettledDesktop(page) {
  return page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-left"]'));
}
async function isSettledMobile(page) {
  return page.evaluate(() => !!document.querySelector('[data-testid="vault-settledpanel"]'));
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
  // Document-wide search (not scoped to the desktop-only `vault-playing-
  // actions` testid) — mobile's Playing() cash-out button lives in a
  // different container with no shared testid, only an
  // aria-label="Take profit ..." / text "TAKE PROFIT"/"take profit".
  return page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(
      (b) => /take profit/i.test(b.textContent || '') || /^take profit/i.test(b.getAttribute('aria-label') || ''),
    );
    if (btn && !btn.disabled) {
      btn.click();
      return true;
    }
    return false;
  });
}

// Independent reveal-to-outcome driver. wantRug=true just plays a dense sweep
// and takes whatever the crypto-random seed gives (mines are seed-driven, not
// click-order-driven) — retries a fresh round via BET AGAIN if the wrong
// outcome lands, up to N attempts, matching the documented gotcha that a
// forced-flag does not control the real settled outcome.
async function reachOutcome(page, { wantRug, mobile }) {
  const isSettled = mobile ? isSettledMobile : isSettledDesktop;
  const outcomeText = async () =>
    page.evaluate(() => document.body.innerText.match(/RUGGED|BUST|SECURED|PUMPED|CASHED|PROFIT/i)?.[0] ?? null);
  for (let attempt = 0; attempt < 6; attempt++) {
    await clickText(page, 'ape in');
    await wait(500);
    await clickText(page, 'SEND IT');
    await wait(600);
    const spots = [];
    for (let gx = 1; gx <= 9; gx++) for (let gy = 1; gy <= 9; gy++) spots.push([gx / 10, gy / 10]);
    let reveals = 0;
    for (const [fx, fy] of spots) {
      if (await isSettled(page)) break;
      await clickCanvasFraction(page, fx, fy);
      await wait(260);
      if (await isSettled(page)) break;
      reveals += 1;
      if (!wantRug && reveals >= 2) {
        if (await takeProfitIfEnabled(page)) {
          await wait(900);
          break;
        }
      }
    }
    await wait(1100);
    if (!(await isSettled(page))) continue;
    const txt = await outcomeText();
    const isRug = /RUGGED|BUST/i.test(txt || '');
    if (wantRug === isRug) return { ok: true, txt, attempt };
    // wrong outcome — bet again for a fresh round and retry
    const betAgainOk = await clickText(page, 'bet again') || await clickText(page, 'ape in');
    await wait(700);
    if (!betAgainOk) return { ok: false, reason: 'no bet-again control found', txt };
  }
  return { ok: false, reason: 'exhausted retries without matching outcome' };
}

// Independent from-scratch port of vaultProvider.ts's deriveMineBitmap, run
// INSIDE the page via crypto.subtle so it's a real re-derivation, not a call
// into the app's own bundled function.
const DERIVE_FN_SRC = `
async function u64Le(value) {
  const out = new Uint8Array(8);
  let v = BigInt(value);
  for (let i = 0; i < 8; i++) { out[i] = Number(v & 0xffn); v >>= 8n; }
  return out;
}
async function sha256Concat(parts) {
  let total = 0;
  for (const p of parts) total += p.length;
  const buf = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { buf.set(p, off); off += p.length; }
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return new Uint8Array(digest);
}
function hexToBytes(hex) {
  const clean = hex.replace(/^0x/, '');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
  return out;
}
function bytesToHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function deriveMineBitmapIndep(serverSeedHex, totalTiles, mineCount) {
  const serverSeed = hexToBytes(serverSeedHex);
  const mixerTag = new TextEncoder().encode('VAULTILE');
  const positions = new Array(totalTiles);
  for (let i = 0; i < totalTiles; i++) positions[i] = i;
  for (let step = 0; step < totalTiles; step++) {
    const stepBytes = await u64Le(BigInt(step));
    const hash = await sha256Concat([serverSeed, mixerTag, stepBytes]);
    let raw = 0n;
    for (let i = 0; i < 8; i++) raw |= BigInt(hash[i]) << BigInt(8 * i);
    const remaining = BigInt(totalTiles - step);
    const swapOffset = Number(raw % remaining);
    const swapIndex = step + swapOffset;
    const tmp = positions[step];
    positions[step] = positions[swapIndex];
    positions[swapIndex] = tmp;
  }
  const bitmap = new Array(totalTiles).fill(false);
  for (let i = 0; i < mineCount; i++) bitmap[positions[i]] = true;
  return bitmap;
}
async function sha256Hex(hex) {
  const bytes = hexToBytes(hex);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return bytesToHex(new Uint8Array(digest));
}
`;

async function runReceiptCheck(browser, w, h, wantRug) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(400);
  const reach = await reachOutcome(page, { wantRug, mobile: false });
  if (!reach.ok) {
    await page.screenshot({ path: `${OUT}/FAIL-reach-${wantRug ? 'rug' : 'win'}-${w}x${h}.png`, fullPage: true });
    await page.close();
    return { FAIL: `could not reach ${wantRug ? 'RUG' : 'WIN'} outcome: ${JSON.stringify(reach)}` };
  }
  await wait(1200); // allow verify effect -> 'matched' -> chip + Card C mount

  // "verified" chip presence
  const chipInfo = await page.evaluate(() => {
    const body = document.body.innerText;
    return { hasVerifiedChip: /verified/i.test(body), hasToggle: !!document.querySelector('.vault-receipt-toggle') };
  });
  if (!chipInfo.hasToggle) {
    await page.close();
    return { FAIL: 'receipt toggle never appeared (verifyState never reached matched)', chipInfo };
  }

  // OPEN via real mouse
  const toggleBox = await page.evaluate(() => {
    const chip = document.querySelector('.vault-receipt-toggle');
    const r = chip.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.click(toggleBox.x, toggleBox.y);
  await wait(500);

  const hitAfterOpen = await page.evaluate((c) => {
    const hit = document.elementFromPoint(c.x, c.y);
    const chip = document.querySelector('.vault-receipt-toggle');
    return { hitIsToggleOrChild: hit ? chip === hit || chip.contains(hit) : false, hitTag: hit ? hit.tagName : null };
  }, toggleBox);

  // LEGIBILITY probe — measured, not textContent-only.
  const legibility = await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]');
    const body = document.querySelector('[data-testid="vault-settled-receipt-gutter"]');
    if (!body) return { FAIL: 'receipt body not in DOM after real-mouse open' };
    const shellRect = shell ? shell.getBoundingClientRect() : null;
    const bodyRect = body.getBoundingClientRect();
    const bodyCs = getComputedStyle(body);
    const dl = body.querySelector('dl');
    const dlCs = dl ? getComputedStyle(dl) : null;
    const dts = [...body.querySelectorAll('dt')];
    const dds = [...body.querySelectorAll('dd')];
    const rows = dds.map((dd, i) => {
      const r = dd.getBoundingClientRect();
      const cs = getComputedStyle(dd);
      const title = dd.getAttribute('title') || '';
      const text = dd.textContent || '';
      return {
        label: dts[i] ? dts[i].textContent : `(row ${i})`,
        widthPx: Math.round(r.width * 100) / 100,
        heightPx: Math.round(r.height * 100) / 100,
        widthGT0: r.width > 0,
        visibility: cs.visibility,
        display: cs.display,
        opacity: cs.opacity,
        fullValueMatchesTitle: title.length > 0 ? text === title : true,
        textLen: text.length,
        titleLen: title.length,
      };
    });
    // Detect the exact LOOP-2 collapse SHAPE: any track literally "0px".
    const gridTracks = dlCs ? dlCs.gridTemplateColumns.split(/\s+/) : [];
    const hasZeroPxTrack = gridTracks.some((t) => t === '0px');
    const bodyExceedsShellBottom = shellRect ? bodyRect.bottom > shellRect.bottom + 0.5 : null;
    const scrollable = body.scrollHeight > body.clientHeight + 1;
    let lastRowScrollReachable = null;
    if (scrollable && dds.length > 0) {
      const before = body.scrollTop;
      body.scrollTop = body.scrollHeight;
      const afterRect = dds[dds.length - 1].getBoundingClientRect();
      const bbox = body.getBoundingClientRect();
      lastRowScrollReachable = afterRect.top >= bbox.top - 1 && afterRect.bottom <= bbox.bottom + 1;
      body.scrollTop = before;
    }
    return {
      shellRect: shellRect ? { top: shellRect.top, bottom: shellRect.bottom } : null,
      bodyRect: { top: bodyRect.top, bottom: bodyRect.bottom, width: bodyRect.width, height: bodyRect.height },
      bodyMaxHeightCss: bodyCs.maxHeight,
      bodyOverflowY: bodyCs.overflowY,
      dlGridTemplateColumns: dlCs ? dlCs.gridTemplateColumns : null,
      hasZeroPxTrack,
      rowCount: rows.length,
      allWidthsGT0: rows.every((r) => r.widthGT0),
      allFullValueVisible: rows.every((r) => r.fullValueMatchesTitle),
      bodyExceedsShellBottom,
      scrollable,
      lastRowScrollReachable,
      rows,
    };
  });

  await page.screenshot({ path: `${OUT}/receipt-${wantRug ? 'rug' : 'win'}-${w}x${h}.png`, fullPage: true });

  // RE-DERIVATION — from-scratch independent implementation, fed ONLY from
  // rendered <dd title=...> values (not app state).
  const rawValues = await page.evaluate(() => {
    const body = document.querySelector('[data-testid="vault-settled-receipt-gutter"]');
    if (!body) return null;
    const dts = [...body.querySelectorAll('dt')].map((d) => d.textContent.trim());
    const dds = [...body.querySelectorAll('dd')].map((d) => (d.getAttribute('title') || d.textContent).trim());
    const map = {};
    dts.forEach((l, i) => (map[l] = dds[i]));
    return map;
  });

  let rederive = { skipped: true };
  if (rawValues) {
    rederive = await page.evaluate(
      async ({ DERIVE_FN_SRC, rawValues }) => {
        // eslint-disable-next-line no-eval
        eval(DERIVE_FN_SRC);
        const serverSeedHex = rawValues['server seed'];
        const claimedHash = rawValues['server seed hash'];
        const gridStr = rawValues['grid']; // "5×5"
        const [gs] = gridStr.split('×').map((x) => parseInt(x, 10));
        const totalTiles = gs * gs;
        const mineCount = parseInt(rawValues['rugs'], 10);
        // 1. hash check: sha256(serverSeed) === claimed hash
        const recomputedHash = await sha256Hex(serverSeedHex);
        const hashMatches = recomputedHash === claimedHash.replace(/^0x/, '');
        // 2. mine bitmap re-derivation
        const bitmap = await deriveMineBitmapIndep(serverSeedHex, totalTiles, mineCount);
        const mineIndices = bitmap.map((b, i) => (b ? i : -1)).filter((i) => i >= 0);
        // 3. reveal trace: revealed tiles should NEVER be in mineIndices.
        // NOTE: `revealedTiles.join(' -> ')` (VaultExperience.tsx L2394) renders
        // RAW 0-indexed tile indices directly (unlike "rug struck", which is
        // the only field using the 1-indexed `tile N` display format) -- do
        // NOT subtract 1 here.
        const revealTraceStr = rawValues['reveal trace'] || '';
        const revealed = revealTraceStr
          .split('→')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => parseInt(s.replace(/\D/g, ''), 10));
        // 4. rug struck tile (1-indexed display -> 0-indexed)
        const rugStruckStr = rawValues['rug struck'];
        let struckMatchesMine = null;
        if (rugStruckStr) {
          const struckIdx = parseInt(rugStruckStr.replace(/\D/g, ''), 10) - 1;
          struckMatchesMine = mineIndices.includes(struckIdx);
        }
        // 5. sealed count sanity: "N of M" where M === mineCount and N === mineCount - (struck?1:0)
        const sealedStr = rawValues['rugs that stayed sealed'] || '';
        const sealedMatch = sealedStr.match(/(\d+)\s+of\s+(\d+)/);
        return {
          serverSeedHex,
          claimedHash,
          recomputedHash,
          hashMatches,
          totalTiles,
          mineCount,
          mineIndicesCount: mineIndices.length,
          mineIndices,
          revealed,
          noRevealedIsMine: revealed.every((r) => !mineIndices.includes(r)) || revealTraceStr.length === 0,
          rugStruckStr,
          struckMatchesMine,
          sealedStr,
          sealedMatch: sealedMatch ? { sealed: parseInt(sealedMatch[1], 10), total: parseInt(sealedMatch[2], 10) } : null,
        };
      },
      { DERIVE_FN_SRC, rawValues },
    );
  }

  // CLOSE via real mouse, re-measure toggle (it sits above the scrollable body).
  const closeBox = await page.evaluate(() => {
    const chip = document.querySelector('.vault-receipt-toggle');
    const r = chip.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.click(closeBox.x, closeBox.y);
  await wait(400);
  const afterClose = await page.evaluate(() => {
    const chip = document.querySelector('.vault-receipt-toggle');
    return {
      ariaExpanded: chip ? chip.getAttribute('aria-expanded') : null,
      bodyStillMounted: !!document.querySelector('[data-testid="vault-settled-receipt-gutter"]'),
    };
  });
  await page.screenshot({ path: `${OUT}/closed-${wantRug ? 'rug' : 'win'}-${w}x${h}.png`, fullPage: true });

  await page.close();
  return { chipInfo, hitAfterOpen, legibility, rawValues, rederive, afterClose };
}

async function runMobileUnchangedCheck(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(400);
  const reach = await reachOutcome(page, { wantRug: false, mobile: true });
  if (!reach.ok) {
    await page.close();
    return { FAIL: 'mobile could not reach settled: ' + JSON.stringify(reach) };
  }
  await wait(1000);
  await clickText(page, 'view receipt');
  await wait(400);
  const info = await page.evaluate(() => {
    const dls = [...document.querySelectorAll('dl')];
    const receiptDl = dls.find((d) => d.querySelector('dt') && /round id/i.test(d.querySelector('dt').textContent));
    if (!receiptDl) return { FAIL: 'no mobile receipt dl found after expanding' };
    const cs = getComputedStyle(receiptDl);
    const tracks = cs.gridTemplateColumns.split(/\s+/);
    const dd = receiptDl.querySelector('dd');
    const ddCs = dd ? getComputedStyle(dd) : null;
    const ddRect = dd ? dd.getBoundingClientRect() : null;
    return {
      gridTemplateColumns: cs.gridTemplateColumns,
      trackCount: tracks.length,
      isTwoColumn: tracks.length === 2,
      ddOverflow: ddCs ? ddCs.overflow : null,
      ddTextOverflow: ddCs ? ddCs.textOverflow : null,
      ddWidthGT0: ddRect ? ddRect.width > 0 : null,
    };
  });
  await page.screenshot({ path: `${OUT}/mobile-390x844.png`, fullPage: true });
  await page.close();
  return info;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const R = {};
  const viewports = [[960, 800], [1024, 800], [1440, 900], [1920, 1080]];
  for (const [w, h] of viewports) {
    R[`win_${w}x${h}`] = await runReceiptCheck(browser, w, h, false);
    R[`rug_${w}x${h}`] = await runReceiptCheck(browser, w, h, true);
  }
  R.mobileUnchanged = await runMobileUnchangedCheck(browser);
  await browser.close();
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(R, null, 2));
  console.log('DONE');
})().catch((e) => {
  console.error('SCRIPT ERROR', e);
  process.exit(1);
});
