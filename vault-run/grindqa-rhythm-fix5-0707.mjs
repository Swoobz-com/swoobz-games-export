import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5287'
const OUT = 'shots-grindqa-fix5-rhythm-0707'
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
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' }); await wait(700)
}
async function tapCell(p, box, col, row, cols) { await p.mouse.click(box.x + box.w * ((col+0.5)/cols), box.y + box.h * ((row+0.5)/cols)) }
async function rhythmBadge(p) {
  return p.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-rhythm-badge"]')
    return el ? { present: true, tier: el.getAttribute('data-tier'), text: (el.textContent||'').trim(), visible: el.offsetParent !== null } : { present: false }
  })
}
async function selectWorld(p, mode) {
  await clickText(p, mode === 'bluechips' ? 'bluechips' : mode === 'altseason' ? 'altseason' : 'shitcoin')
}

const WORLDS = [
  { mode: 'bluechips', cols: 5, cells: gridCells(5), maxAttempts: 20 },
  { mode: 'altseason', cols: 5, cells: gridCells(5), maxAttempts: 30 },
  { mode: 'shitcoin', cols: 7, cells: gridCells(7), maxAttempts: 150 },
]
function gridCells(n) { const out = []; for (let r=0;r<n;r++) for (let c=0;c<n;c++) out.push([c,r]); return out }

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
p.on('pageerror', (e) => console.log('PAGEERROR', e.message))
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })

const summary = {}

for (const w of WORLDS) {
  console.log(`\n========== WORLD: ${w.mode} ==========`)
  let badgeSeen = { rhythm: false, perfect: false, rhythmShot: null, perfectShot: null, sawIncorrectJumpToPeakAtChain3: false }
  const startTime = Date.now()
  for (let attempt = 0; attempt < w.maxAttempts && !(badgeSeen.rhythm && badgeSeen.perfect); attempt++) {
    await clearAndGo(p)
    // select world (bet-entry phase, world picker visible by default)
    if (w.mode !== 'bluechips') {
      const ok = await clickText(p, w.mode)
      if (!ok) console.log(`  [world-select] click on "${w.mode}" FAILED at attempt ${attempt}`)
      await wait(150)
    }
    await clickText(p, 'send it', '[data-testid="vault-ctl-cta"]')
    await wait(900)
    const box = await boardBox(p)
    if (!box) { console.log(`attempt ${attempt}: no board box`); continue }
    let lastOpen = 0
    let cellIdx = 0
    let rugged = false
    const perStepLog = []
    for (let step = 0; step < 8 && !rugged; step++) {
      const [c, r] = w.cells[cellIdx++]
      await tapCell(p, box, c, r, w.cols)
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
        if (rb.tier === 'perfect') {
          badgeSeen.perfect = true
          if (!badgeSeen.perfectShot) {
            const fp = `${OUT}/${w.mode}-CLEAN-TEMPO-chain-open${newOpen}.png`
            await p.screenshot({ path: fp })
            badgeSeen.perfectShot = fp
          }
          // Regression check: did the FIRST-ever badge for this attempt jump
          // straight to 'perfect' while open (chain) is still <5 reveals in
          // (i.e. reveal index newOpen < 5, chain should have been 3 or 4
          // showing 'rhythm' first)? We track via lastOpen history below.
          if (newOpen < 5 && !badgeSeen.rhythm) {
            badgeSeen.sawIncorrectJumpToPeakAtChain3 = true
          }
        }
        if (rb.tier === 'rhythm') {
          badgeSeen.rhythm = true
          if (!badgeSeen.rhythmShot) {
            const fp = `${OUT}/${w.mode}-IN-RHYTHM-chain-open${newOpen}.png`
            await p.screenshot({ path: fp })
            badgeSeen.rhythmShot = fp
          }
        }
      }
    }
    if (attempt % 10 === 0 || rugged === false) {
      console.log(`--- ${w.mode} attempt ${attempt} (rugged=${rugged}) elapsed=${((Date.now()-startTime)/1000).toFixed(1)}s ---`)
      perStepLog.forEach((l) => console.log('  ' + l))
    }
  }
  console.log(`\nWORLD ${w.mode} FINAL:`, JSON.stringify(badgeSeen))
  summary[w.mode] = badgeSeen
}

fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify(summary, null, 2))
console.log('\n\n===== FULL SUMMARY =====')
console.log(JSON.stringify(summary, null, 2))
await b.close()
