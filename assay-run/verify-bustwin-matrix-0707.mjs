// ABYSS LINE — bust/win presentation-fix verification matrix (harness-only,
// NO source edits). Drives the LIVE app at localhost:5182 with real Chrome via
// puppeteer-core, desktop 1440x900 only (per task brief — mobile board is a
// 180x180 loupe, unrelated to this probe).
//
// Matrix: {instant,staggered} x {win,bust}. Mechanically verifies:
//   - coin-fly count via a MutationObserver on document.body counting every
//     added <img> node (CoinFly is the ONLY <img> element anywhere in this
//     game's whole render tree — confirmed by source grep — so any <img>
//     addition IS a coin-fly, unambiguously).
//   - phase-transition timestamps via a body-text poll for 'CRACKED DUCAT'
//     (bad-vein phase entered) and the settled headline.
//   - the in-canvas hero plaque (LINE BROKE/LINE CLAIMED + amount + multiplier).
//   - the HAUL rail row's own reading.
//   - the settled certificate's headline + PAYOUT value.
//   - the win-hero cartouche (SECURED THE HAUL + amount + multiplier), and that
//     it is pointer-events:none (can't block settled controls).
//   - no dead-ends: DIVE AGAIN -> / SAME LINE both reachable + functional from
//     every settled state, each restart checked for zero console errors.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const OUT = 'shots-bustwin-verify-0707'
fs.mkdirSync(OUT, { recursive: true })

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function clickText(page, txt) {
  return page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(t))
    if (b && !b.disabled) { b.click(); return true }
    return false
  }, txt)
}

async function bodyText(page) {
  return page.evaluate(() => document.body.innerText)
}

async function getCanvasBox(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
}

/** Paint `n` distinct tiles spread across the 14x14 board (order matters —
 *  ordered claim-line, not necessarily contiguous — matches the real
 *  mechanic: "tap any tiles, they need not connect"). */
async function paintTiles(page, n) {
  const box = await getCanvasBox(page)
  const dim = 14
  const tile = box.w / dim
  let count = 0
  const coords = []
  for (let row = 0; row < dim && count < n; row++) {
    for (let col = 0; col < dim && count < n; col++) {
      coords.push([row, col])
      count++
    }
  }
  for (const [row, col] of coords) {
    await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
    await wait(6)
  }
  return count
}

async function setPace(page, target) {
  // target: 'instant' | 'staggered'
  for (let i = 0; i < 3; i++) {
    const txt = await bodyText(page)
    const isInstant = txt.includes('PACE: INSTANT')
    const isStaggered = txt.includes('PACE: DUCAT-BY-DUCAT')
    if (target === 'instant' && isInstant) return true
    if (target === 'staggered' && isStaggered) return true
    if (!isInstant && !isStaggered) return false // pace control not mounted (not planning)
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

async function installObservers(page) {
  await page.evaluate(() => {
    window.__flies = []
    window.__badVeinAt = null
    window.__settledAt = null
    window.__t0 = performance.now()
    if (window.__mo) window.__mo.disconnect()
    const mo = new MutationObserver((muts) => {
      const now = performance.now()
      for (const m of muts) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1 && node.tagName === 'IMG') {
            window.__flies.push({ t: now - window.__t0, src: (node.getAttribute('src') || '').slice(0, 24) })
          }
        }
      }
    })
    mo.observe(document.body, { childList: true, subtree: true })
    window.__mo = mo
    if (window.__poll) clearInterval(window.__poll)
    window.__poll = setInterval(() => {
      const txt = document.body.innerText
      const now = performance.now()
      // NOTE: 'CRACKED DUCAT' alone is a FALSE marker — the DIVE DEPTH tier row
      // always shows "{bombCount} CRACKED DUCATS" (plural) as a static
      // description, present from 'planning' onward regardless of outcome.
      // 'Dive busted.' appears ONLY in the real bad-vein phase status text
      // (both the visible status strip and the aria-live announcer) — confirmed
      // unique via source grep (AssayExperience.tsx:755,3528).
      if (window.__badVeinAt == null && txt.includes('Dive busted')) window.__badVeinAt = now - window.__t0
      if (
        window.__settledAt == null &&
        (txt.includes('RUGGED BY THE DEEP') || txt.includes('SECURED THE HAUL'))
      ) {
        window.__settledAt = now - window.__t0
      }
    }, 15)
  })
}

async function readProbeState(page) {
  return page.evaluate(() => ({
    flies: window.__flies || [],
    badVeinAt: window.__badVeinAt,
    settledAt: window.__settledAt,
    liveImgCount: document.querySelectorAll('img').length,
  }))
}

