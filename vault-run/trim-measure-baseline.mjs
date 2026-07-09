import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5183';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickText(page, t, within) {
  const h = await page.evaluateHandle(({ t, within }) => {
    const root = within ? document.querySelector(within) : document;
    if (!root) return null;
    const els = [...root.querySelectorAll('button,[role=button]')];
    return els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase())
      || els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, { t, within });
  const el = h.asElement(); if (!el) return false; await el.click(); return true;
}

async function toLobby(page) {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
}
async function toBetEntry(page) {
  await toLobby(page);
  await clickText(page, 'ape in'); await wait(500);
}
async function toPlaying(page) {
  await toBetEntry(page);
  await clickText(page, 'send it'); await wait(900);
}
async function isSettled(page) {
  return page.evaluate(() =>
    !!document.querySelector('[data-testid="vault-settled-banner"]') ||
    !!document.querySelector('[data-testid="vault-settledpanel"]'));
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
async function toSettled(page) {
  await toPlaying(page);
  let taps = 0;
  for (let gx = 1; gx <= 9 && !(await isSettled(page)); gx++) {
    for (let gy = 1; gy <= 9; gy++) {
      if (await isSettled(page)) break;
      await clickCanvasFraction(page, gx / 10, gy / 10);
      taps++;
      await wait(230);
      if (taps >= 3) { const t = await clickText(page, 'take profit'); if (t) await wait(800); }
      if (await isSettled(page)) break;
    }
  }
  await wait(500);
}

async function measure(page, W, H, tag) {
  const data = await page.evaluate(() => {
    const doc = document.documentElement;
    const col = document.querySelector('[data-testid="vault-control-column"]');
    let colInfo = null;
    if (col) {
      const panels = [...col.children].map((c) => {
        const r = c.getBoundingClientRect();
        return { tid: c.getAttribute('data-testid'), w: Math.round(r.width), h: Math.round(r.height) };
      });
      colInfo = {
        scrollHeight: col.scrollHeight,
        clientHeight: col.clientHeight,
        overflow: col.scrollHeight - col.clientHeight,
        panels,
      };
    }
    const sendIt = [...document.querySelectorAll('button')].find(b => /send it/i.test(b.textContent||''));
    let sendItInfo = null;
    if (sendIt) {
      const r = sendIt.getBoundingClientRect();
      sendItInfo = { top: Math.round(r.top), bottom: Math.round(r.bottom), aboveFold: r.bottom <= window.innerHeight };
    }
    return {
      pageScrollHeight: doc.scrollHeight,
      innerHeight: window.innerHeight,
      pageNoScroll: doc.scrollHeight === window.innerHeight,
      col: colInfo,
      sendIt: sendItInfo,
    };
  });
  console.log(`=== ${tag} @ ${W}x${H} ===`);
  console.log(JSON.stringify(data, null, 2));
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await toBetEntry(page); await wait(400);
  await measure(page, 1440, 900, 'BET-ENTRY');

  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await toBetEntry(page); await wait(400);
  await measure(page, 1920, 1080, 'BET-ENTRY');

  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await toLobby(page); await wait(400);
  await measure(page, 1440, 900, 'LOBBY');

  await toPlaying(page); await wait(400);
  await measure(page, 1440, 900, 'PLAYING');

  await toSettled(page);
  await measure(page, 1440, 900, 'SETTLED');

  await browser.close();
})();
