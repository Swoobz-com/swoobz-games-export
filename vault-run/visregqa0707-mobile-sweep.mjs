// FULL FRESH COMPREHENSIVE RE-SWEEP — MOBILE — RUG OR RICHES (vault)
// swoobz-visual-regression-qa, 2026-07-07. Fresh port :5288. Own output dir.
// Covers FIX #2 (mobile HUD band <-> canvas overlap), FIX #3 (settled board
// shrink / BET AGAIN fold), FIX #4 (altseason backdrop clean-render on
// mobile), plus a full phase x world collateral sweep.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.env.PORT || '5288'
const OUT = 'shots-visregqa0707-mobile'
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT)
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const DEVICES = [
  { name: 'Pixel7', width: 412, height: 915, dsf: 2, usableH: 824 },
  { name: 'iPhone14Pro', width: 393, height: 852, dsf: 3, usableH: 741 },
]
const WORLDS = [
  { mode: 'bluechips', gridSize: 5 },
  { mode: 'altseason', gridSize: 5 },
  { mode: 'shitcoin', gridSize: 7 },
]

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')]
    const lc = t.toLowerCase()
    return (
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(lc)) ||
      null
    )
  }, t)
  const el = h.asElement()
  if (!el) return false
  try { await el.click() } catch (e) { return false }
  return true
}
async function clickSel(page, sel) {
  const h = await page.$(sel)
  if (!h) return false
  try {
    await h.evaluate((e) => e.scrollIntoView({ block: 'center' }))
  } catch (e) {}
  try { await h.click() } catch (e) { return false }
  return true
}
async function tapEl(page, sel) {
  // real touchscreen tap at the element's live center, with scrollIntoView
  // first (documented load-bearing fix from the prior mobile-touch-qa round)
  const box = await page.evaluate((s) => {
    const el = document.querySelector(s)
    if (!el) return null
    el.scrollIntoView({ block: 'center' })
    return true
  }, sel)
  if (!box) return false
  await wait(120)
  const rect = await page.evaluate((s) => {
    const el = document.querySelector(s)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, sel)
  if (!rect) return false
  try {
    await page.touchscreen.tap(rect.x, rect.y)
  } catch (e) {
    return false
  }
  return true
}

async function fresh(page) {
  await page.goto('http://localhost:' + PORT + '/', { waitUntil: 'networkidle0' })
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch (e) {} })
  await page.goto('http://localhost:' + PORT + '/', { waitUntil: 'networkidle0' })
  await wait(900)
  await clickText(page, 'got it')
  await wait(250)
}

