import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5560/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: 'new',
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
})
const page = (await browser.pages())[0]
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE.ERROR: ' + m.text()) })

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
await wait(1200) // let coin sprites decode (real PNG bake)

const canvasBox = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  const r = c.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})

// Sample luminance of DORMANT coin CENTERS across a grid of tile centers
// (20x20 board) — avoid the very edges (rim/gaps) and sample the coin body
// itself (a small box average around each tile center) so the number
// reflects the coin's OWN rendered brightness, not anti-aliasing noise.
const sample = await page.evaluate((box) => {
  const c = document.querySelector('canvas')
  const ctx = c.getContext('2d')
  const dpr = c.width / box.w
  const GRID_DIM = 20
  const tile = box.w / GRID_DIM
  const samples = []
  for (let row = 2; row < GRID_DIM; row += 3) {
    for (let col = 2; col < GRID_DIM; col += 3) {
      const cx = Math.round((col * tile + tile / 2) * dpr)
      const cy = Math.round((row * tile + tile / 2) * dpr)
      const boxPx = Math.max(2, Math.round(tile * dpr * 0.18))
      const data = ctx.getImageData(cx - boxPx, cy - boxPx, boxPx * 2, boxPx * 2).data
      let rSum = 0, gSum = 0, bSum = 0, n = 0
      for (let i = 0; i < data.length; i += 4) {
        rSum += data[i]; gSum += data[i + 1]; bSum += data[i + 2]; n++
      }
      const r = rSum / n, g = gSum / n, b = bSum / n
      // relative luminance (perceptual, standard Rec.709 coefficients)
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
      samples.push({ row, col, r: Math.round(r), g: Math.round(g), b: Math.round(b), lum: Math.round(lum * 10) / 10 })
    }
  }
  const avgLum = samples.reduce((a, s) => a + s.lum, 0) / samples.length
  return { count: samples.length, avgLum: Math.round(avgLum * 100) / 100, samples: samples.slice(0, 8) }
}, canvasBox)

await page.screenshot({ path: 'shots-polish-0704-desktop-planning.png' })
// Tight crop around a small cluster of coins for visual proof.
const cropX = Math.round(canvasBox.x + canvasBox.w * 0.3)
const cropY = Math.round(canvasBox.y + canvasBox.h * 0.3)
await page.screenshot({ path: 'shots-polish-0704-desktop-crop.png', clip: { x: cropX, y: cropY, width: 220, height: 220 } })

console.log(JSON.stringify({ canvasBox, sample, errors }, null, 2))
await browser.close()
