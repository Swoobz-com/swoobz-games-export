// a11ysweep0707-contrast.mjs — RUG OR RICHES full-composed a11y contrast + canvas
// pick-order sweep (2026-07-07). Live pixel measurement only, no source-token diff.
import puppeteer from 'puppeteer-core';
import { PNG } from 'pngjs';
import fs from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5390';
const OUTDIR = 'shots-a11ysweep-2026-07-07';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

function luminance([r, g, b]) {
  const a = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
function ratio(fg, bg) {
  const L1 = luminance(fg) + 0.05, L2 = luminance(bg) + 0.05;
  return L1 > L2 ? L1 / L2 : L2 / L1;
}
function px(png, x, y) {
  const idx = (png.width * Math.min(Math.max(y, 0), png.height - 1) + Math.min(Math.max(x, 0), png.width - 1)) << 2;
  return [png.data[idx], png.data[idx + 1], png.data[idx + 2]];
}
function extremes(png) {
  let minL = Infinity, maxL = -Infinity, minC = null, maxC = null;
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    const c = px(png, x, y); const l = luminance(c);
    if (l < minL) { minL = l; minC = c; }
    if (l > maxL) { maxL = l; maxC = c; }
  }
  return { minC, maxC, minL, maxL };
}
async function shot(page, clip) {
  if (clip.width < 1 || clip.height < 1) return null;
  const buf = await page.screenshot({ clip });
  return PNG.sync.read(Buffer.from(buf));
}
function rectClip(rect, padCss = 0) {
  return { x: Math.max(0, rect.x - padCss), y: Math.max(0, rect.y - padCss), width: Math.max(1, rect.width + padCss * 2), height: Math.max(1, rect.height + padCss * 2) };
}
async function sampleTextVsLocalBg(page, rect, padCss = 2) {
  const png = await shot(page, rectClip(rect, padCss));
  if (!png) return null;
  const { minC, maxC } = extremes(png);
  return { fg: maxC, bg: minC, ratio: +ratio(maxC, minC).toFixed(2) };
}
async function rectOf(page, sel) {
  return page.evaluate((s) => {
    const el = typeof s === 'string' ? document.querySelector(s) : null;
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, width: b.width, height: b.height };
  }, sel);
}
async function rectOfText(page, matchFn) {
  // matchFn is a serialized string function body to find element by text
  return page.evaluate(matchFn);
}
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    const norm = (e) => e.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
    return els.find(e => e.offsetParent !== null && !e.disabled && norm(e) === t.toLowerCase())
      || els.find(e => e.offsetParent !== null && !e.disabled && norm(e).includes(t.toLowerCase()));
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
async function clearAndGoto(page, port) {
  await page.evaluateOnNewDocument(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1200);
}
async function pickWorld(page, slug) {
  await page.evaluate((s) => { const el = document.querySelector(`[data-testid="vault-world-card-${s}"]`); if (el) el.click(); }, slug);
  await wait(300);
}
async function tileCenterAndSize(page, idx, g) {
  return page.evaluate(({ idx, g }) => {
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
    return { cx: r.left + x0 + col * (tile + gap) + tile / 2, cy: r.top + y0 + row * (tile + gap) + tile / 2, tile };
  }, { idx, g });
}
async function clickTile(page, idx, g) {
  const t = await tileCenterAndSize(page, idx, g);
  if (!t) return null;
  await page.mouse.click(t.cx, t.cy);
  return t;
}
function gridSizeFor(world) { return world === 'shitcoin' ? 7 : 5; }

async function isSettled(page) {
  return page.evaluate(() => !!document.querySelector('[data-testid="vault-settledpanel"]'));
}
async function outcomeWon(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-settledpanel"]');
    if (!el) return null;
    const label = el.getAttribute('aria-label') || '';
    return /took profit/i.test(label);
  });
}

// ---- Measurement helpers for specific UI zones ------------------------------

async function measureWorldPickerCards(page) {
  return page.evaluate(() => {
    const out = {};
    for (const slug of ['bluechips', 'altseason', 'shitcoin']) {
      const btn = document.querySelector(`[data-testid="vault-world-card-${slug}"]`);
      if (!btn) { out[slug] = null; continue; }
      const spans = [...btn.querySelectorAll('span')];
      const title = spans.find(s => s.textContent.trim() && !s.getAttribute('aria-hidden') && s.children.length === 0 && /BLUECHIPS|ALTSEASON|SHITCOIN/i.test(s.textContent));
      const r = (el) => el ? (() => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; })() : null;
      out[slug] = { title: r(title), titleText: title ? title.textContent.trim() : null };
    }
    return out;
  });
}

