import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5390'
const OUT = 'shots-grindqa-rhythm-0707'
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
const statusTxt = (p) => p.evaluate(() => document.querySelector('[data-testid="vault-grid-status"]')?.textContent.replace(/\s+/g,' ').trim() || 'NONE')
const hudTxt = (p) => p.evaluate(() => document.querySelector('[data-testid="vault-grid-hud-inner"]')?.textContent.replace(/\s+/g,' ').trim() || 'NONE')
function openCount(txt) { const m = /OPEN (\d+) of/.exec(txt); return m ? parseInt(m[1], 10) : -1 }
async function boardBox(p) { return p.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } }) }
async function clearAndGo(p) {
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch(e){} })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' }); await wait(1000)
}
async function tapCell(p, box, col, row, cols) { await p.mouse.click(box.x + box.w * ((col+0.5)/cols), box.y + box.h * ((row+0.5)/cols)) }
async function rhythmBadge(p) {
  return p.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-rhythm-badge"]')
    return el ? { present: true, text: (el.textContent||'').trim(), visible: el.offsetParent !== null, bg: getComputedStyle(el).background.slice(0,60) } : { present: false }
  })
}

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
p.on('pageerror', (e) => console.log('PAGEERROR', e.message))

await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })

// Use SHITCOIN mode (7x7, 24 mines is too hard) -- actually use ALTSEASON (5x5, 5 mines) or
// stick with BLUECHIPS default (5x5, 3 mines, 22 safe tiles) -- best survival odds.
let badgeSeen = { rhythm: false, perfect: false }
const cells = [[0,0],[1,0],[2,0],[3,0],[4,0],[0,1],[1,1],[2,1],[3,1],[4,1],[0,2],[1,2],[2,2],[3,2],[4,2],[0,3],[1,3],[2,3],[3,3],[4,3],[0,4],[1,4],[2,4],[3,4],[4,4]]

for (let attempt = 0; attempt < 15 && !(badgeSeen.rhythm && badgeSeen.perfect); attempt++) {
  await clearAndGo(p)
  await clickText(p, 'send it', '[data-testid="vault-ctl-cta"]')
  await wait(900)
  const box = await boardBox(p)
  if (!box) { console.log(`attempt ${attempt}: no board box`); continue }
  let lastOpen = 0
  let cellIdx = 0
  let rugged = false
  const perStepLog = []
  for (let step = 0; step < 8 && !rugged; step++) {
    const [c, r] = cells[cellIdx++]
    await tapCell(p, box, c, r, 5)
    // poll quickly for the open-count to increment or for RUGGED
    let newOpen = lastOpen
    let ruggedNow = false
    for (let poll = 0; poll < 20; poll++) {
      await wait(60)
      const tb = await topbar(p)
      if (/RUGGED|SETTLED/i.test(tb)) { ruggedNow = true; break }
      const st = await statusTxt(p)
      const oc = openCount(st)
      if (oc > lastOpen) { newOpen = oc; break }
    }
    if (ruggedNow) { rugged = true; break }
    if (newOpen === lastOpen) { perStepLog.push(`step${step}: no new reveal (stuck at ${lastOpen})`); continue }
    lastOpen = newOpen
    const rb = await rhythmBadge(p)
    const hud = await hudTxt(p)
    perStepLog.push(`step${step} open=${newOpen} hud=${hud} badge=${JSON.stringify(rb)}`)
    if (rb.present) {
      if (/CLEAN TEMPO/i.test(rb.text)) badgeSeen.perfect = true
      if (/IN RHYTHM/i.test(rb.text)) badgeSeen.rhythm = true
      await p.screenshot({ path: `${OUT}/attempt${attempt}-step${step}-badge-${rb.text.replace(/\s+/g,'')}.png` })
    }
  }
  console.log(`--- attempt ${attempt} (rugged=${rugged}) ---`)
  perStepLog.forEach((l) => console.log('  ' + l))
}
console.log('\nFINAL badgeSeen:', JSON.stringify(badgeSeen))
await b.close()
