import fs from 'node:fs'
import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = 'shots-brandqa-0704'

async function crop(page, file, cx, cy, halfW, halfH, scale, outName) {
  const b64 = fs.readFileSync(`${OUT}/${file}`).toString('base64')
  const outB64 = await page.evaluate(async ({ b64, cx, cy, halfW, halfH, scale }) => {
    const img = new Image()
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + b64 })
    const x0 = Math.max(0, cx - halfW), y0 = Math.max(0, cy - halfH)
    const w = halfW * 2, h = halfH * 2
    const src = document.createElement('canvas')
    src.width = img.naturalWidth; src.height = img.naturalHeight
    src.getContext('2d').drawImage(img, 0, 0)
    const crop = src.getContext('2d').getImageData(x0, y0, w, h)
    const mid = document.createElement('canvas')
    mid.width = w; mid.height = h
    mid.getContext('2d').putImageData(crop, 0, 0)
    const out = document.createElement('canvas')
    out.width = w * scale; out.height = h * scale
    const octx = out.getContext('2d')
    octx.imageSmoothingEnabled = false
    octx.drawImage(mid, 0, 0, w * scale, h * scale)
    return out.toDataURL('image/png').split(',')[1]
  }, { b64, cx, cy, halfW, halfH, scale })
  fs.writeFileSync(`${OUT}/${outName}`, outB64, 'base64')
  console.log('wrote', outName)
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900 } })
const page = (await browser.pages())[0]

await crop(page, 'full-desktop-lobby.png', 1290, 72, 60, 30, 8, 'crop-lobby-top-swoobz.png')
await crop(page, 'full-desktop-lobby.png', 700, 970, 120, 20, 8, 'crop-lobby-bottom-rules.png')
await crop(page, 'full-desktop-midcascade.png', 810, 172, 40, 25, 12, 'crop-midcascade-spark.png')
await crop(page, 'full-badvein-transient.png', 488, 148, 40, 25, 12, 'crop-badvein-spot.png')
await crop(page, 'full-mobile-lobby.png', 720, 143, 60, 30, 8, 'crop-mobile-lobby-top.png')

await browser.close()
