import fs from 'node:fs'
import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = 'shots-brandcohesion-0704'

async function rescan(page, file, dilate) {
  const b64 = fs.readFileSync(`${OUT}/${file}`).toString('base64')
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
    // STRICTER brass: close to #caa040 (202,160,64) or #8f7d5c (143,125,92) hue family, decent saturation
    const isBrass = (r,g,b) => r > 125 && (r-b) > 55 && (r-g) > 15 && (g-b) > 20 && g < r
    // STRICTER cyan: close to accent-API volt/cyan (0,240,255)/(41,230,255) -- near-zero red, very high g+b
    const isCyan = (r,g,b) => r < 70 && g > 190 && b > 210 && (b-r) > 150
    for (let i = 0; i < N; i++) {
      const o = i * 4
      const r = data[o], g = data[o+1], b = data[o+2], a = data[o+3]
      if (a < 40) continue
      if (isBrass(r,g,b)) brassMask[i] = 1
      if (isCyan(r,g,b)) cyanMask[i] = 1
    }
    let dilated = brassMask
    for (let pass = 0; pass < dilate; pass++) {
      const next = new Uint8Array(N)
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
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
      dilated = next
    }
    let brassCount=0, cyanCount=0, overlapCount=0
    const hits = []
    for (let i=0;i<N;i++){
      if(brassMask[i]) brassCount++
      if(cyanMask[i]) cyanCount++
      if (cyanMask[i] && dilated[i]) { overlapCount++; if (hits.length<20) hits.push({x:i%W, y:Math.floor(i/W)}) }
    }
    return { W, H, brassCount, cyanCount, overlapCount, hits }
  }, { b64, dilate })
  console.log(`${file}: brass=${result.brassCount} cyan=${result.cyanCount} overlap(dilate=${dilate}px)=${result.overlapCount}`, result.hits.slice(0,5))
  return result
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900 } })
const page = (await browser.pages())[0]

const files = ['full-lobby.png','full-armed.png','full-midcascade.png','full-midcascade2.png','full-settled.png']
const all = {}
for (const f of files) {
  if (fs.existsSync(`${OUT}/${f}`)) all[f] = await rescan(page, f, 3)
}
fs.writeFileSync(`${OUT}/adjacency-strict-results.json`, JSON.stringify(all, null, 2))
await browser.close()
