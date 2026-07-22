import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto('http://localhost:5783/', { waitUntil: 'networkidle0' })
await sleep(300)
const data = await page.evaluate(() => {
  const stack = document.querySelector('[data-testid="vault-lobby-left"]')
  const child = stack ? stack.children[0] : null
  const canvas = document.querySelector('[data-testid="vault-canvas-shell"] canvas')
  return {
    stackRect: stack ? stack.getBoundingClientRect().toJSON() : null,
    childRect: child ? child.getBoundingClientRect().toJSON() : null,
    canvasRect: canvas ? canvas.getBoundingClientRect().toJSON() : null,
  }
})
console.log(JSON.stringify(data, null, 2))
await browser.close()
