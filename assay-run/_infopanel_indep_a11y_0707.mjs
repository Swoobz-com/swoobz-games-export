// INDEPENDENT audit driver for the ABYSS LINE INFO / HOW-TO-PLAY dialog.
// Written fresh (does not import/reuse the maker's own
// `_infopanel_holdgate_0707.mjs` verification logic) — only reuses shared
// low-level infra (`launch`/`wait` from `_a11yHelpers.mjs`, pixel/contrast
// math from `_a11yContrastCore.mjs`) per repo convention.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import { PNG } from 'pngjs'
import { EXE, URL, wait } from './_a11yHelpers.mjs'

const OUT = 'shots-infopanel-indep-0707'
fs.mkdirSync(OUT, { recursive: true })

const TRIGGER_SEL = 'button[aria-label="How to play · Abyss Line game info"]'
const DIALOG_SEL = '[role="dialog"][aria-labelledby="abyss-info-title"]'

function relLum([r, g, b]) {
  const f = (c) => { const cs = c / 255; return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4) }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
function contrastRgb(c1, c2) {
  const L1 = relLum(c1), L2 = relLum(c2)
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1]
  return (hi + 0.05) / (lo + 0.05)
}
function parseRgb(s) {
  const m = s.match(/rgba?\(([^)]+)\)/)
  if (!m) return null
  const p = m[1].split(',').map((x) => parseFloat(x.trim()))
  return [p[0], p[1], p[2]]
}
function pngPixel(png, x, y) {
  x = Math.round(x); y = Math.round(y)
  const idx = (png.width * y + x) << 2
  return [png.data[idx], png.data[idx + 1], png.data[idx + 2]]
}

async function launchOwn(viewport) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: viewport })
  const page = (await browser.pages())[0]
  const consoleErrors = []
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push('CONSOLE: ' + m.text()) })
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await wait(600)
  return { browser, page, consoleErrors }
}

async function activeInfo(page) {
  return page.evaluate((triggerSel, dlgSel) => {
    const a = document.activeElement
    const trigger = document.querySelector(triggerSel)
    const dlg = document.querySelector(dlgSel)
    if (!a) return { isTrigger: false, insideDialog: false, tag: null, label: null }
    return {
      isTrigger: a === trigger,
      insideDialog: !!(dlg && dlg.contains(a)),
      tag: a.tagName,
      label: a.getAttribute?.('aria-label') || a.textContent?.trim()?.slice(0, 24) || null,
    }
  }, TRIGGER_SEL, DIALOG_SEL)
}
async function dialogOpen(page) { return page.evaluate((s) => !!document.querySelector(s), DIALOG_SEL) }

async function focusRingVisible(page, selector, outTag) {
  // Blur everything, screenshot the element unfocused; focus it via a real
  // Tab press sequence isn't guaranteed for arbitrary selectors, so we focus
  // programmatically then verify a REAL Tab lands there too where relevant.
  const rect = await page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  }, selector)
  if (!rect) return { ok: false, reason: 'not found' }
  const pad = 8
  const clip = {
    x: Math.max(0, Math.round(rect.x - pad)),
    y: Math.max(0, Math.round(rect.y - pad)),
    width: Math.round(rect.w + pad * 2),
    height: Math.round(rect.h + pad * 2),
  }
  await page.evaluate(() => document.activeElement && document.activeElement.blur())
  await wait(80)
  const blurredPath = `${OUT}/${outTag}-blurred.png`
  await page.screenshot({ path: blurredPath, clip })
  await page.evaluate((sel) => document.querySelector(sel)?.focus(), selector)
  await wait(80)
  const focusedPath = `${OUT}/${outTag}-focused.png`
  await page.screenshot({ path: focusedPath, clip })
  const a = PNG.sync.read(fs.readFileSync(blurredPath))
  const b = PNG.sync.read(fs.readFileSync(focusedPath))
  let diffPixels = 0
  const total = a.width * a.height
  for (let i = 0; i < a.data.length; i += 4) {
    const dr = Math.abs(a.data[i] - b.data[i])
    const dg = Math.abs(a.data[i + 1] - b.data[i + 1])
    const db = Math.abs(a.data[i + 2] - b.data[i + 2])
    if (dr + dg + db > 30) diffPixels++
  }
  const pct = (diffPixels / total) * 100
  return { ok: pct > 1, diffPct: Number(pct.toFixed(2)), blurredPath, focusedPath }
}

