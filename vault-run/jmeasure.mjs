import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const W=1920,H=1000,S='shots/';
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:W,height:H,deviceScaleFactor:1},args:[`--window-size=${W+20},${H+140}`,'--autoplay-policy=no-user-gesture-required']});
const page=(await browser.pages())[0];
await page.goto('http://localhost:5184/',{waitUntil:'networkidle2',timeout:60000});
await wait(3200);
async function clickText(t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];return els.find(e=>e.offsetParent!==null&&e.textContent.trim().toLowerCase()===t.toLowerCase())||els.find(e=>e.offsetParent!==null&&e.textContent.toLowerCase().includes(t.toLowerCase()));},t);const el=h.asElement();if(!el)return false;await el.click();return true;}
await clickText('ape in');await wait(1500);
await clickText('send it');await wait(1600);

const m=await page.evaluate(()=>{
  const c=document.querySelector('canvas');const r=c.getBoundingClientRect();
  const cw=c.width, ch=c.height; // internal pixel size
  const off=document.createElement('canvas');off.width=cw;off.height=ch;
  const ctx=off.getContext('2d');
  try{ctx.drawImage(c,0,0);}catch(e){return {err:String(e)};}
  let data;try{data=ctx.getImageData(0,0,cw,ch).data;}catch(e){return {err:'getImageData '+String(e)};}
  const px=(x,y)=>{const i=(y*cw+x)*4;return [data[i],data[i+1],data[i+2],data[i+3]];};
  const bright=(x,y)=>{const[R,G,B]=px(x,y);return (R+G+B)/3;};
  // horizontal scan at mid grid height
  const midY=Math.round(ch*0.5);
  let row=[];for(let x=0;x<cw;x++)row.push(bright(x,midY));
  // find leftmost/rightmost x where brightness > threshold (tiles ~ grey >70)
  const TH=60;
  let L=-1,Rr=-1;for(let x=0;x<cw;x++){if(row[x]>TH){L=x;break;}}for(let x=cw-1;x>=0;x--){if(row[x]>TH){Rr=x;break;}}
  // vertical scan at mid grid width
  const midX=Math.round(cw*0.5);
  let colv=[];for(let y=0;y<ch;y++)colv.push(bright(midX,y));
  let T=-1,B=-1;for(let y=0;y<ch;y++){if(colv[y]>TH){T=y;break;}}for(let y=ch-1;y>=0;y--){if(colv[y]>TH){B=y;break;}}
  return {rectW:Math.round(r.width),rectH:Math.round(r.height),cw,ch,gridL:L,gridR:Rr,gridWpx:Rr-L,gridWfracInternal:((Rr-L)/cw).toFixed(3),gridT:T,gridB:B,gridHpx:B-T,gridHfrac:((B-T)/ch).toFixed(3)};
});
console.log('MEASURE',JSON.stringify(m,null,1));
await browser.close();
