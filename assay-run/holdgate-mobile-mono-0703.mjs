import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5401/'
const OUT = 'shots-holdgate-mobilemono-0703'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = (await browser.pages())[0]
const clickText = async (txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}
const canvasBox = () => page.evaluate(() => {
  const c = document.querySelector('canvas')
  const r = c.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})
async function paintSerpentine(n, box, tileOverride) {
  const tile = tileOverride || box.w / 32
  let count = 0
  for (let row = 3; row < 30 && count < n; row += 2) {
    for (let col = 2; col < 30 && count < n; col += 3) {
      await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
      count++
      await wait(6)
    }
  }
}

const report = {}

// ── Mobile touch target check (390 + 412 wide) ─────────────────────────────
for (const w of [390, 412]) {
  await page.setViewport({ width: w, height: 844, deviceScaleFactor: 2 })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(400)
  await clickText('ENTER THE ASSAY LINE')
  await wait(300)
  const safetyRect = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const b = btns.find((x) => x.getAttribute('aria-label')?.includes('Play safe'))
    if (!b) return null
    const r = b.getBoundingClientRect()
    return { width: r.width, height: r.height }
  })
  report[`mobile_${w}_safetyLink`] = safetyRect
  await page.screenshot({ path: `${OUT}/mobile-${w}-planning.png` })
}

// ── Geist Mono computed-style check across the 5 numeral sites ─────────────
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(400)

// Site 1: header subtitle "RTP 96.50%"
report.site1_rtp = await page.evaluate(() => {
  const spans = [...document.querySelectorAll('span')]
  const el = spans.find((s) => s.textContent === '96.50%')
  return el ? getComputedStyle(el).fontFamily : null
})

await clickText('ENTER THE ASSAY LINE')
await wait(300)

// Site 2: ASSAY TALLY caption "N.NNx at GO" (narrow/side-rail — at 1440 wide it's the specimen case)
report.site2_tallyCaption = await page.evaluate(() => {
  const divs = [...document.querySelectorAll('div')]
  const el = divs.find((d) => /at GO$/.test(d.textContent || '') && d.children.length === 0)
  return el ? getComputedStyle(el).fontFamily : null
})

// Site 3: Odometer "/ 8 min"
report.site3_odometer = await page.evaluate(() => {
  const spans = [...document.querySelectorAll('span')]
  const el = spans.find((s) => /\/ \d+ min/.test(s.textContent || ''))
  return el ? getComputedStyle(el).fontFamily : null
})

let box = await canvasBox()
await paintSerpentine(10, box)
await wait(200)
await clickText('PLUNGE')
await wait(3200)

// Site 4: settlement summary "N nubs · N.NNx" or "busted at nub..."
report.site4_settlementSummary = await page.evaluate(() => {
  const divs = [...document.querySelectorAll('div')]
  const el = divs.find((d) => (/nubs ·/.test(d.textContent || '') || /busted at nub/.test(d.textContent || '')) && d.children.length === 0)
  return el ? getComputedStyle(el).fontFamily : null
})
await page.screenshot({ path: `${OUT}/desktop-settled.png` })

// Site 5: SafetyPanel "N round(s) played · +N.NN net"
await clickText('PLAY SAFE')
await wait(300)
report.site5_safetyPanel = await page.evaluate(() => {
  const ps = [...document.querySelectorAll('p')]
  const el = ps.find((p) => /played ·/.test(p.textContent || ''))
  return el ? getComputedStyle(el).fontFamily : null
})
await page.screenshot({ path: `${OUT}/desktop-safetypanel.png` })

console.log(JSON.stringify(report, null, 2))
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
await browser.close()
