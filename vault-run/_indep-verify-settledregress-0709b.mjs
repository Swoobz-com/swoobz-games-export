import { spawn } from 'node:child_process'
import http from 'node:http'
import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 5281
const URL = `http://localhost:${PORT}/`
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const VIEWPORTS = {
  Pixel7: { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true },
  iPhone14Pro: { width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
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
async function boardBox(p) { return p.evaluate(() => { const c=document.querySelector('canvas'); if(!c) return null; const r=c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height} }) }
async function tapCell(p, box, col, row, cols, minimalBands) {
  const grid = computeGridLayout(box.w, box.h, cols, minimalBands)
  const cx = box.x + grid.x + col*(grid.tile+grid.gap) + grid.tile/2
  const cy = box.y + grid.y + row*(grid.tile+grid.gap) + grid.tile/2
  await p.touchscreen.tap(cx, cy)
}
const out = {}
const child = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: process.cwd(), shell: true })
let browser
try {
  const start = Date.now()
  let up = false
  while (Date.now()-start < 30000) {
    up = await new Promise(res => { const req = http.get(URL, r => { res(r.statusCode===200); r.resume() }); req.on('error', ()=>res(false)); req.setTimeout(1000, ()=>{req.destroy();res(false)}) })
    if (up) break
    await wait(300)
  }
  if (!up) throw new Error('server did not come up')
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
  for (const [device, vp] of Object.entries(VIEWPORTS)) {
    const p = await browser.newPage()
    await p.setCacheEnabled(false)
    await p.setViewport(vp)
    await p.goto(URL, { waitUntil: 'domcontentloaded' })
    await wait(400)
    const sendIt = await p.evaluate(() => { const el=[...document.querySelectorAll('button')].find(b=>/send it/i.test(b.textContent||'')); if(!el) return null; el.scrollIntoView({block:'center'}); const r=el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })
    await p.touchscreen.tap(sendIt.x, sendIt.y)
    await wait(800)
    let settled = false, guard = 0
    while (!settled && guard < 24) {
      guard++
      const box = await boardBox(p)
      if (!box) break
      await tapCell(p, box, guard%5, Math.floor(guard/5)%5, 5, true)
      await wait(750)
      settled = await p.evaluate(() => !!document.querySelector('[data-testid="vault-settledpanel"]'))
    }
    if (!settled) { out[device] = { error: 'never settled after ' + guard + ' taps' }; await p.close(); continue }
    await wait(600)
    const betAgain = await p.evaluate(() => {
      const el = [...document.querySelectorAll('button')].find(b => /^bet again/i.test((b.textContent||'').trim()))
      if (!el) return null
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return { bottom: r.bottom, top: r.top, innerHeight: window.innerHeight, ariaLabel: el.getAttribute('aria-label'), text: el.textContent.trim(), h: r.height, w: r.width, touchAction: cs.touchAction }
    })
    const captionGap = await p.evaluate(() => {
      const cap = document.querySelector('[data-testid="vault-settled-board-caption"]')
      const panel = document.querySelector('[data-testid="vault-settledpanel"]')
      if (!cap || !panel) return null
      const cr = cap.getBoundingClientRect(); const pr = panel.getBoundingClientRect()
      return { gap: pr.top - cr.bottom }
    })
    const heroOverlayMounted = await p.evaluate(() => !!document.querySelector('[data-testid="vault-hero-overlay"]'))
    out[device] = { betAgain, captionGap, heroOverlayMounted, guardTaps: guard }
    await p.screenshot({ path: `_verify-indep-0709/${device}-05c-settled-betagain-correct.png` })
    await p.close()
  }
} finally {
  if (browser) await browser.close().catch(()=>{})
  const { execSync } = await import('node:child_process')
  if (child && child.pid) { try { execSync(`taskkill /pid ${child.pid} /T /F`, {stdio:'ignore'}) } catch(e){} }
  try {
    const outp = execSync(`netstat -ano | findstr :${PORT} | findstr LISTENING`, {encoding:'utf8'})
    const pids = [...new Set(outp.split('\n').map(l=>l.trim().split(/\s+/).pop()).filter(Boolean))]
    for (const pid of pids) { try { execSync(`taskkill /pid ${pid} /T /F`, {stdio:'ignore'}) } catch(e){} }
  } catch(e) {}
}
console.log(JSON.stringify(out, null, 2))
