import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 5281
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
async function boardBox(p) {
  return p.evaluate(() => {
    const cs = document.querySelectorAll('canvas')
    if (cs.length === 0) return null
    const c = cs[0]
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height, count: cs.length }
  })
}
async function tapCell(p, box, col, row, cols, minimalBands) {
  const grid = computeGridLayout(box.w, box.h, cols, minimalBands)
  const cx = box.x + grid.x + col * (grid.tile + grid.gap) + grid.tile / 2
  const cy = box.y + grid.y + row * (grid.tile + grid.gap) + grid.tile / 2
  await p.mouse.move(cx, cy)
  await p.mouse.down()
  await wait(80)
  await p.mouse.up()
}

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
const p = await b.newPage()
p.on('console', (m) => console.log('PAGECONSOLE:', m.text()))
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch (e) {} })
await p.reload({ waitUntil: 'networkidle0' })
await wait(700)
console.log('clicked bluechips:', await clickText(p, 'bluechips'))
await wait(200)
console.log('clicked send it:', await clickText(p, 'send it', '[data-testid="vault-ctl-cta"]'))
await wait(900)
console.log('box after send it:', await boardBox(p))
const cells = []
for (let r = 1; r < 4; r++) for (let c = 1; c < 4; c++) cells.push([c, r])
for (let step = 0; step < cells.length; step++) {
  const box = await boardBox(p)
  console.log(`step ${step} box:`, box)
  if (!box) { console.log('BREAK: box null'); break }
  const [c, r] = cells[step]
  await tapCell(p, box, c, r, 5, true)
  await wait(300)
  const status = await p.evaluate(() => {
    const badge = document.querySelector('[data-testid="vault-rhythm-badge"]')
    const grid = document.querySelector('[data-testid="vault-grid-status"]')
    return {
      badgePresent: !!badge,
      badgeTier: badge?.getAttribute('data-tier'),
      gridStatus: grid?.textContent,
      bodyHasRugged: /RUGGED/i.test(document.body.textContent || ''),
      bodyHasSettled: /SETTLED/i.test(document.body.textContent || ''),
    }
  })
  console.log(`step ${step} status:`, status)
  if (status.bodyHasRugged) { console.log('RUGGED, stopping'); break }
}
await p.screenshot({ path: '_debug-rhythm-0709-final.png' })
await b.close()
