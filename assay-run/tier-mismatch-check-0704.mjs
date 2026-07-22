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
const bodyText = (page) => page.evaluate(() => document.body.innerText)
const canvasBox = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas')
  const r = c.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(600)

await clickText(page, 'ENTER THE ASSAY LINE')
await wait(400)
await clickText(page, 'Flooded Floor')
await wait(300)
const box = await canvasBox(page)
const tile = box.w / 10
for (let col = 0; col < 8; col++) {
  await page.mouse.click(box.x + col * tile + tile / 2, box.y + 0 * tile + tile / 2)
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
if (!settled) { console.log('did not settle'); process.exit(1) }

await page.screenshot({ path: `${OUT}/mismatch-1-settled-flooded.png` })
const certBefore = await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].map(d=>d.textContent).find(t=>t&&t.includes('GLASS BOX CERTIFICATE'))
  return el
})
console.log('CERT right after Flooded settle:', certBefore)

// Now, WITHOUT starting a new round, change the tier selector while still settled.
const clicked = await clickText(page, 'Lean Floor')
console.log('clicked Lean Floor while settled:', clicked)
await wait(300)
await page.screenshot({ path: `${OUT}/mismatch-2-after-tier-switch.png` })
const certAfter = await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].map(d=>d.textContent).find(t=>t&&t.includes('GLASS BOX CERTIFICATE'))
  return el
})
console.log('CERT after switching selector to Lean (still same settled outcome):', certAfter)
console.log('CERT UNCHANGED (still shows flooded bombCount)?', certBefore === certAfter)

await browser.close()
