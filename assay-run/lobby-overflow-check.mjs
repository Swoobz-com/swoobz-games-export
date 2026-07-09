import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto('http://localhost:5187/', { waitUntil: 'networkidle2', timeout: 60000 })
await wait(600)
const info = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent && b.textContent.includes('ENTER THE ASSAY LINE'))
  const r = btn ? btn.getBoundingClientRect() : null
  return {
    btnRect: r ? { top: r.top, bottom: r.bottom } : null,
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    bodyScrollHeight: document.body.scrollHeight,
  }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
