import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await puppeteer.launch({ executablePath: EXE, headless: false, defaultViewport: { width: 1440, height: 900 } })
const page = await browser.newPage()
await page.goto('http://localhost:5182/', { waitUntil: 'networkidle0' })
await new Promise(r => setTimeout(r, 400))
const txt = await page.evaluate(() => document.body.innerText)
console.log('=== LOBBY PHASE BODY TEXT ===')
console.log(txt)
console.log('=== contains RTP 96.50%? ===', txt.includes('RTP 96.50%'))
await page.screenshot({ path: '_rtp_lobby_check.png', fullPage: true })
await browser.close()
