import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/eed49dad-7609-4969-843a-cb4e422d24da/scratchpad/mtqa/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function tapExact(page, text) {
  const rect = await page.evaluate((t) => {
    const btn = [...document.querySelectorAll('button')].find(b => (b.textContent||'').trim() === t)
    if (!btn) return null
    const r = btn.getBoundingClientRect()
    return { x: r.x, y: r.y, width: r.width, height: r.height }
  }, text)
  if (!rect) return false
  await page.touchscreen.tap(rect.x + rect.width/2, rect.y + rect.height/2)
  return true
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
await wait(600)
await tapExact(page, 'ENTER THE DIVE →')
await wait(400)

// DIVE DEPTH card tap: HADAL
const before1 = await page.evaluate(() => document.body.innerText.match(/UP TO [\d.]+x/)?.[0])
const t1 = await tapExact(page, 'HADAL')
await wait(200)
const after1 = await page.evaluate(() => document.body.innerText.match(/UP TO [\d.]+x/)?.[0])
console.log('DEPTH CARD tap fired:', t1, 'before:', before1, 'after:', after1)

// switch back to MIDNIGHT for a clean bet baseline
await tapExact(page, 'MIDNIGHT')
await wait(150)

// bet stepper +
const betBefore = await page.evaluate(() => document.body.innerText.match(/YOUR BET[\s\S]{0,40}/)?.[0])
const plusRect = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')].filter(b => (b.textContent||'').trim() === '+')
  const r = btns[0]?.getBoundingClientRect()
  return r ? {x:r.x,y:r.y,w:r.width,h:r.height} : null
})
if (plusRect) await page.touchscreen.tap(plusRect.x + plusRect.w/2, plusRect.y + plusRect.h/2)
await wait(150)
const betAfter = await page.evaluate(() => document.body.innerText.match(/YOUR BET[\s\S]{0,40}/)?.[0])
console.log('BET STEPPER + fired, before:', betBefore, 'after:', betAfter)

// chip tap "5.00"
const chipFired = await tapExact(page, '5.00')
await wait(150)
const betAfterChip = await page.evaluate(() => document.body.innerText.match(/YOUR BET[\s\S]{0,40}/)?.[0])
console.log('CHIP 5.00 tap fired:', chipFired, 'bet now:', betAfterChip)

// PACE toggle
const paceBefore = await page.evaluate(() => document.body.innerText.includes('PACE: DISC-BY-DISC'))
await tapExact(page, 'PACE: DISC-BY-DISC')
await wait(150)
const paceAfterText = await page.evaluate(() => document.body.innerText.match(/PACE: [A-Z-]+/)?.[0])
console.log('PACE toggle before(disc-by-disc?):', paceBefore, 'after label:', paceAfterText)
// toggle back
await tapExact(page, paceAfterText)
await wait(100)

// PLAY SAFE modal open
const psRect = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => (b.textContent||'').trim() === 'PLAY SAFE')
  const r = btn?.getBoundingClientRect()
  return r ? {x:r.x,y:r.y,w:r.width,h:r.height} : null
})
if (psRect) await page.touchscreen.tap(psRect.x + psRect.w/2, psRect.y + psRect.h/2)
await wait(250)
const modalOpen = await page.evaluate(() => document.body.innerText.includes('limit') || document.body.innerText.toLowerCase().includes('self-exclu') || document.body.innerText.toLowerCase().includes('session'))
console.log('PLAY SAFE tap -> modal/panel text present:', modalOpen)
await page.screenshot({ path: OUT + 'playsafe-modal.png' })

await browser.close()
