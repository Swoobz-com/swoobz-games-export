import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'shots-codotty-r2-holdgate-0707'
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
    if (b) { b.click(); return true }
    return false
  }, re.source)

async function boardGeo(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    return { left: r.left, top: r.top, w: r.width, h: r.height, right: r.right, bottom: r.bottom }
  })
}

async function traceN(page, n) {
  const geo = await boardGeo(page)
  const DIM = 14
  const TILE = geo.w / DIM
  for (let i = 0; i < n; i++) {
    const col = i % DIM, row = Math.floor(i / DIM)
    await page.mouse.click(geo.left + col * TILE + TILE / 2, geo.top + row * TILE + TILE / 2)
    await wait(12)
  }
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

// ── FIX 1 geometry: measure cartouche vs header plaque vs receipt vs board ──
async function measureHeroGeometry(page) {
  return page.evaluate(() => {
    // Cartouche = the element whose CSS animation is the hero pop.
    const all = [...document.querySelectorAll('*')]
    const cartoucheInner = all.find((el) => (getComputedStyle(el).animationName || '').includes('assayHeroPop'))
    const cartouche = cartoucheInner ? cartoucheInner.getBoundingClientRect() : null
    // Header plaque = the small div rendering the live hero label "LINE CLAIMED".
    const labelEl = all.find((el) => el.children.length === 0 && (el.textContent || '').trim() === 'LINE CLAIMED')
    // walk up to the GAUGE_WINDOW plaque (space-between flex row)
    let plaqueEl = labelEl
    for (let i = 0; i < 6 && plaqueEl; i++) {
      const cs = getComputedStyle(plaqueEl)
      if (cs.justifyContent === 'space-between' && cs.display.includes('flex')) break
      plaqueEl = plaqueEl.parentElement
    }
    const plaque = plaqueEl ? plaqueEl.getBoundingClientRect() : null
    // Receipt = the settlement panel; locate via its 'PAYOUT' micro-label.
    const payoutLabel = all.find((el) => el.children.length === 0 && (el.textContent || '').trim() === 'PAYOUT')
    let receiptEl = payoutLabel
    for (let i = 0; i < 5 && receiptEl; i++) receiptEl = receiptEl.parentElement
    const receipt = payoutLabel ? payoutLabel.getBoundingClientRect() : null
    const canvas = document.querySelector('canvas').getBoundingClientRect()
    const rect = (r) => r ? { left: +r.left.toFixed(1), top: +r.top.toFixed(1), right: +r.right.toFixed(1), bottom: +r.bottom.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) } : null
    return {
      cartouche: rect(cartouche),
      headerPlaque: rect(plaque),
      receiptPayoutLabel: rect(receipt),
      board: rect(canvas),
    }
  })
}

// Count how many text lines the "SECURED THE HAUL" hero label occupies + whether
// a money marker precedes the amount.
async function measureLabelAndMarker(page) {
  return page.evaluate(() => {
    const all = [...document.querySelectorAll('*')]
    const cartoucheInner = all.find((el) => (getComputedStyle(el).animationName || '').includes('assayHeroPop'))
    if (!cartoucheInner) return null
    // label span
    const labelSpan = [...cartoucheInner.querySelectorAll('span')].find((s) => (s.textContent || '').trim() === 'SECURED THE HAUL')
    let labelLines = null, labelH = null, lineH = null
    if (labelSpan) {
      const r = labelSpan.getBoundingClientRect()
      const cs = getComputedStyle(labelSpan)
      lineH = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2
      labelH = r.height
      labelLines = Math.round(r.height / lineH)
    }
    // amount span (contains the big number) — the one with a nested "$" marker
    const amountSpan = [...cartoucheInner.querySelectorAll('span')].find((s) => /\d/.test(s.textContent || '') && (s.textContent || '').includes('$'))
    const markerText = amountSpan ? (amountSpan.textContent || '').trim() : null
    return { labelText: labelSpan ? labelSpan.textContent.trim() : null, labelLines, labelH: +(labelH||0).toFixed(1), lineH: +(lineH||0).toFixed(1), amountText: markerText, hasMoneyMarker: markerText ? markerText.includes('$') : false }
  })
}

