import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = '5285';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = 'shots-fairnessqa-0707';
fs.mkdirSync(OUT, { recursive: true });

async function clickText(page, t, within) {
  const h = await page.evaluateHandle(
    ({ t, within }) => {
      const root = within ? document.querySelector(within) : document;
      if (!root) return null;
      const els = [...root.querySelectorAll('button,[role=button]')];
      const lc = t.toLowerCase();
      return (
        els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === lc) ||
        els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(lc)) ||
        null
      );
    },
    { t, within },
  );
  const el = h.asElement();
  if (!el) return false;
  try {
    await el.click();
  } catch (e) {
    return false;
  }
  return true;
}

async function box(page) {
  return page.evaluate(() => {
    const c = document.querySelector('[data-testid="vault-grid-canvas"], canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
}

async function status(page) {
  return page.evaluate(() => {
    const t = document.body.innerText;
    return {
      settled: !!document.querySelector('[data-testid="vault-settledpanel"]'),
      rugged: /RUGGED|GOT SBF|BUST/i.test(t),
      won: /SECURED THE BAG|TOOK PROFIT/i.test(t),
    };
  });
}

// Extract the settled outcome facts from whichever receipt DOM is present
// (desktop ReceiptRowStacked = full plain text; mobile Row = truncated
// display + full value in the title attr). Reads BOTH kinds generically by
// preferring title attr (always full) over textContent.
async function extractReceipt(page) {
  return page.evaluate(() => {
    const dls = [...document.querySelectorAll('dl')];
    const rows = {};
    for (const dl of dls) {
      const dts = [...dl.querySelectorAll('dt')];
      const dds = [...dl.querySelectorAll('dd')];
      for (let i = 0; i < dts.length; i++) {
        const label = dts[i]?.textContent?.trim();
        const dd = dds[i];
        if (!label || !dd) continue;
        const full = dd.getAttribute('title') || dd.textContent || '';
        rows[label] = full;
      }
    }
    const verifiedChipText = document.body.innerText.match(/✓\s*verified/i)?.[0] || null;
    const mismatchText = document.body.innerText.match(/⚠\s*mismatch[^\n]*/i)?.[0] || null;
    const pointsMatch = document.body.innerText.match(/[\d,]+\s*(SWOOBZ)?\s*ownership points[^\n]*/i)?.[0] || null;
    const ampMatch = document.body.innerText.match(/1\.5\s*[×x][^\n]{0,40}/i)?.[0] || null;
    const oneXMatch = document.body.innerText.match(/1\.0\s*[×x][^\n]{0,40}/i)?.[0] || null;
    return { rows, verifiedChipText, mismatchText, pointsMatch, ampMatch, oneXMatch };
  });
}

async function selectMode(page, modeName) {
  return clickText(page, modeName);
}

async function placeBet(page) {
  let ok = await clickText(page, 'send it', '[data-testid="vault-betentry-confirm"]');
  if (!ok) ok = await clickText(page, 'send it');
  return ok;
}

async function driveRound(browser, { viewport, tag, mode, wantLoss }) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(700);
  await clickText(page, 'got it');
  await clickText(page, 'skip');
  await wait(150);

  // RTP disclosure probe on bet-entry world-picker card face, BEFORE bet.
  const worldCardText = await page.evaluate((m) => {
    const btn = document.querySelector(`[data-testid="vault-world-card-${m}"]`);
    return btn ? btn.innerText.replace(/\s+/g, ' ').trim() : null;
  }, mode);

  await selectMode(page, mode.toUpperCase());
  await wait(300);
  const worldCardTextAfterSelect = await page.evaluate((m) => {
    const btn = document.querySelector(`[data-testid="vault-world-card-${m}"]`);
    return btn ? btn.innerText.replace(/\s+/g, ' ').trim() : null;
  }, mode);

  const placed = await placeBet(page);
  await wait(700);
  const bx = await box(page);
  if (!bx) {
    await page.screenshot({ path: `${OUT}/${tag}-NOBOX.png` });
    await page.close();
    return { tag, error: 'no board box found', placed };
  }

  // Click a scan of interior points across the board. For wantLoss we click
  // MANY points (high probability of hitting a rug); for a clean win-tag we
  // click just ONE-TWO tiles then cash out.
  const fracs = wantLoss
    ? [
        [0.12, 0.12], [0.3, 0.12], [0.5, 0.12], [0.7, 0.12], [0.88, 0.12],
        [0.12, 0.3], [0.3, 0.3], [0.5, 0.3], [0.7, 0.3], [0.88, 0.3],
        [0.12, 0.5], [0.3, 0.5], [0.7, 0.5], [0.88, 0.5],
        [0.12, 0.7], [0.3, 0.7], [0.5, 0.7], [0.7, 0.7], [0.88, 0.7],
        [0.12, 0.88], [0.3, 0.88], [0.5, 0.88], [0.7, 0.88], [0.88, 0.88],
      ]
    : [[0.42, 0.42], [0.6, 0.5]];

  let st = { settled: false, rugged: false, won: false };
  for (const [fx, fy] of fracs) {
    st = await status(page);
    if (st.settled) break;
    await page.mouse.click(bx.x + bx.w * fx, bx.y + bx.h * fy);
    await wait(wantLoss ? 260 : 500);
  }
  st = await status(page);
  if (!st.settled && !wantLoss) {
    await clickText(page, 'take profit');
    await wait(1200);
    st = await status(page);
  }

  await page.screenshot({ path: `${OUT}/${tag}-1-settled-raw.png`, fullPage: true });

  // Glass Box auto-verify probe: chip should be present WITHOUT any click.
  const autoVerify = await page.evaluate(() => {
    const t = document.body.innerText;
    return {
      hasVerifiedChip: /✓\s*verified/i.test(t),
      hasVerifyingText: /verifying…/i.test(t),
      hasMismatch: /⚠\s*mismatch/i.test(t),
      hasViewReceiptToggle: /view receipt/i.test(t),
    };
  });

  // Click "view receipt" toggle -- must expand INLINE, no modal.
  const preModalCount = await page.evaluate(() => document.querySelectorAll('[role="dialog"],.modal,[data-modal]').length);
  const toggled = await clickText(page, 'view receipt');
  await wait(300);
  const postModalCount = await page.evaluate(() => document.querySelectorAll('[role="dialog"],.modal,[data-modal]').length);
  await page.screenshot({ path: `${OUT}/${tag}-2-receipt-expanded.png`, fullPage: true });

  const receipt = await extractReceipt(page);

  // Toggle closed check (hide receipt ↑ present + works)
  const hideToggleText = await page.evaluate(() => document.body.innerText.match(/hide receipt[^\n]*/i)?.[0] || null);

  await page.close();
  return {
    tag,
    mode,
    viewport,
    placed,
    outcome: st,
    worldCardText,
    worldCardTextAfterSelect,
    autoVerify,
    modalDeltaOnToggle: postModalCount - preModalCount,
    toggled,
    hideToggleText,
    receipt,
  };
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: false,
    args: ['--autoplay-policy=no-user-gesture-required', '--window-size=1600,1200'],
  });

  const results = [];

  // 1) DESKTOP WIN, BLUECHIPS (5x5)
  results.push(
    await driveRound(browser, {
      viewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
      tag: 'desktop-bluechips-win',
      mode: 'bluechips',
      wantLoss: false,
    }),
  );

  // 2) MOBILE LOSS, SHITCOIN (7x7)
  results.push(
    await driveRound(browser, {
      viewport: { width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
      tag: 'mobile-shitcoin-loss',
      mode: 'shitcoin',
      wantLoss: true,
    }),
  );

  // 3) DESKTOP LOSS, ALTSEASON (5x5) -- second data point for determinism/format check
  results.push(
    await driveRound(browser, {
      viewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
      tag: 'desktop-altseason-loss',
      mode: 'altseason',
      wantLoss: true,
    }),
  );

  // 4) MOBILE WIN, BLUECHIPS (5x5) -- ownership points 1.0x check on mobile
  results.push(
    await driveRound(browser, {
      viewport: { width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
      tag: 'mobile-bluechips-win',
      mode: 'bluechips',
      wantLoss: false,
    }),
  );

  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, (k, v) => (typeof v === 'bigint' ? v.toString() : v), 2));
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
