import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
const p = await b.newPage()
await p.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await p.goto('http://localhost:5281/', { waitUntil: 'networkidle0' })
await wait(300)
await p.screenshot({ path: '_maker-fix2-iphone14pro-betentry.png' })
await b.close()
