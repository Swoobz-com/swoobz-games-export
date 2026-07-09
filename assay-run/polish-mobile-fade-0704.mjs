import puppeteer from 'puppeteer-core'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5560/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: 'new',
  defaultViewport: { width: 412, height: 915, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
})
const page = (await browser.pages())[0]

const clickText = async (txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(800)
await clickText('ENTER THE ASSAY LINE')
await wait(1200)

// scroll the mobile pan viewport to the far right/bottom to expose the
// previously hard-clipping edge.
const scrolled = await page.evaluate(() => {
  const els = [...document.querySelectorAll('div')].filter(d => {
    const s = getComputedStyle(d)
    return s.overflow === 'auto' && d.querySelector('canvas')
  })
  const el = els[0]
  if (!el) return null
  el.scrollLeft = el.scrollWidth
  el.scrollTop = el.scrollHeight
  return { scrollLeft: el.scrollLeft, scrollTop: el.scrollTop, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }
})

await wait(200)
await page.screenshot({ path: 'shots-polish-0704-mobile-scrollfade.png' })

// Check the overlay div is present with the expected gradient background.
const overlayCheck = await page.evaluate(() => {
  const els = [...document.querySelectorAll('div')]
  const overlay = els.find(d => d.getAttribute('aria-hidden') === 'true' && getComputedStyle(d).background.includes('gradient'))
  if (!overlay) return null
  const s = getComputedStyle(overlay)
  return { background: s.background.slice(0, 200), pointerEvents: s.pointerEvents, position: s.position }
})

console.log(JSON.stringify({ scrolled, overlayCheck }, null, 2))
await browser.close()
