import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = (await browser.pages())[0]
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await page.goto('http://localhost:5186/', { waitUntil: 'networkidle2' })
await new Promise(r => setTimeout(r, 600))
const handle = await page.evaluateHandle(() => {
  const btns = [...document.querySelectorAll('button')]
  return btns.find(b => b.textContent && b.textContent.includes('ENTER THE ASSAY LINE'))
})
await handle.asElement().click()
await new Promise(r => setTimeout(r, 500))
const sizes = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')].filter(b => /^\d+\.\d\d$/.test(b.textContent.trim()))
  return btns.map(b => { const r = b.getBoundingClientRect(); return { text: b.textContent, w: r.width, h: r.height } })
})
console.log(JSON.stringify(sizes, null, 2))
await browser.close()
