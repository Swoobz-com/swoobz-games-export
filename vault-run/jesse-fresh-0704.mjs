// jesse-fresh-0704.mjs — FRESH-PLAYER comprehension capture. Screenshots every
// phase (lobby, bet-entry, playing, settled win + rug) across desktop + mobile,
// dumps all visible text per phase, samples the gutter cards. Screen-only.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5187';
const OUT = process.argv[3] || 'shots-jesse-0704';
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
async function isSettled(page) {
  return await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-betagain"]'));
}
async function isPlaying(page) {
  return await page.evaluate(() => !!document.querySelector('[data-testid="vault-playing-actions"]'));
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
// Dump all visible text + key testids present
async function dumpScreen(page, tag) {
  const info = await page.evaluate(() => {
    const vis = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.opacity !== '0' && el.offsetParent !== null;
    };
    const testids = [...document.querySelectorAll('[data-testid]')].filter(vis).map((e) => e.getAttribute('data-testid'));
    // gutter cards specifically
    const gutters = [...document.querySelectorAll('[data-testid^="vault-gutter"],[data-testid*="-left"],[data-testid*="-right"]')]
      .filter(vis).map((e) => ({ id: e.getAttribute('data-testid'), text: e.innerText.replace(/\s+/g, ' ').trim().slice(0, 200) }));
    const buttons = [...document.querySelectorAll('button,[role=button]')].filter(vis).map((b) => b.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const bodyText = document.body.innerText.replace(/\n{2,}/g, '\n').trim();
    return { testids: [...new Set(testids)], gutters, buttons: [...new Set(buttons)], bodyText };
  });
  fs.writeFileSync(`${OUT}/${tag}.txt`, JSON.stringify(info, null, 2));
  return info;
}
async function shoot(page, tag) {
  await page.screenshot({ path: `${OUT}/${tag}.png`, fullPage: false });
}

async function reset(page) {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(700);
}

async function run(page, label) {
  // LOBBY
  await reset(page);
  await dumpScreen(page, `${label}-1-lobby`);
  await shoot(page, `${label}-1-lobby`);

  // BET ENTRY
  await clickText(page, 'ape in');
  await wait(800);
  await dumpScreen(page, `${label}-2-betentry`);
  await shoot(page, `${label}-2-betentry`);

  // PLAYING — send it, reveal a couple safe tiles
  await clickText(page, 'SEND IT', '[data-testid="vault-betentry-confirm"]');
  await wait(900);
  await dumpScreen(page, `${label}-3-playing-fresh`);
  await shoot(page, `${label}-3-playing-fresh`);

  // reveal 2 tiles
  await clickCanvasFraction(page, 0.2, 0.5);
  await wait(450);
  await clickCanvasFraction(page, 0.35, 0.5);
  await wait(450);
  if (!(await isSettled(page))) {
    await dumpScreen(page, `${label}-4-playing-2tiles`);
    await shoot(page, `${label}-4-playing-2tiles`);
    // WIN via take profit
    await takeProfitIfEnabled(page);
    await wait(1100);
  }
  await dumpScreen(page, `${label}-5-settled-win`);
  await shoot(page, `${label}-5-settled-win`);
}

async function runRug(page, label) {
  for (let attempt = 1; attempt <= 8; attempt++) {
    await reset(page);
    await clickText(page, 'ape in');
    await wait(700);
    await clickText(page, 'SEND IT', '[data-testid="vault-betentry-confirm"]');
    await wait(800);
    const spots = [];
    for (let gx = 1; gx <= 9; gx++) for (let gy = 1; gy <= 9; gy++) spots.push([gx / 10, gy / 10]);
    for (const [fx, fy] of spots) {
      if (await isSettled(page)) break;
      await clickCanvasFraction(page, fx, fy);
      await wait(240);
    }
    await wait(700);
    if (await isSettled(page)) {
      const body = await page.evaluate(() => document.body.innerText);
      if (/rug|rekt|floor fell|ngmi/i.test(body)) {
        await dumpScreen(page, `${label}-6-settled-rug`);
        await shoot(page, `${label}-6-settled-rug`);
        console.log(`[${label}] rug on attempt ${attempt}`);
        return true;
      }
    }
  }
  console.log(`[${label}] no rug in 8 attempts`);
  await dumpScreen(page, `${label}-6-settled-rug`);
  await shoot(page, `${label}-6-settled-rug`);
  return false;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));

  // DESKTOP
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await run(page, 'desk');
  await runRug(page, 'desk');

  // MOBILE
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await run(page, 'mob');
  await runRug(page, 'mob');

  fs.writeFileSync(`${OUT}/_errors.txt`, JSON.stringify(errs, null, 2));
  console.log('DONE. pageErrors:', errs.length);
  await browser.close();
})();
