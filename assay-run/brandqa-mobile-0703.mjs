import puppeteer from 'puppeteer-core'
import fs from 'fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = 'shots-brandqa-0703'
fs.mkdirSync(OUT, { recursive: true })
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 390, height: 844, deviceScaleFactor: 3 } })
const page = (await browser.pages())[0]
await page.goto('http://localhost:5399/', { waitUntil: 'networkidle0' })
const clickText = async (txt) => page.evaluate((t) => {
  const b = [...document.querySelectorAll('button')].find(x => x.textContent && x.textContent.includes(t))
  if (b) { b.click(); return true }
  return false
}, txt)
await clickText('ENTER THE ASSAY LINE')
await new Promise(r => setTimeout(r, 200))
await page.screenshot({ path: `${OUT}/mobile390-full.png`, fullPage: false })
const scan = await page.evaluate(() => {
  const isCyanish = (v) => v && (/0,\s*240,\s*255/.test(v) || /41,\s*230,\s*255/.test(v))
  const isBrassish = (v) => v && /202,\s*160,\s*64/.test(v)
  const cyanEls = [...document.querySelectorAll('*')].map(el => {
    const cs = getComputedStyle(el)
    if (isCyanish(cs.color) || isCyanish(cs.backgroundColor) || isCyanish(cs.borderColor) || isCyanish(cs.boxShadow)) return el
    return null
  }).filter(Boolean)
  const brassEls = [...document.querySelectorAll('*')].filter(el => {
    const cs = getComputedStyle(el)
    return isBrassish(cs.borderTopColor) || isBrassish(cs.borderLeftColor)
  })
  function gap(a, b) {
    const dx = Math.max(a.left - b.right, b.left - a.right, 0)
    const dy = Math.max(a.top - b.bottom, b.top - a.bottom, 0)
    return Math.sqrt(dx * dx + dy * dy)
  }
  const contacts = []
  for (const c of cyanEls) {
    const cr = c.getBoundingClientRect()
    for (const b of brassEls) {
      const br = b.getBoundingClientRect()
      const d = gap(cr, br)
      if (d < 3) contacts.push({ d, brassRect: br, cyanRect: cr })
    }
  }
  return { cyanCount: cyanEls.length, brassCount: brassEls.length, contacts }
})
console.log(JSON.stringify(scan, null, 2))
await browser.close()
