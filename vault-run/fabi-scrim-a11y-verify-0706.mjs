// fabi-scrim-a11y-verify-0706.mjs — holdgate a11y re-verify for the vault
// SETTLED-scrim / banner-in-HUD / VAULT_PLATE_FILL control-column-unify /
// 45%-dim-unopened-safes change. Adapted from a11y-vaultplate-audit-0706.mjs
// (same measurement primitives: luminance/ratio/extremes/shot/rectClip,
// measureRugsRow, worldCardRects, sampleTextVsLocalBg, focusRingCheck) —
// added: settled HUD banner (win+loss) live composited-bg sampling, board
// caption pill, session-pulse values, verified/view-receipt line, the two
// outline buttons (new setup / share), revealed-tile pick-order number
// canvas sample, focus checks on the 5 settled CTAs, and a computed-style
// animation/flash sanity check.
import puppeteer from 'puppeteer-core';
import { PNG } from 'pngjs';
import fs from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = process.argv[2] || '6612';
const OUTDIR = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad';
const DPR = 3;

function luminance([r, g, b]) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
function ratio(fg, bg) {
  const L1 = luminance(fg) + 0.05;
  const L2 = luminance(bg) + 0.05;
  return L1 > L2 ? L1 / L2 : L2 / L1;
}
function px(png, x, y) {
  const idx = (png.width * Math.min(Math.max(y, 0), png.height - 1) + Math.min(Math.max(x, 0), png.width - 1)) << 2;
  return [png.data[idx], png.data[idx + 1], png.data[idx + 2]];
}
function extremes(png) {
  let minL = Infinity, maxL = -Infinity, minC = null, maxC = null;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const c = px(png, x, y);
      const l = luminance(c);
      if (l < minL) { minL = l; minC = c; }
      if (l > maxL) { maxL = l; maxC = c; }
    }
  }
  return { minC, maxC, minL, maxL };
}
async function shot(page, clip) {
  if (clip.width < 1 || clip.height < 1) return null;
  const buf = await page.screenshot({ clip });
  return PNG.sync.read(Buffer.from(buf));
}
function rectClip(rect, padCss = 0) {
  return {
    x: Math.max(0, rect.x - padCss),
    y: Math.max(0, rect.y - padCss),
    width: Math.max(1, rect.width + padCss * 2),
    height: Math.max(1, rect.height + padCss * 2),
  };
}
async function sampleTextVsLocalBg(page, rect, padCss = 2) {
  const png = await shot(page, rectClip(rect, padCss));
  if (!png) return null;
  const { minC, maxC } = extremes(png);
  return { fg: maxC, bg: minC, ratio: +ratio(maxC, minC).toFixed(2) };
}
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    return els.find(e => e.offsetParent !== null && !e.disabled && norm(e) === t.toLowerCase())
      || els.find(e => e.offsetParent !== null && !e.disabled && norm(e).includes(t.toLowerCase()));
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
async function getRectByText(page, matchFn) {
  return await page.evaluate((fnSrc) => {
    // eslint-disable-next-line no-new-func
    const fn = new Function('el', `return (${fnSrc})(el)`);
    const all = [...document.querySelectorAll('span,button,div')];
    for (const el of all) {
      if (el.offsetParent === null) continue;
      if (fn(el)) {
        const b = el.getBoundingClientRect();
        return { x: b.x, y: b.y, width: b.width, height: b.height, text: el.textContent.trim().slice(0, 80) };
      }
    }
    return null;
  }, matchFn.toString());
}
async function cc(page, idx, g) {
  return await page.evaluate(({ idx, g }) => {
    const c = document.querySelector('canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    const W = r.width, H = r.height;
    const tR = H * 0.15, bR = H * 0.18, sF = 0.08;
    const sW = W * (1 - sF * 2);
    const sH = (H - tR - bR) * 0.96;
    const av = Math.min(sW, sH);
    const gap = Math.max(6, av * 0.026);
    const tile = (av - gap * (g - 1)) / g;
    const full = tile * g + gap * (g - 1);
    const x0 = (W - full) / 2;
    const by = tR + (H - tR - bR) / 2;
    const y0 = by - full / 2;
    const col = idx % g, row = Math.floor(idx / g);
    return { cx: r.left + x0 + col * (tile + gap) + tile / 2, cy: r.top + y0 + row * (tile + gap) + tile / 2 };
  }, { idx, g });
}

// ── RUGS-stepper measurement (byte-identical method, regression guard) ──
async function measureRugsRow(page, worldSlug) {
  const rects = await page.evaluate(() => {
    const spans = [...document.querySelectorAll('span')];
    const rugsLabel = spans.find((s) => s.textContent.trim() === 'RUGS');
    const hint = spans.find((s) => s.textContent.includes('per tap starts'));
    const minusBtn = [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Fewer rugs');
    const plusBtn = [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'More rugs');
    if (!rugsLabel || !hint || !minusBtn) return { present: false };
    const container = rugsLabel.closest('div').parentElement;
    const stepWrap = minusBtn.parentElement;
    const stepSpans = [...stepWrap.querySelectorAll('span')];
    const stepValue = stepSpans[0];
    const unitSpan = stepSpans[1];
    const r = (el) => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; };
    return { present: true, container: r(container), label: r(rugsLabel), hint: r(hint), minusBtn: r(minusBtn), plusBtn: r(plusBtn), stepValue: r(stepValue), unit: r(unitSpan) };
  });
  if (!rects.present) return { world: worldSlug, note: 'RUGS row not present (expected for shitcoin, fixed rug count)' };

  const bgClip = {
    x: rects.label.x + rects.label.width + 2,
    y: rects.label.y + rects.label.height / 2 - 1,
    width: Math.max(2, rects.hint.x - (rects.label.x + rects.label.width) - 4),
    height: 2,
  };
  const bgPng = bgClip.width > 1 ? await shot(page, bgClip) : null;
  const rowBg = bgPng ? extremes(bgPng).minC : null;

  const out = { world: worldSlug, rowBg };
  for (const [name, rect] of [['label', rects.label], ['hint', rects.hint], ['stepValue', rects.stepValue], ['unit', rects.unit]]) {
    const png = await shot(page, rectClip(rect, 1));
    const { maxC } = extremes(png);
    out[name] = { glyph: maxC, contrastVsRowBg: rowBg ? +ratio(maxC, rowBg).toFixed(2) : null };
  }
  for (const [name, rect] of [['minusBtnBorder', rects.minusBtn], ['plusBtnBorder', rects.plusBtn]]) {
    const stripClip = { x: rect.x, y: rect.y + 6, width: 3, height: Math.max(1, rect.height - 12) };
    const png = await shot(page, stripClip);
    const { maxC } = extremes(png);
    out[name] = { border: maxC, contrastVsRowBg: rowBg ? +ratio(maxC, rowBg).toFixed(2) : null };
  }
  return out;
}

async function focusRingCheck(page, ariaLabelOrTextMatch, label) {
  const rect = await page.evaluate((sel) => {
    const btns = [...document.querySelectorAll('button')].filter(b => b.offsetParent !== null && !b.disabled);
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const el = btns.find(b => (b.getAttribute('aria-label') || '').toLowerCase().includes(sel.toLowerCase()) || norm(b).includes(sel.toLowerCase()));
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }, ariaLabelOrTextMatch);
  if (!rect) return { label, error: 'element not found' };
  const pad = 8;
  const clip = rectClip(rect, pad);
  const before = await shot(page, clip);
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press('Tab');
  let found = false;
  for (let i = 0; i < 50; i++) {
    const match = await page.evaluate((r) => {
      const el = document.activeElement;
      if (!el) return false;
      const rr = el.getBoundingClientRect();
      return Math.abs(rr.x - r.x) < 2 && Math.abs(rr.y - r.y) < 2;
    }, rect);
    if (match) { found = true; break; }
    await page.keyboard.press('Tab');
  }
  if (!found) return { label, error: 'could not reach element via Tab within 50 presses' };
  await wait(80);
  const after = await shot(page, clip);
  let diffCount = 0, total = 0;
  for (let y = 0; y < before.height; y++) {
    for (let x = 0; x < before.width; x++) {
      const inElement = x >= pad * DPR && x < (before.width - pad * DPR) && y >= pad * DPR && y < (before.height - pad * DPR);
      if (inElement) continue;
      total++;
      const b1 = px(before, x, y), b2 = px(after, x, y);
      const dl = Math.abs(luminance(b1) - luminance(b2));
      if (dl > 0.03) diffCount++;
    }
  }
  fs.writeFileSync(`${OUTDIR}/scrim-focus-${label}-before.png`, PNG.sync.write(before));
  fs.writeFileSync(`${OUTDIR}/scrim-focus-${label}-after.png`, PNG.sync.write(after));
  return { label, found: true, diffPixelsInHalo: diffCount, totalHaloPixels: total, pctChanged: +((diffCount / total) * 100).toFixed(1) };
}

// ── settled HUD banner + surrounding panels sampler (shared win/loss) ──
async function measureSettledSurface(page, tag) {
  const out = { tag };

  // Banner container computed bg (getComputedStyle, not source assumption)
  out.bannerComputed = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-settled-banner"]');
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { background: cs.backgroundImage || cs.backgroundColor, border: cs.borderColor, animationName: cs.animationName };
  });

  // Big multiplier / BUST
  const bigRect = await getRectByText(page, (el) => el.getAttribute('data-testid') === 'vault-hud-pump-value');
  if (bigRect) out.heroBig = { text: bigRect.text, ...(await sampleTextVsLocalBg(page, bigRect, 1)) };

  // Kicker ("SECURED THE BAG" / "RUGGED")
  const kickerRect = await getRectByText(page, (el) => el.textContent.trim() === 'SECURED THE BAG' || el.textContent.trim() === 'RUGGED');
  if (kickerRect) out.heroKicker = { text: kickerRect.text, ...(await sampleTextVsLocalBg(page, kickerRect, 1)) };

  // Delta ("+X.XX USDC" / "-X.XX USDC") on desktopGridHudRight (right side of banner)
  const deltaRect = await page.evaluate(() => {
    const els = [...document.querySelectorAll('[data-testid="vault-settled-banner"] span')];
    const el = els.find((s) => /^[+-].*USDC$/.test(s.textContent.trim()));
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, width: b.width, height: b.height, text: el.textContent.trim() };
  });
  if (deltaRect) out.heroDelta = { text: deltaRect.text, ...(await sampleTextVsLocalBg(page, deltaRect, 1)) };

  // Board caption pill
  const captionRect = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-settled-board-caption"]');
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, width: b.width, height: b.height, text: el.textContent.trim() };
  });
  if (captionRect) out.boardCaption = { text: captionRect.text, ...(await sampleTextVsLocalBg(page, captionRect, 1)) };

  // Session-pulse values (BEST / WON-LOST / NET) inside vault-ctl-session
  const sessionVals = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="vault-ctl-session"]');
    if (!card) return null;
    const label = card.querySelector('span')?.textContent.trim();
    const rows = [...card.querySelectorAll('div')].map((d) => d.textContent.trim()).filter(Boolean);
    const valueSpans = [...card.querySelectorAll('span')].filter((s) => s.children.length === 0 || /BEST|NET|WON/.test(s.parentElement?.previousSibling?.textContent || ''));
    return { label, rowsPreview: rows.slice(0, 6) };
  });
  out.sessionCardPreview = sessionVals;
  const bestValRect = await getRectByText(page, (el) => el.parentElement && el.parentElement.previousElementSibling && el.parentElement.previousElementSibling.textContent.trim() === 'BEST');
  // fallback: query by structural position (label 'BEST' then next sibling span)
  const bestRect2 = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="vault-ctl-session"]');
    if (!card) return null;
    const stats = [...card.querySelectorAll('div')].filter(d => d.children.length === 2);
    for (const s of stats) {
      const lab = s.children[0]?.textContent.trim();
      const val = s.children[1];
      if (lab === 'BEST' && val) { const b = val.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height, text: val.textContent.trim(), lab }; }
    }
    return null;
  });
  if (bestRect2) out.sessionBest = { text: bestRect2.text, ...(await sampleTextVsLocalBg(page, bestRect2, 1)) };
  const netRect2 = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="vault-ctl-session"]');
    if (!card) return null;
    const stats = [...card.querySelectorAll('div')].filter(d => d.children.length === 2);
    for (const s of stats) {
      const lab = s.children[0]?.textContent.trim();
      const val = s.children[1];
      if (lab === 'NET' && val) { const b = val.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height, text: val.textContent.trim(), lab }; }
    }
    return null;
  });
  if (netRect2) out.sessionNet = { text: netRect2.text, ...(await sampleTextVsLocalBg(page, netRect2, 1)) };
  const wonLostRect2 = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="vault-ctl-session"]');
    if (!card) return null;
    const stats = [...card.querySelectorAll('div')].filter(d => d.children.length === 2);
    for (const s of stats) {
      const lab = s.children[0]?.textContent.trim();
      const val = s.children[1];
      if (lab === 'WON · LOST' && val) { const b = val.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height, text: val.textContent.trim(), lab }; }
    }
    return null;
  });
  if (wonLostRect2) out.sessionWonLost = { text: wonLostRect2.text, ...(await sampleTextVsLocalBg(page, wonLostRect2, 1)) };
  const sessionLabelRect = await getRectByText(page, (el) => el.textContent.trim() === 'SESSION PULSE');
  if (sessionLabelRect) out.sessionPulseLabel = { text: sessionLabelRect.text, ...(await sampleTextVsLocalBg(page, sessionLabelRect, 1)) };

  // VERIFIED chip + view-receipt toggle
  const verifiedChipRect = await page.evaluate(() => {
    const el = [...document.querySelectorAll('span')].find((s) => /^✓?\s*verified$/i.test(s.textContent.trim()));
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, width: b.width, height: b.height, text: el.textContent.trim() };
  });
  if (verifiedChipRect) out.verifiedChip = { text: verifiedChipRect.text, ...(await sampleTextVsLocalBg(page, verifiedChipRect, 1)) };
  const viewReceiptRect = await page.evaluate(() => {
    const el = document.querySelector('.vault-receipt-toggle');
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, width: b.width, height: b.height, text: el.textContent.trim() };
  });
  if (viewReceiptRect) out.viewReceiptToggle = { text: viewReceiptRect.text, ...(await sampleTextVsLocalBg(page, viewReceiptRect, 1)) };

  // Outline buttons: new setup / share
  const newSetupRect = await page.evaluate(() => {
    const el = [...document.querySelectorAll('button')].find((b) => /new setup/i.test(b.textContent));
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, width: b.width, height: b.height, text: el.textContent.trim() };
  });
  if (newSetupRect) out.newSetupBtn = { text: newSetupRect.text, ...(await sampleTextVsLocalBg(page, newSetupRect, 1)) };
  const shareRect = await page.evaluate(() => {
    const el = [...document.querySelectorAll('button')].find((b) => /^share/i.test(b.textContent.trim()));
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, width: b.width, height: b.height, text: el.textContent.trim() };
  });
  if (shareRect) out.shareBtn = { text: shareRect.text, ...(await sampleTextVsLocalBg(page, shareRect, 1)) };

  return out;
}

