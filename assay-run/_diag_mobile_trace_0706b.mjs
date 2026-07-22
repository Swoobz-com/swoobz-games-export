import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = ms => new Promise(r => setTimeout(r, ms))
const clickText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const els = [...document.querySelectorAll('button, div, span')]
  const b = els.find(x => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
  if (b) { b.click(); return b.textContent.trim() }
  return null
}, re.source)
async function boardVisibleGeo(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    let rect = c.getBoundingClientRect()
    let cur = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }
    let anc = c.parentElement
    while (anc && anc !== document.documentElement) {
      const s = getComputedStyle(anc)
      if (s.overflow !== 'visible' || s.overflowX !== 'visible' || s.overflowY !== 'visible') {
        const ar = anc.getBoundingClientRect()
        cur = { left: Math.max(cur.left, ar.left), top: Math.max(cur.top, ar.top), right: Math.min(cur.right, ar.right), bottom: Math.min(cur.bottom, ar.bottom) }
      }
      anc = anc.parentElement
    }
    cur.left = Math.max(cur.left, 0); cur.top = Math.max(cur.top, 0)
    cur.right = Math.min(cur.right, window.innerWidth); cur.bottom = Math.min(cur.bottom, window.innerHeight)
    return { left: cur.left, top: cur.top, w: cur.right - cur.left, h: cur.bottom - cur.top, raw: { left: rect.left, top: rect.top, w: rect.width, h: rect.height } }
  })
}
async function trace(page, cells) {
  for (const [col, row] of cells) {
    const geo = await boardVisibleGeo(page)
    const TILE = geo.raw.w / 14
    let x = geo.raw.left + col * TILE + TILE / 2
    let y = geo.raw.top + row * TILE + TILE / 2
    x = Math.min(Math.max(x, geo.left + 2), geo.left + geo.w - 2)
    y = Math.min(Math.max(y, geo.top + 2), geo.top + geo.h - 2)
    await page.mouse.click(x, y)
    await wait(40)
  }
}
const line8 = [[3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3]]
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
await page.goto(URL, { waitUntil: 'load' })
await page.evaluate(() => { try { window.localStorage.clear() } catch {} })
await page.reload({ waitUntil: 'load' })
await wait(500)
await clickText(page, /ENTER THE DIVE/)
await wait(400)
await clickText(page, /REEF/i)
await wait(150)
await trace(page, line8)
await wait(200)
const bodyText1 = await page.evaluate(() => document.body.innerText.slice(0, 400))
console.log('AFTER TRACE, body text snippet:\n', bodyText1)
console.log('---')
const clickRes = await clickText(page, /^RUN THE LINE/)
console.log('clicked RUN THE LINE ->', clickRes)
await wait(500)
const bodyText2 = await page.evaluate(() => document.body.innerText.slice(0, 400))
console.log('AFTER RUN CLICK, body text snippet:\n', bodyText2)
await page.screenshot({ path: 'assay-run-diag-mobile-trace.png' })
await browser.close()