function computeGridLayoutJs(W, H, gridSize, minimalBands) {
  const wide = W / H > 1.2
  const topReserved = minimalBands ? H * 0.035 : H * (wide ? 0.12 : 0.15)
  const bottomReserved = minimalBands ? H * 0.035 : H * (wide ? 0.14 : 0.18)
  const sideFrac = minimalBands ? 0.04 : 0.08
  const safeW = W * (1 - sideFrac * 2)
  const safeH = (H - topReserved - bottomReserved) * 0.96
  const available = Math.min(safeW, safeH)
  const FIXED_TILE = 96
  const FIXED_GAP = 16
  const fixedFull = FIXED_TILE * gridSize + FIXED_GAP * (gridSize - 1)
  if (minimalBands && fixedFull <= available + 0.5) {
    const x = (W - fixedFull) / 2
    const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2
    const y = bandCenterY - fixedFull / 2
    return { x, y, tile: FIXED_TILE, gap: FIXED_GAP, full: fixedFull }
  }
  const gap = Math.max(6, available * 0.026)
  const tile = (available - gap * (gridSize - 1)) / gridSize
  const full = tile * gridSize + gap * (gridSize - 1)
  const x = (W - full) / 2
  const bandCenterY2 = topReserved + (H - topReserved - bottomReserved) / 2
  const y = bandCenterY2 - full / 2
  return { x, y, tile, gap, full }
}
async function getCanvasRect(page) {
  return await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { left: r.left, top: r.top, width: r.width, height: r.height }
  })
}
async function tileCenters(page, gridSize, minimalBands) {
  const cr = await getCanvasRect(page)
  if (!cr) return []
  const grid = computeGridLayoutJs(cr.width, cr.height, gridSize, minimalBands)
  const out = []
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const cx = cr.left + grid.x + col * (grid.tile + grid.gap) + grid.tile / 2
      const cy = cr.top + grid.y + row * (grid.tile + grid.gap) + grid.tile / 2
      out.push([Math.round(cx), Math.round(cy)])
    }
  }
  return out
}
function shuffled(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
function cellIndices(gridSize) {
  const out = []
  for (let i = 0; i < gridSize * gridSize; i++) out.push(i)
  return out
}

// ── FIX #2 probe: HUD band <-> canvas geometric overlap ────────────────────
async function probeHudOverlap(page) {
  return await page.evaluate(() => {
    const hud = document.querySelector('[data-testid="vault-mobile-hud-band"]')
    const canvas = document.querySelector('canvas')
    if (!hud || !canvas) return { hudPresent: !!hud, canvasPresent: !!canvas }
    const h = hud.getBoundingClientRect()
    const c = canvas.getBoundingClientRect()
    const overlapX = Math.max(0, Math.min(h.right, c.right) - Math.max(h.left, c.left))
    const overlapY = Math.max(0, Math.min(h.bottom, c.bottom) - Math.max(h.top, c.top))
    const overlapArea = overlapX * overlapY
    return {
      hudPresent: true,
      canvasPresent: true,
      hudRect: [Math.round(h.x), Math.round(h.y), Math.round(h.width), Math.round(h.height)],
      canvasRect: [Math.round(c.x), Math.round(c.y), Math.round(c.width), Math.round(c.height)],
      gapPx: Math.round(c.top - h.bottom), // positive = clean gap, negative = overlap
      overlapArea: Math.round(overlapArea),
    }
  })
}

// ── FIX #3 probe: settled board shrink + BET AGAIN fold ────────────────────
async function probeSettledFold(page, usableH) {
  return await page.evaluate((usableH) => {
    const canvas = document.querySelector('canvas')
    const canvasR = canvas ? canvas.getBoundingClientRect() : null
    const all = [...document.querySelectorAll('button,[role=button]')]
    const betAgain = all.find((e) => e.offsetParent !== null && /bet again/i.test(e.textContent || ''))
    const baR = betAgain ? betAgain.getBoundingClientRect() : null
    return {
      canvasRect: canvasR ? [Math.round(canvasR.x), Math.round(canvasR.y), Math.round(canvasR.width), Math.round(canvasR.height)] : null,
      betAgainPresent: !!betAgain,
      betAgainBottom: baR ? Math.round(baR.bottom) : null,
      betAgainClearsFold: baR ? baR.bottom <= usableH : null,
      marginBelowFold: baR ? Math.round(usableH - baR.bottom) : null,
    }
  }, usableH)
}

async function probeReceiptMobile(page) {
  return await page.evaluate(() => {
    const toggles = [...document.querySelectorAll('.vault-receipt-toggle')].filter((e) => e.offsetParent !== null)
    const toggle = toggles[0]
    const card = toggle ? toggle.closest('div') : null
    const body = document.body.textContent || ''
    return {
      togglePresent: !!toggle,
      hasMixerRow: /mixer/i.test(body),
      rowLabels: [...document.querySelectorAll('dt')].filter((e) => e.offsetParent !== null).map((e) => (e.textContent || '').trim()),
    }
  })
}

async function driveMidRound(page, gridSize, minimalBands, world, tag) {
  const centers = await tileCenters(page, gridSize, minimalBands)
  const order = shuffled(cellIndices(gridSize))
  let rugged = false
  for (let i = 0; i < 2; i++) {
    const [x, y] = centers[order[i]]
    try { await page.touchscreen.tap(x, y) } catch (e) {}
    await wait(500)
    rugged = await page.evaluate(() => /RUGGED/.test(document.body.textContent || ''))
    if (rugged) break
  }
  return { rugged }
}

async function driveToOutcome(page, gridSize, minimalBands, wantWin, maxAttempts) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const centers = await tileCenters(page, gridSize, minimalBands)
    const order = shuffled(cellIndices(gridSize))
    if (wantWin) {
      const [x, y] = centers[order[0]]
      try { await page.touchscreen.tap(x, y) } catch (e) {}
      await wait(550)
      const rugged = await page.evaluate(() => /RUGGED/.test(document.body.textContent || ''))
      if (rugged) continue
      await tapEl(page, '[data-testid="vault-ctl-cta"]') // best-effort; fall back to text click
      await clickText(page, 'take profit')
      await wait(400)
      await clickText(page, 'take profit')
      await wait(1300)
      const settled = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]'))
      if (settled) return { ok: true }
    } else {
      let clicked = 0
      for (const idx of order) {
        if (clicked >= 20) break
        const [x, y] = centers[idx]
        try { await page.touchscreen.tap(x, y) } catch (e) {}
        clicked++
        await wait(430)
        const rugged = await page.evaluate(() => /RUGGED/.test(document.body.textContent || ''))
        if (rugged) return { ok: true }
        const settled = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]'))
        if (settled) break
      }
    }
  }
  return { ok: false }
}