// ── FIX 2 instrumentation: coin-fly launches + HAUL readout, timed vs bad-vein ──
async function armInstr(page) {
  await page.evaluate(() => {
    window.__t0 = performance.now()
    window.__coinLaunch = []   // t of each coin-fly <img> ADD
    window.__badVeinT = null
    window.__contradictions = [] // frames where HAUL!=0 while hero=LINE BROKE
    window.__haulTrace = []
    const mo = new MutationObserver((muts) => {
      for (const m of muts) for (const node of m.addedNodes) {
        if (node.nodeType === 1 && node.tagName === 'IMG') {
          const src = node.getAttribute('src') || ''
          if (src.startsWith('data:image')) window.__coinLaunch.push(+(performance.now() - window.__t0).toFixed(1))
        }
      }
    })
    mo.observe(document.body, { childList: true, subtree: true })
    window.__mo = mo
    const readHaul = () => {
      const divs = [...document.querySelectorAll('div')]
      const label = divs.find((d) => d.children.length === 0 && d.textContent.trim() === 'HAUL')
      if (!label || !label.parentElement) return null
      const t = label.parentElement.innerText.replace(/\s+/g, ' ').trim()
      // strip the "HAUL" title; the numeric readout is the remainder
      const m = t.replace(/^HAUL\s*/i, '')
      return m
    }
    const heroBroke = () => {
      const all = [...document.querySelectorAll('*')]
      return !!all.find((el) => el.children.length === 0 && (el.textContent || '').trim() === 'LINE BROKE')
    }
    const countCoinImgs = () => [...document.querySelectorAll('img')].filter((i) => (i.getAttribute('src')||'').startsWith('data:image')).length
    window.__timer = setInterval(() => {
      const t = +(performance.now() - window.__t0).toFixed(1)
      const txt = document.body.innerText
      const isBadVein = txt.includes('the line broke. Dive busted')
      if (isBadVein && window.__badVeinT === null) window.__badVeinT = t
      const haul = readHaul()
      const broke = heroBroke()
      const coinImgs = countCoinImgs()
      window.__haulTrace.push({ t, haul, broke, coinImgs, isBadVein })
      // Non-zero HAUL number while hero reads LINE BROKE = the contradiction.
      if (broke && haul && /[1-9]/.test(haul)) window.__contradictions.push({ t, haul })
    }, 8)
  })
}

async function readInstr(page) {
  return page.evaluate(() => {
    const badT = window.__badVeinT
    const launchAfterBomb = badT === null ? [] : window.__coinLaunch.filter((t) => t >= badT - 4)
    // coin imgs present at/after bad-vein (should be 0 — cancelled)
    const framesAfterBomb = badT === null ? [] : window.__haulTrace.filter((f) => f.t >= badT)
    const coinImgsAfterBomb = framesAfterBomb.reduce((m, f) => Math.max(m, f.coinImgs), 0)
    const haulNonZeroWhileBroke = window.__contradictions
    return {
      coinLaunchTimes: window.__coinLaunch,
      badVeinT: badT,
      coinLaunchesAtOrAfterBomb: launchAfterBomb,
      maxCoinImgsAfterBomb: coinImgsAfterBomb,
      contradictions: haulNonZeroWhileBroke,
      totalCoinLaunches: window.__coinLaunch.length,
    }
  })
}

async function stopInstr(page) {
  await page.evaluate(() => { if (window.__mo) window.__mo.disconnect(); if (window.__timer) clearInterval(window.__timer) })
}

