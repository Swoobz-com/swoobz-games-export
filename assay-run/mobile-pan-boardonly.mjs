import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5186/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-visreg-0704'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const clickText = async (page, txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true } })
const page = (await browser.pages())[0]
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await wait(400)
await clickText(page, 'ENTER THE ASSAY LINE')
await wait(400)

const scrollWrapperInfo = () => page.evaluate(() => {
  const c = document.querySelector('canvas')
  let el = c ? c.parentElement : null
  while (el) {
    const cs = getComputedStyle(el)
    if ((cs.overflow === 'auto' || cs.overflow === 'scroll' || cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth) break
    el = el.parentElement
  }
  if (!el) return null
  const r = el.getBoundingClientRect()
  return {
    rect: { x: r.x, y: r.y, w: r.width, h: r.height },
    scrollLeft: el.scrollLeft, scrollTop: el.scrollTop,
    scrollWidth: el.scrollWidth, scrollHeight: el.scrollHeight,
    clientWidth: el.clientWidth, clientHeight: el.clientHeight,
  }
})

const setScroll = (left, top) => page.evaluate((left, top) => {
  const c = document.querySelector('canvas')
  let el = c ? c.parentElement : null
  while (el) {
    const cs = getComputedStyle(el)
    if ((cs.overflow === 'auto' || cs.overflow === 'scroll' || cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth) break
    el = el.parentElement
  }
  if (!el) return { ok: false }
  el.scrollLeft = left
  el.scrollTop = top
  return { ok: true, actualLeft: el.scrollLeft, actualTop: el.scrollTop }
}, left, top)

const info0 = await scrollWrapperInfo()
fs.writeFileSync(`${OUT}/mobile-pan-wrapper-info.json`, JSON.stringify(info0, null, 2))
const r = info0.rect
const clip = { x: Math.max(0, r.x), y: Math.max(0, r.y), width: r.w, height: r.h }

await page.screenshot({ path: `${OUT}/boardonly-initial.png`, clip })

const maxL = info0.scrollWidth - info0.clientWidth
const maxT = info0.scrollHeight - info0.clientHeight
const corners = [
  ['top-left', 0, 0],
  ['top-right', maxL, 0],
  ['bottom-left', 0, maxT],
  ['bottom-right', maxL, maxT],
]
const results = { info0, corners: {} }
for (const [name, left, top] of corners) {
  const setRes = await setScroll(left, top)
  await wait(200)
  const after = await scrollWrapperInfo()
  results.corners[name] = { setRes, after }
  await page.screenshot({ path: `${OUT}/boardonly-${name}.png`, clip })
}

fs.writeFileSync(`${OUT}/mobile-pan-corner-results.json`, JSON.stringify(results, null, 2))
await browser.close()
console.log(JSON.stringify(results, null, 2))
