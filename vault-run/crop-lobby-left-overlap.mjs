import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto('http://localhost:5783/', { waitUntil: 'networkidle0' })
await sleep(300)
await page.screenshot({ path: 'crop-lobby-left-overlap.png', clip: { x: 120, y: 140, width: 420, height: 260 } })
await browser.close()
