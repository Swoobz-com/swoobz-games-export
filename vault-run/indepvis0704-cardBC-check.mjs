import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5330';
const OUT = 'shots-indepvis0704';
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
function panelGeometry(W, H, gridSize) {
  const wide = W / H > 1.2;
  const topReserved = H * (wide ? 0.12 : 0.15);
  const bottomReserved = H * (wide ? 0.14 : 0.18);
  const sideFrac = 0.08;
  const safeW = W * (1 - sideFrac * 2);
  const safeH = (H - topReserved - bottomReserved) * 0.96;
  const available = Math.min(safeW, safeH);
  const gap = Math.max(6, available * 0.026);
  const tile = (available - gap * (gridSize - 1)) / gridSize;
  const full = tile * gridSize + gap * (gridSize - 1);
  const x = (W - full) / 2;
  const pad = Math.max(14, full * 0.045);
  return { panelLocalLeft: x - pad, panelLocalRight: x + full + pad };
}
async function rectOf(page, selector) {
  return await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
  }, selector);
}
async function canvasRectOf(page) {
  return await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]');
    const c = shell ? shell.querySelector('canvas') : document.querySelector('canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
  });
}
async function isSettled(page) {
  return await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-left"]'));
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
async function playOneRound(page) {
  await clickText(page, 'ape in');
  await wait(500);
  await clickText(page, 'send it', '[data-testid="vault-betentry-confirm"]') || await clickText(page, 'send it');
  await wait(700);
  const spots = [];
  for (let gx = 1; gx <= 9; gx++) for (let gy = 1; gy <= 9; gy++) spots.push([gx / 10, gy / 10]);
  for (const [fx, fy] of spots) {
    if (await isSettled(page)) return true;
    await clickCanvasFraction(page, fx, fy);
    await wait(250);
    if (await isSettled(page)) return true;
  }
  await wait(700);
  return await isSettled(page);
}
async function betAgain(page) {
  await clickText(page, 'bet again');
  await wait(500);
}

async function check(browser, w, h, tag) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(600);
  // Play 2 rounds so history.length >= 2 -> showB true for Card B (Session Trend Spark).
  await playOneRound(page);
  await betAgain(page);
  await wait(400);
  await playOneRound(page);
  await wait(600);

  const canvasRect = await canvasRectOf(page);
  const geo = panelGeometry(canvasRect.width, canvasRect.height, 5);
  const panelRightViewport = canvasRect.left + geo.panelLocalRight;
  const cardBC = await rectOf(page, '[data-testid="vault-gutter-right"]');
  const historyLen = await page.evaluate(() => document.body.textContent.match(/SESSION\s*\S*\s*(\d+)\s*ROUNDS/i)?.[1] || null);
  await page.screenshot({ path: `${OUT}/cardBC-${tag}-settled.png`, fullPage: true });
  await page.close();
  return {
    canvasRect, panelRightViewport, cardBC, historyLen,
    overlapsBoard: cardBC ? cardBC.left < panelRightViewport : null,
    gap: cardBC ? cardBC.left - panelRightViewport : null,
  };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  fs.mkdirSync(OUT, { recursive: true });
  const R = {};
  for (const w of [960, 1024, 1100]) {
    R[`w${w}`] = await check(browser, w, 800, `w${w}`);
  }
  await browser.close();
  fs.writeFileSync(`${OUT}/cardBC-results.json`, JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();
