// fabi-holdgate-verify-0706.mjs — INDEPENDENT verifier for the "round 3"
// control-column content-fill fix (GRIDV2 VOID CLOSE). Written from scratch
// by the verifier agent (not copied from the maker's own driver) so the
// measurement logic itself is not inherited from a script the maker already
// tuned to report PASS. Captures desktop 1440-wide x {900,1000,1080,1118}
// heights x {lobby,betEntry,playing,settled}, plus mobile (Pixel 7 412x915,
// iPhone 14 Pro 393x852) for betEntry+playing.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '6301'
const OUT = process.argv[3] || 'shots-fabi-holdgate-0706'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

async function clickText(page, t, within) {
  const h = await page.evaluateHandle(
    ({ t, within }) => {
      const root = within ? document.querySelector(within) : document
      if (!root) return null
      const els = [...root.querySelectorAll('button,[role=button],a')]
      const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
      const lc = t.toLowerCase()
      return (
        els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
        els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) ||
        null
      )
    },
    { t, within },
  )
  const el = h.asElement()
  if (!el) return false
  try {
    await el.click()
  } catch {
    return false
  }
  return true
}

async function clickCell(page, col, row, cols, rows) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  if (!box) return false
  const fx = 0.05 + ((col + 0.5) / cols) * 0.9
  const fy = 0.06 + ((row + 0.5) / rows) * 0.82
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
  return true
}

function rect(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return {
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      left: Math.round(r.left),
      right: Math.round(r.right),
      w: Math.round(r.width),
      h: Math.round(r.height),
    }
  }, sel)
}

function scrollInfo(page) {
  return page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    hasVScroll: document.documentElement.scrollHeight > window.innerHeight,
    hasHScroll: document.documentElement.scrollWidth > window.innerWidth,
  }))
}

// independent "content bottom" measure: max bottom-Y of DesktopControlColumn's
// OWN direct children (does not assume which testid is literally last).
function maxChildBottom(page) {
  return page.evaluate(() => {
    const col = document.querySelector('[data-testid="DesktopControlColumn"]')
    if (!col) return null
    const colRect = col.getBoundingClientRect()
    let bottom = colRect.top
    const perChild = []
    for (const child of col.children) {
      const cr = child.getBoundingClientRect()
      if (cr.height === 0) continue
      perChild.push({ tag: child.getAttribute('data-testid') || child.tagName, bottom: Math.round(cr.bottom) })
      if (cr.bottom > bottom) bottom = cr.bottom
    }
    return { columnTop: Math.round(colRect.top), columnBottom: Math.round(colRect.bottom), maxChildBottom: Math.round(bottom), perChild }
  })
}

function phaseText(page) {
  return page.evaluate(() => document.querySelector('[data-testid="vault-grid-topbar"]')?.textContent || '')
}

async function measurePhase(page, phaseName) {
  const board = await rect(page, '[data-testid="vault-canvas-shell"]')
  const colFill = await maxChildBottom(page)
  const scroll = await scrollInfo(page)
  const cta = await rect(page, '[data-testid="vault-ctl-cta"]')
  const boardBottom = board ? board.bottom : null
  const columnBottom = colFill ? colFill.columnBottom : null
  const genericContentBottom = colFill ? colFill.maxChildBottom : null
  // task-specified metric: bottom of vault-ctl-cta specifically (BetEntry primary check)
  const ctaContentBottom = cta ? cta.bottom : null
  const contentBottomForVoid = ctaContentBottom != null ? ctaContentBottom : genericContentBottom
  const voidPx = columnBottom != null && contentBottomForVoid != null ? Math.round(columnBottom - contentBottomForVoid) : null
  const alignDelta = boardBottom != null && contentBottomForVoid != null ? Math.round(boardBottom - contentBottomForVoid) : null
  return {
    phase: phaseName,
    boardTop: board ? board.top : null,
    boardBottom,
    boardLeft: board ? board.left : null,
    boardRight: board ? board.right : null,
    columnTop: colFill ? colFill.columnTop : null,
    columnBottom,
    columnLeft: cta ? cta.left : null,
    columnRight: cta ? cta.right : null,
    genericContentBottom,
    ctaContentBottom,
    voidPx,
    alignDelta,
    hasVScroll: scroll.hasVScroll,
    hasHScroll: scroll.hasHScroll,
    scrollHeight: scroll.scrollHeight,
    innerHeight: scroll.innerHeight,
    perChild: colFill ? colFill.perChild : null,
    phaseText: await phaseText(page),
  }
}

