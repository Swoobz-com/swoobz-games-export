// Re-confirm RG-C5: the "LINE SECURED" hero-pop must be byte-identical
// (computed style / timing) regardless of tier or payout magnitude.
import puppeteer from 'puppeteer-core'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
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

async function playAndCaptureHero(page, tierLabel, tiles) {
  await tapText(page, 'ENTER THE ASSAY LINE').catch(() => {})
  await wait(200)
  await tapText(page, tierLabel)
  await wait(150)
  const geo = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const cr = c.getBoundingClientRect()
    return { left: cr.left, top: cr.top, w: cr.width }
  })
  const dim = 10
  const tileCss = geo.w / dim
  for (let i = 0; i < tiles; i++) {
    const col = i % dim
    const row = Math.floor(i / dim)
    await page.mouse.click(geo.left + col * tileCss + tileCss / 2, geo.top + row * tileCss + tileCss / 2)
  }
  await tapText(page, 'RUN THE LINE')
  // Poll until settled, capture hero-pop computed style ASAP after settle.
  let won = false
  for (let i = 0; i < 60; i++) {
    const t = await page.evaluate(() => document.body.innerText)
    if (t.includes('LINE SECURED')) {
      won = true
      break
    }
    if (t.includes('CRACKED BOX · BUSTED')) break
    await wait(80)
  }
  if (!won) return null
  const style = await page.evaluate(() => {
    const badge = [...document.querySelectorAll('div')].find((d) =>
      getComputedStyle(d).animationName.includes('assayHeroPop'),
    )
    if (!badge) return null
    const cs = getComputedStyle(badge)
    return {
      animationName: cs.animationName,
      animationDuration: cs.animationDuration,
      fontSize: cs.fontSize,
      padding: cs.padding,
      borderRadius: cs.borderRadius,
      border: cs.border,
      boxShadow: cs.boxShadow,
      background: cs.background,
    }
  })
  await tapText(page, 'ASSAY AGAIN')
  await wait(200)
  return style
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await wait(300)

const leanSmall = await playAndCaptureHero(page, 'Lean', 8) // small payout, low bombs
console.log('LEAN (small line, 1.24x-ish):', JSON.stringify(leanSmall))

const leanBig = await playAndCaptureHero(page, 'Heavy', 8) // try a bigger multiplier tier
console.log('HEAVY (bigger multiplier tier):', JSON.stringify(leanBig))

if (leanSmall && leanBig) {
  const same = JSON.stringify(leanSmall) === JSON.stringify(leanBig)
  console.log('RG-C5 IDENTICAL ACROSS TIERS/MAGNITUDE:', same)
} else {
  console.log('One of the two rounds busted instead of settling as a win — re-run needed for a clean A/B pair.')
}

await browser.close()
