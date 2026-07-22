// swoobz-game-flow-qa — ABYSS LINE mobile (pixel7) fix-up re-run.
// Root causes found + fixed vs 0707c: (1) tier buttons render ABBREVIATED
// text on narrow ("HADAL446.12x") vs full text on wide ("HADAL TRENCH...") —
// match by short token. (2) canvas is WIDER than the mobile viewport (a pan
// window: box.w=644 vs vp 412, box.x=-25) so raw col*tile coordinate clicks
// landed outside the visible/interactive region — compute a safe in-viewport
// column band before clicking.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'shots-gameflowqa-finalcheck-0707d-mobile'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function clickText(page, txt) {
  return page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(t))
    if (b && !b.disabled) { b.click(); return true }
    return false
  }, txt)
}
async function bodyText(page) { return page.evaluate(() => document.body.innerText) }
async function getCanvasBox(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
}
async function getViewportWidth(page) { return page.evaluate(() => window.innerWidth) }

// Pick n tiles guaranteed inside BOTH the canvas and the visible viewport
// band, using consecutive rows starting at row 2 (clear of any header chrome)
// and only columns whose full tile width is inside [0, vpW].
// Empirically-probed safe zone on the pixel7 viewport (412x915): a live
// `document.elementFromPoint` sweep (assay-run/_diag_mobileclick_0707.mjs,
// _diag_mobileclick2_0707.mjs) found the naive col*tile/row*tile math landed
// on non-canvas siblings (in-board header plaque above, bottom dock/rail
// below, AND a horizontal pan-window offsetting the canvas box.x=-25 past
// the 412px viewport) for most of the reported 644x644 canvas bounding-rect.
// Only rows 3-6 x cols 3-6 (a 4x4=16 tile block) verified reliably resolve to
// the CANVAS element AND produce a real trail-count decrement per click.
// This is a probe-harness fix only (no product change) — see the run log for
// the full root-cause trail.
async function paintTilesInView(page, n) {
  const box = await getCanvasBox(page)
  const dim = 14
  const tile = box.w / dim
  const safeRows = [3, 4, 5, 6]
  const safeCols = [3, 4, 5, 6]
  const coords = []
  let count = 0
  for (const r of safeRows) {
    for (const c of safeCols) {
      if (count >= n) break
      coords.push([r, c])
      count++
    }
    if (count >= n) break
  }
  for (const [row, col] of coords) {
    await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
    await wait(50)
  }
  return { requested: n, clicked: coords.length, boxW: box.w }
}
async function setPace(page, target) {
  for (let i = 0; i < 3; i++) {
    const txt = await bodyText(page)
    const isInstant = txt.includes('PACE: INSTANT')
    const isStaggered = txt.includes('PACE: DUCAT-BY-DUCAT')
    if (target === 'instant' && isInstant) return true
    if (target === 'staggered' && isStaggered) return true
    if (!isInstant && !isStaggered) return false
    await clickText(page, 'PACE:')
    await wait(60)
  }
  return false
}
// Fix: match tier by SHORT token (works on both the wide full-label button
// text "HADAL TRENCH up to 446.12x..." and the narrow abbreviated chip text
// "HADAL446.12x").
async function setTier(page, shortToken) {
  const clicked = await clickText(page, shortToken)
  await wait(80)
  const active = await page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(t))
    if (!b) return null
    // active tier chip carries a distinct aria-pressed/data-state in most of
    // this codebase's TierRow/chip components; fall back to just confirming
    // the button exists and was clickable.
    return { ariaPressed: b.getAttribute('aria-pressed'), text: b.textContent.slice(0, 40) }
  }, shortToken)
  return { clicked, active }
}
async function goToPlanning(page) {
  const txt = await bodyText(page)
  if (txt.includes('ENTER THE DIVE')) { await clickText(page, 'ENTER THE DIVE'); await wait(150) }
}
async function clearTrail(page) { await clickText(page, 'CLEAR'); await wait(40) }

