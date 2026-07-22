import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = ms => new Promise(r => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'load' })
await page.evaluate(() => { try { window.localStorage.clear() } catch {} })
await page.reload({ waitUntil: 'load' })
await wait(500)
await page.evaluate(() => {
  const r = new RegExp('ENTER THE DIVE', 'i')
  const els = [...document.querySelectorAll('button, div, span')]
  const b = els.find(x => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
  if (b) b.click()
})
await wait(400)

const info = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  const rect = c.getBoundingClientRect()
  const chain = []
  let el = c.parentElement
  while (el) {
    const s = getComputedStyle(el)
    chain.push({ tag: el.tagName, cls: (el.className||'').toString().slice(0,50), overflow: s.overflow, overflowY: s.overflowY, position: s.position, rect: (() => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, w: r.width, h: r.height } })() })
    el = el.parentElement
  }
  return { canvasRect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, w: rect.width, h: rect.height }, chain, docScrollH: document.documentElement.scrollHeight, winInnerH: window.innerHeight }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
