// RE-VERIFY driver (swoobz-game-flow-qa, 2026-07-07) — harness only, no source
// edits. Fresh script targeting the EXACT claimed fix: `setHeroPopVisible(false)`
// in the bust/else branch of AssayExperience.tsx's hero-pop effect (L740-750) +
// the render gate `heroPopVisible && outcome && outcome.won` (L1436). Drives the
// REAL race: WIN a short line -> immediately SAME LINE / DIVE AGAIN -> commit a
// line that BUSTS, on INSTANT pace, at several delays across the prior win's
// 1700ms hero-hold (HERO_POP_HOLD_MS), then mechanically checks the LIVE DOM at
// the bust-settled moment for the specific ephemeral HeroPopCallout node
// (div[aria-hidden] zIndex:20 containing "SECURED THE HAUL") — NOT a bare
// document.body text search, since the persisted settled-receipt heading also
// legitimately renders the string "SECURED THE HAUL" on a REAL win (a known
// false-positive trap logged in AGENT_MEMORY.md for this exact game).
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-holdgate-reverify-0707'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const GRID_DIM = 14
const HERO_HOLD_MS = 1700

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
  pixel7: { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true },
}

function clickText(page, re) {
  return page.evaluate((rs) => {
    const r = new RegExp(rs, 'i')
    const els = [...document.querySelectorAll('button, div, span')]
    const b = els.find((x) => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
    if (b) {
      b.click()
      return b.textContent.trim()
    }
    return null
  }, re.source)
}
const bodyText = (page) => page.evaluate(() => document.body.innerText)

async function boardGeo(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { left: r.left, top: r.top, w: r.width, h: r.height }
  })
}
async function desktopTrace(page, cells, dim) {
  const geo = await boardGeo(page)
  const TILE = geo.w / dim
  for (const [col, row] of cells) {
    await page.mouse.click(geo.left + (col + 0.5) * TILE, geo.top + (row + 0.5) * TILE)
    await wait(15)
  }
}
async function mobilePan(page, col, row, dim) {
  const info = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const wrap = c.parentElement
    const wr = wrap.getBoundingClientRect()
    return { wrapLeft: wr.left, wrapTop: wr.top, wrapW: wr.width, wrapH: wr.height, scrollW: wrap.scrollWidth, scrollH: wrap.scrollHeight }
  })
  if (!info) return null
  const TILE = info.scrollW / dim
  const targetX = (col + 0.5) * TILE
  const targetY = (row + 0.5) * TILE
  const dsl = Math.max(0, Math.min(info.scrollW - info.wrapW, targetX - info.wrapW / 2))
  const dst = Math.max(0, Math.min(info.scrollH - info.wrapH, targetY - info.wrapH / 2))
  await page.evaluate(
    (sl, st) => {
      const c = document.querySelector('canvas')
      const wrap = c.parentElement
      wrap.scrollLeft = sl
      wrap.scrollTop = st
    },
    dsl,
    dst,
  )
  await wait(20)
  const rect2 = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const wrap = c.parentElement
    const wr = wrap.getBoundingClientRect()
    return { left: wr.left, top: wr.top, scrollLeft: wrap.scrollLeft, scrollTop: wrap.scrollTop }
  })
  const onScreenX = rect2.left - rect2.scrollLeft + targetX
  const onScreenY = rect2.top - rect2.scrollTop + targetY
  await page.touchscreen.tap(onScreenX, onScreenY)
}
async function mobileTrace(page, cells, dim) {
  for (const [col, row] of cells) {
    await mobilePan(page, col, row, dim)
    await wait(35)
  }
}
async function ensurePace(page, desired) {
  for (let i = 0; i < 3; i++) {
    const label = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button, div, span')].find((x) => /^PACE:/.test((x.textContent || '').trim()))
      return b ? b.textContent.trim() : null
    })
    if (!label) return null
    const isInstant = /INSTANT/i.test(label)
    if ((desired === 'instant' && isInstant) || (desired === 'staggered' && !isInstant)) return label
    await clickText(page, /^PACE:/)
    await wait(100)
  }
  return null
}

