import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5187/'
const OUT = process.argv[3] || 'shots-vrqa-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '2560x1440', width: 2560, height: 1440 },
]

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: 'new',
  defaultViewport: null,
})
const page = (await browser.pages())[0]
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE.ERROR: ' + m.text()) })

const clickText = async (txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
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
const overflow = () => page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
  scrollHeight: document.documentElement.scrollHeight,
  innerHeight: window.innerHeight,
}))
async function paintSerpentine(n, box, startRow = 3, rowStep = 2, colStart = 2, colStep = 3) {
  const tile = box.w / 32
  let count = 0
  for (let row = startRow; row < 30 && count < n; row += rowStep) {
    for (let col = colStart; col < 30 && count < n; col += colStep) {
      await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
      count++
      await wait(8)
    }
  }
  return count
}

// Sample the canvas for scenic/coin variance checks
const sampleCanvas = () => page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return null
  const ctx = c.getContext('2d')
  const { width, height } = c
  try {
    const data = ctx.getImageData(0, 0, width, height).data
    // 3x3 grid sample
    const pts = []
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const x = Math.floor(width * (0.15 + i * 0.35))
        const y = Math.floor(height * (0.15 + j * 0.35))
        const idx = (y * width + x) * 4
        pts.push([data[idx], data[idx + 1], data[idx + 2]])
      }
    }
    const mean = pts.reduce((a, p) => a + (p[0] + p[1] + p[2]) / 3, 0) / pts.length
    const variance = pts.reduce((a, p) => {
      const v = (p[0] + p[1] + p[2]) / 3
      return a + (v - mean) * (v - mean)
    }, 0) / pts.length
    return { width, height, pts, variance }
  } catch (e) {
    return { error: String(e) }
  }
})

const headerCyanCount = () => page.evaluate(() => {
  // rough probe: count elements with a computed style containing cyan-ish rgb near volt/cyan
  return null // placeholder, header tape probe not central to this run
})

const bgImageOf = (selectorFn) => page.evaluate((fnStr) => {
  // eslint-disable-next-line no-eval
  const fn = eval(fnStr)
  const el = fn()
  if (!el) return null
  return getComputedStyle(el).backgroundImage
}, selectorFn.toString())

const report = {}