/** Analytical CSS linear-gradient background solver — used instead of
 *  pixel-sampling "clear space near the text" because several target spans
 *  (e.g. "CLAIM LINE", "busts") sit inline mid-paragraph with NO guaranteed
 *  clear column beside them; a nearby pixel sample risks landing on an
 *  adjacent glyph's anti-aliased edge (confirmed: an initial pixel-sample
 *  pass produced contaminated garbage values, e.g. 3.73:1 / 2.33:1, that
 *  don't match the visually-obvious high-contrast screenshot). The dialog's
 *  OWN computed `backgroundImage` is read live (not hardcoded) and the exact
 *  CSS gradient-line projection algorithm is applied per spec, giving the
 *  true background color under any (x,y) with zero glyph-contamination risk. */
function solveGradientBg(gradientStr, boxW, boxH, px, py) {
  // gradientStr like: "linear-gradient(160deg, rgb(16, 48, 66) 0%, rgb(8, 27, 40) 60%, rgb(3, 9, 15) 100%)"
  const angleMatch = gradientStr.match(/linear-gradient\(\s*([\d.]+)deg/)
  const angle = angleMatch ? parseFloat(angleMatch[1]) : 180
  // Computed style omits the percentage on implicit-position stops (typically
  // the first == 0% and last == 100%) — capture it as optional and backfill.
  const stopRe = /rgba?\(([^)]+)\)\s*(?:([\d.]+)%)?/g
  const stops = []
  let m
  while ((m = stopRe.exec(gradientStr))) {
    const parts = m[1].split(',').map((s) => parseFloat(s.trim()))
    stops.push({ rgb: [parts[0], parts[1], parts[2]], pct: m[2] != null ? parseFloat(m[2]) / 100 : null })
  }
  if (stops.length < 2) return null
  if (stops[0].pct == null) stops[0].pct = 0
  if (stops[stops.length - 1].pct == null) stops[stops.length - 1].pct = 1
  // Backfill any remaining nulls evenly between known neighbors (not needed
  // for this specific 3-stop gradient, but kept general/robust).
  for (let i = 1; i < stops.length - 1; i++) {
    if (stops[i].pct == null) {
      let j = i + 1
      while (stops[j].pct == null) j++
      const span = stops[j].pct - stops[i - 1].pct
      const step = span / (j - i + 1)
      for (let k = i; k < j; k++) stops[k].pct = stops[i - 1].pct + step * (k - i + 1)
    }
  }
  const rad = (angle * Math.PI) / 180
  const dx = Math.sin(rad), dy = -Math.cos(rad)
  const L = Math.abs(boxW * dx) + Math.abs(boxH * dy)
  const cx = px - boxW / 2, cy = py - boxH / 2
  const tCenter = cx * dx + cy * dy
  const t = Math.min(1, Math.max(0, (tCenter + L / 2) / L))
  let lo = stops[0], hi = stops[stops.length - 1]
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].pct && t <= stops[i + 1].pct) { lo = stops[i]; hi = stops[i + 1]; break }
  }
  const span = hi.pct - lo.pct || 1
  const frac = (t - lo.pct) / span
  return [0, 1, 2].map((i) => lo.rgb[i] + (hi.rgb[i] - lo.rgb[i]) * frac)
}

