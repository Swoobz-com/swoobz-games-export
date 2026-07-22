// INDEPENDENT re-verify, call-count instrumentation (immune to shared-machine
// CPU-noise that pollutes raw frame-timing — this box has a live multi-tab
// Chrome browser running concurrently). Monkey-patches
// CanvasRenderingContext2D.prototype.drawImage BEFORE app scripts load, buckets
// call-counts per rAF frame, and reports the drawImage-call-count for the frame
// nearest each of the 8 reveal steps. A full O(196) rebake shows as a frame with
// ~196+ drawImage calls (one per tile, drawTile calls ctx.drawImage(sprites.X)
// per tile); the fixed O(9) incremental bake should show a low double-digit count.
import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = ms => new Promise(r => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })

// Patch drawImage before any app code runs, on every navigation.
await page.evaluateOnNewDocument(() => {
  window.__frameCounts = []
  window.__curCount = 0
  let raf0 = null
  const origDrawImage = CanvasRenderingContext2D.prototype.drawImage
  CanvasRenderingContext2D.prototype.drawImage = function (...args) {
    window.__curCount++
    return origDrawImage.apply(this, args)
  }
  function tick() {
    window.__frameCounts.push(window.__curCount)
    window.__curCount = 0
    raf0 = requestAnimationFrame(tick)
  }
  window.__startCounting = () => { window.__frameCounts = []; window.__curCount = 0; raf0 = requestAnimationFrame(tick) }
  window.__stopCounting = () => { if (raf0) cancelAnimationFrame(raf0); return window.__frameCounts.slice() }
})

await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
const title = await page.title()
console.log(`TITLE: "${title}"`)

await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /ENTER THE ASSAY LINE/i.test(x.textContent || '')); b && b.click() })
await wait(300)
await page.evaluate(() => {
  const heading = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && /TEMPLE DEPTH/i.test(e.textContent || ''))
  let c = heading?.parentElement
  for (let i = 0; i < 4 && c; i++) { const btns = [...c.querySelectorAll('button')]; if (btns.length >= 2) { btns[0].click(); return } c = c.parentElement }
})
await wait(150)
const geo = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width, h: r.height } })
console.log(`BOARD: canvas ${geo.w.toFixed(1)}x${geo.h.toFixed(1)}px, GRID_DIM=14 (196 tiles), tile=${(geo.w/14).toFixed(2)}px`)
const paceLabel = await page.evaluate(() => {
  const el = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && /PACE:/i.test(e.textContent || ''))
  return el ? el.textContent : null
})
console.log(`PACE LABEL: ${paceLabel}`)

const TILE = geo.w / 14
const TRAIL_LEN = 8
const cells = []
for (let i = 0; i < TRAIL_LEN; i++) cells.push([2 + (i % 4), 2 + Math.floor(i / 4)])
for (const [col, row] of cells) {
  await page.mouse.click(geo.left + col * TILE + TILE / 2, geo.top + row * TILE + TILE / 2)
  await wait(35)
}
await wait(200)

await page.evaluate(() => window.__startCounting())
await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /RUN THE LINE/i.test(x.textContent || '')); b && b.click() })
await wait(3000)
const frameCounts = await page.evaluate(() => window.__stopCounting())
const outcome = await page.evaluate(() => {
  const t = document.body.innerText
  return { won: /LINE CLAIMED|CLAIMED/i.test(t), bust: /BUSTED|BUST/i.test(t) }
})

// Analyze: bucket frames by drawImage-call-count. Full rebake threshold: >=100
// (196 tiles, each >=1 drawImage). Incremental/no-op frames: low count.
const full = frameCounts.filter(c => c >= 100)
const incremental = frameCounts.filter(c => c > 12 && c < 100)
const idle = frameCounts.filter(c => c <= 12)
console.log(`\nOutcome: ${outcome.won ? 'WON' : outcome.bust ? 'BUST' : '?'}`)
console.log(`Total frames captured: ${frameCounts.length}`)
console.log(`Max drawImage calls in a single frame: ${Math.max(...frameCounts)}`)
console.log(`Frames with >=100 drawImage calls (FULL-BAKE signature, ~196 tiles): ${full.length}  values=${JSON.stringify(full)}`)
console.log(`Frames with 13-99 drawImage calls (mid-range, e.g. multiple incremental bakes coalesced): ${incremental.length}  values=${JSON.stringify(incremental.slice(0,20))}`)
console.log(`Frames with <=12 drawImage calls (idle/incremental O(9) signature): ${idle.length}`)
console.log(`\nFull frame-count sequence (first 120): ${JSON.stringify(frameCounts.slice(0, 120))}`)

await browser.close()