async function selectTierAndPace(page, tierRe, pace) {
  await clickText(page, /ENTER THE DIVE/)
  await wait(300)
  await clickText(page, tierRe)
  await wait(150)
  const label = await page.evaluate(() => {
    const el = [...document.querySelectorAll('button, div, span')].find((x) => /^PACE:/.test((x.textContent || '').trim()))
    return el ? el.textContent.trim() : null
  })
  const wantInstant = pace === 'instant'
  const isInstantNow = label && /INSTANT/.test(label)
  if (wantInstant !== isInstantNow) { await clickText(page, /^PACE:/); await wait(120) }
}

async function runBust(page, pace, tag) {
  for (let attempt = 0; attempt < 18; attempt++) {
    await page.goto(URL, { waitUntil: 'load' }); await wait(450)
    await page.keyboard.press('Escape').catch(() => {})
    await selectTierAndPace(page, /HADAL/, pace)
    await traceN(page, 60); await wait(120)
    await armInstr(page)
    await clickText(page, /^RUN THE LINE/)
    let sawBad = false, won = null
    for (let i = 0; i < 90; i++) {
      const bs = await bodyState(page)
      if (bs.badVein) sawBad = true
      if (bs.settledBust || bs.settledWin) { won = bs.settledWin; break }
      await wait(40)
    }
    await wait(150)
    const instr = await readInstr(page)
    await stopInstr(page)
    if (!won && sawBad) {
      console.log(`[${tag}] attempt=${attempt} BUST captured. badVeinT=${instr.badVeinT} totalLaunches=${instr.totalCoinLaunches} launchesAtOrAfterBomb=${JSON.stringify(instr.coinLaunchesAtOrAfterBomb)} maxCoinImgsAfterBomb=${instr.maxCoinImgsAfterBomb} contradictions=${JSON.stringify(instr.contradictions)}`)
      return instr
    }
    console.log(`[${tag}] attempt=${attempt} won=${won} sawBad=${sawBad} — retry`)
  }
  return null
}

async function runWin(page, pace, viewportTag, page412) {
  for (let attempt = 0; attempt < 18; attempt++) {
    await page.goto(URL, { waitUntil: 'load' }); await wait(450)
    await page.keyboard.press('Escape').catch(() => {})
    await selectTierAndPace(page, /REEF/, pace)
    await traceN(page, 8); await wait(120)
    await clickText(page, /^RUN THE LINE/)
    let won = null
    for (let i = 0; i < 90; i++) {
      const bs = await bodyState(page)
      if (bs.settledWin) { won = true; break }
      if (bs.settledBust) { won = false; break }
      await wait(40)
    }
    if (won) {
      await wait(220) // land in the middle of the 1700ms hero hold
      await page.screenshot({ path: `${OUT}/win-hero-${viewportTag}.png` })
      const geo = await measureHeroGeometry(page)
      const lbl = await measureLabelAndMarker(page)
      console.log(`[win-${viewportTag}] attempt=${attempt} geometry=${JSON.stringify(geo)}`)
      console.log(`[win-${viewportTag}] label=${JSON.stringify(lbl)}`)
      return { geo, lbl }
    }
    console.log(`[win-${viewportTag}] attempt=${attempt} won=${won} — retry`)
  }
  return null
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
page.on('console', (m) => { if (m.type() === 'error') console.log('PAGE-ERR:', m.text()) })
const results = {}

// ── FIX 1 + 3 + 4: mobile 412 win-hero geometry + label + marker ──
console.log('=== MOBILE 412 WIN-HERO (FIX1 geometry, FIX3 label, FIX4 marker) ===')
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 })
results.win412 = await runWin(page, 'instant', '412', true)

console.log('=== DESKTOP 1440 WIN-HERO (unchanged control) ===')
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
results.win1440 = await runWin(page, 'instant', '1440', false)

// ── FIX 2: bust coin/HAUL observer — instant (control) + staggered (target) ──
console.log('=== INSTANT BUST (control — must stay 0 coins / HAUL 0) ===')
results.instantBust = await runBust(page, 'instant', 'instant-bust')
console.log('=== STAGGERED BUST (FIX2 target) ===')
results.staggeredBust = await runBust(page, 'staggered', 'staggered-bust')

fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
console.log('=== DONE ===')
await browser.close()
