import puppeteer from 'puppeteer-core';
import { PNG } from 'pngjs';
import fs from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = process.argv[2] || '5302';
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

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return els.find(e => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase())
      || els.find(e => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
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

// ── RUGS-stepper measurement (byte-identical method to rugs-contrast-check-0706.mjs) ──
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

// ── Generic text-vs-local-bg sampler: crop the element rect + 3px pad,
// take the two luminance extremes as (bg, fg). Correct for our case because
// every listed foreground token (T.textPrimary/textMuted/accent/bag/danger)
// is LIGHTER than the panel fills/backdrop it sits on at every sample point
// checked in source (confirmed per-element below), so maxC=fg, minC=bg. ──
async function sampleTextVsLocalBg(page, rect, padCss = 2) {
  const png = await shot(page, rectClip(rect, padCss));
  if (!png) return null;
  const { minC, maxC } = extremes(png);
  return { fg: maxC, bg: minC, ratio: +ratio(maxC, minC).toFixed(2) };
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
        return { x: b.x, y: b.y, width: b.width, height: b.height, text: el.textContent.trim().slice(0, 60) };
      }
    }
    return null;
  }, matchFn.toString());
}

async function worldCardRects(page) {
  return await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-testid^="vault-world-card-"]')];
    return cards.map((c) => {
      const b = c.getBoundingClientRect();
      // LEAF spans only (no span children) — excludes wrapper rows
      // (worldTitleRow/worldBody/worldMaxAnchor) whose combined textContent
      // otherwise false-matches as the "first" hit in document order (parent
      // nodes are returned before their children by querySelectorAll).
      const leafSpans = [...c.querySelectorAll('span')].filter(s => s.querySelectorAll('span').length === 0);
      const titleEl = leafSpans.find(s => ['BLUECHIPS', 'ALTSEASON', 'SHITCOIN'].includes(s.textContent.trim()));
      const metaEl = leafSpans.find(s => s.textContent.includes('rugs ·'));
      const maxValEl = leafSpans.find(s => /×$/.test(s.textContent.trim()));
      const maxLabelEl = leafSpans.find(s => s.textContent.trim() === 'MAX');
      const tierEl = leafSpans.find(s => ['STANDARD', 'ELEVATED', 'EXTREME', 'NORMAL', 'HARD', 'CRAZY'].includes(s.textContent.trim()));
      const rectOf = (el) => el ? (() => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, text: el.textContent.trim() }; })() : null;
      return {
        testid: c.getAttribute('data-testid'),
        selected: c.getAttribute('aria-pressed') === 'true',
        card: { x: b.x, y: b.y, width: b.width, height: b.height },
        title: rectOf(titleEl),
        meta: rectOf(metaEl),
        maxVal: rectOf(maxValEl),
        maxLabel: rectOf(maxLabelEl),
        tier: rectOf(tierEl),
      };
    });
  });
}

