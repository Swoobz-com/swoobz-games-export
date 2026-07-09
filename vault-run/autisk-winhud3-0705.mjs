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
  const bx=await box(page);
  // reveal interior tiles one at a time until mult>1.00 (safe) or rug
  const tiles=[[0.3,0.3],[0.7,0.3],[0.3,0.7]];
  let revealed=false;
  for(const [fx,fy] of tiles){
    await page.mouse.click(bx.x+bx.w*fx,bx.y+bx.h*fy);await wait(550);
    const st=await hud(page);console.log('after tile',fx,fy,':',JSON.stringify(st.hudCols),'cap',st.cap);
    if(st.cap&&/rug/i.test(st.cap)){console.log('RUG');await browser.close();return;}
    if(st.hudCols&&/1\.[1-9]|[2-9]\./.test(st.hudCols[0])){revealed=true;break;}
  }
  if(!revealed){console.log('no reveal, abort');await browser.close();return;}
  await clickText(page,'take profit');
  for(let i=0;i<6;i++){await wait(220);const h=await hud(page);console.log('TP',i,JSON.stringify(h.hudCols),'| banner:',h.banner);}
  await page.screenshot({path:'shots-autisk-reverify-4fix/winhud3-1440.png'});
  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
