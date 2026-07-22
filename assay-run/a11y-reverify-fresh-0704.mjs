// Fresh independent re-verification (2026-07-04, post-fix pass) of the three
// fixes: (1) coachmark no longer overlaps RUN THE LINE on iPhone 14 Pro AND a
// real tap now actually advances the phase, (2) coachmark doesn't newly clip
// against PLAY SAFE or the header, (3) canvas focus-ring visible via
// screenshot diff (focused vs blurred), not just computed-style.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-a11y-verify-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

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

async function coachmarkPass() {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
  const page = (await browser.pages())[0]
  await page.emulate({ viewport: { width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false } })
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await page.evaluate(() => window.localStorage.removeItem('assay_coachmark_seen_v1'))
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(500)
  await tapText(page, 'ENTER THE ASSAY LINE')
  await wait(600)

  await page.evaluate(() => {
    const scrollables = [...document.querySelectorAll('div')].filter((d) => d.scrollWidth > d.clientWidth || d.scrollHeight > d.clientHeight)
    scrollables.forEach((d) => { d.scrollLeft = 0; d.scrollTop = 0 })
  })
  await wait(100)

  // Query REAL canvas geometry + GRID_DIM=10 tile size, don't guess.
  const geo = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const cr = c.getBoundingClientRect()
    return { left: cr.left, top: cr.top, w: cr.width, h: cr.height }
  })
  const DIM = 10
  const tile = geo.w / DIM
  // Paint a contiguous run of exactly 8 boxes along row 0 + row 1 start.
  for (let i = 0; i < 8; i++) {
    const col = i % DIM
    const row = Math.floor(i / DIM)
    await page.touchscreen.tap(geo.left + col * tile + tile / 2, geo.top + row * tile + tile / 2)
    await wait(70)
  }
  await wait(200)
  const lineStatus = await page.evaluate(() => {
    const m = document.body.innerText.match(/LINE\s*\n(\d+)\s*\n?\s*\/\s*(\d+)\s*min/)
    return m ? { painted: +m[1], min: +m[2] } : { raw: document.body.innerText.slice(0, 300) }
  })

  const hitTest = await page.evaluate(() => {
    const run = [...document.querySelectorAll('button')].find((b) => b.textContent && b.textContent.includes('RUN THE LINE'))
    const safe = [...document.querySelectorAll('button')].find((b) => b.textContent && b.textContent.includes('PLAY SAFE'))
    const coach = document.querySelector('[aria-label="How to play"]')
    const r = run.getBoundingClientRect()
    const cx = r.x + r.width / 2
    const cy = r.y + r.height / 2
    const topEl = document.elementFromPoint(cx, cy)
    const describe = (el) => (el ? { tag: el.tagName, text: (el.textContent || '').slice(0, 40) } : null)
    let coachOverlapsSafe = false
    let coachRect = null
    let safeRect = null
    if (coach && safe) {
      const cr = coach.getBoundingClientRect()
      const sr = safe.getBoundingClientRect()
      coachRect = { top: cr.top, bottom: cr.bottom, left: cr.left, right: cr.right }
      safeRect = { top: sr.top, bottom: sr.bottom, left: sr.left, right: sr.right }
      coachOverlapsSafe = !(cr.right < sr.left || cr.left > sr.right || cr.bottom < sr.top || cr.top > sr.bottom)
    }
    // Also check coachmark isn't clipped above the viewport / behind header.
    const clippedAtTop = coach ? coach.getBoundingClientRect().top < 0 : null
    return {
      runRect: { top: r.top, bottom: r.bottom, left: r.left, right: r.right },
      elementAtRunCenter: describe(topEl),
      isRunItselfOrDescendant: topEl === run || run.contains(topEl),
      coachmarkPresent: !!coach,
      coachRect,
      safeRect,
      coachOverlapsSafe,
      clippedAtTop,
    }
  })

  await page.screenshot({ path: `${OUT}/FRESH-iphone14pro-coachmark-before-tap.png` })

  // REAL coordinate tap (not .click()) at RUN THE LINE's center, verify a
  // real state transition happens (phase moves off 'planning').
  const phaseBefore = await page.evaluate(() => document.body.innerText.includes('CLEAR') ? 'planning' : 'other')
  await tapText(page, 'RUN THE LINE')
  await wait(600)
  const afterTap = await page.evaluate(() => {
    const text = document.body.innerText
    return {
      stillHasClearBtn: !![...document.querySelectorAll('button')].find((b) => b.textContent === 'CLEAR'),
      hasAssayingOrSettled: /assaying|LINE SECURED|CRACKED BOX|CLAIM PROVEN|ASSAY AGAIN/i.test(text),
      snippet: text.slice(0, 250),
    }
  })
  await page.screenshot({ path: `${OUT}/FRESH-iphone14pro-after-run-tap.png` })

  await browser.close()
  return { lineStatus, hitTest, phaseBefore, afterTap }
}

async function canvasFocusRingPass() {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
  const page = (await browser.pages())[0]
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await wait(400)
  await tapText(page, 'ENTER THE ASSAY LINE')
  await wait(400)

  // BLURRED baseline screenshot of the canvas region first.
  const rectBefore = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    return { top: r.top, left: r.left, width: r.width, height: r.height }
  })
  const pad = 20
  const clip = { x: Math.max(0, rectBefore.left - pad), y: Math.max(0, rectBefore.top - pad), width: rectBefore.width + pad * 2, height: rectBefore.height + pad * 2 }
  await page.screenshot({ path: `${OUT}/FRESH-desktop-canvas-BLURRED.png`, clip })

  // Tab to the canvas via REAL keyboard.
  let reached = false
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab')
    reached = await page.evaluate(() => document.activeElement && document.activeElement.tagName === 'CANVAS')
    if (reached) break
  }
  const style = await page.evaluate(() => {
    const c = document.activeElement
    const cs = getComputedStyle(c)
    return {
      boxShadow: cs.boxShadow,
      outlineStyle: cs.outlineStyle,
      matchesFocusVisible: c.matches(':focus-visible'),
      classList: [...c.classList],
    }
  })
  await page.screenshot({ path: `${OUT}/FRESH-desktop-canvas-FOCUSED.png`, clip })

  await browser.close()
  return { rectBefore, reached, style, clip }
}

const results = {}
results.coachmark = await coachmarkPass()
console.log('COACHMARK PASS:', JSON.stringify(results.coachmark, null, 2))
results.canvasFocus = await canvasFocusRingPass()
console.log('CANVAS FOCUS PASS:', JSON.stringify(results.canvasFocus, null, 2))

fs.writeFileSync(`${OUT}/FRESH-reverify-results.json`, JSON.stringify(results, null, 2))
