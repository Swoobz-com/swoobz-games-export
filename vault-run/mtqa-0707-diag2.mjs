import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5312'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

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

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(t.toLowerCase()))
  }, t)
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

async function settledInfo(page) {
  return page.evaluate(() => {
    const panel = document.querySelector('[data-testid="vault-settledpanel"]')
    const t = document.body.innerText || ''
    let won = null
    if (/RUGGED|BUST/i.test(t)) won = false
    if (/SECURED THE BAG/i.test(t)) won = true
    return { settled: !!panel, won }
  })
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
  const page = await browser.newPage()
  page.on('console', (m) => { if (m.type() === 'error') console.log('  [console error]', m.text()) })
  page.on('pageerror', (e) => console.log('  [pageerror]', String(e)))
  await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true, deviceScaleFactor: 2.625 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(600)
  await clickText(page, 'bluechips')
  await wait(400)
  await clickText(page, 'send it')
  await wait(900)

  const gridSize = 5
  for (let i = 0; i < gridSize * gridSize; i++) {
    const canvasBox = await page.evaluate(() => {
      const c = document.querySelector('[data-testid="vault-canvas-shell"] canvas')
      if (!c) return null
      const r = c.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height }
    })
    if (!canvasBox) { console.log(`i=${i}: NO CANVAS`); break }
    const grid = computeGridLayout(canvasBox.w, canvasBox.h, gridSize, true)
    const col = i % gridSize
    const row = Math.floor(i / gridSize) % gridSize
    const cx = canvasBox.x + grid.x + col * (grid.tile + grid.gap) + grid.tile / 2
    const cy = canvasBox.y + grid.y + row * (grid.tile + grid.gap) + grid.tile / 2
    await page.touchscreen.tap(cx, cy)
    await wait(650)
    const info = await settledInfo(page)
    const bag = await page.evaluate(() => (document.body.innerText.match(/BAG\s+([\d.]+)\s*USDC/i) || [])[1] || null)
    console.log(`i=${i} col=${col} row=${row} tap=(${cx.toFixed(1)},${cy.toFixed(1)}) settled=${info.settled} won=${info.won} bag=${bag}`)
    if (info.settled) { console.log('SETTLED, stopping'); break }
    // win-path attempt at cash out after first reveal
    const h = await findByAriaPrefix(page, 'Take profit')
    const el = h.asElement()
    if (el) {
      const box = await el.boundingBox()
      console.log(`   found Take profit button enabled, box=${JSON.stringify(box)}`)
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
      await wait(900)
      const info2 = await settledInfo(page)
      console.log(`   after take-profit tap: settled=${info2.settled} won=${info2.won}`)
      if (info2.settled) { console.log('SETTLED via take profit, stopping'); break }
    } else {
      console.log('   Take profit button not found/enabled yet')
    }
  }

  await browser.close()
}
run().catch((e) => { console.error('FATAL', e); process.exit(1) })