// The MECHANICAL detector for the exact bug class: the ephemeral
// HeroPopCallout wrapper is `div[aria-hidden]` at `zIndex:20` containing
// "SECURED THE HAUL" (AssayExperience.tsx L3248-3260, L3377). The PERSISTED
// settled-receipt heading also renders variants of that string but is NOT
// aria-hidden / zIndex:20 — scoping to this exact signature avoids the
// known false-positive (see AGENT_MEMORY.md, "3 of my own harness findings").
async function heroCartouchePresent(page) {
  return page.evaluate(() => {
    const wrap = [...document.querySelectorAll('div[aria-hidden]')].find((d) => {
      const s = getComputedStyle(d)
      return s.zIndex === '20' && /SECURED THE HAUL/i.test(d.textContent || '')
    })
    return !!wrap
  })
}
async function settledHeading(page) {
  return page.evaluate(() => {
    const lab = [...document.querySelectorAll('div')].find((x) => /^(SECURED THE HAUL|RUGGED BY THE DEEP)$/.test((x.textContent || '').trim()))
    return lab ? lab.textContent.trim() : null
  })
}
async function readPayoutValue(page) {
  return page.evaluate(() => {
    const lab = [...document.querySelectorAll('div,span')].find((x) => (x.textContent || '').trim() === 'PAYOUT')
    if (!lab || !lab.nextElementSibling) return null
    return lab.nextElementSibling.textContent.trim()
  })
}
async function readPlaqueText(page) {
  return page.evaluate(() => {
    const lab = [...document.querySelectorAll('div,span')].find((x) => /^(LINE BROKE|LINE CLAIMED)$/i.test((x.textContent || '').trim()))
    if (!lab) return null
    let el = lab
    for (let i = 0; i < 3 && el.parentElement; i++) el = el.parentElement
    return el.innerText.replace(/\s+/g, ' ').trim()
  })
}
async function readHeroBox(page) {
  return page.evaluate(() => {
    const wrap = [...document.querySelectorAll('div[aria-hidden]')].find((d) => {
      const s = getComputedStyle(d)
      return s.zIndex === '20' && /SECURED THE HAUL/i.test(d.textContent || '')
    })
    if (!wrap) return null
    return { text: wrap.textContent.replace(/\s+/g, ' ').trim() }
  })
}

async function freshPage(browser, vpKey) {
  const page = await browser.newPage()
  const errors = []
  const netErrors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('response', (r) => {
    if (r.status() >= 400) netErrors.push(`${r.status()} ${r.url()}`)
  })
  const vp = VIEWPORTS[vpKey]
  await page.setViewport(vp)
  await page.goto(URL, { waitUntil: 'load' })
  await page.evaluate(() => {
    try {
      window.localStorage.clear()
    } catch {}
  })
  await page.reload({ waitUntil: 'load' })
  await wait(400)
  return { page, errors, netErrors }
}
async function dismissOnboarding(page) {
  await page.keyboard.press('Escape').catch(() => {})
  await clickText(page, /skip|got it|dismiss/i).catch(() => {})
  await wait(100)
}

const trace = (isDesktop, page, cells, dim) => (isDesktop ? desktopTrace(page, cells, dim) : mobileTrace(page, cells, dim))

// Commit a REEF SHELF (lean, lowest bomb density) 8-tile trail on INSTANT
// pace and wait for a WIN. Retries the whole round (re-enter, re-select
// tiles) up to `budget` times if a bust lands instead.
async function commitWinRound(page, isDesktop, budget = 30) {
  for (let attempt = 0; attempt < budget; attempt++) {
    await clickText(page, /REEF/i)
    await wait(80)
    await ensurePace(page, 'instant')
    const cells = isDesktop
      ? [
          [4, 4],
          [5, 4],
          [6, 4],
          [7, 4],
          [4, 5],
          [5, 5],
          [6, 5],
          [7, 5],
        ]
      : [
          [4, 4],
          [5, 4],
          [6, 4],
          [7, 4],
          [4, 5],
          [5, 5],
          [6, 5],
          [7, 5],
        ]
    await trace(isDesktop, page, cells, GRID_DIM)
    await wait(100)
    await clickText(page, /^RUN THE LINE/)
    let heading = null
    for (let i = 0; i < 100 && !heading; i++) {
      await wait(30)
      heading = await settledHeading(page)
    }
    if (heading === 'SECURED THE HAUL') return { attempt, tSettle: Date.now() }
    if (heading === 'RUGGED BY THE DEEP') {
      // Undo: go back to planning via DIVE AGAIN and retry.
      await clickText(page, /DIVE AGAIN/)
      await wait(150)
      continue
    }
    return null // never settled at all — real problem, don't loop forever
  }
  return null
}

