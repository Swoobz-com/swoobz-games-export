// gridv2-worldpicker-parity-verify-0706.mjs — ROUND 4 holdgate. Verifies the
// round-3 spread-gaps anti-pattern is gone (world-picker row gaps FIXED, not
// growing with viewport height), the asymmetric card treatment from
// input/newui1.jpg landed (selected = bordered card + BEST pill, unselected
// = plain 2-line rows), the tall-viewport surplus is now a single band below
// the control column (desktopGridControl alignSelf:'start'), the SESSION
// PULSE band in Playing/Settled is fixed the same way, and the 6 regression
// guardrails + panel edges stay clean. Cloned from
// gridv2-fillfix-verify-0706.mjs (round 3's own verify driver).
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '6302'
const OUT = process.argv[3] || `shots-gridv2-worldpicker-parity-${Date.now()}`
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
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), h: Math.round(r.height), w: Math.round(r.width) }
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

// The 3 world-picker rows (BLUECHIPS/ALTSEASON/SHITCOIN) — buttons inside the
// worldpicker card. Returns each row's rect + selected/border/bg diagnostics
// so we can prove (a) gaps are FIXED not growing with viewport height and
// (b) the asymmetric selected-card / plain-row treatment landed.
async function worldpickerRows(page) {
  return page.evaluate(() => {
    const wp = document.querySelector('[data-testid="vault-board-worldpicker"]')
    if (!wp) return null
    const buttons = [...wp.querySelectorAll('button')]
    return buttons.map((b) => {
      const r = b.getBoundingClientRect()
      const cs = getComputedStyle(b)
      const hasBestPill = /BEST/.test(b.textContent || '')
      return {
        text: (b.textContent || '').replace(/\s+/g, ' ').trim(),
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        h: Math.round(r.height),
        selected: b.getAttribute('aria-pressed') === 'true',
        borderColor: cs.borderColor,
        borderWidth: cs.borderWidth,
        background: cs.backgroundImage !== 'none' ? cs.backgroundImage : cs.backgroundColor,
        hasBestPill,
      }
    })
  })
}

function rowGaps(rows) {
  if (!rows || rows.length < 2) return []
  const gaps = []
  for (let i = 1; i < rows.length; i++) gaps.push(Math.round(rows[i].top - rows[i - 1].bottom))
  return gaps
}

