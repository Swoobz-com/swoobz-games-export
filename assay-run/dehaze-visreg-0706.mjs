import puppeteer from 'puppeteer-core'
import { PNG } from 'pngjs'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = process.argv[2] || 'shots-dehaze-visreg-0706'
fs.mkdirSync(OUT, { recursive: true })

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  { name: 'pixel7', width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: 'iphone14pro', width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
]

const clickText = (page, re) =>
  page.evaluate((rs) => {
    const r = new RegExp(rs, 'i')
    const els = [...document.querySelectorAll('button, div, span')]
    const b = els.find(
      (x) => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer')
    )
    if (b) {
      b.click()
      return true
    }
    return false
  }, re.source)

function snakeCells(n) {
  const cells = []
  for (let row = 3; row <= 10 && cells.length < n; row++) {
    const cols = row % 2 ? [3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3]
    for (const col of cols) {
      if (cells.length < n) cells.push([col, row])
    }
  }
  return cells
}

// Clicks ONLY cells in [start, end) of the shared snake path, so repeated calls
// EXTEND the trail instead of re-toggling (deselecting) already-claimed cells.
async function traceRange(page, start, end, isMobile) {
  const geo = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { left: r.left, top: r.top, w: r.width, h: r.height }
  })
  if (!geo) return false
  const TILE = geo.w / 14
  const cells = snakeCells(end).slice(start, end)
  for (const [col, row] of cells) {
    const x = geo.left + col * TILE + TILE / 2
    const y = geo.top + row * TILE + TILE / 2
    if (isMobile) {
      await page.touchscreen.tap(x, y)
    } else {
      await page.mouse.click(x, y)
    }
    await wait(50)
  }
  return true
}

async function currentTrailLen(page) {
  return page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find(
      (e) => /DUCATS\s*·\s*MIN/i.test(e.textContent || '') && e.children.length <= 2
    )
    if (el) {
      const m = (el.textContent || '').match(/(\d+)\s*DUCATS/i)
      if (m) return parseInt(m[1], 10)
    }
    return null
  })
}

// Robust to occasional missed taps (mobile viewport clipping/scroll edge cases):
// clicks NEW cells one at a time (never revisiting an already-clicked cell, so it
// never accidentally toggles a selection OFF) and polls the live CLAIM LINE count
// after each tap, stopping once >= target or a safety cap is hit.
async function ensureTrailAtLeast(page, cursor, target, isMobile, cap = 40) {
  let len = await currentTrailLen(page)
  while ((len === null || len < target) && cursor.i < cap) {
    const geo = await page.evaluate(() => {
      const c = document.querySelector('canvas')
      if (!c) return null
      const r = c.getBoundingClientRect()
      return { left: r.left, top: r.top, w: r.width, h: r.height }
    })
    if (!geo) return len
    const TILE = geo.w / 14
    const [col, row] = snakeCells(cursor.i + 1)[cursor.i]
    cursor.i += 1
    const x = geo.left + col * TILE + TILE / 2
    const y = geo.top + row * TILE + TILE / 2
    if (isMobile) {
      await page.touchscreen.tap(x, y)
    } else {
      await page.mouse.click(x, y)
    }
    await wait(60)
    len = await currentTrailLen(page)
  }
  return len
}