// From a WIN's settled screen: wait `delayMs` (a controlled point inside the
// hero hold window), fire the replay control (`SAME LINE` or `DIVE AGAIN`),
// arm a HADAL TRENCH (flooded, highest bomb density) 40-tile trail (or reuse
// the exact prior trail for SAME LINE + swap tier, since `reDiveSameLine`
// only clears phase/committedTrail, not `selectedTier`, and tier changes
// don't touch `trail` either — verified via assayProvider.ts source read),
// run it on INSTANT pace, and poll TIGHTLY (15ms) through the whole
// transition for the win-cartouche signature. Retries the WHOLE win+replay
// chain if the replay itself doesn't bust (keeps the race realistic: any
// bust that lands inside ANY preceding win's hold counts).
async function raceOnce(page, isDesktop, mode, delayMs) {
  await wait(delayMs)
  const tReplayTap = Date.now()
  if (mode === 'sameline') {
    await clickText(page, /^SAME LINE/)
    await wait(60)
    await clickText(page, /HADAL/i) // bump bomb density, keep the exact same trail
  } else {
    await clickText(page, /DIVE AGAIN/)
    await wait(60)
    await clickText(page, /HADAL/i)
    await wait(60)
    const cells = []
    if (isDesktop) {
      for (let row = 3; row < 7; row++) for (let col = 3; col < 13; col++) cells.push([col, row])
    } else {
      for (const row of [3, 4, 5, 6]) for (let col = 3; col < 9; col++) cells.push([col, row])
    }
    await trace(isDesktop, page, cells, GRID_DIM)
  }
  await wait(60)
  await clickText(page, /^RUN THE LINE/)
  const tCommit = Date.now()

  // Tight poll through the transition: every tick, record phase heading +
  // whether the ephemeral win-cartouche node exists RIGHT NOW.
  const ticks = []
  let heading = null
  for (let i = 0; i < 260 && !heading; i++) {
    await wait(15)
    const h = await settledHeading(page)
    const cart = await heroCartouchePresent(page)
    ticks.push({ t: Date.now() - tCommit, heading: h, cartouchePresent: cart })
    if (h) heading = h
  }
  // Keep polling a bit PAST settle too (cover any late-arriving cartouche
  // mount racing the settle render).
  for (let i = 0; i < 40; i++) {
    await wait(15)
    const h = await settledHeading(page)
    const cart = await heroCartouchePresent(page)
    ticks.push({ t: Date.now() - tCommit, heading: h, cartouchePresent: cart })
  }
  return { tReplayTap, tCommit, heading, ticks, gapFromReplayToCommitMs: tCommit - tReplayTap }
}

