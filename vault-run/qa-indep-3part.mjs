// INDEPENDENT verifier for the vault 3-part change (2026-07-02):
//  PART1 - SESSION PULSE removed from SETTLED only (Lobby/Playing keep it); SESSION TREND stays.
//  PART2 - "bet again - same trail" reuse CTA (green/gold, no cyan).
//  PART3 - instant reveal batch (canvas flip-trigger) - light regression screenshot only, the
//          functional correctness of the batch was already deep-verified by other QA passes;
//          this pass focuses on VISUAL regression + the settled-panel void measurement + cyan probe.
// Freshly authored by the visual-regression verifier (not the maker's threepart-verify.mjs), though
// it structurally reuses the same proven puppeteer patterns documented in AGENT_MEMORY.md
// (retry-until-outcome via aria-live[aria-label] prefix, tap-based trail painting, disambiguated
// settled-panel selector).
import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.argv[2] || '5181';
const W = parseInt(process.argv[3] || '1440');
const H = parseInt(process.argv[4] || '900');
const TAG = process.argv[5] || `D${W}`;
const MODE = process.argv[6] || 'full'; // full | void | light | mobile
const S = `shots/qaindep-${TAG}-`;

const browser = await puppeteer.launch({
  executablePath: EXE, headless: false,
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
  args: [`--window-size=${W + 20},${H + 140}`, '--autoplay-policy=no-user-gesture-required'],
});

async function newPage() {
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));
  await page.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch {} });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1200);
  return { page, consoleErrors };
}

function helpers(page) {
  async function clickText(t) {
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
  async function cc(idx, g) {
    return await page.evaluate(({ idx, g }) => {
      const c = document.querySelector('canvas'); if (!c) return null;
      const r = c.getBoundingClientRect();
      const W = r.width, H = r.height;
      const tR = H * 0.15, bR = H * 0.18, sF = 0.08;
      const sW = W * (1 - sF * 2), sH = (H - tR - bR) * 0.96;
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
  function snake(n, g = 5) {
    const out = [];
    for (let row = 0; row < g && out.length < n; row++) {
      const cols = row % 2 === 0 ? [0, 1, 2, 3, 4] : [4, 3, 2, 1, 0];
      for (const col of cols) { if (out.length >= n) break; out.push(row * g + col); }
    }
    return out;
  }
  async function tapTrail(indices, g) {
    for (const idx of indices) {
      const c = await cc(idx, g); if (!c) continue;
      await page.mouse.move(c.cx, c.cy);
      await page.mouse.down();
      await wait(30);
      await page.mouse.up();
      await wait(60);
    }
  }
  async function settledLabel() {
    return await page.evaluate(() => {
      const e = document.querySelector('div[aria-live="polite"][aria-label]');
      return e ? e.getAttribute('aria-label') : null;
    });
  }
  async function pollSettled(maxMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      const l = await settledLabel();
      if (l) return l;
      await wait(150);
    }
    return null;
  }
  async function bodyHasText(needle) {
    return await page.evaluate((needle) => document.body.textContent.includes(needle), needle);
  }
  async function findButtonByText(needle) {
    return await page.evaluate((needle) => {
      const btns = [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null);
      const b = btns.find(e => e.textContent.trim().toLowerCase().includes(needle.toLowerCase()));
      return b ? { text: b.textContent.trim(), ariaLabel: b.getAttribute('aria-label'), disabled: b.disabled } : null;
    }, needle);
  }
  async function reuseButtonComputedStyle() {
    return await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null);
      const b = btns.find(e => e.textContent.trim().toLowerCase().includes('same trail'));
      if (!b) return null;
      const cs = getComputedStyle(b);
      const r = b.getBoundingClientRect();
      return {
        backgroundImage: cs.backgroundImage,
        backgroundColor: cs.backgroundColor,
        color: cs.color,
        rect: { top: r.top, bottom: r.bottom, left: r.left, right: r.right, w: r.width, h: r.height },
      };
    });
  }
  async function panelVoidMeasure() {
    return await page.evaluate(() => {
      const panel = document.querySelector('div[aria-live="polite"][aria-label]');
      if (!panel) return null;
      const panelRect = panel.getBoundingClientRect();
      const kids = [...panel.children];
      const linksIdx = kids.findIndex(k => /change mode/i.test(k.textContent));
      if (linksIdx < 1) return { panelHeight: panelRect.height, error: 'linksTier not found' };
      const linksRect = kids[linksIdx].getBoundingClientRect();
      const prevRect = kids[linksIdx - 1].getBoundingClientRect();
      const gap = linksRect.top - prevRect.bottom;
      const voidPctOfPanel = (gap / panelRect.height) * 100;
      return {
        panelHeight: panelRect.height,
        prevBottom: prevRect.bottom, linksTop: linksRect.top,
        gapPx: gap, voidPctOfPanel,
        childCount: kids.length,
      };
    });
  }
  async function overflowCheck() {
    return await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    }));
  }
  async function cyanScanDOM() {
    return await page.evaluate(() => {
      function hueOf(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0;
        if (max !== min) {
          const d = max - min;
          if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
          else if (max === g) h = (b - r) / d + 2;
          else h = (r - g) / d + 4;
          h *= 60;
        }
        return h;
      }
      function parseColor(str) {
        const m = str.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
        if (!m) return null;
        return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 };
      }
      const hits = [];
      for (const el of document.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        for (const prop of ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'boxShadow', 'fill', 'stroke']) {
          const val = cs[prop];
          if (!val) continue;
          for (const mm of (val.match(/rgba?\([\d., ]+\)/g) || [])) {
            const c = parseColor(mm);
            if (!c || c.a === 0) continue;
            const h = hueOf(c.r, c.g, c.b);
            const sat = Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
            if (h >= 165 && h <= 205 && sat > 40 && Math.max(c.r, c.g, c.b) > 80) {
              const r = el.getBoundingClientRect();
              hits.push({ tag: el.tagName, cls: (el.className && el.className.toString().slice(0, 40)) || '', prop, val: mm, hue: h.toFixed(0), text: el.textContent.slice(0, 30), rect: { top: r.top, left: r.left, w: r.width, h: r.height } });
            }
          }
        }
      }
      return hits;
    });
  }
  return { clickText, cc, snake, tapTrail, settledLabel, pollSettled, bodyHasText, findButtonByText, reuseButtonComputedStyle, panelVoidMeasure, overflowCheck, cyanScanDOM };
}

