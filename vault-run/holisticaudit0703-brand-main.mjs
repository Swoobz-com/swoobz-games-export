// Brand-cohesion holistic audit driver, port 5311, own screenshots dir.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5311';
const SHOTS = 'shots-holisticaudit0703/brand';
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

// Green-family scan: T.accent #22D37D, T.accentSolid #00E676, accentMuted rgba(0,230,118,x),
// ALTSEASON accent #00FF7F. Broad green heuristic: g significantly > r and g significantly > b.
async function greenScan(page) {
  return await page.evaluate(() => {
    function parse(str) {
      const m = str && str.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
      if (!m) return null;
      return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 };
    }
    function isGreenish(c) {
      if (!c || c.a === 0) return false;
      return c.g > 100 && c.g - c.r > 30 && c.g - c.b > 20;
    }
    const all = [...document.querySelectorAll('body *')];
    const hits = [];
    for (const el of all) {
      if (el.offsetParent === null && el.tagName !== 'BODY') continue;
      const cs = getComputedStyle(el);
      const fields = {
        color: cs.color,
        backgroundColor: cs.backgroundColor,
        borderColor: cs.borderTopColor,
      };
      // also scan gradient/box-shadow strings for green rgba substrings
      const bgImage = cs.backgroundImage;
      const boxShadow = cs.boxShadow;
      let matched = null;
      for (const [k, v] of Object.entries(fields)) {
        const c = parse(v);
        if (isGreenish(c)) { matched = { field: k, value: v }; break; }
      }
      if (!matched && bgImage && bgImage !== 'none') {
        const mm = bgImage.match(/rgba?\([\d., ]+\)/g) || [];
        for (const s of mm) {
          const c = parse(s);
          if (isGreenish(c)) { matched = { field: 'backgroundImage', value: s }; break; }
        }
      }
      if (!matched && boxShadow && boxShadow !== 'none') {
        const mm = boxShadow.match(/rgba?\([\d., ]+\)/g) || [];
        for (const s of mm) {
          const c = parse(s);
          if (isGreenish(c)) { matched = { field: 'boxShadow', value: s }; break; }
        }
      }
      if (matched) {
        hits.push({
          tag: el.tagName,
          testid: el.getAttribute('data-testid') || null,
          cls: (el.className && el.className.toString) ? el.className.toString().slice(0, 60) : null,
          text: el.textContent ? el.textContent.trim().slice(0, 40) : '',
          field: matched.field,
          value: matched.value,
          rect: (() => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })(),
        });
      }
    }
    return hits;
  });
}

