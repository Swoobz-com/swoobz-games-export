// Supplemental check: expand the Glass Box receipt on desktop + mobile,
// confirm it renders (no crash, no console error) and no second overlay
// stacks on top of it (Probe 7 mutual exclusivity).
import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5281'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) || null
  }, t)
  const el = h.asElement()
  if (!el) return false
  await el.click()
  return true
}

function computeGridLayout(W, H, gridSize, minimalBands) {
  const wide = W / H > 1.2
  const topReserved = minimalBands ? H * 0.035 : H * (wide ? 0.12 : 0.15)
  const bottomReserved = minimalBands ? H * 0.035 : H * (wide ? 0.14 : 0.18)
  const sideFrac = minimalBands ? 0.04 : 0.08
  const safeW = W * (1 - sideFrac * 2)
  const safeH = (H - topReserved - bottomReserved) * 0.96
  const available = Math.min(safeW, safeH)
  const FIXED_TILE = 96, FIXED_GAP = 16
  const fixedFull = FIXED_TILE * gridSize + FIXED_GAP * (gridSize - 1)
  if (minimalBands && fixedFull <= available + 0.5) {
    const x = (W - fixedFull) / 2
    const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2
    const y = bandCenterY - fixedFull / 2
    return { x, y, tile: FIXED_TILE, gap: FIXED_GAP }
  }
  const gap = Math.max(6, available * 0.026)
  const tile = (available - gap * (gridSize - 1)) / gridSize
  const full = tile * gridSize + gap * (gridSize - 1)
  const x = (W - full) / 2
  const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2
  const y = bandCenterY - full / 2
  return { x, y, tile, gap }
}

async function clickCanvasTile(page, gridSize, col, row) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('[data-testid="vault-canvas-shell"] canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  if (!box) return false
  const grid = computeGridLayout(box.w, box.h, gridSize, true)
  const cx = box.x + grid.x + col * (grid.tile + grid.gap) + grid.tile / 2
  const cy = box.y + grid.y + row * (grid.tile + grid.gap) + grid.tile / 2
  await page.mouse.click(cx, cy)
  return true
}

async function driveToWin(page, gridSize) {
  const cellSeq = []
  for (let r = 0; r < gridSize; r++) for (let c = 0; c < gridSize; c++) cellSeq.push([c, r])
  for (const [c, r] of cellSeq) {
    const ready = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((e) => (e.textContent || '').toLowerCase().includes('take profit'))
      return !!btn && btn.offsetParent !== null && !btn.disabled
    })
    if (ready) { await clickText(page, 'take profit'); await wait(900); return }
    await clickCanvasTile(page, gridSize, c, r)
    await wait(250)
    const settled = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]'))
    if (settled) return
  }
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  const page = await browser.newPage()
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

  for (const v of [{ name: 'desktop', w: 1440, h: 900 }, { name: 'mobile-pixel7', w: 412, h: 915 }]) {
    errors.length = 0
    await page.setViewport({ width: v.w, height: v.h, deviceScaleFactor: 1 })
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
    await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })
    await page.reload({ waitUntil: 'networkidle0' })
    await wait(400)
    await clickText(page, 'bluechips')
    await wait(200)
    await clickText(page, 'send it')
    await wait(1000)
    await driveToWin(page, 5)
    await wait(500)

    const expandClicked = await clickText(page, 'view receipt')
    await wait(300)
    const receiptVisible = await page.evaluate(() => {
      const el = document.getElementById('vault-gutter-settled-receipt') || document.getElementById('vault-settled-receipt')
      return !!el && el.offsetParent !== null
    })
    const bodyText = await page.evaluate(() => document.body.innerText)
    const hasMixerRow = /\bmixer\b/i.test(bodyText)
    const overlayCounts = await page.evaluate(() => ({
      settledPanels: document.querySelectorAll('[data-testid="vault-settledpanel"]').length,
      betConsoles: document.querySelectorAll('[data-testid="bet-console"]').length,
      settledBanners: document.querySelectorAll('[data-testid="vault-settled-banner"]').length,
    }))
    console.log(v.name, { expandClicked, receiptVisible, hasMixerRow, overlayCounts, errors: [...errors] })
    await page.screenshot({ path: `shots-gameflowqa-0707-fresh/_supplemental-${v.name}-receipt-expanded.png` })
  }
  await browser.close()
}
run().catch((e) => { console.error(e); process.exit(1) })
