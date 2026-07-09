// round4-holdgate-visreg-0706.mjs — INDEPENDENT swoobz-visual-regression-qa
// driver for RoR vault GRIDV2 CONTROL-COLUMN VOID, ROUND 4 (asymmetric
// world-card treatment + `desktopGridControl.alignSelf:'start'`). Own port
// (6349, fresh --strictPort), own screenshots dir, from-scratch measurement
// code (not copy-pasted from any maker script). Verifies the 6 regression
// guardrails + 320px control column + no-page-scroll at 1440-wide x
// {900,1000,1080,1118}, all 4 phases, PLUS mobile Pixel 7 + iPhone 14 Pro.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '6349'
const OUT = process.argv[3] || `shots-round4-holdgate-0706`
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

async function rect(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      left: Math.round(r.left),
      right: Math.round(r.right),
    }
  }, sel)
}

async function scrollInfo(page) {
  return page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    hasVScroll: document.documentElement.scrollHeight > window.innerHeight,
    hasHScroll: document.documentElement.scrollWidth > window.innerWidth,
  }))
}

// GUARDRAIL 1 — single bet field. On desktop, exactly ONE of
// vault-ctl-wager (BetEntry, unlocked) / vault-ctl-wager-locked
// (Playing, dimmed+disabled) should be present+visible at a time, and no
// OTHER stepper-looking control should exist anywhere else in the DOM.
async function betFieldAudit(page) {
  return page.evaluate(() => {
    const unlocked = document.querySelector('[data-testid="vault-ctl-wager"]')
    const locked = document.querySelector('[data-testid="vault-ctl-wager-locked"]')
    function btnState(el) {
      if (!el) return null
      const buttons = [...el.querySelectorAll('button')]
      return {
        present: true,
        visible: el.offsetParent !== null,
        opacity: getComputedStyle(el).opacity,
        buttonsDisabled: buttons.length > 0 && buttons.every((b) => b.disabled),
        buttonCount: buttons.length,
      }
    }
    // global sweep for any OTHER element that looks like a wager stepper
    // (has both a +/- step button and a numeric usdc-ish value) outside the
    // two known testids, to catch a stray duplicate mobile console mounting
    // on desktop.
    const allWagerish = [...document.querySelectorAll('[data-testid]')]
      .map((e) => e.getAttribute('data-testid'))
      .filter((t) => t && /wager/i.test(t))
    return {
      unlocked: btnState(unlocked),
      locked: btnState(locked),
      allWagerTestids: allWagerish,
    }
  })
}

async function worldpickerAudit(page) {
  return rect(page, '[data-testid="vault-board-worldpicker"]')
}

async function ctaAudit(page) {
  return page.evaluate(() => {
    const wrap = document.querySelector('[data-testid="vault-ctl-cta"]')
    if (!wrap) return null
    // measure the WRAPPER's own bottom (conservative upper-bound proxy for
    // "is the whole CTA card visible", regardless of which specific button
    // inside it is the primary action for this phase).
    const r = wrap.getBoundingClientRect()
    const buttons = [...wrap.querySelectorAll('button')]
    const primary =
      buttons.find((b) => /bet again|take profit|send it|ape in|^go$/i.test((b.textContent || '').trim())) ||
      buttons[buttons.length - 1] ||
      null
    return {
      bottom: Math.round(r.bottom),
      top: Math.round(r.top),
      innerHeight: window.innerHeight,
      aboveFold: r.bottom <= window.innerHeight,
      primaryText: primary ? (primary.textContent || '').trim() : null,
      primaryDisabled: primary ? primary.disabled : null,
    }
  })
}

async function settledLossAudit(page) {
  return page.evaluate(() => {
    const banner = document.querySelector('[data-testid="vault-settled-banner"]')
    const receipt = document.querySelector('[data-testid="vault-settled-receipt-card"]')
    const nextBet = document.querySelector('[data-testid="vault-ctl-cta"]')
    return {
      bannerText: banner ? (banner.textContent || '').replace(/\s+/g, ' ').trim() : null,
      receiptText: receipt ? (receipt.textContent || '').replace(/\s+/g, ' ').trim() : null,
      nextBetText: nextBet ? (nextBet.textContent || '').replace(/\s+/g, ' ').trim() : null,
    }
  })
}

async function controlColWidth(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="DesktopControlColumn"]')
    if (!el) return null
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return { width: Math.round(r.width), cssWidth: cs.width, left: Math.round(r.left), right: Math.round(r.right) }
  })
}

const results = { port: PORT, out: OUT, desktop: {}, mobile: {} }

const HEIGHTS = [900, 1000, 1080, 1118]
const PHASES = ['lobby', 'betEntry', 'playing', 'settled']

async function gotoFresh(page, w, h) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(600)
  await clickText(page, 'got it')
  await clickText(page, 'skip')
  await wait(300)
}

