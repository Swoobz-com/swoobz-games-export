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
const phase = (p) => p.evaluate(() => { const t = document.querySelector('[data-testid="vault-grid-topbar"]')?.textContent.replace(/\s+/g,' ').trim()||''; const m = t.match(/·\s*([A-Z ]+?)BALANCE/); return m?m[1].trim():t.slice(0,40) })
const status = (p) => p.evaluate(() => document.querySelector('[data-testid="vault-grid-status"]')?.textContent.replace(/\s+/g,' ').trim() || 'NONE')
const hud = (p) => p.evaluate(() => document.querySelector('[data-testid="vault-grid-hud-inner"]')?.textContent.replace(/\s+/g,' ').trim() || 'NONE')
const bal = (p) => p.evaluate(() => { const m = (document.querySelector('[data-testid="vault-grid-topbar"]')?.textContent||'').match(/BALANCE\D+([\d.]+)/); return m?m[1]:'?' })
async function boardBox(p) { return p.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } }) }
async function clearAndGo(p, w, h, dsf) {
  await p.setViewport({ width: w, height: h, deviceScaleFactor: dsf })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch(e){} })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' }); await wait(1200)
}
async function tapCell(p, box, col, row, cols) { await p.mouse.click(box.x + box.w * ((col+0.5)/cols), box.y + box.h * ((row+0.5)/cols)) }
const isSettled = (ph) => /SETTLED|RUGGED|CASHED|RICHES$/.test(ph) === false && /PUMPING|BET ENTRY/.test(ph) === false

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
p.on('pageerror', (e) => console.log('PAGEERROR', e.message))

const WORLD = process.argv[3] || 'bluechips'
const MODE = process.argv[4] || 'win' // win|loss
await clearAndGo(p, 1440, 900, 1)
if (WORLD !== 'bluechips') { await clickText(p, WORLD); await wait(300) }
await clickText(p, 'send it', '[data-testid="vault-ctl-cta"]'); await wait(1000)
console.log(`[${WORLD}/${MODE}] LIVE phase:`, await phase(p), '| hud:', await hud(p))
console.log('   status:', await status(p))
await p.screenshot({ path: `${OUT}/${WORLD}-${MODE}-live0.png` })
let box = await boardBox(p)
const cols = WORLD === 'shitcoin' ? 7 : 5
const maxTaps = MODE === 'loss' ? 40 : 4
let opened = 0
for (let i = 0; i < maxTaps; i++) {
  const ph = await phase(p)
  if (/RUGGED|BUST/i.test(ph) || /RUGGED|BUST/i.test(await status(p))) { console.log('  RUGGED at open', opened); break }
  await tapCell(p, box, i % cols, Math.floor(i / cols) % cols, cols)
  await wait(600)
  const h = await hud(p)
  console.log(`  tap#${i+1} -> hud: ${h}`)
  if (MODE === 'win' && opened < 3) await p.screenshot({ path: `${OUT}/${WORLD}-${MODE}-open${i+1}.png` })
  opened++
}
await p.screenshot({ path: `${OUT}/${WORLD}-${MODE}-preSettle.png` })
if (MODE === 'win') { const c = await clickText(p, 'take profit') || await clickText(p, 'cash out'); console.log('  cash clicked:', c); await wait(1500) }
else { await wait(1500) }
console.log('  SETTLED phase:', await phase(p), '| bal:', await bal(p))
await p.screenshot({ path: `${OUT}/${WORLD}-${MODE}-settled.png` })
const dump = await p.evaluate(() => document.body.innerText.replace(/\n{2,}/g,'\n').slice(0,1800))
console.log('=== SETTLED BODY ===\n' + dump)
// look for session meta / glass box / ownership points anywhere
const meta = await p.evaluate(() => { const t = document.body.innerText; const hits=[]; ['SESSION','META','OWNERSHIP','POINTS','GLASS','FAIR','SEED','HASH','VERIFY','PROOF','RECEIPT'].forEach(k=>{ if(new RegExp(k,'i').test(t)) hits.push(k) }); return hits })
console.log('META/FAIRNESS keywords present on settled:', meta)
await b.close()
console.log('DONE', WORLD, MODE)
