import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
const p = await b.newPage()
await p.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await p.goto('http://localhost:5281/', { waitUntil: 'networkidle0' })
await wait(700)
const info = await p.evaluate(() => {
  const btns = [...document.querySelectorAll('button')].filter(b => (b.textContent||'').trim()==='+')
  return btns.map(b => {
    const r = b.getBoundingClientRect()
    const cs = getComputedStyle(b)
    return { rect: {w:r.width,h:r.height}, boxSizing: cs.boxSizing, padding: cs.padding, border: cs.border, display: cs.display, aria: b.getAttribute('aria-label'), outerHTML: b.outerHTML.slice(0,200) }
  })
})
console.log(JSON.stringify(info, null, 2))
await b.close()
