import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5181';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const VIEWPORTS = [
  { name: 'D1440', width: 1440, height: 900 },
  { name: 'D1920', width: 1920, height: 1080 },
  { name: 'M390', width: 390, height: 844 },
];

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return (
      els.find((e) => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}

async function cellCenter(page, idx, g) {
  return await page.evaluate(
    ({ idx, g }) => {
      const c = document.querySelector('canvas');
      const r = c.getBoundingClientRect();
      const W = r.width,
        H = r.height;
      const tR = H * 0.15,
        bR = H * 0.18,
        sF = 0.08;
      const sW = W * (1 - sF * 2);
      const sH = (H - tR - bR) * 0.96;
      const av = Math.min(sW, sH);
      const gap = Math.max(6, av * 0.026);
      const tile = (av - gap * (g - 1)) / g;
      const full = tile * g + gap * (g - 1);
      const x0 = (W - full) / 2;
      const by = tR + (H - tR - bR) / 2;
      const y0 = by - full / 2;
      const col = idx % g,
        row = Math.floor(idx / g);
      return { cx: r.left + x0 + col * (tile + gap) + tile / 2, cy: r.top + y0 + row * (tile + gap) + tile / 2 };
    },
    { idx, g }
  );
}

async function settledNow(page) {
  return await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'));
}

async function isWin(page) {
  return await page.evaluate(() => {
    const t = document.body.textContent;
    return /SETTLED\s*·\s*WIN/i.test(t) || (t.toLowerCase().includes('bet again') && !t.toUpperCase().includes('SETTLED · LOSS'));
  });
}

async function overflow(page) {
  return await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
}

async function divProbe(page, sel1, sel2, sel3) {
  return await page.evaluate(
    ({ sel1, sel2, sel3 }) => {
      const grab = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          top: Math.round(r.top),
          bottom: Math.round(r.bottom),
          height: Math.round(r.height),
          left: Math.round(r.left),
          right: Math.round(r.right),
          borderRightWidth: cs.borderRightWidth,
          borderRightColor: cs.borderRightColor,
          borderLeftWidth: cs.borderLeftWidth,
          paddingRight: cs.paddingRight,
        };
      };
      return { col1: grab(sel1), col2: grab(sel2), col3: grab(sel3) };
    },
    { sel1, sel2, sel3 }
  );
}

async function cyanProbe(page) {
  return await page.evaluate(() => {
    const bad = [];
    const all = document.querySelectorAll('body *');
    const cyanRe = /#00b8c4|#00d0de|rgb\(0,\s*184,\s*196\)|rgb\(0,\s*208,\s*222\)/i;
    for (const el of all) {
      const cs = getComputedStyle(el);
      for (const prop of ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderLeftColor', 'borderRightColor', 'borderBottomColor']) {
        const v = cs[prop];
        if (v && cyanRe.test(v)) bad.push({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 60), prop, v });
      }
    }
    return bad.slice(0, 20);
  });
}

