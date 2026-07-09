import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:1360,height:900,deviceScaleFactor:1},args:['--window-size=1400,980','--autoplay-policy=no-user-gesture-required']});
const page=(await browser.pages())[0];
await page.goto('http://localhost:5184/',{waitUntil:'networkidle2'});await wait(2500);
async function dom(){return page.evaluate(()=>[...document.querySelectorAll('button,[role=button]')].filter(e=>e.offsetParent).map(e=>e.textContent.trim().slice(0,20)));}
async function shot(n){await page.screenshot({path:'shots/'+n+'.png'});const b=await dom();return b.join(' ').toLowerCase();}
async function clickText(t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];return els.find(e=>e.offsetParent!==null&&e.textContent.toLowerCase().includes(t.toLowerCase()));},t);const el=h.asElement();if(el){await el.click();return true;}return false;}
async function tapCell(idx,gs=5){const p=await page.evaluate((idx,gridSize)=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();const W=r.width,H=r.height;const tR=H*0.15,bR=H*0.18,sF=0.08;const sW=W*(1-sF*2);const sH=(H-tR-bR)*0.96;const av=Math.min(sW,sH);const gap=Math.max(6,av*0.026);const tile=(av-gap*(gridSize-1))/gridSize;const full=tile*gridSize+gap*(gridSize-1);const x0=(W-full)/2;const bcY=tR+(H-tR-bR)/2;const y0=bcY-full/2;const col=idx%gridSize,row=Math.floor(idx/gridSize);return {cx:r.left+x0+col*(tile+gap)+tile/2,cy:r.top+y0+row*(tile+gap)+tile/2};},idx,gs);await page.mouse.click(p.cx,p.cy);}

// retry rounds until we get 2 safe taps then cash out
const cells=[12,6,8,16,18,2,22,10,0,4,20,24,1,3,5];
let won=false;
for(let attempt=0;attempt<8 && !won;attempt++){
  await clickText('ape in');await wait(700);
  await clickText('send it');await wait(1000);
  let safe=0;
  for(let k=0;k<cells.length;k++){
    await tapCell(cells[k]);await wait(500);
    const s=await dom();const j=s.join(' ').toLowerCase();
    if(j.includes('view receipt')||j.includes('bet again')){ // rugged
      await shot('W-bust-attempt'+attempt);
      await clickText('bet again');await wait(700);
      break;
    }
    safe++;
    if(safe>=2){
      await shot('Wplay-beforeCash-a'+attempt);
      await clickText('take profit');await wait(1100);
      await shot('W-wonSettle');
      won=true;break;
    }
  }
}
console.log('won=',won);
if(won){ if(await clickText('view receipt')){await wait(700);await shot('W-receipt');} }
await browser.close();
