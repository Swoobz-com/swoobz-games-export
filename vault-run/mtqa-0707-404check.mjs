import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5312'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
page.on('requestfailed', (req) => console.log('FAILED:', req.url(), req.failure()?.errorText))
page.on('response', (res) => {
  if (res.status() === 404) console.log('404:', res.url())
})
await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true, deviceScaleFactor: 2.625 })
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
await wait(2000)
await browser.close()
