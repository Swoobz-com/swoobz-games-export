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
async function settled(){const t=(await texts()).join(' ').toLowerCase();return t.includes('bet again')||t.includes('ownership points')||t.includes('view receipt');}
async function liveMult(){const t=await texts();const m=t.find(x=>/^\d+\.\d+x$/i.test(x))||t.find(x=>/x$/.test(x)&&/\d\.\d/.test(x));return m||'?';}
async function exitChip(){const t=await texts();return t.find(x=>/EXIT @/i.test(x))||'(none)';}

// ape in -> bet entry
await clickText('ape in');await wait(1300);
// set EXIT AT 2x
await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='2×');b&&b.click();});await wait(400);
// bluechips default (3 rugs) already selected; send it
await clickText('send it');await wait(1200);
console.log('PLAY START text:', (await texts()).slice(0,20).join(' | '));
console.log('EXIT chip in play:', await exitChip());
await page.screenshot({path:S+'F3-play-exitchip.png'});

let autocashed=false, rounds=0;
outer:
while(rounds<14 && !autocashed){
  rounds++;
  // tap cells until settle or 14 taps
  for(let k=0;k<14;k++){
    await tap([12,6,18,8,16,2,22,10,14,4,20,0,24,7,11][k]??k,5);
    await wait(650);
    const st=await settled();
    if(st){
      const t=(await texts()).join(' ');
      const tl=t.toLowerCase();
      const auto=/target lock|discipline paid|exit hit|set it and banked/i.test(t);
      console.log(`round ${rounds} tap ${k+1}: SETTLED. auto=${auto} | head:`, t.slice(0,180));
      if(auto){autocashed=true;await page.screenshot({path:S+'F3-autocash-settle.png'});break outer;}
      // rugged or manual — replay
      await clickText('bet again');await wait(1100);
      break;
    } else {
      const lm=await liveMult();
      if(k===0){console.log(`round ${rounds}: after tap1 mult=${lm} exitchip=${await exitChip()}`);}
    }
  }
}
console.log('AUTO-CASH observed?', autocashed, 'in', rounds, 'rounds');
if(autocashed){
  console.log('SETTLE FULL:', (await texts()).join(' | '));
}
await browser.close();console.log('DONE');
