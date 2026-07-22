import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
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
async function boardBox(p) { return p.evaluate(() => { const c=document.querySelector('canvas'); if(!c) return null; const r=c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height} }) }
async function touchCell(p, box, col, row, cols, minimalBands) {
  const grid = computeGridLayout(box.w, box.h, cols, minimalBands)
  const cx = box.x + grid.x + col*(grid.tile+grid.gap) + grid.tile/2
  const cy = box.y + grid.y + row*(grid.tile+grid.gap) + grid.tile/2
  await p.touchscreen.tap(cx, cy)
}
async function findRealSendIt(p) {
  return p.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const el = btns.find(b => /send it/i.test(b.textContent||''))
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x+r.width/2, y: r.y+r.height/2 }
  })
}

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
const p = await b.newPage()
p.on('console', m => console.log('CONSOLE:', m.type(), m.text()))
await p.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await p.goto('http://localhost:5281/', { waitUntil: 'networkidle0' })
await p.evaluate(() => { try{localStorage.clear();sessionStorage.clear()}catch(e){} })
await p.goto('http://localhost:5281/', { waitUntil: 'networkidle0' })
await wait(700)

const sendIt = await findRealSendIt(p)
await p.touchscreen.tap(sendIt.x, sendIt.y)
await wait(900)

// reveal ONE tile at a safe interior cell (col1,row1 on 5x5)
const box = await boardBox(p)
await touchCell(p, box, 1, 1, 5, true)
await wait(700)

const preState = await p.evaluate(() => {
  const btns = [...document.querySelectorAll('button')]
  const cashoutBtn = btns.find(b => /take profit/i.test(b.textContent||''))
  if (!cashoutBtn) return { error: 'no cashout btn found' }
  const r = cashoutBtn.getBoundingClientRect()
  const cs = getComputedStyle(cashoutBtn)
  return {
    text: cashoutBtn.textContent.trim(),
    disabled: cashoutBtn.disabled,
    rect: { x: r.x, y: r.y, w: r.width, h: r.height },
    touchAction: cs.touchAction,
    pointerEvents: cs.pointerEvents,
  }
})
console.log('PRE-TAP cashout button state:', JSON.stringify(preState))

if (preState.rect) {
  const cx = preState.rect.x + preState.rect.w/2
  const cy = preState.rect.y + preState.rect.h/2
  console.log('Tapping at', cx, cy)
  await p.touchscreen.tap(cx, cy)
  await wait(900)
  const postState = await p.evaluate(() => ({
    settled: !!document.querySelector('[data-testid="vault-settledpanel"]'),
    bodyOutcome: (document.body.innerText.match(/SETTLED\s*·\s*\w+/)||[])[0] || null,
  }))
  console.log('POST-TAP state:', JSON.stringify(postState))
}
await p.screenshot({ path: '_debug-cashout-mobile-postcheck.png' }).catch(()=>{})
await b.close()
