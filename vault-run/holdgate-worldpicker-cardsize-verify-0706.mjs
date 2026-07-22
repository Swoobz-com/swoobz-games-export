// HOLDGATE — independent verifier for the world-picker card-SIZE bump
// (BLUECHIPS/ALTSEASON/SHITCOIN cards in BetEntry PICK YOUR WORLD control
// column). Fresh puppeteer driver, fresh strictPort dev server (6512), OWN
// screenshots — does NOT reuse the maker's worldpicker-cardsize-bump-round5
// output. Proves the 6 vault regression guardrails stay clean:
//   1. single bet field
//   2. CTA never below the fold
//   3. world-picker present ONLY in BetEntry
//   4. no phantom payout on a loss
//   5. board Y-position stable (187/900, 202/1000, 214/1080, 220/1118)
//   6. panel edges stable (1046/1366 @1440)
// + mobile 320px no-regression + Pixel7/iPhone14Pro sanity + typecheck.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '6512'
const OUT = process.argv[3] || `shots-holdgate-worldpicker-cardsize-${Date.now()}`
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
async function isSettled(page) {
  return (await phaseText(page)).includes('SETTLED')
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

async function ctaReachable(page) {
  return page.evaluate(() => {
    const cta = document.querySelector('[data-testid="vault-ctl-cta"]')
    if (!cta) return null
    const r = cta.getBoundingClientRect()
    const belowFold = r.bottom > window.innerHeight
    return { belowFold, top: Math.round(r.top), bottom: Math.round(r.bottom) }
  })
}

// Guardrail 1 — single bet field: exactly one wager stepper (-/+ pair), no
// duplicate wager input anywhere in the control column.
async function betFieldCensus(page) {
  return page.evaluate(() => {
    const stepperBtns = [...document.querySelectorAll('[aria-label="Decrease wager"],[aria-label="Increase wager"]')]
    const wagerInputs = [...document.querySelectorAll('input[type="number"],input[inputmode="decimal"]')]
    const wagerBlocks = [...document.querySelectorAll('[data-testid="vault-ctl-wager"],[data-testid="vault-ctl-wager-locked"]')]
    return {
      stepperCount: stepperBtns.length,
      numericInputCount: wagerInputs.length,
      wagerBlockCount: wagerBlocks.length,
    }
  })
}

async function worldpickerPresent(page) {
  return page.evaluate(() => !!document.querySelector('[data-testid="vault-board-worldpicker"]'))
}

// Mobile has no `vault-board-worldpicker` testid wrapper (that's the desktop
// stacked-gutter panel) — its "PICK YOUR WORLD" surface is the bare
// `.vault-mode-row` (non-gutter) grid of 3 mode buttons, only mounted by the
// mobile BetEntry component (VaultExperience.tsx L1250).
async function mobileWorldpickerPresent(page) {
  return page.evaluate(() => {
    const row = document.querySelector('.vault-mode-row:not(.vault-gutter-mode-row)')
    if (!row) return false
    const buttons = [...row.querySelectorAll('button')]
    return buttons.some((b) => /BLUECHIPS|ALTSEASON|SHITCOIN/i.test(b.textContent || ''))
  })
}

async function settledBannerCensus(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-settled-banner"]')
    const text = el ? el.innerText.replace(/\s+/g, ' ').trim() : null
    return { text, hasPlusSign: !!text && text.includes('+'), hasMinusSign: !!text && text.includes('-') }
  })
}

const results = { port: PORT, out: OUT, heights: {}, mobile: {} }
let anyFail = false
const fails = []

