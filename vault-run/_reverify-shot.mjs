import puppeteer from 'puppeteer-core';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';const PORT='5782';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function clickText(page,t,within){const h=await page.evaluateHandle(({t,within})=>{const root=within?document.querySelector(within):document;if(!root)return null;const els=[...root.querySelectorAll('button,[role=button]')];const lc=t.toLowerCase();return els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.trim().toLowerCase()===lc)||els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.toLowerCase().includes(lc))||null;},{t,within});const el=h.asElement();if(!el)return false;try{await el.click();}catch(e){return false;}return true;}
(async()=>{
  const browser=await puppeteer.launch({executablePath:CHROME,headless:false,args:['--autoplay-policy=no-user-gesture-required','--window-size=1980,1200']});
  for(const w of [1440,1000,1920]){
    const page=await browser.newPage();await page.setViewport({width:w,height:900,deviceScaleFactor:1});
    await page.goto('http://localhost:'+PORT+'/',{waitUntil:'networkidle0'});await wait(800);
    await clickText(page,'got it');await clickText(page,'skip');await wait(120);
    await clickText(page,'ape in');await wait(700);
    const chk=await page.evaluate(()=>{
      const rg=document.querySelector('[data-testid="vault-betentry-right"]');
      const IW=innerWidth;let sc=0;
      [...document.querySelectorAll('*')].forEach(e=>{const cs=getComputedStyle(e);if(((cs.overflowY==='auto'||cs.overflowY==='scroll')&&e.scrollHeight>e.clientHeight+1)||((cs.overflowX==='auto'||cs.overflowX==='scroll')&&e.scrollWidth>e.clientWidth+1))sc++;});
      let trunc=0,offs=0;if(rg){[...rg.querySelectorAll('*')].filter(e=>e.childElementCount===0&&e.textContent.trim()).forEach(e=>{if(e.scrollWidth>e.clientWidth+1)trunc++;if(e.getBoundingClientRect().right>IW+0.5)offs++;});}
      return {scrollers:sc,rgScrollW:rg&&rg.scrollWidth,rgClientW:rg&&rg.clientWidth,rgScrollH:rg&&rg.scrollHeight,rgClientH:rg&&rg.clientHeight,trunc,offs};
    });
    console.log('w'+w,JSON.stringify(chk));
    await page.screenshot({path:'shots-autisk-revert-0705/REVERIFY-'+w+'-betentry.png'});
    await page.close();
  }
  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
