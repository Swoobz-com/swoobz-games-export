import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5194/'
const OUT = process.argv[3] || 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-vrqa-full-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '2560x1440', width: 2560, height: 1440 },
]

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
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

const ctaInfo = () => page.evaluate((vh) => {
  const btns = [...document.querySelectorAll('button')]
  const cta = btns.find((b) => b.textContent && b.textContent.includes('ASSAY AGAIN'))
  const busted = document.body.innerText.includes('BUSTED')
  if (!cta) return { found: false, busted }
  const r = cta.getBoundingClientRect()
  return { found: true, busted, top: r.top, bottom: r.bottom, aboveFoldPx: Math.max(0, r.bottom - vh) }
}, 0)

const plateChecks = () => page.evaluate(() => {
  const all = [...document.querySelectorAll('div')]
  const hasBg = (needle) => all.some((d) => (getComputedStyle(d).backgroundImage || '').includes(needle))
  const wordmarks = [...document.querySelectorAll('img[alt="THE ASSAY LINE"]')].map((i) => ({
    src: i.getAttribute('src'), w: i.getBoundingClientRect().width, h: i.getBoundingClientRect().height,
    naturalW: i.naturalWidth, naturalH: i.naturalHeight,
  }))
  return {
    backdrop: hasBg('backdrop'),
    plateConsole: hasBg('plate-console'),
    plateSpecimen: hasBg('plate-specimen'),
    wordmarks,
    tallyDialPresent: document.body.innerText.includes('TALLY') || !!document.querySelector('[class*="tally" i]'),
  }
})

// sample dormant tile (row 3 col 3) + proven tile (row3 col2, after reveal) using GRID_DIM=20
const sampleCoin = (row, col) => page.evaluate((b, row, col) => {
  const c = document.querySelector('canvas')
  const ctx = c.getContext('2d')
  const scaleX = c.width / b.w
  const scaleY = c.height / b.h
  const tile = (b.w / 20) * scaleX
  const cx = Math.floor(col * tile + tile / 2)
  const cy = Math.floor(row * tile + tile / 2)
  const cornerX = Math.max(0, Math.floor(col * tile + 1))
  const cornerY = Math.max(0, Math.floor(row * tile + 1))
  const center = [...ctx.getImageData(cx, cy, 1, 1).data]
  const corner = [...ctx.getImageData(cornerX, cornerY, 1, 1).data]
  return { center, corner }
}, sampleCoin.box, row, col)

// banding probe: sample a horizontal scanline across the board backdrop area
// (top row, y=8px into canvas) at N points, looking for exact-repeated runs
// of identical RGB (a signature of 8-bit gradient banding) vs. smooth-ish
// monotonic drift (dithered/3-stop gradient).
const bandingProbe = () => page.evaluate(() => {
  const c = document.querySelector('canvas')
  const ctx = c.getContext('2d')
  const w = c.width, h = c.height
  const y = Math.floor(h * 0.06) // near top, inside the corner-spill radial area
  const samples = []
  const N = 200
  for (let i = 0; i < N; i++) {
    const x = Math.floor((i / N) * w)
    const d = ctx.getImageData(x, y, 1, 1).data
    samples.push([d[0], d[1], d[2]])
  }
  // count consecutive-identical-value runs of length >= 4 (a plateau = band)
  let runs = 0, curRun = 1, maxRun = 1
  for (let i = 1; i < samples.length; i++) {
    const same = samples[i][0] === samples[i - 1][0] && samples[i][1] === samples[i - 1][1] && samples[i][2] === samples[i - 1][2]
    if (same) { curRun++; if (curRun >= 4) runs++; maxRun = Math.max(maxRun, curRun) } else curRun = 1
  }
  // unique color count as a rough proxy: full smooth gradient across N samples should have close to N unique colors (allow for dithering)
  const uniq = new Set(samples.map((s) => s.join(','))).size
  return { N, plateauRunsOfAtLeast4: runs, maxRun, uniqueColors: uniq }
})

const report = {}

