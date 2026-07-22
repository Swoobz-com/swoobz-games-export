import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5320'
const OUT = 'shots-jesse-sweep-0707/desktop'
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
async function boardBox(p) { return p.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } }) }
async function tapCell(p, box, col, row, cols) { await p.mouse.click(box.x + box.w * ((col+0.5)/cols), box.y + box.h * ((row+0.5)/cols)) }
async function clearAndGo(p) {
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch(e){} })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' }); await wait(1300)
}
const shot = async (p, name) => { await p.screenshot({ path: `${OUT}/${name}.png` }); console.log('  shot', name) }

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
p.on('pageerror', (e) => console.log('PAGEERROR', e.message))
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await clearAndGo(p)

console.log('== COLD OPEN ==')
console.log('  topbar:', await topbar(p))
await shot(p, '01-cold')
// try to advance any intro
await clickText(p, 'ape in'); await wait(400)
await clickText(p, 'got it'); await wait(300)
await clickText(p, 'skip'); await wait(300)
await shot(p, '02-betentry')
console.log('  betentry topbar:', await topbar(p))
// open how to play / info
const info = await clickText(p, 'how it works') || await clickText(p, 'how to play') || await clickText(p, '?')
console.log('  info opened:', info); await wait(500)
await shot(p, '03-howtoplay')
// dump modal text
const modalText = await p.evaluate(() => document.body.innerText.replace(/\n{2,}/g,'\n').slice(0,1200))
console.log('  === MODAL/BODY TEXT ===\n' + modalText)
// close modal
await clickText(p, 'close') || await clickText(p, 'got it') || await p.keyboard.press('Escape'); await wait(400)

// ---- WIN RUN with rhythm ----
console.log('== WIN RUN (bluechips, rhythm) ==')
await shot(p, '04-preplay')
await clickText(p, 'send it', '[data-testid="vault-ctl-cta"]') || await clickText(p, 'send it') || await clickText(p, 'crack a vault')
await wait(900)
console.log('  LIVE topbar:', await topbar(p))
console.log('  LIVE hud:', await hud(p))
console.log('  LIVE status:', await status(p))
await shot(p, '05-playing-initial')
let box = await boardBox(p)
const cols = 5
// fast consecutive taps to build rhythm chain (window 1400ms)
for (let i = 0; i < 6; i++) {
  const st = await status(p)
  if (/RUGGED|BUST/i.test(st)) { console.log('  rugged early at', i); break }
  await tapCell(p, box, i % cols, Math.floor(i/cols), cols)
  await wait(280)
  await shot(p, `06-tap${i+1}`)
  console.log(`  tap#${i+1} hud:`, await hud(p), '| status:', await status(p))
}
await shot(p, '07-preSettle')
const won = await clickText(p, 'take profit') || await clickText(p, 'take profit or ape deeper')
console.log('  cash clicked:', won); await wait(400)
await shot(p, '08-settled-win-early')
await wait(1400)
await shot(p, '09-settled-win')
console.log('  SETTLED topbar:', await topbar(p))
const winBody = await p.evaluate(() => document.body.innerText.replace(/\n{2,}/g,'\n').slice(0,1600))
console.log('  === SETTLED WIN BODY ===\n' + winBody)

// ---- LOSS RUN ----
console.log('== LOSS RUN (shitcoin, tap to rug) ==')
await clickText(p, 'bet again') || await clickText(p, 'ape in again') || await clickText(p, 'send it')
await wait(700)
await clickText(p, 'shitcoin'); await wait(400)
await shot(p, '10-shitcoin-betentry')
await clickText(p, 'send it', '[data-testid="vault-ctl-cta"]') || await clickText(p, 'send it')
await wait(900)
box = await boardBox(p)
const cols2 = 7
let rugged = false
for (let i = 0; i < 40; i++) {
  const st = await status(p)
  if (/RUGGED|BUST/i.test(st) || /RUGGED|BUST/i.test(await topbar(p))) { rugged = true; console.log('  RUGGED at tap', i); break }
  await tapCell(p, box, i % cols2, Math.floor(i/cols2) % cols2, cols2)
  await wait(320)
}
await wait(800)
await shot(p, '11-settled-loss')
console.log('  LOSS topbar:', await topbar(p), '| rugged:', rugged)
const lossBody = await p.evaluate(() => document.body.innerText.replace(/\n{2,}/g,'\n').slice(0,1400))
console.log('  === SETTLED LOSS BODY ===\n' + lossBody)

await b.close()
console.log('DONE desktop')
