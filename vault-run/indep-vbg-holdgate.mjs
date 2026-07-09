// INDEPENDENT visual-regression holdgate driver for RUG OR RICHES / vault VBG.
// Written fresh for this holdgate — does NOT reuse the maker's vbg-verify.mjs
// measurement/report logic (generic DOM-interaction idioms like clickText/
// cellCenter are unavoidably similar since they're just how you click a canvas
// tile or a text button, but every MEASUREMENT here is independently authored
// and independently interpreted).
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5181';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '390x844', width: 390, height: 844 },
  { name: '1608x872-ref', width: 1608, height: 872 },
];

function findButton(page, matcher) {
  return page.evaluateHandle((m) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    const visible = els.filter((e) => e.offsetParent !== null);
    return (
      visible.find((e) => e.textContent.trim().toLowerCase() === m.toLowerCase()) ||
      visible.find((e) => e.textContent.toLowerCase().includes(m.toLowerCase()))
    );
  }, matcher);
}

async function clickButtonText(page, matcher) {
  const h = await findButton(page, matcher);
  const el = h.asElement();
  if (!el) return false;
  // NOTE: a naive boundingBox()+mouse.click() silently misses buttons that
  // are below-the-fold at page-load scroll (e.g. SEND IT / ape in on some
  // viewports — this IS the Finding #3 below-fold condition itself) because
  // the coordinate is outside the current viewport. puppeteer's ElementHandle
  // .click() auto-scrolls the element into view first, then clicks — use it.
  await el.click();
  return true;
}

async function resetScroll(page) {
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function tileCenter(page, idx, g) {
  return page.evaluate(
    ({ idx, g }) => {
      const c = document.querySelector('canvas');
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
    },
    { idx, g }
  );
}

async function bodyHas(page, str) {
  return page.evaluate((s) => document.body.textContent.toLowerCase().includes(s.toLowerCase()), str);
}

// --- Independent overflow probe: scrollWidth vs clientWidth PLUS a full DOM
// walk for any element whose right edge exceeds the viewport width (catches
// overflow hidden by overflow:hidden on an ancestor, which scrollWidth alone
// can miss in some cases).
async function overflowProbe(page, viewportWidth) {
  return page.evaluate((vw) => {
    const html = document.documentElement;
    const scrollWidth = html.scrollWidth;
    const clientWidth = html.clientWidth;
    const offenders = [];
    const all = document.querySelectorAll('body *');
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 || r.left < -1) {
        if (r.width > 0 && r.height > 0) {
          offenders.push({
            tag: el.tagName,
            cls: (el.className || '').toString().slice(0, 80),
            testid: el.getAttribute && el.getAttribute('data-testid'),
            left: Math.round(r.left),
            right: Math.round(r.right),
            width: Math.round(r.width),
          });
        }
      }
    }
    // sort worst-offender first
    offenders.sort((a, b) => b.right - a.right);
    return { scrollWidth, clientWidth, hasScrollbar: scrollWidth > clientWidth, offenders: offenders.slice(0, 8) };
  }, viewportWidth);
}

async function cyanProbe(page) {
  return page.evaluate(() => {
    const bad = [];
    const cyanRe = /#00b8c4|#00d0de|rgb\(0,\s*184,\s*196\)|rgb\(0,\s*208,\s*222\)|cyan/i;
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      for (const prop of ['color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor']) {
        const v = cs[prop];
        if (v && cyanRe.test(v)) bad.push({ tag: el.tagName, prop, v, cls: (el.className || '').toString().slice(0, 60) });
      }
    }
    return bad.slice(0, 20);
  });
}

async function divProbe(page, barSelector) {
  return page.evaluate((sel) => {
    const bar = document.querySelector(sel);
    if (!bar) return null;
    const rowKids = [...bar.children].filter((k) => getComputedStyle(k).display !== 'none');
    return rowKids.map((k, i) => {
      const r = k.getBoundingClientRect();
      const cs = getComputedStyle(k);
      return {
        idx: i,
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        height: Math.round(r.height),
        width: Math.round(r.width),
        borderRightWidth: cs.borderRightWidth,
        borderRightColor: cs.borderRightColor,
        paddingRight: cs.paddingRight,
        justifyContent: cs.justifyContent,
      };
    });
  }, barSelector);
}

async function surfaceProbe(page, sel) {
  return page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      backgroundImage: cs.backgroundImage,
      borderTopColor: cs.borderTopColor,
      borderTopWidth: cs.borderTopWidth,
      borderRadius: cs.borderRadius,
      backdropFilter: cs.backdropFilter || cs.webkitBackdropFilter,
    };
  }, sel);
}

