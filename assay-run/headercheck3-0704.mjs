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
const buttonBox = (label) => page.evaluate((l) => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(l))
  if (!b) return null
  const r = b.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
}, label)

for (const width of [390, 412]) {
  await page.emulate({ viewport: { width, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) Mobile Safari/537.36' })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(400)
  await tapText('ENTER THE ASSAY LINE')
  await wait(400)
  await tapText('PACE: BEAD')
  await wait(150)
  // paint 8-tile trail via real taps
  const sc = await page.evaluate(() => { const c = document.querySelector('canvas'); const rr = c.parentElement.getBoundingClientRect(); return { x: rr.x, y: rr.y, w: rr.width } })
  const tile = sc.w / 32
  for (let i = 0; i < 8; i++) {
    const col = i % 4, row = Math.floor(i / 4)
    await page.touchscreen.tap(sc.x + tile/2 + col*tile, sc.y + tile/2 + row*tile)
    await wait(50)
  }
  await wait(150)
  const bpos = await buttonBox('THROW BREAKER')
  if (bpos) await page.touchscreen.tap(bpos.x, bpos.y)
  await wait(900)
  await tapText('ASSAY AGAIN')
  await wait(400)
  const info = await page.evaluate(() => {
    const safety = [...document.querySelectorAll('button')].find(b => /PLAY SAFE/i.test(b.textContent||''))
    let row = safety.parentElement
    const rowRect = row.getBoundingClientRect()
    const rowStyle = getComputedStyle(row)
    const kids = [...row.children].map(k => ({ text: k.textContent.trim().slice(0,40), rect: k.getBoundingClientRect().toJSON() }))
    return {
      rowDisplay: rowStyle.display, rowFlexWrap: rowStyle.flexWrap,
      rowRect: rowRect.toJSON(), kids,
      documentWidth: document.documentElement.clientWidth,
      overflow: { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth },
    }
  })
  console.log(width, JSON.stringify(info, null, 2))
}
await browser.close()
