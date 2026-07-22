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
async function tap(page, cx, cy) {
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await wait(60)
  await page.mouse.up()
  await wait(1000)
}
async function freshLoad(page) {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(500)
  await clickText(page, 'got it'); await clickText(page, 'skip'); await wait(250)
}
const INTERIOR = []
for (let row = 1; row <= 5; row++) for (let col = 1; col <= 5; col++) INTERIOR.push(row * 7 + col)

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox','--force-device-scale-factor=1'] })
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await freshLoad(p)
await clickText(p, 'shitcoin'); await wait(200)
await clickText(p, 'send it', '[data-testid="vault-ctl-cta"]')
await wait(1000)

let gotLoss1 = false
let boardCaption = ''
for (let outer = 0; outer < 15 && !gotLoss1; outer++) {
  const pool = [...INTERIOR].sort(() => Math.random() - 0.5)
  const idxA = pool[0], idxB = pool[1]
  const cellA = await cellCenter(p, idxA, 7, true)
  await tap(p, cellA.cx, cellA.cy)
  let settled = await p.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'))
  let status = await p.evaluate(() => (document.querySelector('[data-testid="vault-grid-status"]')?.textContent || '').split('recent')[0])
  console.error(`outer=${outer} idxA=${idxA} settledAfterA=${settled} status="${status}"`)
  if (settled) { await clickText(p, 'bet again'); await wait(1000); continue }
  const cellB = await cellCenter(p, idxB, 7, true)
  await tap(p, cellB.cx, cellB.cy)
  settled = await p.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'))
  status = await p.evaluate(() => (document.querySelector('[data-testid="vault-grid-status"]')?.textContent || '').split('recent')[0])
  console.error(`  idxB=${idxB} settledAfterB=${settled} status="${status}"`)
  if (!settled) { await clickText(p, 'bet again'); await wait(1000); continue }
  const isWin = await p.evaluate(() => document.body.textContent.includes('SECURED THE BAG'))
  if (isWin) { await clickText(p, 'bet again'); await wait(1000); continue }
  gotLoss1 = true
  boardCaption = await p.evaluate(() => document.querySelector('[data-testid="vault-settled-board-caption"]')?.textContent || '')
}
console.log(JSON.stringify({ gotLoss1, boardCaption }, null, 2))
await p.screenshot({ path: 'shots-consolidated-0707/loss1-desktop-settled-final.png' })
await b.close()
