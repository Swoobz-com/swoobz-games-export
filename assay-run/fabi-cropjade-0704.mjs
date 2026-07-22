import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await wait(400)
await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('ENTER THE ASSAY LINE')); b && b.click() })
await wait(400)
const canvasBox = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height} })
await page.mouse.click(canvasBox.x + canvasBox.w*0.15, canvasBox.y + canvasBox.h*0.15)
await wait(100)
await page.mouse.click(canvasBox.x + canvasBox.w*0.20, canvasBox.y + canvasBox.h*0.15)
await wait(300)
await page.screenshot({ path: './fabi-shots-0704/jade-zoom.png', clip: { x: canvasBox.x + canvasBox.w*0.10, y: canvasBox.y + canvasBox.h*0.10, width: canvasBox.w*0.20, height: canvasBox.w*0.15 } })
await browser.close()