function luminance(r, g, b) {
  const lin = (c) => {
    c /= 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

async function sampleRect(page, x, y, w, h) {
  x = Math.max(0, Math.round(x))
  y = Math.max(0, Math.round(y))
  w = Math.max(1, Math.round(w))
  h = Math.max(1, Math.round(h))
  const buf = await page.screenshot({ type: 'png', clip: { x, y, width: w, height: h } })
  const png = PNG.sync.read(Buffer.from(buf))
  const px = []
  for (let yy = 0; yy < png.height; yy++) {
    for (let xx = 0; xx < png.width; xx++) {
      const idx = (png.width * yy + xx) << 2
      px.push([png.data[idx], png.data[idx + 1], png.data[idx + 2]])
    }
  }
  const n = px.length
  const rAvg = px.reduce((a, p) => a + p[0], 0) / n
  const gAvg = px.reduce((a, p) => a + p[1], 0) / n
  const bAvg = px.reduce((a, p) => a + p[2], 0) / n
  const lums = px.map((p) => luminance(p[0], p[1], p[2]))
  const lMin = Math.min(...lums)
  const lMax = Math.max(...lums)
  const mean = lums.reduce((a, v) => a + v, 0) / n
  const variance = lums.reduce((a, v) => a + (v - mean) ** 2, 0) / n
  return { r: rAvg, g: gAvg, b: bAvg, lumMin: lMin, lumMax: lMax, lumRange: lMax - lMin, lumVariance: variance, n }
}

// 3x3 grid banding heuristic: scan a vertical strip and count "distinct step" transitions
async function bandingScan(page, x, y, h) {
  const buf = await page.screenshot({ type: 'png', clip: { x: Math.max(0, x), y: Math.max(0, y), width: 2, height: Math.max(2, h) } })
  const png = PNG.sync.read(Buffer.from(buf))
  const col = []
  for (let yy = 0; yy < png.height; yy++) {
    const idx = (png.width * yy + 0) << 2
    col.push([png.data[idx], png.data[idx + 1], png.data[idx + 2]])
  }
  let distinct = 0
  let flatRuns = 0
  let curRun = 1
  for (let i = 1; i < col.length; i++) {
    const [r1, g1, b1] = col[i - 1]
    const [r2, g2, b2] = col[i]
    if (r1 === r2 && g1 === g2 && b1 === b2) {
      curRun++
    } else {
      if (curRun >= 6) flatRuns++
      curRun = 1
      distinct++
    }
  }
  return { sampleCount: col.length, distinctTransitions: distinct, flatRunsOf6plus: flatRuns }
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
  const report = { url: URL, viewports: {} }

  for (const vp of VIEWPORTS) {
    const vpReport = { console: [], pageerrors: [], failedRequests: [], phases: {} }
    const page = await browser.newPage()
    page.on('console', (msg) => {
      if (msg.type() === 'error') vpReport.console.push(msg.text())
    })
    page.on('pageerror', (err) => vpReport.pageerrors.push(String(err)))
    page.on('requestfailed', (req) => vpReport.failedRequests.push(req.url() + ' :: ' + (req.failure()?.errorText || '')))
    page.on('response', (res) => {
      if (res.status() >= 400) vpReport.failedRequests.push(res.url() + ' :: HTTP ' + res.status())
    })

    await page.setViewport({
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: vp.deviceScaleFactor,
      isMobile: vp.isMobile,
      hasTouch: vp.hasTouch,
    })
    await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
    await wait(800)

    // Skip the one-time coachmark (equivalent to "after onboarding dismiss") so
    // it never occludes the HUD in the captured baselines.
    await page.evaluate(() => localStorage.setItem('assay_coachmark_seen_v1', '1'))
    await page.reload({ waitUntil: 'load', timeout: 60000 })
    await wait(800)

    // ---- ENTRY (lobby) ----
    await page.screenshot({ path: `${OUT}/${vp.name}-entry.png`, fullPage: vp.isMobile })

    // ---- PLAN phase: open planning, trace a partial (arming) line, screenshot,
    // then EXTEND (non-overlapping) up to MIN_TRAIL(8)+extra so the TO WIN hero
    // arms and updates.
    const openedPlan = await clickText(page, /ENTER THE DIVE/)
    await wait(400)

    const cursor = { i: 0 }
    const trailLenArming = await ensureTrailAtLeast(page, cursor, 5, vp.isMobile) // below MIN_TRAIL=8 -> 'arming' state
    await wait(300)
    await page.screenshot({ path: `${OUT}/${vp.name}-plan-arming.png`, fullPage: vp.isMobile })
    const heroArming = await page.evaluate(() => {
      const els = [...document.querySelectorAll('div')]
      const armEl = els.find((e) => /more ducat/i.test(e.textContent || '') && e.children.length <= 2)
      return armEl ? armEl.textContent.trim() : null
    })

    const trailLenArmed = await ensureTrailAtLeast(page, cursor, 8, vp.isMobile) // reach MIN_TRAIL=8 -> 'armed' / TO WIN
    await wait(300)
    await page.screenshot({ path: `${OUT}/${vp.name}-plan.png`, fullPage: vp.isMobile })

    // TO WIN hero DOM probe (armed state)
    const heroProbe1 = await page.evaluate(() => {
      const els = [...document.querySelectorAll('div')]
      const label = els.find((e) => (e.textContent || '').trim() === 'TO WIN' && e.children.length === 0)
      if (!label) return { found: false }
      const cs = getComputedStyle(label)
      const row = label.nextElementSibling
      let amountFont = null,
        multFont = null,
        amountText = null,
        multText = null
      if (row && row.children && row.children.length >= 2) {
        amountFont = getComputedStyle(row.children[0]).fontSize
        multFont = getComputedStyle(row.children[1]).fontSize
        amountText = row.children[0].textContent
        multText = row.children[1].textContent
      }
      return { found: true, labelFontSize: cs.fontSize, amountFont, multFont, amountText, multText }
    })

    const trailLenExtended = await ensureTrailAtLeast(page, cursor, 18, vp.isMobile) // extend the line further -> hero value should INCREASE
    await wait(300)
    await page.screenshot({ path: `${OUT}/${vp.name}-plan-extended.png`, fullPage: vp.isMobile })
    const heroProbe2 = await page.evaluate(() => {
      const els = [...document.querySelectorAll('div')]
      const label = els.find((e) => (e.textContent || '').trim() === 'TO WIN' && e.children.length === 0)
      if (!label) return { found: false }
      const row = label.nextElementSibling
      let amountText = null
      if (row && row.children && row.children.length >= 2) amountText = row.children[0].textContent
      return { found: true, amountText }
    })

    // readability probe: depth-context labels (should not be ~8.5px)
    const readabilityProbe = await page.evaluate(() => {
      const els = [...document.querySelectorAll('div')]
      const target = els.find((e) => /ceiling/i.test(e.textContent || '') && e.children.length === 0)
      if (!target) return { found: false }
      return { found: true, text: target.textContent.trim(), fontSize: getComputedStyle(target).fontSize }
    })

    // ---- pods-sharp-no-haze probe: sample idle board tiles BEFORE any reveal ----
    // scrollToTile forces the scroll container (mobile pan-window) or no-op
    // (desktop, whole board visible) so the requested tile is guaranteed
    // on-screen before we clip-screenshot it — avoids sampling off-canvas
    // scenic-backdrop pixels on the mobile pan viewport.
    const scrollToTile = (col, row) =>
      page.evaluate(
        ({ col, row }) => {
          const c = document.querySelector('canvas')
          if (!c) return null
          let el = c.parentElement
          for (let i = 0; i < 4 && el; i++) {
            const cs = getComputedStyle(el)
            if (/(auto|scroll)/.test(cs.overflowX) || /(auto|scroll)/.test(cs.overflow)) break
            el = el.parentElement
          }
          const tile = parseFloat(getComputedStyle(c).width) / 14
          if (el && el.scrollWidth > el.clientWidth) {
            el.scrollLeft = Math.max(0, Math.min(el.scrollWidth - el.clientWidth, col * tile - el.clientWidth / 2))
            el.scrollTop = Math.max(0, Math.min(el.scrollHeight - el.clientHeight, row * tile - el.clientHeight / 2))
          }
          const r = c.getBoundingClientRect()
          return { left: r.left, top: r.top, w: r.width, h: r.height, tile }
        },
        { col, row }
      )

    const boardGeo = await page.evaluate(() => {
      const c = document.querySelector('canvas')
      if (!c) return null
      const r = c.getBoundingClientRect()
      // visible = intersection of the canvas's own box with its scroll-clip
      // ancestor's box (the mobile pan-window) if any, else same as canvas.
      let el = c.parentElement
      let containerRect = null
      for (let i = 0; i < 4 && el; i++) {
        const cs = getComputedStyle(el)
        if (/(auto|scroll)/.test(cs.overflowX) || /(auto|scroll)/.test(cs.overflow)) {
          containerRect = el.getBoundingClientRect()
          break
        }
        el = el.parentElement
      }
      const vLeft = containerRect ? Math.max(r.left, containerRect.left) : r.left
      const vTop = containerRect ? Math.max(r.top, containerRect.top) : r.top
      const vRight = containerRect ? Math.min(r.right, containerRect.right) : r.right
      const vBottom = containerRect ? Math.min(r.bottom, containerRect.bottom) : r.bottom
      return { left: r.left, top: r.top, w: r.width, h: r.height, visible: { left: vLeft, top: vTop, w: vRight - vLeft, h: vBottom - vTop } }
    })
    let hazeProbe = null
    if (boardGeo) {
      // Board-crop evidence shot FIRST, at the current (post-trace) scroll
      // position — before the haze-probe scrollToTile() calls below move the
      // mobile pan-window elsewhere. Clipped to the actually-VISIBLE window
      // (canvas ∩ pan-clip-container), never the full off-screen canvas box.
      const vw = Math.max(1, Math.round(boardGeo.visible.w))
      const vh = Math.max(1, Math.round(boardGeo.visible.h))
      await page.screenshot({
        path: `${OUT}/${vp.name}-board-crop.png`,
        clip: { x: Math.max(0, Math.round(boardGeo.visible.left)), y: Math.max(0, Math.round(boardGeo.visible.top)), width: vw, height: vh },
      })
      // Sample TWO unclaimed idle coins: one near TOP edge (row1,col6 — well
      // clear of the traced trail which lives in rows3-10, and clear of the
      // intentionally-KEPT far-corner multiply-falloff darkening) and one at
      // the far corner (row13,col13) to confirm the falloff vignette is still
      // present (it should be DARKER there, but that's the kept effect, not
      // haze). scrollToTile() guarantees each is actually on-screen first.
      const g1 = await scrollToTile(6, 1)
      const centerX = g1.left + 6 * g1.tile + g1.tile * 0.2
      const centerY = g1.top + 1 * g1.tile + g1.tile * 0.2
      const sCenter = await sampleRect(page, centerX, centerY, Math.max(4, g1.tile * 0.6), Math.max(4, g1.tile * 0.6))

      const g2 = await scrollToTile(13, 13)
      const cornerX = g2.left + 13 * g2.tile + g2.tile * 0.2
      const cornerY = g2.top + 13 * g2.tile + g2.tile * 0.2
      const sCorner = await sampleRect(page, cornerX, cornerY, Math.max(4, g2.tile * 0.6), Math.max(4, g2.tile * 0.6))
      hazeProbe = {
        center: {
          avg: { r: Math.round(sCenter.r), g: Math.round(sCenter.g), b: Math.round(sCenter.b) },
          lumRange: sCenter.lumRange,
          lumVariance: sCenter.lumVariance,
          redMinusBlue: Math.round(sCenter.r - sCenter.b),
        },
        farCorner: {
          avg: { r: Math.round(sCorner.r), g: Math.round(sCorner.g), b: Math.round(sCorner.b) },
          lumRange: sCorner.lumRange,
          lumVariance: sCorner.lumVariance,
          redMinusBlue: Math.round(sCorner.r - sCorner.b),
        },
        note:
          'center = idle gold coin away from trail/corner (expect gold-dominant: redMinusBlue clearly > 0, non-trivial lumVariance, NOT cyan-shifted). ' +
          'farCorner = KEPT multiply-falloff darkening zone (expect darker overall but still gold-hued, not flat cyan).',
      }
      await page.screenshot({
        path: `${OUT}/${vp.name}-board-crop.png`,
        clip: { x: Math.round(boardGeo.left), y: Math.round(boardGeo.top), width: Math.round(boardGeo.w), height: Math.round(Math.min(boardGeo.h, 400)) },
      })
    }

    // ---- RUN phase ----
    const ranClicked = await clickText(page, /^RUN THE LINE/)
    await wait(700)
    await page.screenshot({ path: `${OUT}/${vp.name}-run.png`, fullPage: vp.isMobile })
    const heroRunning = await page.evaluate(() => {
      const els = [...document.querySelectorAll('div')]
      const label = els.find((e) => /HAUL/i.test(e.textContent || '') && e.children.length === 0)
      return label ? label.textContent.trim() : null
    })

    // Let it play to settlement
    await wait(4500)
    await page.screenshot({ path: `${OUT}/${vp.name}-settle.png`, fullPage: vp.isMobile })
    const settleText = await page.evaluate(() => document.body.innerText)
    const outcome = /SECURED THE HAUL|LINE CLAIMED/i.test(settleText)
      ? 'WON'
      : /RUGGED BY THE DEEP|LINE BROKE/i.test(settleText)
        ? 'BUST'
        : 'UNKNOWN'

    // ---- fold-clears probe: RUN THE LINE / DIVE AGAIN CTA must be within viewport bounds ----
    const foldProbe = await page.evaluate((vh) => {
      const btns = [...document.querySelectorAll('button, div')]
      const cta = btns.find((b) => /RUN THE LINE|DIVE AGAIN/i.test((b.textContent || '').trim()) && (b.tagName === 'BUTTON' || getComputedStyle(b).cursor === 'pointer'))
      if (!cta) return { found: false }
      const r = cta.getBoundingClientRect()
      return { found: true, bottom: r.bottom, viewportHeight: vh, clears: r.bottom <= vh, top: r.top }
    }, vp.height)

    // ---- overflow probe ----
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      hOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }))

    // ---- banding probe: sample a vertical strip through the deep-water gradient
    // margin OUTSIDE the board card (left edge of the scene, avoiding the board itself)
    let bandingProbe = null
    if (boardGeo) {
      const stripX = Math.max(2, boardGeo.left - 15)
      bandingProbe = await bandingScan(page, stripX, boardGeo.top, boardGeo.h)
    }

    // ---- mobile pan probe (mobile viewports only) ----
    let panProbe = null
    if (vp.isMobile) {
      // Reset to a KNOWN baseline (scrollLeft=0) first — the haze/board-crop
      // probes above deliberately scrolled the pan-window around, so without
      // this reset a "did it pan?" check could spuriously read false (already
      // sitting at the target position from an earlier probe).
      const scrollInfo = await page.evaluate(() => {
        const c = document.querySelector('canvas')
        if (!c) return null
        // scroll container is typically the canvas's parent/ancestor with overflow scroll
        let el = c.parentElement
        for (let i = 0; i < 4 && el; i++) {
          const cs = getComputedStyle(el)
          if (/(auto|scroll)/.test(cs.overflowX) || /(auto|scroll)/.test(cs.overflow)) break
          el = el.parentElement
        }
        if (!el) return null
        el.scrollLeft = 0
        el.scrollTop = 0
        return {
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          scrollLeftBefore: el.scrollLeft,
          pannable: el.scrollWidth > el.clientWidth + 1,
          approxTilesVisible: null,
        }
      })
      if (scrollInfo && scrollInfo.pannable) {
        await page.screenshot({ path: `${OUT}/${vp.name}-pan-before.png` })
        const tileEstimate = scrollInfo.scrollWidth / 14
        // Attempt 1: a real touch-drag gesture over the board (multi-step, matches
        // real finger-pan physics more closely than a single jump).
        const geo2 = await page.evaluate(() => {
          const c = document.querySelector('canvas')
          const r = c.getBoundingClientRect()
          return { left: r.left, top: r.top, w: r.width, h: r.height }
        })
        const startX = geo2.left + geo2.w * 0.8
        const startY = geo2.top + geo2.h * 0.5
        await page.touchscreen.touchStart(startX, startY)
        for (let i = 1; i <= 10; i++) {
          await page.touchscreen.touchMove(startX - i * 15, startY)
          await wait(20)
        }
        await page.touchscreen.touchEnd()
        await wait(300)
        const scrollAfterTouch = await page.evaluate(() => {
          const c = document.querySelector('canvas')
          let el = c.parentElement
          for (let i = 0; i < 4 && el; i++) {
            const cs = getComputedStyle(el)
            if (/(auto|scroll)/.test(cs.overflowX) || /(auto|scroll)/.test(cs.overflow)) break
            el = el.parentElement
          }
          return el ? el.scrollLeft : null
        })

        // Attempt 2 (deterministic ground-truth): drive the scroll container's
        // own scrollLeft directly and confirm the canvas visually re-crops —
        // this validates the pan-WINDOW mechanism itself (an overflow:auto/scroll
        // clip box over the larger fixed-tile canvas), independent of whether this
        // headless run's synthetic touch events are recognized as a native-scroll
        // gesture by the compositor.
        const scrollAfterJS = await page.evaluate(() => {
          const c = document.querySelector('canvas')
          let el = c.parentElement
          for (let i = 0; i < 4 && el; i++) {
            const cs = getComputedStyle(el)
            if (/(auto|scroll)/.test(cs.overflowX) || /(auto|scroll)/.test(cs.overflow)) break
            el = el.parentElement
          }
          if (!el) return null
          el.scrollLeft = el.scrollWidth - el.clientWidth // scroll fully to the right edge
          return el.scrollLeft
        })
        await wait(200)
        await page.screenshot({ path: `${OUT}/${vp.name}-pan-after.png` })
        panProbe = {
          ...scrollInfo,
          approxTilesVisible: Math.round((scrollInfo.clientWidth / tileEstimate) * 10) / 10,
          scrollLeftAfterTouchDrag: scrollAfterTouch,
          pannedByTouchDrag: scrollAfterTouch !== scrollInfo.scrollLeftBefore,
          scrollLeftAfterJS: scrollAfterJS,
          pannedByJSScroll: scrollAfterJS !== scrollInfo.scrollLeftBefore && scrollAfterJS > 0,
        }
      } else {
        panProbe = { pannable: false, note: scrollInfo }
      }
    }

    vpReport.phases = {
      openedPlan,
      trailLenArming,
      heroArming,
      trailLenArmed,
      heroProbe1,
      trailLenExtended,
      heroProbe2,
      readabilityProbe,
      hazeProbe,
      ranClicked,
      heroRunning,
      outcome,
    }
    vpReport.foldProbe = foldProbe
    vpReport.overflow = overflow
    vpReport.bandingProbe = bandingProbe
    vpReport.panProbe = panProbe

    report.viewports[vp.name] = vpReport
    await page.close()
  }

  await browser.close()
  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
}

run().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
