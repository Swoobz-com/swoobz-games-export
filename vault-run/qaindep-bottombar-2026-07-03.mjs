import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.argv[2] || '5181';
const S = 'shots/qaindep0703-';

const VIEWPORTS = [
  { W: 1440, H: 900, tag: 'D1440' },
  { W: 1920, H: 1080, tag: 'D1920' },
  { W: 390, H: 844, tag: 'M390' },
];

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return els.find(e => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase())
      || els.find(e => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, t);
  const el = h.asElement();
  if (!el) { console.log('NO BTN:', t); return false; }
  await el.click();
  return true;
}

async function cellCenter(page, idx, g) {
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

async function settledLabel(page) {
  return await page.evaluate(() => {
    const el = document.querySelector('div[aria-live="polite"][aria-label]');
    return el ? el.getAttribute('aria-label') : null;
  });
}

async function measureBar(page) {
  // Generic "the bar" measurement — the outer bare aria-live wrapper's
  // first (and only) element child is whichever phase component (Lobby /
  // BetEntry / Playing / Settled) is currently mounted. Matches
  // measure-bars.mjs's disambiguation pattern (bare aria-live, not the
  // Settled-specific aria-live+aria-label root).
  return await page.evaluate(() => {
    const wrap = document.querySelector('[aria-live="polite"]:not([aria-label])');
    const child = wrap ? wrap.firstElementChild : null;
    const r = child ? child.getBoundingClientRect() : null;
    const cols = child ? [...child.children].map(c => {
      const cr = c.getBoundingClientRect();
      return { left: Math.round(cr.left), right: Math.round(cr.right), top: Math.round(cr.top), bottom: Math.round(cr.bottom), width: Math.round(cr.width) };
    }) : [];
    return {
      top: r ? Math.round(r.top) : null,
      bottom: r ? Math.round(r.bottom) : null,
      height: r ? Math.round(r.height) : null,
      colCount: cols.length,
      cols,
    };
  });
}

async function measureVoid(page) {
  // Symmetric-void proxy (per memory: page.height unreliable w/ minHeight:100dvh).
  // First real DOM child = header tape; last = the below-cabinet gameFooter strip.
  return await page.evaluate(() => {
    const pageRoot = document.body.firstElementChild; // pageStyle div
    if (!pageRoot) return null;
    const kids = [...pageRoot.children].filter(k => k.tagName !== 'STYLE');
    const first = kids[0];
    const last = kids[kids.length - 1];
    const firstR = first.getBoundingClientRect();
    const lastR = last.getBoundingClientRect();
    return {
      viewportH: window.innerHeight,
      headerTop: Math.round(firstR.top),
      footerBottom: Math.round(lastR.bottom),
      voidTotal: Math.round(window.innerHeight - (lastR.bottom - firstR.top)),
      firstTag: first.tagName, firstCls: (first.className || '').toString().slice(0, 30),
      lastTag: last.tagName, lastCls: (last.className || '').toString().slice(0, 30),
    };
  });
}

async function cyanProbeDOM(page) {
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
      for (const prop of ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderLeftColor', 'boxShadow', 'fill', 'stroke']) {
        const val = cs[prop];
        if (!val) continue;
        const matches = val.match(/rgba?\([\d., ]+\)/g) || [];
        for (const mm of matches) {
          const c = parseColor(mm);
          if (!c || c.a === 0) continue;
          const h = hueOf(c.r, c.g, c.b);
          const sat = Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
          if (h >= 165 && h <= 205 && sat > 40 && Math.max(c.r, c.g, c.b) > 80) {
            hits.push({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 40), prop, val: mm, hue: h.toFixed(0), text: el.textContent.slice(0, 30) });
          }
        }
      }
    }
    return hits;
  });
}

async function forceWin(page, gridSize = 5) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const clickedApe = await clickText(page, 'ape in');
    if (!clickedApe) await clickText(page, 'bet again');
    await wait(700);
    await clickText(page, 'send it');
    await wait(900);
    // reveal ~4 tiles (moderate mid-round build, low bust risk) then take profit
    let bustedMidway = false;
    for (const idx of [1, 6, 11, 17]) {
      const c = await cellCenter(page, idx, gridSize);
      if (!c) break;
      await page.mouse.click(c.cx, c.cy);
      await wait(450);
      const lbl = await settledLabel(page);
      if (lbl) { bustedMidway = /rugged/i.test(lbl); break; }
    }
    if (bustedMidway) continue; // retry a fresh round
    let lbl = await settledLabel(page);
    if (!lbl) {
      await clickText(page, 'take profit');
      await wait(900);
      lbl = await settledLabel(page);
    }
    if (lbl && /took profit/i.test(lbl)) return { ok: true, attempt, label: lbl };
    if (lbl && /rugged/i.test(lbl)) continue;
  }
  return { ok: false };
}

