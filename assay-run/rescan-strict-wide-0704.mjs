import fs from 'node:fs'
import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = 'shots-brandqa-0704'

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
    // STRICT: matches actual registry hex families closely
    // gold #FFC83D (255,200,61) / brass ~#caa040 (202,160,64)
    const isBrass = (r,g,b) => r > 150 && (r-b) > 60 && (r-g) > 20 && (g-b) > 25 && g < r
    // volt #00F0FF (0,240,255) / cyan #29E6FF (41,230,255)
    const isCyan = (r,g,b) => r < 80 && g > 180 && b > 200 && (b-r) > 140
    for (let i = 0; i < N; i++) {
      const o = i*4
      const r=data[o],g=data[o+1],b=data[o+2],a=data[o+3]
      if (a < 40) continue
      if (isBrass(r,g,b)) brassMask[i]=1
      if (isCyan(r,g,b)) cyanMask[i]=1
    }
    let dilated = brassMask
    for (let pass=0; pass<dilate; pass++){
      const next = new Uint8Array(N)
      for (let y=0;y<H;y++) for (let x=0;x<W;x++){
        const idx=y*W+x
        if (dilated[idx]) { next[idx]=1; continue }
        let hit=0
        for (let dy=-1;dy<=1&&!hit;dy++) for (let dx=-1;dx<=1&&!hit;dx++){
          const nx=x+dx, ny=y+dy
          if (nx<0||ny<0||nx>=W||ny>=H) continue
          if (dilated[ny*W+nx]) hit=1
        }
        next[idx]=hit
      }
      dilated=next
    }
    let brassCount=0,cyanCount=0,overlapCount=0
    const hits=[]
    for (let i=0;i<N;i++){
      if(brassMask[i]) brassCount++
      if(cyanMask[i]) cyanCount++
      if(cyanMask[i]&&dilated[i]){ overlapCount++; if(hits.length<30) hits.push({x:i%W,y:Math.floor(i/W)}) }
    }
    return { W,H,brassCount,cyanCount,overlapCount,hits }
  }, { b64, dilate })
  console.log(`${file} (dilate=${dilate}): brass=${result.brassCount} cyan=${result.cyanCount} overlap=${result.overlapCount}`, result.hits.slice(0,8))
  return result
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900 } })
const page = (await browser.pages())[0]
const files = fs.readdirSync(OUT).filter(f => f.startsWith('full-') && f.endsWith('.png'))
for (const f of files) {
  await rescan(page, f, 6)
}
await browser.close()
