import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:1360,height:900,deviceScaleFactor:1},args:['--window-size=1400,980','--autoplay-policy=no-user-gesture-required']});
const page=(await browser.pages())[0];
await page.goto('http://localhost:5184/',{waitUntil:'networkidle2'});
await wait(2500);
async function texts(){return await page.evaluate(()=>{const o=[];const w=e=>{for(const n of e.childNodes){if(n.nodeType===3){const t=n.textContent.trim();if(t)o.push(t);}else if(n.nodeType===1){const s=getComputedStyle(n);if(s.display!=='none'&&s.visibility!=='hidden')w(n);}}};w(document.body);return o;});}
async function shot(name){await page.screenshot({path:'shots/'+name+'.png'});const t=await texts();console.log('['+name+'] '+t.slice(0,30).join(' | '));return t.join(' ').toLowerCase();}
async function clickText(t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];return els.find(e=>e.offsetParent!==null&&e.textContent.toLowerCase().includes(t.toLowerCase()));},t);const el=h.asElement();if(!el){console.log('NO BTN:',t);return false;}await el.click();return true;}
async function cellCenter(idx,gs){return await page.evaluate((idx,gridSize)=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();const W=r.width,H=r.height;const topReserved=H*0.15,bottomReserved=H*0.18,sideFrac=0.08;const safeW=W*(1-sideFrac*2);const safeH=(H-topReserved-bottomReserved)*0.96;const available=Math.min(safeW,safeH);const gap=Math.max(6,available*0.026);const tile=(available-gap*(gridSize-1))/gridSize;const full=tile*gridSize+gap*(gridSize-1);const x0=(W-full)/2;const bandCenterY=topReserved+(H-topReserved-bottomReserved)/2;const y0=bandCenterY-full/2;const col=idx%gridSize,row=Math.floor(idx/gridSize);return {cx:r.left+x0+col*(tile+gap)+tile/2,cy:r.top+y0+row*(tile+gap)+tile/2};},idx,gs);}
async function tapCell(idx,gs=5){const {cx,cy}=await cellCenter(idx,gs);await page.mouse.click(cx,cy);}

await shot('B00-cold');
// dismiss help if present (it may auto-show first run)
await clickText('got it'); await wait(500);
await shot('B01-afterGotIt');
// ape in
await clickText('ape in'); await wait(1000);
let s=await shot('B02-afterApeIn');
// maybe a bet-entry confirm needed
if(s.includes('confirm')||s.includes('place')||s.includes('deal')){await clickText('confirm')||await clickText('deal')||await clickText('place');await wait(800);s=await shot('B03-afterConfirm');}
// tap cells sequentially
for(let i=0;i<24;i++){
  await tapCell(i,5); await wait(550);
  s=await shot('B-tap'+String(i).padStart(2,'0'));
  if(s.includes('bust')||s.includes('rugged')||s.includes('view receipt')||s.includes('play again')||s.includes('ape in again')){console.log('>> round ended at tap',i);break;}
  // stop early to also test cash-out on a later session; here go till rug
}
await wait(800); await shot('B-end');
await browser.close();
