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

  await tabToText(page, 'ENTER THE DIVE')
  await page.keyboard.press('Enter')
  await wait(300)
  await tabToText(page, IS_MOBILE ? 'HADAL' : 'HADAL TRENCH')
  await page.keyboard.press('Enter')
  await wait(150)
  await tabToCanvas(page)
  await snap('canvas-focused-hadal')

  // Boustrophedon (snake) pick via keyboard only: row0 left->right, row1
  // right->left, etc. — this keeps the JS-tracked column in sync with the
  // real on-board cursor across the ArrowDown transition (a naive "always
  // ArrowRight then ArrowDown then restart col-count from 0" loop desyncs
  // from the real cursor, which stays at col13 after ArrowDown since
  // ArrowDown never resets column — caught live: a first attempt produced
  // only 14 net selected tiles because every "row 2+" Space press was
  // toggling the SAME col13 tile on/off instead of advancing).
  let bustDetected = false
  for (let row = 0; row < 4 && !bustDetected; row++) {
    const dir = row % 2 === 0 ? 'ArrowRight' : 'ArrowLeft'
    for (let col = 0; col < 14 && !bustDetected; col++) {
      await page.keyboard.press('Space')
      await wait(35)
      const t = await ariaLiveText(page)
      if (t && /Dive busted/i.test(t)) {
        bustDetected = true
        log.push({ label: 'bust-detected-during-picking', ariaLiveText: t, t: Date.now() })
        break
      }
      if (col < 13) { await page.keyboard.press(dir); await wait(25) }
    }
    if (!bustDetected && row < 3) { await page.keyboard.press('ArrowDown'); await wait(25) }
  }
  await snap('after-picking-loop')
  await page.screenshot({ path: `${OUT}/04-bust-picking-via-keyboard.png` })

  if (!bustDetected) {
    // Enough tiles picked (or bust already happened pre-commit is impossible —
    // bad-vein only triggers after commit in this game); commit now.
    const found = await tabToText(page, 'RUN THE LINE')
    if (found) {
      const armed = await page.evaluate(() => !document.activeElement.disabled)
      console.log('RUN THE LINE armed:', armed)
      await page.keyboard.press('Enter')
      await wait(200)
      await snap('after-commit-hadal')
    }
  }

  // Poll for the exact phase-exclusive marker.
  let sawBustMarker = false
  let sawSettled = false
  for (let i = 0; i < 150; i++) {
    const t = await ariaLiveText(page)
    if (t && /Dive busted/i.test(t)) { sawBustMarker = true; log.push({ label: `poll-bust-${i}`, ariaLiveText: t, t: Date.now() }) }
    if (t && /Rugged by the deep|Secured the haul/i.test(t)) { sawSettled = true; log.push({ label: `poll-settled-${i}`, ariaLiveText: t, t: Date.now() }); break }
    await wait(60)
  }
  await snap('final')
  await page.screenshot({ path: `${OUT}/05-bust-settled-via-keyboard.png` })

  const bodyText = await page.evaluate(() => document.body.innerText)
  console.log('sawBustMarker(aria-live)=', sawBustMarker, 'sawSettled=', sawSettled)
  console.log('Body outcome snippet:', bodyText.match(/SECURED THE HAUL|RUGGED BY THE DEEP/i)?.[0])

  fs.writeFileSync(`${OUT}/kbd-bust-log.json`, JSON.stringify({ log, sawBustMarker, sawSettled }, null, 2))
  await browser.close()
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
