import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
await wait(600)
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => /ENTER THE DIVE/i.test(b.textContent||''))
  btn?.click()
})
await wait(400)
const info = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => (b.textContent||'').includes('RUN THE LINE'))
  const r = btn.getBoundingClientRect()
  return {
    docScrollHeight: document.documentElement.scrollHeight,
    bodyScrollHeight: document.body.scrollHeight,
    innerHeight: window.innerHeight,
    canScrollWindow: document.documentElement.scrollHeight > window.innerHeight,
    runLineRect: {top: r.top, bottom: r.bottom, height: r.height},
    htmlOverflowY: getComputedStyle(document.documentElement).overflowY,
    bodyOverflowY: getComputedStyle(document.body).overflowY,
  }
})
console.log(JSON.stringify(info, null, 2))
// try scrolling window down to see if it reveals more
await page.evaluate(() => window.scrollTo(0, 200))
await wait(150)
const afterScroll = await page.evaluate(() => ({ scrollY: window.scrollY }))
console.log('afterScroll', afterScroll)
await browser.close()
