import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5186/'
const OUT = 'shots-a11y-0704'
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

// Loads the current page's screenshot into an in-page canvas so we can
// getImageData real composited pixels (handles CSS gradients + backdrop PNG
// bleed-through that a source-code color audit alone would miss).
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

// Returns raw RGBA pixel array for a page-space rect [x,y,w,h].
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

// Estimate background color from a strip just outside a text bbox, and
// foreground ("ink") color as the average of the pixels most different from
// that background inside the bbox (robust to anti-aliased edge blending).
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
  return { label, bg, fg, ratio: Number(ratio.toFixed(2)), samplesConsidered: candidates.length }
}

async function findRectByText(page, regex) {
  return page.evaluate((reStr) => {
    const re = new RegExp(reStr)
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let node
    while ((node = walker.nextNode())) {
      if (node.nodeValue && re.test(node.nodeValue)) {
        const range = document.createRange()
        range.selectNodeContents(node)
        const r = range.getBoundingClientRect()
        if (r.width > 0 && r.height > 0) {
          return { x: r.x, y: r.y, w: r.width, h: r.height, text: node.nodeValue.trim().slice(0, 60) }
        }
      }
    }
    return null
  }, regex.source)
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

  // ---- (e) SWOOBZ wordmark directly over the gold-bullion backdrop (lobby, before entering) ----
  await loadScreenshotToCanvas(page)
  let r = await findRectByText(page, /SWOOBZ/)
  if (r) {
    const bg = { x: r.x - 30, y: r.y, w: 20, h: r.h }
    contrastResults.push(await sampleTextContrast(page, 'SWOOBZ wordmark over backdrop (lobby)', r, bg))
  }

  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(400)
  await page.screenshot({ path: `${OUT}/04-planning-for-contrast.png` })
  await loadScreenshotToCanvas(page)

  // ---- (c) header "RTP 96.50%" ----
  r = await findRectByText(page, /^\d+\.\d\d%$/)
  if (r) {
    const bg = { x: r.x - 40, y: r.y, w: 15, h: r.h }
    contrastResults.push(await sampleTextContrast(page, 'header RTP % value', r, bg))
  }

  const clickTier = (label) => page.evaluate((lbl) => {
    const btns = [...document.querySelectorAll('button')]
    const b = btns.find((b) => b.textContent && b.textContent.includes(lbl))
    if (b) { b.click(); return true }
    return false
  }, label)

  const getAllTierRects = () => page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter((b) => /Floor/.test(b.textContent || ''))
    return btns.map((b) => {
      const spans = [...b.querySelectorAll('span')]
      const capSpan = spans.find((s) => /bad veins/.test(s.textContent || ''))
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

  // Background strips are taken from the SAME ROW, horizontally offset (the
  // background here is a translucent cyan wash on the ACTIVE tier — it
  // varies noticeably by Y across the button's own gradient, so a
  // vertically-offset strip (a prior version of this script) walks into a
  // visibly different background shade and corrupts the reading; a
  // same-Y/different-X strip keeps the sampled background representative of
  // what's actually directly behind the glyphs).
  async function sampleAllTiers(tag) {
    const rows = await getAllTierRects()
    for (const t of rows) {
      const state = t.active ? 'ACTIVE' : 'inactive'
      if (t.capRect) {
        // Row 2 caption is left-aligned with room to its right before the
        // button's own right padding edge.
        const gapStart = t.capRect.right + 3
        const gapW = Math.max(2, t.btnRect.right ? t.btnRect.x + t.btnRect.w - 10 - gapStart : 6)
        const bg = { x: gapStart, y: t.capRect.y, w: Math.min(gapW, 10), h: t.capRect.h }
        contrastResults.push(await sampleTextContrast(page, `${tag} ${state} tier caption "N bad veins" (${t.text.trim()})`, t.capRect, bg))
      }
      if (t.multRect && t.labelRect) {
        // Row 1: label (left) -- gap -- multiplier (right). Sample inside
        // the flex gap between them, same Y as the multiplier text.
        const gapStart = t.labelRect.right + 2
        const gapEnd = t.multRect.left - 2
        const bg = { x: gapStart, y: t.multRect.y, w: Math.max(2, gapEnd - gapStart), h: t.multRect.h }
        contrastResults.push(await sampleTextContrast(page, `${tag} ${state} tier "up to Nx" multiplier (${t.text.trim()})`, t.multRect, bg))
      }
    }
  }

  // Standard is the default active tier on entry.
  await sampleAllTiers('default(Standard active)')

  await clickTier('Flooded Floor')
  await wait(150)
  await loadScreenshotToCanvas(page)
  await sampleAllTiers('afterFloodedClick')

  fs.writeFileSync(`${OUT}/contrast-results-part1.json`, JSON.stringify(contrastResults, null, 2))
  console.log(JSON.stringify(contrastResults, null, 2))

  await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
