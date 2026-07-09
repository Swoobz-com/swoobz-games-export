import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:1360,height:900,deviceScaleFactor:1},args:['--window-size=1400,980','--autoplay-policy=no-user-gesture-required']});
const page=(await browser.pages())[0];
await page.goto('http://localhost:5184/',{waitUntil:'networkidle2'});
await wait(3000);
const S='shots/';
async function texts(){return await page.evaluate(()=>{const o=[];const w=e=>{for(const n of e.childNodes){if(n.nodeType===3){const t=n.textContent.trim();if(t)o.push(t);}else if(n.nodeType===1){const s=getComputedStyle(n);if(s.display!=='none'&&s.visibility!=='hidden')w(n);}}};w(document.body);return o;});}
async function shot(name){await page.screenshot({path:S+name+'.png'});}
async function clickText(t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];return els.find(e=>e.textContent.trim().toLowerCase()===t.toLowerCase())||els.find(e=>e.textContent.toLowerCase().includes(t.toLowerCase()));},t);const el=h.asElement();if(!el){console.log('NO BTN:',t);return false;}await el.click();return true;}
async function btns(){return await page.evaluate(()=>[...document.querySelectorAll('button,[role=button]')].map(e=>e.textContent.trim().slice(0,30)).filter(Boolean));}
async function cellCenter(idx){return await page.evaluate((idx)=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();const W=r.width,H=r.height;const gridSize=5;const topReserved=H*0.15,bottomReserved=H*0.18,sideFrac=0.08;const safeW=W*(1-sideFrac*2);const safeH=(H-topReserved-bottomReserved)*0.96;const available=Math.min(safeW,safeH);const gap=Math.max(6,available*0.026);const tile=(available-gap*(gridSize-1))/gridSize;const full=tile*gridSize+gap*(gridSize-1);const x0=(W-full)/2;const bandCenterY=topReserved+(H-topReserved-bottomReserved)/2;const y0=bandCenterY-full/2;const col=idx%gridSize,row=Math.floor(idx/gridSize);const cx=r.left+x0+col*(tile+gap)+tile/2;const cy=r.top+y0+row*(tile+gap)+tile/2;return {cx,cy};},idx);}
async function tapCell(idx){const {cx,cy}=await cellCenter(idx);await page.mouse.click(cx,cy);}
async function isSettled(){const t=(await texts()).join(' ').toLowerCase();return t.includes('bet again')||t.includes('ownership points');}

// close nothing, ape in flow
await clickText('ape in');await wait(900);
console.log('BET-ENTRY BTNS:',JSON.stringify(await btns()));
await shot('R2-betentry');
// place bet: try common labels
await clickText("send it");
await wait(1400);
console.log('PLAYING BTNS:',JSON.stringify(await btns()));
console.log('PLAYING TEXT:',(await texts()).join(' | '));
await shot('R2-playing');
// first tap
await tapCell(12);await wait(700);
await shot('R2-firsttap');
console.log('AFTER FIRST TAP:',(await texts()).slice(0,20).join(' | '));
// tap until rug
let ended=false;
const order=[0,4,20,24,2,10,14,22,6,8,16,18,1,3,5,7,9,11,13,15,17,19,21,23];
for(const i of order){ if(ended)break; await tapCell(i);await wait(450); if(await isSettled())ended=true; }
await wait(800);
await shot('R2-settlement');
const t=(await texts());
console.log('\nSETTLEMENT TEXT:',t.join(' | '));
const low=t.join(' ').toLowerCase();
console.log('\n>>> contains BUST?',low.includes('bust'));
console.log('>>> contains "before the rug"?',low.includes('before the rug'));
// scan for any positive x-value token like "1.00x" / "1.23x"
const xs=t.filter(s=>/\d+\.\d+x/i.test(s)||/x\s*$/i.test(s));
console.log('>>> tokens with x-multiplier form:',JSON.stringify(xs));
// receipt pill
const rec=await clickText('view receipt')||await clickText('receipt');
await wait(600);await shot('R2-receipt');
console.log('>>> receipt clicked?',rec);
await browser.close();
console.log('DONE');
