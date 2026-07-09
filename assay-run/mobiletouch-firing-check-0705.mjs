// Confirms real touchscreen.tap() (not click) actually drives state
// transitions for PLAY SAFE, bet steppers, and TEMPLE DEPTH selector.
import puppeteer from 'puppeteer-core'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = (await browser.pages())[0]
await page.emulate({ viewport: { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false } })
await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
await wait(400)

// Enter planning
const enter = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('ENTER THE ASSAY LINE')))
const enterEl = enter.asElement()
const eb = await enterEl.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })
await page.touchscreen.tap(eb.x, eb.y)
await wait(400)

// ── PLAY SAFE tap-fire ──
const before = await page.evaluate(() => document.body.innerText.includes('Session'))
const psBox = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('PLAY SAFE')); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })
await page.touchscreen.tap(psBox.x, psBox.y)
await wait(300)
const afterOpen = await page.evaluate(() => document.body.innerText)
console.log('PLAY SAFE tap opened panel:', /session|reality|self-exclu|safety/i.test(afterOpen))
// close it
const closeBox = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /close/i.test(x.textContent) || /close/i.test(x.getAttribute('aria-label')||'')); if(!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })
if (closeBox) { await page.touchscreen.tap(closeBox.x, closeBox.y); await wait(200) }

// ── bet stepper tap-fire ──
const betBefore = await page.evaluate(() => document.body.innerText.match(/BET[\s\S]{0,40}?([\d.]+)/i)?.[0])
const plusBox = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '+'); if(!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })
if (plusBox) { await page.touchscreen.tap(plusBox.x, plusBox.y); await wait(200) }
const betAfter = await page.evaluate(() => document.body.innerText.match(/BET[\s\S]{0,40}?([\d.]+)/i)?.[0])
console.log('bet stepper + fired (text changed):', betBefore !== betAfter, { betBefore, betAfter })

// ── TEMPLE DEPTH tier tap-fire ──
const tierBoxes = await page.evaluate(() => {
  const heading = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /TEMPLE DEPTH/i.test(e.textContent || ''))
  let container = heading.parentElement
  for (let i = 0; i < 4 && container; i++) {
    const btns = [...container.querySelectorAll('button')]
    if (btns.length >= 2) return btns.map((b) => { const r = b.getBoundingClientRect(); return { text: b.textContent.trim(), x: r.x + r.width / 2, y: r.y + r.height / 2, ariaPressed: b.getAttribute('aria-pressed'), cls: b.className } })
    container = container.parentElement
  }
  return []
})
console.log('tier boxes before:', tierBoxes.map(t => ({text: t.text, ariaPressed: t.ariaPressed})))
if (tierBoxes[2]) {
  await page.touchscreen.tap(tierBoxes[2].x, tierBoxes[2].y)
  await wait(200)
  const tierBoxesAfter = await page.evaluate(() => {
    const heading = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /TEMPLE DEPTH/i.test(e.textContent || ''))
    let container = heading.parentElement
    for (let i = 0; i < 4 && container; i++) {
      const btns = [...container.querySelectorAll('button')]
      if (btns.length >= 2) return btns.map((b) => ({ text: b.textContent.trim(), ariaPressed: b.getAttribute('aria-pressed') }))
      container = container.parentElement
    }
    return []
  })
  console.log('tier boxes after tapping 3rd tier:', tierBoxesAfter)
}

await browser.close()
