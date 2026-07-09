import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5189/'
fs.mkdirSync('shots-mobile-qa', { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
const page = (await browser.pages())[0]
await page.emulate({ viewport: { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, isLandscape: false }, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36' })
page.on('pageerror', e => console.log('PAGEERROR', e.message))

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(600)
const clickText = async (txt) => {
  const h = await page.evaluateHandle(t => [...document.querySelectorAll('button')].find(b => b.textContent && b.textContent.includes(t)) || null, txt)
  const el = h.asElement()
  if (el) { await el.click(); return true }
  return false
}
await clickText('ENTER THE ASSAY LINE')
await wait(500)

const findBtn = async (pred) => page.evaluate((predStr) => {
  const p = eval(predStr)
  const btns = [...document.querySelectorAll('button')]
  const b = btns.find(p)
  if (!b) return null
  const r = b.getBoundingClientRect()
  return { cx: r.x + r.width/2, cy: r.y + r.height/2 }
}, pred.toString())

const zoomPlus = await findBtn((b) => b.textContent.trim() === '+' && getComputedStyle(b).borderRadius !== '20px' && parseFloat(getComputedStyle(b).borderRadius) < 15)
console.log('zoomPlus button:', zoomPlus)
for (let i = 0; i < 3; i++) {
  await page.touchscreen.tap(zoomPlus.cx, zoomPlus.cy)
  await wait(150)
  const tileCountVisible = await page.evaluate(() => {
    // Sample canvas: count distinct tile boundary crossings along a horizontal scanline via pixel color deltas is complex;
    // Instead just read canvas width/height and report devicePixelRatio-normalized info.
    const c = document.querySelector('canvas')
    return { cw: c.width, ch: c.height, styleW: c.style.width, styleH: c.style.height }
  })
  console.log(`after tap ${i+1}:`, tileCountVisible)
}
await page.screenshot({ path: 'shots-mobile-qa/repro-A-immediately-after-3-taps.png' })
await wait(1500)
await page.screenshot({ path: 'shots-mobile-qa/repro-B-1500ms-later-idle.png' })

await browser.close()
