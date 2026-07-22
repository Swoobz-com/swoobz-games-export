// swoobz-game-flow-qa INDEPENDENT re-verify — ABYSS LINE staggered bust
// lockstep-zero fix (2026-07-07). Own driver, own selectors, own instruments.
// Live localhost:5182, harness-only (assay-run/), no source edits.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'shots-qagameflow-reverify-0707b'
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
async function paintTiles(page, n) {
  const box = await getCanvasBox(page)
  const dim = 14
  const tile = box.w / dim
  const coords = []
  let count = 0
  for (let row = 0; row < dim && count < n; row++) {
    for (let col = 0; col < dim && count < n; col++) { coords.push([row, col]); count++ }
  }
  for (const [row, col] of coords) {
    await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
    await wait(15) // widened from the documented 6ms-artifact lesson
  }
  // read back the committed count via the RUN button / painted odometer if present
  return count
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
async function setTier(page, label) {
  await clickText(page, label)
  await wait(60)
  const txt = await bodyText(page)
  return txt.includes(label)
}
async function goToPlanning(page) {
  const txt = await bodyText(page)
  if (txt.includes('ENTER THE DIVE')) { await clickText(page, 'ENTER THE DIVE'); await wait(150) }
}
async function clearTrail(page) { await clickText(page, 'CLEAR'); await wait(40) }

// In-page dense sampler: one setInterval @ 6ms records {t, heroLabel, haulText,
// coinImgCount, badVein, settled} — avoids per-tick round-trips entirely.
async function installSampler(page) {
  await page.evaluate(() => {
    window.__frames = []
    window.__flies = [] // <img> ADD timestamps (CoinFly is the ONLY <img> tag in
                         // this game's whole render tree, confirmed by source grep)
    window.__t0 = performance.now()
    window.__badVeinAt = null
    window.__settledAt = null
    if (window.__mo) window.__mo.disconnect()
    const mo = new MutationObserver((muts) => {
      const now = performance.now() - window.__t0
      for (const m of muts) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1 && node.tagName === 'IMG') window.__flies.push(now)
        }
      }
    })
    mo.observe(document.body, { childList: true, subtree: true })
    window.__mo = mo
    if (window.__poll) clearInterval(window.__poll)
    window.__poll = setInterval(() => {
      const now = performance.now() - window.__t0
      const heroDiv = [...document.querySelectorAll('div')].find(
        (d) => d.children.length === 0 && (d.textContent === 'LINE BROKE' || d.textContent === 'LINE CLAIMED'),
      )
      const haulLabel = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && d.textContent === 'HAUL')
      const haulText = haulLabel && haulLabel.parentElement ? haulLabel.parentElement.textContent : null
      const bodyTxt = document.body.innerText
      const badVein = bodyTxt.includes('Dive busted')
      const settled = bodyTxt.includes('RUGGED BY THE DEEP') || bodyTxt.includes('SECURED THE HAUL')
      if (window.__badVeinAt == null && badVein) window.__badVeinAt = now
      if (window.__settledAt == null && settled) window.__settledAt = now
      window.__frames.push({
        t: Math.round(now * 100) / 100,
        heroLabel: heroDiv ? heroDiv.textContent : null,
        haulText,
        coinImgCount: document.querySelectorAll('img').length,
        badVein,
        settled,
      })
    }, 6)
  })
}
async function readSampler(page) {
  return page.evaluate(() => ({
    frames: window.__frames || [],
    flies: window.__flies || [],
    badVeinAt: window.__badVeinAt,
    settledAt: window.__settledAt,
  }))
}
async function stopSampler(page) {
  await page.evaluate(() => { if (window.__mo) window.__mo.disconnect(); if (window.__poll) clearInterval(window.__poll) })
}
async function waitForSettled(page, maxMs) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    const txt = await bodyText(page)
    if ((txt.includes('RUGGED BY THE DEEP') || txt.includes('SECURED THE HAUL')) && txt.includes('WRECK RECKONING')) return true
    await wait(40)
  }
  return false
}
async function readHeroPlaque(page) {
  return page.evaluate(() => {
    const labelDiv = [...document.querySelectorAll('div')].find(
      (d) => d.children.length === 0 && (d.textContent === 'LINE BROKE' || d.textContent === 'LINE CLAIMED'),
    )
    if (!labelDiv) return null
    const row = labelDiv.parentElement ? labelDiv.parentElement.children[1] : null
    return { label: labelDiv.textContent, amount: row?.children[0]?.textContent ?? null, mult: row?.children[1]?.textContent ?? null }
  })
}
async function readSettledCert(page) {
  return page.evaluate(() => {
    const headingDiv = [...document.querySelectorAll('div')].find(
      (d) => d.children.length === 0 && (d.textContent === 'RUGGED BY THE DEEP' || d.textContent === 'SECURED THE HAUL'),
    )
    if (!headingDiv) return null
    const payoutLabel = [...document.querySelectorAll('div')].find((d) => d.textContent === 'PAYOUT')
    const payoutVal = payoutLabel && payoutLabel.parentElement ? payoutLabel.parentElement.children[1]?.textContent : null
    return { heading: headingDiv.textContent, payout: payoutVal }
  })
}
async function overlayCensus(page) {
  return page.evaluate(() => {
    const bodyTxt = document.body.innerText
    return {
      onboardingText: bodyTxt.includes('welcome') || bodyTxt.includes('Welcome'),
      diveAgain: bodyTxt.includes('DIVE AGAIN'),
      sameLine: bodyTxt.includes('SAME LINE'),
      heroPopNodes: [...document.querySelectorAll('div')].filter(
        (d) => d.textContent && d.textContent.includes('SECURED THE HAUL') && d.getAttribute('aria-hidden') === 'true',
      ).length,
    }
  })
}

