import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5189/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = (await browser.pages())[0]
const tapText = async (txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  const box = await el.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })
  await page.touchscreen.tap(box.x, box.y)
  return true
}
for (const width of [390, 412]) {
  await page.emulate({ viewport: { width, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) Mobile Safari/537.36' })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(400)
  await tapText('ENTER THE ASSAY LINE')
  await wait(400)
  const info = await page.evaluate(() => {
    const safety = [...document.querySelectorAll('button')].find(b => /PLAY SAFE/i.test(b.textContent||''))
    // walk up from safety to find the flex row parent (per source: div with display:flex gap:8)
    let row = safety.parentElement
    const rowRect = row.getBoundingClientRect()
    const rowStyle = getComputedStyle(row)
    const kids = [...row.children].map(k => ({ text: k.textContent.trim().slice(0,30), rect: k.getBoundingClientRect().toJSON() }))
    // outer header container (2-col flex: left stack + BalanceDial)
    let outer = row
    for (let i=0;i<3 && outer; i++) outer = outer.parentElement
    return {
      rowDisplay: rowStyle.display,
      rowFlexWrap: rowStyle.flexWrap,
      rowRect: rowRect.toJSON(),
      kids,
    }
  })
  console.log(width, JSON.stringify(info, null, 2))
}
await browser.close()
