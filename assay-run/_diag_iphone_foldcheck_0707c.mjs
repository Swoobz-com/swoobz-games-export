import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickTextScroll(page, txt, mobile) {
  const rect = await page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find(
      (x) => (x.textContent && x.textContent.includes(t)) || (x.getAttribute('aria-label') || '').includes(t),
    )
    if (!b || b.disabled) return { found: false }
    b.scrollIntoView({ block: 'center' })
    const r = b.getBoundingClientRect()
    return { found: true, x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top, bottom: r.bottom }
  }, txt)
  if (!rect.found) return false
  if (mobile) await page.touchscreen.tap(rect.x, rect.y)
  else await page.mouse.click(rect.x, rect.y)
  return rect
}
async function bodyText(page) { return page.evaluate(() => document.body.innerText) }

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: 393, height: 852, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
await page.goto('http://localhost:5182/', { waitUntil: 'networkidle0' })
await page.evaluate(() => { try { localStorage.clear() } catch {} })
await page.reload({ waitUntil: 'networkidle0' })
await wait(200)

// go to planning, arm a trail, run it, then check fold reachability on re-arm.
await page.evaluate(() => {})
const enter = await clickTextScroll(page, 'ENTER THE DIVE', true)
console.log('enter:', enter)
await wait(150)
const tier = await clickTextScroll(page, 'REEF SHELF', true)
console.log('tier:', tier)
await wait(80)

// tap 8 tiles via scroller
async function tapTile(idx) {
  const rect = await page.evaluate((idx) => {
    const GRID_DIM = 14
    const scroller = document.querySelector('.assayBoardScroll')
    const canvas = document.querySelector('canvas')
    const canvasRect = canvas.getBoundingClientRect()
    const tile = canvasRect.width / GRID_DIM
    const col = idx % GRID_DIM, row = Math.floor(idx / GRID_DIM)
    const targetX = col * tile + tile / 2, targetY = row * tile + tile / 2
    const viewW = scroller.clientWidth, viewH = scroller.clientHeight
    const maxScrollX = Math.max(0, canvasRect.width - viewW)
    const maxScrollY = Math.max(0, canvasRect.height - viewH)
    scroller.scrollLeft = Math.max(0, Math.min(maxScrollX, targetX - viewW / 2))
    scroller.scrollTop = Math.max(0, Math.min(maxScrollY, targetY - viewH / 2))
    const sRect = scroller.getBoundingClientRect()
    return { x: sRect.left + (targetX - scroller.scrollLeft), y: sRect.top + (targetY - scroller.scrollTop) }
  }, idx)
  await page.touchscreen.tap(rect.x, rect.y)
  await wait(20)
}
for (const idx of [0, 1, 20, 21, 45, 68, 90, 91]) await tapTile(idx)
await wait(100)
console.log('armed trail text:', (await bodyText(page)).includes('RUN THE LINE'))

// FIRST commit — check reachability BEFORE any round completes.
const foldInfo1 = await page.evaluate(() => ({
  scrollHeight: document.documentElement.scrollHeight,
  clientHeight: document.documentElement.clientHeight,
  bodyOverflowY: getComputedStyle(document.body).overflowY,
  htmlOverflowY: getComputedStyle(document.documentElement).overflowY,
}))
console.log('foldInfo BEFORE first RUN THE LINE:', foldInfo1)
const run1 = await clickTextScroll(page, 'RUN THE LINE', true)
console.log('run1 click rect (after scrollIntoView):', run1)
await wait(4000)
const settledTxt1 = await bodyText(page)
console.log('settled after run1:', settledTxt1.includes('WRECK RECKONING'), settledTxt1.includes('SECURED THE HAUL') ? 'WON' : settledTxt1.includes('RUGGED') ? 'BUST' : 'UNKNOWN')

// Now check fold info AFTER first round (session summary now present).
const foldInfo2 = await page.evaluate(() => ({
  scrollHeight: document.documentElement.scrollHeight,
  clientHeight: document.documentElement.clientHeight,
}))
console.log('foldInfo AFTER round 1 settle:', foldInfo2)

// Restart via DIVE AGAIN, re-arm same trail, check RUN THE LINE reachability again.
const diveAgain = await clickTextScroll(page, 'DIVE AGAIN', true)
console.log('diveAgain click:', diveAgain)
await wait(300)
await clickTextScroll(page, 'REEF SHELF', true)
await wait(80)
for (const idx of [0, 1, 20, 21, 45, 68, 90, 91]) await tapTile(idx)
await wait(100)
const foldInfo3 = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes('RUN THE LINE'))
  const r = b ? b.getBoundingClientRect() : null
  return {
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
    runRectBeforeScroll: r ? { top: r.top, bottom: r.bottom } : null,
    runVisibleWithoutScroll: r ? (r.top >= 0 && r.bottom <= document.documentElement.clientHeight) : null,
  }
})
console.log('foldInfo before 2nd RUN THE LINE (re-armed, NO scrollIntoView yet):', foldInfo3)
await page.screenshot({ path: 'iphone-foldcheck-rearmed-noscroll.png' })

const run2 = await clickTextScroll(page, 'RUN THE LINE', true) // this DOES scrollIntoView first
console.log('run2 click rect (after scrollIntoView):', run2)
await wait(4000)
const settledTxt2 = await bodyText(page)
console.log('settled after run2:', settledTxt2.includes('WRECK RECKONING'), settledTxt2.includes('SECURED THE HAUL') ? 'WON' : settledTxt2.includes('RUGGED') ? 'BUST' : 'UNKNOWN')
await page.screenshot({ path: 'iphone-foldcheck-after-run2.png' })

await browser.close()
