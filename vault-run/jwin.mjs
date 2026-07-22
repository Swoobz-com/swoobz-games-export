import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:1360,height:900,deviceScaleFactor:2},args:['--window-size=1400,980','--autoplay-policy=no-user-gesture-required']});
const page=(await browser.pages())[0];
await page.goto('http://localhost:5184/',{waitUntil:'networkidle2'});
await wait(2800);
const S='shots/';
async function clickText(t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];return els.find(e=>e.textContent.trim().toLowerCase()===t.toLowerCase())||els.find(e=>e.textContent.toLowerCase().includes(t.toLowerCase()));},t);const el=h.asElement();if(!el){return false;}await el.click();return true;}
async function texts(){return await page.evaluate(()=>{const o=[];const w=e=>{for(const n of e.childNodes){if(n.nodeType===3){const t=n.textContent.trim();if(t)o.push(t);}else if(n.nodeType===1){const s=getComputedStyle(n);if(s.display!=='none'&&s.visibility!=='hidden')w(n);}}};w(document.body);return o;});}
async function cc(idx){return await page.evaluate((idx)=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();const W=r.width,H=r.height;const g=5;const tR=H*0.15,bR=H*0.18,sF=0.08;const sW=W*(1-sF*2);const sH=(H-tR-bR)*0.96;const av=Math.min(sW,sH);const gap=Math.max(6,av*0.026);const tile=(av-gap*(g-1))/g;const full=tile*g+gap*(g-1);const x0=(W-full)/2;const by=tR+(H-tR-bR)/2;const y0=by-full/2;const col=idx%g,row=Math.floor(idx/g);return {cx:r.left+x0+col*(tile+gap)+tile/2,cy:r.top+y0+row*(tile+gap)+tile/2};},idx);}
async function tap(idx){const{cx,cy}=await cc(idx);await page.mouse.click(cx,cy);}
async function settled(){const t=(await texts()).join(' ').toLowerCase();return t.includes('bet again')||t.includes('view receipt')||t.includes('down horrendous')||t.includes('secured');}

let win=false;
for(let round=0; round<10 && !win; round++){
  const t0=(await texts()).join(' ').toLowerCase();
  if(t0.includes('bet again')){await clickText('bet again');await wait(1100);}
  else {await clickText('ape in');await wait(600);await clickText('send it');await wait(1000);}
  // tap ONE cell
  await tap([12,6,8,16,18,0][round%6]);await wait(650);
  if(await settled()){continue;} // rugged on first tap, retry
  // take profit
  const ok=await clickText('take profit');await wait(1500);
  const t=(await texts());const tl=t.join(' ').toLowerCase();
  if(tl.includes('bet again')&&!tl.includes('rugged')&&!tl.includes('bust')){
    win=true;
    console.log('\n=== WIN SETTLEMENT ===\n'+t.join(' | '));
    await page.screenshot({path:S+'W-winbar.png',clip:{x:900,y:390,width:460,height:380}});
    await page.screenshot({path:S+'W-winfull.png'});
    console.log('\n>>> tookprofit btn found?',ok);
  }
}
console.log('got win?',win);
await browser.close();console.log('DONE');
