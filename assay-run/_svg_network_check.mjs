import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
const svgReqs = []
page.on('response', (res) => {
  const u = res.url()
  if (u.includes('abyss') || u.endsWith('.svg')) svgReqs.push({ url: u, status: res.status() })
})
await page.setViewport({ width: 1440, height: 900 })
await page.goto('http://localhost:5182/', { waitUntil: 'networkidle0', timeout: 60000 })
await wait(500)
console.log(JSON.stringify(svgReqs, null, 2))
await browser.close()
