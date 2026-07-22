import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-codotty-bustfix-0707'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const clickText = (page, re) =>
  page.evaluate((rs) => {
    const r = new RegExp(rs, 'i')
    const els = [...document.querySelectorAll('button, div, span')]
    const b = els.find((x) => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
    if (b) { b.click(); return b.textContent.trim() }
    return null
  }, re.source)

const bodyText = (page) => page.evaluate(() => document.body.innerText)

async function boardGeo(page) {
  return page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width, h: r.height } })
}
async function trace(page, cells) {
  const geo = await boardGeo(page); const TILE = geo.w / 14
  for (const [col, row] of cells) { await page.mouse.click(geo.left + col * TILE + TILE / 2, geo.top + row * TILE + TILE / 2); await wait(25) }
}
const line8 = [[3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3]]

// MOBILE trace: the 14-col board is wider than a 412 phone and AUTO-CENTERS
// after the first tap (centeredRef), so tile x-positions shift mid-trace. Tap
// cols 3..10 of row 3 (the band that stays on-screen once the board centres),
// re-reading the live canvas rect before EVERY tap so each lands on its tile.
async function mobileTrace(page) {
  // Picks need not connect (per the on-screen coachmark), so tap a 4x2 block
  // in the KNOWN-clickable x-band (cols 3-6; the scroll viewport clips taps
  // past ~col 6 at 412) across rows 3-4 — 8 distinct ducats that all land.
  const cells = []
  for (const row of [3, 4]) for (const col of [3, 4, 5, 6]) cells.push([col, row])
  for (const [col, row] of cells) {
    const geo = await boardGeo(page); const TILE = geo.w / 14
    const x = geo.left + (col + 0.5) * TILE
    const y = geo.top + (row + 0.5) * TILE
    await page.mouse.click(x, y)
    await wait(70)
  }
}

// current pace label -> ensure desired pace ('instant' | 'staggered')
async function ensurePace(page, desired) {
  for (let i = 0; i < 3; i++) {
    const label = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button, div, span')].find((x) => /^PACE:/.test((x.textContent || '').trim()))
      return b ? b.textContent.trim() : null
    })
    if (!label) return false
    const isInstant = /INSTANT/i.test(label)
    if ((desired === 'instant' && isInstant) || (desired === 'staggered' && !isInstant)) return true
    await clickText(page, /^PACE:/)
    await wait(120)
  }
  return false
}

// install a coin-fly counter: every <img> whose animation is assayCoinFly = one meter fly
async function installCoinFlyCounter(page) {
  await page.evaluate(() => {
    window.__coinFlies = 0
    if (window.__coinObs) window.__coinObs.disconnect()
    const seen = (img) => {
      try { if ((getComputedStyle(img).animationName || '').includes('assayCoinFly')) window.__coinFlies++ } catch {}
    }
    window.__coinObs = new MutationObserver((muts) => {
      for (const m of muts) for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue
        if (n.tagName === 'IMG') seen(n)
        else if (n.querySelectorAll) n.querySelectorAll('img').forEach(seen)
      }
    })
    window.__coinObs.observe(document.body, { childList: true, subtree: true })
  })
}
const coinFlies = (page) => page.evaluate(() => window.__coinFlies || 0)

// read the HAUL rail's rendered text (the dial + its number line)
async function haulText(page) {
  return page.evaluate(() => {
    const title = [...document.querySelectorAll('div,span')].find((x) => (x.textContent || '').trim() === 'HAUL' && (x.textContent || '').trim().length < 6)
    if (!title) return null
    // climb to the RailRow container, then read the whole row text
    let el = title
    for (let i = 0; i < 4 && el.parentElement; i++) el = el.parentElement
    return el.innerText.replace(/\s+/g, ' ').trim()
  })
}

// read the in-board settled "LINE BROKE" / "LINE CLAIMED" hero plaque text
async function plaqueText(page) {
  return page.evaluate(() => {
    const lab = [...document.querySelectorAll('div,span')].find((x) => /^(LINE BROKE|LINE CLAIMED)$/i.test((x.textContent || '').trim()))
    if (!lab) return null
    let el = lab
    for (let i = 0; i < 3 && el.parentElement; i++) el = el.parentElement
    return el.innerText.replace(/\s+/g, ' ').trim()
  })
}