async function driveToLobby(page, w, h) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(600)
  await clickText(page, 'got it')
  await clickText(page, 'skip')
  await wait(250)
}

const results = { port: PORT, out: OUT, title: null, desktop: {}, mobile: {} }

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--force-device-scale-factor=1'],
  })
  const page = await browser.newPage()
  const consoleErrors = []
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push('CONSOLEERR: ' + m.text())
  })

  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  results.title = await page.title()

  const heights = [900, 1000, 1080, 1118]

  for (const h of heights) {
    await driveToLobby(page, 1440, h)
    const hResults = {}

    hResults.lobby = await measurePhase(page, 'lobby')
    await page.screenshot({ path: `${OUT}/d1440x${h}-1-lobby.png` })

    await clickText(page, 'ape in')
    await wait(500)
    hResults.betEntry = await measurePhase(page, 'betEntry')
    await page.screenshot({ path: `${OUT}/d1440x${h}-2-betentry.png` })

    await clickText(page, 'bluechips')
    await wait(200)
    await clickText(page, 'send it', '[data-testid="vault-ctl-cta"]')
    await wait(900)
    await clickCell(page, 1, 1, 5, 5)
    await wait(500)
    await clickText(page, 'take profit')
    await wait(900)
    await clickText(page, 'bet again')
    await wait(900)

    hResults.playing = await measurePhase(page, 'playing')
    await page.screenshot({ path: `${OUT}/d1440x${h}-3-playing.png` })

    await clickCell(page, 1, 1, 5, 5)
    await wait(500)
    await clickText(page, 'take profit')
    await wait(900)

    hResults.settled = await measurePhase(page, 'settled')
    await page.screenshot({ path: `${OUT}/d1440x${h}-4-settled.png` })

    // board-Y stability across the 4 phases at this height
    const boards = [hResults.lobby, hResults.betEntry, hResults.playing, hResults.settled]
    const tops = boards.map((b) => b.boardTop)
    const bottoms = boards.map((b) => b.boardBottom)
    hResults.boardYStability = {
      tops,
      bottoms,
      topSpread: Math.max(...tops) - Math.min(...tops),
      bottomSpread: Math.max(...bottoms) - Math.min(...bottoms),
      stable: Math.max(...tops) - Math.min(...tops) === 0 && Math.max(...bottoms) - Math.min(...bottoms) === 0,
    }

    results.desktop[h] = hResults
  }

  // ── MOBILE: Pixel 7 (412x915) + iPhone 14 Pro (393x852) — betEntry + playing ──
  const mobileDevices = [
    { name: 'pixel7', w: 412, h: 915 },
    { name: 'iphone14pro', w: 393, h: 852 },
  ]
  for (const dev of mobileDevices) {
    await page.setViewport({ width: dev.w, height: dev.h, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
    await wait(600)
    await clickText(page, 'got it')
    await clickText(page, 'skip')
    await wait(250)

    const mResults = {}
    mResults.lobby = await measurePhase(page, 'lobby')
    await page.screenshot({ path: `${OUT}/m-${dev.name}-1-lobby.png` })

    await clickText(page, 'ape in')
    await wait(500)
    mResults.betEntry = await measurePhase(page, 'betEntry')
    await page.screenshot({ path: `${OUT}/m-${dev.name}-2-betentry.png`, fullPage: true })

    await clickText(page, 'bluechips')
    await wait(200)
    await clickText(page, 'send it')
    await wait(900)
    await clickCell(page, 1, 1, 5, 5)
    await wait(500)
    await clickText(page, 'take profit')
    await wait(900)

    mResults.playing = await measurePhase(page, 'playing')
    await page.screenshot({ path: `${OUT}/m-${dev.name}-3-playing.png`, fullPage: true })

    results.mobile[dev.name] = mResults
  }

  results.consoleErrors = consoleErrors
  await browser.close()
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log('DONE. consoleErrors:', consoleErrors.length)
  console.log(JSON.stringify(results, null, 2))
}

run().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
