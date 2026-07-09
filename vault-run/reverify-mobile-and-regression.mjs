import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 5501;
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
async function isSettledMobile(page) {
  return await page.evaluate(() => !!document.querySelector('[data-testid="vault-settledpanel"]'));
}
async function takeProfitIfEnabled(page) {
  return await page.evaluate(() => {
    const btn = [...document.querySelectorAll('[data-testid="vault-playing-actions"] button')].find((b) =>
      b.textContent.toLowerCase().includes('take profit'),
    );
    if (btn && !btn.disabled) { btn.click(); return true; }
    return false;
  });
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });

  // ── MOBILE 390x844 settled receipt ──
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in');
  await wait(600);
  await clickText(page, 'SEND IT');
  await wait(700);
  const spots = [];
  for (let gx = 1; gx <= 9; gx++) for (let gy = 1; gy <= 9; gy++) spots.push([gx / 10, gy / 10]);
  let safeReveals = 0;
  for (const [fx, fy] of spots) {
    if (await isSettledMobile(page)) break;
    await clickCanvasFraction(page, fx, fy);
    await wait(280);
    if (await isSettledMobile(page)) break;
    safeReveals += 1;
    if (safeReveals >= 2 && (await takeProfitIfEnabled(page))) { await wait(900); break; }
  }
  await wait(1200);
  await clickText(page, 'view receipt');
  await wait(400);
  const mobileInfo = await page.evaluate(() => {
    const dls = [...document.querySelectorAll('dl')];
    const receiptDl = dls.find((d) => d.querySelector('dt') && d.querySelector('dt').textContent.includes('round id'));
    if (!receiptDl) return { FAIL: 'no mobile receipt dl found' };
    const cs = getComputedStyle(receiptDl);
    const dds = [...receiptDl.querySelectorAll('dd')];
    const rows = dds.map((dd) => {
      const r = dd.getBoundingClientRect();
      const ddCs = getComputedStyle(dd);
      return { widthPx: r.width, overflow: ddCs.overflow, textOverflow: ddCs.textOverflow };
    });
    // aria-live announcer check on mobile too (Settlement()'s own panel-level one)
    const live = [...document.querySelectorAll('[aria-live]')].map((e) => ({ text: e.textContent.trim(), ariaLive: e.getAttribute('aria-live') }));
    return {
      gridTemplateColumns: cs.gridTemplateColumns,
      isTwoColumnAuto1fr: cs.gridTemplateColumns.trim().split(/\s+/).length === 2,
      rows,
      liveRegions: live.filter(l => l.text.length > 0),
    };
  });
  console.log('MOBILE_SETTLED_RECEIPT', JSON.stringify(mobileInfo, null, 2));
  await page.screenshot({ path: 'reverify-mobile-390x844.png', fullPage: true });
  await page.close();

  // ── QUICK STEADY-STATE CONTRAST/FOCUS SWEEP on desktop settled screen ──
  const page2 = await browser.newPage();
  await page2.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page2.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page2, 'ape in');
  await wait(600);
  await clickText(page2, 'SEND IT');
  await wait(700);
  let settled = false;
  for (const [fx, fy] of spots) {
    settled = await page2.evaluate(() => !!document.querySelector('[data-testid="vault-settled-left"]'));
    if (settled) break;
    await clickCanvasFraction(page2, fx, fy);
    await wait(280);
  }
  await wait(2500); // let the ~2s hero-overlay wash (known, pre-existing) finish -> steady state
  // Expand receipt via keyboard again to include it in the contrast/focus sweep
  const focusResults = await page2.evaluate(() => {
    function luminance([r, g, b]) {
      const a = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    }
    function parseColor(str) {
      const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])] : null;
    }
    function contrastRatio(fg, bg) {
      const L1 = luminance(fg) + 0.05, L2 = luminance(bg) + 0.05;
      return L1 > L2 ? L1 / L2 : L2 / L1;
    }
    // sample the receipt toggle chip text vs its background, and dt labels vs card bg
    const toggle = document.querySelector('.vault-receipt-toggle');
    const results = {};
    if (toggle) {
      const cs = getComputedStyle(toggle);
      results.toggleColor = cs.color;
      results.toggleBg = cs.backgroundColor;
      const fg = parseColor(cs.color);
      let bgEl = toggle, bg = null;
      while (bgEl && !bg) {
        const bcs = getComputedStyle(bgEl);
        const c = parseColor(bcs.backgroundColor);
        if (c) bg = c;
        bgEl = bgEl.parentElement;
      }
      results.toggleContrast = fg && bg ? contrastRatio(fg, bg) : null;
    }
    const dt = document.querySelector('[data-testid="vault-settled-receipt-gutter"] dt');
    if (dt) {
      const cs = getComputedStyle(dt);
      const fg = parseColor(cs.color);
      let bgEl = dt, bg = null;
      while (bgEl && !bg) {
        const bcs = getComputedStyle(bgEl);
        const c = parseColor(bcs.backgroundColor);
        if (c) bg = c;
        bgEl = bgEl.parentElement;
      }
      results.dtColor = cs.color;
      results.dtContrast = fg && bg ? contrastRatio(fg, bg) : null;
    }
    return results;
  });
  console.log('CONTRAST_SWEEP', JSON.stringify(focusResults, null, 2));

  // Focus indicator check: tab to toggle, screenshot before/after
  await page2.evaluate(() => document.body.focus());
  for (let i = 0; i < 5; i++) await page2.keyboard.press('Tab');
  const focusInfo = await page2.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { tag: el.tagName, cls: el.className, outline: cs.outline, outlineOffset: cs.outlineOffset, boxShadow: cs.boxShadow };
  });
  console.log('FOCUS_INFO_AFTER_5_TABS', JSON.stringify(focusInfo, null, 2));
  await page2.screenshot({ path: 'reverify-focus-1440x900.png', fullPage: true });
  await page2.close();

  await browser.close();
})();
