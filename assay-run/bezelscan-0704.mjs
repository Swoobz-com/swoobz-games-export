import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5195/'
const OUT = 'shots-brandcohesion-0704'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const clickText = async (page, txt) => {
  const h = await page.evaluateHandle((t) => {
    const b = [...document.querySelectorAll('button')]
    return b.find((x) => x.textContent && x.textContent.includes(t)) || null
  }, txt)
  const el = h.asElement()
  if (!el) return false
  await el.click()
  return true
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
const SCALE = 8
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: SCALE })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(300)
await clickText(page, 'ENTER THE ASSAY LINE')
await wait(500)

const rects = await page.evaluate(() => {
  const out = {}
  document.querySelectorAll('div').forEach((el) => {
    const cs = getComputedStyle(el)
    const bc = cs.borderTopColor
    let key = null
    if (bc === 'rgb(202, 160, 64)') key = 'warm'
    if (bc === 'rgb(143, 125, 92)') key = 'cool'
    if (key) {
      out[key + 'Bezel'] = JSON.parse(JSON.stringify(el.getBoundingClientRect()))
      out[key + 'Outer'] = JSON.parse(JSON.stringify(el.parentElement.getBoundingClientRect()))
    }
  })
  return out
})
fs.writeFileSync(`${OUT}/rects.json`, JSON.stringify(rects, null, 2))

async function scanCase(name, outerRect) {
  const pad = 3 // CSS px extra around outer edge to be safe
  const clip = { x: outerRect.x - pad, y: outerRect.y - pad, width: outerRect.width + pad * 2, height: outerRect.height + pad * 2 }
  const buf = await page.screenshot({ clip, encoding: 'base64' })
  fs.writeFileSync(`${OUT}/${name}-fullcase.png`, buf, 'base64')
  const result = await page.evaluate(async ({ b64, scale, padCss }) => {
    const img = new Image()
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + b64 })
    const cvs = document.createElement('canvas')
    cvs.width = img.naturalWidth; cvs.height = img.naturalHeight
    const ctx = cvs.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const W = cvs.width, H = cvs.height
    const data = ctx.getImageData(0, 0, W, H).data
    const get = (x, y) => {
      const i = (y * W + x) * 4
      return [data[i], data[i+1], data[i+2], data[i+3]]
    }
    const isCyan = (r,g,b) => (b > 140 && g > 140 && r < 130 && b >= g - 25)
    // scan a band from the outer edge (padCss*scale in from clip edge) inward
    // to padCss*scale + (6+4)*scale (covers the 6px padding + a few px of the
    // bezel border itself, so we catch a leak right at the seam too)
    const bandStartPx = 0 // start right at true outer edge (clip already has padCss margin)
    const bandDepthPx = Math.round((padCss + 12) * scale) // outer margin + padding(6) + a bit of bezel(3)+ring cushion
    let cyanHits = []
    const step = 1
    // top edge
    for (let x = 0; x < W; x += step) {
      for (let y = 0; y < bandDepthPx; y += step) {
        const [r,g,bl,a] = get(x,y)
        if (a>20 && isCyan(r,g,bl)) cyanHits.push({edge:'top',x,y,r,g,bl})
      }
    }
    // bottom edge
    for (let x = 0; x < W; x += step) {
      for (let y = H-bandDepthPx; y < H; y += step) {
        const [r,g,bl,a] = get(x,y)
        if (a>20 && isCyan(r,g,bl)) cyanHits.push({edge:'bottom',x,y,r,g,bl})
      }
    }
    // left edge
    for (let y = 0; y < H; y += step) {
      for (let x = 0; x < bandDepthPx; x += step) {
        const [r,g,bl,a] = get(x,y)
        if (a>20 && isCyan(r,g,bl)) cyanHits.push({edge:'left',x,y,r,g,bl})
      }
    }
    // right edge
    for (let y = 0; y < H; y += step) {
      for (let x = W-bandDepthPx; x < W; x += step) {
        const [r,g,bl,a] = get(x,y)
        if (a>20 && isCyan(r,g,bl)) cyanHits.push({edge:'right',x,y,r,g,bl})
      }
    }
    return { W, H, bandDepthPx, totalCyanHits: cyanHits.length, sampleHits: cyanHits.slice(0, 20) }
  }, { b64: buf, scale: SCALE, padCss: pad })
  return result
}

const warmResult = await scanCase('warm', rects.warmOuter)
const coolResult = await scanCase('cool', rects.coolOuter)
console.log('WARM (right) case scan:', JSON.stringify(warmResult, null, 2))
console.log('COOL (left) case scan:', JSON.stringify(coolResult, null, 2))
fs.writeFileSync(`${OUT}/bezel-scan-results.json`, JSON.stringify({ warmResult, coolResult, rects }, null, 2))
await browser.close()
