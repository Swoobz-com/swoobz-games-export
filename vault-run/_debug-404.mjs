import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
  const page = await browser.newPage()
  page.on('response', r => { if (r.status() === 404) console.log('404:', r.url()) })
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto('http://localhost:5390/originals/vault', { waitUntil: 'networkidle0' })
  await new Promise(r => setTimeout(r, 1000))
  await browser.close()
}
run()
