import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
const p = await b.newPage()
await p.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await p.goto('http://localhost:5281/', { waitUntil: 'networkidle0' })
await wait(300)

const sendIt = await p.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => /send it/i.test(b.textContent || '')))
await sendIt.asElement().click()
await wait(600)

// Find the board canvas and tap a tile via real touch (canvas is board region, mobile).
const canvasInfo = await p.evaluate(() => {
  const c = document.querySelector('[data-testid="vault-canvas-shell"] canvas')
  if (!c) return null
  const r = c.getBoundingClientRect()
  return { left: r.left, top: r.top, width: r.width, height: r.height }
})
console.log('canvas', JSON.stringify(canvasInfo))
if (canvasInfo) {
  // Tap near center-ish of the grid (bet-entry preview was tiny; playing board is full-size — safe center guess).
  const x = canvasInfo.left + canvasInfo.width * 0.3
  const y = canvasInfo.top + canvasInfo.height * 0.4
  await p.touchscreen.tap(x, y)
  await wait(700)
}

const info = await p.evaluate(() => {
  const btns = [...document.querySelectorAll('button')]
  const cashoutBtn = btns.find((b) => /take profit|cash out/i.test(b.textContent || ''))
  if (!cashoutBtn) return { found: false }
  const cs = getComputedStyle(cashoutBtn)
  return { found: true, text: cashoutBtn.textContent.trim(), touchAction: cs.touchAction, disabled: cashoutBtn.disabled, className: cashoutBtn.className }
})
console.log('FIX3 after tap', JSON.stringify(info, null, 2))
await p.screenshot({ path: '_maker-fix3-after-tap.png' })
await b.close()
