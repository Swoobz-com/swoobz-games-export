import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const W=1920,H=1000,S='shots/';
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:W,height:H,deviceScaleFactor:2},args:[`--window-size=${W+20},${H+140}`,'--autoplay-policy=no-user-gesture-required']});
const page=(await browser.pages())[0];
await page.goto('http://localhost:5184/',{waitUntil:'networkidle2',timeout:60000});
await wait(3200);
async function clickText(t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];return els.find(e=>e.offsetParent!==null&&e.textContent.trim().toLowerCase()===t.toLowerCase())||els.find(e=>e.offsetParent!==null&&e.textContent.toLowerCase().includes(t.toLowerCase()));},t);const el=h.asElement();if(!el){console.log('NO BTN:',t);return false;}await el.click();return true;}
async function texts(){return await page.evaluate(()=>{const o=[];const w=e=>{for(const n of e.childNodes){if(n.nodeType===3){const t=n.textContent.trim();if(t)o.push(t);}else if(n.nodeType===1){const s=getComputedStyle(n);if(s.display!=='none'&&s.visibility!=='hidden')w(n);}}};w(document.body);return o;});}
// cell center from canvas — replicate any layout; we just need approximate taps
async function canvasRect(){return await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};});}
async function tapGrid(col,row){const c=await canvasRect();// assume grid centered, occupying middle; tap by fractional position
  const gx=c.x+c.w*(0.30+col*0.10); const gy=c.y+c.h*(0.34+row*0.105);
  await page.mouse.click(gx,gy);}

console.log('=== DESKTOP 1920x1000 ===');
// COLD
await page.screenshot({path:S+'V-00-cold.png'});
// APE IN -> bet entry
await clickText('ape in');await wait(1500);
await page.screenshot({path:S+'V-01-betentry.png'});
// SEND IT -> playing
await clickText('send it');await wait(1600);
await page.screenshot({path:S+'V-02-playing-full.png'});

// geometry: canvas + sidebar panel measurement
const geo=await page.evaluate(()=>{
  const vw=innerWidth,vh=innerHeight;
  const c=document.querySelector('canvas');const cr=c.getBoundingClientRect();
  // find the right sidebar: tall element to the right of canvas
  const cands=[...document.querySelectorAll('div,aside,section')].filter(e=>{if(!e.offsetParent)return false;const r=e.getBoundingClientRect();return r.x>cr.right-40&&r.width>200&&r.width<520&&r.height>300;});
  const side=cands.map(e=>{const r=e.getBoundingClientRect();return {cls:(e.className||'').toString().slice(0,30),x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),bottom:Math.round(r.bottom)};}).sort((a,b)=>b.h-a.h).slice(0,6);
  return {vw,vh,canvas:{x:Math.round(cr.x),y:Math.round(cr.y),w:Math.round(cr.width),h:Math.round(cr.height),right:Math.round(cr.right),bottom:Math.round(cr.bottom)},side};
});
console.log('GEO',JSON.stringify(geo,null,1));

// sidebar crop full height (right of canvas)
const sx=geo.canvas.right+2, sw=Math.min(geo.vw-sx-4,460);
await page.screenshot({path:S+'V-03-sidebar-full.png',clip:{x:sx,y:Math.max(0,geo.canvas.y-10),width:sw,height:Math.min(geo.canvas.h+20,geo.vh-geo.canvas.y+10)}});
// top-left PUMP corner crop
await page.screenshot({path:S+'V-04-topleft-pumpx.png',clip:{x:geo.canvas.x,y:geo.canvas.y,width:Math.round(geo.canvas.w*0.42),height:Math.round(geo.canvas.h*0.32)}});
// top-right RUG RISK corner crop
await page.screenshot({path:S+'V-05-topright-rugrisk.png',clip:{x:geo.canvas.x+Math.round(geo.canvas.w*0.58),y:geo.canvas.y,width:Math.round(geo.canvas.w*0.42),height:Math.round(geo.canvas.h*0.32)}});
// canvas bottom hint crop
await page.screenshot({path:S+'V-06-canvas-bottomhint.png',clip:{x:geo.canvas.x,y:geo.canvas.y+Math.round(geo.canvas.h*0.80),width:geo.canvas.w,height:Math.round(geo.canvas.h*0.20)}});
// footer below cabinet
await page.screenshot({path:S+'V-07-footer.png',clip:{x:geo.canvas.x-40,y:Math.min(geo.vh-70,geo.canvas.bottom+2),width:Math.min(geo.canvas.w+80,geo.vw),height:Math.min(66,geo.vh-geo.canvas.bottom-2)}});

// reveal cells for coin<->lockbox
console.log('PLAYING text:',(await texts()).slice(0,50).join(' | '));
for(const [col,row] of [[1,1],[3,2],[2,3],[0,2]]){await tapGrid(col,row);await wait(700);const t=(await texts()).join(' ').toLowerCase();if(t.includes('bet again')||t.includes('bust')||t.includes('rugged')){console.log('BUST after tap');break;}}
await wait(400);
await page.screenshot({path:S+'V-08-mixedgrid-full.png'});
// zoom-crop grid center
const g2=await canvasRect();
await page.screenshot({path:S+'V-09-mixedgrid-zoom.png',clip:{x:g2.x+Math.round(g2.w*0.22),y:g2.y+Math.round(g2.h*0.24),width:Math.round(g2.w*0.56),height:Math.round(g2.h*0.52)}});
console.log('AFTER REVEAL text:',(await texts()).slice(0,50).join(' | '));

await browser.close();
console.log('DONE DESKTOP');