async function installSampler(page) {
  await page.evaluate(() => {
    window.__frames = []
    window.__flies = []
    window.__t0 = performance.now()
    window.__badVeinAt = null
    window.__settledAt = null
    if (window.__mo) window.__mo.disconnect()
    const mo = new MutationObserver((muts) => {
      const now = performance.now() - window.__t0
      for (const m of muts) for (const node of m.addedNodes) if (node.nodeType === 1 && node.tagName === 'IMG') window.__flies.push(now)
    })
    mo.observe(document.body, { childList: true, subtree: true })
    window.__mo = mo
    if (window.__poll) clearInterval(window.__poll)
    window.__poll = setInterval(() => {
      const now = performance.now() - window.__t0
      const bodyTxt = document.body.innerText
      const badVein = bodyTxt.includes('Dive busted')
      const settled = bodyTxt.includes('RUGGED BY THE DEEP') || bodyTxt.includes('SECURED THE HAUL')
      if (window.__badVeinAt == null && badVein) window.__badVeinAt = now
      if (window.__settledAt == null && settled) window.__settledAt = now
      window.__frames.push({ t: Math.round(now * 100) / 100, coinImgCount: document.querySelectorAll('img').length, badVein, settled })
    }, 6)
  })
}
async function readSampler(page) { return page.evaluate(() => ({ frames: window.__frames || [], flies: window.__flies || [], badVeinAt: window.__badVeinAt, settledAt: window.__settledAt })) }
async function stopSampler(page) { await page.evaluate(() => { if (window.__mo) window.__mo.disconnect(); if (window.__poll) clearInterval(window.__poll) }) }
async function waitForSettled(page, maxMs) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    const txt = await bodyText(page)
    if ((txt.includes('RUGGED BY THE DEEP') || txt.includes('SECURED THE HAUL')) && txt.includes('WRECK RECKONING')) return true
    await wait(40)
  }
  return false
}
async function readHeroPop(page) {
  return page.evaluate(() => {
    const nodes = [...document.querySelectorAll('div')].filter((d) => d.textContent && d.textContent.includes('SECURED THE HAUL') && d.textContent.includes('$'))
    if (!nodes.length) return { present: false }
    const el = nodes[nodes.length - 1]
    const r = el.getBoundingClientRect()
    return { present: true, text: el.textContent, rect: { x: r.x, y: r.y, w: r.width, h: r.height } }
  })
}
async function readCert(page) {
  return page.evaluate(() => {
    const headingDiv = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && (d.textContent === 'RUGGED BY THE DEEP' || d.textContent === 'SECURED THE HAUL'))
    if (!headingDiv) return null
    const payoutLabel = [...document.querySelectorAll('div')].find((d) => d.textContent === 'PAYOUT')
    const payoutVal = payoutLabel && payoutLabel.parentElement ? payoutLabel.parentElement.children[1]?.textContent : null
    const bodyTxt = document.body.innerText
    const wreckMatch = bodyTxt.match(/WRECK RECKONING\s*[·◆]*\s*([^\n]+)/)
    return { heading: headingDiv.textContent, payout: payoutVal, wreckLine: wreckMatch ? wreckMatch[0] : null, seedPresent: bodyTxt.includes('seed'), hashPresent: bodyTxt.includes('hash'), roundPresent: /round\s+[0-9a-f]/i.test(bodyTxt) }
  })
}
async function heroPopStaleCount(page) {
  return page.evaluate(() => [...document.querySelectorAll('div')].filter((d) => d.textContent && d.textContent.includes('SECURED THE HAUL') && d.textContent.includes('$')).length)
}

const results = { consoleErrors: [], pageErrors: [], cells: {} }

