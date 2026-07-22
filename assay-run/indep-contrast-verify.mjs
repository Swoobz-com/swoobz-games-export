// INDEPENDENT re-verify of CRIT #5 (live-pixel WCAG contrast, active vs
// inactive VAULT FLOOR TierRow). Adapted from the established
// screenshot-to-canvas sampler pattern (same-row horizontal-offset background
// sampling — a vertical offset walks into the OTHER row's text and corrupts
// the reading, per prior audit gotcha), re-run fresh against the CURRENT
// dev server / current copy ("cracked boxes", not "bad veins").
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-a11y-verify-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

function relLum([r, g, b]) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
  const [R, G, B] = [r, g, b].map(f)
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}
function contrast(rgb1, rgb2) {
  const l1 = relLum(rgb1), l2 = relLum(rgb2)
  const [a, b] = [Math.max(l1, l2), Math.min(l1, l2)]
  return (a + 0.05) / (b + 0.05)
}

async function clickText(page, txt) {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}

async function loadScreenshotToCanvas(page) {
  const b64 = await page.screenshot({ encoding: 'base64' })
  await page.evaluate((b64) => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        window.__a11yCanvas = canvas
        window.__a11yCtx = ctx
        resolve(true)
      }
      img.src = 'data:image/png;base64,' + b64
    })
  }, b64)
}

async function getPixels(page, rect) {
  return page.evaluate((rect) => {
    const ctx = window.__a11yCtx
    const dpr = window.devicePixelRatio || 1
    const x = Math.round(rect.x * dpr), y = Math.round(rect.y * dpr)
    const w = Math.max(1, Math.round(rect.w * dpr)), h = Math.max(1, Math.round(rect.h * dpr))
    const data = ctx.getImageData(x, y, w, h).data
    return { w, h, data: Array.from(data) }
  }, rect)
}

function median(arr) {
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

async function sampleTextContrast(page, label, bboxRect, bgStripRect) {
  const bgPix = await getPixels(page, bgStripRect)
  const bgSamples = []
  for (let i = 0; i < bgPix.data.length; i += 4) {
    bgSamples.push([bgPix.data[i], bgPix.data[i + 1], bgPix.data[i + 2]])
  }
  const bg = [
    median(bgSamples.map((p) => p[0])),
    median(bgSamples.map((p) => p[1])),
    median(bgSamples.map((p) => p[2])),
  ]

  const fgPix = await getPixels(page, bboxRect)
  const candidates = []
  for (let i = 0; i < fgPix.data.length; i += 4) {
    const p = [fgPix.data[i], fgPix.data[i + 1], fgPix.data[i + 2]]
    const alpha = fgPix.data[i + 3]
    if (alpha < 200) continue
    const dist = Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2])
    candidates.push({ p, dist })
  }
  candidates.sort((a, b) => b.dist - a.dist)
  const top = candidates.slice(0, Math.max(1, Math.floor(candidates.length * 0.05)))
  const fg = top.length
    ? [
        Math.round(top.reduce((s, c) => s + c.p[0], 0) / top.length),
        Math.round(top.reduce((s, c) => s + c.p[1], 0) / top.length),
        Math.round(top.reduce((s, c) => s + c.p[2], 0) / top.length),
      ]
    : bg
  const ratio = contrast(fg, bg)
  return { label, bg, fg, ratio: Number(ratio.toFixed(2)), samplesConsidered: candidates.length, bboxRect, bgStripRect }
}

async function getAllTierRects(page) {
  return page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter((b) => /Floor/.test(b.textContent || ''))
    return btns.map((b) => {
      const spans = [...b.querySelectorAll('span')]
      const capSpan = spans.find((s) => /cracked boxes/.test(s.textContent || ''))
      const multSpan = spans.find((s) => /^up to/.test(s.textContent || ''))
      const labelSpan = spans.find((s) => /Floor$/.test((s.textContent || '').trim()))
      const capRect = capSpan ? capSpan.getBoundingClientRect() : null
      const multRect = multSpan ? multSpan.getBoundingClientRect() : null
      const labelRect = labelSpan ? labelSpan.getBoundingClientRect() : null
      const btnRect = b.getBoundingClientRect()
      const toR = (r) => (r ? { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, left: r.left } : null)
      return {
        active: b.getAttribute('aria-current') === 'true',
        text: b.textContent.slice(0, 20),
        btnRect: toR(btnRect),
        capRect: toR(capRect),
        multRect: toR(multRect),
        labelRect: toR(labelRect),
      }
    })
  })
}

async function sampleAllTiers(page, tag, contrastResults) {
  const rows = await getAllTierRects(page)
  for (const t of rows) {
    const state = t.active ? 'ACTIVE' : 'inactive'
    if (t.capRect) {
      const gapStart = t.capRect.right + 3
      const gapW = Math.max(2, t.btnRect.right ? t.btnRect.x + t.btnRect.w - 10 - gapStart : 6)
      const bg = { x: gapStart, y: t.capRect.y, w: Math.min(gapW, 10), h: t.capRect.h }
      contrastResults.push(await sampleTextContrast(page, `${tag} ${state} tier caption "N cracked boxes" (${t.text.trim()})`, t.capRect, bg))
    }
    if (t.multRect && t.labelRect) {
      const gapStart = t.labelRect.right + 2
      const gapEnd = t.multRect.left - 2
      const bg = { x: gapStart, y: t.multRect.y, w: Math.max(2, gapEnd - gapStart), h: t.multRect.h }
      contrastResults.push(await sampleTextContrast(page, `${tag} ${state} tier "up to Nx" multiplier (${t.text.trim()})`, t.multRect, bg))
    }
    if (t.labelRect) {
      // The tier NAME text itself (e.g. "Heavy Floor") — sample bg from a
      // strip to the RIGHT of the label but still left of the multiplier,
      // same Y, i.e. within the same row/gap region used above but this
      // time comparing against the label glyphs specifically.
      const bg = { x: t.labelRect.right + 2, y: t.labelRect.y, w: 8, h: t.labelRect.h }
      contrastResults.push(await sampleTextContrast(page, `${tag} ${state} tier NAME label (${t.text.trim()})`, t.labelRect, bg))
    }
  }
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: EXE,
    headless: 'new',
    defaultViewport: { width: 1920, height: 1080 },
  })
  const page = (await browser.pages())[0]
  await page.goto(URL, { waitUntil: 'networkidle0' })
  await wait(400)

  const contrastResults = []

  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(400)
  await page.screenshot({ path: `${OUT}/contrast-01-planning-default.png` })
  await loadScreenshotToCanvas(page)

  // Standard is the default active tier on entry.
  await sampleAllTiers(page, 'default(Standard-active)', contrastResults)

  await clickText(page, 'Heavy Floor')
  await wait(200)
  await page.screenshot({ path: `${OUT}/contrast-02-heavy-active.png` })
  await loadScreenshotToCanvas(page)
  await sampleAllTiers(page, 'afterHeavyClick', contrastResults)

  await clickText(page, 'Lean Floor')
  await wait(200)
  await page.screenshot({ path: `${OUT}/contrast-03-lean-active.png` })
  await loadScreenshotToCanvas(page)
  await sampleAllTiers(page, 'afterLeanClick', contrastResults)

  fs.writeFileSync(`${OUT}/indep-contrast-results.json`, JSON.stringify(contrastResults, null, 2))
  console.log(JSON.stringify(contrastResults, null, 2))

  await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
