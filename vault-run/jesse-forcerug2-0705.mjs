// jesse-forcerug2-0705.mjs — force a real RUG loss, detect via settled panel (not footer text).
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5781';
const OUT = 'shots-jesse-revert-0705/loss';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log(...a);
async function clickText(page, t){ const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button],a')];const n=e=>(e.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();return els.find(e=>e.offsetParent!==null&&!e.disabled&&n(e)===t.toLowerCase())||els.find(e=>e.offsetParent!==null&&!e.disabled&&n(e).includes(t.toLowerCase()));},t); const el=h.asElement(); if(!el) return false; await el.click(); return true; }
async function phase(page){ return page.evaluate(()=>{ const t=(document.body.innerText||''); const m=t.match(/SETTLED\s*·?\s*(WIN|LOSS)/i); if(m) return 'SETTLED-'+m[1].toUpperCase(); if(/\bPUMPING\b/.test(t)) return 'PUMPING'; if(/BET ENTRY/.test(t)) return 'BETENTRY'; return 'OTHER'; }); }
async function settledPanel(page){ return page.evaluate(()=> !!document.querySelector('[data-testid="vault-settledpanel"]') || !!document.querySelector('[data-testid="vault-settled-result"]')); }
async function clickCell(page,col,row,cols,rows){ const box=await page.evaluate(()=>{const c=document.querySelector('canvas');if(!c)return null;const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};}); if(!box)return; const fx=0.05+(col+0.5)/cols*0.9, fy=0.06+(row+0.5)/rows*0.82; await page.mouse.click(box.x+box.w*fx, box.y+box.h*fy); }
async function run(){
  const browser=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--no-sandbox','--force-device-scale-factor=1'],defaultViewport:{width:1440,height:900,deviceScaleFactor:1}});
  const page=await browser.newPage();
  await page.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle2'}); await wait(2500);
  await clickText(page,'ape in'); await wait(1300);
  await clickText(page,'shitcoin'); await wait(400);
  await clickText(page,'send it'); await wait(1600);
  log('phase after send:', await phase(page));
  let done=false;
  outer: for(let row=0;row<7;row++) for(let col=0;col<7;col++){
    await clickCell(page,col,row,7,7); await wait(750);
    if(await settledPanel(page)){ done=true; log('SETTLED via panel at r'+row+'c'+col); break outer; }
    const ph=await phase(page); if(ph.startsWith('SETTLED')){ done=true; log('SETTLED via phase '+ph+' at r'+row+'c'+col); break outer; }
  }
  await wait(1500);
  await page.screenshot({path:`${OUT}/rug-settled-1440.png`});
  log('final phase:', await phase(page), '| panel:', await settledPanel(page), '| done:', done);
  await browser.close();
}
run().catch(e=>{console.error('FATAL',e);process.exit(1);});
