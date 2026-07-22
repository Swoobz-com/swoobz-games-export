import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
const page = await browser.newPage()
const urls = []
page.on('response', (r) => { if (r.status() === 404) urls.push(r.url()) })
await page.setViewport({ width: 1440, height: 900 })
await page.goto('http://localhost:5783/', { waitUntil: 'networkidle0' })
await new Promise(r=>setTimeout(r,500))
console.log(JSON.stringify(urls, null, 2))
await browser.close()