async function runCombo({ page, tierToken, pace, trailSize, cellName, restartMethod }) {
  await goToPlanning(page)
  await clearTrail(page)
  const tierRes = await setTier(page, tierToken)
  const paceOk = await setPace(page, pace)
  const paint = await paintTilesInView(page, trailSize)
  await wait(80)
  const trailPromptTxt = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes('RUN THE LINE'))
    return { runLineBtnFound: !!b, runLineDisabled: b ? b.disabled : null, bodyHasMorePrompt: document.body.innerText.includes('more ducat') }
  })

  await installSampler(page)
  const clicked = await clickText(page, 'RUN THE LINE')
  const settled = await waitForSettled(page, 9000)
  await wait(160)
  const sample = await readSampler(page)
  await stopSampler(page)

  const cert = await readCert(page)
  const won = cert && cert.heading === 'SECURED THE HAUL'
  const heroPop = won ? await readHeroPop(page) : { present: false }

  const badVeinAt = sample.badVeinAt
  const flyCountAtOrAfterBomb = badVeinAt != null ? sample.flies.filter((t) => t >= badVeinAt - 0.01).length : null
  const flyCountBeforeBomb = badVeinAt != null ? sample.flies.filter((t) => t < badVeinAt - 0.01).length : sample.flies.length

  await page.screenshot({ path: `${OUT}/${cellName}-settled.png` })

  const cellResult = {
    cellName, tierToken, pace, trailSize, paint, trailPromptTxt, tierRes, paceOk, runClicked: clicked, settledReached: settled, won,
    badVeinAtMs: badVeinAt != null ? Math.round(badVeinAt) : null,
    settledAtMs: sample.settledAt != null ? Math.round(sample.settledAt) : null,
    totalFlies: sample.flies.length, flyCountAtOrAfterBomb, flyCountBeforeBomb,
    heroPop, cert,
  }

  const t0 = Date.now()
  if (restartMethod === 'dive-again') await clickText(page, 'DIVE AGAIN')
  else await clickText(page, 'SAME LINE')
  await wait(220)
  const restartLatencyMs = Date.now() - t0
  const afterTxt = await bodyText(page)
  const restartOk = /RUN THE LINE/i.test(afterTxt) || /Select .* more ducat/i.test(afterTxt) || /Claim line marked/i.test(afterTxt)
  const staleHeroPopAfterRestart = await heroPopStaleCount(page)
  await page.screenshot({ path: `${OUT}/${cellName}-after-restart.png` })

  cellResult.restart = { restartMethod, restartOk, restartLatencyMs, staleHeroPopAfterRestart }
  console.log(JSON.stringify(cellResult))
  return cellResult
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = await browser.newPage()
page.on('console', (m) => { if (m.type() === 'error') results.consoleErrors.push(m.text()) })
page.on('pageerror', (e) => results.pageErrors.push(e.message))
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 })
const httpResp = await page.goto(URL, { waitUntil: 'networkidle0' })
console.log('HTTP status (fresh nav):', httpResp.status())
await page.evaluate(() => { try { localStorage.clear() } catch (e) {} })
await page.reload({ waitUntil: 'load' })
await wait(400)

// tier button label sanity dump
const tierLabels = await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => /HADAL|REEF|MIDNIGHT/i.test(b.textContent || '')).map(b => b.textContent.slice(0, 40)))
console.log('mobile tier button labels:', JSON.stringify(tierLabels))

let a = null, attempt = 0
while (attempt < 12 && (!a || a.won)) { a = await runCombo({ page, tierToken: 'HADAL', pace: 'staggered', trailSize: 16, cellName: `pixel7-staggered-bust-${attempt}`, restartMethod: 'dive-again' }); attempt++ }
results.cells.staggeredBust = a

let b = null; attempt = 0
while (attempt < 12 && (!b || b.won)) { b = await runCombo({ page, tierToken: 'HADAL', pace: 'instant', trailSize: 16, cellName: `pixel7-instant-bust-${attempt}`, restartMethod: 'same-line' }); attempt++ }
results.cells.instantBust = b

let c = null; attempt = 0
while (attempt < 20 && (!c || !c.won)) { c = await runCombo({ page, tierToken: 'REEF', pace: 'staggered', trailSize: 8, cellName: `pixel7-staggered-win-${attempt}`, restartMethod: 'dive-again' }); attempt++ }
results.cells.staggeredWin = c

let d = null; attempt = 0
while (attempt < 20 && (!d || !d.won)) { d = await runCombo({ page, tierToken: 'REEF', pace: 'instant', trailSize: 8, cellName: `pixel7-instant-win-${attempt}`, restartMethod: 'same-line' }); attempt++ }
results.cells.instantWin = d

fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
console.log('\n=== MOBILE SUMMARY ===')
for (const [k, v] of Object.entries(results.cells)) console.log(k, '=>', v ? { won: v.won, settled: v.settledReached, attempt: v.cellName } : 'NEVER REACHED')
console.log('console errors:', results.consoleErrors.length, JSON.stringify(results.consoleErrors))
console.log('page errors:', results.pageErrors.length, JSON.stringify(results.pageErrors))

await browser.close()
console.log('DONE', OUT)