async function runViewport(vpKey) {
  const isDesktop = vpKey === 'desktop'
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
  const findings = []
  const modes = ['sameline', 'divagain']
  const delays = [150, 800, 1400] // spans the 1700ms HERO_POP_HOLD_MS window

  for (const mode of modes) {
    for (const delayMs of delays) {
      let bustAchieved = false
      let result = null
      let winInfo = null
      const { page, errors, netErrors } = await freshPage(browser, vpKey)
      await dismissOnboarding(page)
      await clickText(page, /ENTER THE DIVE/)
      await wait(250)
      winInfo = await commitWinRound(page, isDesktop)
      if (!winInfo) {
        findings.push({ vpKey, mode, delayMs, pass: false, note: 'never reached a WIN settle to start the race — cannot test' })
        await page.close()
        continue
      }
      // Retry the replay-into-bust leg up to 15x (keeps racing off the
      // MOST RECENT win's hold — still a valid instance of the race).
      for (let attempt = 0; attempt < 15 && !bustAchieved; attempt++) {
        result = await raceOnce(page, isDesktop, mode, delayMs)
        if (result.heading === 'RUGGED BY THE DEEP') {
          bustAchieved = true
        } else if (result.heading === 'SECURED THE HAUL') {
          // Landed another win instead of a bust this attempt — chain
          // straight into another replay attempt from THIS win's settle
          // (still inside a race window relative to ITS OWN hold).
          continue
        } else {
          break // never settled — real problem
        }
      }
      if (!bustAchieved) {
        findings.push({ vpKey, mode, delayMs, pass: false, note: `never reached a BUST to complete the race probe (last heading=${result ? result.heading : 'none'})` })
        await page.close()
        continue
      }
      const staleHeroTicks = result.ticks.filter((t) => t.heading === 'RUGGED BY THE DEEP' && t.cartouchePresent)
      const anyCartoucheDuringOrAfterBust = result.ticks.some((t) => t.cartouchePresent)
      const plaque = await readPlaqueText(page)
      const payout = await readPayoutValue(page)
      const shotTag = `${vpKey}-${mode}-delay${delayMs}`
      await page.screenshot({ path: `${OUT}/${shotTag}.png` })
      findings.push({
        vpKey,
        mode,
        delayMs,
        pass: staleHeroTicks.length === 0 && !anyCartoucheDuringOrAfterBust,
        gapFromReplayToCommitMs: result.gapFromReplayToCommitMs,
        plaque,
        payout,
        staleHeroTickCount: staleHeroTicks.length,
        anyCartoucheDuringOrAfterBust,
        consoleErrors: errors.slice(),
        netErrors: netErrors.slice(),
        note: staleHeroTicks.length === 0 && !anyCartoucheDuringOrAfterBust ? 'clean — no stale win cartouche over the bust' : 'STALE WIN CARTOUCHE DETECTED OVER A BUST',
      })
      await page.close()
    }
  }

  // ---- Legit-win-hero-still-shows check (the fix must not have killed real celebrations) ----
  {
    const { page, errors } = await freshPage(browser, vpKey)
    await dismissOnboarding(page)
    await clickText(page, /ENTER THE DIVE/)
    await wait(250)
    const winInfo = await commitWinRound(page, isDesktop)
    let heroBox = null
    if (winInfo) {
      // sample immediately after the win settle, well inside the hold window
      heroBox = await readHeroBox(page)
      await page.screenshot({ path: `${OUT}/${vpKey}-legit-win-hero.png` })
    }
    findings.push({
      vpKey,
      mode: 'legit-win-hero',
      pass: !!winInfo && !!heroBox && /SECURED THE HAUL/i.test(heroBox.text),
      note: winInfo ? (heroBox ? `hero shows: "${heroBox.text}"` : 'win reached but NO hero cartouche rendered — celebration broken') : 'never reached a win',
      consoleErrors: errors.slice(),
    })
    await page.close()
  }

  // ---- Full loop / regression: lobby -> plan -> active -> settle -> restart, both paces, win + bust ----
  for (const pace of ['instant', 'staggered']) {
    for (const target of ['win', 'bust']) {
      const { page, errors, netErrors } = await freshPage(browser, vpKey)
      await dismissOnboarding(page)
      const lobbyOk = /ENTER THE DIVE/.test(await bodyText(page))
      await clickText(page, /ENTER THE DIVE/)
      await wait(250)
      await clickText(page, target === 'win' ? /REEF/i : /HADAL/i)
      await ensurePace(page, pace)
      const cells =
        target === 'win'
          ? [
              [4, 4],
              [5, 4],
              [6, 4],
              [7, 4],
              [4, 5],
              [5, 5],
              [6, 5],
              [7, 5],
            ]
          : (() => {
              const c = []
              if (isDesktop) for (let row = 3; row < 7; row++) for (let col = 3; col < 13; col++) c.push([col, row])
              else for (const row of [3, 4, 5, 6]) for (let col = 3; col < 9; col++) c.push([col, row])
              return c
            })()
      await trace(isDesktop, page, cells, GRID_DIM)
      await wait(100)
      await clickText(page, /^RUN THE LINE/)
      let heading = null
      for (let i = 0; i < 150 && !heading; i++) {
        await wait(60)
        heading = await settledHeading(page)
      }
      const settledOk = target === 'win' ? heading === 'SECURED THE HAUL' : heading === 'RUGGED BY THE DEEP'
      await wait(200)
      // restart via DIVE AGAIN and confirm no dead-end / stale overlay
      const preRestartCartouche = await heroCartouchePresent(page)
      await clickText(page, /DIVE AGAIN/)
      await wait(250)
      const afterText = await bodyText(page)
      const restartedOk = /DIVE DEPTH|CLAIM LINE|more ducat/i.test(afterText) || /ENTER THE DIVE/.test(afterText)
      findings.push({
        vpKey,
        mode: `loop-${pace}-${target}`,
        pass: lobbyOk && !!heading && settledOk && restartedOk,
        note: `lobbyOk=${lobbyOk} heading=${heading} settledOk=${settledOk} restartedOk=${restartedOk} staleCartoucheAtSettle=${preRestartCartouche}`,
        consoleErrors: errors.slice(),
        netErrors: netErrors.slice(),
      })
      await page.close()
    }
  }

  await browser.close()
  return findings
}

const all = []
for (const vpKey of ['desktop', 'pixel7']) {
  console.log(`\n### VIEWPORT: ${vpKey} ###`)
  const findings = await runViewport(vpKey)
  all.push(...findings)
  for (const f of findings) {
    console.log(f.pass ? 'PASS' : 'FAIL', vpKey, f.mode, f.delayMs !== undefined ? `delay=${f.delayMs}ms` : '', '::', f.note)
  }
}

fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(all, null, 2))
const fails = all.filter((f) => !f.pass)
const allConsoleErrors = all.flatMap((f) => f.consoleErrors || [])
const allNetErrors = all.flatMap((f) => f.netErrors || [])
console.log('\n=== SUMMARY ===')
console.log('PASS:', all.length - fails.length, '/', all.length)
console.log('console errors total:', allConsoleErrors.length, JSON.stringify(allConsoleErrors.slice(0, 10)))
console.log('network 4xx/5xx total:', allNetErrors.length, JSON.stringify(allNetErrors.slice(0, 10)))
if (fails.length) {
  console.log('\nFAILURES:')
  fails.forEach((f) => console.log(' -', JSON.stringify(f)))
}
console.log('\nVERDICT:', fails.length === 0 && allConsoleErrors.length === 0 ? 'HOLDGATE PASS' : 'HOLDGATE FAIL')
