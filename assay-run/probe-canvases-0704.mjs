import puppeteer from 'puppeteer-core'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5175/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = (await browser.pages())[0]
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message))
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(800)

const clickByTextOrAria = async (txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return (
      btns.find((b) => b.textContent && b.textContent.includes(t)) ||
      btns.find((b) => (b.getAttribute('aria-label') || '').includes(t)) ||
      null
    )
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}

console.log('LOBBY canvases:', await page.evaluate(() => [...document.querySelectorAll('canvas')].map(c => ({ w: c.width, h: c.height, cssW: c.getBoundingClientRect().width, cssH: c.getBoundingClientRect().height, cls: c.className, id: c.id, parentClass: c.parentElement && c.parentElement.className }))))

const clicked = await clickByTextOrAria('ENTER THE ASSAY LINE')
console.log('clicked ENTER:', clicked)
await wait(800)

console.log('PLANNING canvases:', await page.evaluate(() => [...document.querySelectorAll('canvas')].map(c => ({ w: c.width, h: c.height, cssW: c.getBoundingClientRect().width, cssH: c.getBoundingClientRect().height, cls: c.className, id: c.id, parentClass: c.parentElement && c.parentElement.className, parentTag: c.parentElement && c.parentElement.tagName }))))

const buttons = await page.evaluate(() => [...document.querySelectorAll('button')].map(b => ({ text: b.textContent, aria: b.getAttribute('aria-label') })))
console.log('BUTTONS:', JSON.stringify(buttons, null, 2))

const errors2 = await page.evaluate(() => document.title)
await page.screenshot({ path: 'probe-planning.png' })

await browser.close()
