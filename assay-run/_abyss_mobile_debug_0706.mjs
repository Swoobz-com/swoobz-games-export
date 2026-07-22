import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/eed49dad-7609-4969-843a-cb4e422d24da/scratchpad/abyss-receipt-reverify'
fs.mkdirSync(OUT, { recursive: true })
const wait = ms => new Promise(r => setTimeout(r, ms))

const clickText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const els = [...document.querySelectorAll('button, div, span')]
  const b = els.find(x => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
  if (b) { b.click(); return b.textContent.trim() }
  return null
}, re.source)

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE ERR:', m.text()) })
page.on('pageerror', e => console.log('PAGEERROR:', e.message))
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true })
await page.goto(URL, { waitUntil: 'load' })
await page.evaluate(() => { try { window.localStorage.clear() } catch {} })
await page.reload({ waitUntil: 'load' })
await wait(500)
await page.screenshot({ path: `${OUT}/mobiledebug-1-lobby.png` })

const clicked = await clickText(page, /ENTER THE DIVE/)
console.log('clicked ENTER THE DIVE:', clicked)
await wait(400)
await page.screenshot({ path: `${OUT}/mobiledebug-2-planning.png` })

const geo = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return null
  const r = c.getBoundingClientRect()
  const scroller = c.closest('.assayBoardScroll')
  const sr = scroller ? scroller.getBoundingClientRect() : null
  return { canvas: { left: r.left, top: r.top, w: r.width, h: r.height }, scroller: sr ? { left: sr.left, top: sr.top, w: sr.width, h: sr.height, scrollWidth: scroller.scrollWidth, scrollHeight: scroller.scrollHeight } : null }
})
console.log('geo:', JSON.stringify(geo))

const bodyTxt = await page.evaluate(() => document.body.innerText.slice(0, 600))
console.log('bodyTxt:', bodyTxt)

await browser.close()
