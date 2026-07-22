import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = await browser.newPage()
await page.emulate({ viewport: { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true }, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/125.0 Mobile Safari/537.36' })
const errs = []
page.on('console', m => { if (m.type()==='error') errs.push(m.text()) })
page.on('pageerror', e => errs.push('PAGEERROR: '+e.message))
const resp = await page.goto('http://localhost:5182/', { waitUntil: 'networkidle0' })
await new Promise(r=>setTimeout(r,300))
console.log('status', resp.status(), 'errors', errs.length)
errs.forEach(e=>console.log(e))
await browser.close()
