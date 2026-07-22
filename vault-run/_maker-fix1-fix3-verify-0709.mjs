import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
const p = await b.newPage()
await p.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await p.goto('http://localhost:5281/', { waitUntil: 'networkidle0' })
await wait(300)

// FIX 1 — RUGS stepper: find the two buttons whose aria-label mentions "rugs"
const rugsInfo = await p.evaluate(() => {
  const btns = [...document.querySelectorAll('button[aria-label]')].filter((b) =>
    /rugs/i.test(b.getAttribute('aria-label') || '')
  )
  return btns.map((b) => {
    const hitRect = b.getBoundingClientRect()
    const span = b.querySelector('span')
    const swatchRect = span ? span.getBoundingClientRect() : null
    const cs = getComputedStyle(b)
    return {
      ariaLabel: b.getAttribute('aria-label'),
      hit: { w: Math.round(hitRect.width), h: Math.round(hitRect.height) },
      swatch: swatchRect ? { w: Math.round(swatchRect.width), h: Math.round(swatchRect.height) } : null,
      touchAction: cs.touchAction,
    }
  })
})
console.log('FIX1 rugsStepper', JSON.stringify(rugsInfo, null, 2))

// FIX 3 — cashOutButton touchAction: enter a round then check the cash-out button
await b.close()