const results = { cells: [], consoleErrors: [], pageErrors: [] }

async function runCell({ page, tierLabel, pace, trailSize, cellName, restartMethod, wantWin }) {
  console.log(`\n=== CELL: ${cellName} ===`)
  await goToPlanning(page)
  await clearTrail(page)
  const tierOk = await setTier(page, tierLabel)
  const paceOk = await setPace(page, pace)
  const painted = await paintTiles(page, trailSize)
  await wait(80)
  console.log(`tierOk=${tierOk} paceOk=${paceOk} painted=${painted}`)

  await installSampler(page)
  const clicked = await clickText(page, 'RUN THE LINE')
  console.log('RUN THE LINE clicked:', clicked)

  const settled = await waitForSettled(page, 8000)
  await wait(150)
  const sample = await readSampler(page)
  await stopSampler(page)

  const heroPlaque = await readHeroPlaque(page)
  const cert = await readSettledCert(page)
  const won = cert && cert.heading === 'SECURED THE HAUL'

  // Mechanical analysis
  const badVeinAt = sample.badVeinAt
  const flyCountAtOrAfterBomb = badVeinAt != null ? sample.flies.filter((t) => t >= badVeinAt - 0.01).length : null
  const holdFrames = badVeinAt != null ? sample.frames.filter((f) => f.t >= badVeinAt - 6 && !f.settled) : []
  const contradictoryFrames = holdFrames.filter(
    (f) => (f.heroLabel === 'LINE BROKE' || f.badVein) && f.haulText && /\$\s*[1-9]/.test(f.haulText),
  )
  const maxCoinImgsInHold = holdFrames.reduce((m, f) => Math.max(m, f.coinImgCount), 0)

  await page.screenshot({ path: `${OUT}/${cellName}-settled.png` })

  const cellResult = {
    cellName, tierLabel, pace, trailSize, painted, settledReached: settled, won,
    badVeinAtMs: badVeinAt != null ? Math.round(badVeinAt) : null,
    settledAtMs: sample.settledAt != null ? Math.round(sample.settledAt) : null,
    totalFlies: sample.flies.length,
    flyCountAtOrAfterBomb,
    holdFrameCount: holdFrames.length,
    contradictoryFrameCount: contradictoryFrames.length,
    contradictorySample: contradictoryFrames.slice(0, 3),
    maxCoinImgsInHold,
    heroPlaque, cert,
  }
  console.log(JSON.stringify(cellResult, null, 2))

  // Dead-end / restart probe
  const preTxt = await bodyText(page)
  const hasDiveAgain = preTxt.includes('DIVE AGAIN')
  const hasSameLine = preTxt.includes('SAME LINE')
  let restartOk = false
  if (restartMethod === 'dive-again') {
    await clickText(page, 'DIVE AGAIN')
  } else {
    await clickText(page, 'SAME LINE')
  }
  await wait(220)
  const afterTxt = await bodyText(page)
  restartOk = /RUN THE LINE|run the line/i.test(afterTxt)
  const overlay = await overlayCensus(page)
  await page.screenshot({ path: `${OUT}/${cellName}-after-restart.png` })

  cellResult.deadEnd = { hasDiveAgain, hasSameLine, restartMethod, restartOk, staleHeroPopAfterRestart: overlay.heroPopNodes > 0 }
  results.cells.push(cellResult)
  return cellResult
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 } })
const page = (await browser.pages())[0]
page.on('console', (msg) => { if (msg.type() === 'error') results.consoleErrors.push(msg.text()) })
page.on('pageerror', (err) => results.pageErrors.push(err.message))

