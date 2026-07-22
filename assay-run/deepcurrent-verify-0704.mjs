import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5183/'
const OUT = 'shots-deepcurrent-0704'
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
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('CONSOLE.ERROR: ' + m.text())
})

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
const canvasBox = () =>
  page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
async function paintSerpentine(n, box) {
  const tile = box.w / 32
  let count = 0
  for (let row = 3; row < 30 && count < n; row += 2) {
    for (let col = 2; col < 30 && count < n; col += 3) {
      await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
      count++
      await wait(6)
    }
  }
}

const report = {}

for (const vp of VIEWPORTS) {
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(500)

  // ── Lobby: wordmark hero, backdrop present ──────────────────────────────
  const lobbyInfo = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img[alt="THE ASSAY LINE"]')]
    const bg = getComputedStyle(document.body.firstElementChild || document.body).backgroundImage
    return {
      wordmarkImgCount: imgs.length,
      wordmarkSrcs: imgs.map((i) => i.getAttribute('src')),
    }
  })
  const shellBg = await page.evaluate(() => {
    // The outer flex shell is the first div with minHeight 100dvh — walk to find it.
    const all = [...document.querySelectorAll('div')]
    const shell = all.find((d) => getComputedStyle(d).backgroundImage.includes('.png'))
    return shell ? getComputedStyle(shell).backgroundImage.slice(0, 160) : null
  })
  await page.screenshot({ path: `${OUT}/${vp.name}-01-lobby.png` })

  await clickText('ENTER THE ASSAY LINE')
  await wait(300)

  // ── Planning: header wordmark (collapsed), BreakerLever present, plate bg,
  // gauge-strip canvas height taller than the tile-only board would be. ─────
  const planningInfo = await page.evaluate(() => {
    const headerImg = document.querySelector('img[alt="THE ASSAY LINE"]')
    const breaker = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('THROW BREAKER'))
    const canvas = document.querySelector('canvas')
    const canvasStyleH = canvas ? parseFloat(getComputedStyle(canvas).height) : null
    return {
      headerWordmarkPresent: !!headerImg,
      breakerPresent: !!breaker,
      canvasStyleH,
    }
  })
  const board = await canvasBox()
  // gauge strip check: canvas rendered height should exceed the square board
  // width by roughly GAUGE_STRIP_PX(30)+GAUGE_STRIP_GAP_PX(8)=38px (desktop only)
  const gaugeStripDeltaPx = board ? board.h - board.w : null
  await page.screenshot({ path: `${OUT}/${vp.name}-02-planning.png` })

  await paintSerpentine(10, board)
  await wait(200)
  await page.screenshot({ path: `${OUT}/${vp.name}-03-trail-painted.png` })

  const plunged = await clickText('THROW BREAKER')
  await wait(3200)

  const settledInfo = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const cta = btns.find((b) => b.textContent && b.textContent.includes('ASSAY AGAIN'))
    const specimenPlates = [...document.querySelectorAll('div')].filter((d) =>
      d.textContent?.trim().startsWith('SPECIMEN CASE ·'),
    )
    if (!cta) return { found: false, specimenCaseCount: specimenPlates.length }
    const r = cta.getBoundingClientRect()
    return {
      found: true,
      rect: { top: r.top, bottom: r.bottom },
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
      specimenCaseCount: specimenPlates.length,
      bodyText: document.body.innerText.slice(0, 160),
    }
  })
  await page.screenshot({ path: `${OUT}/${vp.name}-04-settled.png` })

  report[vp.name] = {
    lobbyInfo,
    shellBgHasPngUrl: !!shellBg,
    planningInfo,
    gaugeStripDeltaPx,
    plunged,
    settledInfo,
    ctaBelowFoldPx: settledInfo.found ? Math.max(0, settledInfo.rect.bottom - vp.height) : null,
  }
}

// Mobile one-line header check + wordmark
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(400)
const mobileInfo = await page.evaluate(() => {
  const img = document.querySelector('img[alt="THE ASSAY LINE"]')
  const safeLink = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('PLAY SAFE'))
  return {
    wordmarkPresent: !!img,
    safeLinkRect: safeLink ? safeLink.getBoundingClientRect().height : null,
  }
})
await page.screenshot({ path: `${OUT}/mobile390-01-lobby.png` })
report.mobile390 = mobileInfo

report.consoleErrors = errors

console.log(JSON.stringify(report, null, 2))
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
await browser.close()
