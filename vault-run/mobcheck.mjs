import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const PORT='5182';
const S='shots/fix-mob-';
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:412,height:915,deviceScaleFactor:1},args:[`--window-size=432,1055`,'--autoplay-policy=no-user-gesture-required']});
const page=(await browser.pages())[0];
await page.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle2',timeout:60000});
await wait(1500);
await page.screenshot({path:S+'lobby.png'});

async function clickText(t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];return els.find(e=>e.offsetParent!==null&&e.textContent.trim().toLowerCase()===t.toLowerCase())||els.find(e=>e.offsetParent!==null&&e.textContent.toLowerCase().includes(t.toLowerCase()));},t);const el=h.asElement();if(!el){console.log('NO BTN:',t);return false;}await el.click();return true;}
async function cellCenter(idx,g){return await page.evaluate(({idx,g})=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();const W=r.width,H=r.height;const tR=H*0.15,bR=H*0.18,sF=0.08;const sW=W*(1-sF*2);const sH=(H-tR-bR)*0.96;const av=Math.min(sW,sH);const gap=Math.max(6,av*0.026);const tile=(av-gap*(g-1))/g;const full=tile*g+gap*(g-1);const x0=(W-full)/2;const by=tR+(H-tR-bR)/2;const y0=by-full/2;const col=idx%g,row=Math.floor(idx/g);return {cx:r.left+x0+col*(tile+gap)+tile/2,cy:r.top+y0+row*(tile+gap)+tile/2};},{idx,g});}
async function settled(){return await page.evaluate(()=>document.body.textContent.toLowerCase().includes('bet again'));}

await clickText('ape in'); await wait(700);
await page.screenshot({path:S+'bet-entry.png'});
await clickText('send it'); await wait(900);
await page.screenshot({path:S+'playing.png'});
let settledNow=false;
for(let k=0;k<6&&!settledNow;k++){
  const {cx,cy}=await cellCenter([1,6,11,17,22,3][k]||2,5);
  await page.mouse.click(cx,cy);await wait(500);
  settledNow=await settled();
}
if(!settledNow){await clickText('take profit');await wait(900);}
await wait(400);
await page.screenshot({path:S+'settled.png'});

const betAgainPixel = await page.evaluate(async () => {
  const els=[...document.querySelectorAll('button')];
  const btn = els.find(e=>e.offsetParent!==null && e.textContent.trim().toLowerCase().includes('bet again'));
  if(!btn) return null;
  const cs = getComputedStyle(btn);
  return { background: cs.backgroundImage || cs.backgroundColor };
});
console.log('MOBILE BET AGAIN bg:', JSON.stringify(betAgainPixel));

const primaryBtnMarginCheck = await page.evaluate(() => {
  const els=[...document.querySelectorAll('button')];
  const btn = els.find(e=>e.offsetParent!==null && e.textContent.trim().toLowerCase().includes('ape in'));
  if(!btn) return 'no ape-in button visible (expected once settled/mid-flow)';
  const cs = getComputedStyle(btn);
  return { marginTop: cs.marginTop };
});
console.log('primary button margin check:', JSON.stringify(primaryBtnMarginCheck));

await browser.close();
console.log('MOBILE CHECK DONE');
