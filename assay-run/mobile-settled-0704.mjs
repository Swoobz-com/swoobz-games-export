import fs from 'node:fs'
import puppeteer from 'puppeteer-core'
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
async function scanBuffer(page, buf, label) {
  const result = await page.evaluate(async ({ b64 }) => {
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
    const isBrass = (r,g,b) => r > 125 && (r-b) > 55 && (r-g) > 15 && (g-b) > 20 && g < r
    const isCyan = (r,g,b) => r < 70 && g > 190 && b > 210 && (b-r) > 150
    for (let i = 0; i < N; i++) {
      const o = i*4, r=data[o], g=data[o+1], b=data[o+2], a=data[o+3]
      if (a<40) continue
      if (isBrass(r,g,b)) brassMask[i]=1
      if (isCyan(r,g,b)) cyanMask[i]=1
    }
    let dilated = brassMask
    for (let p=0;p<3;p++){
      const next = new Uint8Array(N)
      for (let y=0;y<H;y++) for (let x=0;x<W;x++){
        const idx=y*W+x
        if (dilated[idx]){next[idx]=1;continue}
        let hit=0
        for(let dy=-1;dy<=1&&!hit;dy++) for(let dx=-1;dx<=1&&!hit;dx++){
          const nx=x+dx,ny=y+dy
          if(nx<0||ny<0||nx>=W||ny>=H) continue
          if(dilated[ny*W+nx]) hit=1
        }
        next[idx]=hit
      }
      dilated=next
    }
    let brassCount=0,cyanCount=0,overlapCount=0
    for(let i=0;i<N;i++){if(brassMask[i])brassCount++;if(cyanMask[i])cyanCount++;if(cyanMask[i]&&dilated[i])overlapCount++}
    return {brassCount,cyanCount,overlapCount}
  }, {b64:buf})
  console.log(`${label}:`, JSON.stringify(result))
  return result
}
async function playRound(page, wantWin, maxAttempts) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
    await wait(300)
    await clickText(page, 'ENTER THE ASSAY LINE')
    await wait(300)
    const box = await canvasBox(page)
    const tile = box.w / 20
    let r = 8, c = 8
    for (let i = 0; i < 8; i++) {
      await page.mouse.click(box.x + c * tile + tile / 2, box.y + r * tile + tile / 2)
      await wait(30)
      r -= 1
      if (i % 2 === 1) c += 1
    }
    await wait(120)
    await clickText(page, 'THROW BREAKER')
    await wait(2600)
    const info = await page.evaluate(() => {
      const t = document.body.innerText
      return { won: /CLAIM PROVEN/.test(t), bust: /BUSTED/.test(t) }
    })
    if ((wantWin && info.won) || (!wantWin && info.bust)) {
      return await page.screenshot({ encoding: 'base64' })
    }
  }
  return null
}
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 })
const winBuf = await playRound(page, true, 16)
if (winBuf) { fs.writeFileSync(`${OUT}/mobile-settled-win.png`, winBuf, 'base64'); await scanBuffer(page, winBuf, 'mobile-settled-win') }
else console.log('mobile win: not achieved')
const bustBuf = await playRound(page, false, 16)
if (bustBuf) { fs.writeFileSync(`${OUT}/mobile-settled-bust.png`, bustBuf, 'base64'); await scanBuffer(page, bustBuf, 'mobile-settled-bust') }
else console.log('mobile bust: not achieved')
await browser.close()
