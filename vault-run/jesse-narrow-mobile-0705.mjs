// jesse-narrow-mobile-0705.mjs — narrow-desktop & mobile cold session, clean TAKE PROFIT win,
// plus the narrow-desktop gutter-scroll reachability probe (risk #2).
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT=process.argv[2]||'5781';
const LABEL=process.argv[3]||'narrow1000';
const VW=parseInt(process.argv[4]||'1000',10), VH=parseInt(process.argv[5]||'900',10);
const MOBILE=process.argv[6]==='mobile';
const OUT=`shots-jesse-revert-0705/${LABEL}`;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
if(!fs.existsSync(OUT)) fs.mkdirSync(OUT,{recursive:true});
const log=(...a)=>console.log(...a);
async function shot(page,n){await page.screenshot({path:`${OUT}/${n}.png`});log('  shot',n);}
async function fullshot(page,n){await page.screenshot({path:`${OUT}/${n}.png`,fullPage:true});log('  fullshot',n);}
async function clickText(page,t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button],a')];const n=e=>(e.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();return els.find(e=>e.offsetParent!==null&&!e.disabled&&n(e)===t.toLowerCase())||els.find(e=>e.offsetParent!==null&&!e.disabled&&n(e).includes(t.toLowerCase()));},t);const el=h.asElement();if(!el)return false;await el.click();return true;}
async function ctaProbe(page,labels){return page.evaluate((labels)=>{const vw=innerWidth,vh=innerHeight;const out=[];for(const b of[...document.querySelectorAll('button,[role=button],a')]){const low=(b.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();if(!labels.some(l=>low.includes(l)))continue;const r=b.getBoundingClientRect();let clipped=false;let el=b.parentElement;while(el){const cs=getComputedStyle(el);if(/(auto|scroll|hidden)/.test(cs.overflowY)){const ar=el.getBoundingClientRect();if(r.top<ar.top-1||r.bottom>ar.bottom+1)clipped=true;}el=el.parentElement;}out.push({text:(b.textContent||'').replace(/\s+/g,' ').trim().slice(0,24),disabled:b.disabled===true,top:Math.round(r.top),bottom:Math.round(r.bottom),h:Math.round(r.height),visible:b.offsetParent!==null,inViewportV:r.top>=0&&r.bottom<=vh,belowFold:r.top>vh,clippedByScroll:clipped});}return{vw,vh,out};},labels);}
async function scrollProbe(page){return page.evaluate(()=>{const ids=['vault-betentry-left','vault-betentry-right','vault-playing-right','vault-settled-right'];return ids.map(id=>{const el=document.querySelector(`[data-testid="${id}"]`);if(!el)return{id,present:false};const cs=getComputedStyle(el);return{id,present:true,overflowY:cs.overflowY,scrolls:el.scrollHeight>el.clientHeight+1,scrollH:el.scrollHeight,clientH:el.clientHeight};}).filter(x=>x.present);});}
async function scrollGutterBottom(page){await page.evaluate(()=>{const el=document.querySelector('[data-testid="vault-betentry-right"]');if(el)el.scrollTop=el.scrollHeight;});}
async function clickCanvas(page,fx,fy){const box=await page.evaluate(()=>{const c=document.querySelector('canvas');if(!c)return null;const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};});if(!box)return;await page.mouse.click(box.x+box.w*fx,box.y+box.h*fy);}
async function settled(page){return page.evaluate(()=>!!document.querySelector('[data-testid="vault-settledpanel"]')||!!document.querySelector('[data-testid="vault-settled-result"]'));}
async function run(){
  const browser=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--no-sandbox',`--window-size=${VW},${VH+120}`,'--force-device-scale-factor=1'],defaultViewport:{width:VW,height:VH,deviceScaleFactor:1,isMobile:MOBILE,hasTouch:MOBILE}});
  const page=await browser.newPage();
  await page.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle2'});await wait(2500);
  log(`\n===== ${LABEL} ${VW}x${VH} mobile=${MOBILE} =====`);
  await shot(page,'01-lobby'); if(MOBILE) await fullshot(page,'01b-lobby-full');
  await clickText(page,'ape in');await wait(1500);
  await shot(page,'02-betentry'); if(MOBILE) await fullshot(page,'02b-betentry-full');
  log('SEND IT probe:',JSON.stringify(await ctaProbe(page,['send it'])));
  log('scroll probe:',JSON.stringify(await scrollProbe(page)));
  // scroll gutter to bottom (narrow desktop risk #2) and re-shot
  if(!MOBILE){await scrollGutterBottom(page);await wait(400);await shot(page,'03-betentry-scrolled');log('after-scroll SEND IT:',JSON.stringify(await ctaProbe(page,['send it'])));}
  await clickText(page,'send it');await wait(1600);
  await shot(page,'04-playing'); if(MOBILE) await fullshot(page,'04b-playing-full');
  // clean win: reveal 2 tiles then TAKE PROFIT
  await clickCanvas(page,0.35,0.4);await wait(1000);
  if(!await settled(page)){await clickCanvas(page,0.6,0.55);await wait(1000);}
  await shot(page,'05-revealed');
  log('TAKE PROFIT probe:',JSON.stringify(await ctaProbe(page,['take profit'])));
  if(!await settled(page)){const tp=await clickText(page,'take profit');log('clicked take profit:',tp);await wait(1600);}
  await shot(page,'06-win-settled'); if(MOBILE) await fullshot(page,'06b-win-settled-full');
  log('win settled?',await settled(page));
  log('betagain probe:',JSON.stringify(await ctaProbe(page,['bet again','new setup'])));
  await browser.close();
}
run().catch(e=>{console.error('FATAL',e);process.exit(1);});
