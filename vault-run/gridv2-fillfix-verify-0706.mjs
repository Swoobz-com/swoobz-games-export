// gridv2-fillfix-verify-0706.mjs — content-FILL void close, round 3 (supersedes
// "POLISH FIX 1"). Measures at width 1440 across FOUR real heights
// (900/1000/1080/1118 — 1118 is Tim's own screenshot height, input/fout1.jpg)
// for all 4 phases: board bottom-Y, control-column stretched bottom-Y, the
// CONTENT bottom-Y (max bottom of DesktopControlColumn's direct children),
// void (columnBottom - contentBottom), and alignment delta (boardBottom -
// contentBottom). Also confirms no page scroll and CTA reachability.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '6301'
const OUT = process.argv[3] || `shots-gridv2-fillfix-${Date.now()}`
const TAG = process.argv[4] || 'after'
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
  if (!box) return
  const fx = 0.05 + ((col + 0.5) / cols) * 0.9
  const fy = 0.06 + ((row + 0.5) / rows) * 0.82
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
}

async function phaseText(page) {
  return page.evaluate(() => document.querySelector('[data-testid="vault-grid-topbar"]')?.textContent || '')
}

async function rect(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), h: Math.round(r.height) }
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

// max bottom-Y of DesktopControlColumn's own direct children (the real
// rendered content edge) vs. the column's own (grid-stretched) box bottom.
async function controlFillInfo(page) {
  return page.evaluate(() => {
    const col = document.querySelector('[data-testid="DesktopControlColumn"]')
    if (!col) return null
    const colRect = col.getBoundingClientRect()
    let contentBottom = colRect.top
    for (const child of col.children) {
      const cr = child.getBoundingClientRect()
      if (cr.height === 0) continue
      if (cr.bottom > contentBottom) contentBottom = cr.bottom
    }
    return {
      columnTop: Math.round(colRect.top),
      columnBottom: Math.round(colRect.bottom),
      contentBottom: Math.round(contentBottom),
    }
  })
}

async function ctaReachable(page) {
  return page.evaluate(() => {
    const cta = document.querySelector('[data-testid="vault-ctl-cta"]')
    if (!cta) return null
    const r = cta.getBoundingClientRect()
    const belowFold = r.bottom > window.innerHeight
    // ancestor-scroll trap walk (jesse convention)
    const scrollers = []
    let n = cta.parentElement
    while (n) {
      const cs = getComputedStyle(n)
      if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && n.scrollHeight > n.clientHeight + 1) {
        scrollers.push(n.getAttribute('data-testid') || n.tagName)
      }
      n = n.parentElement
    }
    return { belowFold, top: Math.round(r.top), bottom: Math.round(r.bottom), scrollers }
  })
}

function computeRow(board, fill, scroll, cta) {
  const boardBottom = board ? board.bottom : null
  const contentBottom = fill ? fill.contentBottom : null
  const columnBottom = fill ? fill.columnBottom : null
  const voidPx = columnBottom != null && contentBottom != null ? Math.round(columnBottom - contentBottom) : null
  const alignDelta = boardBottom != null && contentBottom != null ? Math.round(boardBottom - contentBottom) : null
  return {
    boardBottom,
    columnBottom,
    contentBottom,
    voidPx,
    alignDelta,
    hasVScroll: scroll ? scroll.scrollHeight > scroll.innerHeight : null,
    scrollHeight: scroll?.scrollHeight,
    innerHeight: scroll?.innerHeight,
    ctaBelowFold: cta?.belowFold,
    ctaScrollers: cta?.scrollers,
  }
}

const results = { port: PORT, out: OUT, tag: TAG, title: null, heights: {} }

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--force-device-scale-factor=1'],
  })
  const page = await browser.newPage()
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('CONSOLEERR', m.text())
  })

  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  results.title = await page.title()
  console.log('PAGE TITLE:', results.title)

  const heights = [900, 1000, 1080, 1118]

  for (const h of heights) {
    await page.setViewport({ width: 1440, height: h, deviceScaleFactor: 1 })
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
    await wait(600)
    await clickText(page, 'got it')
    await clickText(page, 'skip')
    await wait(250)

    const hResults = {}

    // ── LOBBY ─────────────────────────────────────────────────────────
    hResults.lobby = computeRow(
      await rect(page, '[data-testid="vault-canvas-shell"]'),
      await controlFillInfo(page),
      await scrollInfo(page),
      await ctaReachable(page),
    )
    hResults.lobby.phaseText = await phaseText(page)
    await page.screenshot({ path: `${OUT}/h${h}-lobby.png` })

    // ── BET ENTRY (the primary, Tim-flagged phase) ──────────────────────
    await clickText(page, 'ape in')
    await wait(500)
    hResults.betEntry = computeRow(
      await rect(page, '[data-testid="vault-canvas-shell"]'),
      await controlFillInfo(page),
      await scrollInfo(page),
      await ctaReachable(page),
    )
    hResults.betEntry.phaseText = await phaseText(page)
    hResults.betEntry.worldpicker = await rect(page, '[data-testid="vault-board-worldpicker"]')
    hResults.betEntry.wager = await rect(page, '[data-testid="vault-ctl-wager"]')
    hResults.betEntry.cta = await rect(page, '[data-testid="vault-ctl-cta"]')
    hResults.betEntry.gapCtaToWager =
      hResults.betEntry.wager && hResults.betEntry.cta
        ? Math.round(hResults.betEntry.cta.top - hResults.betEntry.wager.bottom)
        : null
    await page.screenshot({ path: `${OUT}/h${h}-betentry.png`, fullPage: false })

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

    // ── PLAYING (round 2, history.length===1, SESSIE present) ───────────
    hResults.playing = computeRow(
      await rect(page, '[data-testid="vault-canvas-shell"]'),
      await controlFillInfo(page),
      await scrollInfo(page),
      await ctaReachable(page),
    )
    hResults.playing.phaseText = await phaseText(page)
    hResults.playing.session = await rect(page, '[data-testid="vault-ctl-session"]')
    hResults.playing.path = await rect(page, '[data-testid="vault-ctl-path"]')
    await page.screenshot({ path: `${OUT}/h${h}-playing.png` })

    await clickCell(page, 1, 1, 5, 5)
    await wait(500)
    await clickText(page, 'take profit')
    await wait(900)

    // ── SETTLED ──────────────────────────────────────────────────────────
    hResults.settled = computeRow(
      await rect(page, '[data-testid="vault-canvas-shell"]'),
      await controlFillInfo(page),
      await scrollInfo(page),
      await ctaReachable(page),
    )
    hResults.settled.phaseText = await phaseText(page)
    hResults.settled.session = await rect(page, '[data-testid="vault-ctl-session"]')
    hResults.settled.receipt = await rect(page, '[data-testid="vault-ctl-receipt"]')
    await page.screenshot({ path: `${OUT}/h${h}-settled.png` })

    results.heights[h] = hResults
  }

  await browser.close()
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
}

run().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
