// INDEPENDENT rg-c5-compliance-qa verification for the ROUND 4/4 gutter
// migration (Lobby/Playing/Settled bottom-bar -> gutter cards). Fresh driver,
// own port, own math, own screenshots.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5190';
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
function worstContrastForGradient(backgroundImage, colorStr) {
  const bgMatch = backgroundImage.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/g);
  const textRgb = parseRgb(colorStr);
  if (!bgMatch || !textRgb) return null;
  const stops = bgMatch.map((s) => parseRgb(s));
  const ratios = stops.map((s) => contrastRatio(s, textRgb));
  return { ratios, worst: Math.min(...ratios) };
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

async function buttonStyleByTestId(page, testid, textIncludes) {
  return await page.evaluate(({ testid, textIncludes }) => {
    const card = document.querySelector(`[data-testid="${testid}"]`);
    if (!card) return null;
    const btns = [...card.querySelectorAll('button')];
    const btn = textIncludes
      ? btns.find((b) => b.textContent.toLowerCase().includes(textIncludes.toLowerCase()))
      : btns[0];
    if (!btn) return null;
    const cs = getComputedStyle(btn);
    const cardCs = getComputedStyle(card);
    const cardRect = card.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    return {
      text: btn.textContent.trim(),
      disabled: btn.disabled,
      opacity: cs.opacity,
      backgroundImage: cs.backgroundImage,
      backgroundColor: cs.backgroundColor,
      color: cs.color,
      cursor: cs.cursor,
      minWidth: cs.minWidth,
      width: cs.width,
      cardWidth: cardRect.width,
      btnWidth: btnRect.width,
      overflowsCard: btnRect.width > cardRect.width + 0.5,
      cardBackdropFilter: cardCs.backdropFilter,
      cardOpacity: cardCs.opacity,
    };
  }, { testid, textIncludes });
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  fs.mkdirSync('shots', { recursive: true });
  const R = {};
  const consoleErrors = [];

  // ============ DESKTOP 1440x900 ============
  {
    const page = await browser.newPage();
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await wait(500);

    // ---- LOBBY: bottom panel empty, APE IN gutter card reachable ----
    R.lobby_panel = await page.evaluate(() => {
      const panel = document.querySelector('[aria-live="polite"]');
      return panel ? { childElementCount: panel.childElementCount, innerHTMLLength: panel.innerHTML.length } : { found: false };
    });
    R.lobby_gutterTestids = await page.evaluate(() => ({
      left: !!document.querySelector('[data-testid="vault-lobby-left"]'),
      hero: !!document.querySelector('[data-testid="vault-lobby-hero"]'),
      right: !!document.querySelector('[data-testid="vault-lobby-right"]'),
      apein: !!document.querySelector('[data-testid="vault-lobby-apein"]'),
    }));
    R.apein_style = await buttonStyleByTestId(page, 'vault-lobby-apein', 'ape in');
    await page.screenshot({ path: 'shots/r4-lobby-1440-full.png' });
    await page.screenshot({
      path: 'shots/r4-lobby-1440-apein-card.png',
      clip: await page.evaluate(() => {
        const el = document.querySelector('[data-testid="vault-lobby-apein"]');
        const r = el.getBoundingClientRect();
        return { x: Math.max(0, r.left - 20), y: Math.max(0, r.top - 20), width: r.width + 40, height: r.height + 40 };
      }),
    });

    // FUNCTIONAL: APE IN -> opens bet-entry
    const apeinClicked = await clickText(page, 'ape in', '[data-testid="vault-lobby-apein"]');
    await wait(500);
    R.apein_click_fired = apeinClicked;
    R.afterApein_betentryVisible = await page.evaluate(() =>
      !!document.querySelector('[data-testid="vault-betentry-confirm"]') ||
      document.body.textContent.includes('SEND IT'));

    // Pick BLUECHIPS (5x5, 3 mines) for favorable reveal odds, keep default wager.
    await clickText(page, 'bluechips', '[data-testid="vault-betentry-world"]');
    await wait(200);
    const sendItClicked = await clickText(page, 'SEND IT', '[data-testid="vault-betentry-confirm"]');
    await wait(700);
    R.sendIt_click_fired = sendItClicked;

    // ---- PLAYING (before any reveal): TAKE PROFIT must be RENDERED but DISABLED ----
    R.playing_panel_beforeReveal = await page.evaluate(() => {
      const panel = document.querySelector('[aria-live="polite"]');
      return panel ? { childElementCount: panel.childElementCount } : { found: false };
    });
    R.playing_gutterTestids = await page.evaluate(() => ({
      left: !!document.querySelector('[data-testid="vault-playing-left"]'),
      status: !!document.querySelector('[data-testid="vault-playing-status"]'),
      right: !!document.querySelector('[data-testid="vault-playing-right"]'),
      actions: !!document.querySelector('[data-testid="vault-playing-actions"]'),
    }));
    R.takeProfit_style_disabled = await buttonStyleByTestId(page, 'vault-playing-actions', 'take profit');
    await page.screenshot({
      path: 'shots/r4-playing-1440-actions-disabled.png',
      clip: await page.evaluate(() => {
        const el = document.querySelector('[data-testid="vault-playing-actions"]');
        const r = el.getBoundingClientRect();
        return { x: Math.max(0, r.left - 20), y: Math.max(0, r.top - 20), width: r.width + 40, height: r.height + 40 };
      }),
    });

    // Reveal ONE safe tile (retry across a few center cells; 5x5, 3 mines => ~88% safe/tile)
    let revealed = false;
    for (let i = 0; i < 15 && !revealed; i++) {
      const { cx, cy } = await cellCenter(page, i, 5);
      await page.mouse.click(cx, cy);
      await wait(400);
      const canCashOutNow = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="vault-playing-actions"]');
        if (!el) return false;
        const btns = [...el.querySelectorAll('button')];
        const b = btns.find((x) => x.textContent.toLowerCase().includes('take profit'));
        return b ? !b.disabled : false;
      });
      const stillPlaying = await page.evaluate(() => document.body.textContent.includes('PUMPING') || document.body.textContent.includes('TRAIL') || document.body.textContent.includes('RUNNING'));
      if (canCashOutNow) { revealed = true; break; }
      if (!stillPlaying) break; // hit a mine, round ended before we got a safe reveal
    }
    R.gotSafeReveal = revealed;

    if (revealed) {
      R.takeProfit_style_enabled = await buttonStyleByTestId(page, 'vault-playing-actions', 'take profit');
      await page.screenshot({
        path: 'shots/r4-playing-1440-actions-enabled.png',
        clip: await page.evaluate(() => {
          const el = document.querySelector('[data-testid="vault-playing-actions"]');
          const r = el.getBoundingClientRect();
          return { x: Math.max(0, r.left - 20), y: Math.max(0, r.top - 20), width: r.width + 40, height: r.height + 40 };
        }),
      });

      // FUNCTIONAL: TAKE PROFIT -> settles
      const cashoutClicked = await clickText(page, 'take profit', '[data-testid="vault-playing-actions"]');
      await wait(700);
      R.cashout_click_fired = cashoutClicked;
      R.afterCashout_settledVisible = await page.evaluate(() =>
        !!document.querySelector('[data-testid="vault-settled-betagain"]') ||
        document.body.textContent.toLowerCase().includes('bet again'));

      // ---- SETTLED: bottom panel empty, BET AGAIN reachable + functional ----
      R.settled_panel = await page.evaluate(() => {
        const panel = document.querySelector('[aria-live="polite"]');
        return panel ? { childElementCount: panel.childElementCount } : { found: false };
      });
      R.settled_gutterTestids = await page.evaluate(() => ({
        left: !!document.querySelector('[data-testid="vault-settled-left"]'),
        result: !!document.querySelector('[data-testid="vault-settled-result"]'),
        meta: !!document.querySelector('[data-testid="vault-settled-meta"]'),
        rightNew: !!document.querySelector('[data-testid="vault-settled-right-new"]'),
        nextbet: !!document.querySelector('[data-testid="vault-settled-nextbet"]'),
        betagain: !!document.querySelector('[data-testid="vault-settled-betagain"]'),
      }));
      R.betAgain_style = await buttonStyleByTestId(page, 'vault-settled-betagain', 'bet again');
      R.settled_resultText = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="vault-settled-result"]');
        return el ? el.textContent : null;
      });
      await page.screenshot({ path: 'shots/r4-settled-1440-full.png' });
      await page.screenshot({
        path: 'shots/r4-settled-1440-betagain-card.png',
        clip: await page.evaluate(() => {
          const el = document.querySelector('[data-testid="vault-settled-betagain"]');
          const r = el.getBoundingClientRect();
          return { x: Math.max(0, r.left - 20), y: Math.max(0, r.top - 20), width: r.width + 40, height: r.height + 40 };
        }),
      });

      // FUNCTIONAL: BET AGAIN -> next round (places bet, goes to playing)
      const betAgainClicked = await clickText(page, 'bet again', '[data-testid="vault-settled-betagain"]');
      await wait(700);
      R.betAgain_click_fired = betAgainClicked;
      R.afterBetAgain_phase = await page.evaluate(() => {
        const txt = document.body.textContent;
        return {
          isPlaying: txt.includes('PUMPING') || txt.includes('crack a compartment') || !!document.querySelector('[data-testid="vault-playing-actions"]'),
          isSettled: !!document.querySelector('[data-testid="vault-settled-betagain"]'),
        };
      });
    }

    // Copy scan — problem-gambling vocabulary check across all 3 new components' testids
    R.copyScan = await page.evaluate(() => {
      const ids = ['vault-lobby-hero', 'vault-lobby-apein', 'vault-playing-status', 'vault-playing-actions', 'vault-settled-result', 'vault-settled-meta', 'vault-settled-betagain'];
      const out = {};
      for (const id of ids) {
        const el = document.querySelector(`[data-testid="${id}"]`);
        out[id] = el ? el.textContent : null;
      }
      return out;
    });

    // Safety surface / session info still visible on lobby+playing+settled
    R.balanceVisible_afterAll = await page.evaluate(() => document.body.textContent.includes('BALANCE'));

    await page.close();
  }

  // ============ MOBILE 390x844 — must be fully UNCHANGED ============
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await wait(500);
    R.mobile_lobby_gutterDom = await page.evaluate(() => ({
      lobbyLeft: document.querySelectorAll('[data-testid="vault-lobby-left"]').length,
      lobbyRight: document.querySelectorAll('[data-testid="vault-lobby-right"]').length,
    }));
    R.mobile_lobby_hasApeIn = await page.evaluate(() => document.body.textContent.toLowerCase().includes('ape in'));
    await clickText(page, 'ape in');
    await wait(500);
    await clickText(page, 'bluechips', '[data-testid="vault-betentry-world"]');
    await wait(200);
    await clickText(page, 'SEND IT');
    await wait(700);
    R.mobile_playing_gutterDom = await page.evaluate(() => ({
      playingLeft: document.querySelectorAll('[data-testid="vault-playing-left"]').length,
      playingRight: document.querySelectorAll('[data-testid="vault-playing-right"]').length,
    }));
    R.mobile_playing_hasTakeProfit = await page.evaluate(() => document.body.toLowerCase ? false : document.body.textContent.toLowerCase().includes('take profit'));
    await page.screenshot({ path: 'shots/r4-mobile-390-playing.png', fullPage: false });
    await page.close();
  }

  R.consoleErrors = consoleErrors;

  // Contrast computation
  function addContrast(key, style) {
    if (style && style.backgroundImage && style.backgroundImage !== 'none') {
      R[key] = worstContrastForGradient(style.backgroundImage, style.color);
    } else if (style) {
      const bg = parseRgb(style.backgroundColor);
      const fg = parseRgb(style.color);
      if (bg && fg) R[key] = { ratios: [contrastRatio(bg, fg)], worst: contrastRatio(bg, fg) };
    }
  }
  addContrast('contrast_apein', R.apein_style);
  addContrast('contrast_takeProfit_disabled', R.takeProfit_style_disabled);
  addContrast('contrast_takeProfit_enabled', R.takeProfit_style_enabled);
  addContrast('contrast_betAgain', R.betAgain_style);

  await browser.close();
  fs.writeFileSync('rgqa-indep-gutterround4-final-results.json', JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();
