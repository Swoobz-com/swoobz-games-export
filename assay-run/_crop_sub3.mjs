import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
await page.goto('http://localhost:5182/', { waitUntil: 'load', timeout: 60000 })
await wait(800)
// top-center strip, above the header tape
await page.screenshot({ path: '_crop_top.png', clip: { x: 350, y: 0, width: 740, height: 40 } })
// full page for reference
await page.screenshot({ path: '_crop_full.png' })
await browser.close()
