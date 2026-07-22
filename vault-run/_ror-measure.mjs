import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.env.PORT || '5190'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(t)) || null
  }, t.toLowerCase())
  const el = h.asElement(); if (!el) return false
  try { await el.click() } catch { return false }
  return true
}
const rect = (sel) => `(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;const r=e.getBoundingClientRect();return{w:Math.round(r.width*100)/100,h:Math.round(r.height*100)/100,x:Math.round(r.left*100)/100,y:Math.round(r.top*100)/100}})()`

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--force-device-scale-factor=1'] })
const errors = []
async function measurePhase(page, label) {
  return await page.evaluate(() => {
    const R = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { w: Math.round(r.width * 100) / 100, h: Math.round(r.height * 100) / 100, x: Math.round(r.left * 100) / 100, y: Math.round(r.top * 100) / 100 } }
    const q = (s) => document.querySelector(s)
    const canvas = q('[data-testid="vault-canvas-shell"] canvas')
    const board = q('[data-testid="vault-canvas-shell"]')
    const hud = q('[data-testid="vault-grid-hud-inner"]') || q('[data-testid="vault-settled-banner"]')
    const hudRow = q('[data-testid="DesktopHudRow"]')
    const ctrl = q('[data-testid="DesktopControlColumn"]')
    const grid = q('[data-testid="vault-grid-mainGrid"]')
    const cs = grid ? getComputedStyle(grid) : null
    const btns = [...document.querySelectorAll('button')].map(b => ({ t: (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 18), h: Math.round(b.getBoundingClientRect().height) })).filter(b => b.t)
    return {
      canvas: R(canvas), board: R(board), hud: R(hud), hudRow: R(hudRow), ctrl: R(ctrl),
      gridCols: cs?.gridTemplateColumns, gridRows: cs?.gridTemplateRows, colGap: cs?.columnGap, rowGap: cs?.rowGap,
      btns,
    }
  })
}
for (const vp of [{ w: 1440, h: 900 }, { w: 1440, h: 1080 }]) {
  const page = await browser.newPage()
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${vp.w}x${vp.h}] ${m.text()}`) })
  page.on('pageerror', (e) => errors.push(`[${vp.w}x${vp.h}] PAGEERROR ${e.message}`))
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(600)
  await clickText(page, 'got it'); await clickText(page, 'skip'); await wait(200)
  const ready = await measurePhase(page, 'ready-lobby')
  await clickText(page, 'ape in'); await wait(500)
  const betentry = await measurePhase(page, 'bet-entry')
  console.log(`\n===== ${vp.w}x${vp.h} =====`)
  console.log('LOBBY:', JSON.stringify(ready))
  console.log('BETENTRY:', JSON.stringify(betentry, null, 1))
  await page.close()
}
console.log('\nCONSOLE ERRORS:', errors.length ? JSON.stringify(errors, null, 1) : 'none')
await browser.close()
