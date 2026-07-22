import puppeteer from 'puppeteer-core';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';const PORT='5782';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function clickText(page,t,within){const h=await page.evaluateHandle(({t,within})=>{const root=within?document.querySelector(within):document;if(!root)return null;const els=[...root.querySelectorAll('button,[role=button]')];const lc=t.toLowerCase();return els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.trim().toLowerCase()===lc)||els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.toLowerCase().includes(lc))||null;},{t,within});const el=h.asElement();if(!el)return false;try{await el.click();}catch(e){return false;}return true;}
async function box(page){return page.evaluate(()=>{const c=document.querySelector('canvas');if(!c)return null;const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};});}
async function pst(page){return page.evaluate(()=>{const t=document.body.innerText;return{secured:/SECURED|SECURED THE BAG|BAGGED/i.test(t)&&!/RUGGED|BUST|SBF/i.test(t),settled:!!document.querySelector('[data-testid="vault-settledpanel"]'),rugged:/RUGGED|BUST|GOT SBF/i.test(t)};});}
async function tryWin(browser,W,H,tag){
  for(let att=0;att<8;att++){
    const page=await browser.newPage();await page.setViewport({width:W,height:H,deviceScaleFactor:1});
    await page.goto('http://localhost:'+PORT+'/',{waitUntil:'networkidle0'});await wait(800);
    await clickText(page,'got it');await clickText(page,'skip');await wait(120);
    await clickText(page,'ape in');await wait(600);
    let s=await clickText(page,'send it','[data-testid="vault-betentry-confirm"]');if(!s)await clickText(page,'send it');await wait(800);
    const bx=await box(page);
    // reveal ONE interior tile at frac 0.5,0.4 then take profit fast
    await page.mouse.click(bx.x+bx.w*0.42,bx.y+bx.h*0.42);await wait(500);
    let st=await pst(page);
    if(st.rugged||st.settled){await page.close();continue;}
    await clickText(page,'take profit');await wait(1500);
    st=await pst(page);
    if(st.secured||(st.settled&&!st.rugged)){await page.screenshot({path:'shots-autisk-revert-0705/'+tag+'-WIN-settled.png'});console.log(tag+' WIN captured att'+att,JSON.stringify(st));await page.close();return true;}
    await page.close();
  }
  console.log(tag+' no win');return false;
}
(async()=>{
  const browser=await puppeteer.launch({executablePath:CHROME,headless:false,args:['--autoplay-policy=no-user-gesture-required','--window-size=1980,1200']});
  await tryWin(browser,1440,900,'d1440');
  await tryWin(browser,1920,1080,'d1920');
  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