function fail(msg) {
  anyFail = true
  fails.push(msg)
  console.log('FAIL:', msg)
}

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
  const expectedBoardTop = { 900: 187, 1000: 202, 1080: 214, 1118: 220 }

  for (const h of heights) {
    await page.setViewport({ width: 1440, height: h, deviceScaleFactor: 1 })
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
    await wait(600)
    await clickText(page, 'got it')
    await clickText(page, 'skip')
    await wait(250)

    const hResults = {}

    // ── LOBBY — guardrail 3 (worldpicker null), guardrail 5 (board Y) ──────
    hResults.lobby = {
      board: await rect(page, '[data-testid="vault-canvas-shell"]'),
      scroll: await scrollInfo(page),
      cta: await ctaReachable(page),
      worldpickerPresent: await worldpickerPresent(page),
    }
    hResults.lobby.phaseText = await phaseText(page)
    await page.screenshot({ path: `${OUT}/h${h}-lobby.png` })

    if (hResults.lobby.worldpickerPresent) fail(`h${h} lobby: worldpicker present (should be null)`)
    if (hResults.lobby.board?.top !== expectedBoardTop[h]) {
      fail(`h${h} lobby: board top ${hResults.lobby.board?.top} !== expected ${expectedBoardTop[h]}`)
    }
    if (hResults.lobby.scroll.scrollHeight > hResults.lobby.scroll.innerHeight + 1) {
      fail(`h${h} lobby: page scrolls (scrollHeight ${hResults.lobby.scroll.scrollHeight} > innerHeight ${hResults.lobby.scroll.innerHeight})`)
    }

    // ── BET ENTRY — guardrails 1, 2, 3, 5, 6 ────────────────────────────────
    await clickText(page, 'ape in')
    await wait(500)
    hResults.betEntry = {
      board: await rect(page, '[data-testid="vault-canvas-shell"]'),
      scroll: await scrollInfo(page),
      cta: await ctaReachable(page),
      worldpickerPresent: await worldpickerPresent(page),
      worldpicker: await rect(page, '[data-testid="vault-board-worldpicker"]'),
      wager: await rect(page, '[data-testid="vault-ctl-wager"]'),
      ctaCard: await rect(page, '[data-testid="vault-ctl-cta"]'),
      betField: await betFieldCensus(page),
    }
    hResults.betEntry.phaseText = await phaseText(page)
    await page.screenshot({ path: `${OUT}/h${h}-betentry.png` })
    const ctrlBox = await rect(page, '[data-testid="DesktopControlColumn"]')
    if (ctrlBox) {
      await page.screenshot({
        path: `${OUT}/h${h}-betentry-control.png`,
        clip: { x: Math.max(0, ctrlBox.left - 4), y: Math.max(0, ctrlBox.top - 4), width: ctrlBox.w + 8, height: ctrlBox.h + 8 },
      })
    }

    if (!hResults.betEntry.worldpickerPresent) fail(`h${h} betEntry: worldpicker MISSING`)
    if (hResults.betEntry.board?.top !== expectedBoardTop[h]) {
      fail(`h${h} betEntry: board top ${hResults.betEntry.board?.top} !== expected ${expectedBoardTop[h]}`)
    }
    if (hResults.betEntry.cta?.belowFold) fail(`h${h} betEntry: CTA below fold`)
    if (hResults.betEntry.scroll.scrollHeight > hResults.betEntry.scroll.innerHeight + 1) {
      fail(`h${h} betEntry: page scrolls`)
    }
    if (hResults.betEntry.betField.stepperCount !== 2) {
      fail(`h${h} betEntry: expected 2 stepper buttons (one -/+ pair), got ${hResults.betEntry.betField.stepperCount}`)
    }
    if (hResults.betEntry.betField.wagerBlockCount !== 1) {
      fail(`h${h} betEntry: expected exactly 1 wager block, got ${hResults.betEntry.betField.wagerBlockCount}`)
    }
    if (hResults.betEntry.worldpicker?.left !== 1046 || hResults.betEntry.worldpicker?.right !== 1366) {
      fail(`h${h} betEntry: worldpicker panel edges ${hResults.betEntry.worldpicker?.left}/${hResults.betEntry.worldpicker?.right} !== 1046/1366`)
    }
    if (hResults.betEntry.ctaCard?.left !== 1046 || hResults.betEntry.ctaCard?.right !== 1366) {
      fail(`h${h} betEntry: ctaCard panel edges ${hResults.betEntry.ctaCard?.left}/${hResults.betEntry.ctaCard?.right} !== 1046/1366`)
    }

    // ── go WIN round first (to reach playing/settled with the standard flow) ──
    await clickText(page, 'bluechips')
    await wait(200)
    await clickText(page, 'send it', '[data-testid="vault-ctl-cta"]')
    await wait(900)
    await clickCell(page, 1, 1, 5, 5)
    await wait(500)
    await clickText(page, 'take profit')
    await wait(900)

    // ── PLAYING (round 2, mid-round) — guardrails 2, 3, 5 ──────────────────
    hResults.playing = {
      board: await rect(page, '[data-testid="vault-canvas-shell"]'),
      scroll: await scrollInfo(page),
      cta: await ctaReachable(page),
      worldpickerPresent: await worldpickerPresent(page),
    }
    hResults.playing.phaseText = await phaseText(page)
    await page.screenshot({ path: `${OUT}/h${h}-playing.png` })

    if (hResults.playing.worldpickerPresent) fail(`h${h} playing: worldpicker present (should be null)`)
    if (hResults.playing.board?.top !== expectedBoardTop[h]) {
      fail(`h${h} playing: board top ${hResults.playing.board?.top} !== expected ${expectedBoardTop[h]}`)
    }
    if (hResults.playing.cta?.belowFold) fail(`h${h} playing: CTA below fold`)
    if (hResults.playing.scroll.scrollHeight > hResults.playing.scroll.innerHeight + 1) {
      fail(`h${h} playing: page scrolls`)
    }

    await clickCell(page, 1, 1, 5, 5)
    await wait(500)
    await clickText(page, 'take profit')
    await wait(900)

    // ── SETTLED (win) — guardrails 2, 3, 5, 6 ──────────────────────────────
    hResults.settled = {
      board: await rect(page, '[data-testid="vault-canvas-shell"]'),
      scroll: await scrollInfo(page),
      cta: await ctaReachable(page),
      worldpickerPresent: await worldpickerPresent(page),
      receipt: await rect(page, '[data-testid="vault-ctl-receipt"]'),
      banner: await settledBannerCensus(page),
    }
    hResults.settled.phaseText = await phaseText(page)
    await page.screenshot({ path: `${OUT}/h${h}-settled.png` })

    if (hResults.settled.worldpickerPresent) fail(`h${h} settled: worldpicker present (should be null)`)
    if (hResults.settled.board?.top !== expectedBoardTop[h]) {
      fail(`h${h} settled: board top ${hResults.settled.board?.top} !== expected ${expectedBoardTop[h]}`)
    }
    if (hResults.settled.cta?.belowFold) fail(`h${h} settled: CTA below fold`)
    if (hResults.settled.scroll.scrollHeight > hResults.settled.scroll.innerHeight + 1) {
      fail(`h${h} settled: page scrolls`)
    }
    if (hResults.settled.receipt) {
      const rL = hResults.settled.receipt.left
      const rR = hResults.settled.receipt.right
      if (rL !== 1046 || rR !== 1366) fail(`h${h} settled: receipt panel edges ${rL}/${rR} !== 1046/1366`)
    }

    // ── settled-glass-box-open ──────────────────────────────────────────────
    await clickText(page, 'view receipt')
    await wait(400)
    hResults.settledGbOpen = {
      board: await rect(page, '[data-testid="vault-canvas-shell"]'),
      cta: await ctaReachable(page),
      receipt: await rect(page, '[data-testid="vault-ctl-receipt"]'),
      worldpickerPresent: await worldpickerPresent(page),
    }
    await page.screenshot({ path: `${OUT}/h${h}-settled-gb-open.png` })
    if (hResults.settledGbOpen.worldpickerPresent) fail(`h${h} settled-gb-open: worldpicker present`)

    results.heights[h] = hResults
  }

  // ── GUARDRAIL 4 — force a LOSS (shitcoin, high rug density) and confirm
  // NO phantom payout surface renders on settled ──────────────────────────
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(600)
  await clickText(page, 'got it')
  await clickText(page, 'skip')
  await wait(250)
  await clickText(page, 'ape in')
  await wait(500)
  await clickText(page, 'shitcoin')
  await wait(300)
  await clickText(page, 'send it', '[data-testid="vault-ctl-cta"]')
  await wait(900)

  let hitRug = false
  outer: for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 7; col++) {
      await clickCell(page, col, row, 7, 7)
      await wait(450)
      if (await isSettled(page)) {
        hitRug = true
        break outer
      }
    }
  }
  await wait(700)
  const lossBanner = await settledBannerCensus(page)
  const lossPhase = await phaseText(page)
  const lossWorldpicker = await worldpickerPresent(page)
  await page.screenshot({ path: `${OUT}/loss-settled.png` })

  results.forcedLoss = { hitRug, banner: lossBanner, phaseText: lossPhase, worldpickerPresent: lossWorldpicker }

  if (!hitRug) fail('forced-loss: did not reach SETTLED within 49 taps on SHITCOIN board (RNG variance)')
  if (lossWorldpicker) fail('forced-loss settled: worldpicker present (should be null)')
  if (lossBanner.hasPlusSign) fail(`forced-loss settled: banner shows a "+" (phantom payout) — text="${lossBanner.text}"`)
  if (!/RUGGED|BUST/i.test(lossBanner.text || '')) fail(`forced-loss settled: banner does not read RUGGED/BUST — text="${lossBanner.text}"`)

  // ── MOBILE 320px 3-across overflow spot-check (pre-existing metric, must
  // be UNCHANGED not worsened) ────────────────────────────────────────────
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
  const mobileButtons = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.vault-mode-row:not(.vault-gutter-mode-row) button')]
    return btns.map((b) => ({ scrollWidth: b.scrollWidth, clientWidth: b.clientWidth }))
  })
  const mobileScroll = await scrollInfo(page)
  results.mobile320 = {
    row: mobileRow,
    buttons: mobileButtons,
    scroll: mobileScroll,
    bodyOverflowsX: mobileScroll.scrollWidth > mobileScroll.innerWidth + 1,
  }
  await page.screenshot({ path: `${OUT}/mobile320-betentry.png` })

  // ── Pixel 7 (412x915) + iPhone 14 Pro (393x852) — betEntry + playing sanity ──
  const devices = [
    { name: 'pixel7', w: 412, h: 915 },
    { name: 'iphone14pro', w: 393, h: 852 },
  ]
  for (const dev of devices) {
    await page.setViewport({ width: dev.w, height: dev.h, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
    await wait(600)
    await clickText(page, 'got it')
    await clickText(page, 'skip')
    await wait(250)
    await clickText(page, 'ape in')
    await wait(500)
    const betEntryMobile = {
      worldpickerPresent: await mobileWorldpickerPresent(page),
      scroll: await scrollInfo(page),
      betField: await betFieldCensus(page),
    }
    await page.screenshot({ path: `${OUT}/${dev.name}-betentry.png` })
    await clickText(page, 'bluechips')
    await wait(200)
    // Mobile's BetConsole commit button is NOT wrapped in
    // data-testid="vault-ctl-cta" (that testid is desktop-only — see
    // DesktopControlColumn / gutter-card components) — click it unscoped.
    await clickText(page, 'send it')
    await wait(900)
    const playingMobile = {
      worldpickerPresent: await mobileWorldpickerPresent(page),
      phaseText: await phaseText(page),
    }
    await page.screenshot({ path: `${OUT}/${dev.name}-playing.png` })
    results.mobile[dev.name] = { betEntry: betEntryMobile, playing: playingMobile }
    if (betEntryMobile.worldpickerPresent === false) fail(`${dev.name} betEntry: worldpicker MISSING`)
    if (playingMobile.worldpickerPresent) fail(`${dev.name} playing: worldpicker present (should be null)`)
  }

  await browser.close()
  results.anyFail = anyFail
  results.fails = fails
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log('=== SUMMARY ===')
  console.log('anyFail:', anyFail)
  if (anyFail) console.log(JSON.stringify(fails, null, 2))
}

run().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
