import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:1360,height:900,deviceScaleFactor:2},args:['--window-size=1400,980','--autoplay-policy=no-user-gesture-required']});
const page=(await browser.pages())[0];
await page.goto('http://localhost:5184/',{waitUntil:'networkidle2'});
await wait(2800);
async function clickText(t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];return els.find(e=>e.textContent.trim().toLowerCase()===t.toLowerCase())||els.find(e=>e.textContent.toLowerCase().includes(t.toLowerCase()));},t);const el=h.asElement();if(!el)return false;await el.click();return true;}
async function texts(){return await page.evaluate(()=>{const o=[];const w=e=>{for(const n of e.childNodes){if(n.nodeType===3){const t=n.textContent.trim();if(t)o.push(t);}else if(n.nodeType===1){const s=getComputedStyle(n);if(s.display!=='none'&&s.visibility!=='hidden')w(n);}}};w(document.body);return o;});}
async function cellCenter(idx){return await page.evaluate((idx)=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();const W=r.width,H=r.height;const gridSize=5;const topReserved=H*0.15,bottomReserved=H*0.18,sideFrac=0.08;const safeW=W*(1-sideFrac*2);const safeH=(H-topReserved-bottomReserved)*0.96;const available=Math.min(safeW,safeH);const gap=Math.max(6,available*0.026);const tile=(available-gap*(gridSize-1))/gridSize;const full=tile*gridSize+gap*(gridSize-1);const x0=(W-full)/2;const bandCenterY=topReserved+(H-topReserved-bottomReserved)/2;const y0=bandCenterY-full/2;const col=idx%gridSize,row=Math.floor(idx/gridSize);const cx=r.left+x0+col*(tile+gap)+tile/2;const cy=r.top+y0+row*(tile+gap)+tile/2;return {cx,cy};},idx);}
async function tapCell(idx){const {cx,cy}=await cellCenter(idx);await page.mouse.click(cx,cy);}
async function isSettled(){const t=(await texts()).join(' ').toLowerCase();return t.includes('bet again')||t.includes('ownership points');}
await clickText('ape in');await wait(800);await clickText('send it');await wait(1200);
let ended=false;const order=[12,0,4,20,24,2,10,14,22,6,8,16,18,1,3,5,7,9,11,13,15,17,19,21,23];
for(const i of order){if(ended)break;await tapCell(i);await wait(420);if(await isSettled())ended=true;}
await wait(700);
// clip the right action bar and bottom-left history
const clip=await page.evaluate(()=>{const b=[...document.querySelectorAll('*')].find(e=>/BUST/.test(e.textContent)&&e.getBoundingClientRect().width<600&&e.getBoundingClientRect().right>window.innerWidth*0.6);return null;});
await page.screenshot({path:'shots/R2-fullhi.png'});
// crop right action bar
await page.screenshot({path:'shots/R2-actionbar.png',clip:{x:900,y:430,width:460,height:320}});
// crop bottom-left history strip
await page.screenshot({path:'shots/R2-history.png',clip:{x:0,y:820,width:520,height:80}});
console.log('SETTLE TEXT:',(await texts()).join(' | '));
await browser.close();console.log('DONE');
