import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5186/'
const OUT = 'shots-artotty-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const clickText = async (page, txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}
const canvasBox = (page) =>
  page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })

async function paintTrail(page, box, cols) {
  // paint a diagonal-ish trail; cols = number of tiles to try to claim
  const tile = box.w / 32
  // start near bottom-center, walk up in a connected path
  let r = 28
  let c = 16
  for (let i = 0; i < cols; i++) {
    await page.mouse.click(box.x + c * tile + tile / 2, box.y + r * tile + tile / 2)
    await wait(30)
    r -= 1
    if (i % 3 === 2) c += 1
  }
}

async function playRound(page, vp, label, trailLen) {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(500)
  await page.screenshot({ path: `${OUT}/${vp}-${label}-01-lobby.png` })

  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(500)
  await page.screenshot({ path: `${OUT}/${vp}-${label}-02-planning-empty.png` })

  const box = await canvasBox(page)
  if (!box) return { error: 'no canvas' }
  await paintTrail(page, box, trailLen)
  await wait(200)
  await page.screenshot({ path: `${OUT}/${vp}-${label}-03-trail-painted.png` })

  // Throw breaker then burst-capture the reveal cascade
  await clickText(page, 'THROW BREAKER')
  const burst = []
  for (let i = 0; i < 16; i++) {
    await wait(130)
    const p = `${OUT}/${vp}-${label}-04-reveal-${String(i).padStart(2, '0')}.png`
    await page.screenshot({ path: p })
    burst.push(p)
  }
  await wait(600)
  await page.screenshot({ path: `${OUT}/${vp}-${label}-05-settled.png` })

  const info = await page.evaluate(() => {
    const t = document.body.innerText
    return {
      won: /CLAIM PROVEN/.test(t),
      bust: /BAD VEIN|BUSTED/.test(t),
      snippet: t.slice(0, 220).replace(/\s+/g, ' '),
    }
  })
  return info
}

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: 'new',
  defaultViewport: null,
})
const page = (await browser.pages())[0]
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE.ERROR: ' + m.text()) })

const report = {}

// Mobile portrait primary
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 })
report.mobile_shortTrail = await playRound(page, 'm412', 'A', 5)
report.mobile_longTrail = await playRound(page, 'm412', 'B', 22)
report.mobile_longTrail2 = await playRound(page, 'm412', 'C', 26)

// Desktop
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
report.desktop_shortTrail = await playRound(page, 'd1440', 'A', 6)
report.desktop_longTrail = await playRound(page, 'd1440', 'B', 24)

report.consoleErrors = errors
console.log(JSON.stringify(report, null, 2))
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
await browser.close()