async function runTrailAndSettle(page, h) {
  await h.clickText('GO');
  let label = await h.pollSettled(4500);
  if (!label) {
    const deadline = Date.now() + 6000;
    while (Date.now() < deadline) {
      const stopBtn = await h.findButtonByText('STOP');
      if (!stopBtn) break;
      await wait(150);
    }
    await wait(250);
    await h.clickText('take profit');
    label = await h.pollSettled(8000);
  }
  return label;
}

// Retry a manual round until the desired outcome (win/rug) lands.
async function playManualToOutcome(page, h, wantWin, maxAttempts = 8) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // tap a few tiles, then either take-profit (want win) or keep tapping until a rug or 6 taps (want rug, let mine odds do it, else force via many taps)
    if (wantWin) {
      await h.tapTrail([12], 5); // center tile, single tap, then cash out fast
      await wait(400);
      const already = await h.settledLabel();
      if (already) {
        if (/took profit/i.test(already)) return { label: already, attempt };
      } else {
        await h.clickText('take profit');
        const l = await h.pollSettled(6000);
        if (l && /took profit/i.test(l)) return { label: l, attempt };
      }
    } else {
      // tap many tiles rapidly to maximize mine-hit odds
      const order = h.snake(20, 5);
      let hitLabel = null;
      for (const idx of order) {
        const c = await h.cc(idx, 5);
        if (c) { await page.mouse.click(c.cx, c.cy); }
        await wait(180);
        hitLabel = await h.settledLabel();
        if (hitLabel) break;
      }
      if (hitLabel && /rugged/i.test(hitLabel)) return { label: hitLabel, attempt };
    }
    // reset for next attempt if not matched
    if (attempt < maxAttempts) {
      const label = await h.settledLabel();
      if (label) {
        await h.clickText('bet again');
        await wait(700);
      } else {
        // stuck mid-round somehow; reload
        await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
        await wait(1200);
        await h.clickText('ape in');
        await wait(600);
        await h.clickText('send it');
        await wait(900);
      }
    }
  }
  return { label: await h.settledLabel(), attempt: maxAttempts, failed: true };
}

