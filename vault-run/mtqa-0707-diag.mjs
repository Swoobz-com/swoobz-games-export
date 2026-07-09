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
    return { x, y, tile: FIXED_TILE, gap: FIXED_GAP, full: fixedFull, wide, available, fixedFull }
  }
  const gap = Math.max(6, available * 0.026)
  const tile = (available - gap * (gridSize - 1)) / gridSize
  const full = tile * gridSize + gap * (gridSize - 1)
  const x = (W - full) / 2
  const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2
  const y = bandCenterY - full / 2
  return { x, y, tile, gap, full, wide, available, fixedFull }
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
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
  return true
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true, deviceScaleFactor: 2.625 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(700)
  await clickText(page, 'bluechips')
  await wait(400)
  await clickText(page, 'send it')
  await wait(1000)

  const canvasBox = await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]')
    const canvases = document.querySelectorAll('canvas')
    const c = shell ? shell.querySelector('canvas') : null
    const r = c ? c.getBoundingClientRect() : null
    return {
      shellFound: !!shell,
      canvasCountTotal: canvases.length,
      canvasInShell: !!c,
      rect: r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null,
    }
  })
  console.log('canvasBox:', JSON.stringify(canvasBox))

  const grid = computeGridLayout(canvasBox.rect.w, canvasBox.rect.h, 5, true)
  console.log('computed grid:', JSON.stringify(grid))

  const tapX = canvasBox.rect.x + grid.x + grid.tile / 2
  const tapY = canvasBox.rect.y + grid.y + grid.tile / 2
  console.log('tap at page coords:', tapX, tapY)

  const before = await page.evaluate(() => document.body.innerText)
  await page.screenshot({ path: 'diag-before-tap.png' })
  await page.touchscreen.tap(tapX, tapY)
  await wait(900)
  const after = await page.evaluate(() => document.body.innerText)
  await page.screenshot({ path: 'diag-after-tap.png' })

  // extract just the Pump/Bag stat lines to compare cheaply
  const extractStats = (t) => {
    const lines = t.split('\n').map((s) => s.trim()).filter(Boolean)
    return lines.filter((l) => /pump|bag|rug/i.test(l)).slice(0, 10)
  }
  console.log('BEFORE stats:', JSON.stringify(extractStats(before)))
  console.log('AFTER  stats:', JSON.stringify(extractStats(after)))
  console.log('text changed:', before !== after)

  // also try a plain mouse click at the same coords as a control
  await page.mouse.click(tapX + grid.tile + grid.gap, tapY)
  await wait(900)
  const afterClick = await page.evaluate(() => document.body.innerText)
  console.log('AFTER mouse.click on 2nd tile stats:', JSON.stringify(extractStats(afterClick)))

  await browser.close()
}
run().catch((e) => { console.error('FATAL', e); process.exit(1) })
