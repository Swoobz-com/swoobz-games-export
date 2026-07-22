// jesse-forcerug-0705.mjs — deterministically force a RUG loss on the high-rug world.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5781';
const OUT = 'shots-jesse-revert-0705/loss';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log(...a);
async function clickText(page, t, exact=false) {
  const h = await page.evaluateHandle((t, exact) => {
    const els = [...document.querySelectorAll('button,[role=button],a')];
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    return els.find(e => e.offsetParent !== null && !e.disabled && norm(e) === t.toLowerCase())
        || (!exact && els.find(e => e.offsetParent !== null && !e.disabled && norm(e).includes(t.toLowerCase())));
  }, t, exact);
  const el = h.asElement(); if (!el) return false; await el.click(); return true;
}
async function topbar(page){ return page.evaluate(()=> (document.body.innerText||'').split('\n').map(s=>s.trim()).filter(Boolean).slice(0,2).join(' | ')); }
async function settledKind(page){ return page.evaluate(()=>{ const t=(document.body.innerText||''); if(/SETTLED\s*·?\s*LOSS|RUG(GED)?/i.test(t)) return 'LOSS'; if(/SETTLED\s*·?\s*WIN/i.test(t)) return 'WIN'; return null; }); }
async function clickCanvasCell(page, col, row, cols, rows){
  const box = await page.evaluate(()=>{ const c=document.querySelector('canvas'); if(!c) return null; const r=c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; });
  if(!box) return; const fx=(col+0.5)/cols, fy=(row+0.5)/rows;
  await page.mouse.click(box.x+box.w*fx*0.92+box.w*0.04, box.y+box.h*fy*0.86+box.h*0.05);
}
async function run(){
  const browser = await puppeteer.launch({ executablePath: CHROME, headless:'new', args:['--no-sandbox','--force-device-scale-factor=1'], defaultViewport:{width:1440,height:900,deviceScaleFactor:1} });
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/`, {waitUntil:'networkidle2'}); await wait(2500);
  await clickText(page,'ape in'); await wait(1400);
  const picked = await clickText(page,'shitcoin'); await wait(500);
  log('picked shitcoin:', picked, '| pre-send topbar:', await topbar(page));
  await clickText(page,'send it'); await wait(1600);
  log('post-send topbar:', await topbar(page));
  // 7x7 grid; reveal distinct upper/middle cells one at a time, avoid bottom row (take-profit zone)
  let settled=null;
  outer: for(let row=0; row<5; row++){
    for(let col=0; col<7; col++){
      await clickCanvasCell(page, col, row, 7, 7); await wait(700);
      const k = await settledKind(page);
      if(k){ settled=k; log(`settled after r${row}c${col}:`, k); break outer; }
    }
  }
  await wait(1200);
  await page.screenshot({ path:`${OUT}/loss-settled-1440.png` });
  log('FINAL topbar:', await topbar(page), '| kind:', settled || await settledKind(page));
  await browser.close();
}
run().catch(e=>{console.error('FATAL',e);process.exit(1);});
