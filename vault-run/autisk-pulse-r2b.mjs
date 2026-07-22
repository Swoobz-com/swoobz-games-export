import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL='http://localhost:5332/'
const OUT='C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/pulse-run/shots-autisk'
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const log=(...a)=>console.log(...a)
async function owlRect(page){return await page.evaluate(()=>{const img=document.querySelector('.owl-in');const out={};if(img){const r=img.getBoundingClientRect();const cs=getComputedStyle(img);out.owl={x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),opacity:cs.opacity,transform:cs.transform};}return out;})}
async function run(){
  const browser=await puppeteer.launch({executablePath:CHROME,headless:true,args:['--autoplay-policy=no-user-gesture-required','--force-device-scale-factor=1']})
  const page=await browser.newPage()
  await page.setViewport({width:1440,height:900,deviceScaleFactor:1})
  await page.goto(URL,{waitUntil:'networkidle0'});await sleep(700)
  // WIN settle: auto 1.2x, commit, poll up to 22s for DODGED THE RUG banner
  await page.evaluate(()=>{const c=[...document.querySelectorAll('.chip')].find(c=>c.textContent.trim()==='1.2x');if(c)c.click()})
  await page.evaluate(()=>{const b=[...document.querySelectorAll('.cta')].find(b=>/COMMIT/.test(b.textContent));if(b)b.click()})
  let got=false
  for(let i=0;i<120;i++){await sleep(200);const txt=await page.evaluate(()=>document.body.innerText);if(/DODGED THE RUG/.test(txt)&&/NEXT ROUND IN/.test(txt)){await page.screenshot({path:OUT+'/r2-1440x900-05-winsettle.png'});log('WIN SETTLE captured at iter',i);got=true;break;}}
  if(!got)log('win settle NOT captured')
  // Owl at SETTLED verdict: force PUMP, wait for PUMP! then wait 500ms extra for owl to settle
  await page.reload({waitUntil:'networkidle0'});await sleep(400)
  await page.evaluate(()=>{const b=[...document.querySelectorAll('.fomc-test')].find(b=>/PUMP/.test(b.textContent));if(b)b.click()})
  for(let i=0;i<80;i++){await sleep(150);const txt=await page.evaluate(()=>document.body.innerText);if(/PUMP!/.test(txt)){await sleep(450);await page.screenshot({path:OUT+'/r2-1440x900-08b-pump-result-settled.png'});log('PUMP result+450ms owl:',JSON.stringify(await owlRect(page)));break;}}
  await browser.close();log('DONE')
}
run().catch(e=>{console.error('FATAL',e);process.exit(1)})
