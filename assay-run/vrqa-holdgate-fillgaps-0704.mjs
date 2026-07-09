import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const OUT = 'shots-FINAL-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = (await browser.pages())[0]

const clickByTextOrAria = async (txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return (
      btns.find((b) => b.textContent && b.textContent.includes(t)) ||
      btns.find((b) => (b.getAttribute('aria-label') || '').includes(t)) ||
      null
    )
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}
const canvasBox = () => page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return null
  const r = c.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})
const mobileBoardInfo = () => page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return null
  const wrap = c.parentElement
  const wrapRect = wrap ? wrap.getBoundingClientRect() : null
  return {
    wrapRect: wrapRect ? { x: wrapRect.x, y: wrapRect.y, w: wrapRect.width, h: wrapRect.height } : null,
    scrollLeft: wrap ? wrap.scrollLeft : null,
    scrollTop: wrap ? wrap.scrollTop : null,
  }
})
const ctaInfo = () => page.evaluate((vh) => {
  const btns = [...document.querySelectorAll('button')]
  const cta = btns.find((b) => b.textContent && b.textContent.includes('ASSAY AGAIN'))
  const busted = document.body.innerText.includes('BUSTED')
  if (!cta) return { found: false, busted }
  const r = cta.getBoundingClientRect()
  return { found: true, busted, top: r.top, bottom: r.bottom, aboveFoldPx: Math.max(0, r.bottom - vh) }
}, 0)
const trailCount = () => page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find((d) => /^\d+\s*$/.test((d.textContent || '').trim()) === false && (d.textContent || '').includes('/ 8 min'))
  return el ? el.textContent : null
})

async function freshLoad() {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(700)
}

async function paintDesktopTrail(box, n) {
  const tile = box.w / 10
  let count = 0
  for (let row = 2; row < 10 && count < n; row++) {
    for (let col = 2; col < 10 && count < n; col++) {
      await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
      count++
      await wait(15)
    }
  }
  return count
}

// Paint a reliable grid of tiles strictly inside the current scroll window (no shifting).
async function paintMobileTrailReliable(info, cols, rows) {
  const TILE = 46
  const startCol = Math.floor(info.scrollLeft / TILE)
  const startRow = Math.floor(info.scrollTop / TILE)
  let count = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const col = startCol + c
      const row = startRow + r
      const localX = col * TILE + TILE / 2 - info.scrollLeft
      const localY = row * TILE + TILE / 2 - info.scrollTop
      const x = info.wrapRect.x + localX
      const y = info.wrapRect.y + localY
      if (localX < 2 || localX > info.wrapRect.w - 2 || localY < 2 || localY > info.wrapRect.h - 2) continue
      await page.touchscreen.tap(x, y)
      count++
      await wait(90)
    }
  }
  return count
}

const results = {}

// ── DESKTOP WIN (Lean Floor, high odds) ──
for (const vp of [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
]) {
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 })
  let win = null
  for (let attempt = 0; attempt < 6 && !win; attempt++) {
    await freshLoad()
    await clickByTextOrAria('ENTER THE ASSAY LINE')
    await wait(300)
    await clickByTextOrAria('Lean Floor')
    await wait(150)
    const board = await canvasBox()
    await paintDesktopTrail(board, 8)
    await wait(200)
    await clickByTextOrAria('RUN THE LINE')
    await wait(2800)
    const info = await ctaInfo()
    if (info.found && !info.busted) {
      win = { attempt: attempt + 1, ...info }
      await page.screenshot({ path: `${OUT}/${vp.name}-06-settled-WIN.png` })
    }
  }
  results[`${vp.name}-desktopWin`] = win || { found: false }
}

// ── MOBILE BUST (Heavy Floor, reliable in-window paint) ──
for (const vp of [
  { name: 'pixel7-412x915', width: 412, height: 915 },
  { name: 'iphone14pro-393x852', width: 393, height: 852 },
]) {
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  let bust = null
  for (let attempt = 0; attempt < 10 && !bust; attempt++) {
    await freshLoad()
    await clickByTextOrAria('ENTER THE ASSAY LINE')
    await wait(300)
    await clickByTextOrAria('Heavy Floor')
    await wait(150)
    const mb = await mobileBoardInfo()
    const painted = await paintMobileTrailReliable(mb, 4, 3) // up to 12 tiles
    await wait(200)
    const tCount = await trailCount()
    if (painted < 8) { continue }
    await clickByTextOrAria('RUN THE LINE')
    await wait(4500)
    const info = await ctaInfo()
    if (info.found && info.busted) {
      bust = { attempt: attempt + 1, painted, trailCountLabel: tCount, ...info }
      await page.screenshot({ path: `${OUT}/${vp.name}-07-settled-BUST.png` })
    }
  }
  results[`${vp.name}-mobileBust`] = bust || { found: false }
}

fs.writeFileSync(`${OUT}/report-fillgaps.json`, JSON.stringify(results, null, 2))
console.log(JSON.stringify(results, null, 2))
await browser.close()
