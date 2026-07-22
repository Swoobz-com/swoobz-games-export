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
await page.goto('http://localhost:5181/', { waitUntil: 'networkidle0' })
await sleep(300)
await clickText(page, 'ape in')
await sleep(300)
const data = await page.evaluate(() => {
  const world = document.querySelector('[data-testid="vault-betentry-world"]')
  const cs = getComputedStyle(world)
  return {
    boxSizing: cs.boxSizing,
    width: cs.width,
    paddingLeft: cs.paddingLeft,
    paddingRight: cs.paddingRight,
    borderLeftWidth: cs.borderLeftWidth,
    borderRightWidth: cs.borderRightWidth,
    rectWidth: world.getBoundingClientRect().width,
  }
})
console.log(JSON.stringify(data, null, 2))
await browser.close()
