import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5184/'
const OUT = process.argv[3] || 'shots-holdgate-recolor-mobile-0703'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const MOBILE_VPS = [
  { name: 'm390x844', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: 'm412x915', width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
]

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

// Find the visible scroll-window rect (the overflow:auto ancestor of the
// canvas) AND the canvas's own (possibly off-screen) rect, so we can compute
// which tile-grid cells currently land inside the visible window.
const mobileGeom = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return null
  let el = c.parentElement
  let scrollEl = null
  while (el) {
    const cs = getComputedStyle(el)
    if (cs.overflow === 'auto' || cs.overflowY === 'auto') { scrollEl = el; break }
    el = el.parentElement
  }
  const cRect = c.getBoundingClientRect()
  const sRect = scrollEl ? scrollEl.getBoundingClientRect() : null
  return {
    canvas: { x: cRect.x, y: cRect.y, w: cRect.width, h: cRect.height },
    scroll: sRect ? { x: sRect.x, y: sRect.y, w: sRect.width, h: sRect.height } : null,
  }
})

async function tapVisibleTrail(page, n) {
  const g = await mobileGeom(page)
  if (!g || !g.scroll) return { count: 0, g }
  const tile = g.canvas.w / 32
  const colMin = Math.max(1, Math.ceil((g.scroll.x - g.canvas.x) / tile) + 1)
  const colMax = Math.min(30, Math.floor((g.scroll.x + g.scroll.w - g.canvas.x) / tile) - 1)
  const rowMin = Math.max(1, Math.ceil((g.scroll.y - g.canvas.y) / tile) + 1)
  const rowMax = Math.min(30, Math.floor((g.scroll.y + g.scroll.h - g.canvas.y) / tile) - 1)
  let count = 0
  const taps = []
  outer: for (let row = rowMin; row <= rowMax; row++) {
    for (let col = colMin; col <= colMax; col++) {
      if (count >= n) break outer
      const x = g.canvas.x + col * tile + tile / 2
      const y = g.canvas.y + row * tile + tile / 2
      taps.push([x, y])
      count++
    }
  }
  for (const [x, y] of taps) {
    await page.mouse.click(x, y)
    await wait(40)
  }
  return { count, g, colMin, colMax, rowMin, rowMax }
}

const geometry = (page) => page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
  scrollHeight: document.documentElement.scrollHeight,
  innerHeight: window.innerHeight,
}))

async function freshGoto(page) {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(500)
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: EXE, headless: 'new', defaultViewport: null,
    args: ['--autoplay-policy=no-user-gesture-required'],
  })
  const page = (await browser.pages())[0]
  const report = {}

  for (const vp of MOBILE_VPS) {
    const vr = {}
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: vp.deviceScaleFactor, isMobile: true, hasTouch: true })

    await freshGoto(page)
    await clickText(page, 'ENTER THE ASSAY LINE')
    await wait(400)
    const tapInfo = await tapVisibleTrail(page, 9)
    vr.tapInfo = tapInfo
    await wait(300)
    const bodyText1 = await page.evaluate(() => document.body.innerText)
    vr.trailArmedTextSnippet = bodyText1.includes('Claim-line armed')
    await page.screenshot({ path: `${OUT}/${vp.name}-02-planning.png` })

    const plunged = await clickText(page, 'PLUNGE')
    vr.plunged = plunged
    await wait(9 * 90 + 600)
    const text = (await page.evaluate(() => document.body.innerText))
    vr.finalTextSnippet = text.replace(/\n/g, ' | ').slice(0, 250)
    vr.settled = await geometry(page)
    await page.screenshot({ path: `${OUT}/${vp.name}-settled.png` })

    report[vp.name] = vr
    console.log(vp.name, JSON.stringify(vr, null, 2))
  }

  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
  await browser.close()
}

main()
