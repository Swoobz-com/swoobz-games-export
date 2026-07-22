import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5281'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) || null
  }, t)
  const el = h.asElement()
  if (!el) return false
  await el.click()
  return true
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  const page = await browser.newPage()
  page.on('console', (m) => console.log('CONSOLE', m.type(), m.text()))
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(400)
  await clickText(page, 'bluechips')
  await wait(200)
  await clickText(page, 'send it')
  await wait(1000)

  const box = await page.evaluate(() => {
    const c = document.querySelector('[data-testid="vault-canvas-shell"] canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  console.log('canvas box', box)

  const statusBefore = await page.evaluate(() => document.querySelector('[data-testid="vault-grid-status"]')?.textContent)
  console.log('status before', statusBefore)

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
  const grid = computeGridLayout(box.w, box.h, 5, true)
  console.log('computed grid', grid)
  const clickX = box.x + grid.x + 0 * (grid.tile + grid.gap) + grid.tile / 2
  const clickY = box.y + grid.y + 0 * (grid.tile + grid.gap) + grid.tile / 2
  console.log('clicking at', clickX, clickY)
  const t0 = Date.now()
  await page.mouse.click(clickX, clickY)

  for (let i = 0; i < 20; i++) {
    await wait(15)
    const status = await page.evaluate(() => document.querySelector('[data-testid="vault-grid-status"]')?.textContent)
    const takeProfitDisabled = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((e) => (e.textContent || '').toLowerCase().includes('take profit'))
      return btn ? btn.disabled : 'NOT_FOUND'
    })
    console.log(i, Date.now() - t0, 'ms', 'status=', status, 'takeProfitDisabled=', takeProfitDisabled)
  }

  await page.screenshot({ path: 'shots-gameflowqa-0707-fresh/_debug-click-repro.png' })
  await browser.close()
}
run().catch((e) => { console.error(e); process.exit(1) })
