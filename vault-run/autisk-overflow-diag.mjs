import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5187';
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
const inPlaying = (p)=>p.evaluate(()=>!!document.querySelector('[data-testid="vault-playing-actions"]'))
  .catch(()=>p.evaluate(()=>!!document.querySelector('canvas')));
async function toPlaying(page){
  await page.goto(`http://localhost:${PORT}/`, {waitUntil:'networkidle0'}); await wait(600);
  await clickText(page,'ape in'); await wait(600);
  await clickText(page,'SEND IT','[data-testid="vault-betentry-confirm"]'); await wait(700);
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  // 1440 playing — vertical contributors
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await toPlaying(page); await wait(400);
  const v = await page.evaluate(() => {
    const doc = document.documentElement;
    const page = document.querySelector('[data-testid="vault-canvas-shell"]')?.closest('div[style]');
    const kids = [...(document.body.firstElementChild?.children || [])].map(el => {
      const r = el.getBoundingClientRect();
      return { tag: el.tagName, tid: el.getAttribute('data-testid'), top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) };
    });
    // footer specifically
    const footer = [...document.querySelectorAll('div')].find(d => /safe compartments/i.test(d.textContent||'') && d.children.length <= 4);
    return { sh: doc.scrollHeight, ch: doc.clientHeight, sw: doc.scrollWidth, cw: doc.clientWidth, kids };
  });
  console.log('=== 1440 PLAYING vertical ===');
  console.log(JSON.stringify(v, null, 2));
  // 390 playing — horizontal overflow contributors
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await toPlaying(page); await wait(400);
  const h = await page.evaluate(() => {
    const doc = document.documentElement;
    const cw = doc.clientWidth;
    const wide = [];
    for (const el of document.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.right > cw + 0.5 || r.left < -0.5) {
        wide.push({ tag: el.tagName, tid: el.getAttribute('data-testid'), cls: (el.className||'').toString().slice(0,30), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width) });
      }
    }
    return { sw: doc.scrollWidth, cw, iw: window.innerWidth, wide: wide.slice(0, 25) };
  });
  console.log('=== 390 PLAYING horizontal overflow (elements past clientWidth) ===');
  console.log(JSON.stringify(h, null, 2));
  await browser.close();
})();
