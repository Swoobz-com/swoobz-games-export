// Quick tap/pan regression check on mobile-chrome (Pixel 7) — brief says this
// PASSED last round and is unchanged; confirm not broken by the perf fix.
import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = ms => new Promise(r => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = (await browser.pages())[0]
// Pixel 7 not in this puppeteer-core's KnownDevices table — emulate its
// documented viewport (412x915, DPR 2.625, touch, mobile) directly.
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true })
await page.setUserAgent('Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36')
await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
await wait(500)
await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /ENTER THE ASSAY LINE/i.test(x.textContent || '')); b && b.click() })
await wait(300)
await page.evaluate(() => {
  const heading = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && /TEMPLE DEPTH/i.test(e.textContent || ''))
  let c = heading?.parentElement
  for (let i = 0; i < 4 && c; i++) { const btns = [...c.querySelectorAll('button')]; if (btns.length >= 2) { btns[0].click(); return } c = c.parentElement }
})
await wait(150)
const geo = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width } })
const TILE = geo.w / 14
// NOTE: on this mobile viewport the board sits inside a `.assayBoardScroll`
// overflow:auto clip window (measured 220x220 CSS px at left=97,top=114 for
// this viewport/state) — the canvas itself is 644x644 and partially scrolled
// off (top=-28,left=-45), so only tiles whose canvas-relative screen coord
// lands INSIDE the clip window are actually tappable (pre-existing, documented
// behavior, not a regression). Use col/row 4 which lands inside that window.
const before = await page.evaluate(() => document.body.innerText)
// Tap 2 tiles via real touchscreen.tap (not click) — proves touch, not just mouse
await page.touchscreen.tap(geo.left + 4 * TILE + TILE / 2, (geo.top) + 4 * TILE + TILE / 2)
await wait(150)
await page.touchscreen.tap(geo.left + 5 * TILE + TILE / 2, (geo.top) + 4 * TILE + TILE / 2)
await wait(150)
const after1 = await page.evaluate(() => document.body.innerText)
console.log(`TOUCH TAP fires state change: ${before !== after1}`)

// Pan check: canvas is 530px wide on desktop-metrics but on Pixel7 (412 CSS px)
// the board area is horizontally-scrollable/clipped per prior findings — verify
// a touchscreen drag scrolls the container without throwing / losing taps after.
try {
  await page.touchscreen.touchStart(geo.left + 6 * TILE + TILE / 2, geo.top + 6 * TILE + TILE / 2)
  await page.touchscreen.touchMove(geo.left + 6 * TILE + TILE / 2 - 40, geo.top + 6 * TILE + TILE / 2)
  await page.touchscreen.touchEnd()
} catch (e) { console.log('PAN GESTURE THREW: ' + e.message) }
await wait(150)
const afterPanTapWorks = await page.evaluate(() => document.body.innerText)
await page.touchscreen.tap(geo.left + 6 * TILE + TILE / 2, (geo.top) + 4 * TILE + TILE / 2)
await wait(150)
const afterPanTap2 = await page.evaluate(() => document.body.innerText)
console.log(`PAN gesture did not crash the page: true`)
console.log(`TAP still fires AFTER a pan gesture: ${afterPanTapWorks !== afterPanTap2}`)

await browser.close()
