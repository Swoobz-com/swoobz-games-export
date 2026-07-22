// PASS-3 independent re-verify — CRIT #4(b): board CANVAS keyboard focus ring.
// 3rd-iteration fix per brief: a real sibling <div> overlay (not outline, not
// box-shadow on the canvas itself), gated on the same `hasFocus` state as the
// existing in-canvas keyboard-cursor bracket. Prior TWO passes on this exact
// game found "computed-style-correct but zero visible pixels" (outline
// clipped by overflow:hidden ancestors, then inset box-shadow swallowed by
// the canvas's own paint layer). This pass: (1) sample MANY points along the
// FULL boundary, not one corner, (2) A/B-toggle causation, not just diff.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import { PNG } from 'pngjs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-a11y-verify3-0704'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const tapText = async (page, txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}

function px(png, x, y) {
  const idx = (png.width * Math.round(y) + Math.round(x)) << 2
  return [png.data[idx], png.data[idx + 1], png.data[idx + 2]]
}

function delta(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])
}

async function run(viewport, label, prefix) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
  const page = await browser.newPage()
  await page.setViewport(viewport)
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await wait(400)
  await tapText(page, 'ENTER')
  await wait(500)

  // Dismiss the coachmark first so it can't sit visually over the board edge.
  await tapText(page, '×')
  await wait(200)

  // Tab to the canvas.
  let foundCanvas = false
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab')
    const tag = await page.evaluate(() => document.activeElement && document.activeElement.tagName)
    if (tag === 'CANVAS') { foundCanvas = true; break }
  }
  console.log(`[${label}] reached CANVAS via Tab:`, foundCanvas)

  const rect = await page.evaluate(() => {
    const c = document.activeElement
    const r = c.getBoundingClientRect()
    // The desktop branch puts the ring <div> as a DIRECT sibling of the
    // canvas (canvas.parentElement has 2 children). The mobile/scrollable
    // branch nests the canvas one level deeper (inside its own overflow:auto
    // scrollRef div), so the ring <div> is a sibling of THAT wrapper, one
    // level up from the canvas's own parent. Search both levels generically
    // by matching computed border-color against the expected gold RGB
    // (255,200,61) rather than assuming a fixed DOM depth.
    const GOLD = 'rgb(255, 200, 61)'
    const candidates = []
    for (const level of [c.parentElement, c.parentElement && c.parentElement.parentElement]) {
      if (!level) continue
      for (const el of level.children) {
        if (el === c) continue
        const cs = getComputedStyle(el)
        if (cs.position === 'absolute' && (cs.borderTopColor === GOLD || cs.borderColor === GOLD)) {
          candidates.push(el)
        }
      }
    }
    const sibling = candidates[0] || null
    const sr = sibling ? sibling.getBoundingClientRect() : null
    return {
      canvasRect: { top: r.top, left: r.left, width: r.width, height: r.height },
      hasFocusOverlaySibling: !!sibling,
      siblingBorder: sibling ? getComputedStyle(sibling).border : null,
      siblingRect: sr ? { top: sr.top, left: sr.left, width: sr.width, height: sr.height } : null,
      candidateCount: candidates.length,
    }
  })
  console.log(`[${label}] canvas rect + sibling probe:`, JSON.stringify(rect))

  // Sample against the RING's own rect when found (mobile sizes the ring to
  // the viewport WINDOW, which can differ from the canvas's own scrollable
  // content rect per the source comment) -- falls back to canvasRect only if
  // no ring sibling was found at all.
  const r = rect.siblingRect || rect.canvasRect
  const margin = 10
  const clip = {
    x: Math.max(0, Math.round(r.left - margin)),
    y: Math.max(0, Math.round(r.top - margin)),
    width: Math.round(r.width + margin * 2),
    height: Math.round(r.height + margin * 2),
  }

  const focusedBuf = Buffer.from(await page.screenshot({ clip }))
  fs.writeFileSync(`${OUT}/${prefix}-FOCUSED.png`, focusedBuf)

  // Blur the canvas (real DOM blur -> triggers React onBlur -> hasFocus=false).
  await page.evaluate(() => document.activeElement && document.activeElement.blur())
  await wait(200)
  const blurredBuf = Buffer.from(await page.screenshot({ clip }))
  fs.writeFileSync(`${OUT}/${prefix}-BLURRED.png`, blurredBuf)

  const focusedPng = PNG.sync.read(focusedBuf)
  const blurredPng = PNG.sync.read(blurredBuf)

  // Sample many points along the FULL boundary (not just one corner): top,
  // bottom, left, right edges, each at 10%, 30%, 50%, 70%, 90% along their run,
  // offset a few px inward from the clip edge to land ON the ring band.
  // IMPORTANT: `page.screenshot({clip})` coordinates are CSS px, but the
  // returned PNG's actual pixel dimensions are CSS px * devicePixelRatio
  // (mobile viewport here uses deviceScaleFactor:3) -- sampling raw CSS-px
  // margin/offsets directly into the PNG buffer would silently land 3x too
  // close to the true edge on mobile, a false-negative trap distinct from
  // (but adjacent to) the two already-logged canvas-focus-ring false-positive
  // traps on this game. Scale every CSS-px offset by the actual dpr.
  const w = focusedPng.width
  const h = focusedPng.height
  const dpr = w / clip.width
  const marginDev = margin * dpr
  // The overlay div is `position:absolute; inset:0` inside the SAME parent
  // box as the canvas (parent sized to the canvas), with a 3px border and
  // default content-box sizing -- given all four insets are 0 and width/height
  // are auto, the border is drawn INWARD from the parent's own edge (the
  // outer edge of the border coincides with the canvas's outer edge), so the
  // 3px ring band occupies pixels [margin, margin+3) inside the crop, NOT
  // pixels outside the canvas. Sample INSIDE the canvas edge at several
  // sub-offsets (0..5px in) to straddle the actual 3px band regardless of
  // exact box-sizing assumptions, at multiple offsets AND multiple fractions
  // along each of the 4 full edges (not one corner).
  const fractions = [0.05, 0.1, 0.3, 0.5, 0.7, 0.9, 0.95]
  const insetOffsets = [0, 1, 2, 3, 4, 5].map((o) => o * dpr)
  const points = []
  for (const f of fractions) {
    for (const o of insetOffsets) {
      points.push({ edge: 'top', x: f * w, y: marginDev + o })
      points.push({ edge: 'bottom', x: f * w, y: h - marginDev - o })
      points.push({ edge: 'left', x: marginDev + o, y: f * h })
      points.push({ edge: 'right', x: w - marginDev - o, y: f * h })
    }
  }

  const samples = points.map((p) => {
    const fg = px(focusedPng, p.x, p.y)
    const bg = px(blurredPng, p.x, p.y)
    return { ...p, focusedRGB: fg, blurredRGB: bg, delta: delta(fg, bg) }
  })
  const changedCount = samples.filter((s) => s.delta > 15).length
  console.log(`[${label}] boundary samples (${samples.length} pts, ${changedCount} changed > threshold):`)
  console.log(JSON.stringify(samples, null, 1))

  // Whole-clip pixel diff for context.
  let changedPx = 0
  const total = w * h
  for (let i = 0; i < focusedPng.data.length; i += 4) {
    const d = Math.abs(focusedPng.data[i] - blurredPng.data[i]) + Math.abs(focusedPng.data[i + 1] - blurredPng.data[i + 1]) + Math.abs(focusedPng.data[i + 2] - blurredPng.data[i + 2])
    if (d > 15) changedPx++
  }
  console.log(`[${label}] whole-clip diff: changed=${changedPx} total=${total} pct=${((changedPx / total) * 100).toFixed(3)}%`)

  // A/B causation toggle: re-focus canvas, then explicitly force the overlay
  // sibling's own display off (not the canvas), re-screenshot, confirm the
  // ring disappears purely from that DOM change (not from any other focus
  // side-effect), then restore and confirm it comes back.
  await page.evaluate(() => document.activeElement && document.activeElement.tagName) // no-op
  const canvasHandle = await page.evaluateHandle(() => {
    const cs = [...document.querySelectorAll('canvas.assayFocusable, canvas[class*="assayFocusable"]')]
    return cs[0] || null
  })
  await page.evaluate((c) => c && c.focus(), canvasHandle)
  await wait(200)
  const abBefore = Buffer.from(await page.screenshot({ clip }))
  fs.writeFileSync(`${OUT}/${prefix}-AB-before-refocus.png`, abBefore)

  const toggledOff = await page.evaluate((c) => {
    if (!c) return false
    const GOLD = 'rgb(255, 200, 61)'
    let sibling = null
    for (const level of [c.parentElement, c.parentElement && c.parentElement.parentElement]) {
      if (!level || sibling) continue
      for (const el of level.children) {
        if (el === c) continue
        const cs = getComputedStyle(el)
        if (cs.position === 'absolute' && (cs.borderTopColor === GOLD || cs.borderColor === GOLD)) { sibling = el; break }
      }
    }
    if (!sibling) return 'NO_SIBLING_FOUND'
    sibling.dataset.__forcedHidden = '1'
    sibling.style.setProperty('display', 'none', 'important')
    return true
  }, canvasHandle)
  console.log(`[${label}] A/B toggle - forced overlay display:none ->`, toggledOff)
  await wait(150)
  const abAfterHide = Buffer.from(await page.screenshot({ clip }))
  fs.writeFileSync(`${OUT}/${prefix}-AB-after-hide.png`, abAfterHide)

  // restore
  await page.evaluate((c) => {
    if (!c) return
    let sibling = null
    for (const level of [c.parentElement, c.parentElement && c.parentElement.parentElement]) {
      if (!level || sibling) continue
      for (const el of level.children) {
        if (el.dataset && el.dataset.__forcedHidden === '1') { sibling = el; break }
      }
    }
    if (sibling) sibling.style.removeProperty('display')
  }, canvasHandle)
  await wait(150)
  const abAfterRestore = Buffer.from(await page.screenshot({ clip }))
  fs.writeFileSync(`${OUT}/${prefix}-AB-after-restore.png`, abAfterRestore)

  const pngBefore = PNG.sync.read(abBefore)
  const pngHide = PNG.sync.read(abAfterHide)
  const pngRestore = PNG.sync.read(abAfterRestore)
  const abSamples = samples.map((s) => {
    const b4 = px(pngBefore, s.x, s.y)
    const hide = px(pngHide, s.x, s.y)
    const restore = px(pngRestore, s.x, s.y)
    return { edge: s.edge, x: s.x, y: s.y, before: b4, hidden: hide, restored: restore, deltaBeforeVsHidden: delta(b4, hide), deltaHiddenVsRestored: delta(hide, restore) }
  })
  const causationConfirmedCount = abSamples.filter((s) => s.deltaBeforeVsHidden > 15 && s.deltaHiddenVsRestored > 15).length
  console.log(`[${label}] A/B causation samples (${abSamples.length} pts, ${causationConfirmedCount} confirm ring appears/disappears WITH the sibling div toggle):`)
  console.log(JSON.stringify(abSamples, null, 1))

  await browser.close()
  return { label, foundCanvas, rect, samples, changedCount, changedPx, total, toggledOff, causationConfirmedCount, abSamplesLen: abSamples.length }
}

const results = []
results.push(await run({ width: 1440, height: 900, deviceScaleFactor: 1 }, 'DESKTOP canvas', 'desktop-canvasring'))
results.push(await run({ width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, 'MOBILE canvas', 'mobile-canvasring'))

console.log('=== SUMMARY ===')
console.log(JSON.stringify(results.map((r) => ({ label: r.label, foundCanvas: r.foundCanvas, changedCount: r.changedCount, of: r.samples.length, wholeClipPct: ((r.changedPx / r.total) * 100).toFixed(3), toggledOff: r.toggledOff, causationConfirmedCount: r.causationConfirmedCount, abOf: r.abSamplesLen })), null, 2))
