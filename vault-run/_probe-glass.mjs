import puppeteer from 'puppeteer-core';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';const PORT='5782';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function clickText(page,t,within){const h=await page.evaluateHandle(({t,within})=>{const root=within?document.querySelector(within):document;if(!root)return null;const els=[...root.querySelectorAll('button,[role=button]')];const lc=t.toLowerCase();return els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.trim().toLowerCase()===lc)||els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.toLowerCase().includes(lc))||null;},{t,within});const el=h.asElement();if(!el)return false;try{await el.click();}catch(e){return false;}return true;}
function glassOf(sel){const e=document.querySelector(sel);if(!e)return null;const cs=getComputedStyle(e);return{bg:cs.backgroundColor,bgImage:cs.backgroundImage.slice(0,40),backdrop:cs.backdropFilter||cs.webkitBackdropFilter,border:cs.borderTopWidth+' '+cs.borderTopStyle+' '+cs.borderTopColor,radius:cs.borderTopLeftRadius,boxShadow:cs.boxShadow.slice(0,80)};}
(async()=>{
  const browser=await puppeteer.launch({executablePath:CHROME,headless:false,args:['--autoplay-policy=no-user-gesture-required','--window-size=1980,1200']});
  const page=await browser.newPage();await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
  await page.goto('http://localhost:'+PORT+'/',{waitUntil:'networkidle0'});await wait(800);
  await clickText(page,'got it');await clickText(page,'skip');await wait(120);
  await clickText(page,'ape in');await wait(600);
  const g=await page.evaluate(()=>{
    const sels=['[data-testid="vault-betentry-world"]','[data-testid="vault-betentry-yourbet"]','[data-testid="vault-betentry-right"]','[data-testid="vault-gutter-card-a"]','[data-testid="vault-betentry-left"]'];
    const out={};for(const s of sels){const e=document.querySelector(s);if(!e){out[s]=null;continue;}const cs=getComputedStyle(e);out[s]={bg:cs.backgroundColor,backdrop:cs.backdropFilter||cs.webkitBackdropFilter,border:cs.borderTopWidth+' '+cs.borderTopStyle+' '+cs.borderTopColor,radius:cs.borderTopLeftRadius,boxShadow:cs.boxShadow.slice(0,90)};}return out;
  });
  console.log(JSON.stringify(g,null,1));
  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
