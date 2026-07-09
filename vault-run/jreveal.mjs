import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const W=1920,H=1000,S='shots/';
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:W,height:H,deviceScaleFactor:2},args:[`--window-size=${W+20},${H+140}`,'--autoplay-policy=no-user-gesture-required']});
const page=(await browser.pages())[0];
async function clickText(t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];return els.find(e=>e.offsetParent!==null&&e.textContent.trim().toLowerCase()===t.toLowerCase())||els.find(e=>e.offsetParent!==null&&e.textContent.toLowerCase().includes(t.toLowerCase()));},t);const el=h.asElement();if(!el)return false;await el.click();return true;}
async function txt(){return await page.evaluate(()=>document.body.textContent.replace(/\s+/g,' ').toLowerCase());}
async function centers(){return await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();const L=169,R=655,T=97;const gw=R-L,step=gw/5,gsz=gw;const out=[];for(let row=0;row<5;row++)for(let col=0;col<5;col++){out.push({col,row,x:r.x+L+(col+0.5)*step,y:r.y+T+(row+0.5)*(gsz/5)});}return out;});}

let success=false;
for(let attempt=0;attempt<8 && !success;attempt++){
  await page.goto('http://localhost:5184/',{waitUntil:'networkidle2',timeout:60000});
  await wait(2800);
  await clickText('ape in');await wait(1300);
  await clickText('send it');await wait(1500);
  const cs=await centers();
  // tap center-ish cells in a chosen order
  const order=[12,6,8,16,18,7,11,13,17,10,14];
  let safe=0;
  for(const idx of order){
    await page.mouse.click(cs[idx].x,cs[idx].y);
    await wait(650);
    const t=await txt();
    if(t.includes('rugged')||t.includes('bust')||t.includes('settled · loss')||t.includes('down horrendous')){console.log(`attempt ${attempt}: BUST after ${safe} safe`);safe=-1;break;}
    safe++;
    if(safe>=4)break;
  }
  if(safe>=4){success=true;
    console.log(`attempt ${attempt}: got ${safe} safe reveals`);
    await wait(400);
    await page.screenshot({path:S+'V-10-mixedgrid-full.png'});
    const g=await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};});
    await page.screenshot({path:S+'V-11-mixedgrid-zoom.png',clip:{x:g.x+g.w*0.20,y:g.y+g.h*0.22,width:g.w*0.60,height:g.h*0.56}});
  }
}
if(!success)console.log('FAILED to get 4 safe reveals in 8 attempts');
await browser.close();
console.log('DONE reveal');
