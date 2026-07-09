// FULL FRESH COMPREHENSIVE RE-SWEEP — DESKTOP — RUG OR RICHES (vault)
// swoobz-visual-regression-qa, 2026-07-07. Fresh port :5288. Own output dir.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.env.PORT || '5288'
const OUT = 'shots-visregqa0707-desktop'
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT)
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

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
  try { await h.click() } catch (e) { return false }
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

async function tileCenters(page, gridSize, isWide) {
  const cr = await getCanvasRect(page)
  if (!cr) return []
  const grid = computeGridLayoutJs(cr.width, cr.height, gridSize, isWide)
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

async function probeShell(page) {
  return await page.evaluate(() => {
    const q = (s) => document.querySelector(s)
    const shell = q('[data-testid="vault-canvas-shell"]')
    const ctlCol = q('[data-testid="DesktopControlColumn"]')
    const shellR = shell ? shell.getBoundingClientRect() : null
    const ctlR = ctlCol ? ctlCol.getBoundingClientRect() : null
    return {
      boardTop: shellR ? Math.round(shellR.top) : null,
      boardLeft: shellR ? Math.round(shellR.left) : null,
      gridFull: shell ? shell.getAttribute('data-grid-full') : null,
      gridPlate: shell ? shell.getAttribute('data-grid-plate') : null,
      controlColWidth: ctlR ? Math.round(ctlR.width) : null,
      controlColLeft: ctlR ? Math.round(ctlR.left) : null,
    }
  })
}

async function probeBackdrop(page) {
  return await page.evaluate(() => {
    const bd = document.querySelector('[data-testid="vault-grid-backdrop"]')
    const c = bd ? getComputedStyle(bd) : null
    return {
      present: !!bd,
      backgroundImage: c ? c.backgroundImage : null,
      zIndex: c ? c.zIndex : null,
    }
  })
}

async function probeReceipt(page, selector) {
  return await page.evaluate((sel) => {
    const card = document.querySelector(sel)
    if (!card) return { present: false }
    const rows = [...card.querySelectorAll('dt,[class*="rowLabel"]')].map((e) => (e.textContent || '').trim())
    const dl = card.querySelector('dl')
    const dlRect = dl ? dl.getBoundingClientRect() : null
    return {
      present: true,
      rowLabels: [...card.querySelectorAll('dt')].map((e) => (e.textContent || '').trim()),
      hasMixerRow: /mixer/i.test(card.textContent || ''),
      dlRect: dlRect ? [Math.round(dlRect.x), Math.round(dlRect.y), Math.round(dlRect.width), Math.round(dlRect.height)] : null,
    }
  }, selector)
}

async function driveMidRound(page, gridSize, isWide, tag, world) {
  const centers = await tileCenters(page, gridSize, isWide)
  const order = shuffled(cellIndices(gridSize))
  let rugged = false
  for (let i = 0; i < 2; i++) {
    const [x, y] = centers[order[i]]
    try { await page.mouse.click(x, y) } catch (e) {}
    await wait(450)
    rugged = await page.evaluate(() => /RUGGED/.test(document.body.textContent || ''))
    if (rugged) break
  }
  await page.screenshot({ path: `${OUT}/${world}-playing-${tag}.png` })
  return { rugged }
}

async function driveToOutcome(page, gridSize, isWide, wantWin, maxAttempts) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const centers = await tileCenters(page, gridSize, isWide)
    const order = shuffled(cellIndices(gridSize))
    if (wantWin) {
      const [x, y] = centers[order[0]]
      try { await page.mouse.click(x, y) } catch (e) {}
      await wait(500)
      const rugged = await page.evaluate(() => /RUGGED/.test(document.body.textContent || ''))
      if (rugged) continue
      await clickText(page, 'take profit')
      await wait(300)
      await clickText(page, 'take profit')
      await wait(1200)
      const settled = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]'))
      if (settled) return { ok: true }
    } else {
      let clicked = 0
      for (const idx of order) {
        if (clicked >= 15) break
        const [x, y] = centers[idx]
        try { await page.mouse.click(x, y) } catch (e) {}
        clicked++
        await wait(400)
        const rugged = await page.evaluate(() => /RUGGED/.test(document.body.textContent || ''))
        if (rugged) return { ok: true }
        const settled = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]'))
        if (settled) break // cleared board without rug, retry fresh
      }
    }
  }
  return { ok: false }
}

const RESULTS = { measurements: {}, backdrop: {}, receipts: {}, errors: [] }

