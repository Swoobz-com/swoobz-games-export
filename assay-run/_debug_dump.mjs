import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1 })
await page.goto('http://localhost:5175/', { waitUntil: 'networkidle2', timeout: 60000 })
await new Promise(r=>setTimeout(r,1000))
console.log(await page.evaluate(()=>document.body.innerText))
console.log('---BUTTONS---')
console.log(await page.evaluate(()=>[...document.querySelectorAll('button')].map(b=>JSON.stringify(b.textContent.trim())).join('\n')))
await page.screenshot({path:'_debug_root.png', fullPage:true})
await browser.close()
