import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'shots-gameflowqa-bustcoinfly-0707'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const clickText = (page, re) =>
  page.evaluate((rs) => {
    const r = new RegExp(rs, 'i')
    const b = [...document.querySelectorAll('button, div, span')].find(
      (x) =>
        r.test((x.textContent || '').trim()) &&
        (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'),
    )
    if (b) {
      b.click()
      return true
    }
    return false
  }, re.source)

async function boardGeo(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    return { left: r.left, top: r.top, w: r.width, h: r.height }
  })
}

// Trace `n` cells in raster order (row-major, GRID_DIM=14) starting at (0,0).
async function traceN(page, n) {
  const geo = await boardGeo(page)
  const DIM = 14
  const TILE = geo.w / DIM
  const cells = []
  for (let i = 0; i < n; i++) cells.push([i % DIM, Math.floor(i / DIM)])
  for (const [col, row] of cells) {
    await page.mouse.click(geo.left + col * TILE + TILE / 2, geo.top + row * TILE + TILE / 2)
    await wait(12)
  }
  return cells
}

async function readBalance(page) {
  return page.evaluate(() => {
    const divs = [...document.querySelectorAll('div')]
    const label = divs.find((d) => d.children.length === 0 && d.textContent.trim() === 'BALANCE')
    if (!label) return null
    const valEl = label.nextElementSibling
    return valEl ? valEl.textContent.trim() : null
  })
}

async function readHaulRow(page) {
  return page.evaluate(() => {
    const divs = [...document.querySelectorAll('div')]
    const label = divs.find((d) => d.children.length === 0 && d.textContent.trim() === 'HAUL')
    if (!label) return null
    // RailRow wrapper is label.parentElement; its innerText covers the whole row.
    return label.parentElement ? label.parentElement.innerText.replace(/\s+/g, ' ').trim() : null
  })
}

async function bodyState(page) {
  return page.evaluate(() => {
    const txt = document.body.innerText
    return {
      badVein: txt.includes('the line broke. Dive busted'),
      settledBust: txt.includes('RUGGED BY THE DEEP'),
      settledWin: txt.includes('SECURED THE HAUL'),
      assaying: txt.includes('Line running'),
    }
  })
}

async function armInstrumentation(page) {
  await page.evaluate(() => {
    window.__coinFlyCount = 0
    window.__coinFlyTimes = []
    window.__t0 = performance.now()
    window.__phaseLog = []
    let last = ''
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1 && node.tagName === 'IMG') {
            const src = node.getAttribute('src') || ''
            if (src.startsWith('data:image')) {
              window.__coinFlyCount++
              window.__coinFlyTimes.push(+(performance.now() - window.__t0).toFixed(1))
            }
          }
        }
      }
    })
    mo.observe(document.body, { childList: true, subtree: true })
    window.__mo = mo
    window.__phaseTimer = setInterval(() => {
      const txt = document.body.innerText
      let phase = 'other'
      if (txt.includes('the line broke. Dive busted')) phase = 'bad-vein'
      else if (txt.includes('RUGGED BY THE DEEP')) phase = 'settled-bust'
      else if (txt.includes('SECURED THE HAUL')) phase = 'settled-win'
      else if (txt.includes('Line running')) phase = 'assaying'
      if (phase !== last) {
        window.__phaseLog.push({ phase, t: +(performance.now() - window.__t0).toFixed(1) })
        last = phase
      }
    }, 8)
  })
}

async function readInstrumentation(page) {
  return page.evaluate(() => ({
    coinFlyCount: window.__coinFlyCount,
    coinFlyTimes: window.__coinFlyTimes,
    phaseLog: window.__phaseLog,
  }))
}

async function stopInstrumentation(page) {
  await page.evaluate(() => {
    if (window.__mo) window.__mo.disconnect()
    if (window.__phaseTimer) clearInterval(window.__phaseTimer)
  })
}

async function setupRound(page, { pace, trailN }) {
  await page.goto(URL, { waitUntil: 'load' })
  await wait(500)
  // Best-effort onboarding dismiss (ESC + skip/dismiss/start text), harmless if absent.
  await page.keyboard.press('Escape').catch(() => {})
  await clickText(page, /skip|start playing|got it|dismiss/i).catch(() => {})
  await wait(150)
  await clickText(page, /ENTER THE DIVE/)
  await wait(300)
  await clickText(page, /HADAL/) // Hadal Trench, 16 bombs/196 tiles
  await wait(150)
  // Set pace: button label toggles between INSTANT and DUCAT-BY-DUCAT.
  const label = await page.evaluate(() => {
    const el = [...document.querySelectorAll('button, div, span')].find((x) => /^PACE:/.test((x.textContent || '').trim()))
    return el ? el.textContent.trim() : null
  })
  const wantInstant = pace === 'instant'
  const isInstantNow = label && /INSTANT/.test(label)
  if (wantInstant !== isInstantNow) {
    await clickText(page, /^PACE:/)
    await wait(120)
  }
  const paceLabelAfter = await page.evaluate(() => {
    const el = [...document.querySelectorAll('button, div, span')].find((x) => /^PACE:/.test((x.textContent || '').trim()))
    return el ? el.textContent.trim() : null
  })
  await traceN(page, trailN)
  await wait(150)
  return paceLabelAfter
}

