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
async function geom(page){
  return page.evaluate(() => {
    const g = document.querySelector('[data-testid="vault-corner-world"]');
    const c = document.querySelector('canvas');
    const gr = g && g.getBoundingClientRect();
    const cr = c && c.getBoundingClientRect();
    // HUD right anchor in canvas-local px = canvasWidth - inset(60 desktop)
    const inset = 60;
    const hudRightEdgePage = cr ? cr.right - inset : null; // page-x where HUD text right edge sits
    return {
      globe: gr ? { left:+gr.left.toFixed(1), right:+gr.right.toFixed(1), top:+gr.top.toFixed(1), bottom:+gr.bottom.toFixed(1) } : null,
      canvas: cr ? { left:+cr.left.toFixed(1), right:+cr.right.toFixed(1), top:+cr.top.toFixed(1), width:+cr.width.toFixed(1) } : null,
      hudRightEdgePage: hudRightEdgePage!=null? +hudRightEdgePage.toFixed(1):null,
    };
  });
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--autoplay-policy=no-user-gesture-required','--no-sandbox'] });
  const page = await browser.newPage();
  const report = {};
  // ---- 1440 PLAYING ----
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await toPlaying(page); await wait(500);
  const gp = await geom(page);
  report.playing1440 = { ...gp, clearance_hudRight_to_globeLeft: gp.globe && gp.hudRightEdgePage!=null ? +(gp.globe.left - gp.hudRightEdgePage).toFixed(1) : null };
  // crops (dpr2 → multiply by 2 for clip in CSS px; puppeteer clip is CSS px)
  await page.screenshot({ path: `${OUT}/playing1440-TR.png`, clip: { x: gp.canvas.right-260, y: gp.canvas.top, width: 260, height: 130 } });
  await page.screenshot({ path: `${OUT}/playing1440-TL.png`, clip: { x: gp.canvas.left, y: gp.canvas.top, width: 320, height: 210 } });
  // ---- 1440 SETTLED (win or rug) ----
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
  if(settled){
    await wait(400);
    const gs = await geom(page);
    report.settled1440 = { ...gs, clearance_hudRight_to_globeLeft: gs.globe && gs.hudRightEdgePage!=null ? +(gs.globe.left - gs.hudRightEdgePage).toFixed(1) : null };
    await page.screenshot({ path: `${OUT}/settled1440-TR.png`, clip: { x: gs.canvas.right-260, y: gs.canvas.top, width: 260, height: 130 } });
    await page.screenshot({ path: `${OUT}/settled1440-TL.png`, clip: { x: gs.canvas.left, y: gs.canvas.top, width: 340, height: 220 } });
    // count bet again buttons
    report.settled1440.betAgainButtons = await page.evaluate(()=>[...document.querySelectorAll('button')].filter(b=>/bet again/i.test(b.textContent)&&b.offsetParent!==null).map(b=>{let a=b,t=null;while(a&&a!==document.body){if(a.dataset&&a.dataset.testid){t=a.dataset.testid;break;}a=a.parentElement;}return{text:b.textContent.trim(),tid:t};}));
  } else { report.settled1440 = 'could not reach settled'; }
  fs.writeFileSync(`${OUT}/_verify.json`, JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  await browser.close();
})();
