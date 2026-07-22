import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5186/'
const OUT = 'shots-a11y-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = { tabSweep: [], keyboardTierSelect: null, keyboardBoardPaint: null, keyboardPlunge: null, keyboardSafety: null }

async function clickText(page, txt) {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}

const activeElInfo = (page) => page.evaluate(() => {
  const e = document.activeElement
  if (!e || e === document.body) return null
  const r = e.getBoundingClientRect()
  const cs = getComputedStyle(e)
  return {
    tag: e.tagName,
    text: (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 40),
    ariaLabel: e.getAttribute('aria-label'),
    rect: { x: r.x, y: r.y, w: r.width, h: r.height },
    outlineStyle: cs.outlineStyle,
    outlineWidth: cs.outlineWidth,
    outlineColor: cs.outlineColor,
    boxShadow: cs.boxShadow,
    allUnsetHint: cs.all, // usually 'unset' won't show up directly in computed style but keep for reference
  }
})

async function main() {
  const browser = await puppeteer.launch({
    executablePath: EXE,
    headless: 'new',
    defaultViewport: { width: 1920, height: 1080 },
  })
  const page = (await browser.pages())[0]
  await page.goto(URL, { waitUntil: 'networkidle0' })
  await wait(400)
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(400)

  // ---- Tab sweep across the whole planning-phase page ----
  await page.evaluate(() => document.body.focus())
  for (let i = 0; i < 35; i++) {
    await page.keyboard.press('Tab')
    const info = await activeElInfo(page)
    results.tabSweep.push({ step: i + 1, info })
    if (!info) continue
  }
  fs.writeFileSync(`${OUT}/tab-sweep.json`, JSON.stringify(results.tabSweep, null, 2))

  // ---- Focused screenshots: find and focus specific controls, screenshot cropped region focused vs blurred ----
  async function focusAndShoot(matchFn, name) {
    const handle = await page.evaluateHandle(matchFn)
    const el = handle.asElement()
    if (!el) return { found: false }
    const rect = await page.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } }, el)
    const clip = { x: Math.max(0, rect.x - 12), y: Math.max(0, rect.y - 12), width: rect.w + 24, height: rect.h + 24 }
    await page.evaluate((e) => e.blur(), el)
    await wait(50)
    await page.screenshot({ path: `${OUT}/focus-${name}-BLURRED.png`, clip })
    await page.evaluate((e) => e.focus(), el)
    await wait(50)
    const cs = await page.evaluate((e) => {
      const c = getComputedStyle(e)
      return { outlineStyle: c.outlineStyle, outlineWidth: c.outlineWidth, outlineColor: c.outlineColor, boxShadow: c.boxShadow }
    }, el)
    await page.screenshot({ path: `${OUT}/focus-${name}-FOCUSED.png`, clip })
    return { found: true, computedStyle: cs }
  }

  results.focusChecks = {}
  results.focusChecks.vaultFloorLean = await focusAndShoot(
    () => [...document.querySelectorAll('button')].find((b) => /Lean Floor/.test(b.textContent || '')),
    'vaultfloor-lean'
  )
  results.focusChecks.quickChip = await focusAndShoot(
    () => [...document.querySelectorAll('button')].find((b) => /^\$?[\d.]+$/.test((b.textContent || '').trim()) && b.getBoundingClientRect().width < 60),
    'quickchip'
  )
  results.focusChecks.betStepperPlus = await focusAndShoot(
    () => [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === '+'),
    'bet-stepper-plus'
  )
  results.focusChecks.plungeButton = await focusAndShoot(
    () => document.querySelector('button[aria-label*="breaker"]'),
    'plunge-breaker'
  )
  results.focusChecks.playSafe = await focusAndShoot(
    () => [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'PLAY SAFE'),
    'play-safe'
  )

  // ---- Keyboard-only VAULT FLOOR tier select ----
  await page.evaluate(() => document.body.focus())
  const leanHandle = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => /Lean Floor/.test(b.textContent || '')))
  await page.evaluate((e) => e.focus(), leanHandle)
  await page.keyboard.press('Enter')
  await wait(150)
  results.keyboardTierSelect = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((b) => /Lean Floor/.test(b.textContent || ''))
    return { ariaCurrentAfterEnter: b.getAttribute('aria-current') }
  })
  // also test Space
  const stdHandle = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => /Standard Floor/.test(b.textContent || '')))
  await page.evaluate((e) => e.focus(), stdHandle)
  await page.keyboard.press('Space')
  await wait(150)
  results.keyboardTierSelectSpace = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((b) => /Standard Floor/.test(b.textContent || ''))
    return { ariaCurrentAfterSpace: b.getAttribute('aria-current') }
  })

  // ---- Keyboard board-paint attempt ----
  // Try to Tab from the last rail control toward the canvas; also directly
  // try focusing the canvas and sending arrow keys / space.
  const canvasHandle = await page.evaluateHandle(() => document.querySelector('canvas'))
  const canvasTabIndex = await page.evaluate((c) => c.tabIndex, canvasHandle)
  await page.evaluate((c) => c.focus(), canvasHandle) // programmatic focus attempt even if tabIndex=-1
  const activeIsCanvas = await page.evaluate(() => document.activeElement.tagName === 'CANVAS')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Space')
  await wait(100)
  const trailCountAfterArrowSpace = await page.evaluate(() => {
    // best-effort: look for any DOM text mentioning "nub" trail count in the status line
    const el = [...document.querySelectorAll('*')].find((e) => /more nub|Claim-line armed/.test(e.textContent || '') && e.children.length === 0)
    return el ? el.parentElement.textContent.slice(0, 120) : null
  })
  results.keyboardBoardPaint = { canvasTabIndex, activeIsCanvas, trailCountAfterArrowSpaceProbe: trailCountAfterArrowSpace }

  fs.writeFileSync(`${OUT}/focus-kbd-results.json`, JSON.stringify(results, null, 2))
  console.log('DONE')
  await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
