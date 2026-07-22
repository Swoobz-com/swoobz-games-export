// Foreground Puppeteer driver — verifies settled BET AGAIN clears the fold
// under the SMALL (chrome-expanded) viewport on Pixel7 (824 usable) and
// iPhone14Pro (741 usable), for WIN + LOSS at 5x5 (bluechips) + 7x7
// (shitcoin). Also checks the FIX #2 HUD-to-first-tile gap stays positive,
// and captures the RAW (chrome-collapsed) viewport numbers for reference
// (this is what reproduces the ORIGINAL bug report's 826px bottom).
//
// Uses PROGRAMMATIC .click() (not touchscreen.tap) to drive the round —
// a real touch-fidelity pass already exists (mobile-touch-qa); this driver's
// job is purely to measure layout geometry accurately, and a known
// PRE-EXISTING, OUT-OF-SCOPE bug (bet-entry's own SEND IT button sits
// partly below the small-viewport fold for the bluechips/5x5 world only —
// confirmed via a direct diag: box.y=814.8 vs viewport 824 for bluechips,
// vs box.y=728.8 for shitcoin) makes a real touchscreen.tap unreliable for
// reaching settled from bet-entry at the small viewport. That bug belongs to
// bet-entry's OWN fold (a different, already-flagged issue), not the
// settled-CTA fold this task fixes — so it is bypassed here via .click(),
// not fixed.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5314'
const OUT = 'shots-gad-foldfix-verify-0707'
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const DEVICES = [
  { name: 'Pixel7', width: 412, rawHeight: 915, smallHeight: 824, dpr: 2.625 },
  { name: 'iPhone14Pro', width: 393, rawHeight: 852, smallHeight: 741, dpr: 3 },
]

const WORLDS = [
  { key: 'bluechips', label: 'BLUECHIPS', gridSize: 5 },
  { key: 'shitcoin', label: 'SHITCOIN', gridSize: 7 },
]

function computeGridLayout(W, H, gridSize, minimalBands) {
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
  const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2
  const y = bandCenterY - full / 2
  return { x, y, tile, gap, full }
}

async function domClick(page, matcher) {
  return page.evaluate((matcher) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const el =
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === matcher.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(matcher.toLowerCase()))
    if (!el) return false
    el.click()
    return true
  }, matcher)
}

async function domClickAriaPrefix(page, prefix) {
  return page.evaluate((prefix) => {
    const els = [...document.querySelectorAll('button[aria-label]')]
    const el = els.find((e) => (e.getAttribute('aria-label') || '').toLowerCase().startsWith(prefix.toLowerCase()) && e.offsetParent !== null && !e.disabled)
    if (!el) return false
    el.click()
    return true
  }, prefix)
}

async function domRevealTile(page, gridSize, idx) {
  return page.evaluate(
    ({ gridSize, idx, fn }) => {
      // eslint-disable-next-line no-new-func
      const computeGridLayout = new Function('return ' + fn)()
      const c = document.querySelector('[data-testid="vault-canvas-shell"] canvas')
      if (!c) return false
      const r = c.getBoundingClientRect()
      const grid = computeGridLayout(r.width, r.height, gridSize, true)
      const col = idx % gridSize
      const row = Math.floor(idx / gridSize)
      const cx = r.left + grid.x + col * (grid.tile + grid.gap) + grid.tile / 2
      const cy = r.top + grid.y + row * (grid.tile + grid.gap) + grid.tile / 2
      const target = document.elementFromPoint(cx, cy)
      if (!target) return false
      // dispatch a real pointerdown/pointerup pair (VaultGridCanvas listens
      // for pointer events, not synthetic .click(), on the canvas itself)
      const opts = { bubbles: true, cancelable: true, clientX: cx, clientY: cy, pointerId: 1, isPrimary: true }
      target.dispatchEvent(new PointerEvent('pointerdown', opts))
      target.dispatchEvent(new PointerEvent('pointerup', opts))
      target.dispatchEvent(new MouseEvent('click', opts))
      return true
    },
    { gridSize, idx, fn: computeGridLayout.toString() },
  )
}

async function settledInfo(page) {
  return page.evaluate(() => {
    const panel = document.querySelector('[data-testid="vault-settledpanel"]')
    const betAgain = panel
      ? [...panel.querySelectorAll('button[aria-label]')].find((b) => (b.getAttribute('aria-label') || '').toLowerCase().startsWith('bet again,'))
      : null
    const t = document.body.innerText || ''
    let won = null
    if (/RUGGED|BUST/i.test(t)) won = false
    if (/SECURED THE BAG/i.test(t)) won = true
    let betAgainRect = null
    if (betAgain) {
      const r = betAgain.getBoundingClientRect()
      betAgainRect = { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }
    }
    return { settled: !!panel, won, betAgainRect }
  })
}

