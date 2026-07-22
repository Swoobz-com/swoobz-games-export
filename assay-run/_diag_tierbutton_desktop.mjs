import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle0' })
await page.evaluate(() => { try { localStorage.clear() } catch (e) {} })
await page.reload({ waitUntil: 'load' })
await wait(500)
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes('ENTER THE DIVE'))
  if (b) b.click()
})
await wait(400)
const info = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')].filter(b => /HADAL|REEF|MIDNIGHT/i.test(b.textContent||''))
  return btns.map(b => b.textContent.slice(0,80))
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
