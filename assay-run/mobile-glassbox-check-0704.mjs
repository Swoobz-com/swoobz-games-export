import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5186/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-fairness-qa-0704'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const clickText = async (page, txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}
const canvasBox = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas')
  const r = c.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})
const bodyText = (page) => page.evaluate(() => document.body.innerText)

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = (await browser.pages())[0]
await page.emulate({ viewport: { width: 412, height: 915, isMobile: true, hasTouch: true }, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Mobile' })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(600)
await clickText(page, 'ENTER THE ASSAY LINE')
await wait(400)
await clickText(page, 'Standard Floor')
await wait(300)
const box = await canvasBox(page)
const tile = box.w / 10
for (let col = 0; col < 8; col++) {
  await page.touchscreen.tap(box.x + col * tile + tile / 2, box.y + 0 * tile + tile / 2)
  await wait(30)
}
await wait(200)
await clickText(page, 'THROW BREAKER')
let settled = false
for (let i = 0; i < 100; i++) {
  await wait(200)
  const txt = await bodyText(page)
  if (txt.includes('GLASS BOX CERTIFICATE')) { settled = true; break }
}
console.log('settled:', settled)
await page.screenshot({ path: `${OUT}/mobile-412x915-settled.png`, fullPage: true })
const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }))
console.log('horizontal overflow check:', overflow, overflow.scrollWidth > overflow.innerWidth ? 'OVERFLOW!' : 'OK')
await browser.close()
