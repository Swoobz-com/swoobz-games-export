import puppeteer from 'puppeteer-core'
import { PNG } from 'pngjs'
import fs from 'fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = ms => new Promise(r => setTimeout(r, ms))

// mean over region, plus mean of the TOP 20% brightest pixels (the coin faces)
// and the bed floor (mean of the darkest 20%, the inter-coin bed).
function stats(png, x0, y0, w, h) {
  const Ls = []
  const X1 = Math.min(png.width, x0 + w), Y1 = Math.min(png.height, y0 + h)
  for (let y = Math.max(0, y0); y < Y1; y++) {
    for (let x = Math.max(0, x0); x < X1; x++) {
      const i = (y * png.width + x) * 4
      Ls.push((0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2]) / 255)
    }
  }
  Ls.sort((a, b) => a - b)
  const n = Ls.length
  const mean = Ls.reduce((s, v) => s + v, 0) / n
  const top = Ls.slice(Math.floor(n * 0.8)).reduce((s, v) => s + v, 0) / (n - Math.floor(n * 0.8))
  const bed = Ls.slice(0, Math.floor(n * 0.2)).reduce((s, v) => s + v, 0) / Math.floor(n * 0.2)
  return { mean: +mean.toFixed(4), coin: +top.toFixed(4), bed: +bed.toFixed(4) }
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: false, defaultViewport: null, args: ['--autoplay-policy=no-user-gesture-required', '--window-size=1460,960'] })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(1600)
const b = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) } })
const buf = await page.screenshot({ type: 'png' })
const png = PNG.sync.read(Buffer.from(buf))
console.log('board rect:', JSON.stringify(b))

// Larger patch ~26% of board dim so it always spans ~3-4 full coins+gaps →
// same coin/bed ratio in every quadrant (removes coin-vs-gap alignment noise).
const pw = Math.round(b.w * 0.26), ph = Math.round(b.h * 0.26)
const insX = Math.round(b.w * 0.05), insY = Math.round(b.h * 0.05)
const cx = Math.round((b.left + b.right) / 2 - pw / 2), cy = Math.round((b.top + b.bottom) / 2 - ph / 2)
const pts = {
  'TL corner': [b.left + insX, b.top + insY],
  'TR corner': [b.right - insX - pw, b.top + insY],
  'BL corner': [b.left + insX, b.bottom - insY - ph],
  'BR corner (was dark)': [b.right - insX - pw, b.bottom - insY - ph],
  'CENTER': [cx, cy],
}
console.log('\n=== BOARD quadrant stats (0-1): mean | coin=top20% (pod faces) | bed=bottom20% (inter-coin) ===')
const R = {}
for (const [k, [x, y]] of Object.entries(pts)) { R[k] = stats(png, x, y, pw, ph); console.log(`  ${k.padEnd(22)} mean=${R[k].mean}  coin=${R[k].coin}  bed=${R[k].bed}`) }
const C = R['CENTER']
console.log('\n=== corner vs center ratios (1.0 = equal) ===')
for (const k of ['TL corner', 'TR corner', 'BL corner', 'BR corner (was dark)']) {
  console.log(`  ${k.padEnd(22)} mean=${(R[k].mean / C.mean).toFixed(3)}  coin=${(R[k].coin / C.coin).toFixed(3)}  bed=${(R[k].bed / C.bed).toFixed(3)}`)
}
await browser.close()
