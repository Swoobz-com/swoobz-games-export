import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5187';
const OUT = 'shots-jesse-focus-0704';
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
  const el = h.asElement(); if (!el) return false; await el.click(); return true;
}
async function clickCanvasFraction(page, fx, fy) {
  const box = await page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  if (!box) return false; await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy); return true;
}
async function isSettled(page){return await page.evaluate(()=>!!document.querySelector('[data-testid="vault-settled-betagain"]'));}
async function clipEl(page, sel, tag, pad=16){
  const rect = await page.evaluate(({sel,pad})=>{const el=document.querySelector(sel);if(!el)return null;const r=el.getBoundingClientRect();return{x:Math.max(0,r.x-pad),y:Math.max(0,r.y-pad),width:r.width+pad*2,height:r.height+pad*2};},{sel,pad});
  if(rect){await page.screenshot({path:`${OUT}/${tag}.png`,clip:rect});return true;} return false;
}
async function reset(page){await page.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle0'});await wait(700);}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(String(e)));
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  // ---- DESKTOP: enter play, reveal a couple, capture RUG meter top-right region ----
  await reset(page);
  await clickText(page,'ape in'); await wait(700);
  // capture the sun/gear instant-reveal toggle tooltip area in bet-entry
  await clipEl(page,'[data-testid="vault-corner-gear"]','A-gear-icon',30);
  await clickText(page,'SEND IT'); await wait(900);
  await clickCanvasFraction(page,0.2,0.3); await wait(500);
  await clickCanvasFraction(page,0.5,0.3); await wait(500);
  // full playing shot
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await wait(300);
  await page.screenshot({path:`${OUT}/B-playing-full.png`});
  // clip top-right RUG meter region (around globe + rug bar)
  await page.screenshot({path:`${OUT}/C-rugmeter-crop.png`,clip:{x:1120,y:70,width:320,height:150}});
  // clip the right action card (MANUAL/TRAIL)
  await clipEl(page,'[data-testid="vault-playing-right"]','D-actioncard',20);
  // click TRAIL
  await clickText(page,'TRAIL'); await wait(600);
  await page.screenshot({path:`${OUT}/E-trail-full.png`});
  await clipEl(page,'[data-testid="vault-playing-right"]','E-trail-card',20);

  // ---- CHANGE MODE from settled ----
  await reset(page);
  await clickText(page,'ape in'); await wait(600);
  await clickText(page,'SEND IT'); await wait(800);
  await clickCanvasFraction(page,0.2,0.3); await wait(450);
  await clickText(page,'take profit'); await wait(1000);
  await page.screenshot({path:`${OUT}/F-settled-win-full.png`});
  await clickText(page,'change mode'); await wait(800);
  await page.screenshot({path:`${OUT}/G-after-changemode.png`});
  const afterCM = await page.evaluate(()=>({ids:[...document.querySelectorAll('[data-testid]')].map(e=>e.getAttribute('data-testid')).filter((v,i,a)=>a.indexOf(v)===i), title:(document.body.innerText.match(/BET ENTRY|PUMPING|SETTLED|READY/)||[])[0]}));
  fs.writeFileSync(`${OUT}/G-after-changemode.txt`,JSON.stringify(afterCM,null,2));

  // ---- SHITCOIN world (7x7) ----
  await reset(page);
  await clickText(page,'ape in'); await wait(700);
  await clickText(page,'SHITCOIN'); await wait(500);
  await page.screenshot({path:`${OUT}/H-shitcoin-betentry.png`});

  // ---- MOBILE proper flow ----
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await reset(page);
  await page.screenshot({path:`${OUT}/M1-mob-lobby.png`});
  await clickText(page,'ape in'); await wait(700);
  await page.screenshot({path:`${OUT}/M2-mob-betentry.png`});
  await clickText(page,'SEND IT'); await wait(900);
  await page.screenshot({path:`${OUT}/M3-mob-playing.png`});
  await clickCanvasFraction(page,0.3,0.3); await wait(500);
  await page.screenshot({path:`${OUT}/M4-mob-playing-1tile.png`});
  await clickText(page,'take profit'); await wait(1000);
  await page.screenshot({path:`${OUT}/M5-mob-settled.png`});
  const mobIds = await page.evaluate(()=>[...document.querySelectorAll('[data-testid]')].map(e=>e.getAttribute('data-testid')).filter((v,i,a)=>a.indexOf(v)===i));
  fs.writeFileSync(`${OUT}/M5-mob-ids.txt`,JSON.stringify(mobIds,null,2));

  fs.writeFileSync(`${OUT}/_errs.txt`,JSON.stringify(errs,null,2));
  console.log('DONE errs',errs.length);
  await browser.close();
})();
