import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5186/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const clickText = async (page, txt, tag = 'button') => {
  const h = await page.evaluateHandle(({ t, tag }) => {
    const els = [...document.querySelectorAll(tag)]
    return els.find((x) => x.textContent && x.textContent.includes(t)) || null
  }, { t: txt, tag })
  const el = h.asElement()
  if (!el) return false
  await el.click()
  return true
}
const canvasBox = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return null
  const r = c.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})
async function armTrail(page, n = 8) {
  const box = await canvasBox(page)
  const tile = box.w / 10
  for (let i = 0; i < n; i++) {
    await page.mouse.click(box.x + i * tile + tile / 2, box.y + tile / 2)
    await wait(40)
  }
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 })

let found = null
for (let attempt = 0; attempt < 25 && !found; attempt++) {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(250)
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(200)
  await armTrail(page, 8)
  await wait(120)
  await clickText(page, 'THROW BREAKER')
  // poll every 80ms for up to 3.5s looking for the 'bad-vein' phase text
  for (let t = 0; t < 3500; t += 80) {
    await wait(80)
    const text = await page.evaluate(() => document.body.innerText)
    if (/current snapped/i.test(text)) {
      found = { attempt, elapsedMs: t, text }
      const buf = await page.screenshot({ encoding: 'base64' })
      fs.writeFileSync('shots-brandqa-0704/full-badvein-transient.png', buf, 'base64')
      break
    }
  }
}
console.log(found ? `FOUND at attempt ${found.attempt}, elapsed ${found.elapsedMs}ms` : 'NOT FOUND in 25 attempts')
if (found) console.log(found.text)
await browser.close()
