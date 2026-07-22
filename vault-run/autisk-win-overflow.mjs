import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5187';
const OUT = 'shots-autisk-0704';
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
const isSettled = (p)=>p.evaluate(()=>!!document.querySelector('[data-testid="vault-settled-betagain"]'));
const inPlaying = (p)=>p.evaluate(()=>!!document.querySelector('[data-testid="vault-playing-actions"]'));
const inBet = (p)=>p.evaluate(()=>!!document.querySelector('[data-testid="vault-betentry-confirm"]'));
async function clickCell(page, fx, fy) {
  const box = await page.evaluate(() => { const c=document.querySelector('canvas'); if(!c) return null; const r=c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; });
  if (!box) return; await page.mouse.click(box.x + box.w*fx, box.y + box.h*fy); }
async function takeProfit(page) {
  return page.evaluate(() => { const b=[...document.querySelectorAll('[data-testid="vault-playing-actions"] button')].find(x=>x.textContent.toLowerCase().includes('take profit')); if(b&&!b.disabled){b.click();return true;} return false; });
}
async function overflow(page){ return page.evaluate(()=>({ sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth, iw:window.innerWidth, bsw:document.body.scrollWidth, sh:document.documentElement.scrollHeight, ch:document.documentElement.clientHeight })); }
async function toPlaying(page){
  await page.goto(`http://localhost:${PORT}/`, {waitUntil:'networkidle0'}); await wait(600);
  await clickText(page,'ape in'); await wait(600);
  if(!(await inBet(page))) return false;
  await clickText(page,'SEND IT','[data-testid="vault-betentry-confirm"]'); await wait(700);
  return await inPlaying(page);
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false,
    args: ['--autoplay-policy=no-user-gesture-required','--no-sandbox'] });
  const page = await browser.newPage();
  const report = { overflow: {}, win: {} };
  // OVERFLOW across viewports on the PLAYING phase (widest content)
  for (const vp of [{n:'1440',w:1440,h:900,d:1},{n:'1920',w:1920,h:1080,d:1},{n:'390',w:390,h:844,d:2}]) {
    await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: vp.d });
    await toPlaying(page); await wait(400);
    report.overflow[vp.n+'-playing'] = await overflow(page);
    // also lobby
    await page.goto(`http://localhost:${PORT}/`, {waitUntil:'networkidle0'}); await wait(500);
    report.overflow[vp.n+'-lobby'] = await overflow(page);
  }
  // REAL WIN at 1440: reveal ONE cell, take profit; retry
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  const cells = [[0.5,0.5],[0.3,0.3],[0.7,0.7],[0.5,0.3],[0.3,0.7],[0.7,0.3],[0.5,0.7],[0.3,0.5]];
  let won = false;
  for (let a=0; a<12 && !won; a++) {
    if(!(await toPlaying(page))) continue;
    await clickCell(page, cells[a%cells.length][0], cells[a%cells.length][1]);
    await wait(650);
    if (await isSettled(page)) continue; // rugged on first tile
    const tp = await takeProfit(page);
    await wait(1100);
    if (await isSettled(page)) {
      const txt = await page.evaluate(()=>document.body.innerText);
      if (/won|secured|bagged|riches|profit|\+/i.test(txt) && !/rugged|bust/i.test(txt.split('BALANCE')[0]||txt)) { won = true; }
      // capture regardless if not a rug
      const isRug = await page.evaluate(()=>/rugged|bust|down horrendous/i.test((document.querySelector('[data-testid="vault-settled-result"]')?.innerText)||''));
      if (!isRug) { won = true; }
    }
    if (won) { await page.screenshot({ path: `${OUT}/1440-REALWIN.png` }); }
  }
  report.win.won1440 = won;
  // mobile real win
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  let mwon=false;
  for (let a=0; a<10 && !mwon; a++) {
    if(!(await toPlaying(page))) continue;
    await clickCell(page, 0.5, 0.35); await wait(650);
    if (await isSettled(page)) continue;
    await takeProfit(page); await wait(1000);
    if (await isSettled(page)) {
      const isRug = await page.evaluate(()=>/rugged|bust|down horrendous/i.test((document.querySelector('[data-testid="vault-settled-result"]')?.innerText)||document.body.innerText));
      if(!isRug){ mwon=true; await page.screenshot({ path: `${OUT}/390-REALWIN.png` }); }
    }
  }
  report.win.won390 = mwon;
  fs.writeFileSync(`${OUT}/_win_overflow.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})();
