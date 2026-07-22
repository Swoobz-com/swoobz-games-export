import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = ms => new Promise(r => setTimeout(r, ms))
const clickText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const els = [...document.querySelectorAll('button, div, span')]
  const b = els.find(x => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
  if (b) { b.click(); return b.textContent.trim() }
  return null
}, re.source)
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
await page.goto(URL, { waitUntil: 'load' })
await page.evaluate(() => { try { window.localStorage.clear() } catch {} })
await page.reload({ waitUntil: 'load' })
await wait(500)
await clickText(page, /ENTER THE DIVE/)
await wait(400)
const info = await page.evaluate(() => {
  const cs = [...document.querySelectorAll('canvas')]
  return cs.map(c => { const r = c.getBoundingClientRect(); return { w: r.width, h: r.height, cls: c.className, parentCls: c.parentElement && c.parentElement.className, hasScrollAnc: !!c.closest('.assayBoardScroll') } })
})
console.log('CANVAS COUNT', info.length)
console.log(JSON.stringify(info, null, 2))
await browser.close()
