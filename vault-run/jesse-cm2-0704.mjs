import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT=process.argv[2]||'5187';const OUT='shots-jesse-cm2-0704';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
if(!fs.existsSync(OUT))fs.mkdirSync(OUT,{recursive:true});
async function clickText(page,t,within){const h=await page.evaluateHandle(({t,within})=>{const root=within?document.querySelector(within):document;if(!root)return null;const els=[...root.querySelectorAll('button,[role=button]')];return els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.trim().toLowerCase()===t.toLowerCase())||els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.toLowerCase().includes(t.toLowerCase()));},{t,within});const el=h.asElement();if(!el)return false;await el.click();return true;}
async function ccf(page,fx,fy){const box=await page.evaluate(()=>{const c=document.querySelector('canvas');if(!c)return null;const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};});if(!box)return false;await page.mouse.click(box.x+box.w*fx,box.y+box.h*fy);return true;}
async function isSettled(p){return await p.evaluate(()=>!!document.querySelector('[data-testid="vault-settled-betagain"]'));}
async function tpEnabled(p){return await p.evaluate(()=>{const b=[...document.querySelectorAll('[data-testid="vault-playing-actions"] button')].find(x=>x.textContent.toLowerCase().includes('take profit'));return b&&!b.disabled;});}
(async()=>{
  const b=await puppeteer.launch({executablePath:CHROME,headless:'new'});
  const p=await b.newPage();
  await p.setViewport({width:1440,height:900,deviceScaleFactor:1});
  let reached=false;
  for(let attempt=1;attempt<=6&&!reached;attempt++){
    await p.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle0'});await wait(600);
    await clickText(p,'ape in');await wait(500);
    await clickText(p,'SEND IT');await wait(700);
    // crack mid-board tiles until take profit enabled (but stop before rug)
    const fracs=[[0.5,0.5],[0.35,0.5],[0.65,0.5]];
    for(const[fx,fy]of fracs){if(await isSettled(p))break;await ccf(p,fx,fy);await wait(400);if(await tpEnabled(p))break;}
    if(await isSettled(p)){console.log(`attempt ${attempt} rugged before profit`);continue;}
    if(await tpEnabled(p)){await clickText(p,'take profit');await wait(1000);}
    if(await isSettled(p)){reached=true;}
  }
  if(!reached){console.log('never reached settled');await b.close();return;}
  await p.screenshot({path:`${OUT}/settled.png`});
  const beforePhase=await p.evaluate(()=>(document.body.innerText.match(/BET ENTRY|PUMPING|SETTLED · WIN|SETTLED · LOSS/)||[])[0]);
  const cmClicked=await clickText(p,'change mode');
  await wait(700);
  await p.screenshot({path:`${OUT}/after-cm.png`});
  const after=await p.evaluate(()=>({
    phase:(document.body.innerText.match(/BET ENTRY|PUMPING|SETTLED · WIN|SETTLED · LOSS/)||[])[0],
    ids:[...document.querySelectorAll('[data-testid]')].map(e=>e.getAttribute('data-testid')).filter((v,i,a)=>a.indexOf(v)===i),
    hasWorldPicker:!!document.querySelector('[data-testid="vault-betentry-world"]'),
    snippet:document.body.innerText.replace(/\s+/g,' ').slice(0,260)
  }));
  fs.writeFileSync(`${OUT}/cm.txt`,JSON.stringify({beforePhase,cmClicked,after},null,2));
  console.log('before',beforePhase,'cmClicked',cmClicked,'after',after.phase,'worldPicker',after.hasWorldPicker);
  await b.close();
})();
