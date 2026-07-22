import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:1360,height:900,deviceScaleFactor:2},args:['--window-size=1400,980','--autoplay-policy=no-user-gesture-required']});
const page=(await browser.pages())[0];
await page.goto('http://localhost:5184/',{waitUntil:'networkidle2'});
await wait(3000);
const S='shots/';
async function clickText(t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];return els.find(e=>e.textContent.trim().toLowerCase()===t.toLowerCase())||els.find(e=>e.textContent.toLowerCase().includes(t.toLowerCase()));},t);const el=h.asElement();if(!el)return false;await el.click();return true;}
async function texts(){return await page.evaluate(()=>{const o=[];const w=e=>{for(const n of e.childNodes){if(n.nodeType===3){const t=n.textContent.trim();if(t)o.push(t);}else if(n.nodeType===1){const s=getComputedStyle(n);if(s.display!=='none'&&s.visibility!=='hidden')w(n);}}};w(document.body);return o;});}
async function cc(idx,g){return await page.evaluate(({idx,g})=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();const W=r.width,H=r.height;const tR=H*0.15,bR=H*0.18,sF=0.08;const sW=W*(1-sF*2);const sH=(H-tR-bR)*0.96;const av=Math.min(sW,sH);const gap=Math.max(6,av*0.026);const tile=(av-gap*(g-1))/g;const full=tile*g+gap*(g-1);const x0=(W-full)/2;const by=tR+(H-tR-bR)/2;const y0=by-full/2;const col=idx%g,row=Math.floor(idx/g);return {left:r.left+x0,top:r.top+y0,full,tile,gap,cx:r.left+x0+col*(tile+gap)+tile/2,cy:r.top+y0+row*(tile+gap)+tile/2};},{idx,g});}
async function tap(idx,g){const{cx,cy}=await cc(idx,g);await page.mouse.click(cx,cy);}
async function settled(){const t=(await texts()).join(' ').toLowerCase();return t.includes('bet again')||t.includes('view receipt');}
async function clickStepperPlus(){return await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].filter(e=>e.textContent.trim()==='+');const r=b.find(e=>{const q=e.getBoundingClientRect();return q.y>560&&q.y<680;});if(!r)return false;r.click();return true;});}

await clickText('ape in');await wait(1300);
for(let i=0;i<7;i++){await clickStepperPlus();await wait(150);}// 3->10 rugs
console.log('readout before send:', (await texts()).slice((await texts()).findIndex(x=>/per tap starts/i.test(x))-1).slice(0,7).join(' '));
await clickText('send it');await wait(1200);
// Feature 1 close-up: crop the sealed grid
const geo=await cc(0,5);
const clip={x:Math.round(geo.left-6),y:Math.round(geo.top-6),width:Math.round(geo.full+12),height:Math.round(geo.full+12)};
await page.screenshot({path:S+'F1-sealed-grid.png',clip:{x:clip.x*2,y:clip.y*2,width:clip.width*2,height:clip.height*2}});
// play a high-rug round: tap until bust or many safes
let busted=false;
for(let k=0;k<12;k++){
  await tap([12,6,18,8,16,2,22,10,14,4,20,0][k],5);await wait(600);
  if(await settled()){busted=true;const tl=(await texts()).join(' ').toLowerCase();console.log(`10-rug round: settled after ${k+1} taps. rugged=${tl.includes('rugged')||tl.includes('bust')}`);break;}
}
await page.screenshot({path:S+'F4-highrug-settle.png'});
const st=await texts();
console.log('SETTLE TEXT:', st.join(' | ').slice(0,400));
// find rug count row
const rugsIdx=st.findIndex(x=>/^rugs$/i.test(x));
console.log('Rugs stat:', rugsIdx>=0? st.slice(rugsIdx,rugsIdx+2).join(' '):'(n/a)');
// open receipt
const rec=await clickText('view receipt');await wait(800);
await page.screenshot({path:S+'F4-receipt-customcount.png'});
const rt=await texts();
console.log('RECEIPT verified present?', rt.some(x=>/verified/i.test(x)));
const vi=rt.findIndex(x=>/verified|receipt|mines|rugs|seed|commit|hash|grid/i.test(x));
console.log('RECEIPT ROWS:', rt.slice(vi>=0?vi-2:0).join(' | ').slice(0,500));
await browser.close();console.log('DONE');
