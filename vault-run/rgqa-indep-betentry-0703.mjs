// INDEPENDENT rg-c5-compliance-qa verification for the BETENTRY GUTTER REWORK.
// Fresh driver, NOT the maker's own betentry-gutter-verify.mjs — own math, own
// selectors, own port (5199), own screenshots actually viewed.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5199';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function luminance(r, g, b) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
function contrastRatio(rgb1, rgb2) {
  const L1 = luminance(...rgb1);
  const L2 = luminance(...rgb2);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}
function parseRgb(str) {
  const m = str.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
  return m ? [+m[1], +m[2], +m[3]] : null;
}

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

async function cellCenter(page, idx, gridSize) {
  return await page.evaluate(({ idx, gridSize }) => {
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    const W = r.width, H = r.height;
    const topReserved = H * 0.15, bottomReserved = H * 0.18, sideFrac = 0.08;
    const safeW = W * (1 - sideFrac * 2);
    const safeH = (H - topReserved - bottomReserved) * 0.96;
    const available = Math.min(safeW, safeH);
    const gap = Math.max(6, available * 0.026);
    const tile = (available - gap * (gridSize - 1)) / gridSize;
    const full = tile * gridSize + gap * (gridSize - 1);
    const x0 = (W - full) / 2;
    const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2;
    const y0 = bandCenterY - full / 2;
    const col = idx % gridSize, row = Math.floor(idx / gridSize);
    const cx = r.left + x0 + col * (tile + gap) + tile / 2;
    const cy = r.top + y0 + row * (tile + gap) + tile / 2;
    return { cx, cy };
  }, { idx, gridSize });
}

