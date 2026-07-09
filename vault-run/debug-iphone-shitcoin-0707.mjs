// debug-iphone-shitcoin-0707.mjs — targeted debug of why iPhone14Pro/shitcoin/WIN
// never reaches an outcome in fix3-final-reverify-0707.mjs. Own fresh dev server.
import puppeteer from 'puppeteer-core'
import { spawn } from 'node:child_process'
import { execSync } from 'node:child_process'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 5316
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

function waitForServer(port, timeoutMs = 40000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get({ host: 'localhost', port, path: '/', timeout: 2000 }, (res) => { res.resume(); resolve(true) })
      req.on('error', () => { if (Date.now() - start > timeoutMs) reject(new Error('timeout')); else setTimeout(tryOnce, 500) })
      req.on('timeout', () => { req.destroy(); if (Date.now() - start > timeoutMs) reject(new Error('timeout')); else setTimeout(tryOnce, 500) })
    }
    tryOnce()
  })
}
function killTree(pid) {
  if (!pid) return
  try { if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' }); else process.kill(-pid, 'SIGKILL') } catch {}
}

async function findButtonHandle(page, { text, ariaLabel }) {
  return page.evaluateHandle(({ text, ariaLabel }) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    if (ariaLabel) { const byAria = els.find((e) => (e.getAttribute('aria-label') || '').toLowerCase() === ariaLabel.toLowerCase() && e.offsetParent !== null); if (byAria) return byAria }
    if (text) { const lc = text.toLowerCase(); const exact = els.find((e) => e.offsetParent !== null && norm(e) === lc); if (exact) return exact; const inc = els.find((e) => e.offsetParent !== null && norm(e).includes(lc)); if (inc) return inc }
    return null
  }, { text, ariaLabel })
}
async function tapEl(page, handle) {
  const el = handle.asElement()
  if (!el) return false
  const box = await el.boundingBox()
  if (!box) return false
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
  return true
}
async function tapText(page, text) { const h = await findButtonHandle(page, { text }); return tapEl(page, h) }
async function dismissOnboarding(page) { await tapText(page, 'got it'); await wait(150); await tapText(page, 'skip'); await wait(200) }

async function main() {
  console.log('[debug] starting dev server...')
  const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: __dirname, shell: true })
  let browser
  try {
    await waitForServer(PORT)
    browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
    const page = await browser.newPage()
    page.on('console', (m) => console.log('[PAGE]', m.type(), m.text()))
    page.on('pageerror', (e) => console.log('[PAGEERROR]', e.message))
    await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
    await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })
    await page.reload({ waitUntil: 'networkidle0' })
    await wait(500)
    await dismissOnboarding(page)
    await tapText(page, 'SHITCOIN')
    await wait(300)

    const trailModeState = await page.evaluate(() => document.body.innerText.includes('TRAIL') )
    console.log('[debug] bet-entry text has TRAIL mention:', trailModeState)

    const commitH = await findButtonHandle(page, { text: 'send it' })
    const commitBox = await commitH.asElement()?.boundingBox()
    console.log('[debug] commit box:', commitBox)
    await tapEl(page, commitH)
    await wait(900)
    await page.evaluate(() => window.scrollTo(0, 0))

    // Inspect canvas shell + hud band + phase state
    const info = await page.evaluate(() => {
      const shell = document.querySelector('[data-testid="vault-canvas-shell"]')
      const hud = document.querySelector('[data-testid="vault-mobile-hud-band"]')
      const sR = shell ? shell.getBoundingClientRect() : null
      const hR = hud ? hud.getBoundingClientRect() : null
      const btns = [...document.querySelectorAll('button')].map(b => ({ text: (b.textContent||'').trim(), disabled: b.disabled }))
      return { shellRect: sR ? { top: sR.top, left: sR.left, width: sR.width, height: sR.height } : null, hudRect: hR ? { top: hR.top, left: hR.left, width: hR.width, height: hR.height, bottom: hR.bottom } : null, buttons: btns }
    })
    console.log('[debug] phase info after commit:', JSON.stringify(info, null, 2))

    // canvas element itself dims
    const canvasInfo = await page.evaluate(() => {
      const c = document.querySelector('[data-testid="vault-canvas-shell"] canvas')
      if (!c) return null
      const r = c.getBoundingClientRect()
      return { top: r.top, left: r.left, width: r.width, height: r.height, cssW: c.style.width, cssH: c.style.height, attrW: c.width, attrH: c.height }
    })
    console.log('[debug] canvas element rect:', JSON.stringify(canvasInfo))

    // Compute geometry same way as driver
    const geo = await page.evaluate(() => {
      const canvasShell = document.querySelector('[data-testid="vault-canvas-shell"]').getBoundingClientRect()
      const hudBand = document.querySelector('[data-testid="vault-mobile-hud-band"]').getBoundingClientRect()
      const full = hudBand.width
      const H = canvasShell.height
      const gridX = hudBand.left - canvasShell.left
      const gridY = (H - full) / 2
      return { canvasShellLeft: canvasShell.left, canvasShellTop: canvasShell.top, full, H, gridX, gridY }
    })
    console.log('[debug] geo:', JSON.stringify(geo))
    const gridSize = 7
    let gap = Math.max(6, geo.full * 0.026)
    let tile = (geo.full - gap * (gridSize - 1)) / gridSize
    console.log('[debug] tile/gap:', tile, gap)

    // Tap first cell (0,0) and see what happens
    const x0 = geo.canvasShellLeft + geo.gridX + 0 * (tile + gap) + tile / 2
    const y0 = geo.canvasShellTop + geo.gridY + 0 * (tile + gap) + tile / 2
    console.log('[debug] tapping cell(0,0) at', x0, y0)
    await page.touchscreen.tap(x0, y0)
    await wait(600)
    const afterTapInfo = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')].map(b => ({ text: (b.textContent||'').trim(), disabled: b.disabled }))
      const settled = !!document.querySelector('[data-testid="vault-settled-banner"]')
      return { btns, settled }
    })
    console.log('[debug] after tap(0,0):', JSON.stringify(afterTapInfo, null, 2))
    await page.screenshot({ path: path.join(__dirname, 'debug-iphone-shitcoin-after-tap0.png') })

  } finally {
    try { if (browser) await browser.close() } catch {}
    killTree(vite.pid)
  }
}
main()
