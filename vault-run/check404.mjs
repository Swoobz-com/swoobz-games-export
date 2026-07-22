import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
async function run(){
  const browser = await puppeteer.launch({executablePath: CHROME, headless:'new', args:['--no-sandbox']})
  const page = await browser.newPage()
  const fails=[]
  page.on('requestfailed', r=>fails.push(r.url()))
  page.on('response', r=>{ if(r.status()===404) fails.push('404:'+r.url()) })
  await page.goto('http://localhost:5282/', {waitUntil:'networkidle0'})
  await new Promise(r=>setTimeout(r,1500))
  console.log(JSON.stringify(fails,null,2))
  await browser.close()
}
run()
