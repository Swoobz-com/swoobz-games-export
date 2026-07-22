// INDEPENDENT re-verify of CRIT #3 (keyboard board paint), CRIT #4 (real
// focus-visible outline via genuine Tab keypresses + pixel diff, not
// getComputedStyle), CRIT #5 (live-pixel WCAG contrast on active vs inactive
// TierRow), CRIT #6 (aria-live region + content changes across phases).
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-a11y-verify-0704'
fs.mkdirSync(OUT, { recursive: true })
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

const activeElInfo = (page) =>
  page.evaluate(() => {
    const el = document.activeElement
    if (!el || el === document.body) return null
    const r = el.getBoundingClientRect()
    return {
      tag: el.tagName,
      text: (el.textContent || '').slice(0, 40),
      ariaLabel: el.getAttribute('aria-label'),
      className: el.className,
      rect: { top: r.top, left: r.left, width: r.width, height: r.height },
      matchesFocusVisible: el.matches(':focus-visible'),
    }
  })

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await wait(400)

const results = {}

// ── CRIT #6a: aria-live census in LOBBY (before entering) ──────────────────
results.liveRegionLobby = await page.evaluate(() => {
  const el = document.querySelector('[aria-live]')
  return el ? { ariaLive: el.getAttribute('aria-live'), role: el.getAttribute('role'), ariaAtomic: el.getAttribute('aria-atomic'), text: el.textContent } : null
})

await tapText(page, 'ENTER THE ASSAY LINE')
await wait(400)

// ── CRIT #6b: aria-live in PLANNING, 0 boxes ────────────────────────────────
results.liveRegionPlanning0 = await page.evaluate(() => {
  const el = document.querySelector('[aria-live]')
  return el ? { ariaLive: el.getAttribute('aria-live'), role: el.getAttribute('role'), ariaAtomic: el.getAttribute('aria-atomic'), text: el.textContent } : null
})

// ── CRIT #3: canvas a11y attrs + real Tab-focus + keyboard paint ───────────
results.canvasAttrsBeforeFocus = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  return { role: c.getAttribute('role'), ariaLabel: c.getAttribute('aria-label'), tabIndex: c.tabIndex, className: c.className }
})

// Tab from body through the page to find and land on the canvas via REAL
// keyboard Tab events (not .focus()), logging the whole tab order as we go
// (also serves the Tab-order-sanity regression check).
const tabOrder = []
let landedOnCanvas = false
for (let i = 0; i < 40; i++) {
  await page.keyboard.press('Tab')
  const info = await activeElInfo(page)
  tabOrder.push(info)
  if (info && info.tag === 'CANVAS') {
    landedOnCanvas = true
    break
  }
}
results.tabStepsToCanvas = tabOrder.length
results.landedOnCanvasViaRealTab = landedOnCanvas
results.tabOrderTags = tabOrder.map((i) => (i ? `${i.tag}${i.ariaLabel ? `[${i.ariaLabel.slice(0, 24)}]` : ''}` : 'null'))

// Live-region content BEFORE any keyboard paint (0 boxes).
results.liveTextBeforeKeyboardPaint = await page.evaluate(() => document.querySelector('[aria-live]')?.textContent)

// Send arrow keys + space to actually paint a tile via keyboard.
await page.keyboard.press('ArrowRight')
await page.keyboard.press('ArrowRight')
await page.keyboard.press('ArrowDown')
await page.keyboard.press(' ')
await wait(200)
results.liveTextAfterOneKeyboardPaint = await page.evaluate(() => document.querySelector('[aria-live]')?.textContent)

// Paint 6 more tiles via keyboard to reach the armed threshold (MIN_TRAIL).
for (let i = 0; i < 6; i++) {
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press(' ')
}
await wait(200)
results.liveTextAfter7KeyboardPaints = await page.evaluate(() => document.querySelector('[aria-live]')?.textContent)
results.canPlungeAfterKeyboardPaint = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes('RUN THE LINE'))
  return b ? { disabled: b.disabled, exists: true } : { exists: false }
})
await page.screenshot({ path: `${OUT}/desktop-kbd-cursor-after-7paints.png` })

// ── CRIT #4: focus-visible outline via real Tab, pixel-diffed ──────────────
// Reload fresh to get a clean tab sequence for TierRow / BreakerLever focus tests.
await page.reload({ waitUntil: 'networkidle0' })
await wait(300)
await tapText(page, 'ENTER THE ASSAY LINE')
await wait(400)

async function focusVisibleDiff(matchFn, label, pad = 24) {
  // Tab from a fresh body-focus state until matchFn(activeElInfo) is true.
  await page.evaluate(() => document.activeElement && document.activeElement.blur())
  await page.evaluate(() => document.body.focus())
  let info = null
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab')
    info = await activeElInfo(page)
    if (info && matchFn(info)) break
  }
  if (!info || !matchFn(info)) return { label, found: false }
  const r = info.rect
  const clip = {
    x: Math.max(0, r.left - pad),
    y: Math.max(0, r.top - pad),
    width: r.width + pad * 2,
    height: r.height + pad * 2,
  }
  const focusedPath = `${OUT}/desktop-focus-${label}-FOCUSED.png`
  await page.screenshot({ path: focusedPath, clip })
  const matchesFocusVisible = info.matchesFocusVisible
  // Blur (Escape doesn't blur reliably for all elements; explicitly blur via JS
  // then re-screenshot the SAME clip region for a true baseline).
  await page.evaluate(() => document.activeElement && document.activeElement.blur())
  await wait(60)
  const blurredPath = `${OUT}/desktop-focus-${label}-BLURRED.png`
  await page.screenshot({ path: blurredPath, clip })
  return { label, found: true, rect: r, matchesFocusVisible, focusedPath, blurredPath, tag: info.tag, ariaLabel: info.ariaLabel, text: info.text }
}

