import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/eed49dad-7609-4969-843a-cb4e422d24da/scratchpad/shots'
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
    let cyanCount = 0, purpleCount = 0, jadeCount = 0
    const cyanSample = [], purpleSample = [], jadeSample = []
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4
        const r = full[i], g = full[i+1], b = full[i+2]
        const chroma = Math.max(r,g,b) - Math.min(r,g,b)
        const isCyanish = b > 90 && g > 80 && r < b - 35 && r < g - 15 && chroma > 45 && r < 180
        if (isCyanish) { cyanCount++; if (cyanSample.length<15) cyanSample.push({x,y,r,g,b}) }
        // purple/lilac: blue and red both dominant over green
        const isPurple = b > 100 && r > 90 && g < r - 30 && g < b - 30 && chroma > 40
        if (isPurple) { purpleCount++; if (purpleSample.length<15) purpleSample.push({x,y,r,g,b}) }
        // jade greenish-teal ~ (31,166,122)
        const isJade = g > 100 && g > r + 20 && g > b + 10 && b > r - 10 && r < 140
        if (isJade) { jadeCount++; if (jadeSample.length<15) jadeSample.push({x,y,r,g,b}) }
      }
    }
    return { cyanCount, purpleCount, jadeCount, cyanSample, purpleSample, jadeSample, w: canvas.width, h: canvas.height }
  }, b64)
  console.log(`[${label}] cyan=${result.cyanCount} purple=${result.purpleCount} jade=${result.jadeCount} (${result.w}x${result.h})`)
  if (result.cyanCount) console.log('  cyan samples', JSON.stringify(result.cyanSample.slice(0,5)))
  if (result.purpleCount) console.log('  purple samples', JSON.stringify(result.purpleSample.slice(0,5)))
  return result
}

async function bgProbe(page, label) {
  const info = await page.evaluate(() => {
    const body = getComputedStyle(document.body).backgroundColor
    const root = document.getElementById('root') || document.body
    const rootBg = getComputedStyle(root).backgroundColor
    // find the outer game container likely first div child
    return { body, rootBg }
  })
  console.log(`[${label}] body-bg=${info.body} root-bg=${info.rootBg}`)
  return info
}

async function fontProbe(page, label) {
  const info = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'))
    const fams = new Set()
    for (const el of all) {
      const cs = getComputedStyle(el)
      if (cs.fontFamily) fams.add(cs.fontFamily)
    }
    return [...fams]
  })
  console.log(`[${label}] font-families:`, JSON.stringify(info))
  return info
}

async function textDump(page, label) {
  const text = await page.evaluate(() => document.body.innerText)
  fs.writeFileSync(`${OUT}/${label}-text.txt`, text)
  const emdash = text.includes('—')
  const casino = /\b(WIN|JACKPOT|LUCKY|HOT|MEGA|MASSIVE|EPIC|LEGENDARY)\b/.test(text)
  console.log(`[${label}] em-dash-present=${emdash} casino-vocab-present=${casino}`)
  if (emdash) {
    const idx = text.indexOf('—')
    console.log('  context:', text.slice(Math.max(0,idx-40), idx+40))
  }
  return { emdash, casino, text }
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await wait(500)

console.log('=== LOBBY ===')
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

// try selecting Heavy/Flooded tier for jade check
await tapText(page, 'Heavy')
await wait(200)
await scanColors(page, 'planning-heavy')

await browser.close()
console.log('DONE')