async function measureHudZone(page) {
  return page.evaluate(() => {
    const hud = document.querySelector('[data-testid="DesktopHudRow"]');
    if (!hud) return { present: false };
    const spans = [...hud.querySelectorAll('span')].filter(s => s.children.length === 0 || s.textContent.trim());
    const r = (el) => el ? (() => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; })() : null;
    const byText = (re) => spans.find(s => re.test(s.textContent));
    return {
      present: true,
      rugsFirstTap: r(byText(/RUGS.*FIRST TAP/i)),
      pumpKicker: r(byText(/^PUMP$/i)),
      rugRisk: r(byText(/RUG RISK/i)),
      heroMult: r(document.querySelector('[data-testid="vault-hud-pump-value"]')),
      kickerAny: r(byText(/SECURED THE BAG|RUGGED/i)),
      deltaAny: r(spans.find(s => /^[+-][\d.]/.test(s.textContent.trim()))),
    };
  });
}

async function measureLockedWager(page) {
  const rects = await page.evaluate(() => {
    const container = document.querySelector('[data-testid="vault-ctl-wager-locked"]');
    if (!container) return { present: false };
    const caption = container.querySelector('span');
    const window_ = container.querySelector('div');
    const outerValueSpan = window_ ? [...window_.querySelectorAll('span')].find(s => /\d/.test(s.textContent) && s.querySelector('span')) : null;
    const usdcSpan = outerValueSpan ? outerValueSpan.querySelector('span') : null;
    const r = (el) => el ? (() => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; })() : null;
    let numRect = null;
    if (outerValueSpan) {
      const textNode = [...outerValueSpan.childNodes].find(n => n.nodeType === 3 && n.textContent.trim().length > 0);
      if (textNode) { const range = document.createRange(); range.selectNodeContents(textNode); const rb = range.getBoundingClientRect(); numRect = { x: rb.x, y: rb.y, width: rb.width, height: rb.height }; }
    }
    return { present: true, caption: r(caption), numRect, usdcRect: r(usdcSpan) };
  });
  if (!rects.present) return { error: 'not present' };
  const out = {};
  if (rects.caption) out.caption = await sampleTextVsLocalBg(page, rects.caption, 1);
  if (rects.numRect) out.wagerValue = await sampleTextVsLocalBg(page, rects.numRect, 1);
  if (rects.usdcRect) out.usdcSuffix = await sampleTextVsLocalBg(page, rects.usdcRect, 1);
  return out;
}

async function measureRugsRow(page) {
  const rects = await page.evaluate(() => {
    const spans = [...document.querySelectorAll('span')];
    const rugsLabel = spans.find((s) => s.textContent.trim() === 'RUGS');
    const minusBtn = [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Fewer rugs');
    if (!rugsLabel || !minusBtn) return { present: false };
    const stepWrap = minusBtn.parentElement;
    const stepSpans = [...stepWrap.querySelectorAll('span')];
    const valueSpan = stepSpans.find(s => /^\d+$/.test(s.textContent.trim()));
    const r = (el) => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; };
    return { present: true, label: r(rugsLabel), value: valueSpan ? r(valueSpan) : null };
  });
  if (!rects.present) return { note: 'RUGS row not present' };
  const out = {};
  out.label = await sampleTextVsLocalBg(page, rects.label, 1);
  if (rects.value) out.value = await sampleTextVsLocalBg(page, rects.value, 1);
  return out;
}

async function measureCta(page) {
  const r = await rectOf(page, '[data-testid="vault-ctl-cta"] button');
  if (!r) return { error: 'no cta button' };
  return sampleTextVsLocalBg(page, r, 2);
}

async function measureSessionPulse(page) {
  const r = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-ctl-session"]');
    if (!el) return null;
    const spans = [...el.querySelectorAll('span')];
    const netSpan = spans.find(s => /\+|-/.test(s.textContent) && /round/i.test(s.textContent));
    const b = (e) => { const bb = e.getBoundingClientRect(); return { x: bb.x, y: bb.y, width: bb.width, height: bb.height }; };
    return { any: el ? b(el) : null, net: netSpan ? b(netSpan) : null };
  });
  if (!r) return { error: 'no session card' };
  const out = {};
  if (r.net) out.net = await sampleTextVsLocalBg(page, r.net, 1);
  return out;
}

async function measureRhythmBadge(page) {
  const r = await rectOf(page, '[data-testid="vault-rhythm-badge"]');
  if (!r) return { present: false };
  const s = await sampleTextVsLocalBg(page, r, 2);
  return { present: true, ...s };
}