async function measureHudGap(page) {
  return page.evaluate(() => {
    const hud = document.querySelector('[data-testid="vault-mobile-hud-band"]')
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]')
    const canvas = shell ? shell.querySelector('canvas') : null
    if (!hud || !canvas) return null
    const hudRect = hud.getBoundingClientRect()
    const canvasRect = canvas.getBoundingClientRect()
    return { hudBottom: hudRect.bottom, canvasTop: canvasRect.top, canvasW: canvasRect.width, canvasH: canvasRect.height }
  })
}

async function forceRound(page, gridSize, outcome, maxTaps) {
  for (let i = 0; i < maxTaps; i++) {
    await domRevealTile(page, gridSize, i)
    await wait(500)
    const info = await settledInfo(page)
    if (info.settled) return { ok: true, taps: i + 1, won: info.won }
    if (outcome === 'win') {
      const clicked = await domClickAriaPrefix(page, 'Take profit')
      if (clicked) {
        await wait(800)
        const info2 = await settledInfo(page)
        if (info2.settled) return { ok: true, taps: i + 1, won: info2.won }
      }
    }
  }
  return { ok: false, reason: 'exhausted' }
}

async function freshLoad(page, port) {
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle0' })
  await page.evaluate(() => {
    try { localStorage.clear(); sessionStorage.clear() } catch {}
  })
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(500)
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const skip = btns.find((b) => /skip|got it|close|start/i.test(b.textContent || ''))
    if (skip) skip.click()
  })
  await wait(250)
}

async function measureOne(browser, dev, heightMode, world, outcome) {
  const H = heightMode === 'small' ? dev.smallHeight : dev.rawHeight
  const page = await browser.newPage()
  const consoleErrs = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text()) })
  page.on('pageerror', (e) => consoleErrs.push(String(e)))
  await page.setViewport({ width: dev.width, height: H, isMobile: true, hasTouch: true, deviceScaleFactor: dev.dpr })
  let result = null
  try {
    let attempts = 0
    let roundResult = null
    while (attempts < 8) {
      attempts++
      await freshLoad(page, PORT)
      await domClick(page, world.label)
      await wait(350)
      await domClick(page, 'SEND IT')
      await wait(700)
      const rr = await forceRound(page, world.gridSize, outcome, world.gridSize * world.gridSize)
      if (!rr.ok) continue
      roundResult = rr
      if ((outcome === 'win') === !!rr.won) break
    }
    if (!roundResult || !roundResult.ok) {
      result = { ok: false, reason: 'never-settled' }
    } else {
      await wait(400)
      const label = roundResult.won ? 'win' : 'loss'
      const gapInfo = await measureHudGap(page)
      let hudGap = null
      if (gapInfo) {
        const grid = computeGridLayout(gapInfo.canvasW, gapInfo.canvasH, world.gridSize, true)
        const firstTileTopPage = gapInfo.canvasTop + grid.y
        hudGap = firstTileTopPage - gapInfo.hudBottom
      }
      const info = await settledInfo(page)
      const betAgainBottom = info.betAgainRect ? info.betAgainRect.bottom : null
      const margin = betAgainBottom !== null ? H - betAgainBottom : null
      await page.screenshot({ path: `${OUT}/${dev.name}-${heightMode}-${world.key}-${label}.png` })
      result = {
        ok: true,
        actualOutcomeMatchesWanted: (outcome === 'win') === !!roundResult.won,
        outcome: label,
        betAgainBottom,
        margin,
        hudGap,
        consoleErrors: consoleErrs.length,
      }
    }
  } catch (e) {
    result = { ok: false, reason: 'exception', message: e && e.message ? e.message : String(e) }
  }
  await page.close()
  return { device: dev.name, heightMode, viewportHeight: H, world: world.key, wantedOutcome: outcome, ...result }
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
  const rows = []
  for (const dev of DEVICES) {
    for (const heightMode of ['small', 'raw']) {
      for (const world of WORLDS) {
        for (const outcome of ['win', 'loss']) {
          const r = await measureOne(browser, dev, heightMode, world, outcome)
          rows.push(r)
          fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(rows, null, 2))
          console.log(JSON.stringify(r))
        }
      }
    }
  }
  await browser.close()
  console.log('DONE')
}

main().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