const results = { regression: { rugsStepper: [] }, win: {}, loss: {}, focus: {}, flash: {}, motionReduce: {}, notes: [] };

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: DPR });
  page.on('pageerror', (e) => results.notes.push('pageerror: ' + e.message));
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1500);

  // ── Regression: RUGS-stepper across 3 worlds (must stay >=7.58 per memory) ──
  const worlds = ['bluechips', 'altseason', 'shitcoin'];
  for (const w of worlds) {
    await page.evaluate((slug) => {
      const el = document.querySelector(`[data-testid="vault-world-card-${slug}"]`);
      if (el) el.click();
    }, w);
    await wait(400);
    results.regression.rugsStepper.push(await measureRugsRow(page, w));
  }
  // regression: ctlLabel-family caption on YOUR BET
  await page.evaluate(() => { const el = document.querySelector('[data-testid="vault-world-card-bluechips"]'); if (el) el.click(); });
  await wait(300);
  const yourBetLabel = await getRectByText(page, (el) => el.textContent.trim() === 'YOUR BET');
  results.regression.yourBetLabel = yourBetLabel ? { text: yourBetLabel.text, ...(await sampleTextVsLocalBg(page, yourBetLabel, 1)) } : null;

  // ── WIN scenario: bluechips, reveal a couple safe tiles, take profit ──
  await clickText(page, 'send it');
  await wait(900);
  const first = await cc(page, 0, 5);
  if (first) {
    await page.mouse.move(first.cx, first.cy);
    await page.mouse.down();
    await wait(30);
    for (const idx of [1, 2]) {
      const c = await cc(page, idx, 5);
      if (c) { await page.mouse.move(c.cx, c.cy, { steps: 3 }); await wait(10); }
    }
    await page.mouse.up();
    await wait(400);
  }
  const paceInstant = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null);
    const instant = btns.find(b => b.textContent.trim().toLowerCase() === 'instant');
    return instant ? instant.getAttribute('aria-pressed') : null;
  });
  if (paceInstant !== 'true') { await clickText(page, 'instant'); await wait(150); }
  await clickText(page, 'GO');
  let settledOk = false;
  for (let i = 0; i < 100; i++) {
    await wait(60);
    const isSettled = await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'));
    if (isSettled) { settledOk = true; break; }
    const running = await page.evaluate(() => [...document.querySelectorAll('button')].some(b => b.offsetParent !== null && b.textContent.trim() === 'STOP ⚡'));
    if (!running) {
      const tp = await clickText(page, 'take profit');
      if (tp) { await wait(700); }
    }
  }
  results.notes.push(`WIN scenario reached settled: ${settledOk}`);
  await wait(1200); // let verify go verifying -> matched
  // click view receipt to expand + measure
  await clickText(page, 'view receipt');
  await wait(400);
  if (settledOk) {
    results.win = await measureSettledSurface(page, 'win');
    // revealed-tile pick-order number (canvas sample) — tile idx0 was revealed
    const t0 = await cc(page, 0, 5);
    if (t0) {
      const numClip = { x: t0.cx - 12, y: t0.cy + 4, width: 24, height: 20 };
      const png = await shot(page, numClip);
      if (png) {
        const { minC, maxC } = extremes(png);
        results.win.revealedTileNumber = { fg: maxC, bg: minC, ratio: +ratio(maxC, minC).toFixed(2) };
      }
    }
    await page.screenshot({ path: `${OUTDIR}/scrim-settled-win-1440.png` });
    // Focus checks — win side
    results.focus.betAgainWin = await focusRingCheck(page, 'bet again', 'bet-again-win');
    results.focus.sameTrailWin = await focusRingCheck(page, 'same trail', 'same-trail-win');
    results.focus.newSetupWin = await focusRingCheck(page, 'new setup', 'new-setup-win');
    results.focus.shareWin = await focusRingCheck(page, 'share this result', 'share-win');
    results.focus.viewReceiptWin = await focusRingCheck(page, 'receipt', 'view-receipt-win');
    // flash/animation computed-style sanity
    results.flash.win = await page.evaluate(() => {
      const ids = ['vault-settled-banner', 'vault-settled-board-caption', 'vault-scene-edge-scrim'];
      return ids.map((id) => {
        const el = document.querySelector(`[data-testid="${id}"]`);
        if (!el) return { id, present: false };
        const cs = getComputedStyle(el);
        return { id, present: true, animationName: cs.animationName, animationDuration: cs.animationDuration, transition: cs.transition };
      });
    });
  }

  // ── LOSS scenario: fresh reload, shitcoin, reveal until rug ──
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1200);
  await page.evaluate(() => { const el = document.querySelector('[data-testid="vault-world-card-shitcoin"]'); if (el) el.click(); });
  await wait(400);
  await clickText(page, 'send it');
  await wait(900);
  let lossSettled = null;
  outer: for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 7; col++) {
      const c = await cc(page, row * 7 + col, 7);
      if (!c) continue;
      await page.mouse.click(c.cx, c.cy);
      await wait(500);
      const isSettled = await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'));
      if (isSettled) { lossSettled = true; break outer; }
    }
  }
  results.notes.push(`LOSS scenario reached settled: ${!!lossSettled}`);
  await wait(1200);
  await clickText(page, 'view receipt');
  await wait(400);
  if (lossSettled) {
    results.loss = await measureSettledSurface(page, 'loss');
    await page.screenshot({ path: `${OUTDIR}/scrim-settled-loss-1440.png` });
    results.focus.betAgainLoss = await focusRingCheck(page, 'bet again', 'bet-again-loss');
    results.focus.newSetupLoss = await focusRingCheck(page, 'new setup', 'new-setup-loss');
    results.focus.shareLoss = await focusRingCheck(page, 'share this result', 'share-loss');
    results.focus.viewReceiptLoss = await focusRingCheck(page, 'receipt', 'view-receipt-loss');
    results.flash.loss = await page.evaluate(() => {
      const ids = ['vault-settled-banner', 'vault-settled-board-caption', 'vault-scene-edge-scrim'];
      return ids.map((id) => {
        const el = document.querySelector(`[data-testid="${id}"]`);
        if (!el) return { id, present: false };
        const cs = getComputedStyle(el);
        return { id, present: true, animationName: cs.animationName, animationDuration: cs.animationDuration, transition: cs.transition };
      });
    });
  }

  // ── Motion-reduce: fresh context with prefers-reduced-motion:reduce ──
  const mrPage = await browser.newPage();
  await mrPage.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await mrPage.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await mrPage.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1200);
  await mrPage.evaluate(() => { const el = document.querySelector('[data-testid="vault-world-card-bluechips"]'); if (el) el.click(); });
  await wait(300);
  await clickText(mrPage, 'send it');
  await wait(700);
  const mrFirst = await cc(mrPage, 0, 5);
  if (mrFirst) { await mrPage.mouse.click(mrFirst.cx, mrFirst.cy); await wait(400); }
  await clickText(mrPage, 'take profit');
  await wait(900);
  results.motionReduce = await mrPage.evaluate(() => {
    const ids = ['vault-settled-banner', 'vault-settled-board-caption', 'vault-scene-edge-scrim', 'DesktopHudRow'];
    return {
      matchMediaReduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      elements: ids.map((id) => {
        const el = document.querySelector(`[data-testid="${id}"]`);
        if (!el) return { id, present: false };
        const cs = getComputedStyle(el);
        return { id, present: true, animationName: cs.animationName, animationPlayState: cs.animationPlayState };
      }),
    };
  });
  await mrPage.screenshot({ path: `${OUTDIR}/scrim-settled-motionreduce-1440.png` });
  await mrPage.close();

  fs.writeFileSync(`${OUTDIR}/scrim-a11y-verify-results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
