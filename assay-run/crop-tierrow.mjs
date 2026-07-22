import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 })
await page.goto('http://localhost:5186/', { waitUntil: 'networkidle2' })
await new Promise(r => setTimeout(r, 600))
const handle = await page.evaluateHandle(() => {
  const btns = [...document.querySelectorAll('button')]
  return btns.find(b => b.textContent && b.textContent.includes('ENTER THE ASSAY LINE'))
})
await handle.asElement().click()
await new Promise(r => setTimeout(r, 500))
await page.screenshot({ path: 'shots-roundd-0704b/tierrow-crop.png', clip: { x: 1195, y: 60, width: 300, height: 170 } })
await browser.close()