async function stopObservers(page) {
  await page.evaluate(() => {
    if (window.__mo) window.__mo.disconnect()
    if (window.__poll) clearInterval(window.__poll)
  })
}

async function waitForSettled(page, maxMs) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    const txt = await bodyText(page)
    if (txt.includes('RUGGED BY THE DEEP') || txt.includes('SECURED THE HAUL · ')) {
      // distinguish settled-panel heading from transient hero-pop; settled
      // panel also always carries 'PAYOUT' + a WRECK RECKONING certificate line
    }
    if ((txt.includes('RUGGED BY THE DEEP') || txt.includes('SECURED THE HAUL')) && txt.includes('WRECK RECKONING')) {
      return true
    }
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
    if (!row) return { label: labelDiv.textContent, amount: null, mult: null }
    const amount = row.children[0] ? row.children[0].textContent : null
    const mult = row.children[1] ? row.children[1].textContent : null
    return { label: labelDiv.textContent, amount, mult }
  })
}

async function readHaulRow(page) {
  return page.evaluate(() => {
    const labelDiv = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && d.textContent === 'HAUL')
    if (!labelDiv) return null
    const rowContainer = labelDiv.parentElement
    return rowContainer ? rowContainer.textContent : null
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

async function readHeroPopVisible(page) {
  return page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find((d) => d.textContent && d.textContent.includes('SECURED THE HAUL') && d.getAttribute('aria-hidden') === 'true')
    if (!el) return { present: false }
    const cs = getComputedStyle(el)
    return { present: true, pointerEvents: cs.pointerEvents }
  })
}

async function goToPlanning(page) {
  const txt = await bodyText(page)
  if (txt.includes('ENTER THE DIVE')) {
    await clickText(page, 'ENTER THE DIVE')
    await wait(150)
  }
}

async function clearTrail(page) {
  await clickText(page, 'CLEAR')
  await wait(40)
}

const results = []
const consoleErrors = []

async function runCell({ page, tierLabel, pace, trailSize, cellName, restartMethod }) {
  console.log(`\n=== CELL: ${cellName} ===`)
  await goToPlanning(page)
  await clearTrail(page)
  const tierOk = await setTier(page, tierLabel)
  const paceOk = await setPace(page, pace)
  const painted = await paintTiles(page, trailSize)
  await wait(80)
  console.log(`tierOk=${tierOk} paceOk=${paceOk} painted=${painted}`)

  await installObservers(page)
  const clicked = await clickText(page, 'RUN THE LINE')
  console.log('RUN THE LINE clicked:', clicked)

  // Poll for the bomb-shown (bad-vein) moment and grab a mid-bomb screenshot
  // + live <img> (coin-fly) count AT that instant, before it's overwritten by
  // settle. Runs concurrently with waitForSettled below via a short race loop.
  let midBombShot = false
  const bombWatchStart = Date.now()
  while (Date.now() - bombWatchStart < 2000 && !midBombShot) {
    const st = await page.evaluate(() => ({
      badVein: document.body.innerText.includes('Dive busted'),
      settled: document.body.innerText.includes('WRECK RECKONING'),
    }))
    if (st.badVein && !st.settled) {
      const imgCountAtBomb = await page.evaluate(() => document.querySelectorAll('img').length)
      await page.screenshot({ path: `${OUT}/${cellName}-00-midbomb-imgcount${imgCountAtBomb}.png` })
      console.log(`  mid-bomb frame captured, live <img> count = ${imgCountAtBomb}`)
      midBombShot = true
    } else if (st.settled) {
      break // settled before we ever caught a distinct bad-vein-only frame (fast pace)
    }
    await wait(15)
  }

  const settled = await waitForSettled(page, 8000)
  await wait(150) // let final render settle
  const probe = await readProbeState(page)
  await stopObservers(page)

  const heroPlaque = await readHeroPlaque(page)
  const haulRow = await readHaulRow(page)
  const cert = await readSettledCert(page)
  const heroPop = await readHeroPopVisible(page)
  const won = cert && cert.heading === 'SECURED THE HAUL'

  await page.screenshot({ path: `${OUT}/${cellName}-01-settled-full.png` })
  const railBox = await page.evaluate(() => {
    const labelDiv = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && d.textContent === 'HAUL')
    if (!labelDiv || !labelDiv.parentElement) return null
    const r = labelDiv.parentElement.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  if (railBox) {
    await page.screenshot({
      path: `${OUT}/${cellName}-02-haul-rail-zoom.png`,
      clip: { x: Math.max(0, railBox.x - 6), y: Math.max(0, railBox.y - 6), width: railBox.w + 12, height: railBox.h + 12 },
    })
  }

  const cellResult = {
    cellName,
    tierLabel,
    pace,
    trailSize,
    painted,
    settledReached: settled,
    won,
    fliesTotal: probe.flies.length,
    fliesTimestamps: probe.flies.map((f) => Math.round(f.t)),
    badVeinAtMs: probe.badVeinAt != null ? Math.round(probe.badVeinAt) : null,
    settledAtMs: probe.settledAt != null ? Math.round(probe.settledAt) : null,
    liveImgCountAtCheck: probe.liveImgCount,
    heroPlaque,
    haulRow,
    cert,
    heroPop,
  }
  console.log(JSON.stringify(cellResult, null, 2))

  // ── Dead-end probe from THIS settled state ──
  const preRestartTxt = await bodyText(page)
  const hasDiveAgain = preRestartTxt.includes('DIVE AGAIN')
  const hasSameLine = preRestartTxt.includes('SAME LINE')
  let restartOk = false
  let sameLineTrailPreload = null
  if (restartMethod === 'dive-again') {
    await clickText(page, 'DIVE AGAIN')
    await wait(200)
    const afterTxt = await bodyText(page)
    restartOk = afterTxt.includes('RUN THE LINE') || afterTxt.includes('Select') // planning reached
  } else {
    await clickText(page, 'SAME LINE')
    await wait(200)
    const afterTxt = await bodyText(page)
    restartOk = afterTxt.includes('RUN THE LINE') || afterTxt.includes('run the line')
    sameLineTrailPreload = await page.evaluate(() => {
      const el = [...document.querySelectorAll('span')].find((s) => (s.textContent || '').startsWith('DUCATS · MIN'))
      return el && el.previousElementSibling ? el.previousElementSibling.textContent : null
    })
  }
  const heroPopStillThere = await readHeroPopVisible(page)
  await page.screenshot({ path: `${OUT}/${cellName}-03-after-restart.png` })

  cellResult.deadEndProbe = {
    hasDiveAgain,
    hasSameLine,
    restartMethod,
    restartOk,
    sameLineTrailPreload,
    staleHeroPopAfterRestart: heroPopStillThere.present,
  }
  results.push(cellResult)
  return cellResult
}

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: 'new',
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
})
const page = (await browser.pages())[0]
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})
page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message))