async function textContrast(page, needle, { bgHex = null } = {}) {
  // Ground-truth: read the ACTUAL computed color of the span, plus its rect,
  // PLUS the NEAREST ancestor's own opaque background (walking up from the
  // text's parent to the dialog root) — text can sit directly on the card's
  // own CARD_BG gradient OR on a nested opaque layer with ITS OWN background
  // (e.g. the CLOSE button's `BRASS_BTN_DIM` gradient), and using the wrong
  // layer silently produces a bogus ratio (confirmed: naively always using
  // the dialog root's gradient gave the CLOSE button text a false 16.8:1
  // instead of its real ~9-11:1 against its own darker button fill).
  const info = await page.evaluate((needle) => {
    const dlg = document.querySelector('[role="dialog"]')
    const walker = document.createTreeWalker(dlg || document.body, NodeFilter.SHOW_TEXT)
    let node
    while ((node = walker.nextNode())) {
      const t = (node.textContent || '').trim()
      if (t && t.includes(needle)) {
        const range = document.createRange()
        range.selectNodeContents(node)
        const r = [...range.getClientRects()].find((rr) => rr.width > 0 && rr.height > 0)
        if (!r) continue
        const cs = getComputedStyle(node.parentElement)
        // Walk up from the text's parent to find the nearest element with a
        // real (non-'none') backgroundImage, OR a non-transparent
        // backgroundColor, stopping at (and including) the dialog root.
        let bgEl = node.parentElement
        let bgLayer = null
        while (bgEl) {
          const bcs = getComputedStyle(bgEl)
          if (bcs.backgroundImage && bcs.backgroundImage !== 'none') {
            bgLayer = { backgroundImage: bcs.backgroundImage, kind: 'gradient' }
            break
          }
          const cm = bcs.backgroundColor.match(/rgba?\(([^)]+)\)/)
          if (cm) {
            const p = cm[1].split(',').map((s) => parseFloat(s.trim()))
            const alpha = p[3] !== undefined ? p[3] : 1
            if (alpha > 0.01) { bgLayer = { backgroundImage: `linear-gradient(180deg, rgba(${p[0]},${p[1]},${p[2]},${alpha}) 0%, rgba(${p[0]},${p[1]},${p[2]},${alpha}) 100%)`, kind: 'solid' }; break }
          }
          if (bgEl === dlg) break
          bgEl = bgEl.parentElement
        }
        if (!bgLayer) bgEl = dlg
        const bgRect = bgEl.getBoundingClientRect()
        return {
          text: t.slice(0, 60), color: cs.color, fontSize: cs.fontSize, fontWeight: cs.fontWeight,
          rect: { x: r.x, y: r.y, w: r.width, h: r.height },
          bgRect: { x: bgRect.x, y: bgRect.y, w: bgRect.width, h: bgRect.height },
          bgLayer,
          bgTag: bgEl.tagName,
        }
      }
    }
    return null
  }, needle)
  if (!info) return { ok: false, reason: 'not found', needle }
  const fg = parseRgb(info.color)
  const centerX = info.rect.x + info.rect.w / 2 - info.bgRect.x
  const centerY = info.rect.y + info.rect.h / 2 - info.bgRect.y
  const bg = solveGradientBg(info.bgLayer.backgroundImage, info.bgRect.w, info.bgRect.h, centerX, centerY)
  if (!bg) return { ok: false, reason: 'gradient not parsed', needle, bgLayer: info.bgLayer }
  const ratio = contrastRgb(fg, bg)
  return { ok: true, needle, text: info.text, fg, bg: bg.map((v) => Math.round(v)), fontSize: info.fontSize, fontWeight: info.fontWeight, bgTag: info.bgTag, ratio: Number(ratio.toFixed(2)) }
}