;(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: false,
    args: ['--autoplay-policy=no-user-gesture-required', '--window-size=1500,1000'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  page.on('pageerror', (e) => RESULTS.errors.push({ pageerror: e.message.slice(0, 200) }))

  try {
    for (const w of WORLDS) {
      // LOBBY
      await fresh(page)
      await page.screenshot({ path: `${OUT}/${w.mode}-lobby-d1440.png` })

      // BET-ENTRY
      await clickSel(page, `[data-testid="vault-world-card-${w.mode}"]`)
      await wait(500)
      await page.screenshot({ path: `${OUT}/${w.mode}-betentry-d1440.png` })
      RESULTS.measurements[w.mode + '-betentry'] = await probeShell(page)
      RESULTS.backdrop[w.mode + '-betentry'] = await probeBackdrop(page)
      if (w.mode === 'altseason') {
        // full-frame crop of the backdrop layer specifically for FIX #4 garbled-text check
        const bdBox = await page.evaluate(() => {
          const bd = document.querySelector('[data-testid="vault-grid-backdrop"]')
          if (!bd) return null
          const r = bd.getBoundingClientRect()
          return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }
        })
        if (bdBox && bdBox.width > 0) {
          await page.screenshot({ path: `${OUT}/altseason-backdrop-crop-betentry-d1440.png`, clip: bdBox })
        }
      }

      // PLAYING (mid-round)
      await clickText(page, 'send it')
      await wait(1200)
      RESULTS.measurements[w.mode + '-playing'] = await probeShell(page)
      const mid = await driveMidRound(page, w.gridSize, true, 'd1440', w.mode)
      if (w.mode === 'altseason') {
        const bdBox = await page.evaluate(() => {
          const bd = document.querySelector('[data-testid="vault-grid-backdrop"]')
          if (!bd) return null
          const r = bd.getBoundingClientRect()
          return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }
        })
        if (bdBox && bdBox.width > 0) {
          await page.screenshot({ path: `${OUT}/altseason-backdrop-crop-playing-d1440.png`, clip: bdBox })
        }
      }

      // SETTLED (finish this round if not already rugged) -> LOSS or WIN, whichever it lands on
      if (!mid.rugged) {
        await clickText(page, 'take profit')
        await wait(300)
        await clickText(page, 'take profit')
      }
      await wait(1200)
      const rugged2 = await page.evaluate(() => /RUGGED/.test(document.body.textContent || ''))
      const outcomeTag = rugged2 ? 'LOSS' : 'WIN'
      await page.screenshot({ path: `${OUT}/${w.mode}-settled-${outcomeTag}-d1440.png` })
      RESULTS.measurements[w.mode + '-settled-' + outcomeTag] = await probeShell(page)

      // SETTLED - GLASS BOX OPEN
      const opened = await clickSel(page, '[data-testid="vault-settled-receipt-card"] .vault-receipt-toggle')
      await wait(500)
      await page.screenshot({ path: `${OUT}/${w.mode}-settled-glassboxopen-${outcomeTag}-d1440.png` })
      RESULTS.receipts[w.mode + '-' + outcomeTag] = { opened, ...(await probeReceipt(page, '[data-testid="vault-settled-receipt-card"]')) }
    }

    // ── Dedicated WIN + LOSS symmetry pass on bluechips for glass box row-count check ──
    await fresh(page)
    await clickSel(page, '[data-testid="vault-world-card-bluechips"]')
    await wait(400)
    await clickText(page, 'send it')
    await wait(900)
    const winDrive = await driveToOutcome(page, 5, true, true, 6)
    await wait(600)
    await clickSel(page, '[data-testid="vault-settled-receipt-card"] .vault-receipt-toggle')
    await wait(500)
    await page.screenshot({ path: `${OUT}/bluechips-settled-glassboxopen-SYMWIN-d1440.png` })
    RESULTS.receipts['bluechips-SYMWIN'] = { driveOk: winDrive.ok, ...(await probeReceipt(page, '[data-testid="vault-settled-receipt-card"]')) }

    await fresh(page)
    await clickSel(page, '[data-testid="vault-world-card-bluechips"]')
    await wait(400)
    await clickText(page, 'send it')
    await wait(900)
    const lossDrive = await driveToOutcome(page, 5, true, false, 6)
    await wait(600)
    await clickSel(page, '[data-testid="vault-settled-receipt-card"] .vault-receipt-toggle')
    await wait(500)
    await page.screenshot({ path: `${OUT}/bluechips-settled-glassboxopen-SYMLOSS-d1440.png` })
    RESULTS.receipts['bluechips-SYMLOSS'] = { driveOk: lossDrive.ok, ...(await probeReceipt(page, '[data-testid="vault-settled-receipt-card"]')) }

  } catch (e) {
    RESULTS.fatal = String(e)
    console.error('FATAL', e)
  }

  fs.writeFileSync(OUT + '/results.json', JSON.stringify(RESULTS, null, 1))
  console.log('DONE. results.json written to', OUT)
  await browser.close()
})()