async function captureCommon(page, obj) {
  obj.mainGrid = await rect(page, '[data-testid="vault-grid-mainGrid"]')
  obj.board = await rect(page, '[data-testid="vault-canvas-shell"]')
  obj.control = await rect(page, '[data-testid="DesktopControlColumn"]')
  obj.controlWidth = await controlColWidth(page)
  obj.cta = await ctaAudit(page)
  obj.scroll = await scrollInfo(page)
  obj.betField = await betFieldAudit(page)
  obj.worldpicker = await worldpickerAudit(page)
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--force-device-scale-factor=1'],
  })
  const page = await browser.newPage()
  const consoleErrors = []
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text())
  })
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message))

  for (const h of HEIGHTS) {
    const hKey = `1440x${h}`
    results.desktop[hKey] = {}
    await gotoFresh(page, 1440, h)

    // LOBBY
    results.desktop[hKey].lobby = {}
    await captureCommon(page, results.desktop[hKey].lobby)
    await page.screenshot({ path: `${OUT}/${hKey}-lobby.png` })

    // BET-ENTRY
    await clickText(page, 'ape in')
    await wait(500)
    results.desktop[hKey].betEntry = {}
    await captureCommon(page, results.desktop[hKey].betEntry)
    await page.screenshot({ path: `${OUT}/${hKey}-betentry.png` })

    // pick shitcoin (49 tiles / 24 mines, ~49% per-tile) so a forced rug is
    // reachable reliably; then SEND IT.
    await clickText(page, 'shitcoin')
    await wait(200)
    await clickText(page, 'send it', '[data-testid="vault-ctl-cta"]')
    await wait(900)

    // PLAYING
    results.desktop[hKey].playing = {}
    await captureCommon(page, results.desktop[hKey].playing)
    await page.screenshot({ path: `${OUT}/${hKey}-playing.png` })

    // force a RUG: click distinct cells across the 7x7 board until settled
    // (or exhaust attempts). Re-check phase after each click since a mine
    // hit ends the round immediately.
    const cellSeq = [
      [0, 0], [6, 6], [3, 3], [1, 5], [5, 1], [2, 4], [4, 2], [0, 6],
      [6, 0], [1, 1], [5, 5], [2, 2], [4, 4], [3, 0], [0, 3], [6, 3],
    ]
    let settled = false
    for (const [c, r] of cellSeq) {
      const kind = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="vault-settled-banner"]')
        return el ? 'settled' : 'live'
      })
      if (kind === 'settled') {
        settled = true
        break
      }
      await clickCell(page, c, r, 7, 7)
      await wait(350)
    }
    await wait(600)
    results.desktop[hKey].settledReachedViaMine = settled

    // SETTLED
    results.desktop[hKey].settled = {}
    await captureCommon(page, results.desktop[hKey].settled)
    results.desktop[hKey].settled.lossAudit = await settledLossAudit(page)
    await page.screenshot({ path: `${OUT}/${hKey}-settled.png` })

    // board-Y stability across the 4 phases at this height
    const boardTops = PHASES.map((p) => results.desktop[hKey][p].board?.top)
    results.desktop[hKey].boardTopsAcrossPhases = boardTops
    results.desktop[hKey].boardTopStable = boardTops.every((t) => t === boardTops[0])

    // panel edges (control column left/right) stability across the 4 phases
    const edges = PHASES.map((p) => ({
      left: results.desktop[hKey][p].control?.left,
      right: results.desktop[hKey][p].control?.right,
    }))
    results.desktop[hKey].panelEdgesAcrossPhases = edges
    results.desktop[hKey].panelEdgesStable = edges.every(
      (e) => e.left === edges[0].left && e.right === edges[0].right,
    )
  }

  // spot-check 1920x1080 board-Y baseline (214px) as an extra cross-check
  await gotoFresh(page, 1920, 1080)
  results.desktop['1920x1080-spotcheck'] = { lobby: {} }
  await captureCommon(page, results.desktop['1920x1080-spotcheck'].lobby)
  await page.screenshot({ path: `${OUT}/1920x1080-lobby-spotcheck.png` })

  // ── MOBILE — Pixel 7 (412x915) and iPhone 14 Pro (393x852) ──────────────
  const mobileDevices = [
    { name: 'pixel7', width: 412, height: 915 },
    { name: 'iphone14pro', width: 393, height: 852 },
  ]
  for (const d of mobileDevices) {
    await page.setViewport({ width: d.width, height: d.height, deviceScaleFactor: 1 })
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
    await wait(700)
    await clickText(page, 'got it')
    await clickText(page, 'skip')
    await wait(300)

    const m = {}
    m.mainGridPresent = await page.evaluate(
      () => !!document.querySelector('[data-testid="vault-grid-mainGrid"]'),
    )
    m.desktopControlColumnPresent = await page.evaluate(
      () => !!document.querySelector('[data-testid="DesktopControlColumn"]'),
    )
    m.scroll = await scrollInfo(page)
    m.betField = await betFieldAudit(page)
    await page.screenshot({ path: `${OUT}/mobile-${d.name}-lobby.png`, fullPage: true })

    await clickText(page, 'ape in')
    await wait(500)
    m.betEntryScroll = await scrollInfo(page)
    m.betEntryMainGridPresent = await page.evaluate(
      () => !!document.querySelector('[data-testid="vault-grid-mainGrid"]'),
    )
    await page.screenshot({ path: `${OUT}/mobile-${d.name}-betentry.png`, fullPage: true })

    results.mobile[d.name] = m
  }

  results.consoleErrors = consoleErrors
  await browser.close()
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
}

run().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