async function runViewport(browser, vp) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(700);

  const out = { vp: vp.name };
  const isWide = vp.width >= 960;

  // ---- LOBBY ----
  out.lobbyOverflow = await overflow(page);
  out.lobbyCyan = await cyanProbe(page);
  if (isWide) {
    out.lobbyDividers = await page.evaluate(() => {
      const bar = document.querySelector('[data-testid="vault-controlcard"]');
      if (!bar) return null;
      const kids = [...bar.children].filter((k) => getComputedStyle(k).display !== 'none');
      return kids.map((k) => {
        const r = k.getBoundingClientRect();
        const cs = getComputedStyle(k);
        return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height), borderRightWidth: cs.borderRightWidth, borderRightColor: cs.borderRightColor };
      });
    });
  }
  out.lobbySurface = await page.evaluate(() => {
    const bar = document.querySelector('[data-testid="vault-controlcard"]');
    if (!bar) return null;
    const cs = getComputedStyle(bar);
    return { background: cs.backgroundImage, borderTopColor: cs.borderTopColor, borderRadius: cs.borderRadius, backdropFilter: cs.backdropFilter };
  });
  await page.screenshot({ path: `shots/vbgV-${PORT}-${vp.name}-lobby.png`, fullPage: false });

  // ---- BET-ENTRY ----
  await clickText(page, 'ape in');
  await wait(500);
  out.betentryOverflow = await overflow(page);
  const foldCheck = await page.evaluate((vh) => {
    const panel = document.querySelector('[data-testid="bet-console"]');
    if (!panel) return null;
    const r = panel.getBoundingClientRect();
    const btn = [...document.querySelectorAll('button')].find((b) => /send it/i.test(b.textContent || ''));
    const toWin = [...document.querySelectorAll('span')].find((s) => /^to win$/i.test(s.textContent || ''));
    const btnR = btn ? btn.getBoundingClientRect() : null;
    const toWinR = toWin ? toWin.closest('div').getBoundingClientRect() : null;
    return {
      panelBottom: Math.round(r.bottom),
      viewportHeight: vh,
      sendItBottom: btnR ? Math.round(btnR.bottom) : null,
      sendItAboveFold: btnR ? btnR.bottom <= vh : null,
      toWinBottom: toWinR ? Math.round(toWinR.bottom) : null,
      toWinAboveFold: toWinR ? toWinR.bottom <= vh : null,
    };
  }, vp.height);
  out.betentryFold = foldCheck;

  // BetEntry columns: measure columnWager (col1) vs columnSlot (col2, last, no border)
  if (isWide) {
    out.betentryColumns = await page.evaluate(() => {
      const row = document.querySelector('[data-testid="bet-console"] > div:nth-child(2)'); // columnsRow (after header)
      if (!row) return null;
      const kids = [...row.children];
      const grab = (el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          top: Math.round(r.top),
          bottom: Math.round(r.bottom),
          height: Math.round(r.height),
          width: Math.round(r.width),
          borderRightWidth: cs.borderRightWidth,
        };
      };
      return kids.map(grab);
    });
    // TO WIN pill content-sized check
    out.toWinPill = await page.evaluate(() => {
      const toWinLabel = [...document.querySelectorAll('span')].find((s) => /^to win$/i.test(s.textContent || ''));
      if (!toWinLabel) return null;
      const pill = toWinLabel.closest('div');
      const col = pill ? pill.parentElement : null; // columnSlot
      const pillR = pill.getBoundingClientRect();
      const colR = col ? col.getBoundingClientRect() : null;
      return {
        pillWidth: Math.round(pillR.width),
        columnWidth: colR ? Math.round(colR.width) : null,
        stretched: colR ? pillR.width >= colR.width - 2 : null,
      };
    });
  }
  if (!isWide) {
    // Mobile-untouched check: BetConsole must render the single-stack path
    // (no `columnsRow`, `columns=false`) — confirm no columned children.
    out.mobileBetConsoleSingleStack = await page.evaluate(() => {
      const panel = document.querySelector('[data-testid="bet-console"]');
      if (!panel) return null;
      // In the columns=false path there is no element with 3+ flex columns
      // sibling structure carrying a divider — heuristic: no descendant with
      // display:flex + borderRight matching the VBG divider AND flex-basis
      // pattern used only by columnWager/columnSlot.
      const hasColumnsRow = !!panel.querySelector('div'); // always true, so check text instead
      const hasWagerLabel = /your bet/i.test(panel.textContent || '');
      return { hasWagerLabel, childCount: panel.children.length };
    });
  }
  await page.screenshot({ path: `shots/vbgV-${PORT}-${vp.name}-betentry.png`, fullPage: false });

  // ---- PLAYING ----
  await clickText(page, 'send it');
  await wait(800);
  out.playingOverflow = await overflow(page);
  await page.screenshot({ path: `shots/vbgV-${PORT}-${vp.name}-playing.png`, fullPage: false });

  // Divider measurements across the 3 bottom-bar rows (Lobby/Playing/Settled) —
  // grab via the actionBar's direct children this time (isWide only)
  if (isWide) {
    out.playingDividers = await page.evaluate(() => {
      const bar = document.querySelector('.vault-actionbar');
      if (!bar) return null;
      const kids = [...bar.children].filter((k) => getComputedStyle(k).display !== 'none');
      return kids.map((k) => {
        const r = k.getBoundingClientRect();
        const cs = getComputedStyle(k);
        return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height), borderRightWidth: cs.borderRightWidth, borderRightColor: cs.borderRightColor };
      });
    });
  }

  // ---- SETTLED (retry until we see a WIN this loop, else accept whatever) ----
  let done = false;
  for (let k = 0; k < 8 && !done; k++) {
    const idx = [1, 6, 11, 17, 22, 3, 8, 14][k] || 2;
    const { cx, cy } = await cellCenter(page, idx, 5);
    await page.mouse.click(cx, cy);
    await wait(450);
    done = await settledNow(page);
  }
  if (!done) {
    await clickText(page, 'take profit');
    await wait(800);
    done = await settledNow(page);
  }
  await wait(500);
  out.settledOverflow = await overflow(page);
  out.settledOutcome = (await isWin(page)) ? 'WIN' : 'LOSS';
  if (isWide) {
    out.settledDividers = await page.evaluate(() => {
      const bar = document.querySelector('[data-testid="vault-settledpanel"]');
      if (!bar) return null;
      const kids = [...bar.children].filter((k) => getComputedStyle(k).display !== 'none');
      return kids.map((k) => {
        const r = k.getBoundingClientRect();
        const cs = getComputedStyle(k);
        return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height), borderRightWidth: cs.borderRightWidth, borderRightColor: cs.borderRightColor };
      });
    });
    out.settledSurface = await page.evaluate(() => {
      const bar = document.querySelector('[data-testid="vault-settledpanel"]');
      if (!bar) return null;
      const cs = getComputedStyle(bar);
      return { background: cs.backgroundImage, borderTopColor: cs.borderTopColor, borderRadius: cs.borderRadius };
    });
  }
  await page.screenshot({ path: `shots/vbgV-${PORT}-${vp.name}-settled-${out.settledOutcome}.png`, fullPage: false });

  await page.close();
  return out;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const results = [];
  for (const vp of VIEWPORTS) {
    results.push(await runViewport(browser, vp));
  }
  await browser.close();
  fs.mkdirSync('shots', { recursive: true });
  fs.writeFileSync(`vbg-verify-${PORT}.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})();
