// jesse-revert-reverify-0705.mjs — FRESH-PLAYER comprehension read of the
// documentation-based REVERT to the gutter-glass-card desktop UI.
// Uninformed player: reason ONLY from the screen. Drive a full cold session and
// hard-probe the three reconstruction risks (SEND IT findability, narrow-desktop
// gutter scroll hiding a control, SESSION PULSE absent at first load).
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5781';
const LABEL = process.argv[3] || 'desk1440';
const VW = parseInt(process.argv[4] || '1440', 10);
const VH = parseInt(process.argv[5] || '900', 10);
const MOBILE = process.argv[6] === 'mobile';
const OUT = `shots-jesse-revert-0705/${LABEL}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const log = (...a) => console.log(...a);

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  log(`  shot: ${name}.png`);
}

async function visibleButtons(page) {
  return page.evaluate(() => {
    const btns = [...document.querySelectorAll('button,[role=button],a')];
    return btns.filter(b => b.offsetParent !== null).map(b => {
      const r = b.getBoundingClientRect();
      return {
        text: (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
        disabled: b.disabled === true,
        x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
        inView: r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth,
      };
    }).filter(b => b.w > 8 && b.h > 8);
  });
}

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button],a')];
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    return els.find(e => e.offsetParent !== null && !e.disabled && norm(e) === t.toLowerCase())
        || els.find(e => e.offsetParent !== null && !e.disabled && norm(e).includes(t.toLowerCase()));
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}

// Probe: does any scroll ancestor clip this element? plus fold visibility.
async function ctaProbe(page, labels) {
  return page.evaluate((labels) => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const btns = [...document.querySelectorAll('button,[role=button],a')];
    const matches = [];
    for (const b of btns) {
      const low = (b.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (!labels.some(l => low.includes(l))) continue;
      const r = b.getBoundingClientRect();
      let clipped = false, clipBy = null;
      let el = b.parentElement;
      while (el) {
        const cs = getComputedStyle(el);
        if (/(auto|scroll|hidden)/.test(cs.overflowY)) {
          const ar = el.getBoundingClientRect();
          if (r.top < ar.top - 1 || r.bottom > ar.bottom + 1) { clipped = true; clipBy = el.getAttribute('data-testid') || el.className.slice(0,30); }
        }
        el = el.parentElement;
      }
      matches.push({
        text: (b.textContent||'').replace(/\s+/g,' ').trim().slice(0,30),
        disabled: b.disabled === true,
        top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left),
        w: Math.round(r.width), h: Math.round(r.height),
        visible: b.offsetParent !== null,
        inViewportV: r.top >= 0 && r.bottom <= vh,
        belowFold: r.top > vh, clippedByScroll: clipped, clipBy,
      });
    }
    return { vw, vh, matches };
  }, labels);
}

// Dump gutter scroll containers state (narrow-desktop probe).
async function gutterScrollProbe(page) {
  return page.evaluate(() => {
    const ids = ['vault-betentry-left','vault-betentry-right','vault-lobby-left','vault-lobby-right',
                 'vault-playing-left','vault-playing-right','vault-settled-left','vault-settled-right',
                 'vault-gutter-left','vault-gutter-right'];
    return ids.map(id => {
      const el = document.querySelector(`[data-testid="${id}"]`);
      if (!el) return { id, present: false };
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { id, present: true, overflowY: cs.overflowY,
        scrolls: el.scrollHeight > el.clientHeight + 1,
        scrollH: el.scrollHeight, clientH: el.clientHeight,
        top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) };
    }).filter(x => x.present);
  });
}

async function sessionPulseProbe(page) {
  return page.evaluate(() => {
    const all = [...document.querySelectorAll('*')].filter(e => e.offsetParent !== null && e.children.length === 0);
    const pulse = all.find(e => /session pulse/i.test(e.textContent || ''));
    return { sessionPulsePresent: !!pulse };
  });
}

async function clickCanvas(page, fx, fy) {
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

async function isSettled(page) {
  return page.evaluate(() =>
    !!document.querySelector('[data-testid="vault-settledpanel"]') ||
    !!document.querySelector('[data-testid="vault-settled-result"]') ||
    !!document.querySelector('[data-testid="vault-settled-betagain"]'));
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', `--window-size=${VW},${VH+120}`, '--force-device-scale-factor=1'],
    defaultViewport: { width: VW, height: VH, deviceScaleFactor: 1, isMobile: MOBILE, hasTouch: MOBILE },
  });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0,120)); });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 45000 });
  await wait(2500);

  log(`\n===== ${LABEL} (${VW}x${VH}) mobile=${MOBILE} =====`);

  // ---- LOBBY ----
  await shot(page, '01-lobby');
  log('LOBBY buttons:', JSON.stringify(await visibleButtons(page), null, 0).slice(0, 900));
  log('LOBBY sessionPulse:', JSON.stringify(await sessionPulseProbe(page)));

  // advance to bet-entry: APE IN
  const aped = await clickText(page, 'ape in');
  log('clicked APE IN:', aped);
  await wait(1800);
  await shot(page, '02-betentry');

  // ---- BET ENTRY probes ----
  const sendProbe = await ctaProbe(page, ['send it']);
  log('SEND IT probe:', JSON.stringify(sendProbe));
  const worldProbe = await ctaProbe(page, ['pick your world', 'world']);
  log('WORLD probe:', JSON.stringify(worldProbe).slice(0, 700));
  log('GUTTER scroll (betentry):', JSON.stringify(await gutterScrollProbe(page)));
  log('BETENTRY buttons:', JSON.stringify(await visibleButtons(page), null, 0).slice(0, 1400));

  // set bet: try to find a bet + / raise control (chips)
  // pick a world (if a world button is present & not confirm/send)
  await clickText(page, 'pick your world');
  await wait(600);
  await shot(page, '03-betentry-worldopen');

  // send it
  const sent = await clickText(page, 'send it');
  log('clicked SEND IT:', sent);
  await wait(1800);
  await shot(page, '04-playing-start');
  log('PLAYING buttons:', JSON.stringify(await visibleButtons(page), null, 0).slice(0, 1200));
  log('PLAYING gutter scroll:', JSON.stringify(await gutterScrollProbe(page)));
  log('PLAYING sessionPulse:', JSON.stringify(await sessionPulseProbe(page)));

  // ---- WIN path: reveal 2 safe tiles then SECURE THE BAG ----
  const fracs = [[0.2,0.3],[0.5,0.3],[0.8,0.3],[0.2,0.6],[0.5,0.6]];
  let settledEarly = false;
  for (let i = 0; i < 2; i++) {
    await clickCanvas(page, fracs[i][0], fracs[i][1]);
    await wait(1100);
    if (await isSettled(page)) { settledEarly = true; break; }
  }
  await shot(page, '05-playing-revealed');
  log('after 2 reveals settled?', settledEarly);
  const secProbe = await ctaProbe(page, ['secure the bag', 'secure']);
  log('SECURE THE BAG probe:', JSON.stringify(secProbe).slice(0,700));

  if (!settledEarly) {
    const secured = await clickText(page, 'secure the bag') || await clickText(page, 'secure');
    log('clicked SECURE THE BAG:', secured);
    await wait(1800);
  }
  await shot(page, '06-settled-win');
  log('WIN settled?', await isSettled(page));
  log('SETTLED buttons:', JSON.stringify(await visibleButtons(page), null, 0).slice(0, 1000));
  log('SETTLED betagain/newsetup probe:', JSON.stringify(await ctaProbe(page, ['bet again', 'new setup'])).slice(0,700));
  log('SETTLED sessionPulse:', JSON.stringify(await sessionPulseProbe(page)));
  log('SETTLED gutter scroll:', JSON.stringify(await gutterScrollProbe(page)));

  // ---- LOSS path: bet again then keep revealing until a rug hits ----
  await clickText(page, 'bet again') || await clickText(page, 'new setup');
  await wait(1600);
  // if we land in bet-entry, send it again
  if (await clickText(page, 'send it')) await wait(1600);
  await shot(page, '07-playing-lossrun');
  let hitRug = false;
  for (let i = 0; i < 12; i++) {
    const fx = 0.16 + (i % 4) * 0.22;
    const fy = 0.22 + Math.floor(i / 4) * 0.2;
    await clickCanvas(page, fx, fy);
    await wait(900);
    if (await isSettled(page)) { hitRug = true; break; }
  }
  await wait(800);
  await shot(page, '08-settled-loss');
  log('LOSS settled (rug)?', hitRug, 'isSettled:', await isSettled(page));
  log('LOSS SETTLED buttons:', JSON.stringify(await visibleButtons(page), null, 0).slice(0, 900));

  log('PAGE ERRORS:', errs.length ? JSON.stringify(errs.slice(0,8)) : 'none');
  await browser.close();
}
run().catch(e => { console.error('FATAL', e); process.exit(1); });