const httpResp = await page.goto(URL, { waitUntil: 'networkidle0' })
console.log('HTTP status:', httpResp.status())
await wait(200)

// CELL A: STAGGERED bust (primary re-verify target) — need several attempts
let a = null, attempt = 0
while (attempt < 15 && (!a || a.won)) {
  a = await runCell({ page, tierLabel: 'HADAL TRENCH', pace: 'staggered', trailSize: 60, cellName: `staggered-bust-${attempt}`, restartMethod: 'dive-again' })
  attempt++
}

// CELL B: INSTANT bust (unchanged confirmation)
let b = null; attempt = 0
while (attempt < 15 && (!b || b.won)) {
  b = await runCell({ page, tierLabel: 'HADAL TRENCH', pace: 'instant', trailSize: 60, cellName: `instant-bust-${attempt}`, restartMethod: 'same-line' })
  attempt++
}

// CELL C: STAGGERED win
let c = null; attempt = 0
while (attempt < 30 && (!c || !c.won)) {
  c = await runCell({ page, tierLabel: 'REEF SHELF', pace: 'staggered', trailSize: 8, cellName: `staggered-win-${attempt}`, restartMethod: 'dive-again' })
  attempt++
}

// CELL D: INSTANT win
let d = null; attempt = 0
while (attempt < 30 && (!d || !d.won)) {
  d = await runCell({ page, tierLabel: 'REEF SHELF', pace: 'instant', trailSize: 8, cellName: `instant-win-${attempt}`, restartMethod: 'same-line' })
  attempt++
}

fs.writeFileSync(`${OUT}/results.json`, JSON.stringify({ a, b, c, d, consoleErrors: results.consoleErrors, pageErrors: results.pageErrors, allCells: results.cells }, null, 2))
console.log('\n\n=== SUMMARY ===')
console.log('STAGGERED BUST: flyCountAtOrAfterBomb=', a?.flyCountAtOrAfterBomb, 'contradictoryFrameCount=', a?.contradictoryFrameCount, 'holdFrameCount=', a?.holdFrameCount)
console.log('INSTANT BUST: totalFlies=', b?.totalFlies, 'heroPlaque=', JSON.stringify(b?.heroPlaque), 'cert=', JSON.stringify(b?.cert))
console.log('STAGGERED WIN: totalFlies=', c?.totalFlies, 'heroPlaque=', JSON.stringify(c?.heroPlaque))
console.log('INSTANT WIN: totalFlies=', d?.totalFlies, 'heroPlaque=', JSON.stringify(d?.heroPlaque))
console.log('CONSOLE ERRORS:', results.consoleErrors.length)
results.consoleErrors.forEach((e) => console.log(' -', e))
console.log('PAGE ERRORS:', results.pageErrors.length)

await browser.close()
console.log('\nDONE.', OUT)
