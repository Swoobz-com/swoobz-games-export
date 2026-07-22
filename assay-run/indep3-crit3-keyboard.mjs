// PASS-3 independent re-verify — CRIT #3 keyboard paint mode end-to-end.
// Fresh script, not reusing pass-1/pass-2 harnesses' assertions verbatim.
import puppeteer from 'puppeteer-core'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-a11y-verify3-0704'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const readLive = async (page) => page.evaluate(() => {
  const el = document.querySelector('[role="status"][aria-live="polite"]')
  return el ? el.textContent : null
})

const tapText = async (page, txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
const consoleErrors = []
page.on('pageerror', (e) => consoleErrors.push(String(e)))
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await wait(400)

const entered = await tapText(page, 'ENTER')
console.log('entered lobby CTA clicked:', entered)
await wait(500)

const before1 = await readLive(page)
console.log('LIVE (post-entry, pre-focus):', JSON.stringify(before1))

// Tab to the board canvas.
let foundCanvas = false
for (let i = 0; i < 40; i++) {
  await page.keyboard.press('Tab')
  const tag = await page.evaluate(() => document.activeElement && document.activeElement.tagName)
  if (tag === 'CANVAS') { foundCanvas = true; break }
}
console.log('reached CANVAS via Tab:', foundCanvas)

const liveAfterFocus = await readLive(page)
console.log('LIVE (canvas focused):', JSON.stringify(liveAfterFocus))

// Mark boxes with arrow keys + space, reading the live region after each mark.
const marks = []
// MIN_TRAIL = 8 (assayMath.ts) — RUN THE LINE (BreakerLever) is only `armed`
// (and thus only present in the Tab order — disabled buttons are skipped)
// once at least 8 boxes are marked. Mark 9 to clear the floor with margin.
const sequence = [
  ['ArrowRight', 'Space'],
  ['ArrowRight', 'Space'],
  ['ArrowDown', 'Space'],
  ['ArrowRight', 'Space'],
  ['ArrowDown', 'Space'],
  ['ArrowRight', 'Space'],
  ['ArrowDown', 'Space'],
  ['ArrowRight', 'Space'],
  ['ArrowDown', 'Space'],
]
for (const [move, mark] of sequence) {
  await page.keyboard.press(move)
  await wait(60)
  if (mark === 'Space') await page.keyboard.press('Space')
  else await page.keyboard.press(mark)
  await wait(120)
  const txt = await readLive(page)
  marks.push(txt)
}
console.log('LIVE after each arrow+space mark:', JSON.stringify(marks, null, 2))

await page.screenshot({ path: `${OUT}/crit3-01-after-marks.png` })

// Now Tab forward to RUN THE LINE and activate with Enter (keyboard only).
let reachedRun = false
let runLabel = ''
for (let i = 0; i < 20; i++) {
  await page.keyboard.press('Tab')
  const info = await page.evaluate(() => {
    const el = document.activeElement
    return { tag: el && el.tagName, aria: el && el.getAttribute('aria-label'), text: el && el.textContent }
  })
  if (info.aria && info.aria.toLowerCase().includes('run the line')) { reachedRun = true; runLabel = info.aria; break }
}
console.log('reached RUN THE LINE via Tab:', reachedRun, runLabel)

const liveBeforeRun = await readLive(page)
await page.keyboard.press('Enter')
await wait(400)
const liveAfterRun = await readLive(page)
console.log('LIVE before RUN THE LINE activation:', JSON.stringify(liveBeforeRun))
console.log('LIVE after RUN THE LINE activation (Enter):', JSON.stringify(liveAfterRun))

await wait(1500)
const liveSettled = await readLive(page)
console.log('LIVE ~1.5s after activation (settling/settled):', JSON.stringify(liveSettled))

await page.screenshot({ path: `${OUT}/crit3-02-after-run.png` })

console.log('CONSOLE PAGE ERRORS:', JSON.stringify(consoleErrors))

await browser.close()