const results = { port: PORT, out: OUT, heights: {} }

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
    hResults.lobby = {
      board: await rect(page, '[data-testid="vault-canvas-shell"]'),
      fill: await controlFillInfo(page),
      scroll: await scrollInfo(page),
      cta: await ctaReachable(page),
      hud: await rect(page, '[data-testid="vault-grid-hud-inner"]'),
      session: await rect(page, '[data-testid="vault-ctl-session"]'),
    }
    hResults.lobby.phaseText = await phaseText(page)
    await page.screenshot({ path: `${OUT}/h${h}-lobby.png` })
    await page.screenshot({ path: `${OUT}/h${h}-lobby-control.png`, clip: await (async () => {
      const b = await rect(page, '[data-testid="DesktopControlColumn"]')
      return b ? { x: Math.max(0, b.left - 4), y: Math.max(0, b.top - 4), width: b.w + 8, height: b.h + 8 } : undefined
    })() }).catch(() => {})

    // ── BET ENTRY (the primary, Tim-flagged phase) ──────────────────────
    await clickText(page, 'ape in')
    await wait(500)
    hResults.betEntry = {
      board: await rect(page, '[data-testid="vault-canvas-shell"]'),
      fill: await controlFillInfo(page),
      scroll: await scrollInfo(page),
      cta: await ctaReachable(page),
      hud: await rect(page, '[data-testid="vault-grid-hud-inner"]'),
    }
    hResults.betEntry.phaseText = await phaseText(page)
    hResults.betEntry.worldpicker = await rect(page, '[data-testid="vault-board-worldpicker"]')
    hResults.betEntry.wager = await rect(page, '[data-testid="vault-ctl-wager"]')
    hResults.betEntry.ctaCard = await rect(page, '[data-testid="vault-ctl-cta"]')
    hResults.betEntry.gapCtaToWager =
      hResults.betEntry.wager && hResults.betEntry.ctaCard
        ? Math.round(hResults.betEntry.ctaCard.top - hResults.betEntry.wager.bottom)
        : null
    hResults.betEntry.gapWorldpickerToWager =
      hResults.betEntry.worldpicker && hResults.betEntry.wager
        ? Math.round(hResults.betEntry.wager.top - hResults.betEntry.worldpicker.bottom)
        : null
    const rows = await worldpickerRows(page)
    hResults.betEntry.rows = rows
    hResults.betEntry.rowGaps = rowGaps(rows)
    await page.screenshot({ path: `${OUT}/h${h}-betentry.png`, fullPage: false })
    const ctrlBox = await rect(page, '[data-testid="DesktopControlColumn"]')
    if (ctrlBox) {
      await page.screenshot({
        path: `${OUT}/h${h}-betentry-control.png`,
        clip: { x: Math.max(0, ctrlBox.left - 4), y: Math.max(0, ctrlBox.top - 4), width: ctrlBox.w + 8, height: ctrlBox.h + 8 },
      })
    }

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
    hResults.playing = {
      board: await rect(page, '[data-testid="vault-canvas-shell"]'),
      fill: await controlFillInfo(page),
      scroll: await scrollInfo(page),
      cta: await ctaReachable(page),
      hud: await rect(page, '[data-testid="vault-grid-hud-inner"]'),
    }
    hResults.playing.phaseText = await phaseText(page)
    hResults.playing.session = await rect(page, '[data-testid="vault-ctl-session"]')
    hResults.playing.path = await rect(page, '[data-testid="vault-ctl-path"]')
    await page.screenshot({ path: `${OUT}/h${h}-playing.png` })

    await clickCell(page, 1, 1, 5, 5)
    await wait(500)
    await clickText(page, 'take profit')
    await wait(900)

    // ── SETTLED ──────────────────────────────────────────────────────────
    hResults.settled = {
      board: await rect(page, '[data-testid="vault-canvas-shell"]'),
      fill: await controlFillInfo(page),
      scroll: await scrollInfo(page),
      cta: await ctaReachable(page),
      hud: await rect(page, '[data-testid="vault-settled-banner"]'),
    }
    hResults.settled.phaseText = await phaseText(page)
    hResults.settled.session = await rect(page, '[data-testid="vault-ctl-session"]')
    hResults.settled.receipt = await rect(page, '[data-testid="vault-ctl-receipt"]')
    await page.screenshot({ path: `${OUT}/h${h}-settled.png` })

    results.heights[h] = hResults
  }

  // ── MOBILE 320px 3-across overflow spot-check (round 5 constraint #7) ──
  await page.setViewport({ width: 320, height: 800, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(600)
  await clickText(page, 'got it')
  await clickText(page, 'skip')
  await wait(250)
  await clickText(page, 'ape in')
  await wait(500)
  const mobileRow = await page.evaluate(() => {
    const row = document.querySelector('.vault-mode-row:not(.vault-gutter-mode-row)')
    if (!row) return null
    const r = row.getBoundingClientRect()
    return {
      scrollWidth: row.scrollWidth,
      clientWidth: row.clientWidth,
      overflowsX: row.scrollWidth > row.clientWidth + 1,
      rect: { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) },
    }
  })
  const mobileScroll = await scrollInfo(page)
  results.mobile320 = { row: mobileRow, scroll: mobileScroll, bodyOverflowsX: mobileScroll.scrollWidth > mobileScroll.innerWidth + 1 }
  await page.screenshot({ path: `${OUT}/mobile320-betentry.png` })

  await browser.close()
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
}

run().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
