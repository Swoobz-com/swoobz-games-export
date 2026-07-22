import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5390'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickText(page, t, within) {
  const h = await page.evaluateHandle(({ t, within }) => {
    const root = within ? document.querySelector(within) : document
    if (!root) return null
    const els = [...root.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) || null
  }, { t, within })
  const el = h.asElement(); if (!el) return false
  try { await el.click() } catch { return false }
  return true
}
function gridLayoutJs(W, H, gridSize, minimalBands) {
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
async function cellCenter(page, idx, gridSize, minimalBands) {
  return await page.evaluate(({ idx, gridSize, minimalBands, fn }) => {
    const gridLayoutJs = new Function('return ' + fn)()
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    const grid = gridLayoutJs(r.width, r.height, gridSize, minimalBands)
    const col = idx % gridSize, row = Math.floor(idx / gridSize)
    const x = grid.x + col * (grid.tile + grid.gap)
    const y = grid.y + row * (grid.tile + grid.gap)
    return { cx: r.left + x + grid.tile / 2, cy: r.top + y + grid.tile / 2, tile: grid.tile }
  }, { idx, gridSize, minimalBands, fn: gridLayoutJs.toString() })
}
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox','--force-device-scale-factor=1'] })
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' })
await p.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
await p.reload({ waitUntil: 'networkidle0' })
await wait(500)
await clickText(p, 'got it'); await clickText(p, 'skip'); await wait(250)
await clickText(p, 'shitcoin'); await wait(200)
await clickText(p, 'send it', '[data-testid="vault-ctl-cta"]')
await wait(1000)
for (let idx = 0; idx < 49; idx++) {
  const settledBefore = await p.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'))
  if (settledBefore) { console.log(`stopped before idx=${idx}, already settled`); break }
  const cell = await cellCenter(p, idx, 7, true)
  await p.mouse.move(cell.cx, cell.cy)
  await p.mouse.down(); await wait(60); await p.mouse.up()
  await wait(400)
  const status = await p.evaluate(() => (document.querySelector('[data-testid="vault-grid-status"]')?.textContent || '').split('recent')[0])
  const settled = await p.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'))
  console.log(`idx=${idx} status="${status}" settled=${settled}`)
  if (settled) break
}
await b.close()
