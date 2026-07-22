import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto('http://localhost:5182/', { waitUntil: 'load', timeout: 60000 })
await wait(800)

// Sample a vertical column of pixels in the visible left margin (outside the panel)
// via html2canvas-less approach: draw the page itself isn't directly readable as pixels
// without a screenshot; take a targeted clip screenshot then decode via <img> + canvas
// in-page (same-origin data URL, so getImageData works without tainting).
const buf = await page.screenshot({ clip: { x: 90, y: 0, width: 4, height: 900 } })
const b64 = buf.toString('base64')
const result = await page.evaluate(async (dataUrl) => {
  const img = new Image()
  img.src = dataUrl
  await new Promise((r) => (img.onload = r))
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  const ctx = c.getContext('2d')
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, img.width, img.height).data
  const rows = []
  for (let y = 0; y < img.height; y++) {
    const i = (y * img.width + 1) * 4
    rows.push([data[i], data[i + 1], data[i + 2]])
  }
  // detect long runs of IDENTICAL rgb (banding = flat plateau then a hard jump)
  let maxRun = 1, curRun = 1, jumps = 0
  for (let y = 1; y < rows.length; y++) {
    const same = rows[y][0] === rows[y - 1][0] && rows[y][1] === rows[y - 1][1] && rows[y][2] === rows[y - 1][2]
    if (same) { curRun++; maxRun = Math.max(maxRun, curRun) } else { curRun = 1 }
    const delta = Math.abs(rows[y][0]-rows[y-1][0]) + Math.abs(rows[y][1]-rows[y-1][1]) + Math.abs(rows[y][2]-rows[y-1][2])
    if (delta > 6) jumps++
  }
  return { maxRun, jumps, sampleCount: rows.length, first: rows[0], mid: rows[Math.floor(rows.length/2)], last: rows[rows.length-1] }
}, 'data:image/png;base64,' + b64)

console.log(JSON.stringify(result, null, 2))
await browser.close()
