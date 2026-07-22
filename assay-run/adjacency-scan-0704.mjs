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
const canvasBox = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return null
  const r = c.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})

async function adjacencyScan(page, label, scale, dilate) {
  const buf = await page.screenshot({ fullPage: false, encoding: 'base64' })
  fs.writeFileSync(`${OUT}/full-${label}.png`, buf, 'base64')
  const result = await page.evaluate(async ({ b64, dilate }) => {
    const img = new Image()
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + b64 })
    const cvs = document.createElement('canvas')
    cvs.width = img.naturalWidth; cvs.height = img.naturalHeight
    const ctx = cvs.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const W = cvs.width, H = cvs.height
    const data = ctx.getImageData(0, 0, W, H).data
    const N = W * H
    const brassMask = new Uint8Array(N)
    const cyanMask = new Uint8Array(N)
    const isBrass = (r,g,b) => {
      // brass/gold family: #caa040 (202,160,64), #8f7d5c (143,125,92), frame hairline rgba(202,160,64,.4), bracket rgba(202,160,64,.55)
      // generic warm-gold test: R>140, G between 0.65-0.9*R, B<0.55*R, and R-B>50
      return r > 130 && g > 90 && b < 130 && (r - b) > 45 && (g - b) > 15 && g < r
    }
    const isCyan = (r,g,b) => (b > 140 && g > 140 && r < 130 && b >= g - 25)
    for (let i = 0; i < N; i++) {
      const o = i * 4
      const r = data[o], g = data[o+1], b = data[o+2], a = data[o+3]
      if (a < 40) continue
      if (isBrass(r,g,b)) brassMask[i] = 1
      if (isCyan(r,g,b)) cyanMask[i] = 1
    }
    // dilate brass mask by `dilate` px (chebyshev)
    let dilated = brassMask
    for (let pass = 0; pass < dilate; pass++) {
      const next = new Uint8Array(N)
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const idx = y*W+x
          if (dilated[idx]) { next[idx] = 1; continue }
          let hit = 0
          for (let dy=-1; dy<=1 && !hit; dy++) for (let dx=-1; dx<=1 && !hit; dx++) {
            const nx=x+dx, ny=y+dy
            if (nx<0||ny<0||nx>=W||ny>=H) continue
            if (dilated[ny*W+nx]) hit = 1
          }
          next[idx] = hit
        }
      }
      dilated = next
    }
    let hits = []
    let brassCount = 0, cyanCount = 0
    for (let i=0;i<N;i++){ if(brassMask[i]) brassCount++; if(cyanMask[i]) cyanCount++ }
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = y*W+x
        if (cyanMask[idx] && dilated[idx]) {
          if (hits.length < 40) hits.push({x,y})
        }
      }
    }
    // count total overlap
    let overlapCount = 0
    for (let i=0;i<N;i++) if (cyanMask[i] && dilated[i]) overlapCount++
    return { W, H, brassCount, cyanCount, overlapCount, sampleHits: hits }
  }, { b64: buf, dilate })
  console.log(`--- ${label} (dilate=${dilate}px brass mask) ---`, JSON.stringify({ ...result, sampleHits: result.sampleHits.slice(0,10) }))
  return result
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })

const results = {}

// LOBBY
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(400)
results.lobby = await adjacencyScan(page, 'lobby', 2, 3)

// PLANNING/ARMED
await clickText(page, 'ENTER THE ASSAY LINE')
await wait(300)
const box = await canvasBox(page)
const tile = box.w / 20
let r = 14, c = 10
for (let i = 0; i < 9; i++) {
  await page.mouse.click(box.x + c * tile + tile / 2, box.y + r * tile + tile / 2)
  await wait(30)
  r -= 1
  if (i % 2 === 1) c += 1
}
await wait(150)
results.armed = await adjacencyScan(page, 'armed', 2, 3)

// THROW BREAKER -> mid cascade (catch board sweep / coin fly near header)
await clickText(page, 'THROW BREAKER')
await wait(200)
results.midcascade = await adjacencyScan(page, 'midcascade', 2, 3)
await wait(150)
results.midcascade2 = await adjacencyScan(page, 'midcascade2', 2, 3)
await wait(2500)
results.settled = await adjacencyScan(page, 'settled', 2, 3)

fs.writeFileSync(`${OUT}/adjacency-results.json`, JSON.stringify(results, null, 2))
await browser.close()
