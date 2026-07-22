import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
const p = await b.newPage()
await p.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await p.goto('http://localhost:5281/', { waitUntil: 'networkidle0' })
await wait(300)

// Click SEND IT (BLUECHIPS default preset) to enter playing phase.
const sendIt = await p.evaluateHandle(() => {
  return [...document.querySelectorAll('button')].find((b) => /send it/i.test(b.textContent || ''))
})
await sendIt.asElement().click()
await wait(600)

// Now find the cash-out button (TAKE PROFIT / disabled variant) and check touchAction.
const info = await p.evaluate(() => {
  const btns = [...document.querySelectorAll('button')]
  const cashoutBtn = btns.find((b) => /take profit|cash out/i.test(b.textContent || ''))
  if (!cashoutBtn) return { found: false, allButtonTexts: btns.map((b) => (b.textContent || '').trim()).filter(Boolean) }
  const cs = getComputedStyle(cashoutBtn)
  return { found: true, text: cashoutBtn.textContent.trim(), touchAction: cs.touchAction, disabled: cashoutBtn.disabled }
})
console.log('FIX3 cashOutButton', JSON.stringify(info, null, 2))
await p.screenshot({ path: '_maker-fix3-playing-state.png' })
await b.close()
