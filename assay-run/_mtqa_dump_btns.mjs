import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
await wait(600)
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => /ENTER THE DIVE/i.test(b.textContent||''))
  btn?.click()
})
await wait(400)
const btns = await page.evaluate(() => [...document.querySelectorAll('button')].map(b => JSON.stringify(b.textContent)))
console.log(btns.join('\n'))
await browser.close()
