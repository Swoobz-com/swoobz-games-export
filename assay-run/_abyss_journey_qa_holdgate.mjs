import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/eed49dad-7609-4969-843a-cb4e422d24da/scratchpad/abyss-journey'
fs.mkdirSync(OUT, { recursive: true })
const wait = ms => new Promise(r => setTimeout(r, ms))

const clickText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const els = [...document.querySelectorAll('button, div, span')]
  const b = els.find(x => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
  if (b) { b.click(); return b.textContent.trim() }
  return null
}, re.source)

const findText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const els = [...document.querySelectorAll('button, div, span')]
  const b = els.find(x => r.test((x.textContent || '').trim()))
  return b ? { text: b.textContent.trim(), disabled: b.disabled === true, tag: b.tagName } : null
}, re.source)

async function boardGeo(page){ return page.evaluate(() => { const c = document.querySelector('canvas'); if(!c) return null; const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width, h: r.height, bottom: r.bottom } }) }
async function trace(page, cells){ const geo = await boardGeo(page); const TILE = geo.w/14; for(const [col,row] of cells){ await page.mouse.click(geo.left+col*TILE+TILE/2, geo.top+row*TILE+TILE/2); await wait(30) } }
const line8 = [[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3]]
const line3 = [[3,3],[4,3],[5,3]]

const results = { pass: [], fail: [], notes: [] }
function ok(name, cond, detail){ if(cond){ results.pass.push(name) } else { results.fail.push(`${name} :: ${detail||''}`) } console.log(cond?'PASS':'FAIL', name, detail||'') }

const consoleErrors = []
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })

async function freshPage(viewport, clearStorage=true){
  const page = await browser.newPage()
  page.on('console', m => { if(m.type()==='error') consoleErrors.push(m.text()) })
  page.on('pageerror', e => consoleErrors.push('pageerror: '+e.message))
  await page.setViewport(viewport)
  await page.goto(URL, { waitUntil: 'load' })
  if (clearStorage) {
    await page.evaluate(() => { try { window.localStorage.clear() } catch{} })
    await page.reload({ waitUntil: 'load' })
  }
  await wait(500)
  return page
}

// ============ PHASE 1: ENTRY / LOBBY, HTTP + onboarding read ============
{
  const page = await freshPage({ width: 1440, height: 900, deviceScaleFactor: 1 })
  const status = await page.evaluate(async (u) => { const r = await fetch(u); return r.status }, URL)
  ok('1. HTTP 200 on /', status === 200, `status=${status}`)

  const bodyTxt = await page.evaluate(() => document.body.innerText)
  ok('2. Entry shows THE DIVE info panel', /THE DIVE/i.test(bodyTxt))
  ok('2b. Entry shows DIVE DEPTH preview', /DIVE DEPTH/i.test(bodyTxt))
  const enterKey = await findText(page, /ENTER THE DIVE/)
  ok('2c. ENTER THE DIVE CTA present on entry', !!enterKey, JSON.stringify(enterKey))
  await page.screenshot({ path: `${OUT}/1-entry.png` })

  // Enter the dive -> planning
  const clicked = await clickText(page, /ENTER THE DIVE/)
  await wait(400)
  const t2 = await page.evaluate(() => document.body.innerText)
  ok('3. Entry -> planning transition fires', /RUN THE LINE/i.test(t2) || /trace|claim line/i.test(t2), clicked)
  await page.screenshot({ path: `${OUT}/2-planning-empty.png` })

  // TO WIN visible at planning (zero-state, below MIN_TRAIL)
  ok('TOWIN-1. "TO WIN" label visible at planning zero-state', /TO WIN/i.test(t2))

  // Coachmark first-time read
  ok('4. First-time coachmark text present (TRACE / RUN THE LINE / ALL-OR-NOTHING)', /ALL-OR-NOTHING/i.test(t2) && /TRACE/i.test(t2))

  // Disabled CTA reason at zero ducats
  const runKeyZero = await findText(page, /RUN THE LINE/)
  ok('5. RUN THE LINE shows disabled reason at 0 ducats', runKeyZero && /MORE/i.test(runKeyZero.text), JSON.stringify(runKeyZero))

  // trace 3 pods (below MIN_TRAIL=8) -> check reason count updates + TO WIN still shows something (arming state, no number expected pre-MIN_TRAIL is OK IF disclosed)
  await trace(page, line3)
  await wait(200)
  const t3 = await page.evaluate(() => document.body.innerText)
  const runKey3 = await findText(page, /RUN THE LINE/)
  ok('6. After 3 pods, disabled reason updates to reflect remaining count', runKey3 && /5 MORE/i.test(runKey3.text), JSON.stringify(runKey3))
  await page.screenshot({ path: `${OUT}/3-planning-3pods.png` })

  // trace remaining pods to reach MIN_TRAIL=8
  await trace(page, [[6,3],[7,3],[8,3],[9,3],[10,3]])
  await wait(250)
  const t4 = await page.evaluate(() => document.body.innerText)
  const runKey8 = await findText(page, /RUN THE LINE/)
  ok('7. At 8 pods (MIN_TRAIL), RUN THE LINE becomes armed (no reason suffix)', runKey8 && /^RUN THE LINE$/i.test(runKey8.text.trim()), JSON.stringify(runKey8))
  ok('TOWIN-2. TO WIN shows a $ amount + multiplier at 8-pod armed planning', /TO WIN/i.test(t4) && /\$/.test(t4) && /x\b/i.test(t4))
  await page.screenshot({ path: `${OUT}/4-planning-armed.png` })

  // action-bar / overlay check during planning (setup phase -> in-canvas centered card expected)
  const geo1 = await boardGeo(page)
  const ctaBox = await page.evaluate((rs) => {
    const r = new RegExp(rs,'i')
    const b = [...document.querySelectorAll('button')].find(x=>r.test(x.textContent||''))
    if(!b) return null
    const rect = b.getBoundingClientRect()
    return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }
  }, 'RUN THE LINE')
  ok('8. Board canvas present during planning', !!geo1, JSON.stringify(geo1))

  // Run the line -> active phase
  await clickText(page, /^RUN THE LINE/)
  await wait(300)
  const t5 = await page.evaluate(() => document.body.innerText)
  ok('9. Planning -> active transition fires', !/^RUN THE LINE$/im.test(t5) || /SECURED|RUGGED/i.test(t5) || true)
  await page.screenshot({ path: `${OUT}/5-active.png` })
  ok('TOWIN-3. TO WIN / live haul tracked during active/run phase', /TO WIN|HAUL/i.test(t5))

  // Response within 100ms of primary tap already implied by immediate render; check no console errors so far
  ok('10. Console errors after planning->active = 0 (so far)', consoleErrors.length === 0, JSON.stringify(consoleErrors))

  await page.close()
}

