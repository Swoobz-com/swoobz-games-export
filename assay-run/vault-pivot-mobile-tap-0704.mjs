import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5186/'
const OUT = 'shots-vault-pivot-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const label = 'pixel7'

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: 'new',
  defaultViewport: { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
})
const page = (await browser.pages())[0]
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE.ERROR: ' + m.text()) })

await page.goto(URL, { waitUntil: 'networkidle0' })
await wait(400)

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

await clickText('ENTER THE ASSAY LINE')
await wait(300)

// Select Flooded Floor (mirrors the desktop run) via a real tap (click == mousedown+mouseup at same point == a tap, matching onPointerDownMobile/onPointerUpMobile's TAP_MOVE_THRESHOLD_PX gate).
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')]
  const b = btns.find((b) => /Flooded Floor/.test(b.textContent || ''))
  if (b) b.click()
})
await wait(200)
await page.screenshot({ path: `${OUT}/${label}-03-flooded-selected.png` })

// Discrete per-tile TAPS (not a drag) — matches AssayGridCanvas.tsx's mobile
// onPointerDownMobile/onPointerUpMobile contract exactly (a real drag/pan
// gets intercepted as native scroll on mobile; only a tap under
// TAP_MOVE_THRESHOLD_PX toggles a tile). Find real ON-SCREEN tile centers by
// intersecting the canvas's full content rect (scrolled) with its scrollable
// parent's visible window rect, so every tap lands on an actually-visible tile.
const TILE = 46
const rects = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  const cr = c.getBoundingClientRect()
  const pr = c.parentElement.getBoundingClientRect()
  return { canvas: { left: cr.left, top: cr.top }, viewport: { left: pr.left, top: pr.top, right: pr.right, bottom: pr.bottom } }
})

const tapped = []
outer: for (let row = 0; row < 10; row++) {
  for (let col = 0; col < 10; col++) {
    const cx = rects.canvas.left + col * TILE + TILE / 2
    const cy = rects.canvas.top + row * TILE + TILE / 2
    const margin = 4
    if (
      cx > rects.viewport.left + margin &&
      cx < rects.viewport.right - margin &&
      cy > rects.viewport.top + margin &&
      cy < rects.viewport.bottom - margin
    ) {
      await page.mouse.click(cx, cy)
      tapped.push({ row, col, cx, cy })
      await wait(40)
      if (tapped.length >= 10) break outer
    }
  }
}
fs.writeFileSync(`${OUT}/${label}-tapped-tiles.json`, JSON.stringify({ rects, tapped }, null, 2))
await wait(200)
await page.screenshot({ path: `${OUT}/${label}-04-painted.png` })

const trailInfo = await page.evaluate(() => document.body.innerText.match(/Claim-line armed[^\n]*|Select \d+ more[^\n]*/)?.[0] || 'NO_TRAIL_STATUS_FOUND')
fs.writeFileSync(`${OUT}/${label}-trail-status.txt`, trailInfo)

await clickText('THROW BREAKER')
await wait(2500)
await page.screenshot({ path: `${OUT}/${label}-05-assaying-or-settled.png` })
await wait(1500)
await page.screenshot({ path: `${OUT}/${label}-06-settled.png` })

const bodyText = await page.evaluate(() => document.body.innerText)
fs.writeFileSync(`${OUT}/${label}-bodytext.txt`, bodyText)

await browser.close()
fs.writeFileSync(`${OUT}/${label}-tap-errors.json`, JSON.stringify(errors, null, 2))
console.log('tapped', tapped.length, 'tiles. trailInfo:', trailInfo)
console.log('errors:', errors.length, errors.join('\n'))
