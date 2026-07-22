import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5411';
const OUT = process.argv[3] || 'shots-jesse-forceloss-0705';
const VW = parseInt(process.argv[4] || '1440', 10);
const VH = parseInt(process.argv[5] || '900', 10);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase())
      || els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, t);
  const el = h.asElement(); if (!el) return false; await el.click(); return true;
}
async function isSettled(page) {
  return page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]') || !!document.querySelector('[data-testid="vault-settledpanel"]'));
}
async function canvasBox(page) {
  return page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
}
async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, args: [`--window-size=${VW + 40},${VH + 120}`] });
  const page = await browser.newPage();
  await page.setViewport({ width: VW, height: VH });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
  await wait(700);
  await clickText(page, 'ape in'); await wait(600);
  await clickText(page, 'SEND IT'); await wait(900);
  // dense 5x5 crack grid, x 0.27..0.66, y 0.18..0.82
  const box = await canvasBox(page);
  const xs = [0.27, 0.365, 0.46, 0.555, 0.65];
  const ys = [0.20, 0.35, 0.50, 0.65, 0.80];
  let cracked = 0;
  outer: for (const fy of ys) for (const fx of xs) {
    if (await isSettled(page)) break outer;
    await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy);
    cracked++; await wait(420);
    if (await isSettled(page)) break outer;
  }
  await wait(900);
  const settled = await isSettled(page);
  await page.screenshot({ path: `${OUT}/settled-loss.png` });
  const R = {
    settled, cracked,
    banner: await page.evaluate(() => { const b = document.querySelector('[data-testid="vault-settled-banner"]') || document.querySelector('[data-testid="vault-settledpanel"]'); return b ? (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 240) : null; }),
    // scan every visible leaf for money-ish or bag/rug/bust text
    moneyTexts: await page.evaluate(() => {
      const hits = [];
      for (const e of document.querySelectorAll('*')) {
        if (e.children.length) continue; if (e.offsetParent === null) continue;
        const t = (e.textContent || '').trim();
        if (!t) continue;
        if (/bag|rug|bust|rekt|lost|won|—|[$]?\d[\d.,]*\s*(usdc|x)?/i.test(t) && t.length <= 42) {
          const r = e.getBoundingClientRect();
          hits.push({ text: t.slice(0, 42), top: Math.round(r.top), left: Math.round(r.left), fs: getComputedStyle(e).fontSize, color: getComputedStyle(e).color });
        }
      }
      return hits.slice(0, 60);
    }),
  };
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(R, null, 2));
  console.log('settled=', settled, 'cracked=', cracked);
  console.log('banner=', R.banner);
  await browser.close();
}
run().catch((e) => { console.error(e); process.exit(1); });
