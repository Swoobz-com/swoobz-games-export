// PASS-3 independent re-verify — CRIT #6: aria-live region attributes +
// content changes across ALL transitions including a forced BUST (the prior
// crit3 script already proved a WIN path; this proves the busted-outcome
// text path too, plus confirms the exact required attributes are present).
import puppeteer from 'puppeteer-core'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

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

const readLive = async (page) => page.evaluate(() => {
  const el = document.querySelector('[role="status"][aria-live="polite"]')
  if (!el) return null
  return {
    text: el.textContent,
    role: el.getAttribute('role'),
    ariaLive: el.getAttribute('aria-live'),
    ariaAtomic: el.getAttribute('aria-atomic'),
    visuallyHidden: (() => {
      const cs = getComputedStyle(el)
      return cs.position === 'absolute' && cs.width === '1px' && cs.height === '1px' && cs.overflow === 'hidden'
    })(),
  }
})

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await wait(400)
await tapText(page, 'ENTER')
await wait(500)

console.log('ATTRS at lobby-entry:', JSON.stringify(await readLive(page)))

// Select Heavy floor (highest bomb density, 8/100) for a reliable forced bust,
// per this game's own established forcing recipe (mark a near-full board).
await tapText(page, 'Heavy')
await wait(200)
console.log('ATTRS after Heavy select:', JSON.stringify(await readLive(page)))

// Mark boxes by clicking canvas cells directly (mouse path this time, since
// CRIT #3 already proved the keyboard path exhaustively) -- paint most of the
// board to maximize bust odds in one commit.
const canvasBox = await page.evaluate(() => {
  const c = document.querySelector('canvas.assayFocusable')
  const r = c.getBoundingClientRect()
  return { left: r.left, top: r.top, width: r.width, height: r.height }
})
const dim = 10
const cellW = canvasBox.width / dim
const cellH = canvasBox.height / dim
let marked = 0
for (let row = 0; row < dim && marked < 55; row++) {
  for (let col = 0; col < dim && marked < 55; col++) {
    const x = canvasBox.left + cellW * (col + 0.5)
    const y = canvasBox.top + cellH * (row + 0.5)
    await page.mouse.click(x, y)
    marked++
  }
}
await wait(200)
const liveAfterPaint = await readLive(page)
console.log('LIVE after painting', marked, 'boxes:', JSON.stringify(liveAfterPaint))

const beforeRun = await readLive(page)
const ran = await tapText(page, 'RUN THE LINE')
console.log('clicked RUN THE LINE:', ran)
await wait(300)
const liveJustAfterRun = await readLive(page)
console.log('LIVE just after RUN (assaying phase expected):', JSON.stringify(liveJustAfterRun))

// Poll for settlement (win or bust) up to ~6s.
let finalLive = liveJustAfterRun
for (let i = 0; i < 30; i++) {
  await wait(200)
  finalLive = await readLive(page)
  if (finalLive && /secured|busted|Cracked box/i.test(finalLive.text)) break
}
console.log('LIVE final settled/bust text:', JSON.stringify(finalLive))
console.log('BEFORE vs FINAL text differ:', beforeRun.text !== finalLive.text)

await browser.close()
