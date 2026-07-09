// jesse-reverify-0704.mjs — FRESH-PLAYER independent HEADED re-verify of FIX1
// (session pulse de-dup + hide-until-data) and FIX2 (NEW SETUP copy).
// Adds a COLD (pre-ape-in) checkpoint the maker's driver skipped.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5196';
const OUT = process.argv[3] || 'shots-jesse-0704';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

async function clickText(page, t, within) {
  const h = await page.evaluateHandle(({ t, within }) => {
    const root = within ? document.querySelector(within) : document;
    if (!root) return null;
    const els = [...root.querySelectorAll('button,[role=button]')];
    return els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase())
      || els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, { t, within });
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
async function isSettled(page) {
  return await page.evaluate(() =>
    !!document.querySelector('[data-testid="vault-settled-betagain"]') ||
    !!document.querySelector('[data-testid="vault-settledpanel"]'));
}
async function clickCanvasFraction(page, fx, fy) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas'); if (!c) return null;
    const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (!box) return false;
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy);
  return true;
}
async function takeProfitIfEnabled(page) {
  return await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.toLowerCase().includes('take profit') && !b.disabled);
    if (btn) { btn.click(); return true; } return false;
  });
}
async function startRound(page) {
  await clickText(page, 'ape in'); await wait(600);
  const scoped = await clickText(page, 'SEND IT', '[data-testid="vault-betentry-confirm"]');
  if (!scoped) await clickText(page, 'SEND IT');
  await wait(700);
  await clickText(page, 'MANUAL'); await wait(300);
}
async function census(page) {
  return await page.evaluate(() => {
    const q = (sel) => document.querySelectorAll(sel).length;
    const bodyText = document.body.innerText;
    return {
      gutterCardA: q('[data-testid="vault-gutter-card-a"]'),
      gutterCardARight: q('[data-testid="vault-gutter-card-a-right"]'),
      sessionPulseCount: (bodyText.match(/SESSION PULSE/g) || []).length,
      emptyPlaceholder: bodyText.toLowerCase().includes('no rounds yet'),
      newSetupButtons: [...document.querySelectorAll('button')].filter((b) => /new setup/i.test(b.textContent)).length,
      changeModeButtons: [...document.querySelectorAll('button')].filter((b) => /change mode/i.test(b.textContent)).length,
    };
  });
}

async function runViewport(browser, viewport, tag) {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  await page.setViewport(viewport);
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(700);

  // CP0 — COLD, before any interaction (0 rounds, lobby/idle)
  const censusCold = await census(page);
  await page.screenshot({ path: `${OUT}/${tag}-00-cold.png` });

  // CP1 — round 1 in flight, 0 settled
  await startRound(page); await wait(400);
  const censusZero = await census(page);
  await page.screenshot({ path: `${OUT}/${tag}-01-zero-rounds-playing.png` });

  // settle round 1
  outer: for (let gx = 1; gx <= 9; gx++) for (let gy = 1; gy <= 9; gy++) {
    if (await isSettled(page)) break outer;
    await clickCanvasFraction(page, gx / 10, gy / 10); await wait(160);
  }
  if (!(await isSettled(page))) await takeProfitIfEnabled(page);
  await wait(900);
  const settled1 = await isSettled(page);
  const censusSettled = await census(page);
  await page.screenshot({ path: `${OUT}/${tag}-02-settled.png` });

  // CP3 — bet again into round 2 (1 round of history)
  await clickText(page, 'bet again'); await wait(700);
  const censusOne = await census(page);
  await page.screenshot({ path: `${OUT}/${tag}-03-one-round-playing.png` });

  await page.close();
  return { tag, censusCold, censusZero, settled1, censusSettled, censusOne, pageErrors };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--window-size=1500,1000'] });
  const desktop = await runViewport(browser, { width: 1440, height: 900, deviceScaleFactor: 1 }, 'desktop');
  const mobile = await runViewport(browser, { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, 'mobile');
  console.log(JSON.stringify({ desktop, mobile }, null, 2));
  await browser.close();
})();
