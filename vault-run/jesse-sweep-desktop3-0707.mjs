import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5320'
const OUT = 'shots-jesse-sweep-0707/desktop3'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
fs.mkdirSync(OUT, { recursive: true })
async function clickText(page, t, within) {
  try {
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
    await el.click(); return true
  } catch { return false }
}
const status = (p) => p.evaluate(() => document.querySelector('[data-testid="vault-grid-status"]')?.textContent.replace(/\s+/g,' ').trim() || 'NONE').catch(()=>'NONE')
const topbar = (p) => p.evaluate(() => document.querySelector('[data-testid="vault-grid-topbar"]')?.textContent.replace(/\s+/g,' ').trim() || 'NONE').catch(()=>'NONE')
const hud = (p) => p.evaluate(() => document.querySelector('[data-testid="vault-grid-hud-inner"]')?.textContent.replace(/\s+/g,' ').trim() || 'NONE').catch(()=>'NONE')
const opened = async (p) => { const m = (await status(p)).match(/OPEN (\d+) of/); return m ? +m[1] : -1 }
async function boardBox(p) { return p.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } }).catch(()=>null) }
async function tapCell(p, box, col, row, cols) { await p.mouse.click(box.x + box.w * ((col+0.5)/cols), box.y + box.h * ((row+0.5)/cols)) }
async function freshBet(p, world) {
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' }); await wait(1200)
  if (world && world !== 'bluechips') { await clickText(p, world); await wait(400) }
  await clickText(p, 'send it', '[data-testid="vault-ctl-cta"]') || await clickText(p, 'send it')
  await wait(900)
}
const shot = async (p, name) => { await p.screenshot({ path: `${OUT}/${name}.png` }); console.log('  shot', name) }
const isRug = async (p) => /RUGGED|BUST/i.test(await topbar(p)) || /RUGGED|BUST/i.test(await status(p))

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
p.on('pageerror', (e) => console.log('PAGEERROR', e.message))
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch(e){} })

// ---- retry bluechips until chain reaches 5 (CLEAN TEMPO) ----
console.log('== CHASE CLEAN TEMPO (peak) ==')
let gotPeak = false
for (let attempt = 1; attempt <= 8 && !gotPeak; attempt++) {
  await freshBet(p, 'bluechips')
  const box = await boardBox(p); if (!box) continue
  const cols = 5
  const order = [[0,0],[1,0],[2,0],[3,0],[4,0],[0,1],[1,1]]
  let prevOpen = await opened(p), chain = 0
  for (const [c,r] of order) {
    if (await isRug(p)) break
    await tapCell(p, box, c, r, cols)
    let t=0, reg=false
    while (t<1150) { await wait(80); t+=80; const o=await opened(p); if (o>prevOpen){prevOpen=o;reg=true;break} }
    if (await isRug(p)) { console.log(`  attempt${attempt}: rugged at chain ${chain}`); break }
    if (reg) { chain++; if (chain>=3) await shot(p, `attempt${attempt}-chain${chain}`); console.log(`  attempt${attempt} chain${chain} hud=${await hud(p)}`) }
    if (chain>=5) { gotPeak=true; await shot(p, `PEAK-cleantempo`); break }
  }
  if (gotPeak) { await clickText(p,'take profit'); await wait(1500); await shot(p,'PEAK-settled') }
}
console.log('  gotPeak:', gotPeak)

// ---- shitcoin loss ----
console.log('== LOSS shitcoin ==')
let rugged = false
for (let attempt=1; attempt<=3 && !rugged; attempt++) {
  await freshBet(p, 'shitcoin')
  const box = await boardBox(p); if (!box) continue
  const cols=7
  for (let i=0;i<49;i++){
    if (await isRug(p)) { rugged=true; break }
    await tapCell(p, box, i%cols, Math.floor(i/cols)%cols, cols)
    await wait(340)
    if (await isRug(p)) { rugged=true; break }
  }
}
await wait(500); await shot(p, 'loss-settled-early'); await wait(1400); await shot(p, 'loss-settled')
console.log('  rugged:', rugged, '| topbar:', await topbar(p))
console.log('  === LOSS BODY ===\n' + await p.evaluate(()=>document.body.innerText.replace(/\n{2,}/g,'\n').slice(0,1200)).catch(()=>'ERR'))
await b.close(); console.log('DONE')
