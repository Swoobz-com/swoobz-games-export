import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5320'
const OUT = 'shots-jesse-sweep-0707/desktop2'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
fs.mkdirSync(OUT, { recursive: true })
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
const opened = async (p) => { const m = (await status(p)).match(/OPEN (\d+) of/); return m ? +m[1] : -1 }
async function boardBox(p) { return p.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } }) }
async function tapCell(p, box, col, row, cols) { await p.mouse.click(box.x + box.w * ((col+0.5)/cols), box.y + box.h * ((row+0.5)/cols)) }
async function clearAndGo(p) {
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch(e){} })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' }); await wait(1300)
}
const shot = async (p, name) => { await p.screenshot({ path: `${OUT}/${name}.png` }); console.log('  shot', name) }
const isRug = async (p) => /RUGGED|BUST/i.test(await topbar(p)) || /RUGGED|BUST/i.test(await status(p))

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
p.on('pageerror', (e) => console.log('PAGEERROR', e.message))
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })

// ---- RHYTHM PEAK RUN: bluechips, chain reveals to reach CLEAN TEMPO ----
console.log('== RHYTHM PEAK RUN ==')
await clearAndGo(p)
await clickText(p, 'send it', '[data-testid="vault-ctl-cta"]') || await clickText(p, 'send it')
await wait(900)
let box = await boardBox(p)
const cols = 5
const order = [[0,0],[1,0],[2,0],[3,0],[4,0],[0,1],[1,1],[2,1]]
let prevOpen = await opened(p)
let chain = 0
for (const [c,r] of order) {
  if (await isRug(p)) { console.log('  rugged'); break }
  await tapCell(p, box, c, r, cols)
  // poll for the reveal to register (open count +1) up to 1100ms (< 1400 rhythm window)
  let t = 0, reg = false
  while (t < 1100) { await wait(90); t += 90; const o = await opened(p); if (o > prevOpen) { prevOpen = o; reg = true; break } }
  if (reg) { chain++; await shot(p, `peak-chain${chain}`); console.log(`  chain${chain} open=${prevOpen} hud=${await hud(p)}`) }
  else console.log('  tap dropped')
  if (chain >= 6) break
}
await shot(p, 'peak-final')
// cash out
await clickText(p, 'take profit'); await wait(1600)
await shot(p, 'peak-settled')

// ---- LOSS RUN: shitcoin, tap to rug ----
console.log('== LOSS RUN shitcoin ==')
await clickText(p, 'bet again') || await clickText(p, 'send it')
await wait(700)
await clickText(p, 'shitcoin'); await wait(500)
await clickText(p, 'send it', '[data-testid="vault-ctl-cta"]') || await clickText(p, 'send it')
await wait(900)
box = await boardBox(p)
const cols2 = 7
let rugged = false
for (let i = 0; i < 49; i++) {
  if (await isRug(p)) { rugged = true; break }
  await tapCell(p, box, i % cols2, Math.floor(i/cols2) % cols2, cols2)
  await wait(360)
  if (await isRug(p)) { rugged = true; break }
}
await wait(400)
await shot(p, 'loss-settled-early')
await wait(1400)
await shot(p, 'loss-settled')
console.log('  rugged:', rugged, '| topbar:', await topbar(p))
const lossBody = await p.evaluate(() => document.body.innerText.replace(/\n{2,}/g,'\n').slice(0,1400))
console.log('  === LOSS BODY ===\n' + lossBody)
await b.close()
console.log('DONE desktop2')