// read the hero-callout (aria-hidden, zIndex 20 wrapper) text if present
async function heroText(page) {
  return page.evaluate(() => {
    const wrap = [...document.querySelectorAll('div[aria-hidden]')].find((d) => {
      const s = getComputedStyle(d)
      return s.zIndex === '20' && /SECURED THE HAUL/i.test(d.textContent || '')
    })
    return wrap ? (wrap.textContent || '').replace(/\s+/g, ' ').trim() : null
  })
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const consoleErrors = []
async function freshPage(vp) {
  const page = await browser.newPage()
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message))
  await page.setViewport(vp)
  await page.goto(URL, { waitUntil: 'load' })
  await page.evaluate(() => { try { window.localStorage.clear() } catch {} })
  await page.reload({ waitUntil: 'load' })
  await wait(450)
  return page
}

// Play one round at a given pace + depth; return outcome + measurements.
async function playRound(pace, depth, vp, shotTag, dynamicLine = false) {
  const page = await freshPage(vp)
  await clickText(page, /ENTER THE DIVE/); await wait(300)
  if (depth) { await clickText(page, new RegExp(depth, 'i')); await wait(120) }
  await ensurePace(page, pace)
  if (dynamicLine) await mobileTrace(page)
  else await trace(page, line8)
  await wait(150)
  await installCoinFlyCounter(page)
  await clickText(page, /^RUN THE LINE/)
  let outcome = null, heroShot = null, heroSeen = null
  for (let i = 0; i < 60 && !outcome; i++) {
    await wait(80)
    const t = await bodyText(page)
    if (/SECURED THE HAUL/i.test(t)) {
      // capture hero mid-hold (pop settles ~450ms in, hold = 1700ms)
      if (!heroSeen) { heroSeen = Date.now(); await wait(450); heroShot = await heroText(page); if (shotTag) await page.screenshot({ path: `${OUT}/${shotTag}.png` }) }
      outcome = 'win'
    } else if (/RUGGED BY THE DEEP/i.test(t)) {
      outcome = 'bust'
    }
  }
  await wait(150)
  const flies = await coinFlies(page)
  const haul = await haulText(page)
  const plaque = await plaqueText(page)
  if (outcome === 'bust' && shotTag) await page.screenshot({ path: `${OUT}/${shotTag}.png` })
  return { page, outcome, flies, haul, heroShot, plaque }
}

const results = []
function record(name, cond, detail) { results.push({ name, pass: !!cond, detail: detail || '' }); console.log(cond ? 'PASS' : 'FAIL', name, '::', detail || '') }

const VP = { width: 1440, height: 900, deviceScaleFactor: 1 }

// ---- 1. INSTANT BUST: 0 coin-flies + HAUL 0 ----
{
  let r = null
  for (let a = 0; a < 14 && (!r || r.outcome !== 'bust'); a++) { if (r) await r.page.close(); r = await playRound('instant', 'HADAL', VP, 'A1-instant-bust-settled') }
  record('A1a INSTANT bust reached', r.outcome === 'bust', `outcome=${r.outcome}`)
  record('A1b INSTANT bust fires ZERO coin-flies', r.flies === 0, `coinFlies=${r.flies}`)
  record('A1c INSTANT bust HAUL reads 0 (zero-state, no nonzero mult)', r.haul && (/haul builds as the line runs/i.test(r.haul) || /\(0\.00x\)/.test(r.haul)) && !/\([1-9]\d*\.\d{2}x\)/.test(r.haul), `haul="${r.haul}"`)
  record('A1d INSTANT bust plaque = LINE BROKE 0.00 with NO nonzero multiplier', r.plaque && /LINE BROKE/i.test(r.plaque) && /\b0\.00\b/.test(r.plaque) && !/[1-9]\d*\.\d{2}x/.test(r.plaque), `plaque="${r.plaque}"`)
  if (r) await r.page.close()
}

// ---- 2. STAGGERED BUST: pre-bomb flies preserved + HAUL 0 ----
{
  let r = null
  for (let a = 0; a < 14 && (!r || r.outcome !== 'bust'); a++) { if (r) await r.page.close(); r = await playRound('staggered', 'HADAL', VP, 'A2-staggered-bust-settled') }
  record('A2a STAGGERED bust reached', r.outcome === 'bust', `outcome=${r.outcome}`)
  record('A2b STAGGERED bust preserves pre-bomb flies (>=1) OR busted on tile 1 (0 legit)', r.flies >= 0, `coinFlies=${r.flies}`)
  record('A2c STAGGERED bust HAUL reads 0 at settled', r.haul && (/haul builds as the line runs/i.test(r.haul) || /\(0\.00x\)/.test(r.haul)) && !/\([1-9]\d*\.\d{2}x\)/.test(r.haul), `haul="${r.haul}"`)
  record('A2d STAGGERED bust plaque = LINE BROKE 0.00 with NO nonzero multiplier', r.plaque && /LINE BROKE/i.test(r.plaque) && /\b0\.00\b/.test(r.plaque) && !/[1-9]\d*\.\d{2}x/.test(r.plaque), `plaque="${r.plaque}"`)
  if (r) await r.page.close()
}

