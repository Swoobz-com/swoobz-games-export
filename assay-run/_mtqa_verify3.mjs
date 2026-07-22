import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/eed49dad-7609-4969-843a-cb4e422d24da/scratchpad/mtqa/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function tapContains(page, needle) {
  const rect = await page.evaluate((t) => {
    const btn = [...document.querySelectorAll('button')].find(b => (b.textContent||'').includes(t))
    if (!btn) return null
    const r = btn.getBoundingClientRect()
    return { x: r.x, y: r.y, width: r.width, height: r.height }
  }, needle)
  if (!rect) return false
  await page.touchscreen.tap(rect.x + rect.width/2, rect.y + rect.height/2)
  return true
}
async function btnText(page, needle) {
  return page.evaluate((t) => {
    const btn = [...document.querySelectorAll('button')].find(b => (b.textContent||'').includes(t))
    return btn ? btn.textContent : null
  }, needle)
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
await wait(600)
await tapContains(page, 'ENTER THE DIVE')
await wait(400)

// DIVE DEPTH: tap HADAL, check gauge label changes (HAUL "up to Nx")
const gaugeBefore = await page.evaluate(() => document.querySelector('body').innerText)
const hadalFired = await tapContains(page, 'HADAL')
await wait(200)
const hadalActive = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => (b.textContent||'').includes('HADAL'))
  return btn ? btn.getAttribute('aria-current') : null
})
console.log('HADAL tap fired:', hadalFired, 'aria-current after:', hadalActive)

await tapContains(page, 'MIDNIGHT')
await wait(150)

// bet stepper +
const betValBefore = await page.evaluate(() => {
  const spans = [...document.querySelectorAll('span')].map(s=>s.textContent.trim())
  return spans.find(s => /^\d+\.\d\d$/.test(s))
})
const plusFired = await tapContains(page, '+')
await wait(150)
const betValAfterPlus = await page.evaluate(() => {
  const spans = [...document.querySelectorAll('span')].map(s=>s.textContent.trim())
  return spans.find(s => /^\d+\.\d\d$/.test(s))
})
console.log('STEPPER + fired:', plusFired, 'bet before:', betValBefore, 'after:', betValAfterPlus)

// chip 5.00
const chipFired = await tapContains(page, '5.00')
await wait(150)
const betValAfterChip = await page.evaluate(() => {
  const spans = [...document.querySelectorAll('span')].map(s=>s.textContent.trim())
  return spans.find(s => /^\d+\.\d\d$/.test(s))
})
console.log('CHIP 5.00 tap fired:', chipFired, 'bet after chip tap:', betValAfterChip)

// pace toggle
const paceBefore = await btnText(page, 'PACE:')
const paceFired = await tapContains(page, 'PACE:')
await wait(150)
const paceAfter = await btnText(page, 'PACE:')
console.log('PACE toggle fired:', paceFired, 'before:', paceBefore, 'after:', paceAfter)

await browser.close()
