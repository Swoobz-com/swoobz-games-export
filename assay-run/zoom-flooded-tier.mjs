import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5186/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-visreg-0704'
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

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 2 } })
const page = (await browser.pages())[0]
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await wait(400)
await clickText(page, 'ENTER THE ASSAY LINE')
await wait(400)

// BEFORE selecting flooded: screenshot + dump
const rectBefore = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')]
  const b = btns.find((b) => /Flooded Floor/.test(b.textContent || ''))
  const r = b.getBoundingClientRect()
  return { rect: { x: r.x, y: r.y, w: r.width, h: r.height }, html: b.innerHTML }
})
fs.writeFileSync(`${OUT}/flooded-before.html`, rectBefore.html)
await page.screenshot({ path: `${OUT}/flooded-tier-BEFORE-select.png`, clip: { x: rectBefore.rect.x - 10, y: rectBefore.rect.y - 10, width: rectBefore.rect.w + 20, height: rectBefore.rect.h + 20 } })

await clickText(page, 'Flooded Floor')
await wait(500)

const rectAfter = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')]
  const b = btns.find((b) => /Flooded Floor/.test(b.textContent || ''))
  const r = b.getBoundingClientRect()
  const spans = [...b.querySelectorAll('span')]
  const multSpan = spans.find((s) => /up/.test(s.textContent || '') || /x$/.test((s.textContent||'').trim()))
  const allSpansInfo = spans.map(s => ({
    text: s.textContent,
    color: getComputedStyle(s).color,
    fontFamily: getComputedStyle(s).fontFamily,
    fontSize: getComputedStyle(s).fontSize,
    textShadow: getComputedStyle(s).textShadow,
    filter: getComputedStyle(s).filter,
    animation: getComputedStyle(s).animation,
    transform: getComputedStyle(s).transform,
  }))
  return { rect: { x: r.x, y: r.y, w: r.width, h: r.height }, html: b.innerHTML, allSpansInfo }
})
fs.writeFileSync(`${OUT}/flooded-after.json`, JSON.stringify(rectAfter, null, 2))
await page.screenshot({ path: `${OUT}/flooded-tier-AFTER-select-t0.png`, clip: { x: rectAfter.rect.x - 10, y: rectAfter.rect.y - 10, width: rectAfter.rect.w + 20, height: rectAfter.rect.h + 20 } })

// capture again after settling (in case it's a transient animation frame)
await wait(1500)
await page.screenshot({ path: `${OUT}/flooded-tier-AFTER-select-t1500.png`, clip: { x: rectAfter.rect.x - 10, y: rectAfter.rect.y - 10, width: rectAfter.rect.w + 20, height: rectAfter.rect.h + 20 } })

await browser.close()
console.log('DONE')
console.log(JSON.stringify(rectAfter, null, 2))
