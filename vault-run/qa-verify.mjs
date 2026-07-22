import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const W=parseInt(process.argv[2]||'1440'), H=parseInt(process.argv[3]||'900'), TAG=process.argv[4]||'D1440';
const S='shots/qa-';
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:W,height:H,deviceScaleFactor:1},args:[`--window-size=${W+20},${H+140}`,'--autoplay-policy=no-user-gesture-required']});
const page=(await browser.pages())[0];
await page.goto('http://localhost:5181/',{waitUntil:'networkidle2',timeout:60000});
await wait(2000);

async function clickText(t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];return els.find(e=>e.offsetParent!==null&&e.textContent.trim().toLowerCase()===t.toLowerCase())||els.find(e=>e.offsetParent!==null&&e.textContent.toLowerCase().includes(t.toLowerCase()));},t);const el=h.asElement();if(!el){console.log('NO BTN:',t);return false;}await el.click();return true;}

async function cellCenter(idx,g){return await page.evaluate(({idx,g})=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();const W=r.width,H=r.height;const tR=H*0.15,bR=H*0.18,sF=0.08;const sW=W*(1-sF*2);const sH=(H-tR-bR)*0.96;const av=Math.min(sW,sH);const gap=Math.max(6,av*0.026);const tile=(av-gap*(g-1))/g;const full=tile*g+gap*(g-1);const x0=(W-full)/2;const by=tR+(H-tR-bR)/2;const y0=by-full/2;const col=idx%g,row=Math.floor(idx/g);return {cx:r.left+x0+col*(tile+gap)+tile/2,cy:r.top+y0+row*(tile+gap)+tile/2};},{idx,g});}

async function settled(){return await page.evaluate(()=>document.body.textContent.toLowerCase().includes('bet again'));}

async function playOneRound(){
  const clickedApe = await clickText('ape in');
  if(!clickedApe) await clickText('bet again');
  await wait(700);
  await clickText('send it');await wait(900);
  let settledNow=false;
  for(let k=0;k<4&&!settledNow;k++){
    const {cx,cy}=await cellCenter([1,6,11,17,22][k]||2,5);
    await page.mouse.click(cx,cy);await wait(500);
    settledNow=await settled();
  }
  if(!settledNow){await clickText('take profit');await wait(900);}
  await wait(400);
}

// Play 6 rounds to build up session history / rug trail chips
for(let i=0;i<6;i++){
  await playOneRound();
  console.log('round',i+1,'done');
}
await page.screenshot({path:S+`${TAG}-multiround-settled.png`});

// Now go to playing phase (mid-round) for panel check
const clickedApe2 = await clickText('ape in');
if(!clickedApe2) await clickText('bet again');
await wait(700);
await clickText('send it');await wait(900);
// tap a couple safe-looking cells to get mid-round state without settling
const {cx:cx1,cy:cy1}=await cellCenter(0,5);
await page.mouse.click(cx1,cy1);await wait(500);
await page.screenshot({path:S+`${TAG}-multiround-playing.png`});

// header cyan probe + panel void measurement via DOM
const info = await page.evaluate(()=>{
  function getBgColors(){
    const all = [...document.querySelectorAll('body *')];
    const cyanish = [];
    for(const el of all){
      const cs = getComputedStyle(el);
      const props = [cs.color, cs.backgroundColor, cs.borderColor, cs.borderTopColor, cs.borderBottomColor];
      for(const p of props){
        const m = p.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
        if(m){
          const r=+m[1], g=+m[2], b=+m[3];
          // cyan-leaning: low red, high green+blue, both similar
          if(r < 100 && g > 150 && b > 150 && Math.abs(g-b) < 60){
            cyanish.push({tag: el.tagName, cls: el.className && el.className.toString().slice(0,40), color: p});
          }
        }
      }
    }
    return cyanish;
  }
  return { cyan: getBgColors().slice(0, 40) };
});
console.log('CYAN-ISH ELEMENTS FOUND:', info.cyan.length);
console.log(JSON.stringify(info.cyan, null, 1));

await browser.close();
console.log('DONE', TAG);
