import puppeteer from 'puppeteer-core'
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL='http://localhost:5332/'
const OUT='C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/pulse-run/shots-autisk'
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const log=(...a)=>console.log(...a)
async function run(){
  const browser=await puppeteer.launch({executablePath:CHROME,headless:true,args:['--autoplay-policy=no-user-gesture-required','--force-device-scale-factor=1']})
  const page=await browser.newPage()
  await page.setViewport({width:1440,height:900,deviceScaleFactor:1})
  await page.goto(URL,{waitUntil:'networkidle0'});await sleep(700)
  await page.evaluate(()=>{const b=[...document.querySelectorAll('.fomc-test')].find(b=>/SPIKE/.test(b.textContent));if(b)b.click()})
  await sleep(1500);await page.screenshot({path:OUT+'/r2-1440x900-12-spike-a.png'})
  await sleep(1200);await page.screenshot({path:OUT+'/r2-1440x900-12-spike-b.png'})
  const m=await page.evaluate(()=>({scrollW:document.documentElement.scrollWidth,innerW:innerWidth,cta:[...document.querySelectorAll('.cta')].map(b=>({t:b.textContent.trim().slice(0,30),below:b.getBoundingClientRect().bottom>innerHeight+1}))}))
  log('SPIKE',JSON.stringify(m))
  await browser.close();log('DONE')
}
run().catch(e=>{console.error('FATAL',e);process.exit(1)})
