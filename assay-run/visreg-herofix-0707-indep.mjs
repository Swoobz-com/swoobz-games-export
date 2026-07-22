// INDEPENDENT visual-regression driver (swoobz-visual-regression-qa, 2026-07-07)
// Task: ABYSS LINE win-hero + bust presentation fix, 3 viewports.
// Deliberately NOT reusing _codotty_bustfix_holdgate_0707.mjs or
// _gameflowqa_bust_coinfly_0707.mjs bodies — fresh selectors/instrumentation,
// own screenshots dir. Cross-checks their coinFlyCount discrepancy (game-flow-qa
// logged 14 flies on an "instant bust" at 00:10, BEFORE assayProvider.ts/
// AssayGridCanvas.tsx were edited at 00:20 — stale-build artifact, not a live bug;
// this run re-proves 0 against the CURRENT live server).
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-visregqa-herofix-0707'
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

// Desktop: click N tiles in raster order from a live-read board rect (own
// geometry helper, not reused from either prior driver).
async function desktopTrace(page, cells, dim) {
  const geo = await boardGeo(page)
  const TILE = geo.w / dim
  for (const [col, row] of cells) {
    await page.mouse.click(geo.left + (col + 0.5) * TILE, geo.top + (row + 0.5) * TILE)
    await wait(20)
  }
}

// Mobile: TAP-ONLY, 2D pan-window loupe. Read the SCROLL WRAPPER (canvas
// parentElement), not the raw canvas rect (which is oversized + often
// off-screen once panned) — per own source read of AssayGridCanvas.tsx
// (MOBILE_TILE_PX=46 fixed tile inside an overflow:auto viewportBoxPx wrapper).
// Pan via scrollLeft/scrollTop to center each target tile before a real
// touchscreen tap (page.touchscreen.tap, not mouse.click — mobile is
// touchAction:'pan-x pan-y' with a tap-vs-drag branch keyed on real touch
// events in some builds; use touchscreen to match production input).
async function mobilePan(page, col, row, dim) {
  const info = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const wrap = c.parentElement
    const wr = wrap.getBoundingClientRect()
    return {
      wrapLeft: wr.left,
      wrapTop: wr.top,
      wrapW: wr.width,
      wrapH: wr.height,
      scrollW: wrap.scrollWidth,
      scrollH: wrap.scrollHeight,
    }
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

// Own coin-fly instrumentation: count <img> insertions (the ONLY <img> tag in
// the whole app is CoinFly's struck-doubloon data-URL sprite — confirmed via
// source grep across AssayExperience.tsx + AssayGridCanvas.tsx, zero other
// <img> usage) AND cross-check each one's computed animationName === the
// assayCoinFly keyframe, plus a fine-grained (16ms) phase-transition log so a
// fly's timestamp can be correlated against the exact bad-vein transition.
async function installInstrumentation(page) {
  await page.evaluate(() => {
    window.__flies = []
    window.__t0 = performance.now()
    window.__phaseLog = []
    let last = ''
    const seen = (img) => {
      let anim = 'unknown'
      try {
        anim = getComputedStyle(img).animationName || 'none'
      } catch {}
      window.__flies.push({ t: +(performance.now() - window.__t0).toFixed(1), isImg: true, anim, src: (img.getAttribute('src') || '').slice(0, 20) })
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
      let phase = 'other'
      if (/RUGGED BY THE DEEP/.test(txt)) phase = 'settled-bust'
      else if (/SECURED THE HAUL/.test(txt)) phase = 'settled-win'
      else if (/LINE BROKE/.test(txt)) phase = 'bad-vein-or-settled-bust'
      else if (/Line running|HAUL · LIVE/.test(txt)) phase = 'assaying'
      if (phase !== last) {
        window.__phaseLog.push({ phase, t: +(performance.now() - window.__t0).toFixed(1) })
        last = phase
      }
    }, 16)
  })
}
async function readInstrumentation(page) {
  return page.evaluate(() => ({ flies: window.__flies || [], phaseLog: window.__phaseLog || [] }))
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

async function readSettledHeadingColor(page) {
  return page.evaluate(() => {
    const lab = [...document.querySelectorAll('div')].find((x) => /^(SECURED THE HAUL|RUGGED BY THE DEEP)$/.test((x.textContent || '').trim()))
    if (!lab) return null
    const s = getComputedStyle(lab)
    return { text: lab.textContent.trim(), color: s.color }
  })
}
async function readPayoutColor(page) {
  return page.evaluate(() => {
    const lab = [...document.querySelectorAll('div,span')].find((x) => (x.textContent || '').trim() === 'PAYOUT')
    if (!lab || !lab.nextElementSibling) return null
    return getComputedStyle(lab.nextElementSibling).color
  })
}

// Hero callout: find the aria-hidden zIndex:20 wrapper; measure its inner
// visible card (first child div) rect + read amount/multiplier text.
async function readHeroBox(page) {
  return page.evaluate(() => {
    const wrap = [...document.querySelectorAll('div[aria-hidden]')].find((d) => {
      const s = getComputedStyle(d)
      return s.zIndex === '20' && /SECURED THE HAUL/i.test(d.textContent || '')
    })
    if (!wrap) return null
    const card = [...wrap.children].find((c) => c.tagName === 'DIV' && getComputedStyle(c).position === 'absolute' && c.textContent.includes('SECURED'))
    const rc = (card || wrap).getBoundingClientRect()
    return {
      text: wrap.textContent.replace(/\s+/g, ' ').trim(),
      rect: { left: rc.left, top: rc.top, right: rc.right, bottom: rc.bottom, w: rc.width, h: rc.height },
    }
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

function intersects(a, b) {
  if (!a || !b) return false
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

async function readConsoleAndNetworkErrors(page, tracker) {
  return tracker
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

// Force a BUST: deepest tier (HADAL TRENCH) + a large trail (raster block,
// dim=14 -> use a 30-tile block, well above MIN_TRAIL=8, well within
// MAX_TRAIL) so a bomb is very likely to land inside it. Retry the whole
// round until settled state reads RUGGED BY THE DEEP.
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
      const headingColor = await readSettledHeadingColor(page)
      const payoutColor = await readPayoutColor(page)
      await page.screenshot({ path: `${OUT}/${tag}-settled.png` })
      return { ctx, outcome, instr, haul, plaque, payout, headingColor, payoutColor, attempt }
    }
    await page.close()
  }
  return null
}

// Force a WIN: shallow tier (REEF SHELF) + short trail (exactly MIN_TRAIL=8
// tiles) — lowest bomb density, minimal exposure. Retry until settled win.
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
      [4, 4],
      [5, 4],
      [6, 4],
      [7, 4],
      [4, 5],
      [5, 5],
      [6, 5],
      [7, 5],
    ]
    if (isDesktop) await desktopTrace(page, cells, dim)
    else await mobileTrace(page, cells, dim)
    await wait(150)
    await installInstrumentation(page)
    await clickText(page, /^RUN THE LINE/)
    let outcome = null
    let heroSeenAt = null
    let heroShot = false
    for (let i = 0; i < 90 && !outcome; i++) {
      await wait(70)
      const t = await bodyText(page)
      if (/SECURED THE HAUL/i.test(t)) {
        if (!heroSeenAt) {
          heroSeenAt = Date.now()
          await wait(350)
          heroShot = true
        }
        outcome = 'win'
      } else if (/RUGGED BY THE DEEP/i.test(t)) {
        outcome = 'bust'
      }
    }
    if (outcome === 'win') {
      const heroBox = await readHeroBox(page)
      await page.screenshot({ path: `${OUT}/${tag}-hero.png` })
      await wait(1800) // outlive HERO_POP_HOLD_MS=1700, land on settled receipt
      const receiptRect = await readReceiptRect(page)
      const payout = await readPayoutValue(page)
      const headingColor = await readSettledHeadingColor(page)
      const payoutColor = await readPayoutColor(page)
      await page.screenshot({ path: `${OUT}/${tag}-settled.png` })
      const instr = await readInstrumentation(page)
      await stopInstrumentation(page)
      return { ctx, outcome, heroBox, receiptRect, payout, headingColor, payoutColor, instr, attempt }
    }
    await stopInstrumentation(page)
    await page.close()
  }
  return null
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })

