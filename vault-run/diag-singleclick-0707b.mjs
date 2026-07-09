import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5287'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) || null
  }, t)
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
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
const p = await b.newPage()
p.on('pageerror', (e) => console.log('PAGEERROR', e.message))
await p.setViewport({ width: 393, height: 852, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch(e){} })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
await wait(700)
await clickText(p, 'send it')
await wait(900)
const box = await p.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
const grid = computeGridLayout(box.w, box.h, 5, true)
await p.screenshot({ path: 'diag-single-before.png' })
const bodyBefore = await p.evaluate(() => document.body.textContent.replace(/\s+/g, ' '))
console.log('BEFORE safeLeft:', /SAFES? LEFT (\d+)/.exec(bodyBefore)?.[1])
const col = 1, row = 1
const cx = box.x + grid.x + col * (grid.tile + grid.gap) + grid.tile / 2
const cy = box.y + grid.y + row * (grid.tile + grid.gap) + grid.tile / 2
console.log('tapping at', cx, cy)
await p.mouse.move(cx, cy)
await p.mouse.down()
await wait(80)
await p.mouse.up()
await wait(600)
await p.screenshot({ path: 'diag-single-after.png' })
const bodyAfter = await p.evaluate(() => document.body.textContent.replace(/\s+/g, ' '))
console.log('AFTER safeLeft:', /SAFES? LEFT (\d+)/.exec(bodyAfter)?.[1], ' phase snippet:', bodyAfter.slice(0, 120))

// Second tap, same session, next interior cell (2,1) — mimic the loop's rapid cadence.
const box2 = await p.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
console.log('box2 (re-measured):', JSON.stringify(box2))
const grid2 = computeGridLayout(box2.w, box2.h, 5, true)
const cx2 = box2.x + grid2.x + 2 * (grid2.tile + grid2.gap) + grid2.tile / 2
const cy2 = box2.y + grid2.y + 1 * (grid2.tile + grid2.gap) + grid2.tile / 2
console.log('tapping2 at', cx2, cy2)
await p.mouse.move(cx2, cy2)
await p.mouse.down()
await wait(80)
await p.mouse.up()
await wait(600)
await p.screenshot({ path: 'diag-single-after2.png' })
const bodyAfter2 = await p.evaluate(() => document.body.textContent.replace(/\s+/g, ' '))
console.log('AFTER2 safeLeft:', /SAFES? LEFT (\d+)/.exec(bodyAfter2)?.[1], ' snippet:', bodyAfter2.slice(0, 140))
await b.close()
