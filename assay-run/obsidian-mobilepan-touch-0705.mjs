// Real-touch (page.touchscreen) pan verification for the mobile 14x14 board
// (MOBILE_TILE_PX=46, native overflow:auto + touchAction:'pan-x pan-y' —
// page.mouse drag does NOT trigger native touch-scroll in Chromium, must use
// page.touchscreen per this codebase's own documented touch-QA gotcha).
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const OUT = path.resolve('C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-obsidian-0705/mobilepan')
fs.mkdirSync(OUT, { recursive: true })
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
const dismissCoachmark = async (page) => {
  const handle = await page.evaluateHandle(() => document.querySelector('button[aria-label="Dismiss how-to-play tip"]'))
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}

const scrollProbe = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas')
  let el = c ? c.parentElement : null
  while (el) {
    const cs = getComputedStyle(el)
    if ((cs.overflow === 'auto' || cs.overflow === 'scroll' || cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth) break
    el = el.parentElement
  }
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { rect: { x: r.x, y: r.y, w: r.width, h: r.height }, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop, scrollWidth: el.scrollWidth, scrollHeight: el.scrollHeight, clientWidth: el.clientWidth, clientHeight: el.clientHeight }
})

async function run(vp, label) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: vp })
  const page = (await browser.pages())[0]
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await wait(700)
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(400)
  await dismissCoachmark(page)
  await wait(200)

  const before = await scrollProbe(page)
  await page.screenshot({ path: `${OUT}/${label}-before-pan.png` })

  // Real touch drag: touchstart at one point, several touchmove steps, touchend.
  const startX = before.rect.x + before.clientWidth * 0.75
  const startY = before.rect.y + before.clientHeight * 0.5
  await page.touchscreen.touchStart(startX, startY)
  for (let i = 1; i <= 10; i++) {
    await page.touchscreen.touchMove(startX - i * 15, startY - i * 10)
    await wait(16)
  }
  await page.touchscreen.touchEnd()
  await wait(300)

  const afterOneDrag = await scrollProbe(page)
  await page.screenshot({ path: `${OUT}/${label}-after-pan-1.png` })

  // Second drag, opposite direction, to confirm bidirectional pan + prove it
  // isn't just an artifact of scroll momentum settling.
  const start2X = afterOneDrag.rect.x + afterOneDrag.clientWidth * 0.3
  const start2Y = afterOneDrag.rect.y + afterOneDrag.clientHeight * 0.3
  await page.touchscreen.touchStart(start2X, start2Y)
  for (let i = 1; i <= 10; i++) {
    await page.touchscreen.touchMove(start2X + i * 15, start2Y + i * 12)
    await wait(16)
  }
  await page.touchscreen.touchEnd()
  await wait(300)
  const afterTwoDrags = await scrollProbe(page)
  await page.screenshot({ path: `${OUT}/${label}-after-pan-2.png` })

  const overflowAfter = await page.evaluate(() => ({ bodyOverflowX: document.body.scrollWidth > window.innerWidth + 2 }))

  await browser.close()
  return { label, before, afterOneDrag, afterTwoDrags, overflowAfter, panMoved: before.scrollLeft !== afterOneDrag.scrollLeft || before.scrollTop !== afterOneDrag.scrollTop }
}

async function main() {
  const report = {}
  report.pixel7 = await run({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, 'pixel7')
  report.iphone14pro = await run({ width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, 'iphone14pro')
  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
}
main().catch((e) => { console.error('FATAL', e); process.exit(1) })