async function sendItStyle(page) {
  return await page.evaluate(() => {
    const card = document.querySelector('[data-testid="vault-betentry-confirm"]');
    if (!card) return null;
    const btn = [...card.querySelectorAll('button')][0];
    if (!btn) return null;
    const cs = getComputedStyle(btn);
    const cardCs = getComputedStyle(card);
    return {
      text: btn.textContent.trim(),
      disabled: btn.disabled,
      opacity: cs.opacity,
      backgroundImage: cs.backgroundImage,
      backgroundColor: cs.backgroundColor,
      color: cs.color,
      cursor: cs.cursor,
      cardBackdropFilter: cardCs.backdropFilter,
      cardBackgroundImage: cardCs.backgroundImage,
    };
  });
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  fs.mkdirSync('shots', { recursive: true });
  const R = {};

  // ============ DESKTOP 1440x900 — reachability + functional + legibility ============
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await wait(500);
    await clickText(page, 'ape in');
    await wait(600);

    // bottom panel must be genuinely EMPTY on desktop bet-entry
    R.panel_1440 = await page.evaluate(() => {
      const panel = document.querySelector('[aria-live="polite"]');
      return panel ? { childElementCount: panel.childElementCount, innerHTMLLength: panel.innerHTML.length } : { found: false };
    });
    R.hasSetYourPlay_1440 = await page.evaluate(() => document.body.textContent.includes('SET YOUR PLAY'));

    // relocated cards present
    R.testids_1440 = await page.evaluate(() => ({
      yourbet: !!document.querySelector('[data-testid="vault-betentry-yourbet"]'),
      confirm: !!document.querySelector('[data-testid="vault-betentry-confirm"]'),
      world: !!document.querySelector('[data-testid="vault-betentry-world"]'),
    }));

    // ENABLED-state legibility + computed style BEFORE clicking anything
    R.sendIt_enabled_1440 = await sendItStyle(page);

    await page.screenshot({ path: 'shots/rgqa-1440-full.png' });
    await page.screenshot({
      path: 'shots/rgqa-1440-confirm-card.png',
      clip: await page.evaluate(() => {
        const el = document.querySelector('[data-testid="vault-betentry-confirm"]');
        const r = el.getBoundingClientRect();
        return { x: Math.max(0, r.left - 20), y: Math.max(0, r.top - 20), width: r.width + 40, height: r.height + 40 };
      }),
    });

    // Select SHITCOIN (7x7, 24 mines) for a fast forced-rug attempt, and
    // clamp wager to full balance via repeated '+' clicks so a single loss
    // depletes the balance to 0 -> naturally reaches the 'insufficient'
    // disabled state without touching React internals.
    await clickText(page, 'shitcoin', '[data-testid="vault-betentry-world"]');
    await wait(300);
    for (let i = 0; i < 400; i++) {
      const clicked = await clickText(page, '+', '[data-testid="vault-betentry-yourbet"]');
      if (!clicked) break;
    }
    await wait(300);
    R.wagerVsBalance_afterMaxClicks = await page.evaluate(() => {
      const bet = document.querySelector('[data-testid="vault-betentry-yourbet"]');
      const confirm = document.querySelector('[data-testid="vault-betentry-confirm"]');
      return { yourBetText: bet ? bet.textContent : null, confirmText: confirm ? confirm.textContent : null };
    });

    // FUNCTIONAL: click SEND IT -> placeBet fires -> phase advances
    const clickedSendIt = await clickText(page, 'SEND IT', '[data-testid="vault-betentry-confirm"]');
    await wait(700);
    R.sendIt_click_fired = clickedSendIt;
    R.afterSendIt_worldCardGone = await page.evaluate(() => !document.querySelector('[data-testid="vault-betentry-world"]'));
    R.afterSendIt_phaseText = await page.evaluate(() => document.body.textContent.includes('PUMPING'));

    // Try to force a RUG quickly (7x7=49 tiles, 24 mines, ~49% per-tile odds)
    let settled = false;
    for (let i = 0; i < 30 && !settled; i++) {
      const { cx, cy } = await cellCenter(page, i, 7);
      await page.mouse.click(cx, cy);
      await wait(350);
      const txt = await page.evaluate(() => document.body.textContent);
      if (/RUG(GED)?|BUST|SETTLED|BET AGAIN/i.test(txt) && !txt.includes('PUMPING')) {
        settled = true;
        R.settleOutcomeGuess = /RUG|BUST/i.test(txt) ? 'rug' : 'unknown';
      }
      if (/CASH ?OUT|TAKE PROFIT/i.test(txt) === false && i > 25) break;
    }
    R.roundSettledWithinTries = settled;
    await page.screenshot({ path: 'shots/rgqa-1440-after-round.png' });

    if (settled) {
      // back to bet-entry
      await clickText(page, 'ape in');
      await wait(600);
      R.balance_afterRound = await page.evaluate(() => document.body.textContent.match(/BALANCE ·\s*([\d.,]+)/)?.[1]);
      R.sendIt_disabled_state = await sendItStyle(page);
    }

    R.cyan_1440 = await page.evaluate(() => {
      const all = [...document.querySelectorAll('body *')];
      let n = 0;
      for (const el of all) {
        const cs = getComputedStyle(el);
        for (const p of [cs.color, cs.backgroundColor, cs.borderColor]) {
          const m = p.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
          if (m) {
            const r = +m[1], g = +m[2], b = +m[3];
            if (r < 90 && g > 150 && b > 150 && Math.abs(g - b) < 60) n++;
          }
        }
      }
      return n;
    });

    await page.close();
  }

  // ============ DESKTOP 1920x1080 ============
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await wait(500);
    await clickText(page, 'ape in');
    await wait(600);
    R.testids_1920 = await page.evaluate(() => ({
      yourbet: !!document.querySelector('[data-testid="vault-betentry-yourbet"]'),
      confirm: !!document.querySelector('[data-testid="vault-betentry-confirm"]'),
      world: !!document.querySelector('[data-testid="vault-betentry-world"]'),
    }));
    R.sendIt_enabled_1920 = await sendItStyle(page);
    await page.screenshot({ path: 'shots/rgqa-1920-full.png' });
    await page.close();
  }

  // ============ MOBILE 390x844 — must be fully UNCHANGED ============
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await wait(500);
    await clickText(page, 'ape in');
    await wait(600);
    R.mobile_hasSetYourPlay = await page.evaluate(() => document.body.textContent.includes('SET YOUR PLAY'));
    R.mobile_gutterDom = await page.evaluate(() => ({
      yourbet: document.querySelectorAll('[data-testid="vault-betentry-yourbet"]').length,
      confirm: document.querySelectorAll('[data-testid="vault-betentry-confirm"]').length,
      world: document.querySelectorAll('[data-testid="vault-betentry-world"]').length,
    }));
    // mobile SEND IT functional check
    R.mobile_sendIt_present = await page.evaluate(() => {
      const els = [...document.querySelectorAll('button')];
      const b = els.find((e) => e.textContent.toUpperCase().includes('SEND IT'));
      return b ? { text: b.textContent.trim(), disabled: b.disabled } : null;
    });
    await page.screenshot({ path: 'shots/rgqa-390-full.png', fullPage: true });
    await page.close();
  }

  // ============ Safety surface / copy checks ============
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await wait(500);
    R.sessionMeta_visible_lobby = await page.evaluate(() => document.body.textContent.includes('BALANCE'));
    await clickText(page, 'ape in');
    await wait(600);
    R.sessionMeta_visible_betentry = await page.evaluate(() => document.body.textContent.includes('BALANCE'));
    await page.close();
  }

  // Contrast computation for SEND IT enabled state (opaque green gradient vs dark ink text)
  if (R.sendIt_enabled_1440) {
    const bgMatch = R.sendIt_enabled_1440.backgroundImage.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/g);
    const textRgb = parseRgb(R.sendIt_enabled_1440.color);
    if (bgMatch && textRgb) {
      const stops = bgMatch.map((s) => parseRgb(s));
      R.contrast_ratios_perStop = stops.map((s) => contrastRatio(s, textRgb));
      R.contrast_worst_stop = Math.min(...R.contrast_ratios_perStop);
    }
  }

  await browser.close();
  fs.writeFileSync('rgqa-indep-betentry-0703-results.json', JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();
