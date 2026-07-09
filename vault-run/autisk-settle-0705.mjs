import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT=process.argv[2]||'5401'; const OUT=process.argv[3]||'shots-autisk-grid-0705';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function clickText(page,t,within){
  const h=await page.evaluateHandle(({t,within})=>{const root=within?document.querySelector(within):document;if(!root)return null;const els=[...root.querySelectorAll('button,[role=button]')];const lc=t.toLowerCase();return els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.trim().toLowerCase()===lc)||els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.toLowerCase().includes(lc))||null;},{t,within});
  const el=h.asElement();if(!el)return false;try{await el.click();}catch(e){return false;}return true;
}
async function box(page){return page.evaluate(()=>{const c=document.querySelector('canvas');if(!c)return null;const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};});}
async function ph(page){return page.evaluate(()=>{const b=document.querySelector('[data-testid="vault-settled-banner"]');const cap=document.querySelector('[data-testid="vault-board-caption"]');return{banner:b?b.textContent.trim():null,caption:cap?cap.textContent.trim():null};});}
(async()=>{
  const browser=await puppeteer.launch({executablePath:CHROME,headless:false,args:['--autoplay-policy=no-user-gesture-required','--window-size=1520,980']});
  const page=await browser.newPage(); await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
  await page.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle0'}); await wait(900);
  await clickText(page,'ape in'); await wait(700);
  // stay MANUAL (default). SEND IT
  let s=await clickText(page,'send it','[data-testid="vault-ctl-cta"]'); if(!s)s=await clickText(page,'send it'); await wait(800);
  // crack tiles manually — click a few tile centers, avoid rug hopefully. 5x5 bluechips 3 rugs.
  const bx=await box(page);
  const cells=[[0.1,0.1],[0.3,0.1],[0.5,0.1],[0.7,0.1]]; // top row, spread
  for(const [fx,fy] of cells){ await page.mouse.click(bx.x+bx.w*fx,bx.y+bx.h*fy); await wait(500); const st=await ph(page); if(st.caption&&/rugged/i.test(st.caption))break; }
  await wait(400);
  // take profit to settle as win (if still playing)
  await clickText(page,'take profit'); await wait(1600);
  const st1=await ph(page);
  await page.screenshot({path:`${OUT}/settle-1-banner.png`});
  // expand receipt
  await clickText(page,'view receipt'); await wait(500);
  const rec=await page.evaluate(()=>{const r=document.querySelector('[data-testid="vault-ctl-receipt"]');if(!r)return null;const rc=r.getBoundingClientRect();const body=document.getElementById('vault-settled-receipt');const bodyR=body?body.getBoundingClientRect():null;return{panelBottom:Math.round(rc.bottom),innerH:window.innerHeight,receiptRows:body?body.innerText.split('\n').length:0,bodyClipped:bodyR?(bodyR.bottom>window.innerHeight+1):null,bodyScrollable:body?(body.scrollHeight>body.clientHeight+1):null,expanded:!!body};});
  await page.screenshot({path:`${OUT}/settle-2-receipt.png`});
  console.log(JSON.stringify({settled:st1,receipt:rec},null,2));
  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
