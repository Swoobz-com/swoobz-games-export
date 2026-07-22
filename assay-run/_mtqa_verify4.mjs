import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function tapContains(page, needle) {
  const rect = await page.evaluate((t) => {
    const btn = [...document.querySelectorAll('button')].find(b => (b.textContent||'').includes(t))
    if (!btn) return null
    const r = btn.getBoundingClientRect()
    return { x: r.x, y: r.y, width: r.width, height: r.height }
  }, needle)
  if (!rect) return false
  await page.touchscreen.tap(rect.x + rect.width/2, rect.y + rect.height/2)
  return true
}
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
await wait(600)
await tapContains(page, 'ENTER THE DIVE')
await wait(400)
const dump = async () => page.evaluate(() => {
  const yourBetIdx = [...document.querySelectorAll('*')].findIndex(e => e.children.length===0 && e.textContent.trim()==='YOUR BET')
  return document.body.innerText.split('\n').filter(l=>l.trim()).join(' | ')
})
console.log('BEFORE:', await dump())
await tapContains(page, '+')
await wait(150)
console.log('AFTER +:', await dump())
await tapContains(page, '5.00')
await wait(150)
console.log('AFTER chip 5.00:', await dump())
await browser.close()
