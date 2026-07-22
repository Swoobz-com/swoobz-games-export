// Focused Playing-phase capture: default STAGGERED reveal pace (slower cascade)
// so we can reliably screenshot mid-run — checks rhythm badge, autopick text,
// gutter Card-A mirror during an active round.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5315';
const SHOTDIR = 'shots-holisticaudit0703/grind';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

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
async function cc(page, idx, g) {
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
async function paintTrail(page, indices, g) {
  const first = await cc(page, indices[0], g);
  await page.mouse.move(first.cx, first.cy);
  await page.mouse.down();
  await wait(40);
  for (const idx of indices.slice(1)) {
    const c = await cc(page, idx, g);
    if (!c) continue;
    await page.mouse.move(c.cx, c.cy, { steps: 3 });
    await wait(10);
  }
  await page.mouse.up();
  await wait(300);
}
function snake(n, g = 5) {
  const out = [];
  for (let row = 0; row < g && out.length < n; row++) {
    const cols = row % 2 === 0 ? [0, 1, 2, 3, 4] : [4, 3, 2, 1, 0];
    for (const col of cols) { if (out.length >= n) break; out.push(row * g + col); }
  }
  return out;
}
async function settled(page) { return await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again')); }
async function isRunning(page) {
  return await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter((e) => e.offsetParent !== null);
    return btns.some((b) => b.textContent.trim() === 'STOP ⚡');
  });
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, defaultViewport: null, args: ['--window-size=1470,1040'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(800);
  await clickText(page, 'ape in');
  await wait(600);
  await clickText(page, 'send it');
  await wait(700);
  await clickText(page, 'TRAIL');
  await wait(250);
  const order = snake(20, 5); // default STAGGERED pace — do NOT click instant
  await paintTrail(page, order, 5);
  await clickText(page, 'GO');

  const samples = [];
  let badgeSeen = false, badgeShotTaken = false;
  for (let i = 0; i < 200; i++) { // up to 20s of staggered reveal
    await wait(100);
    const running = await isRunning(page);
    const hasBadge = await page.evaluate(() => !!document.querySelector('[data-testid="vault-rhythm-badge"]'));
    const hasAutopick = await page.evaluate(() => document.body.textContent.toUpperCase().includes('AUTO-PICK'));
    const isSettled = await settled(page);
    samples.push({ i, running, hasBadge, hasAutopick, isSettled });
    if (hasBadge && !badgeShotTaken) {
      await page.screenshot({ path: `${SHOTDIR}/09-playing-rhythmbadge-1440x900.png` });
      badgeShotTaken = true;
      badgeSeen = true;
    }
    if (running && i === 3) {
      await page.screenshot({ path: `${SHOTDIR}/10-playing-midrun-generic-1440x900.png` });
    }
    if (isSettled) break;
  }

  const playingLeft = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-playing-left"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height, text: el.textContent.slice(0, 200) };
  });

  console.log('badgeSeen:', badgeSeen);
  console.log('samples (compact):', JSON.stringify(samples.filter((s, idx) => idx % 5 === 0 || s.hasBadge)));
  console.log('playingLeft (Card A mirror during playing):', JSON.stringify(playingLeft));
  console.log('any AUTO-PICK text seen during playing:', samples.some((s) => s.hasAutopick));

  fs.writeFileSync('holisticaudit0703-grind-playing-results.json', JSON.stringify({ badgeSeen, samples, playingLeft }, null, 2));
  console.log('DONE PLAYING PROBE');
} finally {
  await browser.close();
}