for (const vp of VIEWPORTS) {
  const vpReport = {}
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 })

  // ---------- LOBBY ----------
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(600)
  vpReport.lobbyOverflow = await overflow()
  const lobbyBackdrop = await page.evaluate(() => {
    const all = [...document.querySelectorAll('div')]
    const shell = all.find((d) => getComputedStyle(d).backgroundImage.includes('backdrop'))
    return shell ? getComputedStyle(shell).backgroundImage.slice(0, 200) : null
  })
  const lobbyWordmark = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img[alt="THE ASSAY LINE"]')]
    return imgs.map((i) => ({ src: i.getAttribute('src'), w: i.getBoundingClientRect().width, h: i.getBoundingClientRect().height }))
  })
  vpReport.lobbyBackdropBgImage = lobbyBackdrop
  vpReport.lobbyWordmarks = lobbyWordmark
  await page.screenshot({ path: `${OUT}/${vp.name}-01-lobby.png` })

  // ---------- PLANNING ----------
  await clickText('ENTER THE ASSAY LINE')
  await wait(400)
  vpReport.planningOverflow = await overflow()
  const board = await canvasBox()
  vpReport.boardRect = board
  vpReport.gaugeStripDeltaPx = board ? +(board.h - board.w).toFixed(1) : null
  const headerBg = await page.evaluate(() => {
    const all = [...document.querySelectorAll('div')]
    const el = all.find((d) => getComputedStyle(d).backgroundImage.includes('plate-console'))
    return el ? true : false
  })
  vpReport.headerPlateConsolePresent = headerBg
  await page.screenshot({ path: `${OUT}/${vp.name}-02-planning.png` })

  // dormant coin sample (unrevealed tile, pick a tile near top-left of board)
  const coinDormantSample = await page.evaluate((b) => {
    const c = document.querySelector('canvas')
    const ctx = c.getContext('2d')
    const scaleX = c.width / b.w
    const scaleY = c.height / b.h
    const tile = (b.w / 32) * scaleX
    // sample a dormant tile center and its corner
    const cx = Math.floor(3 * tile + tile / 2)
    const cy = Math.floor(3 * tile + tile / 2)
    const cornerX = Math.floor(3 * tile + 1)
    const cornerY = Math.floor(3 * tile + 1)
    const center = ctx.getImageData(cx, cy, 1, 1).data
    const corner = ctx.getImageData(cornerX, cornerY, 1, 1).data
    return { center: [...center], corner: [...corner] }
  }, board)
  vpReport.coinDormantSample = coinDormantSample

  // ---------- BET-ENTRY / TRAIL PAINTED (short trail for WIN attempt) ----------
  await paintSerpentine(9, board, 3, 2, 2, 3)
  await wait(300)
  vpReport.trailPaintedOverflow = await overflow()
  await page.screenshot({ path: `${OUT}/${vp.name}-03-trail-painted.png` })

  // ---------- PLUNGE -> ASSAYING (capture mid-cascade for effects) ----------
  const plunged = await clickText('THROW BREAKER')
  await wait(500)
  await page.screenshot({ path: `${OUT}/${vp.name}-04-assaying-early.png` })
  await wait(900)
  await page.screenshot({ path: `${OUT}/${vp.name}-05-assaying-mid.png` })
  await wait(1800)

  // ---------- SETTLED (win expected w/ short trail, but re-check) ----------
  const settledInfo1 = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const cta = btns.find((b) => b.textContent && b.textContent.includes('ASSAY AGAIN'))
    const outcome = document.body.innerText.includes('BUSTED') ? 'BUST' : (document.body.innerText.includes('PROVEN') || document.body.innerText.includes('CLAIM') ? 'WIN' : 'UNKNOWN')
    if (!cta) return { found: false, outcome }
    const r = cta.getBoundingClientRect()
    return { found: true, outcome, rect: { top: r.top, bottom: r.bottom }, bodyTextSample: document.body.innerText.slice(0, 220) }
  })
  vpReport.settledOverflow = await overflow()
  vpReport.settledPass1 = settledInfo1
  vpReport.ctaAboveFoldPx_pass1 = settledInfo1.found ? Math.max(0, settledInfo1.rect.bottom - vp.height) : null
  const specimenBg1 = await page.evaluate(() => {
    const all = [...document.querySelectorAll('div')]
    return all.some((d) => getComputedStyle(d).backgroundImage.includes('plate-specimen'))
  })
  vpReport.specimenPlatePresent_pass1 = specimenBg1
  await page.screenshot({ path: `${OUT}/${vp.name}-06-settled-pass1-${settledInfo1.outcome}.png` })

  // Try to open Glass Box drawer if present
  const gbOpened = await clickText('GLASS BOX')
  await wait(300)
  await page.screenshot({ path: `${OUT}/${vp.name}-07-settled-gb-${gbOpened}.png` })

  // proven coin sample after settle (if win, revealed tiles should show proven coin)
  const boardAfter = await canvasBox()
  const coinProvenSample = await page.evaluate((b) => {
    const c = document.querySelector('canvas')
    const ctx = c.getContext('2d')
    const scaleX = c.width / b.w
    const scaleY = c.height / b.h
    const tile = (b.w / 32) * scaleX
    const cx = Math.floor(2 * tile + tile / 2)
    const cy = Math.floor(3 * tile + tile / 2)
    const cornerX = Math.floor(2 * tile + 1)
    const cornerY = Math.floor(3 * tile + 1)
    const center = ctx.getImageData(cx, cy, 1, 1).data
    const corner = ctx.getImageData(cornerX, cornerY, 1, 1).data
    return { center: [...center], corner: [...corner] }
  }, boardAfter)
  vpReport.coinProvenSample_afterFirstTilesRevealed = coinProvenSample

  // ---------- RESET & attempt a BUST for CTA-above-fold(bust) ----------
  let bustReport = { attempts: 0, found: false }
  for (let attempt = 0; attempt < 5 && !bustReport.found; attempt++) {
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
    await wait(400)
    await clickText('ENTER THE ASSAY LINE')
    await wait(300)
    const b2 = await canvasBox()
    await paintSerpentine(38, b2, 3, 2, 2, 3)
    await wait(200)
    await clickText('THROW BREAKER')
    await wait(4200)
    const info = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')]
      const cta = btns.find((b) => b.textContent && b.textContent.includes('ASSAY AGAIN'))
      const busted = document.body.innerText.includes('BUSTED')
      if (!cta) return { found: false, busted }
      const r = cta.getBoundingClientRect()
      return { found: true, busted, rect: { top: r.top, bottom: r.bottom }, bodyTextSample: document.body.innerText.slice(0, 220) }
    })
    bustReport = { attempts: attempt + 1, ...info }
    if (info.busted) {
      await page.screenshot({ path: `${OUT}/${vp.name}-08-settled-BUST.png` })
    }
  }
  vpReport.bustAttemptReport = bustReport
  vpReport.ctaAboveFoldPx_bust = bustReport.found && bustReport.busted ? Math.max(0, bustReport.rect.bottom - vp.height) : null
  vpReport.settledBustOverflow = await overflow()

  report[vp.name] = vpReport
}

report.consoleErrors = errors
fs.writeFileSync(`${OUT}/report-desktop.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
await browser.close()