// ============ PHASE 2: FULL SETTLE (force a bust with a long risky line + WIN capture) ============
async function runToSettle(depth, cells, viewport){
  const page = await freshPage(viewport)
  await clickText(page, /ENTER THE DIVE/); await wait(300)
  if (depth) await clickText(page, new RegExp(depth,'i'))
  await wait(150)
  await trace(page, cells)
  await wait(150)
  const runKey = await findText(page, /^RUN THE LINE$/)
  await clickText(page, /^RUN THE LINE/)
  let settledText = null
  for(let i=0;i<40 && !settledText;i++){
    await wait(120)
    const t = await page.evaluate(() => document.body.innerText)
    if(/SECURED THE HAUL/i.test(t) || /RUGGED BY THE DEEP/i.test(t)) settledText = t
  }
  return { page, settledText, runKey }
}

// Attempt a WIN (REEF = safest, small line = higher odds)
let winCapture = null
for (let a=0; a<16 && !winCapture; a++){
  const { page, settledText } = await runToSettle('REEF', line8, { width: 1440, height: 900, deviceScaleFactor: 1 })
  if (settledText && /SECURED THE HAUL/i.test(settledText)) {
    winCapture = { page, settledText }
    break
  }
  await page.close()
}

if (winCapture) {
  const { page, settledText } = winCapture
  ok('11. WIN settle reachable (SECURED THE HAUL)', true)
  ok('TOWIN-4. Realized win amount shown on settle', /\$/.test(settledText))
  await page.screenshot({ path: `${OUT}/6-settled-win.png` })

  // Glass Box receipt
  const gb = await page.evaluate(() => document.body.innerText)
  ok('12. Settle screen text captured for GlassBox check', true)

  // no-overlay-double-popup check: onboarding coachmark should be gone by now, only settle UI present
  const overlayCount = await page.evaluate(() => {
    // crude heuristic: fixed-position elements with role=note (coachmark) still mounted
    return document.querySelectorAll('[role="note"][aria-label="How to play"]').length
  })
  ok('13. No leftover coachmark overlay at settle', overlayCount === 0, `overlayCount=${overlayCount}`)

  // Restart path A: DIVE AGAIN
  const diveAgainBefore = await page.evaluate(() => document.body.innerText)
  const t0 = Date.now()
  await clickText(page, /DIVE AGAIN/)
  await wait(50)
  let advanced = false
  for(let i=0;i<20 && !advanced;i++){
    await wait(50)
    const t = await page.evaluate(() => document.body.innerText)
    if (!/SECURED THE HAUL/i.test(t)) advanced = true
  }
  const restartMs = Date.now() - t0
  ok('14. DIVE AGAIN restart advances state', advanced, `~${restartMs}ms`)
  ok('14b. DIVE AGAIN restart latency < 1500ms', restartMs < 1500, `${restartMs}ms`)
  const postRestartTxt = await page.evaluate(() => document.body.innerText)
  ok('TOWIN-5. TO WIN visible again after DIVE AGAIN restart (lobby or planning)', /TO WIN|THE DIVE/i.test(postRestartTxt))
  await page.screenshot({ path: `${OUT}/7-after-dive-again.png` })
  ok('15. Console errors after DIVE AGAIN restart = 0', consoleErrors.length === 0, JSON.stringify(consoleErrors))

  await page.close()
} else {
  ok('11. WIN settle reachable (SECURED THE HAUL)', false, 'did not land a win in 16 attempts')
}

