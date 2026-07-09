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
async function playing(){const t=(await texts()).join(' ').toLowerCase();return t.includes('take profit')&&!settledSync(t);}
function settledSync(t){return t.includes('bet again')||t.includes('view receipt');}

// MANUAL: tap 1 safe, capture NEXT-safe preview
await clickText('ape in');await wait(1300);
await clickText('send it');await wait(1100);
let safe=false;
for(let a=0;a<6&&!safe;a++){await tap([12,6,8,16][a%4],5);await wait(600);if(await settled()){await clickText('bet again');await wait(900);}else{safe=true;}}
const pt=await texts();
const ni=pt.findIndex(x=>/^NEXT$/i.test(x));
console.log('MANUAL after 1 safe tap. NEXT-safe preview:', ni>=0?pt.slice(ni,ni+2).join(' '):'(no NEXT row)');
console.log('  play readout:', pt.filter(x=>/RUG RISK|ODDS|NEXT|PUMP|BAG/i.test(x)).join(' | '), '| full:', pt.slice(0,22).join(' '));
// clean grid crop (mixed revealed/sealed)
const geo=await cc(0,5);
await page.screenshot({path:S+'F1-mixed-grid.png',clip:{x:Math.round(geo.left-8),y:Math.round(geo.top-8),width:Math.round(geo.full+16),height:Math.round(geo.full+16)}});
await clickText('take profit');await wait(1200);

// TRAIL: does NOT force auto-cash on completion
let trailDone=false;
for(let attempt=0;attempt<8 && !trailDone;attempt++){
  await clickText('bet again');await wait(1000);
  await clickText('TRAIL');await wait(500);
  // paint path over 3 cells
  const a=await cc(0,5),b=await cc(1,5),d=await cc(2,5);
  await page.mouse.move(a.cx,a.cy);await page.mouse.down();await wait(120);
  await page.mouse.move(b.cx,b.cy,{steps:6});await wait(120);
  await page.mouse.move(d.cx,d.cy,{steps:6});await wait(120);
  await page.mouse.up();await wait(400);
  const goOk=await clickText('GO');await wait(2600);
  const t=(await texts());const tl=t.join(' ').toLowerCase();
  if(tl.includes('rugged')||tl.includes('bust')){console.log(`  trail attempt ${attempt}: hit a rug, retry`);continue;}
  // completed all-safe: is it auto-settled or still playing?
  const isSettled=await settled();
  const stillPlaying=tl.includes('take profit');
  console.log(`TRAIL completed all-safe. auto-cashed(settled)=${isSettled} | stillPlaying(take profit avail)=${stillPlaying}`);
  console.log('  state text:', t.slice(0,22).join(' | '));
  await page.screenshot({path:S+'RG-trail-complete.png'});
  trailDone=true;
}
console.log('trail all-safe completion observed?',trailDone);
await browser.close();console.log('DONE');
