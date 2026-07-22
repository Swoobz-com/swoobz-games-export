// PLAYER-UX / DE-HAZE / TO-WIN-HERO verification capture (Tim 2026-07-06).
// Desktop 1440 + mobile 412/393: planning-armed hero, board de-haze sample,
// iPhone fold clearance for RUN THE LINE.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const OUT = process.argv[3] || 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/eed49dad-7609-4969-843a-cb4e422d24da/scratchpad/shots-uxfix'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const tapText = async (page, txt, useTouch) => {
  const h = await page.evaluateHandle((t) => {
    const b = [...document.querySelectorAll('button')]
    return b.find((x) => x.textContent && x.textContent.includes(t)) || null
  }, txt)
  const el = h.asElement()
  if (!el) return false
  const box = await el.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })
  if (useTouch) await page.touchscreen.tap(box.x, box.y)
  else await page.mouse.click(box.x, box.y)
  return true
}

const canvasGeo = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas'); if (!c) return null
  const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }
})

// Sample the board center region for cyan-wash haze. Returns mean RGB of a
// crop that should be dominated by dark water + gold pods (NOT cyan film).
const sampleBoard = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas'); if (!c) return null
  const r = c.getBoundingClientRect()
  // draw the live canvas into an offscreen at 1:1 CSS px to read pixels
  const dpr = window.devicePixelRatio || 1
  const off = document.createElement('canvas')
  off.width = Math.round(r.width); off.height = Math.round(r.height)
  const octx = off.getContext('2d')
  octx.drawImage(c, 0, 0, c.width, c.height, 0, 0, off.width, off.height)
  const cx = Math.round(off.width * 0.5), cy = Math.round(off.height * 0.4)
  const half = 60
  const data = octx.getImageData(cx - half, cy - half, half * 2, half * 2).data
  let rs = 0, gs = 0, bs = 0, n = 0
  let cyanish = 0
  for (let i = 0; i < data.length; i += 4) {
    const R = data[i], G = data[i + 1], B = data[i + 2]
    rs += R; gs += G; bs += B; n++
    // "cyan film" = green&blue both notably above red on a supposedly dark/gold bed
    if (G > R + 18 && B > R + 12) cyanish++
  }
  return { meanR: Math.round(rs / n), meanG: Math.round(gs / n), meanB: Math.round(bs / n), cyanPct: Math.round((cyanish / n) * 1000) / 10, samples: n }
})

async function armLine(page, useTouch, picks = 9) {
  const g = await canvasGeo(page)
  if (!g) return { armed: false }
  const t = g.width / 14
  // paint a diagonal-ish contiguous route from a start cell
  const cells = []
  let col = 3, row = 3
  for (let i = 0; i < picks; i++) { cells.push([col, row]); if (i % 2 === 0) col++; else row++ }
  for (const [c0, r0] of cells) {
    const x = g.left + (c0 + 0.5) * t
    const y = g.top + (r0 + 0.5) * t
    if (useTouch) await page.touchscreen.tap(x, y)
    else await page.mouse.click(x, y)
    await wait(40)
  }
  await wait(250)
  return { armed: true, picks: cells.length }
}

async function desktop() {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--force-device-scale-factor=1'] })
  const page = (await browser.pages())[0]
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await wait(500)
  await page.screenshot({ path: `${OUT}/desktop-1440-lobby.png` })
  await tapText(page, 'ENTER THE DIVE', false)
  await wait(400)
  await page.screenshot({ path: `${OUT}/desktop-1440-planning-empty.png` })
  const arm = await armLine(page, false, 10)
  await page.screenshot({ path: `${OUT}/desktop-1440-planning-armed.png` })
  const sample = await sampleBoard(page)
  // crop just the hero strip (top of the center card) for a close read
  await page.screenshot({ path: `${OUT}/desktop-1440-hero-crop.png`, clip: { x: 300, y: 95, width: 560, height: 90 } })
  // Run the line to settle and capture the hero's settled number
  await tapText(page, 'RUN THE LINE', false)
  await wait(6500)
  await page.screenshot({ path: `${OUT}/desktop-1440-settled.png` })
  await browser.close()
  return { arm, sample }
}

async function mobile(dev) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
  const page = (await browser.pages())[0]
  await page.emulate({ viewport: { width: dev.w, height: dev.h, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false } })
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await wait(500)
  await tapText(page, 'ENTER THE DIVE', true)
  await wait(400)
  await page.screenshot({ path: `${OUT}/${dev.name}-planning-empty.png` })
  await armLine(page, true, 10)
  await page.screenshot({ path: `${OUT}/${dev.name}-planning-armed.png`, fullPage: false })
  await page.screenshot({ path: `${OUT}/${dev.name}-planning-armed-full.png`, fullPage: true })
  // FOLD: RUN THE LINE clearance
  const fold = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')]
    const run = b.find((x) => x.textContent && x.textContent.includes('RUN THE LINE'))
    const rr = run ? run.getBoundingClientRect() : null
    return {
      viewportH: window.innerHeight,
      docScrollHeight: document.documentElement.scrollHeight,
      hasVScroll: document.documentElement.scrollHeight > window.innerHeight + 1,
      runFound: !!run,
      runBottom: rr ? Math.round(rr.bottom) : null,
      runTop: rr ? Math.round(rr.top) : null,
      runFullyAboveFold: rr ? rr.bottom <= window.innerHeight : null,
      clearancePx: rr ? Math.round(window.innerHeight - rr.bottom) : null,
    }
  })
  const sample = await sampleBoard(page)
  await browser.close()
  return { device: dev.name, viewport: `${dev.w}x${dev.h}`, fold, sample }
}

const report = {}
report.desktop = await desktop().catch((e) => ({ error: String(e) }))
report.iphone14pro = await mobile({ name: 'iphone14pro', w: 393, h: 852 }).catch((e) => ({ error: String(e) }))
report.pixel7 = await mobile({ name: 'pixel7', w: 412, h: 915 }).catch((e) => ({ error: String(e) }))
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
console.log('SHOTS:', OUT)
