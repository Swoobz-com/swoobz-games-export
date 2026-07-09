// ROUND-2 RE-VERIFY driver (swoobz-visual-regression-qa, 2026-07-07)
// Task: ABYSS LINE round-2 display polish regression check, 3 viewports
// (desktop 1440x900, Pixel 7 412x915, iPhone 14 Pro 393x852).
// Round-2 changes under test:
//  FIX1: HERO_TOP_NARROW='62%' (was 59%) mobile win-hero anchor clears the
//        in-board "TO WIN"/"LINE CLAIMED"/"LINE BROKE" header plaque.
//  FIX2: staggered bust — live HAUL number+needle zero at the bomb + in-flight
//        coins cancelled (mirrors instant): 0 coin-fly nodes AT/AFTER the
//        exact 'bad-vein' transition.
//  FIX3: win label restack (sun-glyph above heading, nowrap, 1 line) — cosmetic,
//        spot-checked via screenshot only.
//  FIX4: gold "$" marker before the won amount ("$1.24").
// Independent driver: own selectors, own instrumentation, own screenshots dir
// (assay-run/shots-r2-reverify-0707/). Reuses proven techniques from
// visreg-herofix-0707-indep.mjs (mobile pan+touchscreen.tap mechanics, MutationObserver
// <img> coin-fly counter, dense phaseLog poll) per AGENT_MEMORY.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-r2-reverify-0707'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
  pixel7: { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true },
  iphone14pro: { width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
}

function clickText(page, re) {
  return page.evaluate((rs) => {
    const r = new RegExp(rs, 'i')
    const els = [...document.querySelectorAll('button, div, span')]
    const b = els.find(
      (x) => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'),
    )
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
    await wait(20)
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
  const desiredScrollLeft = Math.max(0, Math.min(info.scrollW - info.wrapW, targetX - info.wrapW / 2))
  const desiredScrollTop = Math.max(0, Math.min(info.scrollH - info.wrapH, targetY - info.wrapH / 2))
  await page.evaluate(
    (sl, st) => {
      const c = document.querySelector('canvas')
      const wrap = c.parentElement
      wrap.scrollLeft = sl
      wrap.scrollTop = st
    },
    desiredScrollLeft,
    desiredScrollTop,
  )
  await wait(30)
  const rect2 = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const wrap = c.parentElement
    const wr = wrap.getBoundingClientRect()
    return { left: wr.left, top: wr.top, scrollLeft: wrap.scrollLeft, scrollTop: wrap.scrollTop }
  })
  const onScreenX = rect2.left - rect2.scrollLeft + targetX
  const onScreenY = rect2.top - rect2.scrollTop + targetY
  await page.touchscreen.tap(onScreenX, onScreenY)
  return { onScreenX, onScreenY }
}

async function mobileTrace(page, cells, dim) {
  for (const [col, row] of cells) {
    await mobilePan(page, col, row, dim)
    await wait(70)
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
    await wait(120)
  }
  return null
}

// Coin-fly counter (the ONLY <img> tag in the app, per AGENT_MEMORY grep-confirmed
// fact) PLUS a dense (8ms) poll for the phase-EXCLUSIVE marker "Dive busted."
// (confirmed via grep: appears ONLY in phase.kind==='bad-vein' status text +
// aria-live, never in settled state) so we can timestamp the EXACT bad-vein
// transition and classify every fly as before/at-or-after it.
async function installInstrumentation(page) {
  await page.evaluate(() => {
    window.__flies = []
    window.__t0 = performance.now()
    window.__badVeinT = null
    window.__settledT = null
    const seen = (img) => {
      window.__flies.push({ t: +(performance.now() - window.__t0).toFixed(2) })
    }
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue
          if (n.tagName === 'IMG') seen(n)
          else if (n.querySelectorAll) n.querySelectorAll('img').forEach(seen)
        }
      }
    })
    mo.observe(document.body, { childList: true, subtree: true })
    window.__mo = mo
    window.__phaseTimer = setInterval(() => {
      const txt = document.body.innerText
      if (window.__badVeinT === null && /Dive busted\./.test(txt)) {
        window.__badVeinT = +(performance.now() - window.__t0).toFixed(2)
      }
      if (window.__settledT === null && /RUGGED BY THE DEEP|SECURED THE HAUL/.test(txt)) {
        window.__settledT = +(performance.now() - window.__t0).toFixed(2)
      }
    }, 8)
  })
}
async function readInstrumentation(page) {
  return page.evaluate(() => ({ flies: window.__flies || [], badVeinT: window.__badVeinT, settledT: window.__settledT }))
}
async function stopInstrumentation(page) {
  await page.evaluate(() => {
    if (window.__mo) window.__mo.disconnect()
    if (window.__phaseTimer) clearInterval(window.__phaseTimer)
  })
}