async function run(viewport, tag) {
  const { browser, page, consoleErrors } = await launchOwn(viewport)
  const res = { tag, viewport }

  // ---- CHECK 1: dialog semantics ----
  await page.click(TRIGGER_SEL)
  await wait(350)
  res.semantics = await page.evaluate((dlgSel) => {
    const d = document.querySelector(dlgSel)
    if (!d) return { found: false }
    const labelledbyId = d.getAttribute('aria-labelledby')
    const titleEl = labelledbyId ? document.getElementById(labelledbyId) : null
    const titleRect = titleEl ? titleEl.getBoundingClientRect() : null
    return {
      found: true,
      role: d.getAttribute('role'),
      ariaModal: d.getAttribute('aria-modal'),
      labelledby: labelledbyId,
      titleFound: !!titleEl,
      titleText: titleEl ? titleEl.textContent.trim() : null,
      titleVisible: !!(titleRect && titleRect.width > 0 && titleRect.height > 0),
    }
  }, DIALOG_SEL)

  // ---- CHECK: focus moves INTO the dialog on open (mouse-opened) ----
  res.focusOnOpenMouse = await activeInfo(page)

  // ---- CHECK 2a: focus return on Esc ----
  await page.keyboard.press('Escape')
  await wait(300)
  res.escCloses = !(await dialogOpen(page))
  res.focusAfterEsc = await activeInfo(page)

  // ---- CHECK 2b: keyboard-only reach + open ----
  await page.evaluate(() => document.activeElement && document.activeElement.blur())
  let tabPresses = 0
  let reachedTrigger = false
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab')
    tabPresses++
    const st = await activeInfo(page)
    if (st.isTrigger) { reachedTrigger = true; break }
  }
  res.keyboardReachedTrigger = { reached: reachedTrigger, tabPresses }
  if (reachedTrigger) {
    await page.keyboard.press('Enter')
    await wait(300)
    res.openedByKeyboard = await dialogOpen(page)
    res.focusOnOpenKeyboard = await activeInfo(page)
  }

  // ---- CHECK 3: Tab containment — full forward cycle from first focusable ----
  const containment = { forwardTrace: [], escapedForward: false, wrappedForward: false, backwardTrace: [], escapedBackward: false, wrappedBackward: false }
  if (await dialogOpen(page)) {
    const focusableCount = await page.evaluate((dlgSel) => {
      const d = document.querySelector(dlgSel)
      return d.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])').length
    }, DIALOG_SEL)
    // Forward: press Tab focusableCount+2 times, expect to land back on the
    // FIRST focusable exactly at press #focusableCount (a clean wrap), and
    // NEVER leave the dialog.
    for (let i = 0; i < focusableCount + 2; i++) {
      await page.keyboard.press('Tab')
      const st = await activeInfo(page)
      containment.forwardTrace.push(st)
      if (!st.insideDialog) containment.escapedForward = true
    }
    const firstLabel = containment.forwardTrace[0]?.label
    containment.wrappedForward = containment.forwardTrace[focusableCount]?.label === firstLabel
    // Backward from wherever we are now: Shift+Tab focusableCount+2 times.
    for (let i = 0; i < focusableCount + 2; i++) {
      await page.keyboard.down('Shift')
      await page.keyboard.press('Tab')
      await page.keyboard.up('Shift')
      const st = await activeInfo(page)
      containment.backwardTrace.push(st)
      if (!st.insideDialog) containment.escapedBackward = true
    }
    containment.focusableCount = focusableCount
  }
  res.tabContainment = containment

  // Reset to a known focused-in-dialog state, then close via Escape and
  // re-verify one more time (belt-and-braces on the keyboard path).
  await page.keyboard.press('Escape')
  await wait(250)
  res.closedAfterContainmentTrace = !(await dialogOpen(page))

  // ---- CHECK 2c: focus return via bottom CLOSE button, KEYBOARD-activated ----
  await page.click(TRIGGER_SEL)
  await wait(300)
  // Tab to the bottom CLOSE button specifically (last focusable).
  let landedOnClose = false
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab')
    const st = await activeInfo(page)
    if (st.label === 'CLOSE') { landedOnClose = true; break }
  }
  res.tabReachedBottomClose = landedOnClose
  if (landedOnClose) {
    await page.keyboard.press('Enter')
    await wait(300)
    res.closedByKeyboardCloseBtn = !(await dialogOpen(page))
    res.focusAfterKeyboardCloseBtn = await activeInfo(page)
  }

  // ---- CHECK 2d: focus return via MOUSE click on bottom CLOSE button ----
  await page.click(TRIGGER_SEL)
  await wait(300)
  const clicked = await page.evaluate((dlgSel) => {
    const d = document.querySelector(dlgSel)
    const btn = d && [...d.querySelectorAll('button')].find((b) => b.textContent.trim() === 'CLOSE')
    if (!btn) return false
    btn.click()
    return true
  }, DIALOG_SEL)
  await wait(300)
  res.mouseCloseClicked = clicked
  res.closedByMouseCloseBtn = !(await dialogOpen(page))
  res.focusAfterMouseCloseBtn = await activeInfo(page)

  // ---- CHECK 2e: focus return via the top "×" close (mouse) ----
  await page.click(TRIGGER_SEL)
  await wait(300)
  await page.click('[aria-label="Close how to play"]')
  await wait(300)
  res.closedByXBtn = !(await dialogOpen(page))
  res.focusAfterXBtn = await activeInfo(page)

  // ---- CHECK 4: focus indicator visibility (trigger + 3 interactive dialog controls) ----
  res.focusRings = {}
  res.focusRings.trigger = await focusRingVisible(page, TRIGGER_SEL, `${tag}-trigger`)
  await page.click(TRIGGER_SEL)
  await wait(300)
  res.focusRings.closeX = await focusRingVisible(page, '[aria-label="Close how to play"]', `${tag}-closeX`)
  res.focusRings.bottomClose = await focusRingVisible(page, 'button', `${tag}-bottomClose-SKIP`) // placeholder, replaced below
  // bottom CLOSE isn't uniquely selectable by tag alone; use text match via a data hook.
  const bottomCloseSelectorWorks = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]')
    const btn = d && [...d.querySelectorAll('button')].find((b) => b.textContent.trim() === 'CLOSE')
    if (btn) { btn.setAttribute('data-probe-close', '1'); return true }
    return false
  })
  if (bottomCloseSelectorWorks) {
    res.focusRings.bottomClose = await focusRingVisible(page, '[data-probe-close="1"]', `${tag}-bottomClose`)
  }

  // ---- CHECK 5: contrast ----
  res.contrast = {}
  res.contrast.title = await textContrast(page, 'HOW TO PLAY')
  res.contrast.subtitle = await textContrast(page, 'ABYSS LINE')
  res.contrast.eyebrowTheDive = await textContrast(page, 'THE DIVE')
  res.contrast.claimLine = await textContrast(page, 'CLAIM LINE')
  res.contrast.runTheLine = await textContrast(page, 'RUN THE LINE')
  res.contrast.seaMine = await textContrast(page, 'sea-mine')
  res.contrast.busts = await textContrast(page, 'busts')
  res.contrast.rtpProse = await textContrast(page, 'return to player')
  res.contrast.provablyFair = await textContrast(page, 'PROVABLY FAIR')
  res.contrast.glassBoxProse = await textContrast(page, 'Glass Box receipt')
  res.contrast.closeButtonText = await textContrast(page, 'CLOSE')
  res.contrast.haulLabel = await textContrast(page, 'HAUL')

  // ---- CHECK 6: no em-dash + copy content sanity ----
  const dialogText = await page.evaluate((s) => document.querySelector(s)?.innerText || '', DIALOG_SEL)
  res.emDashPresent = /—/.test(dialogText)
  res.dialogTextSample = dialogText.slice(0, 400)

  // ---- CHECK 7: reduced-motion — dialog still opens, animation suppressed ----
  await page.evaluate(() => document.querySelector('[aria-label="Close how to play"]')?.click())
  await wait(250)
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await wait(100)
  await page.click(TRIGGER_SEL)
  await wait(50) // sample EARLY, right after mount, before a 220ms anim would finish
  res.reducedMotion = await page.evaluate((dlgSel) => {
    const d = document.querySelector(dlgSel)
    if (!d) return { opened: false }
    const cs = getComputedStyle(d)
    return { opened: true, animationName: cs.animationName, opacity: cs.opacity, transform: cs.transform }
  }, DIALOG_SEL)
  await wait(300)
  res.reducedMotionStillOpenAfterWait = await dialogOpen(page)

  // Compare against reduce:no-preference for a same-timepoint delta.
  await page.evaluate(() => document.querySelector('[aria-label="Close how to play"]')?.click())
  await wait(250)
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }])
  await wait(100)
  await page.click(TRIGGER_SEL)
  await wait(50)
  res.motionOn = await page.evaluate((dlgSel) => {
    const d = document.querySelector(dlgSel)
    if (!d) return { opened: false }
    const cs = getComputedStyle(d)
    return { opened: true, animationName: cs.animationName, opacity: cs.opacity }
  }, DIALOG_SEL)

  res.consoleErrors = consoleErrors
  await browser.close()
  return res
}

async function main() {
  const desktop = await run({ width: 1440, height: 900 }, 'desktop-1440')
  const mobile = await run({ width: 412, height: 915 }, 'mobile-412')
  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify({ desktop, mobile }, null, 2))
  console.log(JSON.stringify({ desktop, mobile }, null, 2))
}
main().catch((e) => { console.error(e); process.exit(1) })
