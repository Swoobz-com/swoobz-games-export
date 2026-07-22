import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:1360,height:900,deviceScaleFactor:1},args:['--window-size=1400,980','--autoplay-policy=no-user-gesture-required']});
const page=(await browser.pages())[0];
await page.goto('http://localhost:5184/',{waitUntil:'networkidle2'});
await wait(3000);

async function texts(){return await page.evaluate(()=>{const o=[];const w=e=>{for(const n of e.childNodes){if(n.nodeType===3){const t=n.textContent.trim();if(t)o.push(t);}else if(n.nodeType===1){const s=getComputedStyle(n);if(s.display!=='none'&&s.visibility!=='hidden')w(n);}}};w(document.body);return o;});}
async function shot(name){await page.screenshot({path:'shots/'+name+'.png'});const t=await texts();console.log('['+name+'] '+t.join(' | '));}
async function clickText(t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];return els.find(e=>e.textContent.toLowerCase().includes(t.toLowerCase()));},t);const el=h.asElement();if(!el){console.log('NO BTN:',t);return false;}await el.click();return true;}
async function cellCenter(idx){return await page.evaluate((idx)=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();const W=r.width,H=r.height;
  // need gridSize: infer from window if exposed else default; try 5
  const gridSize=window.__vaultGrid||5;
  const topReserved=H*0.15,bottomReserved=H*0.18,sideFrac=0.08;const safeW=W*(1-sideFrac*2);const safeH=(H-topReserved-bottomReserved)*0.96;const available=Math.min(safeW,safeH);const gap=Math.max(6,available*0.026);const tile=(available-gap*(gridSize-1))/gridSize;const full=tile*gridSize+gap*(gridSize-1);const x0=(W-full)/2;const bandCenterY=topReserved+(H-topReserved-bottomReserved)/2;const y0=bandCenterY-full/2;const col=idx%gridSize,row=Math.floor(idx/gridSize);const cx=r.left+x0+col*(tile+gap)+tile/2;const cy=r.top+y0+row*(tile+gap)+tile/2;return {cx,cy};},idx);}
async function tapCell(idx){const {cx,cy}=await cellCenter(idx);await page.mouse.click(cx,cy);}

await shot('A00-cold');
// open help
if(await clickText('?')){await wait(600);await shot('A01-help');await page.keyboard.press('Escape');await wait(400);}
// ape in
await clickText('ape in');
await wait(1200);
await shot('A02-afterApeIn');
// tap cells sequentially, capture each
for(let i=0;i<24;i++){
  await tapCell(i);
  await wait(500);
  const t=await texts();
  await shot('A-tap'+String(i).padStart(2,'0'));
  const joined=t.join(' ').toLowerCase();
  if(joined.includes('bust')||joined.includes('rug')&&joined.includes('again')||joined.includes('receipt')||joined.includes('settled')){console.log('>> ended at tap',i);break;}
}
await wait(800);
await shot('A-final');
await browser.close();