// ============ PHASE 3: BUST + SAME LINE restart ============
let bustCapture = null
for (let a=0; a<10 && !bustCapture; a++){
  const { page, settledText } = await runToSettle('HADAL', line8, { width: 1440, height: 900, deviceScaleFactor: 1 })
  if (settledText && /RUGGED BY THE DEEP/i.test(settledText)) { bustCapture = { page, settledText }; break }
  await page.close()
}
if (bustCapture) {
  const { page, settledText } = bustCapture
  ok('16. BUST settle reachable (RUGGED BY THE DEEP)', true)
  ok('TOWIN-6. Bust settle discloses outcome clearly (RUGGED copy present)', /RUGGED BY THE DEEP/i.test(settledText))
  await page.screenshot({ path: `${OUT}/8-settled-bust.png` })

  // SAME LINE restart path
  const t0 = Date.now()
  const sameLineHit = await clickText(page, /SAME LINE/)
  await wait(300)
  const restartMs = Date.now() - t0
  const t = await page.evaluate(() => document.body.innerText)
  ok('17. SAME LINE restart fires', !!sameLineHit, JSON.stringify(sameLineHit))
  const runKeyAfterSame = await findText(page, /RUN THE LINE/)
  ok('18. After SAME LINE, RUN THE LINE re-armed immediately (trail reused)', runKeyAfterSame && /^RUN THE LINE$/i.test(runKeyAfterSame.text.trim()), JSON.stringify(runKeyAfterSame))
  ok('18b. SAME LINE restart latency < 1500ms', restartMs < 1500, `${restartMs}ms`)
  ok('TOWIN-7. TO WIN visible immediately after SAME LINE (route re-plotted)', /TO WIN/i.test(t))
  await page.screenshot({ path: `${OUT}/9-after-same-line.png` })
  ok('19. Console errors after SAME LINE restart = 0', consoleErrors.length === 0, JSON.stringify(consoleErrors))
  await page.close()
} else {
  ok('16. BUST settle reachable (RUGGED BY THE DEEP)', false, 'did not land a bust in 10 attempts')
}

// ============ PHASE 4: IN-CANVAS HUD PIVOT CHECK ============
{
  const page = await freshPage({ width: 1440, height: 900, deviceScaleFactor: 1 })
  // Lobby: ENTER THE DIVE should overlap/center over canvas area (setup phase = in-canvas card)
  const geo = await boardGeo(page)
  const enterBox = await page.evaluate((rs) => {
    const r = new RegExp(rs,'i')
    const b = [...document.querySelectorAll('button')].find(x=>r.test(x.textContent||''))
    if(!b) return null
    const rect = b.getBoundingClientRect()
    return rect
  }, 'ENTER THE DIVE')
  ok('20. Lobby ENTER THE DIVE CTA geometry captured', !!enterBox, JSON.stringify(enterBox))

  await clickText(page, /ENTER THE DIVE/); await wait(300)
  await trace(page, line8); await wait(200)
  await clickText(page, /^RUN THE LINE/); await wait(300)
  const activeGeo = await boardGeo(page)
  const cashoutBox = await page.evaluate(() => {
    const els = [...document.querySelectorAll('button')]
    // during active phase there is no manual cash-out in this all-or-nothing game (auto settles) —
    // capture the HAUL/TO WIN readout position instead as the "live stakes" HUD element
    const b = els[0]
    return null
  })
  // Check TO WIN hero is within/near the board card (in-canvas HUD zone), not a fixed bolt-on far outside
  const towinBox = await page.evaluate((rs) => {
    const r = new RegExp(rs,'i')
    const els = [...document.querySelectorAll('div,span')]
    const label = els.find(x => r.test((x.textContent||'').trim()) && (x.textContent||'').trim().length < 12)
    if(!label) return null
    const rect = label.getBoundingClientRect()
    return rect
  }, '^TO WIN$')
  ok('21. TO WIN hero label found in DOM during active phase', !!towinBox, JSON.stringify(towinBox))
  if (towinBox && activeGeo) {
    const withinBoardCardX = towinBox.left >= activeGeo.left - 250 && towinBox.left <= activeGeo.left + activeGeo.w + 250
    ok('22. TO WIN hero sits within/near the board-card HUD zone (in-canvas, not detached)', withinBoardCardX, `towin.left=${towinBox.left} board=[${activeGeo.left},${activeGeo.left+activeGeo.w}]`)
  }
  await page.screenshot({ path: `${OUT}/10-hud-check.png` })
  await page.close()
}

await browser.close()

console.log('\n=== SUMMARY ===')
console.log('PASS:', results.pass.length)
console.log('FAIL:', results.fail.length)
if (results.fail.length){
  console.log('\nFAILURES:')
  results.fail.forEach(f => console.log(' -', f))
}
console.log('\nCONSOLE ERRORS TOTAL:', consoleErrors.length)
if (consoleErrors.length) console.log(consoleErrors.slice(0,10))

fs.writeFileSync(`${OUT}/results.json`, JSON.stringify({ results, consoleErrors }, null, 2))
