import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await wait(400)
await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('ENTER THE ASSAY LINE')); b && b.click() })
await wait(400)
const canvasBox = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height} })
// click two adjacent cells
await page.mouse.click(canvasBox.x + canvasBox.w*0.15, canvasBox.y + canvasBox.h*0.15)
await wait(100)
await page.mouse.click(canvasBox.x + canvasBox.w*0.20, canvasBox.y + canvasBox.h*0.15)
await wait(300)
const b64 = await page.screenshot({ encoding: 'base64' })
fs.writeFileSync('./fabi-shots-0704/jade-marked-check.png', Buffer.from(b64,'base64'))
// sample the dashed ring pixel color around the marked tile boundary
const px = await page.evaluate(async (data) => {
  const img = new Image(); await new Promise(r=>{img.onload=r; img.src='data:image/png;base64,'+data})
  const c = document.createElement('canvas'); c.width=img.width; c.height=img.height
  const ctx = c.getContext('2d'); ctx.drawImage(img,0,0)
  return null
}, b64)
console.log('canvasBox', canvasBox)
await browser.close()
