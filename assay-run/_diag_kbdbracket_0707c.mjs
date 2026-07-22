import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickText(page, txt) {
  const rect = await page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(t))
    if (!b || b.disabled) return null
    b.scrollIntoView({ block: 'center' })
    const r = b.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }, txt)
  if (!rect) return false
  await page.mouse.click(rect.x, rect.y)
  return true
}
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900 } })
const page = await browser.newPage()
await page.goto('http://localhost:5182/', { waitUntil: 'networkidle0' })
await page.evaluate(() => { try { localStorage.clear() } catch {} })
await page.reload({ waitUntil: 'networkidle0' })
await wait(200)
await clickText(page, 'ENTER THE DIVE')
await wait(150)
// Focus the board canvas directly (accessibility-qa's documented approach).
await page.evaluate(() => {
  const c = document.querySelector('canvas.assayFocusable, canvas')
  if (c) c.focus()
})
await wait(100)
const hasFocus = await page.evaluate(() => document.activeElement && document.activeElement.tagName)
console.log('activeElement tag:', hasFocus)
await page.keyboard.press('ArrowRight')
await wait(80)
await page.screenshot({ path: 'kbdbracket-probe-d1440.png' })
console.log('done')
await browser.close()
