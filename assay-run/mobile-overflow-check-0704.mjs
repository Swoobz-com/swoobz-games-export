import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5560/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } })
const page = (await browser.pages())[0]
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(800)
const overflow = await page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
  bodyScrollHeight: document.body.scrollHeight,
}))
await page.screenshot({ path: 'shots-mobile-overflow-0704-lobby.png' })
console.log(JSON.stringify(overflow))
await browser.close()
