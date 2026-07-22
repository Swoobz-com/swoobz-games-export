import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5189/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
const page = (await browser.pages())[0]
await page.emulate({ viewport: { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, isLandscape: false }, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36' })
page.on('pageerror', e => console.log('PAGEERROR', e.message))
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(600)
await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('ENTER THE ASSAY LINE')); b.click() })
await wait(500)

const scanline = async () => page.evaluate(() => {
  const c = document.querySelector('canvas')
  const ctx = c.getContext('2d')
  const y = Math.floor(c.height/2)
  const row = ctx.getImageData(0, y, c.width, 1).data
  let transitions = 0, prevDark = null
  for (let i = 0; i < row.length; i += 4) {
    const lum = (row[i]+row[i+1]+row[i+2])/3
    const dark = lum < 20
    if (prevDark !== null && dark !== prevDark) transitions++
    prevDark = dark
  }
  return { transitions, approxTilesVisible: Math.round(transitions/2), canvasPxW: c.width }
})

console.log('BEFORE zoom taps:', await scanline())

const zoomPlus = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')]
  const b = btns.find(x => x.textContent.trim()==='+' && parseFloat(getComputedStyle(x).borderRadius) < 15)
  const r = b.getBoundingClientRect()
  return { cx: r.x+r.width/2, cy: r.y+r.height/2, text: b.textContent, borderRadius: getComputedStyle(b).borderRadius }
})
console.log('zoomPlus target:', zoomPlus)

for (let i=0;i<3;i++){
  // verify what's actually at that point before tapping
  const at = await page.evaluate(({x,y}) => {
    const el = document.elementFromPoint(x,y)
    return el ? { tag: el.tagName, text: el.textContent.trim().slice(0,20) } : null
  }, {x: zoomPlus.cx, y: zoomPlus.cy})
  console.log(`tap ${i+1} elementFromPoint:`, at)
  await page.touchscreen.tap(zoomPlus.cx, zoomPlus.cy)
  await wait(200)
  console.log(`  after tap ${i+1}:`, await scanline())
}
await page.screenshot({ path: 'shots-mobile-qa/repro2-final.png' })
await browser.close()
