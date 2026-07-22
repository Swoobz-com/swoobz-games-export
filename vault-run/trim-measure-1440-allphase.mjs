import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5183';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase())
      || els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, t);
  const el = h.asElement(); if (!el) return false; await el.click(); return true;
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
async function toLobby(page) { await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' }); await wait(500); }
async function toBetEntry(page) { await toLobby(page); await clickText(page, 'ape in'); await wait(500); }
async function toPlaying(page) { await toBetEntry(page); await clickText(page, 'send it'); await wait(900); }
async function toSettled(page) {
  await toPlaying(page);
  let taps = 0;
  for (let gx = 1; gx <= 9 && !(await isSettled(page)); gx++) {
    for (let gy = 1; gy <= 9; gy++) {
      if (await isSettled(page)) break;
      await clickCanvasFraction(page, gx / 10, gy / 10);
      taps++; await wait(230);
      if (taps >= 3) { const t = await clickText(page, 'take profit'); if (t) await wait(800); }
      if (await isSettled(page)) break;
    }
  }
  await wait(500);
}
async function measure(page, tag) {
  const data = await page.evaluate(() => {
    const doc = document.documentElement;
    const col = document.querySelector('[data-testid="vault-control-column"]');
    return {
      pageScrollHeight: doc.scrollHeight, innerHeight: window.innerHeight,
      pageNoVScroll: doc.scrollHeight === window.innerHeight,
      scrollWidth: doc.scrollWidth, innerWidth: window.innerWidth,
      pageNoHScroll: doc.scrollWidth === window.innerWidth,
      colOverflow: col ? col.scrollHeight - col.clientHeight : null,
      colWidths: col ? [...col.children].map(c => Math.round(c.getBoundingClientRect().width)) : null,
    };
  });
  console.log(`${tag}:`, JSON.stringify(data));
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await toLobby(page); await wait(400); await measure(page, 'LOBBY@1440');
  await toBetEntry(page); await wait(400); await measure(page, 'BETENTRY@1440');
  await toPlaying(page); await wait(400); await measure(page, 'PLAYING@1440');
  await toSettled(page); await measure(page, 'SETTLED@1440');
  await browser.close();
})();