async function readHaulRow(page) {
  return page.evaluate(() => {
    const divs = [...document.querySelectorAll('div')]
    const label = divs.find((d) => d.children.length === 0 && d.textContent.trim() === 'HAUL')
    if (!label) return null
    let el = label
    for (let i = 0; i < 4 && el.parentElement; i++) el = el.parentElement
    return el.innerText.replace(/\s+/g, ' ').trim()
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

async function readPayoutValue(page) {
  return page.evaluate(() => {
    const lab = [...document.querySelectorAll('div,span')].find((x) => (x.textContent || '').trim() === 'PAYOUT')
    if (!lab || !lab.nextElementSibling) return null
    return lab.nextElementSibling.textContent.trim()
  })
}

// The in-board "TO WIN"/"LINE CLAIMED"/"LINE BROKE" HERO PLAQUE row (GAUGE_WINDOW,
// display:flex, justifyContent:space-between, sits directly above the canvas) —
// the element FIX1 must clear on mobile. Selected by: a flex row with
// justifyContent:'space-between' whose text contains a tier name AND one of
// TO WIN/LINE CLAIMED/LINE BROKE/HAUL LIVE.
async function readHeaderPlaqueRect(page) {
  return page.evaluate(() => {
    const divs = [...document.querySelectorAll('div')]
    const el = divs.find((d) => {
      const s = getComputedStyle(d)
      if (s.display !== 'flex' || s.justifyContent !== 'space-between') return false
      const t = d.textContent || ''
      const hasTier = /REEF SHELF|MIDNIGHT ZONE|HADAL TRENCH/i.test(t)
      const hasHero = /TO WIN|LINE CLAIMED|LINE BROKE|HAUL/i.test(t)
      return hasTier && hasHero
    })
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, w: r.width, h: r.height, text: el.innerText.replace(/\s+/g, ' ').trim() }
  })
}

// Settled receipt panel rect: the block containing the "PAYOUT" label.
async function readReceiptRect(page) {
  return page.evaluate(() => {
    const lab = [...document.querySelectorAll('div,span')].find((x) => (x.textContent || '').trim() === 'PAYOUT')
    if (!lab) return null
    let el = lab
    for (let i = 0; i < 3 && el.parentElement; i++) el = el.parentElement
    const rc = el.getBoundingClientRect()
    return { left: rc.left, top: rc.top, right: rc.right, bottom: rc.bottom }
  })
}

// Hero callout box + the raw amount text node (to check the "$" marker sits
// distinctly before the amount, separate from the multiplier text).
async function readHeroBox(page) {
  return page.evaluate(() => {
    const wrap = [...document.querySelectorAll('div[aria-hidden]')].find((d) => {
      const s = getComputedStyle(d)
      return s.zIndex === '20' && /SECURED THE HAUL/i.test(d.textContent || '')
    })
    if (!wrap) return null
    const card = [...wrap.children].find((c) => c.tagName === 'DIV' && getComputedStyle(c).position === 'absolute' && c.textContent.includes('SECURED'))
    const rc = (card || wrap).getBoundingClientRect()
    // Find the amount span specifically (the one containing the "$" marker +
    // formatUsdc number, as opposed to the multiplier span with the trailing x).
    const spans = [...(card || wrap).querySelectorAll('span')]
    const amountSpan = spans.find((s) => /\$\s*[\d.,]+/.test(s.textContent || '') && !/x\s*$/i.test((s.textContent || '').trim()))
    const dollarSpan = spans.find((s) => (s.textContent || '').trim() === '$')
    return {
      text: wrap.textContent.replace(/\s+/g, ' ').trim(),
      rect: { left: rc.left, top: rc.top, right: rc.right, bottom: rc.bottom, w: rc.width, h: rc.height },
      amountText: amountSpan ? amountSpan.textContent.replace(/\s+/g, ' ').trim() : null,
      hasDollarSpan: !!dollarSpan,
    }
  })
}

function intersects(a, b) {
  if (!a || !b) return false
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

const results = []
function record(vp, name, cond, detail) {
  results.push({ vp, name, pass: !!cond, detail: detail || '' })
  console.log(cond ? 'PASS' : 'FAIL', `[${vp}]`, name, '::', detail || '')
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
    const st = r.status()
    if (st >= 400) netErrors.push(`${st} ${r.url()}`)
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
  await wait(450)
  return { page, errors, netErrors }
}

async function dismissOnboarding(page) {
  await page.keyboard.press('Escape').catch(() => {})
  await clickText(page, /skip|got it|dismiss/i).catch(() => {})
  await wait(100)
}

async function forceBust(browser, vpKey, pace, tag) {
  const dim = 14
  for (let attempt = 0; attempt < 16; attempt++) {
    const ctx = await freshPage(browser, vpKey)
    const { page } = ctx
    await dismissOnboarding(page)
    await clickText(page, /ENTER THE DIVE/)
    await wait(300)
    await clickText(page, /HADAL/i)
    await wait(150)
    await ensurePace(page, pace)
    const isDesktop = vpKey === 'desktop'
    const cells = []
    if (isDesktop) {
      for (let row = 3; row < 6; row++) for (let col = 3; col < 13; col++) cells.push([col, row])
      await desktopTrace(page, cells, dim)
    } else {
      for (const row of [4, 5]) for (let col = 3; col < 8; col++) cells.push([col, row])
      await mobileTrace(page, cells, dim)
    }
    await wait(150)
    await installInstrumentation(page)
    await clickText(page, /^RUN THE LINE/)
    let outcome = null
    for (let i = 0; i < 90 && !outcome; i++) {
      await wait(80)
      const t = await bodyText(page)
      if (/RUGGED BY THE DEEP/i.test(t)) outcome = 'bust'
      else if (/SECURED THE HAUL/i.test(t)) outcome = 'win'
    }
    await wait(200)
    const instr = await readInstrumentation(page)
    await stopInstrumentation(page)
    if (outcome === 'bust') {
      const haul = await readHaulRow(page)
      const plaque = await readPlaqueText(page)
      const payout = await readPayoutValue(page)
      await page.screenshot({ path: `${OUT}/${tag}-settled.png` })
      return { ctx, outcome, instr, haul, plaque, payout, attempt }
    }
    await page.close()
  }
  return null
}

async function forceWin(browser, vpKey, pace, tag) {
  const dim = 14
  for (let attempt = 0; attempt < 24; attempt++) {
    const ctx = await freshPage(browser, vpKey)
    const { page } = ctx
    await dismissOnboarding(page)
    await clickText(page, /ENTER THE DIVE/)
    await wait(300)
    await clickText(page, /REEF/i)
    await wait(150)
    await ensurePace(page, pace)
    const isDesktop = vpKey === 'desktop'
    const cells = [
      [4, 4], [5, 4], [6, 4], [7, 4],
      [4, 5], [5, 5], [6, 5], [7, 5],
    ]
    if (isDesktop) await desktopTrace(page, cells, dim)
    else await mobileTrace(page, cells, dim)
    await wait(150)
    // Capture the header plaque rect BEFORE running (still shows TO WIN) —
    // not used for the clearance check (that needs the settled hero), but
    // useful context; the real check reads the plaque AGAIN once settled.
    await clickText(page, /^RUN THE LINE/)
    let outcome = null
    let heroBox = null
    let plaqueRect = null
    for (let i = 0; i < 90 && !outcome; i++) {
      await wait(70)
      const t = await bodyText(page)
      if (/SECURED THE HAUL/i.test(t)) {
        outcome = 'win'
        await wait(350) // let the hero pop-in animation settle
        heroBox = await readHeroBox(page)
        plaqueRect = await readHeaderPlaqueRect(page)
        await page.screenshot({ path: `${OUT}/${tag}-hero.png` })
      } else if (/RUGGED BY THE DEEP/i.test(t)) {
        outcome = 'bust'
      }
    }
    if (outcome === 'win') {
      await wait(1800) // outlive HERO_POP_HOLD_MS, land on settled receipt
      const receiptRect = await readReceiptRect(page)
      const payout = await readPayoutValue(page)
      await page.screenshot({ path: `${OUT}/${tag}-settled.png` })
      return { ctx, outcome, heroBox, plaqueRect, receiptRect, payout, attempt }
    }
    await page.close()
  }
  return null
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })

for (const vpKey of ['desktop', 'pixel7', 'iphone14pro']) {
  console.log(`\n########## VIEWPORT: ${vpKey} ##########`)
  const isMobile = vpKey !== 'desktop'

  // ---- WIN HERO probe: amount+multiplier render, "$" marker, mobile clearance ----
  {
    const r = await forceWin(browser, vpKey, 'instant', `${vpKey}-win-instant`)
    if (!r) {
      record(vpKey, 'win-hero-reached', false, 'never reached a win in retry budget')
    } else {
      record(vpKey, 'win reached', r.outcome === 'win', `outcome=${r.outcome} attempt=${r.attempt}`)
      const heroTxt = r.heroBox ? r.heroBox.text : ''
      record(
        vpKey,
        'win-hero shows $AMOUNT + MULTIPLIER, no clip',
        r.heroBox && /\$\s*\d+\.\d{2}/.test(heroTxt) && /\d+\.\d{2}x/i.test(heroTxt),
        `hero="${heroTxt}"`,
      )
      record(vpKey, 'FIX4: gold "$" marker present, distinct span', r.heroBox && r.heroBox.hasDollarSpan, `amountText="${r.heroBox ? r.heroBox.amountText : null}"`)
      const vp = VIEWPORTS[vpKey]
      const box = r.heroBox ? r.heroBox.rect : null
      const noClip = box && box.left >= -2 && box.top >= -2 && box.right <= vp.width + 2 && box.bottom <= vp.height + 2
      record(vpKey, 'win-hero no clipping (within viewport bounds)', noClip, `box=${JSON.stringify(box)} vp=${vp.width}x${vp.height}`)
      const overlapsReceipt = intersects(box, r.receiptRect)
      record(vpKey, 'win-hero no overlap with settled receipt', !overlapsReceipt, `hero=${JSON.stringify(box)} receipt=${JSON.stringify(r.receiptRect)}`)
      if (isMobile) {
        const plaque = r.plaqueRect
        const clearsHeader = box && plaque && box.top >= plaque.bottom
        const clearance = box && plaque ? +(box.top - plaque.bottom).toFixed(1) : null
        record(
          vpKey,
          'FIX1: mobile win-hero cartouche clears in-board header plaque (top >= plaque.bottom)',
          clearsHeader,
          `hero.top=${box ? box.top.toFixed(1) : null} plaque.bottom=${plaque ? plaque.bottom.toFixed(1) : null} clearance=${clearance}px plaqueText="${plaque ? plaque.text : null}"`,
        )
      }
      if (r.ctx) await r.ctx.page.close()
    }
  }

  // ---- BUST probe (INSTANT pace) — still 0 coin-flies, zeroed readouts ----
  {
    const r = await forceBust(browser, vpKey, 'instant', `${vpKey}-bust-instant`)
    if (!r) {
      record(vpKey, 'bust-reached (instant)', false, 'never reached a bust in retry budget')
    } else {
      record(vpKey, 'bust reached (instant)', r.outcome === 'bust', `attempt=${r.attempt}`)
      record(vpKey, 'INSTANT bust: 0 coin-fly nodes spawned total', r.instr.flies.length === 0, `flies=${JSON.stringify(r.instr.flies)}`)
      // Desktop-only RailShell HAUL row (`showRail && isWide`) genuinely does
      // NOT exist in the DOM at settled on mobile (showRail is gated to
      // planning/assaying/bad-vein only; showSpecimenCases adds settled but
      // that's the DESKTOP branch) — confirmed via AssayExperience.tsx L560/567
      // and AGENT_MEMORY prior finding. null on mobile-at-settled = expected,
      // not a regression; the plaque/payout checks below cover the mobile
      // zero-readout requirement instead.
      if (isMobile) {
        record(vpKey, 'INSTANT bust: HAUL row absent at settled on mobile (by design, showRail gate)', r.haul === null, `haul="${r.haul}"`)
      } else {
        record(vpKey, 'INSTANT bust: HAUL reads zero-state', r.haul && !/\([1-9]\d*\.\d{2}x\)/.test(r.haul), `haul="${r.haul}"`)
      }
      record(
        vpKey,
        'INSTANT bust: in-board plaque = LINE BROKE 0.00 / 0.00x',
        r.plaque && /LINE BROKE/i.test(r.plaque) && /\b0\.00\b/.test(r.plaque) && !/[1-9]\d*\.\d{2}x/.test(r.plaque),
        `plaque="${r.plaque}"`,
      )
      record(vpKey, 'INSTANT bust: settled PAYOUT reads 0.00', r.payout && /^0\.00\b/.test(r.payout), `payout="${r.payout}"`)
      if (r.ctx) await r.ctx.page.close()
    }
  }

  // ---- BUST probe (STAGGERED pace) — FIX2: mechanically confirm 0 coin-fly
  // nodes AT/AFTER the exact bad-vein transition timestamp, and HAUL zeroes
  // by the LINE BROKE frame (both live-during-bad-vein AND at settle) ----
  {
    const r = await forceBust(browser, vpKey, 'staggered', `${vpKey}-bust-staggered`)
    if (!r) {
      record(vpKey, 'bust-reached (staggered)', false, 'never reached a bust in retry budget')
    } else {
      record(vpKey, 'bust reached (staggered)', r.outcome === 'bust', `attempt=${r.attempt}`)
      const badVeinT = r.instr.badVeinT
      const flies = r.instr.flies
      const foundBadVeinMarker = badVeinT !== null && badVeinT !== undefined
      record(vpKey, 'STAGGERED bust: bad-vein transition timestamp captured ("Dive busted." marker)', foundBadVeinMarker, `badVeinT=${badVeinT}`)
      const flownAtOrAfterBomb = foundBadVeinMarker ? flies.filter((f) => f.t >= badVeinT) : flies
      record(
        vpKey,
        'FIX2: 0 coin-fly nodes land AT/AFTER the bomb (in-flight coins cancelled)',
        foundBadVeinMarker && flownAtOrAfterBomb.length === 0,
        `badVeinT=${badVeinT} totalFlies=${flies.length} atOrAfterBomb=${flownAtOrAfterBomb.length} allFlyTimes=${JSON.stringify(flies.map((f) => f.t))}`,
      )
      if (isMobile) {
        record(
          vpKey,
          'FIX2: HAUL row absent at settled on mobile (by design, showRail gate) — mobile zero-readout covered by plaque/PAYOUT checks below',
          r.haul === null,
          `haul="${r.haul}" flies-before-bomb=${flownAtOrAfterBomb ? flies.length - flownAtOrAfterBomb.length : flies.length}`,
        )
      } else {
        record(
          vpKey,
          'FIX2: HAUL reads zero-state at settle (LINE BROKE frame)',
          r.haul && !/\([1-9]\d*\.\d{2}x\)/.test(r.haul),
          `haul="${r.haul}" flies-before-bomb=${flownAtOrAfterBomb ? flies.length - flownAtOrAfterBomb.length : flies.length}`,
        )
      }
      record(
        vpKey,
        'STAGGERED bust: plaque = LINE BROKE 0.00 / 0.00x',
        r.plaque && /LINE BROKE/i.test(r.plaque) && /\b0\.00\b/.test(r.plaque) && !/[1-9]\d*\.\d{2}x/.test(r.plaque),
        `plaque="${r.plaque}"`,
      )
      record(vpKey, 'STAGGERED bust: settled PAYOUT reads 0.00', r.payout && /^0\.00\b/.test(r.payout), `payout="${r.payout}"`)
      if (r.ctx) await r.ctx.page.close()
    }
  }

  // ---- Full flow regression: lobby -> plan -> plunge -> reveal -> settle -> restart ----
  {
    const ctx = await freshPage(browser, vpKey)
    const { page, errors, netErrors } = ctx
    await dismissOnboarding(page)
    const lobbyText = await bodyText(page)
    record(vpKey, 'flow: lobby shows ENTER THE DIVE + DIVE DEPTH tiers', /ENTER THE DIVE/.test(lobbyText) && /(REEF|MIDNIGHT|HADAL)/.test(lobbyText), '')
    await page.screenshot({ path: `${OUT}/${vpKey}-flow-1-lobby.png` })

    await clickText(page, /ENTER THE DIVE/)
    await wait(300)
    const planText = await bodyText(page)
    record(vpKey, 'flow: plan phase shows DIVE DEPTH + CLAIM LINE prompt', /DIVE DEPTH|CLAIM LINE|more ducat/i.test(planText), '')
    await page.screenshot({ path: `${OUT}/${vpKey}-flow-2-plan.png` })

    await clickText(page, /MIDNIGHT/i)
    await wait(120)
    const dim = 14
    const cells8 = [
      [4, 4], [5, 4], [6, 4], [7, 4],
      [4, 5], [5, 5], [6, 5], [7, 5],
    ]
    if (vpKey === 'desktop') await desktopTrace(page, cells8, dim)
    else await mobileTrace(page, cells8, dim)
    await wait(150)
    await clickText(page, /^RUN THE LINE/)
    await wait(400)
    const runningText = await bodyText(page)
    record(vpKey, 'flow: plunge -> reveal phase reached (HAUL live or already settled)', /HAUL/.test(runningText), '')
    await page.screenshot({ path: `${OUT}/${vpKey}-flow-3-reveal.png` })

    let settled = false
    for (let i = 0; i < 60 && !settled; i++) {
      await wait(80)
      const t = await bodyText(page)
      if (/SECURED THE HAUL|RUGGED BY THE DEEP/.test(t)) settled = true
    }
    await wait(300)
    record(vpKey, 'flow: settle phase reached', settled, '')
    await page.screenshot({ path: `${OUT}/${vpKey}-flow-4-settled.png` })

    const restartText = await bodyText(page)
    const hasRestart = /DIVE AGAIN/.test(restartText)
    record(vpKey, 'flow: DIVE AGAIN restart control present', hasRestart, '')
    if (hasRestart) {
      await clickText(page, /DIVE AGAIN/)
      await wait(300)
      const afterRestartText = await bodyText(page)
      record(vpKey, 'flow: restart returns to plan phase (no stuck settled state)', /DIVE DEPTH|CLAIM LINE/i.test(afterRestartText), '')
      await page.screenshot({ path: `${OUT}/${vpKey}-flow-5-restarted.png` })
    }

    // Board/DIVE DEPTH/HAUL gauge/panels sanity — re-confirm the board canvas +
    // DIVE DEPTH tiles + HAUL gauge are all still present post-restart (no
    // regression from the round-2 display-only patch to unrelated chrome).
    const boardStillThere = await page.evaluate(() => !!document.querySelector('canvas'))
    record(vpKey, 'no regression: board canvas present after restart', boardStillThere, '')

    record(vpKey, `console errors == 0 (full flow)`, errors.length === 0, `errors=${JSON.stringify(errors.slice(0, 5))}`)
    record(vpKey, `network 4xx/5xx == 0 (full flow)`, netErrors.length === 0, `netErrors=${JSON.stringify(netErrors.slice(0, 5))}`)
    await page.close()
  }
}

await browser.close()

const fails = results.filter((r) => !r.pass)
console.log('\n=== ROUND-2 RE-VERIFY SUMMARY ===')
console.log('PASS:', results.filter((r) => r.pass).length, '/', results.length)
if (fails.length) {
  console.log('\nFAILURES:')
  fails.forEach((f) => console.log(' -', `[${f.vp}]`, f.name, '::', f.detail))
}
console.log('\nVERDICT:', fails.length === 0 ? 'HOLDGATE PASS' : 'HOLDGATE FAIL')
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
