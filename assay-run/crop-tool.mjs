import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const inFile = process.argv[2]
const outFile = process.argv[3]
const x = +process.argv[4], y = +process.argv[5], w = +process.argv[6], h = +process.argv[7]
const scale = +(process.argv[8] || 4)
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = (await browser.pages())[0]
await page.setViewport({ width: w * scale, height: h * scale })
const dataUrl = 'file:///' + inFile.split('\\').join('/')
await page.goto(dataUrl)
await page.evaluate(async (dataUrl, x, y, w, h, scale) => {
  const img = new Image()
  await new Promise((res) => { img.onload = res; img.src = dataUrl })
  document.body.style.margin = '0'
  const canvas = document.createElement('canvas')
  canvas.width = w * scale
  canvas.height = h * scale
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, x, y, w, h, 0, 0, w * scale, h * scale)
  document.body.appendChild(canvas)
}, dataUrl, x, y, w, h, scale)
await page.screenshot({ path: outFile })
await browser.close()
