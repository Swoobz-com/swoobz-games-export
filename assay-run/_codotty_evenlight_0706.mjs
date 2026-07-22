import puppeteer from 'puppeteer-core'
import { PNG } from 'pngjs'
import fs from 'fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = ms => new Promise(r => setTimeout(r, ms))

function lumOfRect(png, x0, y0, w, h) {
  let sum = 0, n = 0
  const X1 = Math.min(png.width, x0 + w), Y1 = Math.min(png.height, y0 + h)
  for (let y = Math.max(0, y0); y < Y1; y++) {
    for (let x = Math.max(0, x0); x < X1; x++) {
      const i = (y * png.width + x) * 4
      const L = (0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2]) / 255
      sum += L; n++
    }
  }
  return +(sum / n).toFixed(4)
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: false, defaultViewport: null, args: ['--autoplay-policy=no-user-gesture-required', '--window-size=1460,960'] })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(1600) // planning / idle board settled

const b = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  const r = c.getBoundingClientRect()
  return { left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }
})
const buf = await page.screenshot({ type: 'png' })
fs.writeFileSync('shots-evenlight-planning.png', buf)
const png = PNG.sync.read(Buffer.from(buf))
console.log('board rect:', JSON.stringify(b))

// Sample patches inset 14% from each board corner (avoids CSS edge-fade / frame),
// patch ~9% of board dim. Center patch same size at board center.
const insX = Math.round(b.w * 0.14), insY = Math.round(b.h * 0.14)
const pw = Math.round(b.w * 0.09), ph = Math.round(b.h * 0.09)
const cx = Math.round((b.left + b.right) / 2 - pw / 2)
const cy = Math.round((b.top + b.bottom) / 2 - ph / 2)
const pts = {
  'TL corner': [b.left + insX, b.top + insY],
  'TR corner': [b.right - insX - pw, b.top + insY],
  'BL corner': [b.left + insX, b.bottom - insY - ph],
  'BR corner (was dark)': [b.right - insX - pw, b.bottom - insY - ph],
  'CENTER': [cx, cy],
}
console.log('\n=== BOARD 4-CORNER vs CENTER mean luminance (0-1), planning board ===')
const res = {}
for (const [k, [x, y]] of Object.entries(pts)) { res[k] = lumOfRect(png, x, y, pw, ph); console.log(`  ${k.padEnd(22)} L=${res[k]}`) }
const center = res['CENTER']
console.log('\n=== ratio corner/center (1.0 = equal) ===')
let worst = 1
for (const k of ['TL corner', 'TR corner', 'BL corner', 'BR corner (was dark)']) {
  const r = +(res[k] / center).toFixed(3)
  if (Math.abs(1 - r) > Math.abs(1 - worst)) worst = r
  console.log(`  ${k.padEnd(22)} ${r}`)
}
console.log(`\nworst corner/center ratio = ${worst}  (|1-ratio| = ${Math.abs(1 - worst).toFixed(3)})`)
await browser.close()
