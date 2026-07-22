import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
const p = await b.newPage()
await p.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await p.goto('http://localhost:5281/', { waitUntil: 'networkidle0' })
await wait(300)

// Switch to SHITCOIN (24 mines/7x7) for a fast climb to >1.5x multiplier per tap.
const shitcoinCard = await p.evaluateHandle(() => [...document.querySelectorAll('*')].find((el) => el.textContent === 'SHITCOIN' && el.children.length === 0))
// fallback: find via world-picker text
const clicked = await p.evaluate(() => {
  const nodes = [...document.querySelectorAll('div,span,button')]
  const el = nodes.find((n) => /^SHITCOIN$/.test((n.textContent || '').trim()))
  if (!el) return false
  let target = el
  while (target && target.tagName !== 'BUTTON' && !target.onclick) {
    if (target.getAttribute && target.getAttribute('role') === 'button') break
    target = target.parentElement
  }
  ;(target || el).click()
  return true
})
console.log('shitcoin click', clicked)
await wait(400)

const sendIt = await p.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => /send it/i.test(b.textContent || '')))
await sendIt.asElement().click()
await wait(600)

const canvasInfo = await p.evaluate(() => {
  const c = document.querySelector('[data-testid="vault-canvas-shell"] canvas')
  const r = c.getBoundingClientRect()
  return { left: r.left, top: r.top, width: r.width, height: r.height }
})

// Tap several distinct tile coordinates with ~800ms gaps to climb the multiplier.
const coords = [
  [0.15, 0.1], [0.3, 0.15], [0.5, 0.1], [0.7, 0.15], [0.85, 0.1],
  [0.15, 0.25], [0.3, 0.3],
]
for (const [fx, fy] of coords) {
  const x = canvasInfo.left + canvasInfo.width * fx
  const y = canvasInfo.top + canvasInfo.height * fy
  await p.touchscreen.tap(x, y)
  await wait(800)
  const state = await p.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const cashoutBtn = btns.find((b) => /take profit/i.test(b.textContent || ''))
    return cashoutBtn ? { text: cashoutBtn.textContent.trim(), className: cashoutBtn.className, touchAction: getComputedStyle(cashoutBtn).touchAction } : { text: null }
  })
  console.log('tap', fx, fy, JSON.stringify(state))
  if (state.className && /dramatic/i.test(state.className)) break
  if (!state.text) { console.log('round ended (rugged or no cashout btn)'); break }
}
await p.screenshot({ path: '_maker-fix3-dramatic-check.png' })
await b.close()