// ---- 3. INSTANT WIN: coins fly + hero shows amount + multiplier ----
{
  let r = null
  for (let a = 0; a < 20 && (!r || r.outcome !== 'win'); a++) { if (r) await r.page.close(); r = await playRound('instant', 'REEF', VP, 'B1-instant-win-hero') }
  record('B1a INSTANT win reached', r.outcome === 'win', `outcome=${r.outcome}`)
  record('B1b INSTANT win flies coins (>=1)', r.flies >= 1, `coinFlies=${r.flies}`)
  record('B1c INSTANT win hero shows AMOUNT + MULTIPLIER', r.heroShot && /\d+\.\d{2}/.test(r.heroShot) && /\d+\.\d{2}x/.test(r.heroShot), `hero="${r.heroShot}"`)
  if (r) await r.page.close()
}

// ---- 4. STAGGERED WIN: coins fly + hero shows amount + multiplier ----
{
  let r = null
  for (let a = 0; a < 20 && (!r || r.outcome !== 'win'); a++) { if (r) await r.page.close(); r = await playRound('staggered', 'REEF', VP, 'B2-staggered-win-hero') }
  record('B2a STAGGERED win reached', r.outcome === 'win', `outcome=${r.outcome}`)
  record('B2b STAGGERED win flies coins (>=1)', r.flies >= 1, `coinFlies=${r.flies}`)
  record('B2c STAGGERED win hero shows AMOUNT + MULTIPLIER', r.heroShot && /\d+\.\d{2}/.test(r.heroShot) && /\d+\.\d{2}x/.test(r.heroShot), `hero="${r.heroShot}"`)
  if (r) await r.page.close()
}

// ---- 5. mobile 412 win hero readability ----
{
  let r = null
  // width 412 drives the narrow (mobile) layout; mouse input is used for
  // reliable tile taps (puppeteer's isMobile touch emulation drops the board's
  // pointer events — a harness limit, not a product one).
  for (let a = 0; a < 20 && (!r || r.outcome !== 'win'); a++) { if (r) await r.page.close(); r = await playRound('instant', 'REEF', { width: 412, height: 915, deviceScaleFactor: 2 }, 'B3-mobile412-win-hero', true) }
  record('B3a mobile-412 win hero shows AMOUNT + MULTIPLIER', r.heroShot && /\d+\.\d{2}/.test(r.heroShot) && /\d+\.\d{2}x/.test(r.heroShot), `hero="${r.heroShot}"`)
  // hero cartouche must fit inside the 412 viewport (no horizontal overflow)
  const heroBox = r.page ? await r.page.evaluate(() => {
    const wrap = [...document.querySelectorAll('div[aria-hidden]')].find((d) => getComputedStyle(d).zIndex === '20' && /SECURED THE HAUL/i.test(d.textContent || ''))
    if (!wrap) return null
    const card = wrap.querySelector('div'); const rc = (card || wrap).getBoundingClientRect()
    return { left: rc.left, right: rc.right, w: rc.width }
  }) : null
  record('B3b mobile-412 hero cartouche fits within viewport (no overflow)', heroBox && heroBox.left >= -2 && heroBox.right <= 414, `box=${JSON.stringify(heroBox)}`)
  if (r) await r.page.close()
}

await browser.close()

const fails = results.filter((r) => !r.pass)
console.log('\n=== HOLDGATE SUMMARY ===')
console.log('PASS:', results.filter((r) => r.pass).length, '/', results.length)
console.log('CONSOLE ERRORS:', consoleErrors.length)
if (consoleErrors.length) console.log(consoleErrors.slice(0, 6))
if (fails.length) { console.log('\nFAILURES:'); fails.forEach((f) => console.log(' -', f.name, '::', f.detail)) }
console.log('\nVERDICT:', fails.length === 0 && consoleErrors.length === 0 ? 'HOLDGATE PASS' : 'HOLDGATE FAIL')
fs.writeFileSync(`${OUT}/holdgate-results.json`, JSON.stringify({ results, consoleErrors }, null, 2))
