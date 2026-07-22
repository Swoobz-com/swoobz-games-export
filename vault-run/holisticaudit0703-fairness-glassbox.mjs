import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const SHOTS = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/vault-run/shots-holisticaudit0703/fairness';

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return els.find(e => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase())
      || els.find(e => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
async function cellCenter(page, idx, g) {
  return await page.evaluate(({ idx, g }) => {
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
  }, { idx, g });
}
async function settled(page) { return await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again')); }
async function isRug(page) { return await page.evaluate(() => document.body.textContent.toLowerCase().includes('rugged')); }

async function driveRound(page, { grid, wantRug }) {
  // wantRug: click every cell rapidly hoping to hit a mine early; else click one cell and cash out.
  await clickText(page, 'ape in'); await wait(500);
  await clickText(page, 'send it'); await wait(700);
  if (wantRug) {
    let s = false;
    for (let k = 0; k < grid * grid && !s; k++) {
      const { cx, cy } = await cellCenter(page, k, grid);
      await page.mouse.click(cx, cy);
      await wait(160);
      s = await settled(page);
    }
  } else {
    // reveal one tile then cash out (Take Profit)
    const { cx, cy } = await cellCenter(page, 0, grid);
    await page.mouse.click(cx, cy);
    await wait(500);
    const cashed = await clickText(page, 'take profit');
    if (!cashed) {
      // fallback: try a couple more tiles then cash
      for (let k = 1; k < 4; k++) {
        const s = await settled(page);
        if (s) break;
        const c2 = await cellCenter(page, k, grid);
        await page.mouse.click(c2.cx, c2.cy);
        await wait(400);
      }
      await clickText(page, 'take profit');
    }
  }
  await wait(400);
  let s = await settled(page);
  for (let i = 0; i < 20 && !s; i++) { await wait(300); s = await settled(page); }
  return s;
}

async function probeViewport(width, height) {
  const out = { width, height, win: null, rug: null };
  const browser = await puppeteer.launch({
    executablePath: EXE, headless: false,
    defaultViewport: { width, height, deviceScaleFactor: 1 },
    args: [`--window-size=${width + 20},${height + 140}`, '--autoplay-policy=no-user-gesture-required'],
  });
  const page = (await browser.pages())[0];
  page.on('pageerror', e => console.log('PAGEERROR', width, e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE-ERR', width, m.text().slice(0,200)); });

  // ---- RUG outcome (bluechips default 5x5) ----
  await page.goto('http://localhost:5307/', { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1000);
  const gotRug = await driveRound(page, { grid: 5, wantRug: true });
  await wait(1800); // allow verifyState verifying -> matched
  const rugSettled = gotRug && await isRug(page);
  const toggledRug = await clickText(page, 'view receipt');
  await wait(500);
  const rugInfo = await page.evaluate(() => {
    const el = document.getElementById('vault-settled-receipt');
    const chip = document.querySelector('.vault-receipt-toggle');
    const bodyText = document.body.textContent;
    const hasAutoVerifyChip = bodyText.includes('✓ verified') || bodyText.includes('verified');
    const hasNoModal = ![...document.querySelectorAll('[role=dialog]')].some(d => getComputedStyle(d).display !== 'none' && d.getAttribute('aria-label') !== 'How to play Rug or Riches');
    if (!el) return { found: false, hasAutoVerifyChip, hasNoModal, toggleFound: !!chip };
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      found: true, hasAutoVerifyChip, hasNoModal, toggleFound: !!chip,
      text: el.textContent.slice(0, 600),
      position: cs.position,
      visible: el.offsetParent !== null,
      rect: { top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width) },
    };
  });
  out.rug = { settled: rugSettled, toggled: toggledRug, receipt: rugInfo };
  await page.screenshot({ path: `${SHOTS}/rug-${width}x${height}-settled.png` });
  if (toggledRug) await wait(300);
  await page.screenshot({ path: `${SHOTS}/rug-${width}x${height}-receipt-expanded.png` });

  await browser.close();

  // ---- WIN outcome (fresh browser/session, cash out after 1 tile) ----
  const browser2 = await puppeteer.launch({
    executablePath: EXE, headless: false,
    defaultViewport: { width, height, deviceScaleFactor: 1 },
    args: [`--window-size=${width + 20},${height + 140}`, '--autoplay-policy=no-user-gesture-required'],
  });
  const page2 = (await browser2.pages())[0];
  page2.on('pageerror', e => console.log('PAGEERROR2', width, e.message));
  await page2.goto('http://localhost:5307/', { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1000);
  const gotWin = await driveRound(page2, { grid: 5, wantRug: false });
  await wait(1800);
  const winIsRug = gotWin && await isRug(page2);
  const toggledWin = await clickText(page2, 'view receipt');
  await wait(500);
  const winInfo = await page2.evaluate(() => {
    const el = document.getElementById('vault-settled-receipt');
    const bodyText = document.body.textContent;
    const hasAutoVerifyChip = bodyText.includes('✓ verified') || bodyText.includes('verified');
    if (!el) return { found: false, hasAutoVerifyChip };
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      found: true, hasAutoVerifyChip,
      text: el.textContent.slice(0, 600),
      position: cs.position,
      visible: el.offsetParent !== null,
      rect: { top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width) },
    };
  });
  out.win = { settled: gotWin, isRug: winIsRug, toggled: toggledWin, receipt: winInfo };
  await page2.screenshot({ path: `${SHOTS}/win-${width}x${height}-settled.png` });
  if (toggledWin) await wait(300);
  await page2.screenshot({ path: `${SHOTS}/win-${width}x${height}-receipt-expanded.png` });
  await browser2.close();

  return out;
}

const results = [];
for (const [w, h] of [[1440, 900], [1920, 1080]]) {
  console.log('=== viewport', w, h, '===');
  const r = await probeViewport(w, h);
  results.push(r);
  console.log(JSON.stringify(r, null, 1));
}

const fs = await import('node:fs');
fs.writeFileSync(
  'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/vault-run/holisticaudit0703-fairness-glassbox-results.json',
  JSON.stringify(results, null, 2)
);
console.log('DONE');
