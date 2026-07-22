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
async function toPlaying(page){
  await page.goto(`http://localhost:${PORT}/`, {waitUntil:'networkidle0'}); await wait(600);
  await clickText(page,'ape in'); await wait(600);
  await clickText(page,'SEND IT','[data-testid="vault-betentry-confirm"]'); await wait(700);
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  for (const phase of ['lobby','playing']) {
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    if (phase === 'playing') await toPlaying(page);
    else { await page.goto(`http://localhost:${PORT}/`, {waitUntil:'networkidle0'}); await wait(600); }
    await wait(400);
    const v = await page.evaluate(() => {
      const doc = document.documentElement;
      // find the page column: the flex column with a headerTape child
      let pageCol = null;
      for (const d of document.querySelectorAll('div')) {
        if ([...d.children].some(c => /RUG OR RICHES/i.test(c.textContent||'') ) && getComputedStyle(d).flexDirection==='column') { pageCol = d; break; }
      }
      const cs = pageCol ? getComputedStyle(pageCol) : null;
      const kids = pageCol ? [...pageCol.children].filter(c=>c.getBoundingClientRect().height>0).map(el => {
        const r = el.getBoundingClientRect();
        return { tag: el.tagName, tid: el.getAttribute('data-testid'), h: Math.round(r.height*10)/10, txt: (el.textContent||'').trim().slice(0,24) };
      }) : [];
      return { sh: doc.scrollHeight, gap: cs?.gap, pad: cs?.padding, pageH: pageCol? Math.round(pageCol.getBoundingClientRect().height) : null, kids };
    });
    console.log(`=== 1440 ${phase} ===`);
    console.log(JSON.stringify(v, null, 2));
  }
  await browser.close();
})();
