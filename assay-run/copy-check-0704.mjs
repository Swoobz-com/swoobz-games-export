import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5190/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const tapText = async (page, txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await wait(400)
await tapText(page, 'ENTER THE ASSAY LINE')
await wait(300)
await tapText(page, 'Heavy')
await wait(200)
// select just 1 tile so we're below MIN_TRAIL
const geo = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  const cr = c.getBoundingClientRect()
  return { left: cr.left, top: cr.top, w: cr.width }
})
await page.mouse.click(geo.left + geo.w/20, geo.top + geo.w/20)
await wait(200)
const text = await page.evaluate(() => document.body.innerText)
console.log('CONTAINS "arm the deposit line":', text.includes('arm the deposit line'))
console.log('CONTAINS "arm the key":', text.includes('arm the key'))
const idx = text.indexOf('more box')
console.log('SNIPPET:', text.slice(Math.max(0,idx-30), idx+80))
await browser.close()