const httpResp = await page.goto(URL, { waitUntil: 'networkidle0' })
console.log('HTTP status:', httpResp.status())
await wait(200)
await page.screenshot({ path: `${OUT}/00-landing.png` })

// ── CELL 1: INSTANT bust (Hadal Trench, 60-tile trail) ──
let attempt = 0
let cell1 = null
while (attempt < 15 && (!cell1 || cell1.won)) {
  cell1 = await runCell({
    page,
    tierLabel: 'HADAL TRENCH',
    pace: 'instant',
    trailSize: 60,
    cellName: `instant-bust-attempt${attempt}`,
    restartMethod: 'same-line',
  })
  attempt++
}

// ── CELL 2: STAGGERED bust (Hadal Trench, 60-tile trail) ──
attempt = 0
let cell2 = null
while (attempt < 15 && (!cell2 || cell2.won)) {
  cell2 = await runCell({
    page,
    tierLabel: 'HADAL TRENCH',
    pace: 'staggered',
    trailSize: 60,
    cellName: `staggered-bust-attempt${attempt}`,
    restartMethod: 'dive-again',
  })
  attempt++
}

// ── CELL 3: INSTANT win (Reef Shelf, 8-tile trail, MIN_TRAIL) ──
attempt = 0
let cell3 = null
while (attempt < 30 && (!cell3 || !cell3.won)) {
  cell3 = await runCell({
    page,
    tierLabel: 'REEF SHELF',
    pace: 'instant',
    trailSize: 8,
    cellName: `instant-win-attempt${attempt}`,
    restartMethod: 'dive-again',
  })
  attempt++
}

// ── CELL 4: STAGGERED win (Reef Shelf, 8-tile trail) ──
attempt = 0
let cell4 = null
while (attempt < 30 && (!cell4 || !cell4.won)) {
  cell4 = await runCell({
    page,
    tierLabel: 'REEF SHELF',
    pace: 'staggered',
    trailSize: 8,
    cellName: `staggered-win-attempt${attempt}`,
    restartMethod: 'same-line',
  })
  attempt++
}

fs.writeFileSync(
  `${OUT}/results.json`,
  JSON.stringify({ cell1, cell2, cell3, cell4, consoleErrors, allAttempts: results }, null, 2),
)
console.log('\n\n=== CONSOLE ERRORS ===', consoleErrors.length)
consoleErrors.forEach((e) => console.log(e))

await browser.close()
console.log('\nDONE. See', OUT)