const RESULTS = { hudOverlap: {}, settledFold: {}, receipts: {}, errors: [] }

;(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: false,
    args: ['--autoplay-policy=no-user-gesture-required', '--window-size=500,1000'],
  })
  const page = await browser.newPage()
  page.on('pageerror', (e) => RESULTS.errors.push({ pageerror: e.message.slice(0, 200) }))

  try {
    for (const dev of DEVICES) {
      await page.setViewport({ width: dev.width, height: dev.height, deviceScaleFactor: dev.dsf, hasTouch: true, isMobile: true })

      for (const w of WORLDS) {
        const tag = `${dev.name}-${w.mode}`
        // LOBBY / default landing
        await fresh(page)
        await page.screenshot({ path: `${OUT}/${tag}-lobby.png` })

        // BET-ENTRY (select world)
        await clickSel(page, `[data-testid="vault-world-card-${w.mode}"]`)
        await wait(500)
        await page.screenshot({ path: `${OUT}/${tag}-betentry.png` })
        if (w.mode === 'altseason') {
          const bdBox = await page.evaluate(() => {
            const bd = document.querySelector('[data-testid="vault-grid-backdrop"], [data-testid="vault-scene-backdrop"]')
              || document.querySelector('div[style*="backdrop"]')
            return null // fall through; full-frame screenshot already captures it on mobile (single-column layout)
          })
        }

        // PLAYING (mid-round) — FIX #2 HUD overlap probe here
        await clickText(page, 'send it')
        await wait(1300)
        const mid = await driveMidRound(page, w.gridSize, true, w.mode, tag)
        await page.screenshot({ path: `${OUT}/${tag}-playing.png` })
        RESULTS.hudOverlap[tag] = await probeHudOverlap(page)

        // SETTLED — finish the round
        if (!mid.rugged) {
          await clickText(page, 'take profit')
          await wait(400)
          await clickText(page, 'take profit')
        }
        await wait(1300)
        const rugged2 = await page.evaluate(() => /RUGGED/.test(document.body.textContent || ''))
        const outcomeTag = rugged2 ? 'LOSS' : 'WIN'
        await page.screenshot({ path: `${OUT}/${tag}-settled-${outcomeTag}.png` })
        RESULTS.settledFold[tag + '-' + outcomeTag] = await probeSettledFold(page, dev.usableH)

        // SETTLED - GLASS BOX OPEN
        const toggled = await clickSel(page, '.vault-receipt-toggle')
        await wait(500)
        await page.screenshot({ path: `${OUT}/${tag}-settled-glassboxopen-${outcomeTag}.png` })
        RESULTS.receipts[tag + '-' + outcomeTag] = { toggled, ...(await probeReceiptMobile(page)) }
      }

      // ── Dedicated WIN + LOSS symmetry pass, bluechips + shitcoin, for FIX#3 fold check certainty ──
      for (const w of [WORLDS[0], WORLDS[2]]) {
        await fresh(page)
        await clickSel(page, `[data-testid="vault-world-card-${w.mode}"]`)
        await wait(400)
        await clickText(page, 'send it')
        await wait(1000)
        const winDrive = await driveToOutcome(page, w.gridSize, true, true, 8)
        await wait(700)
        await page.screenshot({ path: `${OUT}/${dev.name}-${w.mode}-SYMWIN-settled.png` })
        RESULTS.settledFold[`${dev.name}-${w.mode}-SYMWIN`] = { driveOk: winDrive.ok, ...(await probeSettledFold(page, dev.usableH)) }

        await fresh(page)
        await clickSel(page, `[data-testid="vault-world-card-${w.mode}"]`)
        await wait(400)
        await clickText(page, 'send it')
        await wait(1000)
        const lossDrive = await driveToOutcome(page, w.gridSize, true, false, 8)
        await wait(700)
        await page.screenshot({ path: `${OUT}/${dev.name}-${w.mode}-SYMLOSS-settled.png` })
        RESULTS.settledFold[`${dev.name}-${w.mode}-SYMLOSS`] = { driveOk: lossDrive.ok, ...(await probeSettledFold(page, dev.usableH)) }
      }
    }
  } catch (e) {
    RESULTS.fatal = String(e)
    console.error('FATAL', e)
  }

  fs.writeFileSync(OUT + '/results.json', JSON.stringify(RESULTS, null, 1))
  console.log('DONE. results.json written to', OUT)
  await browser.close()
})()
