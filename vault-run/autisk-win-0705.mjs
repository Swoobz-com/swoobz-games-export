import puppeteer from 'puppeteer-core';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT=process.argv[2]||'5401'; const OUT=process.argv[3]||'shots-autisk-grid-0705';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function clickText(page,t,within){const h=await page.evaluateHandle(({t,within})=>{const root=within?document.querySelector(within):document;if(!root)return null;const els=[...root.querySelectorAll('button,[role=button]')];const lc=t.toLowerCase();return els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.trim().toLowerCase()===lc)||els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.toLowerCase().includes(lc))||null;},{t,within});const el=h.asElement();if(!el)return false;try{await el.click();}catch(e){return false;}return true;}
async function box(page){return page.evaluate(()=>{const c=document.querySelector('canvas');if(!c)return null;const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};});}
async function banner(page){return page.evaluate(()=>{const b=document.querySelector('[data-testid="vault-settled-banner"]');return b?b.textContent.trim():null;});}
async function caption(page){return page.evaluate(()=>{const c=document.querySelector('[data-testid="vault-board-caption"]');return c?c.textContent.trim():null;});}
(async()=>{
  const browser=await puppeteer.launch({executablePath:CHROME,headless:false,args:['--autoplay-policy=no-user-gesture-required','--window-size=1520,980']});
  const page=await browser.newPage(); await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
  for(let attempt=0;attempt<6;attempt++){
    await page.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle0'}); await wait(800);
    await clickText(page,'ape in'); await wait(600);
    let s=await clickText(page,'send it','[data-testid="vault-ctl-cta"]'); if(!s)await clickText(page,'send it'); await wait(700);
    const bx=await box(page);
    // crack ONE tile (center)
    await page.mouse.click(bx.x+bx.w*0.5,bx.y+bx.h*0.5); await wait(600);
    const cap=await caption(page);
    if(cap&&/rugged/i.test(cap)){ continue; } // busted, retry
    await clickText(page,'take profit'); await wait(1500);
    const b=await banner(page);
    if(b&&/secured/i.test(b)){ await page.screenshot({path:`${OUT}/win-banner.png`}); console.log('WIN banner:',JSON.stringify(b)); await browser.close(); return; }
  }
  console.log('no win captured in attempts'); await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