async function toWinProbe(page) {
  return page.evaluate(() => {
    const label = [...document.querySelectorAll('span')].find((s) => /^to win$/i.test(s.textContent || ''));
    if (!label) return null;
    const pill = label.closest('div');
    const col = pill.parentElement;
    const pr = pill.getBoundingClientRect();
    const cr = col.getBoundingClientRect();
    return {
      pillLeft: Math.round(pr.left),
      pillRight: Math.round(pr.right),
      pillWidth: Math.round(pr.width),
      colLeft: Math.round(cr.left),
      colRight: Math.round(cr.right),
      colWidth: Math.round(cr.width),
      stretched: pr.width >= cr.width - 2,
      contentSized: pr.width < cr.width - 20,
      alignSelf: getComputedStyle(pill).alignSelf,
    };
  });
}

async function sendItFoldProbe(page, vh) {
  return page.evaluate((vh) => {
    const btn = [...document.querySelectorAll('button')].find((b) => /send it/i.test(b.textContent || ''));
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    return { bottom: Math.round(r.bottom), viewportHeight: vh, aboveFold: r.bottom <= vh, overBy: Math.max(0, Math.round(r.bottom - vh)) };
  }, vh);
}

async function runPhaseSuite(page, vp) {
  const isWide = vp.width >= 960;
  const out = { vp: vp.name, isWide };

  // ---- LOBBY ----
  out.lobby = {};
  out.lobby.overflow = await overflowProbe(page, vp.width);
  out.lobby.cyan = await cyanProbe(page);
  if (isWide) {
    out.lobby.dividers = await divProbe(page, '[data-testid="vault-controlcard"]');
    out.lobby.surface = await surfaceProbe(page, '[data-testid="vault-controlcard"]');
  }
  await page.screenshot({ path: `shots/indep-vbg-${vp.name}-1-lobby.png` });

  // ---- BET-ENTRY ----
  const clickedApeIn = await clickButtonText(page, 'ape in');
  await wait(600);
  await resetScroll(page);
  out.betentry = { navClicked: clickedApeIn };
  out.betentry.overflow = await overflowProbe(page, vp.width);
  out.betentry.cyan = await cyanProbe(page);
  out.betentry.sendItFold = await sendItFoldProbe(page, vp.height);
  if (isWide) {
    out.betentry.dividers = await divProbe(page, '[data-testid="bet-console"] > div:nth-child(2)');
    out.betentry.toWin = await toWinProbe(page);
  } else {
    out.betentry.mobileSingleStack = await page.evaluate(() => {
      const panel = document.querySelector('[data-testid="bet-console"]');
      return panel ? { childCount: panel.children.length, hasYourBet: /your bet/i.test(panel.textContent || '') } : null;
    });
  }
  await page.screenshot({ path: `shots/indep-vbg-${vp.name}-2-betentry.png` });

  // ---- PLAYING (active, ~50%) ----
  const clickedSendIt = await clickButtonText(page, 'send it');
  await wait(900);
  await resetScroll(page);
  out.playing = { navClicked: clickedSendIt };
  out.playing.overflow = await overflowProbe(page, vp.width);
  out.playing.cyan = await cyanProbe(page);
  if (isWide) {
    out.playing.dividers = await divProbe(page, '.vault-actionbar');
  }
  // reveal a couple of safe-looking tiles to get to ~mid-round before capture
  await page.screenshot({ path: `shots/indep-vbg-${vp.name}-3-playing.png` });

  // ---- SETTLED: drive to WIN via take-profit after some safe reveals ----
  // Click a handful of tiles; if a mine is hit (settled/loss) we still capture
  // that as our LOSS sample; if we survive, hit "take profit" -> WIN sample.
  return out;
}

async function driveToSettled(page, gridSize, wantWin) {
  // Try up to 10 tiles; bail to take-profit once 3+ safe reveals in (for WIN),
  // or just keep clicking until a mine is hit (for LOSS attempt).
  const idxs = [12, 6, 18, 2, 22, 8, 16, 4, 20, 10, 14, 0, 24];
  let settled = false;
  let revealed = 0;
  for (let i = 0; i < idxs.length && !settled; i++) {
    await page.evaluate(() => window.scrollTo(0, 0));
    const { cx, cy } = await tileCenter(page, idxs[i], gridSize);
    await page.mouse.click(cx, cy);
    await wait(500);
    settled = await bodyHas(page, 'bet again');
    if (!settled) revealed++;
    if (!settled && wantWin && revealed >= 3) {
      const clicked = await clickButtonText(page, 'take profit');
      if (clicked) {
        await wait(900);
        settled = await bodyHas(page, 'bet again');
      }
    }
  }
  if (!settled) {
    await clickButtonText(page, 'take profit');
    await wait(900);
    settled = await bodyHas(page, 'bet again');
  }
  return settled;
}