const results = {};

// ===== FULL battery (Part1 shared-component proof + void + reuse + cyan + mobile-agnostic checks) =====
async function testSharedPulse() {
  const { page, consoleErrors } = await newPage();
  const h = helpers(page);
  const lobbyHasPulse = await h.bodyHasText('SESSION PULSE');
  await page.screenshot({ path: `${S}lobby.png` });
  await h.clickText('ape in');
  await wait(700);
  const betEntryHasPulse = await h.bodyHasText('SESSION PULSE');
  await page.screenshot({ path: `${S}bet-entry.png` });
  await h.clickText('send it');
  await wait(900);
  const playingHasPulse = await h.bodyHasText('SESSION PULSE');
  await page.screenshot({ path: `${S}playing.png` });
  await page.close();
  const r = { lobbyHasPulse, betEntryHasPulse, playingHasPulse, pageErrorCount: consoleErrors.filter(e => e.startsWith('pageerror:')).length };
  console.log('[sharedPulse]', JSON.stringify(r));
  results.sharedPulse = r;
}

async function testSettledOutcome(won) {
  const { page, consoleErrors } = await newPage();
  const h = helpers(page);
  await h.clickText('ape in');
  await wait(700);
  await h.clickText('send it');
  await wait(900);
  const r1 = await playManualToOutcome(page, h, won);
  await wait(500);
  const settledHasPulseR1 = await h.bodyHasText('SESSION PULSE');
  const settledHasTrendR1 = await h.bodyHasText('SESSION TREND');
  await page.screenshot({ path: `${S}settled-${won ? 'win' : 'rug'}-r1.png` });
  const voidR1 = await h.panelVoidMeasure();
  // second round for history>=2 so SESSION TREND actually renders
  await h.clickText('bet again');
  await wait(700);
  const r2 = await playManualToOutcome(page, h, won);
  await wait(500);
  const settledHasPulseR2 = await h.bodyHasText('SESSION PULSE');
  const settledHasTrendR2 = await h.bodyHasText('SESSION TREND');
  await page.screenshot({ path: `${S}settled-${won ? 'win' : 'rug'}-r2.png` });
  const voidR2 = await h.panelVoidMeasure();
  const overflow = await h.overflowCheck();
  const cyanHits = await h.cyanScanDOM();
  await page.close();
  const r = {
    outcome: won ? 'win' : 'rug', r1, settledHasPulseR1, settledHasTrendR1, voidR1,
    r2, settledHasPulseR2, settledHasTrendR2, voidR2, overflow, cyanHitCount: cyanHits.length, cyanHits,
    pageErrorCount: consoleErrors.filter(e => e.startsWith('pageerror:')).length,
  };
  console.log(`[settled-${won ? 'win' : 'rug'}]`, JSON.stringify(r, null, 1));
  results[`settled_${won ? 'win' : 'rug'}`] = r;
}

