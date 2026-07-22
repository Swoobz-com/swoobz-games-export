// INDEPENDENT re-verify of RhythmBadge prefers-reduced-motion on a MOBILE
// touch viewport (the maker's own re-verify used desktop 1440x900 only for
// this part) — real page.touchscreen taps, Pixel 7 412x915.
import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 5281
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

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
function interiorCells(n) {
  const out = []
  for (let r = 1; r < n - 1; r++) for (let c = 1; c < n - 1; c++) out.push([c, r])
  return out
}
async function boardBox(p) {
  return p.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
}
async function touchCell(p, box, col, row, cols, minimalBands) {
  const grid = computeGridLayout(box.w, box.h, cols, minimalBands)
  const cx = box.x + grid.x + col * (grid.tile + grid.gap) + grid.tile / 2
  const cy = box.y + grid.y + row * (grid.tile + grid.gap) + grid.tile / 2
  await p.touchscreen.tap(cx, cy)
}
async function findByTextTouch(p, t) {
  const info = await p.evaluate((t) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    const visible = (e) => e.offsetParent !== null && !e.disabled
    const exact = els.filter((e) => visible(e) && norm(e) === lc)
    const partial = els.filter((e) => visible(e) && norm(e).includes(lc))
    const pool = exact.length ? exact : partial
    const el = pool.sort((a, b) => {
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect()
      return ra.width * ra.height - rb.width * rb.height
    })[0]
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, t)
  if (!info) return false
  await p.touchscreen.tap(info.x, info.y)
  return true
}
async function clearAndGo(p) {
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch (e) {} })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(700)
}

async function run(reduced) {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  const p = await b.newPage()
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }])
  await p.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  let found = null
  for (let attempt = 0; attempt < 15 && !found; attempt++) {
    await clearAndGo(p)
    await findByTextTouch(p, 'send it')
    await wait(700)
    const cells = interiorCells(5)
    for (let step = 0; step < cells.length && !found; step++) {
      const box = await boardBox(p)
      if (!box) break
      const [c, r] = cells[step]
      await touchCell(p, box, c, r, 5, true)
      // fast successive taps to land inside RHYTHM_WINDOW_MS=1400ms
      for (let poll = 0; poll < 10; poll++) {
        await wait(40)
        const info = await p.evaluate(() => {
          const el = document.querySelector('[data-testid="vault-rhythm-badge"]')
          if (!el) return null
          const cs = getComputedStyle(el)
          return {
            tier: el.getAttribute('data-tier'),
            animationName: cs.animationName,
            animationDuration: cs.animationDuration,
            animationPlayState: cs.animationPlayState,
          }
        })
        if (info) { found = info; break }
        const settledNow = await p.evaluate(() => !!document.querySelector('[data-testid="vault-settledpanel"]'))
        if (settledNow) break
      }
      const settled = await p.evaluate(() => !!document.querySelector('[data-testid="vault-settledpanel"]'))
      if (settled) break
    }
  }
  await p.screenshot({ path: `_fibgate-rhythmbadge-mobile-${reduced ? 'reduced' : 'normal'}.png` }).catch(() => {})
  await b.close()
  return found
}

const normal = await run(false)
const reduced = await run(true)
console.log(JSON.stringify({ normal, reduced }, null, 2))
fs.writeFileSync('_fibgate-rhythmbadge-mobile-results.json', JSON.stringify({ normal, reduced }, null, 2))
