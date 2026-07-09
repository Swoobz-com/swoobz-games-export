import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:6303/'
const OUT = 'shots-rgc5-qa-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const clickText = async (page, txt) => {
  const h = await page.evaluateHandle((t) => {
    const b = [...document.querySelectorAll('button')]
    return b.find((x) => x.textContent && x.textContent.trim().includes(t)) || null
  }, txt)
  const el = h.asElement()
  if (!el) return false
  await el.click()
  return true
}
const safetyState = (page) =>
  page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.trim().includes('PLAY SAFE'))
    if (!b) return { found: false }
    const r = b.getBoundingClientRect()
    const cs = getComputedStyle(b)
    return {
      found: true,
      disabled: b.disabled,
      visible: cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0 && r.top >= 0 && r.top < window.innerHeight,
      w: r.width, h: r.height, top: r.top, left: r.left,
    }
  })
const canvasBox = (page) =>
  page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })

const VPS = [
  { name: 'desktop-1440x900', width: 1440, height: 900, dsf: 1, mobile: false },
  { name: 'pixel7', width: 412, height: 915, dsf: 2.625, mobile: true },
]

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null, args: ['--autoplay-policy=no-user-gesture-required'] })
const report = {}

for (const vp of VPS) {
  const page = await browser.newPage()
  await page.emulate({ viewport: { width: vp.width, height: vp.height, deviceScaleFactor: vp.dsf, isMobile: vp.mobile, hasTouch: vp.mobile, isLandscape: false } })
  report[vp.name] = {}

  // Phase: lobby
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(300)
  report[vp.name].lobby = await safetyState(page)
  await page.screenshot({ path: `${OUT}/safety-${vp.name}-lobby.png` })

  // Phase: planning (bet-entry / tile painting)
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(300)
  report[vp.name].planning = await safetyState(page)
  await page.screenshot({ path: `${OUT}/safety-${vp.name}-planning.png` })

  // paint MIN_TRAIL tiles then plunge -> phase: assaying (mid-cascade)
  const box = await canvasBox(page)
  if (box) {
    const tile = box.w / 10
    let r = 8, c = 1
    for (let i = 0; i < 8; i++) {
      await page.mouse.click(box.x + c * tile + tile / 2, box.y + r * tile + tile / 2)
      await wait(15)
      c += 1
      if (c >= 9) { c = 1; r -= 1 }
    }
    await clickText(page, 'THROW BREAKER')
    await wait(120) // mid-cascade window (CASCADE_INTERVAL_MS=90/nub, 8 nubs ~720ms total)
    report[vp.name].assaying = await safetyState(page)
    await page.screenshot({ path: `${OUT}/safety-${vp.name}-assaying.png` })

    // wait for settle
    await wait(3000)
    report[vp.name].settled = await safetyState(page)
    await page.screenshot({ path: `${OUT}/safety-${vp.name}-settled.png` })

    // open the PLAY SAFE panel itself and confirm it renders correctly (CLOSE button reachable, no clipped text)
    await clickText(page, 'PLAY SAFE')
    await wait(300)
    const panel = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]')
      if (!d) return { open: false }
      const r = d.getBoundingClientRect()
      const closeBtn = [...d.querySelectorAll('button')].find((b) => b.textContent.includes('CLOSE'))
      const cr = closeBtn ? closeBtn.getBoundingClientRect() : null
      return {
        open: true,
        text: d.textContent.trim(),
        hasSelfExclusionText: /self-exclusion/i.test(d.textContent),
        hasLimitsText: /limit/i.test(d.textContent),
        withinViewport: r.left >= 0 && r.top >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight,
        closeBtnReachable: cr ? cr.width > 0 && cr.height > 0 && cr.top >= 0 && cr.bottom <= window.innerHeight : false,
      }
    })
    report[vp.name].safetyPanel = panel
    await page.screenshot({ path: `${OUT}/safety-${vp.name}-panel.png` })
  }
  await page.close()
}

fs.writeFileSync(`${OUT}/safety-reachability-report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
await browser.close()
