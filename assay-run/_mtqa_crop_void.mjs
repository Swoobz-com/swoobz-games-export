import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/eed49dad-7609-4969-843a-cb4e422d24da/scratchpad/mtqa/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 })
await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
await wait(700)
// crop the bottom void region 590-915 CSS, boost via CSS filter brightness before shot
await page.evaluate(() => {
  document.body.style.filter = 'brightness(3.2) saturate(1.4)'
})
await page.screenshot({ path: OUT + 'entry-brightened.png', clip: { x: 0, y: 550, width: 412, height: 365 } })
await browser.close()
