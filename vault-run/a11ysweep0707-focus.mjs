// a11ysweep0707-focus.mjs — REAL page.keyboard.press('Tab') focus-visible sweep
// through world-picker -> wager stepper -> CTA -> (settled) bet-again, with a
// geometric clip-check against every overflow:hidden ancestor, plus a
// focused-vs-unfocused screenshot pair, per the Pulse candle-crash re-verify
// method (never el.focus() in page.evaluate() — that heuristic fails :focus-visible
// in headless Chrome).
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5390';
const OUTDIR = 'shots-a11ysweep-2026-07-07';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    const norm = (e) => e.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
    return els.find(e => e.offsetParent !== null && !e.disabled && norm(e) === t.toLowerCase())
      || els.find(e => e.offsetParent !== null && !e.disabled && norm(e).includes(t.toLowerCase()));
  }, t);
  const el = h.asElement(); if (!el) return false; await el.click(); return true;
}

async function describeFocused(page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return { none: true };
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    // walk ancestor chain for overflow:hidden clipping
    const clippers = [];
    let p = el.parentElement;
    while (p) {
      const pcs = getComputedStyle(p);
      if (pcs.overflow === 'hidden' || pcs.overflowX === 'hidden' || pcs.overflowY === 'hidden') {
        const pr = p.getBoundingClientRect();
        clippers.push({ tag: p.tagName, cls: p.className?.toString().slice(0, 40), rect: { x: pr.x, y: pr.y, width: pr.width, height: pr.height } });
      }
      p = p.parentElement;
    }
    const outlineWidth = parseFloat(cs.outlineWidth) || 0;
    const outlineOffset = parseFloat(cs.outlineOffset) || 0;
    const boxShadow = cs.boxShadow;
    const expand = outlineWidth + outlineOffset + 2;
    const ringRect = { x: rect.x - expand, y: rect.y - expand, width: rect.width + expand * 2, height: rect.height + expand * 2 };
    // predict clipping: does any clipper's rect FAIL to fully contain ringRect?
    const clipPredictions = clippers.map(c => {
      const r = c.rect;
      const clippedLeft = ringRect.x < r.x;
      const clippedTop = ringRect.y < r.y;
      const clippedRight = (ringRect.x + ringRect.width) > (r.x + r.width);
      const clippedBottom = (ringRect.y + ringRect.height) > (r.y + r.height);
      return { ...c, clippedLeft, clippedTop, clippedRight, clippedBottom, anyClip: clippedLeft || clippedTop || clippedRight || clippedBottom };
    });
    return {
      tag: el.tagName,
      testid: el.getAttribute('data-testid'),
      text: (el.textContent || '').trim().slice(0, 40),
      ariaLabel: el.getAttribute('aria-label'),
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      outline: cs.outline,
      outlineColor: cs.outlineColor,
      outlineStyle: cs.outlineStyle,
      outlineWidth: cs.outlineWidth,
      outlineOffset: cs.outlineOffset,
      boxShadow: boxShadow === 'none' ? null : boxShadow,
      hasVisibleTreatment: cs.outlineStyle !== 'none' && outlineWidth > 0 || (boxShadow !== 'none'),
      clippers: clipPredictions,
      anyClipperClips: clipPredictions.some(c => c.anyClip),
    };
  });
}

async function focusPairShot(page, tag) {
  const info = await describeFocused(page);
  if (info.none) return { info };
  const r = info.rect;
  const pad = 24;
  const clip = { x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad), width: r.width + pad * 2, height: r.height + pad * 2 };
  const focusedBuf = await page.screenshot({ clip });
  fs.writeFileSync(`${OUTDIR}/focus-${tag}-FOCUSED.png`, focusedBuf);
  // blur by tabbing away and back is risky (order); instead click body/canvas neutrally is unsafe (would activate). Use page.evaluate to blur.
  await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
  await wait(60);
  const unfocusedBuf = await page.screenshot({ clip });
  fs.writeFileSync(`${OUTDIR}/focus-${tag}-UNFOCUSED.png`, unfocusedBuf);
  return { info, clip };
}

async function tabSequence(page, n, tagPrefix, out) {
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab');
    await wait(120);
    const shot = await focusPairShot(page, `${tagPrefix}-${i}`);
    out.push({ step: i, ...shot });
  }
}

