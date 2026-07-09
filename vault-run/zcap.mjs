import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const W=parseInt(process.argv[2]||'1920'), H=parseInt(process.argv[3]||'1000'), TAG=process.argv[4]||'D', PREFIX=process.argv[5]||'before';
const S='shots/';
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:W,height:H,deviceScaleFactor:1},args:[`--window-size=${W+20},${H+140}`,'--autoplay-policy=no-user-gesture-required']});
const page=(await browser.pages())[0];
await page.goto('http://localhost:5181/',{waitUntil:'networkidle2',timeout:60000});
await wait(2200);
async function clickText(t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];return els.find(e=>e.offsetParent!==null&&e.textContent.trim().toLowerCase()===t.toLowerCase())||els.find(e=>e.offsetParent!==null&&e.textContent.toLowerCase().includes(t.toLowerCase()));},t);const el=h.asElement();if(!el){console.log('NO BTN:',t);return false;}await el.click();return true;}
async function geom(){return await page.evaluate(()=>{
  const vw=window.innerWidth, vh=window.innerHeight;
  const c=document.querySelector('canvas'); const cr=c?c.getBoundingClientRect():null;
  const root=document.getElementById('root');
  const rr=root?root.getBoundingClientRect():null;
  // find the outermost page content box (first child of #root's child chain)
  const contentH = document.body.scrollHeight;
  return {vw,vh,contentH,canvas:cr?{x:Math.round(cr.x),y:Math.round(cr.y),w:Math.round(cr.width),h:Math.round(cr.height)}:null,rootH:rr?Math.round(rr.height):null,bodyBg:getComputedStyle(document.body).backgroundColor};
});}
function pctVoid(g){ if(!g) return null; const used=Math.min(g.contentH,g.vh); return Math.max(0,Math.round((1-used/g.vh)*100)); }

console.log('=== VIEWPORT',W,'x',H,'TAG',TAG,'===');
// PHASE 0: cold / lobby
await page.screenshot({path:S+`${PREFIX}-${TAG}-0-lobby.png`});
const g0=await geom();
console.log('LOBBY geom:',JSON.stringify(g0),'voidPct~',pctVoid(g0));

// PHASE A: bet entry
await clickText('ape in');await wait(1200);
await page.screenshot({path:S+`${PREFIX}-${TAG}-A-betentry.png`});
const gA=await geom();
console.log('BETENTRY geom:',JSON.stringify(gA),'voidPct~',pctVoid(gA));

// PHASE B: playing
await clickText('send it');await wait(1200);
await page.screenshot({path:S+`${PREFIX}-${TAG}-B-playing.png`});
const gB=await geom();
console.log('PLAYING geom:',JSON.stringify(gB),'voidPct~',pctVoid(gB));

// PHASE C: settle — tap a few cells then take profit; if bust, settled anyway
async function settled(){return await page.evaluate(()=>document.body.textContent.toLowerCase().includes('bet again'));}
async function cellCenter(idx,g){return await page.evaluate(({idx,g})=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();const W=r.width,H=r.height;const tR=H*0.15,bR=H*0.18,sF=0.08;const sW=W*(1-sF*2);const sH=(H-tR-bR)*0.96;const av=Math.min(sW,sH);const gap=Math.max(6,av*0.026);const tile=(av-gap*(g-1))/g;const full=tile*g+gap*(g-1);const x0=(W-full)/2;const by=tR+(H-tR-bR)/2;const y0=by-full/2;const col=idx%g,row=Math.floor(idx/g);return {cx:r.left+x0+col*(tile+gap)+tile/2,cy:r.top+y0+row*(tile+gap)+tile/2};},{idx,g});}
let settledNow=false;
for(let k=0;k<4&&!settledNow;k++){const {cx,cy}=await cellCenter([2,7,13,19][k],5);await page.mouse.click(cx,cy);await wait(600);settledNow=await settled();}
if(!settledNow){await clickText('take profit');await wait(1400);}
await wait(500);
await page.screenshot({path:S+`${PREFIX}-${TAG}-C-settled.png`});
const gC=await geom();
console.log('SETTLED geom:',JSON.stringify(gC),'voidPct~',pctVoid(gC));

await browser.close();
console.log('DONE',TAG);
