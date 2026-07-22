import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const W=parseInt(process.argv[2]||'1920'), H=parseInt(process.argv[3]||'1000'), TAG=process.argv[4]||'D';
const S='shots/';
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:W,height:H,deviceScaleFactor:1},args:[`--window-size=${W+20},${H+120}`,'--autoplay-policy=no-user-gesture-required']});
const page=(await browser.pages())[0];
await page.goto('http://localhost:5184/',{waitUntil:'networkidle2',timeout:60000});
await wait(3200);
async function clickText(t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];return els.find(e=>e.offsetParent!==null&&e.textContent.trim().toLowerCase()===t.toLowerCase())||els.find(e=>e.offsetParent!==null&&e.textContent.toLowerCase().includes(t.toLowerCase()));},t);const el=h.asElement();if(!el){console.log('NO BTN:',t);return false;}await el.click();return true;}
async function texts(){return await page.evaluate(()=>{const o=[];const w=e=>{for(const n of e.childNodes){if(n.nodeType===3){const t=n.textContent.trim();if(t)o.push(t);}else if(n.nodeType===1){const s=getComputedStyle(n);if(s.display!=='none'&&s.visibility!=='hidden')w(n);}}};w(document.body);return o;});}
// geometry probe: cabinet, board(canvas), sidebar, page bg
async function geom(){return await page.evaluate(()=>{
  const vw=window.innerWidth, vh=window.innerHeight;
  const c=document.querySelector('canvas'); const cr=c?c.getBoundingClientRect():null;
  // find widest element that looks like the cabinet (a big centered container holding canvas)
  let node=c?c.parentElement:null, chain=[];
  while(node&&node!==document.body){const r=node.getBoundingClientRect();chain.push({tag:node.tagName,cls:(node.className||'').toString().slice(0,40),x:Math.round(r.x),w:Math.round(r.width),h:Math.round(r.height),bg:getComputedStyle(node).backgroundColor});node=node.parentElement;}
  // sample bottom strip colors
  return {vw,vh,canvas:cr?{x:Math.round(cr.x),y:Math.round(cr.y),w:Math.round(cr.width),h:Math.round(cr.height)}:null,chain,bodyBg:getComputedStyle(document.body).backgroundColor,htmlBg:getComputedStyle(document.documentElement).backgroundColor};
});}
async function cc(idx,g){return await page.evaluate(({idx,g})=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();const W=r.width,H=r.height;const tR=H*0.15,bR=H*0.18,sF=0.08;const sW=W*(1-sF*2);const sH=(H-tR-bR)*0.96;const av=Math.min(sW,sH);const gap=Math.max(6,av*0.026);const tile=(av-gap*(g-1))/g;const full=tile*g+gap*(g-1);const x0=(W-full)/2;const by=tR+(H-tR-bR)/2;const y0=by-full/2;const col=idx%g,row=Math.floor(idx/g);return {cx:r.left+x0+col*(tile+gap)+tile/2,cy:r.top+y0+row*(tile+gap)+tile/2};},{idx,g});}
async function tap(idx,g){const{cx,cy}=await cc(idx,g);await page.mouse.click(cx,cy);}
async function settled(){const t=(await texts()).join(' ').toLowerCase();return t.includes('bet again')||t.includes('next bet')||t.includes('bust');}

console.log('=== VIEWPORT',W,'x',H,'TAG',TAG,'===');
// PHASE 0: cold / lobby
await page.screenshot({path:S+`L-${TAG}-0cold.png`});
console.log('COLD geom:',JSON.stringify(await geom()));
console.log('COLD text:',(await texts()).slice(0,30).join(' | '));

// PHASE A: bet entry
await clickText('ape in');await wait(1400);
await page.screenshot({path:S+`L-${TAG}-A-betentry.png`});
console.log('BETENTRY geom:',JSON.stringify(await geom()));
console.log('BETENTRY text:',(await texts()).slice(0,40).join(' | '));

// PHASE B: playing
await clickText('send it');await wait(1400);
await page.screenshot({path:S+`L-${TAG}-B-playing.png`});
console.log('PLAYING geom:',JSON.stringify(await geom()));
console.log('PLAYING text:',(await texts()).slice(0,40).join(' | '));
// button widths in playing
const pbtns=await page.evaluate(()=>[...document.querySelectorAll('button')].filter(e=>e.offsetParent).map(e=>{const r=e.getBoundingClientRect();return {t:e.textContent.trim().slice(0,24),x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width)};}).filter(b=>b.w>0));
console.log('PLAYING buttons:',JSON.stringify(pbtns));

// PHASE C: settle — tap a couple cells then take profit; if bust, that's fine (settled panel)
let settledNow=false;
for(let k=0;k<3&&!settledNow;k++){await tap([12,6,18][k],5);await wait(650);settledNow=await settled();}
if(!settledNow){await clickText('take profit');await wait(1500);}
await wait(600);
await page.screenshot({path:S+`L-${TAG}-C-settled.png`});
console.log('SETTLED geom:',JSON.stringify(await geom()));
console.log('SETTLED text:',(await texts()).slice(0,40).join(' | '));

await browser.close();
console.log('DONE',TAG);
