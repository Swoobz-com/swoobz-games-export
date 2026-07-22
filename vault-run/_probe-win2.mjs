import puppeteer from 'puppeteer-core';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';const PORT='5782';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function clickText(page,t,within){const h=await page.evaluateHandle(({t,within})=>{const root=within?document.querySelector(within):document;if(!root)return null;const els=[...root.querySelectorAll('button,[role=button]')];const lc=t.toLowerCase();return els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.trim().toLowerCase()===lc)||els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.toLowerCase().includes(lc))||null;},{t,within});const el=h.asElement();if(!el)return false;try{await el.click();}catch(e){return false;}return true;}
async function box(page){return page.evaluate(()=>{const c=document.querySelector('canvas');if(!c)return null;const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};});}
async function topbar(page){return page.evaluate(()=>{const t=document.body.innerText.split('\n').slice(0,3).join(' | ');const btns=[...document.querySelectorAll('button')].filter(b=>b.offsetParent).map(b=>b.textContent.trim().slice(0,18)).filter(Boolean);return{top:t,btns:btns.slice(0,12)};});}
(async()=>{
  const browser=await puppeteer.launch({executablePath:CHROME,headless:false,args:['--autoplay-policy=no-user-gesture-required','--window-size=1980,1200']});
  const page=await browser.newPage();await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
  await page.goto('http://localhost:'+PORT+'/',{waitUntil:'networkidle0'});
  await wait(900);
  await clickText(page,'got it');await clickText(page,'skip');await wait(120);
  await clickText(page,'ape in');await wait(600);
  let s=await clickText(page,'send it','[data-testid="vault-betentry-confirm"]');if(!s)await clickText(page,'send it');await wait(800);
  console.log('PLAYING btns:',JSON.stringify(await topbar(page)));
  const bx=await box(page);
  await page.mouse.click(bx.x+bx.w*0.42,bx.y+bx.h*0.42);await wait(600);
  console.log('after1crack:',JSON.stringify(await topbar(page)));
  await page.mouse.click(bx.x+bx.w*0.58,bx.y+bx.h*0.42);await wait(600);
  console.log('after2crack:',JSON.stringify(await topbar(page)));
  const tp=await clickText(page,'take profit');
  console.log('takeprofit clicked:',tp);await wait(1600);
  console.log('SETTLED:',JSON.stringify(await topbar(page)));
  await page.screenshot({path:'shots-autisk-revert-0705/d1440-winattempt-settled.png'});
  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
