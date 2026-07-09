import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = './fabi-shots-0704'
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

function hueOf(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const d = max - min
  if (d === 0) return null
  let h
  if (max === r) h = 60 * (((g - b) / d) % 6)
  else if (max === g) h = 60 * ((b - r) / d + 2)
  else h = 60 * ((r - g) / d + 4)
  if (h < 0) h += 360
  return h
}

async function scanColors(page, label) {
  const b64 = await page.screenshot({ encoding: 'base64' })
  fs.writeFileSync(`${OUT}/${label}.png`, Buffer.from(b64, 'base64'))
  const result = await page.evaluate(async (data) => {
    const img = new Image()
    await new Promise((res) => { img.onload = res; img.src = 'data:image/png;base64,' + data })
    const canvas = document.createElement('canvas')
    canvas.width = img.width; canvas.height = img.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const full = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    return { data: Array.from(full), w: canvas.width, h: canvas.height }
  }, b64)
  const { data, w, h } = result
  let trueCyan = 0, jade = 0, purple = 0, gold = 0
  const cyanSample = [], jadeSample = [], purpleSample = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const r = data[i], g = data[i+1], b = data[i+2]
      const max = Math.max(r,g,b), min = Math.min(r,g,b), chroma = max - min
      if (chroma < 40 || max < 70) continue // skip near-grey/dark
      const hue = hueOf(r,g,b)
      if (hue === null) continue
      // true cyan/volt hue band ~175-200deg (b>=g, both >> r)
      if (hue >= 172 && hue <= 202 && b >= g - 8) {
        trueCyan++
        if (cyanSample.length < 15) cyanSample.push({x,y,r,g,b,hue: Math.round(hue)})
      }
      // jade hue band ~140-170deg (g>b clearly)
      else if (hue >= 140 && hue < 172) {
        jade++
        if (jadeSample.length < 8) jadeSample.push({x,y,r,g,b,hue: Math.round(hue)})
      }
      // purple/lilac/magenta band ~260-320
      if (hue >= 255 && hue <= 325 && chroma > 40) {
        purple++
        if (purpleSample.length < 15) purpleSample.push({x,y,r,g,b,hue: Math.round(hue)})
      }
      // gold band ~30-50
      if (hue >= 25 && hue <= 55) gold++
    }
  }
  console.log(`[${label}] TRUE-CYAN=${trueCyan} jade=${jade} purple/lilac=${purple} gold=${gold} (${w}x${h})`)
  if (trueCyan) console.log('  cyan samples', JSON.stringify(cyanSample.slice(0,8)))
  if (purple) console.log('  purple samples', JSON.stringify(purpleSample.slice(0,8)))
  if (jade) console.log('  jade samples', JSON.stringify(jadeSample.slice(0,5)))
  return { trueCyan, jade, purple, gold }
}

async function bgProbe(page, label) {
  const info = await page.evaluate(() => ({
    body: getComputedStyle(document.body).backgroundColor,
  }))
  console.log(`[${label}] body-bg=${info.body}`)
}

async function fontProbe(page, label) {
  const info = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'))
    const fams = new Set()
    for (const el of all) fams.add(getComputedStyle(el).fontFamily)
    return [...fams]
  })
  console.log(`[${label}] font-families:`, JSON.stringify(info))
}

async function textDump(page, label) {
  const text = await page.evaluate(() => document.body.innerText)
  fs.writeFileSync(`${OUT}/${label}-text.txt`, text)
  const emdash = text.includes('—')
  const casino = /\b(WIN|JACKPOT|LUCKY|HOT|MEGA|MASSIVE|EPIC|LEGENDARY)\b/.test(text)
  console.log(`[${label}] em-dash-present=${emdash} casino-vocab-present=${casino}`)
  if (emdash) {
    const idx = text.indexOf('—')
    console.log('  context:', JSON.stringify(text.slice(Math.max(0,idx-40), idx+40)))
  }
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await wait(500)

console.log('=== LOBBY ===')
console.log('page title:', await page.title())
await scanColors(page, 'lobby')
await bgProbe(page, 'lobby')
await fontProbe(page, 'lobby')
await textDump(page, 'lobby')

await tapText(page, 'ENTER THE ASSAY LINE')
await wait(500)
console.log('=== PLANNING ===')
await scanColors(page, 'planning')
await bgProbe(page, 'planning')
await fontProbe(page, 'planning')
await textDump(page, 'planning')

// mark some tiles to arm a claim line and reveal jade thread, then commit and settle
const canvasBox = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  const r = c.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})
console.log('canvas box', canvasBox)
// click several adjacent tiles near top-left of board to build a trail
for (let k = 0; k < 6; k++) {
  const tx = canvasBox.x + canvasBox.w * (0.15 + k * 0.03)
  const ty = canvasBox.y + canvasBox.h * 0.15
  await page.mouse.click(tx, ty)
  await wait(80)
}
await wait(300)
console.log('=== PLANNING (line marked, jade thread should show) ===')
await scanColors(page, 'planning-marked')
await textDump(page, 'planning-marked')

// commit
const committed = await tapText(page, 'RUN THE LINE')
console.log('clicked RUN THE LINE:', committed)
await wait(4000)
console.log('=== SETTLED (after run) ===')
await scanColors(page, 'settled')
await bgProbe(page, 'settled')
await textDump(page, 'settled')

await browser.close()
console.log('DONE')
