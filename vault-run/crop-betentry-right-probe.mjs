import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
async function clickText(page, text) {
  const handle = await page.evaluateHandle((t) => {
    const all = Array.from(document.querySelectorAll('button'))
    return all.find((b) => b.textContent && b.textContent.trim().toLowerCase().includes(t.toLowerCase())) || null
  }, text)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto('http://localhost:5783/', { waitUntil: 'networkidle0' })
await sleep(300)
await clickText(page, 'ape in')
await sleep(300)
await page.screenshot({ path: 'crop-betentry-right-region.png', clip: { x: 950, y: 100, width: 490, height: 800 } })
const overflowInfo = await page.evaluate(() => {
  const right = document.querySelector('[data-testid="vault-betentry-right"]')
  const world = document.querySelector('[data-testid="vault-betentry-world"]')
  return {
    rightOverflow: getComputedStyle(right).overflow,
    rightOverflowX: getComputedStyle(right).overflowX,
    worldOverflow: getComputedStyle(world).overflow,
    rightWidthStyle: right.style.width,
    rightMaxWidthStyle: right.style.maxWidth,
    worldWidthStyle: world.style.width,
  }
})
console.log(JSON.stringify(overflowInfo, null, 2))
await browser.close()
