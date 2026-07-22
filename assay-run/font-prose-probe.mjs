import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const clickText = async (page, txt) => {
  const h = await page.evaluateHandle((t) => {
    const b = [...document.querySelectorAll('button')]
    return b.find((x) => x.textContent && x.textContent.includes(t)) || null
  }, txt)
  const el = h.asElement()
  if (!el) return false
  await el.click()
  return true
}
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 1920, height: 1080 })
await page.goto('http://localhost:5186/', { waitUntil: 'networkidle2' })
await wait(500)
const r1 = await page.evaluate(() => {
  const p = [...document.querySelectorAll('p')].find(el => /Paint a claim-line/.test(el.textContent||''))
  return p ? { text: p.textContent, fontFamily: getComputedStyle(p).fontFamily } : null
})
console.log('lobby rules <p>:', JSON.stringify(r1))
const r2 = await page.evaluate(() => {
  const b = document.body
  return { bodyFont: getComputedStyle(b).fontFamily, htmlFont: getComputedStyle(document.documentElement).fontFamily }
})
console.log('root fonts:', JSON.stringify(r2))
await clickText(page, 'ENTER THE ASSAY LINE')
await wait(400)
const r3 = await page.evaluate(() => {
  const els = [...document.querySelectorAll('span,div')].filter(el => el.children.length===0 && /Select \d/.test(el.textContent||''))
  return els.map(el => ({ text: el.textContent, fontFamily: getComputedStyle(el).fontFamily }))
})
console.log('planning status text:', JSON.stringify(r3))
await browser.close()
