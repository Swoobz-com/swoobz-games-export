import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5195/'
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900 } })
const page = (await browser.pages())[0]
await page.goto(URL, { waitUntil: 'networkidle0' })
const guess = URL.replace(/\/$/, '') + '/@fs/C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/originals/assay/assets/coin-dormant-v2.png'
const result = await page.evaluate(async (src) => {
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src })
    const cvs = document.createElement('canvas')
    cvs.width = img.naturalWidth; cvs.height = img.naturalHeight
    const ctx = cvs.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const data = ctx.getImageData(0, 0, cvs.width, cvs.height).data
    let cyanish = 0, goldish = 0, total = 0
    const cyanSamples = [], goldSamples = []
    for (let i = 0; i < data.length; i += 4) {
      const rr = data[i], gg = data[i+1], bb = data[i+2], aa = data[i+3]
      if (aa < 20) continue
      total++
      if (bb > 150 && gg > 150 && rr < 120 && bb >= gg - 20) { cyanish++; if (cyanSamples.length<5) cyanSamples.push([rr,gg,bb,aa]) }
      if (rr > 150 && gg > 110 && bb < 110 && rr > bb + 60 && gg > bb + 30) { goldish++; if (goldSamples.length<5) goldSamples.push([rr,gg,bb,aa]) }
    }
    return { ok:true, src, width: cvs.width, height: cvs.height, total, cyanish, goldish, cyanPct: total?(100*cyanish/total).toFixed(3):'n/a', goldPct: total?(100*goldish/total).toFixed(3):'n/a', cyanSamples, goldSamples }
  } catch(e) { return { ok:false, err: String(e), src } }
}, guess)
console.log(JSON.stringify(result, null, 2))
await browser.close()
