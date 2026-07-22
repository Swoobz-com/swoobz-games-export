import puppeteer from 'puppeteer-core';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT=process.argv[2]||'5412';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function clickText(page,t,within){const h=await page.evaluateHandle(({t,within})=>{const root=within?document.querySelector(within):document;if(!root)return null;const els=[...root.querySelectorAll('button,[role=button]')];const lc=t.toLowerCase();return els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.trim().toLowerCase()===lc)||els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.toLowerCase().includes(lc))||null;},{t,within});const el=h.asElement();if(!el)return false;try{await el.click();}catch(e){return false;}return true;}
async function box(page){return page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};});}
async function hud(page){return page.evaluate(()=>{const h=document.querySelector('[data-testid="vault-hud-row"]');const cap=document.querySelector('[data-testid="vault-board-caption"]');const b=document.querySelector('[data-testid="vault-settled-banner"]');return{hudCols:h?[...h.children].map(c=>c.innerText.replace(/\n/g,' | ').trim()):null,cap:cap?cap.textContent.trim():null,banner:b?b.textContent.trim():null};});}
(async()=>{
  const browser=await puppeteer.launch({executablePath:CHROME,headless:false,args:['--autoplay-policy=no-user-gesture-required','--window-size=1520,980']});
  const page=await browser.newPage();await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
  await page.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle0'});await wait(900);
  await clickText(page,'got it');await clickText(page,'skip');await wait(200);
  await clickText(page,'ape in');await wait(700);
  let s=await clickText(page,'send it','[data-testid="vault-ctl-cta"]');if(!s)s=await clickText(page,'send it');await wait(800);
  // crack ONE corner tile; if rugged retry a different corner (max 4 tries via reload-less loop not possible, just try 1)
  const bx=await box(page);
  const corners=[[0.06,0.06],[0.94,0.06],[0.06,0.94],[0.94,0.94],[0.5,0.5]];
  let won=false;
  for(const [fx,fy] of corners){
    await page.mouse.click(bx.x+bx.w*fx,bx.y+bx.h*fy);await wait(500);
    const st=await hud(page);
    if(st.cap&&/rug/i.test(st.cap)){console.log('RUGGED trying corner, stop');break;}
    // one safe tile cracked -> take profit
    const tp=await clickText(page,'take profit');await wait(1500);
    const st2=await hud(page);
    console.log('AFTER TAKE PROFIT:',JSON.stringify(st2));
    won=true;break;
  }
  await page.screenshot({path:'shots-autisk-reverify-4fix/winhud-1440.png'});
  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