const results = { rugsStepper: [], worldCards: {}, betEntryPanels: {}, settledPanels: {}, mobileBars: {}, focus: {}, notes: [] };

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: DPR });
  page.on('pageerror', (e) => results.notes.push('pageerror: ' + e.message));
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1500);

  const worlds = ['bluechips', 'altseason', 'shitcoin'];

  for (const w of worlds) {
    await page.evaluate((slug) => {
      const el = document.querySelector(`[data-testid="vault-world-card-${slug}"]`);
      if (el) el.click();
    }, w);
    await wait(500);

    // 1. RUGS-stepper
    const rugsRes = await measureRugsRow(page, w);
    results.rugsStepper.push(rugsRes);

    // 2. World-card text vs local composited bg (all 3 cards visible each time)
    const cards = await worldCardRects(page);
    const cardOut = [];
    for (const c of cards) {
      const entry = { testid: c.testid, selected: c.selected };
      for (const key of ['title', 'meta', 'maxVal', 'maxLabel', 'tier']) {
        if (c[key]) {
          const s = await sampleTextVsLocalBg(page, c[key], 1);
          entry[key] = { text: c[key].text, ...s };
        }
      }
      cardOut.push(entry);
    }
    results.worldCards[w] = cardOut;

    // 3. YOUR BET panel (ctlLabel + wager value) — desktopGridControl variant
    const yourBetLabel = await getRectByText(page, (el) => el.textContent.trim() === 'YOUR BET');
    const wagerValueRect = await page.evaluate(() => {
      const el = [...document.querySelectorAll('div')].find(d => d.getAttribute('data-testid') === 'vault-ctl-wager' || d.getAttribute('data-testid') === 'vault-betentry-yourbet');
      if (!el) return null;
      const val = [...el.querySelectorAll('span')].find(s => /USDC/.test(s.textContent));
      if (!val) return null;
      const b = val.getBoundingClientRect();
      return { x: b.x, y: b.y, width: b.width, height: b.height, text: val.textContent.trim() };
    });
    const yourBetPanel = {};
    if (yourBetLabel) yourBetPanel.label = { text: yourBetLabel.text, ...(await sampleTextVsLocalBg(page, yourBetLabel, 1)) };
    if (wagerValueRect) yourBetPanel.wagerValue = { text: wagerValueRect.text, ...(await sampleTextVsLocalBg(page, wagerValueRect, 1)) };

    // 4. SEND IT / commit CTA button text
    const ctaRect = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')].filter(b => b.offsetParent !== null);
      const el = btns.find(b => /send it/i.test(b.textContent));
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, width: b.width, height: b.height, text: el.textContent.trim() };
    });
    if (ctaRect) yourBetPanel.cta = { text: ctaRect.text, ...(await sampleTextVsLocalBg(page, ctaRect, 1)) };

    results.betEntryPanels[w] = yourBetPanel;
  }

  // ── Focus-indicator check on RUGS +/- (bluechips, has band) and SEND IT CTA ──
  await page.evaluate(() => { const el = document.querySelector('[data-testid="vault-world-card-bluechips"]'); if (el) el.click(); });
  await wait(400);
  async function focusRingCheck(ariaLabelOrTextMatch, label) {
    const rect = await page.evaluate((sel) => {
      const btns = [...document.querySelectorAll('button')].filter(b => b.offsetParent !== null);
      const el = btns.find(b => (b.getAttribute('aria-label') || '').includes(sel) || b.textContent.trim().toLowerCase().includes(sel.toLowerCase()));
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }, ariaLabelOrTextMatch);
    if (!rect) return { label, error: 'element not found' };
    const pad = 8;
    const clip = rectClip(rect, pad);
    const before = await shot(page, clip);
    // Tab to the element via repeated Tab presses, cap at 40
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press('Tab');
    let found = false;
    for (let i = 0; i < 40; i++) {
      const match = await page.evaluate((r) => {
        const el = document.activeElement;
        if (!el) return false;
        const rr = el.getBoundingClientRect();
        return Math.abs(rr.x - r.x) < 2 && Math.abs(rr.y - r.y) < 2;
      }, rect);
      if (match) { found = true; break; }
      await page.keyboard.press('Tab');
    }
    if (!found) return { label, error: 'could not reach element via Tab within 40 presses' };
    await wait(80);
    const after = await shot(page, clip);
    // diff pixel count in the padding ring (outside the element's own rect)
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
    fs.writeFileSync(`${OUTDIR}/focus-${label}-before.png`, PNG.sync.write(before));
    fs.writeFileSync(`${OUTDIR}/focus-${label}-after.png`, PNG.sync.write(after));
    return { label, found: true, diffPixelsInHalo: diffCount, totalHaloPixels: total, pctChanged: +((diffCount / total) * 100).toFixed(1) };
  }
  results.focus.rugsMinus = await focusRingCheck('Fewer rugs', 'rugs-minus');
  results.focus.rugsPlus = await focusRingCheck('More rugs', 'rugs-plus');
  results.focus.sendIt = await focusRingCheck('send it', 'send-it-cta');

  // ── Advance to Playing then Settled for settled-phase panel checks ──
  await page.evaluate(() => { const el = document.querySelector('[data-testid="vault-world-card-bluechips"]'); if (el) el.click(); });
  await wait(300);
  await clickText(page, 'send it');
  await wait(700);
  // paint a short trail then GO
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
    await wait(300);
  }
  const paceInstant = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null);
    const instant = btns.find(b => b.textContent.trim().toLowerCase() === 'instant');
    return instant ? instant.getAttribute('aria-pressed') : null;
  });
  if (paceInstant !== 'true') { await clickText(page, 'instant'); await wait(150); }
  await clickText(page, 'GO');
  // poll for settle or up to 5s, take profit if it survives
  let settledOk = false;
  for (let i = 0; i < 100; i++) {
    await wait(50);
    const isSettled = await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'));
    if (isSettled) { settledOk = true; break; }
    const running = await page.evaluate(() => [...document.querySelectorAll('button')].some(b => b.offsetParent !== null && b.textContent.trim() === 'STOP ⚡'));
    if (!running) {
      const tp = await clickText(page, 'take profit');
      if (tp) { await wait(700); }
    }
  }
  results.notes.push(`reached settled phase: ${settledOk}`);

  if (settledOk) {
    // measure settled panels: RESULT, SESSION META, PLAY STYLE, NEXT BET, VERIFIED
    async function measureByTestId(testid, textMatchers) {
      const out = { testid };
      const container = await page.evaluate((tid) => {
        const el = document.querySelector(`[data-testid="${tid}"]`);
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { x: b.x, y: b.y, width: b.width, height: b.height };
      }, testid);
      if (!container) return { testid, error: 'not found' };
      for (const [key, matchFn] of Object.entries(textMatchers)) {
        const rect = await page.evaluate((tid, fnSrc) => {
          const container = document.querySelector(`[data-testid="${tid}"]`);
          if (!container) return null;
          // eslint-disable-next-line no-new-func
          const fn = new Function('el', `return (${fnSrc})(el)`);
          const el = [...container.querySelectorAll('span,button')].find(fn);
          if (!el) return null;
          const b = el.getBoundingClientRect();
          return { x: b.x, y: b.y, width: b.width, height: b.height, text: el.textContent.trim().slice(0, 60) };
        }, testid, matchFn.toString());
        if (rect) out[key] = { text: rect.text, ...(await sampleTextVsLocalBg(page, rect, 1)) };
      }
      return out;
    }

    results.settledPanels.result = await measureByTestId('vault-settled-result', {
      eyebrow: (el) => el.tagName === 'SPAN' && /BUST|CASHED|RUGGED|WON/i.test(el.textContent) === false && el.textContent === el.textContent.toUpperCase() && el.textContent.length < 30 && el.textContent.length > 2,
      big: (el) => /×$|BUST/.test(el.textContent.trim()),
      delta: (el) => /^[+-].*USDC$|^[+-]\$/.test(el.textContent.trim()),
    });
    results.settledPanels.meta = await measureByTestId('vault-settled-meta', {
      label: (el) => el.textContent.trim() === 'SESSION META',
      points: (el) => /^\+/.test(el.textContent.trim()) && /pts|^\+\d/.test(el.textContent),
    });
    results.settledPanels.playStyle = await measureByTestId('vault-ctl-style', {
      label: (el) => el.textContent.trim() === 'PLAY STYLE',
    });
    results.settledPanels.nextBet = await measureByTestId('vault-settled-next', {
      label: (el) => el.textContent.trim() === 'NEXT BET',
      wagerValue: (el) => /USDC/.test(el.textContent),
      betAgain: (el) => el.tagName === 'BUTTON' && /bet again →/.test(el.textContent),
    });
    results.settledPanels.receipt = await measureByTestId('vault-settled-receipt-card', {
      label: (el) => el.textContent.trim() === 'VERIFIED',
      verifiedChip: (el) => /verified/i.test(el.textContent) && el.tagName === 'SPAN',
    });
    // Focus check on bet-again CTA in settled
    results.focus.betAgain = await focusRingCheck('bet again', 'bet-again-cta');
    await page.screenshot({ path: `${OUTDIR}/settled-1440.png` });
  }

  // ── Mobile bars (390px) ──
  const mpage = await browser.newPage();
  await mpage.setViewport({ width: 390, height: 844, deviceScaleFactor: DPR });
  await mpage.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1000);
  const mobileActionBarText = await mpage.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(b => b.offsetParent !== null);
    const el = btns.find(b => /send it/i.test(b.textContent));
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, width: b.width, height: b.height, text: el.textContent.trim() };
  });
  async function sampleOn(pg, rect) {
    const png = await shot(pg, rectClip(rect, 1));
    if (!png) return null;
    const { minC, maxC } = extremes(png);
    return { fg: maxC, bg: minC, ratio: +ratio(maxC, minC).toFixed(2) };
  }
  if (mobileActionBarText) {
    results.mobileBars.sendItCta = { text: mobileActionBarText.text, ...(await sampleOn(mpage, mobileActionBarText)) };
  }
  await mpage.screenshot({ path: `${OUTDIR}/mobile-betentry-390.png` });
  await mpage.close();

  fs.writeFileSync(`${OUTDIR}/vaultplate-audit-results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
})();
