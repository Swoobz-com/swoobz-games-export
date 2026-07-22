import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5333/'
const OUT = 'shots-desktop-fill'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const errors = []
const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: 'new',
  args: ['--autoplay-policy=no-user-gesture-required'],
})
const page = (await browser.pages())[0]
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('CONSOLE.ERROR: ' + m.text())
})

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
const bodyText = () => page.evaluate(() => document.body.innerText)
const canvasBox = () => page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return null
  const r = c.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})
const countButtonsNearCanvas = () => page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return -1
  // The board wrapper is the canvas's parent (desktop mode) — in the OLD
  // build this parent also held the zoom (+/-) and pan (arrow) button rows.
  return c.parentElement ? c.parentElement.querySelectorAll('button').length : -1
})
const specimenCaseWidths = () => page.evaluate(() => {
  // Specimen cases are absolutely-positioned brass-bordered divs anchored
  // via left/right CSS — find by a distinguishing text match then measure
  // their outer box.
  const all = [...document.querySelectorAll('div')]
  const found = []
  for (const d of all) {
    if (d.textContent && d.textContent.trim().startsWith('SPECIMEN CASE')) {
      // walk up to the outer positioned ancestor (3 levels per SpecimenCase markup)
      let el = d
      for (let i = 0; i < 3 && el.parentElement; i++) el = el.parentElement
      const r = el.getBoundingClientRect()
      found.push(Math.round(r.width))
    }
  }
  return found
})

const report = { viewports: {} }

const desktopViewports = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '2560x1440', width: 2560, height: 1440 },
]

for (const vp of desktopViewports) {
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(500)
  const vr = { }
  vr.lobbyShot = `${OUT}/${vp.name}-01-lobby.png`
  await page.screenshot({ path: vr.lobbyShot })

  await clickText('ENTER THE ASSAY LINE')
  await wait(400)
  const box = await canvasBox()
  vr.canvasBox = box ? { w: Math.round(box.w), h: Math.round(box.h) } : null
  vr.tilePx = box ? +(box.w / 32).toFixed(2) : null
  vr.buttonsNearCanvas = await countButtonsNearCanvas()
  vr.specimenCaseWidths = await specimenCaseWidths()
  vr.planningShot = `${OUT}/${vp.name}-02-planning.png`
  await page.screenshot({ path: vr.planningShot })

  // Paint a claim-line of 12 tiles via mouse drag across the board.
  if (box) {
    const tile = box.w / 32
    // Press down at first tile, drag through several tiles, release (drag-paint).
    const pts = []
    for (let i = 0; i < 12; i++) {
      const col = 3 + i
      const row = 5 + Math.floor(i / 8)
      pts.push({ x: box.x + col * tile + tile / 2, y: box.y + row * tile + tile / 2 })
    }
    await page.mouse.move(pts[0].x, pts[0].y)
    await page.mouse.down()
    for (const p of pts.slice(1)) {
      await page.mouse.move(p.x, p.y, { steps: 2 })
      await wait(15)
    }
    await page.mouse.up()
  }
  await wait(300)
  vr.trailShot = `${OUT}/${vp.name}-03-trail.png`
  await page.screenshot({ path: vr.trailShot })
  vr.trailText = (await bodyText()).replace(/\n/g, ' | ').slice(0, 300)

  vr.plunged = await clickText('PLUNGE')
  await wait(600)
  vr.assayingShot = `${OUT}/${vp.name}-04-assaying.png`
  await page.screenshot({ path: vr.assayingShot })

  await wait(3200)
  vr.settledShot = `${OUT}/${vp.name}-05-settled.png`
  await page.screenshot({ path: vr.settledShot })
  const settledText = (await bodyText()).replace(/\n/g, ' | ')
  vr.hasOutcome = /CLAIM PROVEN|BUSTED/.test(settledText)

  report.viewports[vp.name] = vr
}

report.errors = errors
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
await browser.close()
process.exit(0)
