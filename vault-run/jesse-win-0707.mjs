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
const topbarRaw = (p) => p.evaluate(() => document.querySelector('[data-testid="vault-grid-topbar"]')?.textContent.replace(/\s+/g,' ').trim() || '')
const hud = (p) => p.evaluate(() => document.querySelector('[data-testid="vault-grid-hud-inner"]')?.textContent.replace(/\s+/g,' ').trim() || 'NONE')
async function boardBox(p) { return p.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } }) }
async function clearAndGo(p) {
  await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch(e){} })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' }); await wait(1000)
}
async function tapCell(p, box, col, row, cols) { await p.mouse.click(box.x + box.w * ((col+0.5)/cols), box.y + box.h * ((row+0.5)/cols)) }

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
p.on('pageerror', (e) => console.log('PAGEERROR', e.message))
await clearAndGo(p)

// --- Capture HOW IT WORKS "?" help modal first (from bet entry) ---
await clickText(p, '', '[data-testid="vault-corner-help"]')
await p.evaluate(() => document.querySelector('[data-testid="vault-corner-help"]')?.click())
await wait(700)
await p.screenshot({ path: `${OUT}/help-modal.png` })
const helpTxt = await p.evaluate(() => document.body.innerText.replace(/\n{2,}/g,'\n').slice(0,1600))
console.log('=== HELP MODAL BODY ===\n' + helpTxt.slice(0,900))
// close modal (escape)
await p.keyboard.press('Escape'); await wait(400)

// --- Force a WIN on bluechips: open ONE safe, cash if survived; retry ---
let won = false
for (let attempt = 0; attempt < 12 && !won; attempt++) {
  await clearAndGo(p)
  await clickText(p, 'send it', '[data-testid="vault-ctl-cta"]'); await wait(900)
  const box = await boardBox(p)
  // open one safe near a corner
  await tapCell(p, box, 2, 2, 5); await wait(650)
  const tb = await topbarRaw(p)
  if (/RUGGED|BUST/i.test(tb.replace('RUG OR RICHES',''))) { continue } // rugged, retry
  // survived one open -> maybe open a 2nd for a bigger number, else cash
  await tapCell(p, box, 0, 0, 5); await wait(650)
  const tb2 = await topbarRaw(p)
  const rugged2 = /RUGGED|BUST/i.test(tb2.replace('RUG OR RICHES',''))
  console.log(`attempt ${attempt}: hud=${await hud(p)} rugged2=${rugged2}`)
  const cash = await clickText(p, 'take profit') || await clickText(p, 'cash out')
  await wait(1500)
  const tb3 = await topbarRaw(p)
  if (/WIN|CASHED|PROFIT/i.test(tb3) || /SETTLED · WIN/i.test(tb3)) { won = true }
  console.log('  after cash topbar:', tb3, '| cashClicked:', cash)
  if (won) {
    await p.screenshot({ path: `${OUT}/bluechips-WIN-settled.png` })
    const dump = await p.evaluate(() => document.body.innerText.replace(/\n{2,}/g,'\n').slice(0,1600))
    console.log('=== WIN SETTLED BODY ===\n' + dump)
    // open the receipt / glass box
    const rc = await clickText(p, 'view receipt')
    await wait(800)
    await p.screenshot({ path: `${OUT}/win-receipt.png` })
    const rdump = await p.evaluate(() => document.body.innerText.replace(/\n{2,}/g,'\n').slice(0,1600))
    console.log('=== RECEIPT (glass box) BODY, clicked=' + rc + ' ===\n' + rdump)
  }
}
if (!won) console.log('NO WIN after retries (bad luck / cash disabled)')
await b.close()
console.log('DONE win harness')
