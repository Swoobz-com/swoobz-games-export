import puppeteer from 'puppeteer-core'
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait=(ms)=>new Promise(r=>setTimeout(r,ms))
async function run(){
  const b=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--no-sandbox']})
  const page=await b.newPage()
  page.on('response', r=>{ if(r.status()===404) console.log('404:', r.url()) })
  await page.setViewport({width:1440,height:900})
  await page.goto('http://localhost:5901/',{waitUntil:'networkidle0'})
  await wait(800)
  await b.close()
}
run()
