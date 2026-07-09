// changemode-verify-0704.mjs — game-art-director visual proof for the
// "change mode" secondary-button promotion (FIX 4, 2026-07-04). Screenshots
// the SETTLED screen (WIN + RUG) at desktop, cropped to the BET AGAIN gutter
// card so `change mode` reads as a real ghost/outline button beside the
// still-dominant filled BET AGAIN CTA. Reuses the reachSettled/take-profit
// pattern already proven in indepvis0704-verify.mjs / crashfix-verify.mjs.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5911';
const OUT = process.argv[3] || 'shots-changemode-0704';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

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
async function clickTextWithin(page, selector, t) { return clickText(page, t, selector); }

async function isSettled(page) {
  return await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-betagain"]'));
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
async function takeProfitIfEnabled(page) {
  return await page.evaluate(() => {
    const btn = [...document.querySelectorAll('[data-testid="vault-playing-actions"] button')].find((b) =>
      b.textContent.toLowerCase().includes('take profit'),
    );
    if (btn && !btn.disabled) { btn.click(); return true; }
    return false;
  });
}
async function settledOutcome(page) {
  return await page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-settled-betagain"]');
    // walk up to find a headline/won-or-rug text hint nearby
    const panel = el ? el.closest('div') : null;
    const text = document.body.innerText || '';
    return /rug/i.test(text) ? 'rug' : (/win|profit|bag/i.test(text) ? 'win' : 'unknown');
  });
}

async function startRound(page) {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in');
  await wait(600);
  await clickTextWithin(page, '[data-testid="vault-betentry-confirm"]', 'SEND IT');
  await wait(700);
}

async function driveToWin(page) {
  await startRound(page);
  for (let i = 0; i < 3; i++) {
    if (await isSettled(page)) break;
    await clickCanvasFraction(page, 0.15 + i * 0.1, 0.5);
    await wait(350);
    if (await isSettled(page)) break;
  }
  if (!(await isSettled(page))) await takeProfitIfEnabled(page);
  await wait(900);
  return await isSettled(page);
}

async function driveToRug(page, maxAttempts = 6) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await startRound(page);
    const spots = [];
    for (let gx = 1; gx <= 9; gx++) for (let gy = 1; gy <= 9; gy++) spots.push([gx / 10, gy / 10]);
    for (const [fx, fy] of spots) {
      if (await isSettled(page)) break;
      await clickCanvasFraction(page, fx, fy);
      await wait(280);
      if (await isSettled(page)) break;
    }
    await wait(700);
    if (await isSettled(page)) {
      const outcome = await settledOutcome(page);
      console.log(`[driveToRug] attempt ${attempt} outcome=${outcome}`);
      if (outcome === 'rug') return true;
    } else {
      console.log(`[driveToRug] attempt ${attempt} did not settle`);
    }
  }
  return await isSettled(page);
}

async function shootGutterCard(page, tag) {
  await page.screenshot({ path: `${OUT}/${tag}-full.png`, fullPage: false });
  const rect = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-settled-betagain"]');
    if (!el) return null;
    const card = el.closest('div');
    const r = (card || el).getBoundingClientRect();
    return { x: Math.max(0, r.x - 24), y: Math.max(0, r.y - 24), width: r.width + 48, height: r.height + 48 };
  });
  if (rect) {
    await page.screenshot({ path: `${OUT}/${tag}-crop.png`, clip: rect });
  }
  // Also capture the mobile/legacy linksTier row if present (settledLinks)
  const linksRect = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter((b) => /change mode/i.test(b.textContent));
    if (!btns.length) return null;
    const btn = btns[btns.length - 1];
    const row = btn.closest('div');
    const r = (row || btn).getBoundingClientRect();
    return { x: Math.max(0, r.x - 20), y: Math.max(0, r.y - 20), width: r.width + 40, height: r.height + 40 };
  });
  return { rect, linksRect };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  console.log('--- WIN pass ---');
  const win = await driveToWin(page);
  console.log('win settled:', win);
  await shootGutterCard(page, 'win');

  console.log('--- RUG pass ---');
  const rug = await driveToRug(page);
  console.log('rug settled:', rug);
  await shootGutterCard(page, 'rug');

  console.log(JSON.stringify({ win, rug, pageErrors }, null, 2));
  await browser.close();
})();
