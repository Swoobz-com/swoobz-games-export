import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT=process.env.PORT||'5390';
const OUT='shots-autisk-frank-0707';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function clickText(page,t){
  const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];const lc=t.toLowerCase();return els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.trim().toLowerCase()===lc)||els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.toLowerCase().includes(lc))||null;},t);
  const el=h.asElement();if(!el)return false;try{await el.click();}catch(e){return false;}return true;
}
async function fresh(page){
  await page.goto('http://localhost:'+PORT+'/',{waitUntil:'networkidle0'});
  await page.evaluate(()=>{try{localStorage.clear();sessionStorage.clear();}catch(e){}});
  await page.goto('http://localhost:'+PORT+'/',{waitUntil:'networkidle0'});await wait(900);
  await clickText(page,'got it');await wait(200);
}
async function run(page,vw,vh,dsf,tag){
  await page.setViewport({width:vw,height:vh,deviceScaleFactor:dsf});
  await fresh(page);
  await page.screenshot({path:`${OUT}/mob-${tag}-betentry.png`});
  // try select shitcoin by text (danger world) then send
  await clickText(page,'shitcoin');await wait(400);
  await page.screenshot({path:`${OUT}/mob-${tag}-betentry-shitcoin.png`});
  await clickText(page,'send it');await wait(1200);
  await page.screenshot({path:`${OUT}/mob-${tag}-playing.png`});
  // open several tiles by clicking mid-board
  for(const p of [[vw*0.3,vh*0.42],[vw*0.7,vh*0.42],[vw*0.5,vh*0.55],[vw*0.3,vh*0.62],[vw*0.7,vh*0.62],[vw*0.5,vh*0.7]]){
    try{await page.mouse.click(Math.round(p[0]),Math.round(p[1]));}catch(e){}
    await wait(400);
    if(await page.evaluate(()=>/RUGGED/.test(document.body.textContent)))break;
  }
  await clickText(page,'take profit');await wait(1400);
  await page.screenshot({path:`${OUT}/mob-${tag}-settled.png`});
  const banner=await page.evaluate(()=>(document.body.textContent.match(/\d+ SAFES OPENED[^\n]{0,30}/)||[])[0]||null);
  console.log(`mob ${tag} banner=${banner}`);
}
(async()=>{
  const browser=await puppeteer.launch({executablePath:CHROME,headless:false,args:['--autoplay-policy=no-user-gesture-required','--window-size=520,960']});
  const page=await browser.newPage();
  const errs=[];page.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,120));});
  await run(page,412,915,2,'pixel7');
  await run(page,393,852,3,'iphone14');
  console.log('MOB_ERRS='+JSON.stringify([...new Set(errs)]));
  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
