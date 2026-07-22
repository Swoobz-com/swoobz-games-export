// INDEPENDENT re-verify of CRIT #1 (mobile CTA fold) + CRIT #2 (PLAY SAFE
// reachability) + coachmark/PLAY SAFE overlap regression check.
// Fresh script, not reusing the builder's own consolidated-verify-0704.mjs
// output as evidence.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-a11y-verify-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const DEVICES = [
  { name: 'pixel7', width: 412, height: 915 },
  { name: 'iphone14pro', width: 393, height: 852 },
]

const tapText = async (page, txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  const box = await el.evaluate((e) => {
    const r = e.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  await page.touchscreen.tap(box.x, box.y)
  return true
}

const rects = (page) =>
  page.evaluate(() => {
    const findBtn = (txt) =>
      [...document.querySelectorAll('button')].find((b) => b.textContent && b.textContent.includes(txt)) || null
    const run = findBtn('RUN THE LINE')
    const safe = findBtn('PLAY SAFE')
    const coachmark = document.querySelector('[aria-label="How to play"]')
    const dismissBtn = document.querySelector('[aria-label="Dismiss how-to-play tip"]')
    const rectOf = (el) => (el ? el.getBoundingClientRect() : null)
    const asObj = (r) => (r ? { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height } : null)
    const intersects = (a, b) => {
      if (!a || !b) return false
      return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom)
    }
    const runR = rectOf(run)
    const safeR = rectOf(safe)
    const coachR = rectOf(coachmark)
    return {
      scrollY: window.scrollY,
      viewportH: window.innerHeight,
      viewportW: window.innerWidth,
      run: asObj(runR),
      runFound: !!run,
      runFullyOnScreen: runR ? runR.top >= 0 && runR.bottom <= window.innerHeight : null,
      runMarginBelow: runR ? Math.round(window.innerHeight - runR.bottom) : null,
      safe: asObj(safeR),
      safeFound: !!safe,
      safeFullyOnScreen: safeR ? safeR.top >= 0 && safeR.bottom <= window.innerHeight && safeR.left >= 0 && safeR.right <= window.innerWidth : null,
      coachmarkPresent: !!coachmark,
      coachmark: asObj(coachR),
      overlapRunCoachmark: intersects(runR, coachR),
      overlapSafeCoachmark: intersects(safeR, coachR),
      dismissBtnFound: !!dismissBtn,
    }
  })

async function run(dev) {
  const browser = await puppeteer.launch({
    executablePath: EXE,
    headless: 'new',
    args: ['--autoplay-policy=no-user-gesture-required'],
  })
  const page = (await browser.pages())[0]
  await page.emulate({
    viewport: { width: dev.width, height: dev.height, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false },
  })
  const log = []

  // Fresh localStorage so the coachmark is guaranteed to render (worst case
  // for the fold + overlap check).
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await page.evaluate(() => window.localStorage.removeItem('assay_coachmark_seen_v1'))
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(500)

  // --- lobby: PLAY SAFE reachability ---
  log.push({ phase: 'lobby', ...(await rects(page)) })
  await page.screenshot({ path: `${OUT}/${dev.name}-lobby.png` })

  await tapText(page, 'ENTER THE ASSAY LINE')
  await wait(600)

  // --- planning, 0 boxes, coachmark still visible (fresh localStorage) ---
  const planningWithCoachmark = await rects(page)
  log.push({ phase: 'planning-0box-coachmark-visible', ...planningWithCoachmark })
  await page.screenshot({ path: `${OUT}/${dev.name}-planning-0box-coachmark.png` })

  // Select Heavy floor BEFORE painting (matches the CRIT #1 repro exactly —
  // Heavy floor was the reported case).
  await tapText(page, 'Heavy')
  await wait(250)
  log.push({ phase: 'planning-0box-heavy-selected', ...(await rects(page)) })
  await page.screenshot({ path: `${OUT}/${dev.name}-planning-heavy-0box.png` })

  // Paint a minimal valid line via the canvas (top-left corner of the pan
  // window) to reach the ARMED state (RUN THE LINE enabled) — the real
  // pre-commit state a player is in right before tapping it.
  await page.evaluate(() => {
    const scrollables = [...document.querySelectorAll('div')].filter(
      (d) => d.scrollWidth > d.clientWidth || d.scrollHeight > d.clientHeight,
    )
    scrollables.forEach((d) => {
      d.scrollLeft = 0
      d.scrollTop = 0
    })
  })
  await wait(100)
  const geo = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const cr = c.getBoundingClientRect()
    return { left: cr.left, top: cr.top }
  })
  const TILE = 46
  for (let i = 0; i < 8; i++) {
    const col = i % 4
    const row = Math.floor(i / 4)
    await page.touchscreen.tap(geo.left + col * TILE + TILE / 2, geo.top + row * TILE + TILE / 2)
    await wait(60)
  }
  await wait(200)
  const armedState = await rects(page)
  log.push({ phase: 'planning-armed-heavy-scroll0', ...armedState })
  await page.screenshot({ path: `${OUT}/${dev.name}-planning-armed-heavy-scroll0.png` })

  // Dismiss coachmark now, re-measure (should be same or better).
  await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Dismiss how-to-play tip"]')
    if (btn) btn.click()
  })
  await wait(150)
  log.push({ phase: 'planning-armed-heavy-coachmark-dismissed', ...(await rects(page)) })
  await page.screenshot({ path: `${OUT}/${dev.name}-planning-armed-heavy-dismissed.png` })

  // --- assaying: run the line, poll PLAY SAFE reachability during the whole animated phase ---
  await tapText(page, 'RUN THE LINE')
  for (const delayMs of [0, 100, 300, 600, 1000, 1500, 2000, 2500]) {
    await wait(delayMs === 0 ? 50 : 100)
    const st = await rects(page)
    log.push({ phase: `assaying-t${delayMs}ms`, ...st })
  }
  await page.screenshot({ path: `${OUT}/${dev.name}-assaying.png` })

  // --- settle: keep polling until phase leaves 'assaying' looking state (settled or bad-vein) ---
  await wait(1500)
  log.push({ phase: 'settled-or-bust', ...(await rects(page)) })
  await page.screenshot({ path: `${OUT}/${dev.name}-settled.png`, fullPage: true })

  await browser.close()
  return log
}

const all = {}
for (const dev of DEVICES) {
  console.log('===', dev.name, '===')
  all[dev.name] = await run(dev)
}
fs.writeFileSync(`${OUT}/indep-mobile-report.json`, JSON.stringify(all, null, 2))
console.log(JSON.stringify(all, null, 2))
