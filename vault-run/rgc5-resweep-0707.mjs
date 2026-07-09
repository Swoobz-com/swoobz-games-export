// rgc5-resweep-0707.mjs — FULL FRESH RG-C5 re-sweep after 7 fixes landed.
// Focus: FIX #5 rhythm badge (chain-based tier), cross-checked on all 3
// worlds; reset-per-round proof; AutopickSafetySurface reachability;
// keyboard-nav vs click parity; mobile HUD safety-info visibility;
// settled-screen shrink RG-relevant element visibility.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5282'
const OUT = process.argv[3] || 'shots-rgc5-resweep-0707'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return (
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) ||
      null
    )
  }, t)
  const el = h.asElement()
  if (!el) return false
  try { await el.click() } catch { return false }
  return true
}
async function dismiss(page) { await clickText(page, 'got it'); await clickText(page, 'skip'); await wait(200) }

async function loadFresh(page, v) {
  await page.setViewport({ width: v.w, height: v.h, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(500)
  await dismiss(page)
}

function cellSeqFor(gridSize) {
  const seq = []
  for (let cy = 0; cy < gridSize; cy++) for (let cx = 0; cx < gridSize; cx++) seq.push([cx, cy])
  return seq
}

async function boardBox(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
}

// Rapid-tap a world's grid, capturing rhythm-badge observations per tap.
// Returns array of {tapIdx, badge, badgeRect, badgeBg} plus whether settled.
async function rhythmProbe(page, world, gridSize, maxTaps) {
  await clickText(page, world)
  await wait(200)
  await clickText(page, 'send it')
  await wait(1000)
  const seq = cellSeqFor(gridSize)
  const observations = []
  for (let i = 0; i < Math.min(maxTaps, seq.length); i++) {
    const settledNow = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]'))
    if (settledNow) { observations.push({ tapIdx: i, settled: true }); break }
    const box = await boardBox(page)
    if (!box) break
    const [cx, cy] = seq[i]
    const fx = 0.06 + ((cx + 0.5) / gridSize) * 0.88
    const fy = 0.08 + ((cy + 0.5) / gridSize) * 0.8
    await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
    await wait(90) // fast tap, inside RHYTHM_WINDOW_MS=1400ms
    const info = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="vault-rhythm-badge"]')
      if (!el) return { badge: null }
      const r = el.getBoundingClientRect()
      return {
        badge: el.textContent,
        tier: el.getAttribute('data-tier'),
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        bg: getComputedStyle(el).background,
        boxShadow: getComputedStyle(el).boxShadow,
        animation: getComputedStyle(el).animationName,
      }
    })
    observations.push({ tapIdx: i, ...info })
  }
  return observations
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  const page = await browser.newPage()
  const consoleErrors = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message))

  const results = {}

  // ── A. Rhythm-badge reachability + tier fidelity across all 3 worlds ────
  const worlds = [
    { name: 'bluechips', gridSize: 5, maxTaps: 20 },
    { name: 'altseason', gridSize: 5, maxTaps: 20 },
    { name: 'shitcoin', gridSize: 7, maxTaps: 30 },
  ]
  results.worldRhythm = {}
  for (const w of worlds) {
    await loadFresh(page, { w: 1440, h: 900 })
    results.worldRhythm[w.name] = await rhythmProbe(page, w.name, w.gridSize, w.maxTaps)
  }

  // ── B. Reset-per-round proof: play BLUECHIPS to 'perfect' tier (chain>=5)
  // in round 1, capture its rect/bg/animation; settle (loss or win); start a
  // FRESH round 2; confirm round-2's FIRST 4 taps show the SAME progression
  // (badge null until chain 3, 'rhythm' at chain 3-4) -- i.e. no carryover
  // acceleration from round 1's session history. ---------------------------
  await loadFresh(page, { w: 1440, h: 900 })
  const round1 = await rhythmProbe(page, 'bluechips', 5, 20)
  const round1Perfect = round1.find((o) => o.tier === 'perfect')
  // force settle if not already
  let settled = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]'))
  if (!settled) {
    const took = await clickText(page, 'take profit')
    await wait(900)
  }
  await wait(300)
  // Start round 2 fresh (same tab, session/localStorage NOT cleared -> tests
  // real session carryover, the actual regulatory-relevant scenario)
  await clickText(page, 'bet again')
  await wait(500)
  const round2 = await rhythmProbe(page, 'bluechips', 5, 20)
  const round2Perfect = round2.find((o) => o.tier === 'perfect')
  results.resetProof = {
    round1FirstBadgeAtTap: round1.findIndex((o) => o.badge),
    round2FirstBadgeAtTap: round2.findIndex((o) => o.badge),
    round1PerfectRect: round1Perfect ? round1Perfect.rect : null,
    round2PerfectRect: round2Perfect ? round2Perfect.rect : null,
    round1PerfectBg: round1Perfect ? round1Perfect.bg : null,
    round2PerfectBg: round2Perfect ? round2Perfect.bg : null,
    round1PerfectAnim: round1Perfect ? round1Perfect.animation : null,
    round2PerfectAnim: round2Perfect ? round2Perfect.animation : null,
    identicalVisualEnvelope: round1Perfect && round2Perfect
      ? (round1Perfect.bg === round2Perfect.bg && round1Perfect.boxShadow === round2Perfect.boxShadow && round1Perfect.rect.w === round2Perfect.rect.w && round1Perfect.rect.h === round2Perfect.rect.h)
      : 'one-or-both-missing',
  }

  // ── C. Keyboard-nav parity: focus grid, use arrow+Enter to reveal a tile,
  // confirm identical activation to a click (single reveal), and confirm
  // OS key-repeat (holding Enter) does not accelerate/duplicate reveals. ──
  await loadFresh(page, { w: 1440, h: 900 })
  await clickText(page, 'bluechips')
  await wait(200)
  await clickText(page, 'send it')
  await wait(1000)
  await page.evaluate(() => { document.querySelector('canvas')?.focus() })
  const revealedBefore = await page.evaluate(() => document.querySelectorAll('[data-testid="vault-grid-status"]')[0]?.textContent || null)
  await page.keyboard.down('Enter')
  await wait(1600) // long hold -> real OS key-repeat should fire multiple keydowns
  await page.keyboard.up('Enter')
  await wait(300)
  const revealedAfter = await page.evaluate(() => document.querySelectorAll('[data-testid="vault-grid-status"]')[0]?.textContent || null)
  results.keyboardHoldProbe = { revealedBefore, revealedAfter, settledAfterHold: await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]')) }

  // ── D. AutopickSafetySurface reachability (carried-forward known item) ──
  await loadFresh(page, { w: 1440, h: 900 })
  results.autopick = await page.evaluate(() => {
    const hasLabel = document.body.innerText.includes('AUTO-PICK')
    const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').toLowerCase().includes('enable auto-pick'))
    return { hasAutopickLabel: hasLabel, buttonPresent: !!btn }
  })

  // ── E. Mobile HUD + safety-relevant info reachability ───────────────────
  await loadFresh(page, { w: 412, h: 915 })
  results.mobileBetEntry = await page.evaluate(() => ({
    sessionMetaPresent: document.body.innerText.includes('ROUND') || !!document.querySelector('[data-testid="vault-session-meta"]'),
    bodyTextSample: document.body.innerText.slice(0, 400),
  }))
  await page.screenshot({ path: `${OUT}/mobile-betentry.png` })
  // Drive to settled (loss) on mobile, check RG-relevant elements visible.
  await clickText(page, 'bluechips')
  await wait(200)
  await clickText(page, 'send it')
  await wait(1000)
  // tap tiles until mine hit (no take-profit)
  for (let i = 0; i < 25; i++) {
    const settledNow = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]'))
    if (settledNow) break
    const box = await boardBox(page)
    if (!box) break
    const seq = cellSeqFor(5)
    const [cx, cy] = seq[i % seq.length]
    const fx = 0.06 + ((cx + 0.5) / 5) * 0.88
    const fy = 0.08 + ((cy + 0.5) / 5) * 0.8
    await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
    await wait(400)
  }
  await wait(700)
  results.mobileSettled = await page.evaluate(() => {
    const sessionMeta = document.querySelector('[data-testid="vault-session-meta"]')
    const glassBox = document.body.innerText.toLowerCase().includes('verified') || document.body.innerText.toLowerCase().includes('glass box')
    return {
      sessionMetaPresent: !!sessionMeta || document.body.innerText.toUpperCase().includes('ROUND'),
      glassBoxTextPresent: glassBox,
      bodyTextSample: document.body.innerText.slice(0, 600),
    }
  })
  await page.screenshot({ path: `${OUT}/mobile-settled.png` })

  // ── F. Copy register scan (whole visible settled surface) ───────────────
  results.copyRegisterScan = await page.evaluate(() => {
    const txt = document.body.innerText
    const hits = []
    const patterns = [/almost/i, /so close/i, /lucky you/i, /you will win/i, /guaranteed/i]
    for (const p of patterns) if (p.test(txt)) hits.push(p.toString())
    return hits
  })

  results.consoleErrors = consoleErrors
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log('DONE. Wrote', `${OUT}/results.json`)
  await browser.close()
}
run().catch((e) => { console.error('FATAL', e); process.exit(1) })
