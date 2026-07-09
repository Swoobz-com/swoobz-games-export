import { launch, wait } from './_a11yHelpers.mjs'
import fs from 'node:fs'

const IS_MOBILE = process.argv[2] === 'mobile'
const VIEWPORT = IS_MOBILE ? { width: 412, height: 915 } : { width: 1440, height: 900 }
const VP_NAME = IS_MOBILE ? 'pixel7-412x915' : 'desktop-1440x900'
const OUT = `shots-a11y-final-0707/kbd-arialive-${VP_NAME}`
fs.mkdirSync(OUT, { recursive: true })

async function ariaLiveText(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[role="status"][aria-live="polite"]')
    return el ? el.textContent : null
  })
}

async function tabToText(page, needle, maxTabs = 30) {
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press('Tab')
    const matched = await page.evaluate((needle) => {
      const el = document.activeElement
      return el && el.textContent && el.textContent.includes(needle)
    }, needle)
    if (matched) return true
  }
  return false
}

async function tabToCanvas(page, maxTabs = 30) {
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press('Tab')
    const isCanvas = await page.evaluate(() => document.activeElement && document.activeElement.tagName === 'CANVAS')
    if (isCanvas) return true
  }
  return false
}

async function main() {
  const { browser, page } = await launch(VIEWPORT)
  const log = []
  const snap = async (label) => {
    const text = await ariaLiveText(page)
    log.push({ label, ariaLiveText: text, t: Date.now() })
    console.log(`[${label}] aria-live = "${text}"`)
  }

  await snap('lobby-initial')

  // ── KEYBOARD-ONLY: Tab to ENTER THE DIVE, activate via Enter ──
  const foundEnter = await tabToText(page, 'ENTER THE DIVE')
  if (!foundEnter) throw new Error('Could not Tab to ENTER THE DIVE')
  await page.keyboard.press('Enter')
  await wait(300)
  await snap('after-enter-the-dive (Enter key)')
  await page.screenshot({ path: `${OUT}/01-planning-via-keyboard.png` })

  // ── KEYBOARD-ONLY: Tab to REEF SHELF tier, activate via Enter ──
  const foundTier = await tabToText(page, IS_MOBILE ? 'REEF' : 'REEF SHELF')
  if (!foundTier) throw new Error('Could not Tab to REEF SHELF tier')
  await page.keyboard.press('Enter')
  await wait(150)
  await snap('after-select-reef-shelf (Enter key)')

  // ── KEYBOARD-ONLY: Tab to the board canvas ──
  const foundCanvas = await tabToCanvas(page)
  if (!foundCanvas) throw new Error('Could not Tab to the board canvas')
  const canvasInfo = await page.evaluate(() => {
    const el = document.activeElement
    return { role: el.getAttribute('role'), tabIndex: el.tabIndex, ariaLabel: el.getAttribute('aria-label') }
  })
  console.log('Canvas reached via keyboard:', canvasInfo)
  await snap('canvas-focused')

  // ── KEYBOARD-ONLY: pick exactly 8 tiles using ArrowRight + Space, no mouse/touch ──
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Space')
    await wait(60)
    if (i < 7) {
      await page.keyboard.press('ArrowRight')
      await wait(40)
    }
  }
  await wait(150)
  await snap('after-8-picks-via-arrowkeys-and-space')
  await page.screenshot({ path: `${OUT}/02-8picks-via-keyboard.png` })

  const trailLenText = await page.evaluate(() => {
    const divs = [...document.querySelectorAll('div')]
    const el = divs.find((d) => d.children.length === 0 && /^\d+$/.test(d.textContent.trim()) && d.nextElementSibling && d.nextElementSibling.textContent.includes('DUCATS'))
    return el ? el.textContent.trim() : null
  })
  console.log('CLAIM LINE count after keyboard picks:', trailLenText)

  // ── KEYBOARD-ONLY: Tab from canvas to RUN THE LINE, activate via Enter ──
  const foundRun = await tabToText(page, 'RUN THE LINE')
  if (!foundRun) throw new Error('Could not Tab to RUN THE LINE')
  const runArmed = await page.evaluate(() => !document.activeElement.disabled)
  console.log('RUN THE LINE reached, armed(enabled)=', runArmed)
  await page.keyboard.press('Enter')
  await wait(200)
  await snap('after-commit-run-the-line (Enter key)')

  // ── Poll aria-live for the outcome, purely by re-reading (no mouse) ──
  let finalText = null
  for (let i = 0; i < 100; i++) {
    const t = await ariaLiveText(page)
    if (t && (/Secured the haul/i.test(t) || /Rugged by the deep/i.test(t) || /Dive busted/i.test(t))) {
      finalText = t
      log.push({ label: `poll-${i}`, ariaLiveText: t, t: Date.now() })
      if (/Secured the haul|Rugged by the deep/i.test(t)) break
    }
    await wait(80)
  }
  await snap('final-settled-state')
  await page.screenshot({ path: `${OUT}/03-settled-via-keyboard-only.png` })

  const bodyText = await page.evaluate(() => document.body.innerText)
  const reachedSettled = /SECURED THE HAUL|RUGGED BY THE DEEP/i.test(bodyText)
  console.log('REACHED SETTLED VIA KEYBOARD-ONLY (no mouse/touch ever used):', reachedSettled)
  console.log('Final visible outcome text snippet:', bodyText.slice(0, 60))

  fs.writeFileSync(`${OUT}/kbd-arialive-log.json`, JSON.stringify({ log, reachedSettled, canvasInfo, trailLenText, runArmed }, null, 2))
  await browser.close()
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
