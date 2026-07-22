import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:1360,height:900,deviceScaleFactor:2},args:['--window-size=1400,980','--autoplay-policy=no-user-gesture-required']});
const page=(await browser.pages())[0];
await page.goto('http://localhost:5184/',{waitUntil:'networkidle2'});
await wait(2800);
const S='shots/';
async function clickText(t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];return els.find(e=>e.textContent.trim().toLowerCase()===t.toLowerCase())||els.find(e=>e.textContent.toLowerCase().includes(t.toLowerCase()));},t);const el=h.asElement();if(!el){console.log('NO BTN:',t);return false;}await el.click();return true;}
async function texts(){return await page.evaluate(()=>{const o=[];const w=e=>{for(const n of e.childNodes){if(n.nodeType===3){const t=n.textContent.trim();if(t)o.push(t);}else if(n.nodeType===1){const s=getComputedStyle(n);if(s.display!=='none'&&s.visibility!=='hidden')w(n);}}};w(document.body);return o;});}
async function cc(idx){return await page.evaluate((idx)=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();const W=r.width,H=r.height;const g=5;const tR=H*0.15,bR=H*0.18,sF=0.08;const sW=W*(1-sF*2);const sH=(H-tR-bR)*0.96;const av=Math.min(sW,sH);const gap=Math.max(6,av*0.026);const tile=(av-gap*(g-1))/g;const full=tile*g+gap*(g-1);const x0=(W-full)/2;const by=tR+(H-tR-bR)/2;const y0=by-full/2;const col=idx%g,row=Math.floor(idx/g);return {cx:r.left+x0+col*(tile+gap)+tile/2,cy:r.top+y0+row*(tile+gap)+tile/2};},idx);}
async function tap(idx){const{cx,cy}=await cc(idx);await page.mouse.click(cx,cy);}
async function isSettled(){const t=(await texts()).join(' ').toLowerCase();return t.includes('bet again')||t.includes('ownership points');}

// === WIN run: tap 2 safe, take profit ===
await clickText('ape in');await wait(700);await clickText('send it');await wait(1100);
// tap a cell, if it settles it was a rug -> restart until we get 2 safe taps
let attempts=0, got=false;
while(attempts<8 && !got){
  attempts++;
  await tap(12);await wait(500);
  if(await isSettled()){ // rugged, restart
    await clickText('bet again');await wait(1100);continue;
  }
  await page.screenshot({path:S+'RG-nextsafe.png',clip:{x:360,y:150,width:640,height:600}});
  const t1=(await texts()).join(' | ');
  console.log('AFTER TAP1:',t1.slice(0,240));
  await tap(6);await wait(500);
  if(await isSettled()){await clickText('bet again');await wait(1100);continue;}
  got=true;
}
console.log('reached 2 safe taps?',got);
// take profit
await clickText('take profit');await wait(1400);
await page.screenshot({path:S+'RG-winsettle.png'});
await page.screenshot({path:S+'RG-winbar.png',clip:{x:900,y:400,width:460,height:360}});
const wt=(await texts());
console.log('\nWIN SETTLE:',wt.join(' | '));
const wl=wt.join(' ').toLowerCase();
console.log('>>> win shows SECURED/won headline?',/secured|bagged|cashed|profit|up /i.test(wl));
// expand receipt
const rec=await clickText('view receipt');await wait(700);
await page.screenshot({path:S+'RG-receipt.png',clip:{x:880,y:120,width:480,height:760}});
console.log('>>> receipt toggle clicked?',rec,' | now shows hide receipt?',(await texts()).join(' ').toLowerCase().includes('hide receipt'));

// === TRAIL run ===
await clickText('bet again');await wait(1100);
const isTrailPlaying=(await texts()).join(' ').toLowerCase();
await clickText('TRAIL');await wait(500);
await page.screenshot({path:S+'RG-trailmode.png'});
console.log('TRAIL toggled. text:',(await texts()).slice(0,25).join(' | '));
// drag a path across 3 cells
const a=await cc(0),b=await cc(1),d=await cc(2);
await page.mouse.move(a.cx,a.cy);await page.mouse.down();await wait(120);
await page.mouse.move(b.cx,b.cy,{steps:6});await wait(120);
await page.mouse.move(d.cx,d.cy,{steps:6});await wait(120);
await page.mouse.up();await wait(500);
await page.screenshot({path:S+'RG-trailpainted.png'});
console.log('TRAIL painted text:',(await texts()).filter(x=>/GO|tile|trail|path/i.test(x)).join(' | '));
// GO
await clickText('GO');await wait(2200);
await page.screenshot({path:S+'RG-trailrun.png'});
console.log('AFTER GO:',(await texts()).slice(0,25).join(' | '));
await browser.close();console.log('DONE');
