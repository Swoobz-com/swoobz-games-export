// jesse-gridfresh-0705.mjs — FRESH-PLAYER comprehension read of the new CSS-grid layout.
// Uninformed player: only reasons from the screen. Captures each phase + hard-probes
// suspect #1 (duplicate bet display) and suspect #2 (primary CTA below the fold).
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5402';
const OUT = process.argv[3] || 'shots-jesse-gridfresh-0705';
const VW = parseInt(process.argv[4] || '1440', 10);
const VH = parseInt(process.argv[5] || '900', 10);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return (
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
async function isSettled(page) {
  return page.evaluate(() =>
    !!document.querySelector('[data-testid="vault-settled-banner"]') ||
    !!document.querySelector('[data-testid="vault-settledpanel"]'));
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

// Find the primary/advance CTA by its label text and measure fold-visibility.
async function ctaProbe(page, labels) {
  return page.evaluate((labels) => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const btns = [...document.querySelectorAll('button,[role=button]')];
    const matches = [];
    for (const b of btns) {
      const txt = (b.textContent || '').trim();
      const low = txt.toLowerCase();
      if (!labels.some((l) => low.includes(l))) continue;
      const r = b.getBoundingClientRect();
      const visible = b.offsetParent !== null;
      // does any scroll container clip it? check if fully within viewport & not clipped by an overflow ancestor
      let clippedByAncestor = false;
      let el = b.parentElement;
      while (el) {
        const cs = getComputedStyle(el);
        if (/(auto|scroll|hidden)/.test(cs.overflowY)) {
          const ar = el.getBoundingClientRect();
          if (r.top < ar.top - 1 || r.bottom > ar.bottom + 1) clippedByAncestor = true;
        }
        el = el.parentElement;
      }
      matches.push({
        text: txt.slice(0, 40), visible,
        top: Math.round(r.top), bottom: Math.round(r.bottom),
        left: Math.round(r.left), right: Math.round(r.right),
        w: Math.round(r.width), h: Math.round(r.height),
        inViewportV: r.top >= 0 && r.bottom <= vh,
        belowFold: r.top > vh,
        partlyBelowFold: r.bottom > vh && r.top < vh,
        clippedByAncestor,
      });
    }
    return { vw, vh, matches };
  }, labels);
}

// Enumerate the control-column panels top-to-bottom with their rendered text.
async function columnFlow(page) {
  return page.evaluate(() => {
    const col = document.querySelector('[data-testid="vault-control-column"]');
    const info = { colFound: !!col };
    if (col) {
      const cr = col.getBoundingClientRect();
      const cs = getComputedStyle(col);
      info.colRect = { top: Math.round(cr.top), bottom: Math.round(cr.bottom), w: Math.round(cr.width), h: Math.round(cr.height) };
      info.overflowY = cs.overflowY;
      info.scrollH = col.scrollHeight;
      info.clientH = col.clientHeight;
      info.scrolls = col.scrollHeight > col.clientHeight + 1;
    }
    const panelIds = ['vault-ctl-wager', 'vault-ctl-mode', 'vault-ctl-cta', 'vault-ctl-takeprofit', 'vault-ctl-session', 'vault-ctl-receipt'];
    info.panels = panelIds.map((id) => {
      const el = document.querySelector(`[data-testid="${id}"]`);
      if (!el) return { id, present: false };
      const r = el.getBoundingClientRect();
      return { id, present: true, top: Math.round(r.top), bottom: Math.round(r.bottom),
        inViewport: r.top >= 0 && r.bottom <= window.innerHeight,
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90) };
    });
    return info;
  });
}

// Count how many on-screen elements display the wager/bet number (suspect #1).
async function betDisplayProbe(page) {
  return page.evaluate(() => {
    // gather visible text nodes that look like a currency/bet amount
    const all = [...document.querySelectorAll('*')].filter((e) => {
      if (e.offsetParent === null) return false;
      if (e.children.length > 0) return false; // leaf
      const t = (e.textContent || '').trim();
      return /^[$€£]?\s?\d[\d.,]*\s?(sol|usd|◎)?$/i.test(t) && t.length <= 12;
    });
    const seen = all.map((e) => {
      const r = e.getBoundingClientRect();
      return { text: e.textContent.trim(), top: Math.round(r.top), left: Math.round(r.left),
        w: Math.round(r.width), fontSize: getComputedStyle(e).fontSize };
    });
    return seen;
  });
}

// HUD row above the board.
async function hudProbe(page) {
  return page.evaluate(() => {
    const cand = [...document.querySelectorAll('[data-testid]')].filter((e) =>
      /hud|pump|bag|risk|rug|multiplier|ifnext|if-next/i.test(e.getAttribute('data-testid') || ''));
    const out = cand.map((e) => ({ id: e.getAttribute('data-testid'), text: (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80) }));
    // also grab any element sitting directly above the canvas
    return out;
  });
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, args: [`--window-size=${VW + 40},${VH + 120}`] });
  const page = await browser.newPage();
  await page.setViewport({ width: VW, height: VH });
  const R = { port: PORT, viewport: `${VW}x${VH}` };

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
  await wait(700);
  await page.screenshot({ path: `${OUT}/01-lobby.png` });
  R.lobby = { cta: await ctaProbe(page, ['ape in', 'ape', 'start', 'play']), flow: await columnFlow(page) };

  // → BetEntry
  await clickText(page, 'ape in');
  await wait(600);
  await page.screenshot({ path: `${OUT}/02-betentry.png` });
  R.betentry = {
    cta: await ctaProbe(page, ['send it', 'send', 'go', 'ape']),
    flow: await columnFlow(page),
    betDisplays: await betDisplayProbe(page),
  };

  // → Playing (manual)
  await clickText(page, 'SEND IT');
  await wait(800);
  await clickText(page, 'MANUAL');
  await wait(400);
  await page.screenshot({ path: `${OUT}/03-playing-manual.png` });
  R.playing = { cta: await ctaProbe(page, ['go', 'send', 'cash', 'take profit']), flow: await columnFlow(page), hud: await hudProbe(page) };

  // tap a couple safe tiles to move the pump/bag, capture the HUD in motion
  await clickCanvasFraction(page, 0.2, 0.2); await wait(350);
  await clickCanvasFraction(page, 0.4, 0.3); await wait(350);
  await page.screenshot({ path: `${OUT}/04-playing-afterpicks.png` });
  R.playingAfterPicks = { hud: await hudProbe(page), flow: await columnFlow(page) };

  // finish round -> settled (force take profit after a few taps)
  let taps = 2;
  for (let gx = 5; gx <= 9 && !(await isSettled(page)); gx++) {
    for (let gy = 1; gy <= 9; gy++) {
      if (await isSettled(page)) break;
      await clickCanvasFraction(page, gx / 10, gy / 10);
      taps++;
      await wait(230);
      if (taps >= 4) { const t = await clickText(page, 'take profit'); if (t) await wait(800); }
      if (await isSettled(page)) break;
    }
  }
  await wait(600);
  await page.screenshot({ path: `${OUT}/05-settled.png` });
  R.settled = {
    banner: await page.evaluate(() => {
      const b = document.querySelector('[data-testid="vault-settled-banner"]') || document.querySelector('[data-testid="vault-settledpanel"]');
      return b ? (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 140) : null;
    }),
    flow: await columnFlow(page),
    cta: await ctaProbe(page, ['bet again', 'again', 'ape']),
  };

  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
  await browser.close();
}
run().catch((e) => { console.error(e); process.exit(1); });
