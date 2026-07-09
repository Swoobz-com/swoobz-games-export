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
async function cc(idx,g){return await page.evaluate(({idx,g})=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();const W=r.width,H=r.height;const tR=H*0.15,bR=H*0.18,sF=0.08;const sW=W*(1-sF*2);const sH=(H-tR-bR)*0.96;const av=Math.min(sW,sH);const gap=Math.max(6,av*0.026);const tile=(av-gap*(g-1))/g;const full=tile*g+gap*(g-1);const x0=(W-full)/2;const by=tR+(H-tR-bR)/2;const y0=by-full/2;const col=idx%g,row=Math.floor(idx/g);return {cx:r.left+x0+col*(tile+gap)+tile/2,cy:r.top+y0+row*(tile+gap)+tile/2};},{idx,g});}
async function tap(idx,g){const{cx,cy}=await cc(idx,g);await page.mouse.click(cx,cy);}
async function settled(){const t=(await texts()).join(' ').toLowerCase();return t.includes('bet again')||t.includes('view receipt');}

// win a bluechips round
await clickText('ape in');await wait(1300);
await clickText('send it');await wait(1200);
let won=false;
for(let a=0;a<10 && !won;a++){
  await tap([12,6,8,16,2][a%5],5);await wait(650);
  if(await settled()){ // rugged
    await clickText('bet again');await wait(1100);continue;
  }
  // safe -> take profit
  await clickText('take profit');await wait(1300);
  const t=(await texts()).join(' ').toLowerCase();
  if(t.includes('take profit')&&!t.includes('rugged')){won=true;}
  const wt=(await texts()).find(x=>/\d\.\d+x/.test(x));
  console.log('win attempt',a,'settled, mult seen:',wt);
  break;
}
console.log('won bluechips?',won);
// reopen mode select via change mode
const cm=await clickText('change mode');await wait(1200);
console.log('clicked change mode?',cm);
await page.screenshot({path:S+'F2-modeselect-best.png'});
const t=await texts();
const i=t.findIndex(x=>/YOUR BEST/i.test(x));
console.log('YOUR BEST present?', i>=0, i>=0? ('-> '+t.slice(i,i+3).join(' ')):'');
console.log('count of YOUR BEST chips:', t.filter(x=>/YOUR BEST/i.test(x)).length, '(should be 1 - only bluechips)');
console.log('MODE AREA TEXT:', t.slice(t.findIndex(x=>/PICK YOUR WORLD/i.test(x)), t.findIndex(x=>/EXIT AT/i.test(x))).join(' | '));
await browser.close();console.log('DONE');
