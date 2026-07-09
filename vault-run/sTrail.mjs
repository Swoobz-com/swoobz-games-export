import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:1360,height:900,deviceScaleFactor:1},args:['--window-size=1400,980','--autoplay-policy=no-user-gesture-required']});
const page=(await browser.pages())[0];
await page.goto('http://localhost:5184/',{waitUntil:'networkidle2'});await wait(2500);
async function dom(){return page.evaluate(()=>[...document.querySelectorAll('button,[role=button]')].filter(e=>e.offsetParent).map(e=>e.textContent.trim().slice(0,22)));}
async function shot(n){await page.screenshot({path:'shots/'+n+'.png'});const b=await dom();console.log(n,'::',b.join(' / '));return b.join(' ').toLowerCase();}
async function clickText(t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];return els.find(e=>e.offsetParent!==null&&e.textContent.toLowerCase().includes(t.toLowerCase()));},t);const el=h.asElement();if(el){await el.click();return true;}return false;}
async function center(idx,gs){return page.evaluate((idx,gridSize)=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();const W=r.width,H=r.height;const tR=H*0.15,bR=H*0.18,sF=0.08;const sW=W*(1-sF*2);const sH=(H-tR-bR)*0.96;const av=Math.min(sW,sH);const gap=Math.max(6,av*0.026);const tile=(av-gap*(gridSize-1))/gridSize;const full=tile*gridSize+gap*(gridSize-1);const x0=(W-full)/2;const bcY=tR+(H-tR-bR)/2;const y0=bcY-full/2;const col=idx%gridSize,row=Math.floor(idx/gridSize);return {cx:r.left+x0+col*(tile+gap)+tile/2,cy:r.top+y0+row*(tile+gap)+tile/2};},idx,gs);}

await clickText('ape in');await wait(700);
await clickText('send it');await wait(1000);
await shot('T00-playstart');
// switch to TRAIL
await clickText('trail');await wait(500);
await shot('T01-trailmode');
// draw a path by hold+drag across cells 10,11,12,13 (a row)
const path=[10,11,12,13];
const pts=[];for(const i of path)pts.push(await center(i,5));
await page.mouse.move(pts[0].cx,pts[0].cy);
await page.mouse.down();
for(let i=0;i<pts.length;i++){await page.mouse.move(pts[i].cx,pts[i].cy,{steps:6});await wait(120);}
await page.mouse.up();
await wait(400);
await shot('T02-pathdrawn');
// GO
await clickText('go');await wait(2500);
const s=await shot('T03-afterGO');
console.log('AFTER GO includes bet-again?',s.includes('bet again'),' take-profit?',s.includes('take profit'),' manual/trail?',s.includes('trail'));
await wait(800);await shot('T04-afterGO-settled');
await browser.close();
