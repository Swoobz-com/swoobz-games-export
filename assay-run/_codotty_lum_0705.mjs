import puppeteer from 'puppeteer-core'
import { PNG } from 'pngjs'
import fs from 'fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = ms => new Promise(r => setTimeout(r, ms))

function lumOfRect(png, x0, y0, w, h) {
  let sum = 0, n = 0, max = 0
  const X1 = Math.min(png.width, x0 + w), Y1 = Math.min(png.height, y0 + h)
  for (let y = Math.max(0, y0); y < Y1; y++) {
    for (let x = Math.max(0, x0); x < X1; x++) {
      const i = (y * png.width + x) * 4
      const L = (0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2]) / 255
      sum += L; n++; if (L > max) max = L
    }
  }
  return { mean: +(sum / n).toFixed(3), max: +max.toFixed(3), n }
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: false, defaultViewport: null, args: ['--autoplay-policy=no-user-gesture-required', '--window-size=1460,960'] })
const page = (await browser.pages())[0]

// ---- DESKTOP 1440 ----
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(1400)
const geo = await page.evaluate(() => {
  const out = {}
  const canvas = document.querySelector('canvas')
  if (canvas) { const r = canvas.getBoundingClientRect(); out.board = { top: Math.round(r.top), left: Math.round(r.left), right: Math.round(r.right), bottom: Math.round(r.bottom) } }
  return out
})
const dBuf = await page.screenshot({ type: 'png' })
fs.writeFileSync('shots-codotty-lum-desktop.png', dBuf)
const dpng = PNG.sync.read(Buffer.from(dBuf))
console.log('DESKTOP board rect:', JSON.stringify(geo.board))
const b = geo.board || { left: 460, right: 980, top: 120, bottom: 640 }
const desk = {
  'LEFT-margin-mid': lumOfRect(dpng, 40, 430, 90, 120),
  'LEFT-margin-upper (key pool zone)': lumOfRect(dpng, 120, 130, 140, 100),
  'LEFT-temple-band': lumOfRect(dpng, 70, 620, 120, 160),
  'RIGHT-margin-mid': lumOfRect(dpng, 1310, 430, 90, 120),
  'RIGHT-temple-band': lumOfRect(dpng, 1250, 620, 120, 160),
  'TOP-center torch pool (accent)': lumOfRect(dpng, 690, 30, 80, 55),
  'TOP-left strip': lumOfRect(dpng, 30, 20, 200, 60),
  'FAR-corner bottom-right': lumOfRect(dpng, 1370, 840, 60, 55),
  'FAR-corner bottom-left': lumOfRect(dpng, 10, 840, 60, 55),
  'BOARD-center (coins, should be brightest)': lumOfRect(dpng, Math.round((b.left + b.right) / 2) - 40, Math.round((b.top + b.bottom) / 2) - 40, 80, 80),
}
console.log('\n=== DESKTOP 1440 composited luminance (0-1) ===')
for (const [k, v] of Object.entries(desk)) console.log(`  ${k.padEnd(42)} mean=${v.mean}  max=${v.max}`)

// ---- MOBILE 412 top band ----
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(1400)
const mBuf = await page.screenshot({ type: 'png' })
fs.writeFileSync('shots-codotty-lum-mobile.png', mBuf)
const mpng = PNG.sync.read(Buffer.from(mBuf))
const mob = {
  'TOP-band left (temple/ambient)': lumOfRect(mpng, 10, 8, 90, 26),
  'TOP-band center torch pool (accent)': lumOfRect(mpng, 170, 4, 72, 26),
  'TOP-band right (ambient)': lumOfRect(mpng, 300, 8, 90, 26),
}
console.log('\n=== MOBILE 412 top-band composited luminance (0-1) ===')
for (const [k, v] of Object.entries(mob)) console.log(`  ${k.padEnd(42)} mean=${v.mean}  max=${v.max}`)

await browser.close()
