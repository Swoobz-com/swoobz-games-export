import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT=process.argv[2]||'5187';const OUT='shots-jesse-cm-0704';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
if(!fs.existsSync(OUT))fs.mkdirSync(OUT,{recursive:true});
async function clickText(page,t,within){const h=await page.evaluateHandle(({t,within})=>{const root=within?document.querySelector(within):document;if(!root)return null;const els=[...root.querySelectorAll('button,[role=button]')];return els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.trim().toLowerCase()===t.toLowerCase())||els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.toLowerCase().includes(t.toLowerCase()));},{t,within});const el=h.asElement();if(!el)return false;await el.click();return true;}
async function ccf(page,fx,fy){const box=await page.evaluate(()=>{const c=document.querySelector('canvas');if(!c)return null;const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};});if(!box)return false;await page.mouse.click(box.x+box.w*fx,box.y+box.h*fy);return true;}
(async()=>{
  const b=await puppeteer.launch({executablePath:CHROME,headless:'new'});
  const p=await b.newPage();
  await p.setViewport({width:1440,height:900,deviceScaleFactor:1});
  await p.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle0'});await wait(700);
  await clickText(p,'ape in');await wait(600);
  await clickText(p,'SEND IT');await wait(800);
  await ccf(p,0.2,0.3);await wait(450);
  await clickText(p,'take profit');await wait(1000);
  const before=await p.evaluate(()=>(document.body.innerText.match(/BET ENTRY|PUMPING|SETTLED · WIN|SETTLED · LOSS|READY/)||[])[0]);
  await clickText(p,'change mode');await wait(400);
  await p.screenshot({path:`${OUT}/cm-immediate.png`});
  const after=await p.evaluate(()=>({phase:(document.body.innerText.match(/BET ENTRY|PUMPING|SETTLED · WIN|SETTLED · LOSS|READY/)||[])[0],snippet:document.body.innerText.replace(/\s+/g,' ').slice(0,300)}));
  fs.writeFileSync(`${OUT}/cm-result.txt`,JSON.stringify({before,after},null,2));
  console.log('before',before,'after',after.phase);
  await b.close();
})();