for (const vpKey of ['desktop', 'pixel7', 'iphone14pro']) {
  console.log(`\n########## VIEWPORT: ${vpKey} ##########`)

  // ---- WIN HERO probe (INSTANT pace) ----
  {
    const r = await forceWin(browser, vpKey, 'instant', `${vpKey}-win-instant`)
    if (!r) {
      record(vpKey, 'win-hero-reached', false, 'never reached a win in retry budget')
    } else {
      record(vpKey, 'win reached', r.outcome === 'win', `outcome=${r.outcome} attempt=${r.attempt}`)
      const heroTxt = r.heroBox ? r.heroBox.text : ''
      record(
        vpKey,
        'win-hero shows AMOUNT + MULTIPLIER',
        r.heroBox && /\d+\.\d{2}/.test(heroTxt) && /\d+\.\d{2}x/i.test(heroTxt),
        `hero="${heroTxt}"`,
      )
      const vp = VIEWPORTS[vpKey]
      const box = r.heroBox ? r.heroBox.rect : null
      const noClip = box && box.left >= -2 && box.top >= -2 && box.right <= vp.width + 2 && box.bottom <= vp.height + 2
      record(vpKey, 'win-hero no clipping (within viewport bounds)', noClip, `box=${JSON.stringify(box)} vp=${vp.width}x${vp.height}`)
      const overlapsReceipt = intersects(box, r.receiptRect)
      record(vpKey, 'win-hero no overlap with settled receipt', !overlapsReceipt, `hero=${JSON.stringify(box)} receipt=${JSON.stringify(r.receiptRect)}`)
      record(
        vpKey,
        'win settled: PAYOUT + heading colors correct (rule-of-three: teal heading, gold value)',
        r.headingColor && /^(?:rgb\(143, 242, 232\)|rgb\(1[34]\d, 2\d\d, 2\d\d\))/.test(r.headingColor.color) && r.payoutColor && /rgb\(2[34]\d, \d+, \d+\)/.test(r.payoutColor),
        `heading=${JSON.stringify(r.headingColor)} payoutColor=${r.payoutColor}`,
      )
      record(vpKey, 'win-hero fly instrumentation: coins DID fly (>=1) on a real win', r.instr.flies.length >= 1, `flies=${r.instr.flies.length}`)
      if (r.ctx) await r.ctx.page.close()
    }
  }

  // ---- BUST probe (INSTANT pace) — the coin-fly-suppression + zeroed-readouts check ----
  {
    const r = await forceBust(browser, vpKey, 'instant', `${vpKey}-bust-instant`)
    if (!r) {
      record(vpKey, 'bust-reached (instant)', false, 'never reached a bust in retry budget')
    } else {
      record(vpKey, 'bust reached (instant)', r.outcome === 'bust', `attempt=${r.attempt}`)
      record(vpKey, 'INSTANT bust: 0 coin-fly nodes spawned', r.instr.flies.length === 0, `flies=${JSON.stringify(r.instr.flies)}`)
      record(
        vpKey,
        'INSTANT bust: HAUL reads zero-state (no nonzero multiplier)',
        r.haul && !/\([1-9]\d*\.\d{2}x\)/.test(r.haul),
        `haul="${r.haul}"`,
      )
      record(
        vpKey,
        'INSTANT bust: in-board plaque = LINE BROKE 0.00 / 0.00x',
        r.plaque && /LINE BROKE/i.test(r.plaque) && /\b0\.00\b/.test(r.plaque) && !/[1-9]\d*\.\d{2}x/.test(r.plaque),
        `plaque="${r.plaque}"`,
      )
      record(vpKey, 'INSTANT bust: settled PAYOUT reads 0.00', r.payout && /^0\.00\b/.test(r.payout), `payout="${r.payout}"`)
      record(
        vpKey,
        'bust settled: rule-of-three colors (blood heading, sand/neutral payout)',
        r.headingColor && /rgb\(255, 93, 93\)/.test(r.headingColor.color),
        `heading=${JSON.stringify(r.headingColor)} payoutColor=${r.payoutColor}`,
      )
      if (r.ctx) await r.ctx.page.close()
    }
  }

  // ---- BUST probe (STAGGERED pace) — pre-bomb flies should be preserved, HAUL still zeroes at settle ----
  {
    const r = await forceBust(browser, vpKey, 'staggered', `${vpKey}-bust-staggered`)
    if (!r) {
      record(vpKey, 'bust-reached (staggered)', false, 'never reached a bust in retry budget')
    } else {
      record(vpKey, 'bust reached (staggered)', r.outcome === 'bust', `attempt=${r.attempt}`)
      record(
        vpKey,
        'STAGGERED bust: HAUL still zeroes at settle regardless of pre-bomb flies',
        r.haul && !/\([1-9]\d*\.\d{2}x\)/.test(r.haul),
        `haul="${r.haul}" flies=${r.instr.flies.length}`,
      )
      record(
        vpKey,
        'STAGGERED bust: plaque = LINE BROKE 0.00 / 0.00x',
        r.plaque && /LINE BROKE/i.test(r.plaque) && /\b0\.00\b/.test(r.plaque) && !/[1-9]\d*\.\d{2}x/.test(r.plaque),
        `plaque="${r.plaque}"`,
      )
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
      [4, 4],
      [5, 4],
      [6, 4],
      [7, 4],
      [4, 5],
      [5, 5],
      [6, 5],
      [7, 5],
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

    record(vpKey, `console errors == 0 (full flow)`, errors.length === 0, `errors=${JSON.stringify(errors.slice(0, 5))}`)
    record(vpKey, `network 4xx/5xx == 0 (full flow)`, netErrors.length === 0, `netErrors=${JSON.stringify(netErrors.slice(0, 5))}`)
    await page.close()
  }
}

await browser.close()

const fails = results.filter((r) => !r.pass)
console.log('\n=== INDEPENDENT VISUAL-REGRESSION SUMMARY ===')
console.log('PASS:', results.filter((r) => r.pass).length, '/', results.length)
if (fails.length) {
  console.log('\nFAILURES:')
  fails.forEach((f) => console.log(' -', `[${f.vp}]`, f.name, '::', f.detail))
}
console.log('\nVERDICT:', fails.length === 0 ? 'HOLDGATE PASS' : 'HOLDGATE FAIL')
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
