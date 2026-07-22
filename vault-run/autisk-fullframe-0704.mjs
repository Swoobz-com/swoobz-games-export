import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5187';
const OUT = 'shots-autisk-0704-verify';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
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
const inPlaying = (p)=>p.evaluate(()=>!!document.querySelector('[data-testid="vault-playing-actions"]'));
const isSettled = (p)=>p.evaluate(()=>!!document.querySelector('[data-testid="vault-settled-betagain"]'));
async function toPlaying(page){
  await page.goto(`http://localhost:${PORT}/`, {waitUntil:'networkidle0'}); await wait(600);
  await clickText(page,'ape in'); await wait(600);
  await clickText(page,'SEND IT','[data-testid="vault-betentry-confirm"]'); await wait(700);
  return inPlaying(page);
}
// report any DOM overlap between gutter cards and the @400 SESSION PULSE stack
async function cardBoxes(page){
  return page.evaluate(()=>{
    const ids=['vault-playing-status','vault-playing-actions','vault-settled-result','vault-settled-meta','vault-settled-nextbet','vault-settled-betagain','vault-gutter-card-a','vault-gutter-card-a-right','vault-gutter-card-b','vault-gutter-card-c'];
    const out={};
    for(const id of ids){const el=document.querySelector(`[data-testid="${id}"]`);if(el&&el.offsetParent!==null){const r=el.getBoundingClientRect();out[id]={top:Math.round(r.top),bottom:Math.round(r.bottom),left:Math.round(r.left),right:Math.round(r.right)};}}
    return out;
  });
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--autoplay-policy=no-user-gesture-required','--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await toPlaying(page); await wait(500);
  await page.screenshot({ path: `${OUT}/full-playing-1440.png` });
  console.log('PLAYING cards:', JSON.stringify(await cardBoxes(page)));
  // settled
  let settled=false;
  for(let a=0;a<14 && !settled;a++){
    if(!(await toPlaying(page))) continue;
    const box = await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};});
    await page.mouse.click(box.x+box.w*0.5, box.y+box.h*0.42); await wait(650);
    if(await isSettled(page)){ settled=true; break; }
    await page.evaluate(()=>{const btn=[...document.querySelectorAll('[data-testid="vault-playing-actions"] button')].find(x=>/take profit/i.test(x.textContent));if(btn&&!btn.disabled)btn.click();});
    await wait(1000);
    if(await isSettled(page)) settled=true;
  }
  if(settled){ await wait(400); await page.screenshot({ path: `${OUT}/full-settled-1440.png` }); console.log('SETTLED cards:', JSON.stringify(await cardBoxes(page))); }
  // mobile playing full
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await toPlaying(page); await wait(500);
  await page.screenshot({ path: `${OUT}/full-playing-390.png` });
  await browser.close();
})();
