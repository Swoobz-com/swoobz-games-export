import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5390'
const OUT = 'shots-jesse-0707'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

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
const topbar = (p) => p.evaluate(() => document.querySelector('[data-testid="vault-grid-topbar"]')?.textContent.replace(/\s+/g,' ').trim() || 'NONE')
const status = (p) => p.evaluate(() => document.querySelector('[data-testid="vault-grid-status"]')?.textContent.replace(/\s+/g,' ').trim() || 'NONE')
const hud = (p) => p.evaluate(() => document.querySelector('[data-testid="vault-grid-hud-inner"]')?.textContent.replace(/\s+/g,' ').trim() || 'NONE')
async function boardBox(p) { return p.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } }) }
async function clearAndGo(p, w, h, dsf) {
  await p.setViewport({ width: w, height: h, deviceScaleFactor: dsf })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch(e){} })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' }); await wait(1200)
}
// click a grid cell by fractional row/col on a 5-col board
async function tapCell(p, box, col, row, cols) {
  const fx = (col + 0.5) / cols, fy = (row + 0.5) / cols
  await p.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
}

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
p.on('pageerror', (e) => console.log('PAGEERROR', e.message))

// ===== DESKTOP BLUECHIPS WIN =====
await clearAndGo(p, 1440, 900, 1)
await clickText(p, 'send it', '[data-testid="vault-ctl-cta"]'); await wait(1000)
console.log('WIN-RUN LIVE hud:', await hud(p), '| status:', await status(p))
await p.screenshot({ path: `${OUT}/win-live-start.png` })
let box = await boardBox(p)
// open a few safes, capture multiplier each time (bluechips 3 rugs of 25 => decent odds)
for (let i = 0; i < 4; i++) {
  const t = await status(p)
  if (/RUG|BUST|SETTLED/i.test(await topbar(p))) { console.log('rugged early at', i); break }
  await tapCell(p, box, i % 5, Math.floor(i / 5), 5)
  await wait(650)
  console.log(`after tap ${i+1}: hud=`, await hud(p), '| status=', await status(p))
  await p.screenshot({ path: `${OUT}/win-live-tap${i+1}.png` })
}
// full-page after some reveals
await p.screenshot({ path: `${OUT}/win-live-mid.png` })
// take profit / cash out
const cashed = await clickText(p, 'take profit') || await clickText(p, 'cash out') || await clickText(p, 'cash')
console.log('cash-out clicked:', cashed)
await wait(1400)
console.log('WIN SETTLED topbar:', await topbar(p), '| status:', await status(p))
await p.screenshot({ path: `${OUT}/win-settled.png` })
// dump settled text + look for session meta / glass box
const settledDump = await p.evaluate(() => document.body.innerText.replace(/\n{2,}/g,'\n').slice(0,1500))
console.log('=== WIN SETTLED BODY ===\n' + settledDump)

await b.close()
console.log('DONE play win')