async function testReuseCTA() {
  const { page, consoleErrors } = await newPage();
  const h = helpers(page);
  await h.clickText('ape in');
  await wait(700);
  await h.clickText('send it');
  await wait(900);
  const freshReuseBtn = await h.findButtonByText('same trail'); // should be null - no lastTrail yet
  await h.clickText('TRAIL');
  await wait(300);
  const trail = h.snake(3, 5);
  await h.tapTrail(trail, 5);
  const settledLabel = await runTrailAndSettle(page, h);
  await wait(500);
  const reuseBtn = await h.findButtonByText('same trail');
  const reuseStyle = await h.reuseButtonComputedStyle();
  const primaryBtn = await h.findButtonByText('bet again');
  await page.screenshot({ path: `${S}reuse-cta.png` });
  // mode/gridSize switch invalidation
  await h.clickText('change mode');
  await wait(600);
  await h.clickText('SHITCOIN');
  await wait(300);
  await h.clickText('SEND IT');
  await wait(900);
  await h.tapTrail([0], 7);
  await wait(500);
  await h.clickText('take profit');
  const settledLabel2 = await h.pollSettled(15000);
  await wait(400);
  const reuseBtnAfterModeChange = await h.findButtonByText('same trail');
  await page.screenshot({ path: `${S}reuse-invalidated.png` });
  await page.close();
  const r = {
    freshReuseBtnAbsent: !freshReuseBtn, settledLabel, reuseBtn, reuseStyle, primaryBtn,
    settledLabel2, reuseBtnAfterModeChangeAbsent: !reuseBtnAfterModeChange,
    pageErrorCount: consoleErrors.filter(e => e.startsWith('pageerror:')).length,
  };
  console.log('[reuseCTA]', JSON.stringify(r, null, 1));
  results.reuseCTA = r;
}

// Mobile-focused: reuse CTA + SESSION TREND absence + overflow + cyan, single pass
async function testMobileReuse(won) {
  const { page, consoleErrors } = await newPage();
  const h = helpers(page);
  await h.clickText('ape in');
  await wait(700);
  await h.clickText('send it');
  await wait(900);
  await h.clickText('TRAIL');
  await wait(300);
  await h.tapTrail(h.snake(3, 5), 5);
  const settledLabel = await runTrailAndSettle(page, h);
  await wait(500);
  const reuseBtn = await h.findButtonByText('same trail');
  const trendPresentMobile = await h.bodyHasText('SESSION TREND'); // must be absent (isWide-gated)
  const pulsePresentMobile = await h.bodyHasText('SESSION PULSE'); // must be absent (removed)
  const overflow = await h.overflowCheck();
  const cyanHits = await h.cyanScanDOM();
  await page.screenshot({ path: `${S}settled-mobile-reuse.png` });
  await page.close();
  const r = { settledLabel, reuseBtn, trendPresentMobile, pulsePresentMobile, overflow, cyanHitCount: cyanHits.length, cyanHits, pageErrorCount: consoleErrors.filter(e => e.startsWith('pageerror:')).length };
  console.log('[mobileReuse]', JSON.stringify(r, null, 1));
  results.mobileReuse = r;
}

async function testLightRegression() {
  const { page, consoleErrors } = await newPage();
  const h = helpers(page);
  await h.clickText('ape in');
  await wait(700);
  await h.clickText('send it');
  await wait(900);
  const r1 = await playManualToOutcome(page, h, true);
  await wait(500);
  await page.screenshot({ path: `${S}settled-win.png` });
  const overflow = await h.overflowCheck();
  const cyanHits = await h.cyanScanDOM();
  const reuseBtnAbsentFresh = await h.findButtonByText('same trail'); // no trail played, should be absent
  await page.close();
  const r = { r1, overflow, cyanHitCount: cyanHits.length, cyanHits, reuseBtnAbsentFresh: !reuseBtnAbsentFresh, pageErrorCount: consoleErrors.filter(e => e.startsWith('pageerror:')).length };
  console.log('[lightRegression]', JSON.stringify(r, null, 1));
  results.lightRegression = r;
}

if (MODE === 'full') {
  await testSharedPulse();
  await testSettledOutcome(true);
  await testSettledOutcome(false);
  await testReuseCTA();
} else if (MODE === 'void') {
  await testSettledOutcome(true);
  await testSettledOutcome(false);
  await testReuseCTA();
} else if (MODE === 'mobile') {
  await testMobileReuse(true);
  await testSettledOutcome(false);
} else if (MODE === 'light') {
  await testLightRegression();
}

console.log('=== SUMMARY', TAG, MODE, '===');
console.log(JSON.stringify(results, null, 1));
await browser.close();
console.log('DONE');
