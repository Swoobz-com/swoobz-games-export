// Definitive final cyan-pixel scan + fresh screenshot set, refined classifier
// that excludes pale near-white highlights (which read as "brightness/
// contrast boost," not a color accent) and requires real hue separation.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-FINAL-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const tapText = async (page, txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}

async function scanForCyan(page, label) {
  const b64 = await page.screenshot({ encoding: 'base64' })
  const result = await page.evaluate(async (data) => {
    const img = new Image()
    await new Promise((res) => {
      img.onload = res
      img.src = 'data:image/png;base64,' + data
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const full = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    let count = 0
    const sample = []
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4
        const r = full[i]
        const g = full[i + 1]
        const b = full[i + 2]
        const maxc = Math.max(r, g, b)
        const minc = Math.min(r, g, b)
        const chroma = maxc - minc
        // Real saturated cyan/teal: blue+green clearly dominant over red,
        // enough chroma to read as a HUE (not a pale near-white highlight),
        // and not so dark it's imperceptible.
        const isCyanish = b > 90 && g > 80 && r < b - 35 && r < g - 15 && chroma > 45 && r < 180
        if (isCyanish) {
          count++
          if (sample.length < 25) sample.push({ x, y, r, g, b })
        }
      }
    }
    return { count, sample, w: canvas.width, h: canvas.height }
  }, b64)
  console.log(`[${label}] cyan-ish pixel count:`, result.count)
  if (result.sample.length) console.log(JSON.stringify(result.sample.slice(0, 10)))
  return result
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })

// Desktop pass
{
  const page = (await browser.pages())[0]
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await wait(400)
  await page.screenshot({ path: `${OUT}/desktop-lobby.png` })
  await scanForCyan(page, 'desktop-lobby')

  await tapText(page, 'ENTER THE ASSAY LINE')
  await wait(400)
  await page.screenshot({ path: `${OUT}/desktop-planning.png` })
  await scanForCyan(page, 'desktop-planning')

  await tapText(page, 'Heavy')
  await wait(150)
  await page.screenshot({ path: `${OUT}/desktop-heavy-selected.png` })
  await scanForCyan(page, 'desktop-heavy-selected')
}

// Mobile pass (Pixel 7)
{
  const page2 = await browser.newPage()
  await page2.emulate({
    viewport: { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false },
  })
  await page2.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await wait(400)
  await page2.screenshot({ path: `${OUT}/pixel7-lobby.png` })
  await scanForCyan(page2, 'pixel7-lobby')

  await tapText(page2, 'ENTER THE ASSAY LINE')
  await wait(500)
  await page2.screenshot({ path: `${OUT}/pixel7-planning.png` })
  await scanForCyan(page2, 'pixel7-planning')
  await page2.close()
}

// Mobile pass (iPhone 14 Pro)
{
  const page3 = await browser.newPage()
  await page3.emulate({
    viewport: { width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false },
  })
  await page3.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await wait(400)
  await tapText(page3, 'ENTER THE ASSAY LINE')
  await wait(500)
  await page3.screenshot({ path: `${OUT}/iphone14pro-planning.png` })
  await scanForCyan(page3, 'iphone14pro-planning')
  await page3.close()
}

await browser.close()
console.log('DONE')