const results = {};

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  await page.evaluateOnNewDocument(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1200);

  // ---- BET-ENTRY: Tab through world-picker -> wager stepper -> CTA ----
  const betEntrySeq = [];
  await tabSequence(page, 14, 'betentry', betEntrySeq);
  results.betEntryTabOrder = betEntrySeq.map(s => ({
    step: s.step,
    testid: s.info?.testid,
    tag: s.info?.tag,
    text: s.info?.text,
    outlineStyle: s.info?.outlineStyle,
    outlineWidth: s.info?.outlineWidth,
    boxShadow: s.info?.boxShadow,
    hasVisibleTreatment: s.info?.hasVisibleTreatment,
    anyClipperClips: s.info?.anyClipperClips,
    clippers: s.info?.clippers,
  }));

  // Does forward-Tab order match visual left-to-right/top-to-bottom order?
  results.betEntryVisualOrderCheck = betEntrySeq.map(s => s.info?.rect);

  // ---- No keyboard trap check: keep tabbing past the last control, should cycle to browser chrome or wrap, not freeze on one element ----
  const beforeLast = await describeFocused(page);
  await page.keyboard.press('Tab');
  await wait(100);
  const afterMore = await describeFocused(page);
  results.noTrapCheck = { beforeLast: { testid: beforeLast.testid, text: beforeLast.text }, afterMore: { testid: afterMore.testid, text: afterMore.text }, stuck: JSON.stringify(beforeLast.rect) === JSON.stringify(afterMore.rect) && beforeLast.testid === afterMore.testid };

  // ---- Enter world-picker via mouse (select bluechips), reveal a tile via KEYBOARD to test gesture parity, then reach PLAYING and test Tab there ----
  await page.evaluate(() => { document.querySelector('[data-testid="vault-world-card-bluechips"]').click(); });
  await wait(300);
  await clickText(page, 'send it');
  await wait(700);

  // Playing phase Tab sequence
  const playingSeq = [];
  // focus body first (fresh tab context)
  await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
  await tabSequence(page, 10, 'playing', playingSeq);
  results.playingTabOrder = playingSeq.map(s => ({ step: s.step, testid: s.info?.testid, tag: s.info?.tag, text: s.info?.text, outlineStyle: s.info?.outlineStyle, hasVisibleTreatment: s.info?.hasVisibleTreatment, anyClipperClips: s.info?.anyClipperClips }));

  // ---- KEYBOARD PARITY: can the canvas board be operated via keyboard? ----
  // Try tabbing to the canvas itself and pressing Enter/Space/Arrow keys.
  const canvasFocusable = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return { tabIndex: c.tabIndex, hasTabIndexAttr: c.hasAttribute('tabindex'), ariaLabel: c.getAttribute('aria-label') };
  });
  results.canvasFocusable = canvasFocusable;

  // Does the visible primary gesture (tap a tile) have ANY keyboard equivalent?
  // Probe: focus canvas directly then press Enter/Space/Arrows and see if revealedTiles changes.
  const beforeState = await page.evaluate(() => document.querySelector('[data-testid="vault-grid-status"]')?.textContent || null);
  await page.evaluate(() => { const c = document.querySelector('canvas'); c.focus(); });
  await page.keyboard.press('Enter');
  await wait(300);
  await page.keyboard.press('Space');
  await wait(300);
  await page.keyboard.press('ArrowRight');
  await wait(300);
  const afterState = await page.evaluate(() => document.querySelector('[data-testid="vault-grid-status"]')?.textContent || null);
  results.canvasKeyboardGestureTest = { beforeState, afterState, changed: beforeState !== afterState };

  // ---- Reach SETTLED (win) and Tab to bet-again ----
  const cashed = await clickText(page, 'take profit');
  results.cashOutClicked = cashed;
  await wait(900);
  const settledSeq = [];
  await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
  await tabSequence(page, 8, 'settled', settledSeq);
  results.settledTabOrder = settledSeq.map(s => ({ step: s.step, testid: s.info?.testid, tag: s.info?.tag, text: s.info?.text, outlineStyle: s.info?.outlineStyle, hasVisibleTreatment: s.info?.hasVisibleTreatment, anyClipperClips: s.info?.anyClipperClips }));

  fs.writeFileSync(`${OUTDIR}/focus-results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