async function paintSerpentine(box, n, startRow, rowStep, colStart, colStep) {
  const tile = box.w / 20
  let count = 0
  for (let row = startRow; row < 20 && count < n; row += rowStep) {
    for (let col = colStart; col < 20 && count < n; col += colStep) {
      await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
      count++
      await wait(15)
    }
  }
  return count
}

for (const vp of VIEWPORTS) {
  const vpReport = {}
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 })

  // ---------- LOBBY ----------
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(600)
  vpReport.lobbyOverflow = await overflow()
  vpReport.lobbyOverflowPx = Math.max(0, vpReport.lobbyOverflow.scrollHeight - vpReport.lobbyOverflow.innerHeight)
  const lobbyPlates = await plateChecks()
  vpReport.lobbyPlates = lobbyPlates
  await page.screenshot({ path: `${OUT}/${vp.name}-01-lobby.png` })

  // ---------- PLANNING ----------
  await clickText('ENTER THE ASSAY LINE')
  await wait(500)
  const board = await canvasBox()
  vpReport.boardRect = board
  vpReport.tilePx = board ? +(board.w / 20).toFixed(2) : null
  vpReport.planningOverflow = await overflow()
  vpReport.planningPlates = await plateChecks()
  await page.screenshot({ path: `${OUT}/${vp.name}-02-planning.png` })

  sampleCoin.box = board
  vpReport.coinDormantSample = await sampleCoin(3, 3)
  vpReport.bandingProbe = await bandingProbe()

  // ---------- PAINT SHORT TRAIL (win attempt) ----------
  await paintSerpentine(board, 9, 3, 2, 2, 3)
  await wait(300)
  vpReport.trailPaintedOverflow = await overflow()
  await page.screenshot({ path: `${OUT}/${vp.name}-03-trail-painted.png` })

  // ---------- PLUNGE -> ASSAYING (capture mid-cascade + hero effects) ----------
  await clickText('THROW BREAKER')
  await wait(350)
  await page.screenshot({ path: `${OUT}/${vp.name}-04-assaying-early.png` })
  await wait(700)
  await page.screenshot({ path: `${OUT}/${vp.name}-05-assaying-mid.png` })
  await wait(500) // catch hero-pop / board-sweep window right at settle
  await page.screenshot({ path: `${OUT}/${vp.name}-06-settle-moment-heroEffects.png` })
  await wait(1500)

  // ---------- SETTLED (win expected) ----------
  const win1 = await ctaInfo()
  win1.aboveFoldPx = win1.found ? Math.max(0, win1.bottom - vp.height) : null
  vpReport.settledWinCta = win1
  vpReport.settledOverflow_win = await overflow()
  vpReport.settledPlates_win = await plateChecks()
  await page.screenshot({ path: `${OUT}/${vp.name}-07-settled-${win1.busted ? 'BUST' : 'WIN'}.png` })

  const boardAfter = await canvasBox()
  sampleCoin.box = boardAfter
  vpReport.coinProvenSample = await sampleCoin(3, 2)

  const gbOpened = await clickText('GLASS BOX')
  await wait(350)
  vpReport.glassBoxOpened = gbOpened
  await page.screenshot({ path: `${OUT}/${vp.name}-08-settled-gb-open.png` })

  // ---------- FORCE A BUST FOR CTA-ABOVE-FOLD(BUST) ----------
  let bustReport = { attempts: 0, found: false }
  for (let attempt = 0; attempt < 6 && !bustReport.busted; attempt++) {
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
    await wait(400)
    await clickText('ENTER THE ASSAY LINE')
    await wait(300)
    const b2 = await canvasBox()
    await paintSerpentine(b2, 36, 1, 1, 1, 2)
    await wait(200)
    await clickText('THROW BREAKER')
    await wait(4200)
    const info = await ctaInfo()
    info.aboveFoldPx = info.found ? Math.max(0, info.bottom - vp.height) : null
    bustReport = { attempts: attempt + 1, ...info }
    if (info.busted) {
      await page.screenshot({ path: `${OUT}/${vp.name}-09-settled-BUST-effects.png` })
    }
  }
  vpReport.settledBustCta = bustReport
  vpReport.settledOverflow_bust = await overflow()

  report[vp.name] = vpReport
}

report.consoleErrors = errors
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
await browser.close()
