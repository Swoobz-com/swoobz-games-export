// PASS-3 independent re-verify — CRIT #5: active-tier LABEL + "up to Nx"
// MULTIPLIER text contrast against the ACTUAL COMPOSITED background (gold
// wash over COAL), not the flat pre-wash token background. Fresh screenshot
// sampling + hand WCAG relative-luminance computation, for both desktop
// TierRow and mobile TierChip, both label and multiplier text, all 3 tiers.
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

function srgbToLinear(c) {
  const cs = c / 255
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4)
}
function relLuminance([r, g, b]) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}
function contrastRatio(rgbA, rgbB) {
  const la = relLuminance(rgbA)
  const lb = relLuminance(rgbB)
  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)
  return (lighter + 0.05) / (darker + 0.05)
}

function pxAt(png, x, y) {
  const idx = (png.width * Math.round(y) + Math.round(x)) << 2
  return [png.data[idx], png.data[idx + 1], png.data[idx + 2]]
}

// Sample a small patch, return the dominant "text" color (darkest OR
// brightest cluster depending on mode) and the dominant "background" color
// (mode of pixels) -- but for precision here we hand-pick coordinates via
// direct pixel probing across a horizontal scanline through the text glyph
// and report per-pixel min/max so a human can sanity check the fg pick.
function scanLine(png, xStart, xEnd, y) {
  const out = []
  for (let x = xStart; x <= xEnd; x++) out.push({ x, rgb: pxAt(png, x, y) })
  return out
}

async function measureTierRow(page, label, index, prefix) {
  // Find the tier row/chip button by index among assayFocusable tier buttons.
  const info = await page.evaluate((idx) => {
    const btns = [...document.querySelectorAll('button.assayFocusable')].filter((b) => b.getAttribute('aria-current') !== null || /Floor|Lean|Standard|Heavy/.test(b.textContent || ''))
    const btn = btns[idx]
    if (!btn) return null
    const r = btn.getBoundingClientRect()
    // Find the label span (first span) and multiplier span (span containing 'x').
    const spans = [...btn.querySelectorAll('span')]
    const multSpan = spans.find((s) => /x$/.test(s.textContent.trim()) || /\d+\.\d+x/.test(s.textContent))
    const labelSpan = spans.find((s) => s !== multSpan && /[A-Za-z]/.test(s.textContent))
    const mr = multSpan ? multSpan.getBoundingClientRect() : null
    const lr = labelSpan ? labelSpan.getBoundingClientRect() : null
    return {
      active: btn.getAttribute('aria-current') === 'true',
      text: btn.textContent,
      rect: { top: r.top, left: r.left, width: r.width, height: r.height },
      multRect: mr ? { top: mr.top, left: mr.left, width: mr.width, height: mr.height } : null,
      multText: multSpan ? multSpan.textContent : null,
      labelRect: lr ? { top: lr.top, left: lr.left, width: lr.width, height: lr.height } : null,
      labelText: labelSpan ? labelSpan.textContent : null,
    }
  }, index)
  if (!info) { console.log(`[${label}] tier index ${index} NOT FOUND`); return null }

  const margin = 6
  const clip = {
    x: Math.max(0, Math.round(info.rect.left - margin)),
    y: Math.max(0, Math.round(info.rect.top - margin)),
    width: Math.round(info.rect.width + margin * 2),
    height: Math.round(info.rect.height + margin * 2),
  }
  const buf = Buffer.from(await page.screenshot({ clip }))
  fs.writeFileSync(`${OUT}/${prefix}.png`, buf)
  const png = PNG.sync.read(buf)
  const dpr = png.width / clip.width

  const toLocal = (rect) => ({
    xStart: Math.round((rect.left - clip.x) * dpr),
    xEnd: Math.round((rect.left - clip.x + rect.width) * dpr),
    yMid: Math.round((rect.top - clip.y + rect.height / 2) * dpr),
  })

  const results = {}
  for (const [key, rect, txt] of [['multiplier', info.multRect, info.multText], ['label', info.labelRect, info.labelText]]) {
    if (!rect) { results[key] = null; continue }
    const loc = toLocal(rect)
    const line = scanLine(png, loc.xStart, loc.xEnd, loc.yMid)
    // Foreground = the pixel with max luminance delta from the row's modal (background) color.
    // First find modal/background: sample the most common color among endpoints (padding areas).
    const bgSample = [pxAt(png, loc.xStart, Math.max(0, loc.yMid - Math.round(8 * dpr))), pxAt(png, loc.xEnd, Math.max(0, loc.yMid - Math.round(8 * dpr)))]
    // Use median-ish approach: take the color that appears most among a wider strip above/below text (clear of glyphs).
    const bgStripY = Math.max(0, loc.yMid - Math.round(9 * dpr))
    const bgStrip = scanLine(png, loc.xStart, loc.xEnd, bgStripY)
    const bgCounts = new Map()
    for (const p of bgStrip) {
      const k = p.rgb.join(',')
      bgCounts.set(k, (bgCounts.get(k) || 0) + 1)
    }
    let bgKey = null, bgCount = -1
    for (const [k, c] of bgCounts) if (c > bgCount) { bgKey = k; bgCount = c }
    const bgRGB = bgKey.split(',').map(Number)

    // Foreground: the pixel in the glyph scanline with the LARGEST luminance
    // distance from bgRGB (captures the anti-aliased glyph core, whichever
    // direction -- lighter text on darker bg, or vice versa).
    let fgRGB = bgRGB
    let maxDist = -1
    for (const p of line) {
      const dist = Math.abs(relLuminance(p.rgb) - relLuminance(bgRGB))
      if (dist > maxDist) { maxDist = dist; fgRGB = p.rgb }
    }
    const ratio = contrastRatio(fgRGB, bgRGB)
    results[key] = { text: txt, bgRGB, fgRGB, ratio: Math.round(ratio * 100) / 100, sampledLinePx: line.length }
  }
  console.log(`[${label}] tier#${index} active=${info.active} text="${info.text.replace(/\s+/g, ' ').slice(0, 60)}"`)
  console.log(JSON.stringify(results, null, 1))
  return { info, results }
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })

// DESKTOP TierRow — cycle through all 3 tiers, measuring the ACTIVE one each time.
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await wait(400)
  await tapText(page, 'ENTER')
  await wait(500)

  const tierNames = ['Lean', 'Standard', 'Heavy']
  for (let i = 0; i < 3; i++) {
    await tapText(page, tierNames[i])
    await wait(250)
    await measureTierRow(page, `DESKTOP TierRow`, i, `crit5-desktop-tierrow-${tierNames[i].toLowerCase()}`)
  }
  await page.close()
}

// MOBILE TierChip (iPhone 14 Pro, 393x852).
{
  const page = await browser.newPage()
  await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await wait(400)
  await tapText(page, 'ENTER')
  await wait(500)

  const tierNames = ['Lean', 'Standard', 'Heavy']
  for (let i = 0; i < 3; i++) {
    await tapText(page, tierNames[i])
    await wait(250)
    await measureTierRow(page, `MOBILE TierChip`, i, `crit5-mobile-tierchip-${tierNames[i].toLowerCase()}`)
  }
  await page.close()
}

await browser.close()
