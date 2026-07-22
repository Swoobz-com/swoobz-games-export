import puppeteer from 'puppeteer-core';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';const PORT='5782';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function clickText(page,t,within){const h=await page.evaluateHandle(({t,within})=>{const root=within?document.querySelector(within):document;if(!root)return null;const els=[...root.querySelectorAll('button,[role=button]')];const lc=t.toLowerCase();return els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.trim().toLowerCase()===lc)||els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.toLowerCase().includes(lc))||null;},{t,within});const el=h.asElement();if(!el)return false;try{await el.click();}catch(e){return false;}return true;}
async function box(page){return page.evaluate(()=>{const c=document.querySelector('canvas');if(!c)return null;const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};});}
async function pulseCount(page){return page.evaluate(()=>{const t=document.body.innerText;const els=[...document.querySelectorAll('*')].filter(e=>e.childElementCount===0&&/SESSION PULSE/i.test(e.textContent||''));return{textMatches:(t.match(/SESSION PULSE/g)||[]).length,domNodes:els.length,positions:els.map(e=>{const r=e.getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y)};})};});}
(async()=>{
  const browser=await puppeteer.launch({executablePath:CHROME,headless:false,args:['--autoplay-policy=no-user-gesture-required','--window-size=1980,1200']});
  const page=await browser.newPage();await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
  await page.goto('http://localhost:'+PORT+'/',{waitUntil:'networkidle0'});await wait(900);
  await clickText(page,'got it');await clickText(page,'skip');await wait(150);
  // round 1: ape in -> send -> crack 1 -> take profit
  await clickText(page,'ape in');await wait(600);
  let s=await clickText(page,'send it','[data-testid="vault-betentry-confirm"]');if(!s)await clickText(page,'send it');await wait(800);
  let bx=await box(page);await page.mouse.click(bx.x+bx.w*0.5,bx.y+bx.h*0.5);await wait(600);
  await clickText(page,'take profit');await wait(1500);
  console.log('after round1 settled pulse:',JSON.stringify(await pulseCount(page)));
  // BET AGAIN -> round 2
  let ba=await clickText(page,'bet again');await wait(700);
  console.log('after bet again clicked:',ba);
  s=await clickText(page,'send it','[data-testid="vault-betentry-confirm"]');if(!s)await clickText(page,'send it');await wait(800);
  console.log('round2 playing (history=1) pulse:',JSON.stringify(await pulseCount(page)));
  await page.screenshot({path:'shots-autisk-revert-0705/d1440-round2-playing.png'});
  // crack one and check playing mid
  bx=await box(page);await page.mouse.click(bx.x+bx.w*0.4,bx.y+bx.h*0.4);await wait(500);
  console.log('round2 after 1 crack pulse:',JSON.stringify(await pulseCount(page)));
  await page.screenshot({path:'shots-autisk-revert-0705/d1440-round2-cracked.png'});
  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
