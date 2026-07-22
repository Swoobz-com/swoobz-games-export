import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = (await browser.pages())[0]
await page.emulate({ viewport: { width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true } })
await page.goto(URL, { waitUntil: 'networkidle0' })
await page.evaluate(() => localStorage.setItem('assay_coachmark_seen_v1', '1'))
await page.reload({ waitUntil: 'networkidle0' })
await wait(300)

const tapText = async (txt) => {
  const box = await page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').includes(t))
    if (!b) return null
    const r = b.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, txt)
  if (box) await page.touchscreen.tap(box.x, box.y)
}

await tapText('ENTER THE DIVE')
await wait(400)
// pick REEF tier (fewest mines) for a fast likely-WON reveal, low bet, then arm 8 pods and run
const canvasGeom = await page.evaluate(() => {
  const scroll = document.querySelector('.assayBoardScroll')
  const canvas = scroll.querySelector('canvas')
  const sr = scroll.getBoundingClientRect()
  const cr = canvas.getBoundingClientRect()
  return { scrollRect: { top: sr.top, left: sr.left, width: sr.width, height: sr.height }, canvasRect: { top: cr.top, left: cr.left, width: cr.width, height: cr.height } }
})
const TILE = 46, GRID_DIM = 14
const { scrollRect, canvasRect } = canvasGeom
const visLeft = Math.max(canvasRect.left, scrollRect.left)
const visRight = Math.min(canvasRect.left + canvasRect.width, scrollRect.left + scrollRect.width)
const visTop = Math.max(canvasRect.top, scrollRect.top)
const visBottom = Math.min(canvasRect.top + canvasRect.height, scrollRect.top + scrollRect.height)
const colStart = Math.ceil((visLeft - canvasRect.left) / TILE)
const colEnd = Math.floor((visRight - canvasRect.left) / TILE) - 1
const rowStart = Math.ceil((visTop - canvasRect.top) / TILE)
const rowEnd = Math.floor((visBottom - canvasRect.top) / TILE) - 1
const candidates = []
for (let r = rowStart; r <= rowEnd; r++) for (let cx = colStart; cx <= colEnd; cx++) candidates.push({ r, c: cx })
for (const t of candidates.slice(0, 8)) {
  const x = canvasRect.left + (t.c + 0.5) * TILE
  const y = canvasRect.top + (t.r + 0.5) * TILE
  await page.touchscreen.tap(x, y)
  await wait(60)
}

const runBox = await page.evaluate(() => {
  const b = document.querySelector('button[aria-label*="Run the line"]')
  const r = b.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, disabled: b.disabled }
})
if (!runBox.disabled) await page.touchscreen.tap(runBox.x, runBox.y)
await wait(3000)

const sameLineBox = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').includes('SAME LINE'))
  if (!b) return null
  const r = b.getBoundingClientRect()
  const cs = getComputedStyle(b)
  return { top: r.top, bottom: r.bottom, height: r.height, width: r.width, touchAction: cs.touchAction, text: b.textContent, viewportH: window.innerHeight }
})
console.log('SAME LINE (settled):', JSON.stringify(sameLineBox, null, 2))

const diveAgain = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').includes('DIVE AGAIN'))
  if (!b) return null
  const r = b.getBoundingClientRect()
  return { top: r.top, bottom: r.bottom, height: r.height, viewportH: window.innerHeight }
})
console.log('DIVE AGAIN:', JSON.stringify(diveAgain, null, 2))
await page.screenshot({ path: 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-reverify-touch-0706b/iphone14pro-05-settled.png' })

// fire test SAME LINE
if (sameLineBox) {
  const cx = (sameLineBox.top !== undefined) ? null : null
}
await browser.close()
