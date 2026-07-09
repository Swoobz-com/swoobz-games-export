// Baseline measurement of BET AGAIN rect.bottom vs SMALL (chrome-expanded)
// viewport height, on BOTH phones, at BOTH grid sizes, for WIN + LOSS,
// BEFORE the svh/dvh fix lands. Adapted from mtqa-0707-vault-verify.mjs
// (the driver that FAILED the settled fold check) — same helpers, but the
// viewport height itself is set directly to the SMALL chrome-expanded value
// (824 Pixel7 / 741 iPhone14Pro) instead of a raw-height-minus-inset guess.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5314'
const OUT = 'shots-gad-foldfix-0707'
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

async function clickText(page, t, exact = false) {
  const h = await page.evaluateHandle(
    (t, exact) => {
      const els = [...document.querySelectorAll('button,[role=button],a')]
      const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
      return (
        els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === t.toLowerCase()) ||
        (!exact && els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(t.toLowerCase())))
      )
    },
    t,
    exact,
  )
  const el = h.asElement()
  if (!el) return false
  const box = await el.boundingBox()
  if (!box) return false
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
  return true
}

async function findByAriaPrefix(page, prefix) {
  return page.evaluateHandle((prefix) => {
    const els = [...document.querySelectorAll('button[aria-label]')]
    return els.find((e) => (e.getAttribute('aria-label') || '').toLowerCase().startsWith(prefix.toLowerCase()) && e.offsetParent !== null && !e.disabled)
  }, prefix)
}

async function tapHandle(page, handle) {
  const el = handle.asElement()
  if (!el) return false
  const box = await el.boundingBox()
  if (!box) return false
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
  return true
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
    const canvasBox = await page.evaluate(() => {
      const c = document.querySelector('[data-testid="vault-canvas-shell"] canvas')
      if (!c) return null
      const r = c.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height }
    })
    if (!canvasBox) return { ok: false, reason: 'no-canvas' }
    const grid = computeGridLayout(canvasBox.w, canvasBox.h, gridSize, true)
    const col = i % gridSize
    const row = Math.floor(i / gridSize) % gridSize
    const cx = canvasBox.x + grid.x + col * (grid.tile + grid.gap) + grid.tile / 2
    const cy = canvasBox.y + grid.y + row * (grid.tile + grid.gap) + grid.tile / 2
    await page.touchscreen.tap(cx, cy)
    await wait(650)
    const info = await settledInfo(page)
    if (info.settled) return { ok: true, taps: i + 1, won: info.won }
    if (outcome === 'win') {
      const canCashOutBtn = await findByAriaPrefix(page, 'Take profit')
      const el = canCashOutBtn.asElement()
      if (el) {
        await tapHandle(page, canCashOutBtn)
        await wait(900)
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
  await wait(600)
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const skip = btns.find((b) => /skip|got it|close|start/i.test(b.textContent || ''))
    if (skip) skip.click()
  })
  await wait(300)
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
  const results = { betAgainFold: [], hudGap: [], regressions: [] }

  for (const dev of DEVICES) {
    for (const heightMode of ['small', 'raw']) {
      const H = heightMode === 'small' ? dev.smallHeight : dev.rawHeight
      for (const world of WORLDS) {
        for (const outcome of ['win', 'loss']) {
          const page = await browser.newPage()
          await page.setViewport({ width: dev.width, height: H, isMobile: true, hasTouch: true, deviceScaleFactor: dev.dpr })
          let roundResult = null
          try {
            let attempts = 0
            const MAX_ATTEMPTS = 6
            let gapSettled = null
            while (attempts < MAX_ATTEMPTS) {
              attempts++
              await freshLoad(page, PORT)
              await clickText(page, world.label, false)
              await wait(400)
              await clickText(page, 'SEND IT', false)
              await wait(900)
              const rr = await forceRound(page, world.gridSize, outcome, world.gridSize * world.gridSize)
              await wait(700)
              if (!rr.ok) {
                results.regressions.push(`${dev.name}/${heightMode}/${world.key}/${outcome}: could not reach settled (${rr.reason}) [attempt ${attempts}]`)
                continue
              }
              roundResult = rr
              if ((outcome === 'win') === !!rr.won) break
            }
            if (!roundResult || !roundResult.ok) {
              results.regressions.push(`${dev.name}/${heightMode}/${world.key}/${outcome}: never reached settled after ${6} attempts`)
              await page.close()
              continue
            }
            const actualWon = roundResult.won
            const label = actualWon ? 'win' : 'loss'

            gapSettled = await measureHudGap(page)
            let gap = null
            if (gapSettled) {
              const grid = computeGridLayout(gapSettled.canvasW, gapSettled.canvasH, world.gridSize, true)
              const firstTileTopPage = gapSettled.canvasTop + grid.y
              gap = firstTileTopPage - gapSettled.hudBottom
              results.hudGap.push({ device: dev.name, heightMode, world: world.key, outcome: label, hudBottom: gapSettled.hudBottom, firstTileTop: firstTileTopPage, gap })
            }

            const info = await settledInfo(page)
            const betAgainRect = info.betAgainRect
            const margin = betAgainRect ? H - betAgainRect.bottom : null
            results.betAgainFold.push({
              device: dev.name,
              heightMode,
              viewportHeight: H,
              world: world.key,
              outcome: label,
              betAgainBottom: betAgainRect ? betAgainRect.bottom : null,
              margin,
            })
            if (heightMode === 'small') {
              await page.screenshot({ path: `${OUT}/${dev.name}-small-${world.key}-${label}.png` })
            }
          } catch (e) {
            results.regressions.push(`${dev.name}/${heightMode}/${world.key}/${outcome}: EXCEPTION ${e && e.message ? e.message : e}`)
          }
          await page.close()
        }
      }
    }
  }

  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
  await browser.close()
}

main().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