// Canvas pick-order number: crop the bottom ~30-45% band of a revealed-safe
// tile (where drawCoin fillText renders the reveal number) and take the
// luminance extremes of JUST that band (avoids picking up the top of the
// coin sprite which is a different color region).
async function samplePickOrderNumber(page, tile) {
  const bandH = Math.max(6, tile.tile * 0.22);
  const clip = { x: tile.cx - tile.tile * 0.3, y: tile.cy + tile.tile * 0.16, width: tile.tile * 0.6, height: bandH };
  const png = await shot(page, clip);
  if (!png) return null;
  const { minC, maxC } = extremes(png);
  return { fg: maxC, bg: minC, ratio: +ratio(maxC, minC).toFixed(2), clip };
}

const results = { viewport: {}, notes: [] };

async function runViewport(browser, vw, vh, worlds, doSettled) {
  const page = await browser.newPage();
  await page.setViewport({ width: vw, height: vh, deviceScaleFactor: 3 });
  page.on('pageerror', (e) => results.notes.push(`pageerror@${vw}x${vh}: ${e.message}`));
  const key = `${vw}x${vh}`;
  results.viewport[key] = {};

  for (const world of worlds) {
    const g = gridSizeFor(world);
    const wres = {};
    // ---- BET-ENTRY phase ----
    await clearAndGoto(page, PORT);
    await pickWorld(page, world);
    await wait(300);
    wres.worldPicker = await measureWorldPickerCards(page);
    wres.hudBetEntry = await measureHudZone(page);
    wres.wagerUnlocked = await sampleTextVsLocalBg(page, await rectOf(page, '[data-testid="vault-ctl-wager"]'), 2).catch(() => null);
    wres.rugsRow = await measureRugsRow(page);
    wres.ctaBetEntry = await measureCta(page);
    await page.screenshot({ path: `${OUTDIR}/${key}-${world}-betentry.png` });

    // ---- PLAYING (locked) phase ----
    const sent = await clickText(page, 'send it');
    wres.sendItClicked = sent;
    await wait(700);
    // reveal one tile (safe most likely) to get canCashOut + a pick-order number
    const t0 = await clickTile(page, 0, g);
    await wait(500);
    const settledEarly = await isSettled(page);
    wres.hudPlaying = await measureHudZone(page);
    wres.lockedWager = await measureLockedWager(page);
    if (!settledEarly && t0) {
      wres.pickOrderNumber0 = await samplePickOrderNumber(page, t0);
    }
    wres.ctaPlaying = await measureCta(page);
    await page.screenshot({ path: `${OUTDIR}/${key}-${world}-playing.png` });

    if (doSettled) {
      // ---- SETTLED WIN: cash out now (revealedTiles.length>0 already) ----
      if (!settledEarly) {
        await clickText(page, 'take profit');
        await wait(900);
      }
      const wonNow = await isSettled(page);
      wres.settledWinReached = wonNow;
      if (wonNow) {
        wres.hudSettledWin = await measureHudZone(page);
        wres.rhythmBadgeWin = await measureRhythmBadge(page);
        wres.sessionPulseWin = await measureSessionPulse(page);
        wres.ctaSettledWin = await measureCta(page);
        await page.screenshot({ path: `${OUTDIR}/${key}-${world}-settled-win.png` });
      }

      // ---- SETTLED LOSS: fresh round, tap cells until a mine is hit ----
      await clearAndGoto(page, PORT);
      await pickWorld(page, world);
      await wait(300);
      await clickText(page, 'send it');
      await wait(700);
      let lost = false;
      for (let i = 0; i < g * g && !lost; i++) {
        await clickTile(page, i, g);
        await wait(220);
        if (await isSettled(page)) { const won = await outcomeWon(page); if (won === false) lost = true; else if (won === true) break; }
      }
      wres.settledLossReached = lost;
      if (lost) {
        wres.hudSettledLoss = await measureHudZone(page);
        wres.sessionPulseLoss = await measureSessionPulse(page);
        wres.ctaSettledLoss = await measureCta(page);
        await page.screenshot({ path: `${OUTDIR}/${key}-${world}-settled-loss.png` });
      }
    }

    results.viewport[key][world] = wres;
    console.log(`done ${key} ${world}`);
  }
  await page.close();
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  await runViewport(browser, 1440, 900, ['bluechips', 'altseason', 'shitcoin'], true);
  await runViewport(browser, 1920, 1080, ['bluechips', 'altseason', 'shitcoin'], false);
  fs.writeFileSync(`${OUTDIR}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