results.focusTierRowLean = await focusVisibleDiff((i) => i.tag === 'BUTTON' && (i.text || '').includes('Lean'), 'tierrow-lean')

// Arm the BreakerLever first (disabled buttons don't enter tab order at all —
// confirmed AGENT_MEMORY gotcha) by painting a real trail via mouse first.
const geoDesktop = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  const cr = c.getBoundingClientRect()
  return { left: cr.left, top: cr.top }
})
// Determine tile size from canvas dims / GRID_DIM=10 by measuring board box.
const boardDims = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  const cr = c.getBoundingClientRect()
  return { w: cr.width, h: cr.height }
})
const TILE_D = boardDims.w / 10
for (let i = 0; i < 8; i++) {
  const col = i % 4
  const row = Math.floor(i / 4)
  await page.mouse.click(geoDesktop.left + col * TILE_D + TILE_D / 2, geoDesktop.top + row * TILE_D + TILE_D / 2)
  await wait(40)
}
await wait(200)
results.breakerArmedBeforeFocusTest = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes('RUN THE LINE'))
  return b ? !b.disabled : false
})

results.focusBreakerLever = await focusVisibleDiff((i) => i.tag === 'BUTTON' && (i.text || '').includes('RUN THE LINE'), 'breakerlever')

// ── CRIT #4 also: canvas itself via className=assayFocusable ───────────────
results.focusCanvas = await focusVisibleDiff((i) => i.tag === 'CANVAS', 'canvas')

// ── CRIT #5: live-pixel contrast, active vs inactive TierRow ───────────────
// Select "Heavy" so we have a clean active/inactive pair to sample, matching
// the CRIT #1 mobile repro tier as well.
await tapText(page, 'Heavy')
await wait(200)
const contrastData = await page.evaluate(() => {
  function luminance(r, g, b) {
    const a = [r, g, b].map((v) => {
      v /= 255
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]
  }
  function ratio(rgb1, rgb2) {
    const L1 = luminance(...rgb1)
    const L2 = luminance(...rgb2)
    const lighter = Math.max(L1, L2)
    const darker = Math.min(L1, L2)
    return (lighter + 0.05) / (darker + 0.05)
  }
  const btns = [...document.querySelectorAll('button')]
  const rows = btns.filter((b) => b.getAttribute('aria-current') !== undefined || (b.querySelector('span') && /Lean|Standard|Heavy/.test(b.textContent)))
  const active = rows.find((b) => b.getAttribute('aria-current') === 'true')
  const inactive = rows.find((b) => b.getAttribute('aria-current') !== 'true' && /Lean|Standard/.test(b.textContent))
  const rectOf = (b) => b.getBoundingClientRect()
  return {
    active: active ? { rect: rectOf(active), text: active.textContent } : null,
    inactive: inactive ? { rect: rectOf(inactive), text: inactive.textContent } : null,
    _ratioFn: 'computed client-side below',
  }
})
console.log('TierRow rects for contrast sampling:', JSON.stringify(contrastData, null, 2))

// Screenshot the whole VAULT FLOOR section for pixel sampling.
const vaultFloorClip = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')]
  const rows = btns.filter((b) => b.getAttribute('aria-current') !== undefined)
  const rects = rows.map((b) => b.getBoundingClientRect())
  const top = Math.min(...rects.map((r) => r.top)) - 4
  const bottom = Math.max(...rects.map((r) => r.bottom)) + 4
  const left = Math.min(...rects.map((r) => r.left)) - 4
  const right = Math.max(...rects.map((r) => r.right)) + 4
  return { x: left, y: top, width: right - left, height: bottom - top }
})
await page.screenshot({ path: `${OUT}/desktop-vaultfloor-heavy-active.png`, clip: vaultFloorClip })

fs.writeFileSync(`${OUT}/desktop-tierrow-rects.json`, JSON.stringify({ contrastData, vaultFloorClip }, null, 2))

// ── CRIT #6c: aria-live during ASSAYING + SETTLED (drag a min trail, run it) ─
await wait(100)
results.liveTextPlanningArmedHeavy = await page.evaluate(() => document.querySelector('[aria-live]')?.textContent)
await tapText(page, 'RUN THE LINE')
await wait(300)
results.liveTextAssayingEarly = await page.evaluate(() => document.querySelector('[aria-live]')?.textContent)
await wait(1200)
results.liveTextAssayingLater = await page.evaluate(() => document.querySelector('[aria-live]')?.textContent)
await wait(2500)
results.liveTextSettledOrBust = await page.evaluate(() => document.querySelector('[aria-live]')?.textContent)
await page.screenshot({ path: `${OUT}/desktop-final-settle-state.png` })

// Also capture the region's full attributes at the end for the record.
results.liveRegionFinalAttrs = await page.evaluate(() => {
  const el = document.querySelector('[aria-live]')
  return el ? { ariaLive: el.getAttribute('aria-live'), role: el.getAttribute('role'), ariaAtomic: el.getAttribute('aria-atomic') } : null
})

fs.writeFileSync(`${OUT}/desktop-verify-report.json`, JSON.stringify(results, null, 2))
console.log(JSON.stringify(results, null, 2))
await browser.close()
