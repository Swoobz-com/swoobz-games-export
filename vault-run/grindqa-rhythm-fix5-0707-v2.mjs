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
async function tapCell(p, box, col, row, cols, frac = 0.5) {
  await p.mouse.click(box.x + box.w * ((col + frac) / cols), box.y + box.h * ((row + frac) / cols))
}
async function rhythmBadge(p) {
  return p.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-rhythm-badge"]')
    return el ? { present: true, tier: el.getAttribute('data-tier'), text: (el.textContent||'').trim(), visible: el.offsetParent !== null } : { present: false }
  })
}

// Interior-only cell order (avoids the outer ring — v1 run showed the
// rightmost-of-row0 / leftmost-of-row1 raster-edge cells silently failing
// to register a reveal on the 5x5 boards, breaking the rhythm cadence).
function interiorCells(n) {
  const out = []
  for (let r = 1; r < n - 1; r++) for (let c = 1; c < n - 1; c++) out.push([c, r])
  return out
}

const WORLDS = [
  { mode: 'bluechips', cols: 5, cells: interiorCells(5), maxAttempts: 25 },
  { mode: 'altseason', cols: 5, cells: interiorCells(5), maxAttempts: 35 },
]

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
p.on('pageerror', (e) => console.log('PAGEERROR', e.message))
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })

const summary = {}

for (const w of WORLDS) {
  console.log(`\n========== WORLD (v2, interior cells): ${w.mode} ==========`)
  let badgeSeen = { rhythm: false, perfect: false, rhythmShot: null, perfectShot: null }
  const startTime = Date.now()
  for (let attempt = 0; attempt < w.maxAttempts && !(badgeSeen.rhythm && badgeSeen.perfect); attempt++) {
    await clearAndGo(p)
    if (w.mode !== 'bluechips') {
      const ok = await clickText(p, w.mode)
      if (!ok) console.log(`  [world-select] click on "${w.mode}" FAILED at attempt ${attempt}`)
      await wait(150)
    }
    await clickText(p, 'send it', '[data-testid="vault-ctl-cta"]')
    await wait(900)
    let box = await boardBox(p)
    if (!box) { console.log(`attempt ${attempt}: no board box`); continue }
    let lastOpen = 0
    let cellIdx = 0
    let rugged = false
    const perStepLog = []
    for (let step = 0; step < 8 && !rugged; step++) {
      const [c, r] = w.cells[cellIdx++]
      box = await boardBox(p) // re-measure fresh each tap, cheap insurance
      await tapCell(p, box, c, r, w.cols)
      let newOpen = lastOpen
      let ruggedNow = false
      let gotIt = false
      for (let poll = 0; poll < 12; poll++) {
        await wait(40)
        const tb = await topbar(p)
        if (/RUGGED|SETTLED/i.test(tb)) { ruggedNow = true; break }
        const st = await statusTxt(p)
        const oc = openCount(st)
        if (oc > lastOpen) { newOpen = oc; gotIt = true; break }
      }
      if (!gotIt && !ruggedNow) {
        // one fast retry with a jitter offset before giving up on this cell
        await tapCell(p, box, c, r, w.cols, 0.3)
        for (let poll = 0; poll < 10; poll++) {
          await wait(40)
          const tb = await topbar(p)
          if (/RUGGED|SETTLED/i.test(tb)) { ruggedNow = true; break }
          const st = await statusTxt(p)
          const oc = openCount(st)
          if (oc > lastOpen) { newOpen = oc; gotIt = true; break }
        }
      }
      if (ruggedNow) { rugged = true; break }
      if (!gotIt) { perStepLog.push(`step${step}: no new reveal (stuck at ${lastOpen}) cell=(${c},${r})`); continue }
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
    if (attempt % 5 === 0 || (badgeSeen.rhythm && badgeSeen.perfect)) {
      console.log(`--- ${w.mode} attempt ${attempt} (rugged=${rugged}) elapsed=${((Date.now()-startTime)/1000).toFixed(1)}s ---`)
      perStepLog.forEach((l) => console.log('  ' + l))
    }
  }
  console.log(`\nWORLD ${w.mode} (v2) FINAL:`, JSON.stringify(badgeSeen))
  summary[w.mode] = badgeSeen
}

fs.writeFileSync(`${OUT}/summary-v2.json`, JSON.stringify(summary, null, 2))
console.log('\n\n===== V2 SUMMARY (bluechips+altseason retry) =====')
console.log(JSON.stringify(summary, null, 2))
await b.close()
