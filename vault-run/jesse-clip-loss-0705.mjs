// jesse-clip-loss-0705.mjs — zoom the two suspected clips + force a real RUG loss.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5781';
const OUT = 'shots-jesse-revert-0705/clips';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log(...a);

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button],a')];
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    return els.find(e => e.offsetParent !== null && !e.disabled && norm(e) === t.toLowerCase())
        || els.find(e => e.offsetParent !== null && !e.disabled && norm(e).includes(t.toLowerCase()));
  }, t);
  const el = h.asElement(); if (!el) return false; await el.click(); return true;
}
async function clickCanvas(page, fx, fy) {
  const box = await page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null;
    const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  if (!box) return false; await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy); return true;
}
async function isSettled(page) { return page.evaluate(() =>
  !!document.querySelector('[data-testid="vault-settledpanel"]') ||
  !!document.querySelector('[data-testid="vault-settled-result"]')); }

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--force-device-scale-factor=1'],
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 } });
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
  await wait(2500);
  await clickText(page, 'ape in'); await wait(1500);

  // CLIP 1: betentry right gutter difficulty badges region (top-right of gutter)
  await page.screenshot({ path: `${OUT}/clip1-betentry-worlds.png`, clip: { x: 1030, y: 155, width: 410, height: 470 } });
  log('clip1 saved (betentry world badges)');

  // pick SHITCOIN world (24 rugs 7x7 -> loss fast) then send it
  await clickText(page, 'shitcoin'); await wait(500);
  await clickText(page, 'send it'); await wait(1600);

  // CLIP 2: playing top-right IF NEXT IS SAFE vs globe collision
  await page.screenshot({ path: `${OUT}/clip2-playing-ifnext.png`, clip: { x: 1120, y: 90, width: 320, height: 130 } });
  log('clip2 saved (playing if-next vs globe)');

  // Force a RUG: reveal many tiles on 7x7 until settled (loss)
  let settled = false, clicks = 0;
  const cells = [];
  for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) cells.push([0.09 + c*0.135, 0.12 + r*0.135]);
  for (const [fx, fy] of cells) {
    await clickCanvas(page, fx, fy); clicks++; await wait(650);
    if (await isSettled(page)) { settled = true; break; }
  }
  await wait(1000);
  const kind = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-settled-result"]') || document.body;
    return (document.querySelector('header,[class*=topbar],body') ? '' : '') + '';
  });
  await page.screenshot({ path: `${OUT}/clip3-loss-settled.png` });
  const topbar = await page.evaluate(() => (document.body.innerText || '').split('\n').slice(0,4).join(' | '));
  log('rug loss after', clicks, 'clicks. settled=', settled, 'topbar:', topbar.slice(0,120));
  await browser.close();
}
run().catch(e => { console.error('FATAL', e); process.exit(1); });