// Collapse element-level hits into a de-duplicated "distinct visual job" list by
// clustering elements whose rects overlap/nest AND share the same color value
// (parent card + child text/button sharing one signal count once; different
// signals at different screen regions count separately).
function summarizeGreenHits(hits) {
  // group by rounded value + rough location bucket
  const buckets = new Map();
  for (const h of hits) {
    const key = `${h.value}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(h);
  }
  return buckets;
}

async function fontOf(page, selectorOrTestid, isTestId = true) {
  return await page.evaluate(({ selectorOrTestid, isTestId }) => {
    const el = isTestId ? document.querySelector(`[data-testid="${selectorOrTestid}"]`) : document.querySelector(selectorOrTestid);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { fontFamily: cs.fontFamily, text: el.textContent.trim().slice(0, 40) };
  }, { selectorOrTestid, isTestId });
}

async function shot(page, name, clip) {
  const path = `${SHOTS}/${name}.png`;
  if (clip) await page.screenshot({ path, clip });
  else await page.screenshot({ path });
  return path;
}

async function cardClip(page, testid, pad = 16) {
  return await page.evaluate(({ testid, pad }) => {
    const el = document.querySelector(`[data-testid="${testid}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.max(0, r.left - pad), y: Math.max(0, r.top - pad), width: r.width + pad * 2, height: r.height + pad * 2 };
  }, { testid, pad });
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 }, args: ['--window-size=1460,1040'] });
  const R = { worlds: {} };

  const worlds = ['bluechips', 'altseason', 'shitcoin'];

  for (const world of worlds) {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0', timeout: 60000 });
    await wait(600);

    const W = {};

    // ---- LOBBY ----
    W.lobby_green = await greenScan(page);
    W.lobby_font_balance = await fontOf(page, 'vault-lobby-left', true); // sanity only, likely no numeric here
    await shot(page, `${world}-lobby-full`);

    // open bet-entry, select world
    await clickText(page, 'ape in', '[data-testid="vault-lobby-apein"]');
    await wait(400);
    const worldPicked = await clickText(page, world, '[data-testid="vault-betentry-world"]');
    W.worldPicked = worldPicked;
    await wait(300);

    // ---- BETENTRY ----
    W.betentry_green = await greenScan(page);
    await shot(page, `${world}-betentry-full`);
    const confirmClip = await cardClip(page, 'vault-betentry-confirm');
    if (confirmClip) await shot(page, `${world}-betentry-confirm-card`, confirmClip);
    const worldClip = await cardClip(page, 'vault-betentry-world');
    if (worldClip) await shot(page, `${world}-betentry-world-card`, worldClip);
    W.font_balance_betentry = await page.evaluate(() => {
      const el = [...document.querySelectorAll('[data-testid="vault-betentry-confirm"] *')].find(e => /\d/.test(e.textContent) && e.children.length === 0);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { fontFamily: cs.fontFamily, text: el.textContent.trim() };
    });

    const sendItFired = await clickText(page, 'SEND IT', '[data-testid="vault-betentry-confirm"]');
    W.sendItFired = sendItFired;
    await wait(700);

    // ---- PLAYING (pre-reveal) ----
    W.playing_green_prereveal = await greenScan(page);
    await shot(page, `${world}-playing-prereveal-full`);
    const actionsClipPre = await cardClip(page, 'vault-playing-actions');
    if (actionsClipPre) await shot(page, `${world}-playing-actions-card-prereveal`, actionsClipPre);
    W.font_pump = await page.evaluate(() => {
      const els = [...document.querySelectorAll('[data-testid="vault-playing-left"] *')];
      const el = els.find(e => e.textContent.includes('×') && e.children.length === 0);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { fontFamily: cs.fontFamily, text: el.textContent.trim() };
    });

    // reveal tiles until either a safe reveal (canCashOut) or bust
    const gridSize = world === 'shitcoin' ? 7 : 5;
    let revealed = false, busted = false;
    for (let i = 0; i < gridSize * gridSize && !revealed && !busted; i++) {
      const { cx, cy } = await cellCenter(page, i, gridSize);
      await page.mouse.click(cx, cy);
      await wait(350);
      const canCashOutNow = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="vault-playing-actions"]');
        if (!el) return false;
        const btns = [...el.querySelectorAll('button')];
        const b = btns.find((x) => x.textContent.toLowerCase().includes('take profit'));
        return b ? !b.disabled : false;
      });
      const stillPlaying = await page.evaluate(() => !!document.querySelector('[data-testid="vault-playing-actions"]'));
      if (canCashOutNow) { revealed = true; break; }
      if (!stillPlaying) { busted = true; break; }
    }
    W.gotSafeReveal = revealed;
    W.instantBust = busted;

    if (revealed) {
      W.playing_green_postreveal = await greenScan(page);
      await shot(page, `${world}-playing-postreveal-full`);
      const actionsClipPost = await cardClip(page, 'vault-playing-actions');
      if (actionsClipPost) await shot(page, `${world}-playing-actions-card-postreveal`, actionsClipPost);

      const cashoutFired = await clickText(page, 'take profit', '[data-testid="vault-playing-actions"]');
      W.cashoutFired = cashoutFired;
      await wait(700);

      // ---- SETTLED WIN ----
      W.settled_win_green = await greenScan(page);
      await shot(page, `${world}-settled-win-full`);
      const betAgainClip = await cardClip(page, 'vault-settled-betagain');
      if (betAgainClip) await shot(page, `${world}-settled-win-betagain-card`, betAgainClip);
      W.font_payout = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="vault-settled-result"]');
        if (!el) return null;
        const num = [...el.querySelectorAll('*')].find(e => /\d/.test(e.textContent) && e.children.length === 0);
        if (!num) return null;
        const cs = getComputedStyle(num);
        return { fontFamily: cs.fontFamily, text: num.textContent.trim() };
      });
    } else if (busted) {
      W.settled_bust_green = await greenScan(page);
      await shot(page, `${world}-settled-bust-full`);
    }

    W.consoleErrors = consoleErrors;
    R.worlds[world] = W;
    await page.close();
  }

  // ---- Wordmark check across all pages (canvas + DOM) ----
  {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await wait(500);
    R.wordmarkCheck = await page.evaluate(() => {
      const domHit = !!document.querySelector('[data-watermark="swoobz"], .swoobz-watermark');
      const bodyTextHasSwoobz = document.body.textContent.toUpperCase().includes('SWOOBZ');
      return { domHit, bodyTextHasSwoobz };
    });
    await page.close();
  }

  await browser.close();
  fs.writeFileSync('holisticaudit0703-brand-results.json', JSON.stringify(R, null, 2));
  console.log('DONE');
  console.log(JSON.stringify(R, null, 2));
})();
