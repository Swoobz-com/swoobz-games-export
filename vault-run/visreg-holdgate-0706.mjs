// visreg-holdgate-0706.mjs — INDEPENDENT swoobz-visual-regression-qa driver.
// Own port (6023), own screenshots dir, own measurement code (not copy-pasted
// from maker's gridv2-holdgate-0706.mjs, though it reuses the testid map from
// the maker's run log). Verifies holdgate A-G on the round-2 5-zone CSS-grid
// chassis for RUG OR RICHES (vault) desktop isWide branch.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '6023'
const OUT = process.argv[3] || `shots-visreg-gridv2-${Date.now()}`
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
  try { await el.click() } catch { return false }
  return true
}

async function clickCell(page, col, row, cols, rows) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  if (!box) return
  const fx = 0.05 + ((col + 0.5) / cols) * 0.9
  const fy = 0.06 + ((row + 0.5) / rows) * 0.82
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
}

async function rect(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }
  }, sel)
}

async function scrollInfo(page) {
  return page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
}

async function controlColScroll(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="DesktopControlColumn"]')
    if (!el) return null
    return { scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, hasScroll: el.scrollHeight > el.clientHeight + 1 }
  })
}

async function mainGridPresent(page) {
  return page.evaluate(() => !!document.querySelector('[data-testid="vault-grid-mainGrid"]'))
}

async function overlapCheck(page) {
  // generic AABB overlap probe among the 5 zones + control column, EXCLUDING
  // the canvas element itself (letterboxed inside vault-canvas-shell — do
  // NOT AABB the raw <canvas>, use the shell testid per the gotcha note).
  return page.evaluate(() => {
    const ids = ['vault-grid-topbar', 'DesktopHudRow', 'vault-canvas-shell', 'DesktopControlColumn', 'vault-grid-status']
    const rects = {}
    for (const id of ids) {
      const el = document.querySelector(`[data-testid="${id}"]`)
      if (el) rects[id] = el.getBoundingClientRect()
    }
    function overlaps(a, b) {
      return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom)
    }
    const found = []
    const keys = Object.keys(rects)
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const a = rects[keys[i]], b = rects[keys[j]]
        // board(vault-canvas-shell) legitimately shares a row with DesktopControlColumn
        // (grid spans HUD+BOARD rows) -- but should not overlap in x.
        if (overlaps(a, b)) found.push(`${keys[i]} x ${keys[j]}`)
      }
    }
    return { rects: Object.fromEntries(Object.entries(rects).map(([k, r]) => [k, { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }])), overlaps: found }
  })
}

const results = { port: PORT, out: OUT, title: null, viewports: {}, narrowBand: {}, mobile: {} }