async function runBustAttempt(page, pace, trailN, tag) {
  for (let attempt = 0; attempt < 15; attempt++) {
    const paceLabel = await setupRound(page, { pace, trailN })
    const balBefore = await readBalance(page)
    await armInstrumentation(page)
    await clickText(page, /^RUN THE LINE/)
    // Poll body state for up to ~4.5s (well past BAD_VEIN_HOLD_MS=720ms and
    // typical staggered cascade time trailN*90ms) to see if a bust happened.
    let sawBadVein = false
    let sawSettled = false
    let won = null
    const frames = []
    const shotDir = `${OUT}/${tag}-a${attempt}`
    fs.mkdirSync(shotDir, { recursive: true })
    let shotIdx = 0
    for (let i = 0; i < 60; i++) {
      const bs = await bodyState(page)
      if (bs.badVein) sawBadVein = true
      if (bs.settledBust || bs.settledWin) {
        sawSettled = true
        won = bs.settledWin
      }
      if (sawBadVein && !sawSettled) {
        // capture a couple of frames mid-flight during the bad-vein hold
        if (shotIdx < 6) {
          await page.screenshot({ path: `${shotDir}/midflight-${shotIdx}.png` })
          shotIdx++
        }
      }
      frames.push(bs)
      await wait(60)
      if (sawSettled) {
        // grab a couple more frames post-settle to see trailing coin-flies
        for (let j = 0; j < 8; j++) {
          await wait(60)
        }
        break
      }
    }
    await page.screenshot({ path: `${shotDir}/final.png` })
    const balAfter = await readBalance(page)
    const haulAfter = await readHaulRow(page)
    const instr = await readInstrumentation(page)
    await stopInstrumentation(page)
    console.log(`[${tag}] attempt=${attempt} pace=${paceLabel} trailN=${trailN} sawBadVein=${sawBadVein} won=${won} balBefore=${balBefore} balAfter=${balAfter} coinFlyCount=${instr.coinFlyCount}`)
    if (!won && sawBadVein) {
      return { attempt, paceLabel, balBefore, balAfter, haulAfter, ...instr }
    }
  }
  return null
}

async function runWinAttempt(page, pace, trailN, tag) {
  for (let attempt = 0; attempt < 15; attempt++) {
    const paceLabel = await setupRound(page, { pace, trailN })
    const balBefore = await readBalance(page)
    await armInstrumentation(page)
    await clickText(page, /^RUN THE LINE/)
    let won = null
    for (let i = 0; i < 80; i++) {
      const bs = await bodyState(page)
      if (bs.settledBust || bs.settledWin) {
        won = bs.settledWin
        break
      }
      await wait(60)
    }
    await wait(150)
    const balAfter = await readBalance(page)
    const instr = await readInstrumentation(page)
    await stopInstrumentation(page)
    console.log(`[${tag}] attempt=${attempt} pace=${paceLabel} trailN=${trailN} won=${won} balBefore=${balBefore} balAfter=${balAfter} coinFlyCount=${instr.coinFlyCount}`)
    if (won) return { attempt, paceLabel, balBefore, balAfter, ...instr }
  }
  return null
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
page.on('console', (m) => {
  if (m.type() === 'error') console.log('PAGE-CONSOLE-ERROR:', m.text())
})

const results = {}

console.log('=== PROBE 1: INSTANT + forced BUST (Hadal Trench, trail=60) ===')
results.instantBust = await runBustAttempt(page, 'instant', 60, 'instant-bust')

console.log('=== PROBE 2: STAGGERED + forced BUST (Hadal Trench, trail=60) ===')
results.staggeredBust = await runBustAttempt(page, 'staggered', 60, 'staggered-bust')

console.log('=== PROBE 3: INSTANT WIN control (Reef Shelf, trail=8) ===')
// override tier to REEF (fewest bombs) inside setupRound via monkeypatch: simplest, reuse
// a tiny local variant that selects REEF instead of HADAL.
async function setupWinRound(page, pace) {
  await page.goto(URL, { waitUntil: 'load' })
  await wait(500)
  await page.keyboard.press('Escape').catch(() => {})
  await clickText(page, /ENTER THE DIVE/)
  await wait(300)
  await clickText(page, /REEF/)
  await wait(150)
  const label = await page.evaluate(() => {
    const el = [...document.querySelectorAll('button, div, span')].find((x) => /^PACE:/.test((x.textContent || '').trim()))
    return el ? el.textContent.trim() : null
  })
  const wantInstant = pace === 'instant'
  const isInstantNow = label && /INSTANT/.test(label)
  if (wantInstant !== isInstantNow) {
    await clickText(page, /^PACE:/)
    await wait(120)
  }
  await traceN(page, 8)
  await wait(150)
}
async function runWinAttemptReef(page, pace, tag) {
  for (let attempt = 0; attempt < 15; attempt++) {
    await setupWinRound(page, pace)
    const balBefore = await readBalance(page)
    await armInstrumentation(page)
    await clickText(page, /^RUN THE LINE/)
    let won = null
    for (let i = 0; i < 80; i++) {
      const bs = await bodyState(page)
      if (bs.settledBust || bs.settledWin) {
        won = bs.settledWin
        break
      }
      await wait(60)
    }
    await wait(150)
    const balAfter = await readBalance(page)
    const instr = await readInstrumentation(page)
    await stopInstrumentation(page)
    console.log(`[${tag}] attempt=${attempt} pace=${pace} won=${won} balBefore=${balBefore} balAfter=${balAfter} coinFlyCount=${instr.coinFlyCount}`)
    if (won) return { attempt, balBefore, balAfter, ...instr }
  }
  return null
}
results.instantWin = await runWinAttemptReef(page, 'instant', 'instant-win')

console.log('=== PROBE 4: STAGGERED WIN control (Reef Shelf, trail=8) ===')
results.staggeredWin = await runWinAttemptReef(page, 'staggered', 'staggered-win')

fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
console.log('=== RESULTS ===')
console.log(JSON.stringify(results, null, 2))

await browser.close()
