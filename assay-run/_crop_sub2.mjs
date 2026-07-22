import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
await page.goto('http://localhost:5182/', { waitUntil: 'load', timeout: 60000 })
await wait(800)
// crop clip around bottom-left area where the glowing red-center object sits
await page.screenshot({ path: '_crop_sub_left.png', clip: { x: 0, y: 650, width: 460, height: 250 } })
// crop bottom-right area too
await page.screenshot({ path: '_crop_sub_right.png', clip: { x: 980, y: 0, width: 460, height: 300 } })
await browser.close()
