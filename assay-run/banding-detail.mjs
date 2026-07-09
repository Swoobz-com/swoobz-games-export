import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5194/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900 } })
const page = (await browser.pages())[0]
await page.goto(URL, { waitUntil: 'networkidle2' })
await wait(500)
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')]
  const b = btns.find((x) => x.textContent && x.textContent.includes('ENTER THE ASSAY LINE'))
  if (b) b.click()
})
await wait(500)
const result = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  const ctx = c.getContext('2d')
  const w = c.width, h = c.height
  // sample multiple scanlines through the radial gradient region (top area, avoiding tiles as much as possible -- actually gradient is BEHIND tiles so tiles will dominate; sample the visible corner gap between tile draws is hard. Instead sample the raw board bg by reading a diagonal outside where dormant coin socket-shadow gaps show background)
  // Better: sample right along y=4px (very top edge, above tile row 0's coin) across full width
  const rows = [2, 4, 6, 10, 20]
  const out = {}
  for (const y of rows) {
    const vals = []
    for (let x = 0; x < w; x += 2) {
      const d = ctx.getImageData(x, y, 1, 1).data
      vals.push([d[0], d[1], d[2]])
    }
    // find distinct plateau values in order, compute deltas between consecutive distinct plateaus
    const plateaus = []
    let last = null
    for (const v of vals) {
      if (!last || v[0] !== last[0] || v[1] !== last[1] || v[2] !== last[2]) {
        plateaus.push(v)
        last = v
      }
    }
    const deltas = []
    for (let i = 1; i < plateaus.length; i++) {
      const a = plateaus[i - 1], b = plateaus[i]
      const d = Math.max(Math.abs(a[0]-b[0]), Math.abs(a[1]-b[1]), Math.abs(a[2]-b[2]))
      deltas.push(d)
    }
    out['y' + y] = { numPlateaus: plateaus.length, sampleCount: vals.length, maxDelta: Math.max(...deltas, 0), avgDelta: deltas.length ? (deltas.reduce((a,b)=>a+b,0)/deltas.length).toFixed(2) : 0 }
  }
  return out
})
console.log(JSON.stringify(result, null, 2))
await browser.close()
