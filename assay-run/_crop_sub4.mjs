import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
await page.goto('http://localhost:5182/', { waitUntil: 'load', timeout: 60000 })
await wait(800)
await page.screenshot({ path: '_crop_subregion.png', clip: { x: 620, y: 0, width: 320, height: 200 } })
await browser.close()
