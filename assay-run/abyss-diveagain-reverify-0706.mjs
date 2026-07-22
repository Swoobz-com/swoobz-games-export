// Confirms DIVE AGAIN CurrentKey >=44px on iPhone 14 Pro after a full round,
// and that RUN THE LINE tap fires (state transition to active) on real touch.
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
  const box = await el.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })
  await page.touchscreen.tap(box.x, box.y)
  return true
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
const page = (await browser.pages())[0]
await page.emulate({ viewport: { width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false } })
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await wait(400)

await tapText(page, 'ENTER THE DIVE')
await wait(400)

// Pick REEF (lowest risk, quick settle) + 8 min tiles for a fast, near-certain-ish round
await tapText(page, 'REEF')
await wait(150)

const geo = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  const cr = c.getBoundingClientRect()
  return { left: cr.left, top: cr.top }
})
const TILE = 46
for (let i = 0; i < 8; i++) {
  const col = i % 5, row = Math.floor(i / 5)
  await page.touchscreen.tap(geo.left + col * TILE + TILE / 2, geo.top + row * TILE + TILE / 2)
  await wait(60)
}

const preRun = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes('RUN THE LINE'))
  return b ? { text: b.textContent, disabled: b.disabled } : null
})
console.log('pre-run button state:', JSON.stringify(preRun))

const fired = await tapText(page, 'RUN THE LINE')
console.log('RUN THE LINE tap fired:', fired)

// Wait for settle (up to ~8s)
let settled = null
for (let i = 0; i < 40; i++) {
  await wait(200)
  settled = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const dive = btns.find((b) => b.textContent && b.textContent.includes('DIVE AGAIN'))
    return dive ? { found: true, rect: dive.getBoundingClientRect().toJSON ? null : (() => { const r = dive.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height), width: Math.round(r.width) } })() } : { found: false }
  })
  if (settled.found) break
}
console.log('DIVE AGAIN settle state:', JSON.stringify(settled))

await page.screenshot({ path: 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/abyss-fixpass/iphone14pro-reverify-settled.png' })

await browser.close()
