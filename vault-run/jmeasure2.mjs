import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const W=1920,H=1000;
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:W,height:H,deviceScaleFactor:1},args:[`--window-size=${W+20},${H+140}`,'--autoplay-policy=no-user-gesture-required']});
const page=(await browser.pages())[0];
await page.goto('http://localhost:5184/',{waitUntil:'networkidle2',timeout:60000});
await wait(3200);
async function clickText(t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];return els.find(e=>e.offsetParent!==null&&e.textContent.trim().toLowerCase()===t.toLowerCase())||els.find(e=>e.offsetParent!==null&&e.textContent.toLowerCase().includes(t.toLowerCase()));},t);const el=h.asElement();if(!el)return false;await el.click();return true;}
await clickText('ape in');await wait(1500);
await clickText('send it');await wait(1600);

const m=await page.evaluate(()=>{
  const c=document.querySelector('canvas');const cw=c.width,ch=c.height;
  const off=document.createElement('canvas');off.width=cw;off.height=ch;
  const ctx=off.getContext('2d');ctx.drawImage(c,0,0);
  const data=ctx.getImageData(0,0,cw,ch).data;
  const px=(x,y)=>{const i=(y*cw+x)*4;return [data[i],data[i+1],data[i+2]];};
  // tile-blue: bluish grey lockbox. B >= R (not gold), G in mid, brightness 45..190
  const isTile=(x,y)=>{const[R,G,B]=px(x,y);const br=(R+G+B)/3;return B>=R-4 && br>45 && br<200 && B>50;};
  // scan several rows across the grid vertical band and take the widest tile run
  let best={w:-1};
  for(let f=0.20;f<=0.80;f+=0.02){
    const y=Math.round(ch*f);
    let L=-1,Rr=-1;
    for(let x=0;x<cw;x++){if(isTile(x,y)){L=x;break;}}
    for(let x=cw-1;x>=0;x--){if(isTile(x,y)){Rr=x;break;}}
    if(L>=0&&Rr-L>best.w)best={w:Rr-L,L,Rr,y,f:+f.toFixed(2)};
  }
  // vertical extent at mid grid x
  let bestV={h:-1};
  for(let f=0.30;f<=0.70;f+=0.02){
    const x=Math.round(cw*f);
    let T=-1,B=-1;
    for(let y=0;y<ch;y++){if(isTile(x,y)){T=y;break;}}
    for(let y=ch-1;y>=0;y--){if(isTile(x,y)){B=y;break;}}
    if(T>=0&&B-T>bestV.h)bestV={h:B-T,T,B,x,f:+f.toFixed(2)};
  }
  return {cw,ch,gridWpx:best.w,gridL:best.L,gridR:best.Rr,gridWfrac:(best.w/cw).toFixed(3),gridWofBoard:(best.w/825*100).toFixed(1)+'%',
    gridHpx:bestV.h,gridT:bestV.T,gridB:bestV.B,gridHfrac:(bestV.h/ch).toFixed(3)};
});
console.log('MEASURE2',JSON.stringify(m,null,1));
await browser.close();
