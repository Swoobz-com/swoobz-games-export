import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
const p = await b.newPage()
const errors = []
p.on('console', (msg) => { if (msg.type() === 'error' || msg.type() === 'warning') errors.push(`${msg.type()}: ${msg.text()}`) })
p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
await p.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await p.goto('http://localhost:5281/', { waitUntil: 'networkidle0' })
await wait(500)
// Tab through the RUGS stepper to sanity check keyboard focus still works (native <button>).
await p.keyboard.press('Tab')
await wait(2000)
console.log('console/page errors:', JSON.stringify(errors, null, 2))
await b.close()
