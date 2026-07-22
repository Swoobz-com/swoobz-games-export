import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.goto('file:///' + process.cwd().replace(/\/g,'/') + '/shots-abyss-visreg-0706/abyss-desktop-entry.png')
await page.setViewport({ width: 1440, height: 900 })
const dataUrl = await page.evaluate(async () => {
  const img = document.querySelector('img')
  await new Promise(r => img.complete ? r() : img.onload = r)
  const c = document.createElement('canvas')
  c.width = 1440; c.height = 900
  const ctx = c.getContext('2d')
  ctx.drawImage(img, 0, 0)
  // crop region around x=250-550 y=650-900 (bottom left, sub-like object)
  const c2 = document.createElement('canvas')
  c2.width = 600; c2.height = 500
  const ctx2 = c2.getContext('2d')
  ctx2.imageSmoothingEnabled = false
  ctx2.drawImage(c, 100, 550, 600, 350, 0, 0, 1200, 700)
  return c2.toDataURL()
})
const fs = await import('node:fs')
fs.writeFileSync('_crop_sub.png', Buffer.from(dataUrl.split(',')[1], 'base64'))
await browser.close()