async function isWinNow(page) {
  return page.evaluate(() => {
    const t = document.body.textContent || '';
    return /settled\s*·\s*win/i.test(t) || /took profit/i.test(t.toLowerCase());
  });
}

// Force a RUG/LOSS sample: "bet again" (places the same wager and returns
// straight to `playing`, per controller.placeBet()), then click EVERY tile in
// the 5x5 grid in sequence WITHOUT ever taking profit — with 3 mines among 25
// tiles this deterministically lands on a mine before all 25 clicks are
// exhausted (crypto RNG, no seed pinning — genuine round, not scripted).
async function driveToLossViaBetAgain(page, gridSize) {
  const clicked = await clickButtonText(page, 'bet again');
  if (!clicked) return false;
  await wait(700);
  await resetScroll(page);
  let settled = false;
  const total = gridSize * gridSize;
  for (let idx = 0; idx < total && !settled; idx++) {
    await page.evaluate(() => window.scrollTo(0, 0));
    const { cx, cy } = await tileCenter(page, idx, gridSize);
    await page.mouse.click(cx, cy);
    await wait(350);
    settled = await bodyHas(page, 'bet again');
  }
  return settled;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const allResults = [];
  const pageErrors = {};

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(800);

    const res = await runPhaseSuite(page, vp);

    // ---- Settlement: attempt WIN first ----
    const wonAttempt = await driveToSettled(page, 5, true);
    res.settled_attempt1 = {};
    if (wonAttempt) {
      await resetScroll(page);
      res.settled_attempt1.outcome = (await isWinNow(page)) ? 'WIN' : 'LOSS';
      res.settled_attempt1.overflow = await overflowProbe(page, vp.width);
      res.settled_attempt1.cyan = await cyanProbe(page);
      if (vp.width >= 960) {
        res.settled_attempt1.dividers = await divProbe(page, '[data-testid="vault-settledpanel"]');
        res.settled_attempt1.surface = await surfaceProbe(page, '[data-testid="vault-settledpanel"]');
      }
      await page.screenshot({ path: `shots/indep-vbg-${vp.name}-4-settled-${res.settled_attempt1.outcome}.png` });

      // Glass Box open
      const opened = await clickButtonText(page, 'view receipt');
      await wait(500);
      await resetScroll(page);
      res.settled_attempt1.glassBoxOpened = opened;
      if (opened) {
        res.settled_attempt1.glassBoxOverflow = await overflowProbe(page, vp.width);
        await page.screenshot({ path: `shots/indep-vbg-${vp.name}-5-settled-glassbox-open.png` });
      }
    } else {
      res.settled_attempt1.outcome = 'UNSETTLED_AFTER_RETRIES';
    }

    // ---- Round 2: force the OPPOSITE outcome sample on desktop widths
    // (task item 5 asks for a genuine WIN *and* a genuine RUG at 1440/1920).
    if (vp.width >= 1440 && res.settled_attempt1.outcome !== 'UNSETTLED_AFTER_RETRIES') {
      const wantLossNext = res.settled_attempt1.outcome === 'WIN';
      let settled2 = false;
      if (wantLossNext) {
        settled2 = await driveToLossViaBetAgain(page, 5);
      } else {
        // attempt1 was already a LOSS; get a WIN sample via bet-again + a
        // few safe reveals + take profit.
        const clicked = await clickButtonText(page, 'bet again');
        await wait(700);
        await resetScroll(page);
        if (clicked) settled2 = await driveToSettled(page, 5, true);
      }
      res.settled_attempt2 = {};
      if (settled2) {
        await resetScroll(page);
        res.settled_attempt2.outcome = (await isWinNow(page)) ? 'WIN' : 'LOSS';
        res.settled_attempt2.overflow = await overflowProbe(page, vp.width);
        res.settled_attempt2.cyan = await cyanProbe(page);
        await page.screenshot({ path: `shots/indep-vbg-${vp.name}-4b-settled2-${res.settled_attempt2.outcome}.png` });
      } else {
        res.settled_attempt2.outcome = 'UNSETTLED_AFTER_RETRIES';
      }
    }

    res.pageErrors = errs.slice(0, 10);
    allResults.push(res);
    await page.close();
  }

  await browser.close();
  fs.mkdirSync('shots', { recursive: true });
  fs.writeFileSync('indep-vbg-holdgate-results.json', JSON.stringify(allResults, null, 2));
  console.log(JSON.stringify(allResults, null, 2));
})();
