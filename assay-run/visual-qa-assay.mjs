import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5189/'
const OUT = 'shots-visual-qa'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const errors = []

const VIEWPORTS = [
  { name: 'd1440', width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  { name: 'd1920', width: 1920, height: 1080, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  { name: 'mobile412', width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
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
const bodyText = (page) => page.evaluate(() => document.body.innerText)
const canvasBox = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return null
  const r = c.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})
const canvasNonBlank = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return { ok: false }
  const ctx = c.getContext('2d')
  const { width, height } = c
  if (!width || !height) return { ok: false, width, height }
  const data = ctx.getImageData(0, 0, width, height).data
  let nonBg = 0
  let sampled = 0
  for (let i = 0; i < data.length; i += 4 * 97) {
    sampled++
    const r = data[i], g = data[i + 1], b = data[i + 2]
    if (r > 30 || g > 25 || b > 20) nonBg++
  }
  return { ok: true, nonBg, sampled, width, height }
})

const measureGeometry = (page) => page.evaluate(() => {
  const canvas = document.querySelector('canvas')
  const boardRect = canvas ? canvas.getBoundingClientRect() : null
  // Specimen cases: absolute-positioned divs pinned to left/right edge,
  // width === RAIL_GUTTER.maxWidth (200px), identified structurally (not by
  // class name since these are inline-styled components).
  let candidates = [...document.querySelectorAll('div')].filter((d) => {
    const cs = getComputedStyle(d)
    if (cs.position !== 'absolute') return false
    const r = d.getBoundingClientRect()
    return r.width >= 190 && r.width <= 230 && r.height > 100
  })
  // Dedupe nested matches: keep only the outermost absolute-positioned box
  // per specimen case (its own children may also be ~200px wide).
  candidates = candidates.filter((d) => !candidates.some((other) => other !== d && other.contains(d)))
  const gutterRects = candidates.map((d) => {
    const r = d.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
  })
  return {
    board: boardRect
      ? { x: Math.round(boardRect.x), y: Math.round(boardRect.y), w: Math.round(boardRect.width), h: Math.round(boardRect.height) }
      : null,
    gutters: gutterRects,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    bodyScrollWidth: document.body.scrollWidth,
    hasToAssayText: document.body.innerText.includes('TO ASSAY'),
  }
})

async function paintSerpentine(page, n, box) {
  const tile = box.w / 32
  let count = 0
  for (let row = 3; row < 30 && count < n; row += 2) {
    for (let col = 2; col < 30 && count < n; col += 3) {
      await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
      count++
      await wait(12)
    }
  }
  return count
}

async function freshGoto(page) {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(500)
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: EXE,
    headless: 'new',
    defaultViewport: null,
    args: ['--autoplay-policy=no-user-gesture-required'],
  })
  const page = (await browser.pages())[0]
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('CONSOLE.ERROR: ' + m.text())
  })

  const report = {}

  for (const vp of VIEWPORTS) {
    const vr = {}
    await page.setViewport({
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: vp.deviceScaleFactor,
      isMobile: vp.isMobile,
      hasTouch: vp.hasTouch,
    })

    // ── LOBBY ──────────────────────────────────────────────────────────────
    await freshGoto(page)
    vr.lobby = { ...(await measureGeometry(page)), ...{ nonBlank: null } }
    await page.screenshot({ path: `${OUT}/${vp.name}-01-lobby.png` })

    // ── PLANNING (bet-entry, trail painted) ─────────────────────────────────
    await clickText(page, 'ENTER THE ASSAY LINE')
    await wait(400)
    let box = await canvasBox(page)
    await paintSerpentine(page, 10, box)
    await wait(300)
    vr.planning = await measureGeometry(page)
    vr.planning.nonBlank = await canvasNonBlank(page)
    await page.screenshot({ path: `${OUT}/${vp.name}-02-planning.png` })

    // ── ASSAYING (mid-cascade, ~50% into run) ───────────────────────────────
    await clickText(page, 'PLUNGE')
    await wait(Math.round((10 * 90) / 2)) // ~50% of a 10-tile cascade
    vr.assaying = await measureGeometry(page)
    vr.assaying.nonBlank = await canvasNonBlank(page)
    vr.assaying.bodyTextSnippet = (await bodyText(page)).replace(/\n/g, ' | ').slice(0, 160)
    await page.screenshot({ path: `${OUT}/${vp.name}-03-assaying.png` })
    await wait(2000) // drain this round so it doesn't bleed into next goto

    // ── SETTLED-WIN (retry with a small trail; low bust probability) ───────
    let wonCapture = null
    for (let attempt = 0; attempt < 6 && !wonCapture; attempt++) {
      await freshGoto(page)
      await clickText(page, 'ENTER THE ASSAY LINE')
      await wait(350)
      box = await canvasBox(page)
      await paintSerpentine(page, 8, box)
      await wait(250)
      await clickText(page, 'PLUNGE')
      await wait(8 * 90 + 500)
      const text = (await bodyText(page)).replace(/\n/g, ' | ')
      if (text.includes('CLAIM PROVEN')) {
        wonCapture = { attempt, text: text.slice(0, 220) }
        vr.settledWin = await measureGeometry(page)
        vr.settledWin.nonBlank = await canvasNonBlank(page)
        vr.settledWin.attempt = attempt
        await page.screenshot({ path: `${OUT}/${vp.name}-04-settled-win.png` })
      }
    }
    if (!wonCapture) vr.settledWin = { FAILED_TO_CAPTURE: true }

    // ── SETTLED-BUST (retry with a long serpentine trail; high bust prob) ──
    let bustCapture = null
    for (let attempt = 0; attempt < 6 && !bustCapture; attempt++) {
      await freshGoto(page)
      await clickText(page, 'ENTER THE ASSAY LINE')
      await wait(350)
      box = await canvasBox(page)
      await paintSerpentine(page, 34, box)
      await wait(300)
      await clickText(page, 'PLUNGE')
      await wait(4500)
      const text = (await bodyText(page)).replace(/\n/g, ' | ')
      if (text.includes('BUSTED')) {
        bustCapture = { attempt, text: text.slice(0, 220) }
        vr.settledBust = await measureGeometry(page)
        vr.settledBust.nonBlank = await canvasNonBlank(page)
        vr.settledBust.attempt = attempt
        await page.screenshot({ path: `${OUT}/${vp.name}-05-settled-bust.png` })
      }
    }
    if (!bustCapture) vr.settledBust = { FAILED_TO_CAPTURE: true }

    report[vp.name] = vr
  }

  report.errors = errors
  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  await browser.close()
}

main()