async function forceRug(page, gridSize = 5) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const clickedApe = await clickText(page, 'ape in');
    if (!clickedApe) await clickText(page, 'bet again');
    await wait(700);
    await clickText(page, 'send it');
    await wait(900);
    let lbl = null;
    for (let k = 0; k < gridSize * gridSize && !lbl; k++) {
      const c = await cellCenter(page, k, gridSize);
      if (!c) break;
      await page.mouse.click(c.cx, c.cy);
      await wait(180);
      lbl = await settledLabel(page);
    }
    if (!lbl) { await clickText(page, 'take profit'); await wait(700); lbl = await settledLabel(page); }
    if (lbl && /rugged/i.test(lbl)) return { ok: true, attempt, label: lbl };
  }
  return { ok: false };
}

async function runViewport({ W, H, tag }) {
  const browser = await puppeteer.launch({
    executablePath: EXE,
    headless: false,
    defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
    args: [`--window-size=${W + 20},${H + 140}`, '--autoplay-policy=no-user-gesture-required'],
  });
  const page = (await browser.pages())[0];
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1400);

  const out = { tag, W, H };

  // ── 1. LOBBY ──
  out.lobbyVoid = await measureVoid(page);
  out.lobbyBar = await measureBar(page);
  await page.screenshot({ path: S + `${tag}-01-lobby.png` });

  // ── 2. BET-ENTRY ──
  await clickText(page, 'ape in');
  await wait(800);
  out.betentryBar = await measureBar(page);
  await page.screenshot({ path: S + `${tag}-02-betentry.png` });
  await page.screenshot({ path: S + `${tag}-02-betentry-full.png`, fullPage: true });

  // ── 3. PLAYING (mid-round, ~4 tiles revealed, low-bust-risk sequence) ──
  await clickText(page, 'send it');
  await wait(900);
  let midRoundOk = false;
  for (const idx of [1, 6]) {
    const c = await cellCenter(page, idx, 5);
    if (!c) break;
    await page.mouse.click(c.cx, c.cy);
    await wait(450);
    const lbl = await settledLabel(page);
    if (lbl) { midRoundOk = false; break; }
    midRoundOk = true;
  }
  out.playingVoid = await measureVoid(page);
  out.playingBar = await measureBar(page);
  out.playingMidRoundReached = midRoundOk;
  await page.screenshot({ path: S + `${tag}-03-playing.png` });

  // finish this round via take profit so state is clean for the next phase
  const preFinishLbl = await settledLabel(page);
  if (!preFinishLbl) { await clickText(page, 'take profit'); await wait(900); }

  // ── 4a. SETTLED — WIN ──
  const win = await forceWin(page);
  out.settledWinResult = win;
  await wait(500);
  out.settledWinVoid = await measureVoid(page);
  out.settledWinBar = await measureBar(page);
  await page.screenshot({ path: S + `${tag}-04a-settled-win.png` });

  // ── 4b. SETTLED — RUG ──
  const rug = await forceRug(page);
  out.settledRugResult = rug;
  await wait(500);
  out.settledRugVoid = await measureVoid(page);
  out.settledRugBar = await measureBar(page);
  await page.screenshot({ path: S + `${tag}-04b-settled-rug.png` });

  // ── cyan probe (DOM computed-style scan) — run on the settled-rug screen (richest DOM) ──
  out.cyanHits = await cyanProbeDOM(page);

  await browser.close();
  return out;
}

const results = [];
for (const vp of VIEWPORTS) {
  console.log('=== running', vp.tag, '===');
  const r = await runViewport(vp);
  console.log(JSON.stringify(r, null, 1));
  results.push(r);
}

const fs = await import('node:fs');
fs.writeFileSync('qaindep0703-results.json', JSON.stringify(results, null, 2));
console.log('ALL DONE');