async function capturePhaseSet(page, vpName, vpResults, hudNote) {
  vpResults.mainGrid = await rect(page, '[data-testid="vault-grid-mainGrid"]')
  vpResults.topbar = await rect(page, '[data-testid="vault-grid-topbar"]')
  vpResults.hud = await rect(page, '[data-testid="DesktopHudRow"]')
  vpResults.board = await rect(page, '[data-testid="vault-canvas-shell"]')
  vpResults.control = await rect(page, '[data-testid="DesktopControlColumn"]')
  vpResults.status = await rect(page, '[data-testid="vault-grid-status"]')
  vpResults.cta = await rect(page, '[data-testid="vault-ctl-cta"]')
  vpResults.scroll = await scrollInfo(page)
  vpResults.controlScroll = await controlColScroll(page)
  vpResults.overlap = await overlapCheck(page)
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--force-device-scale-factor=1'],
  })
  const page = await browser.newPage()
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text()) })
  page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message))

  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  results.title = await page.title()
  console.log('PAGE TITLE:', results.title)

  const viewports = [
    { name: '1440x900', width: 1440, height: 900 },
    { name: '1920x1080', width: 1920, height: 1080 },
  ]

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 })
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
    await wait(700)
    await clickText(page, 'got it')
    await clickText(page, 'skip')
    await wait(300)

    const vpResults = {}

    // LOBBY
    vpResults.lobby = {}
    await capturePhaseSet(page, vp.name, vpResults.lobby)
    await page.screenshot({ path: `${OUT}/${vp.name}-lobby.png` })

    // BET-ENTRY
    await clickText(page, 'ape in')
    await wait(500)
    vpResults.betEntry = {}
    await capturePhaseSet(page, vp.name, vpResults.betEntry)
    vpResults.betEntry.worldpicker = await rect(page, '[data-testid="vault-board-worldpicker"]')
    vpResults.betEntry.wager = await rect(page, '[data-testid="vault-ctl-wager"]')
    await page.screenshot({ path: `${OUT}/${vp.name}-betentry.png` })

    await clickText(page, 'bluechips')
    await wait(200)
    await clickText(page, 'send it', '[data-testid="vault-ctl-cta"]')
    await wait(900)

    // PLAYING
    vpResults.playing = {}
    await capturePhaseSet(page, vp.name, vpResults.playing)
    vpResults.playing.lockedWager = await rect(page, '[data-testid="vault-ctl-wager-locked"]')
    await page.screenshot({ path: `${OUT}/${vp.name}-playing.png` })

    await clickCell(page, 1, 1, 5, 5)
    await wait(500)
    await clickText(page, 'take profit')
    await wait(900)

    // SETTLED
    vpResults.settled = {}
    await capturePhaseSet(page, vp.name, vpResults.settled)
    vpResults.settled.banner = await rect(page, '[data-testid="vault-settled-banner"]')
    await page.screenshot({ path: `${OUT}/${vp.name}-settled.png` })

    // board-Y consistency across phases (this viewport)
    const boardTops = ['lobby', 'betEntry', 'playing', 'settled'].map((p) => vpResults[p].board?.top)
    vpResults.boardTopsAcrossPhases = boardTops
    vpResults.boardTopStable = boardTops.every((t) => t === boardTops[0])

    results.viewports[vp.name] = vpResults
  }

  // NARROW-BAND SPOT-CHECK: 960px, 1000px, 1024px
  for (const w of [960, 1000, 1024]) {
    await page.setViewport({ width: w, height: 900, deviceScaleFactor: 1 })
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
    await wait(700)
    await clickText(page, 'got it')
    await clickText(page, 'skip')
    await wait(300)
    const nb = { width: w }
    nb.mainGridPresent = await mainGridPresent(page)
    nb.lobby = await rect(page, '[data-testid="vault-grid-mainGrid"]')
    nb.board = await rect(page, '[data-testid="vault-canvas-shell"]')
    nb.control = await rect(page, '[data-testid="DesktopControlColumn"]')
    nb.cta = await rect(page, '[data-testid="vault-ctl-cta"]')
    nb.scroll = await scrollInfo(page)
    nb.overlap = await overlapCheck(page)
    await page.screenshot({ path: `${OUT}/narrow-${w}-lobby.png` })

    // also check bet-entry at this width (historically the shrink-to-fit bug hit bet-entry hardest)
    await clickText(page, 'ape in')
    await wait(500)
    nb.betEntryBoard = await rect(page, '[data-testid="vault-canvas-shell"]')
    nb.betEntryControl = await rect(page, '[data-testid="DesktopControlColumn"]')
    nb.betEntryCta = await rect(page, '[data-testid="vault-ctl-cta"]')
    nb.betEntryScroll = await scrollInfo(page)
    nb.betEntryOverlap = await overlapCheck(page)
    await page.screenshot({ path: `${OUT}/narrow-${w}-betentry.png` })

    results.narrowBand[w] = nb
  }

  // MOBILE 390x844
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(700)
  await clickText(page, 'got it')
  await clickText(page, 'skip')
  await wait(300)
  results.mobile.mainGridPresent = await mainGridPresent(page)
  results.mobile.headerTapeText = await page.evaluate(() => {
    const el = document.querySelector('header') || document.body
    return (el.textContent || '').slice(0, 300)
  })
  results.mobile.scroll = await scrollInfo(page)
  await page.screenshot({ path: `${OUT}/mobile-390x844-lobby.png`, fullPage: true })
  await clickText(page, 'ape in')
  await wait(500)
  results.mobile.betEntryMainGridPresent = await mainGridPresent(page)
  results.mobile.betEntryScroll = await scrollInfo(page)
  await page.screenshot({ path: `${OUT}/mobile-390x844-betentry.png`, fullPage: true })

  await browser.close()
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
}

run().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
