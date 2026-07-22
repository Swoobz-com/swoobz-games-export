import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:1360,height:900,deviceScaleFactor:1},args:['--window-size=1400,980','--autoplay-policy=no-user-gesture-required']});
const page=(await browser.pages())[0];
await page.goto('http://localhost:5184/',{waitUntil:'networkidle2'});await wait(2500);
async function dom(){return page.evaluate(()=>[...document.querySelectorAll('button,[role=button]')].filter(e=>e.offsetParent).map(e=>e.textContent.trim().slice(0,20)));}
async function shot(n){await page.screenshot({path:'shots/'+n+'.png'});return (await dom()).join(' ').toLowerCase();}
async function clickText(t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];return els.find(e=>e.offsetParent!==null&&e.textContent.toLowerCase().includes(t.toLowerCase()));},t);const el=h.asElement();if(el){await el.click();return true;}return false;}
async function tapCell(idx,gs){const p=await page.evaluate((idx,gridSize)=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();const W=r.width,H=r.height;const tR=H*0.15,bR=H*0.18,sF=0.08;const sW=W*(1-sF*2);const sH=(H-tR-bR)*0.96;const av=Math.min(sW,sH);const gap=Math.max(6,av*0.026);const tile=(av-gap*(gridSize-1))/gridSize;const full=tile*gridSize+gap*(gridSize-1);const x0=(W-full)/2;const bcY=tR+(H-tR-bR)/2;const y0=bcY-full/2;const col=idx%gridSize,row=Math.floor(idx/gridSize);return {cx:r.left+x0+col*(tile+gap)+tile/2,cy:r.top+y0+row*(tile+gap)+tile/2};},idx,gs);await page.mouse.click(p.cx,p.cy);}

await clickText('ape in');await wait(700);
await clickText('shitcoin');await wait(400);
await shot('S00-betentry-shit');
await clickText('send it');await wait(1100);
await shot('S01-playstart-shit');
// tap first cell to show gauge (~49%) and one green coin
await tapCell(24,7);await wait(600);
await shot('S02-firsttap-shit');
// try several rounds to reveal MOON
let moon=false;
for(let a=0;a<14 && !moon;a++){
  // in each fresh round tap a spread of cells
  const cells=[0,6,42,48,24,10,38,3,45,17,31,21,27,14,34];
  for(const cc of cells){
    await tapCell(cc,7);await wait(220);
    const s=await dom();const j=s.join(' ').toLowerCase();
    if(j.includes('bet again')||j.includes('view receipt')){break;}
  }
  // screenshot end of this round
  const s=await shot('S-round'+a);
  // detect moon by scanning canvas pixel? just cash out if possible then check
  if(!(s.includes('bet again'))){await clickText('take profit');await wait(900);await shot('S-round'+a+'-cash');}
  // check for MOON text
  const jj=(await dom()).join(' ').toLowerCase();
  await clickText('bet again')||await clickText('ape in');await wait(500);
  await clickText('shitcoin');await wait(200);await clickText('send it');await wait(800);
}
await browser.close();
