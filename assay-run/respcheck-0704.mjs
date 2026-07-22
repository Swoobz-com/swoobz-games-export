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
await page.emulate({ viewport: { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) Mobile Safari/537.36' })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(400)
await tapText('ENTER THE ASSAY LINE')
await wait(400)
// Tap coin cell, measure time to visual/DOM state change (trail len text update)
const c = await page.evaluate(() => { const cc=document.querySelector('canvas'); const r=cc.parentElement.getBoundingClientRect(); const crr=cc.getBoundingClientRect(); return {x:r.x,y:r.y,canvasW:crr.width} })
const tile = c.canvasW/32
const t0 = Date.now()
await page.touchscreen.tap(c.x + tile*0.3, c.y + tile*0.3)
let elapsed = null
for (let i=0;i<20;i++) {
  const len = await page.evaluate(() => { const el=[...document.querySelectorAll('*')].find(e=>e.children.length===0 && /^\d{2,3}$/.test(e.textContent||'')); return el?el.textContent:null })
  if (len === '01') { elapsed = Date.now()-t0; break }
  await wait(10)
}
console.log('coin-tap response ms:', elapsed)

// touch-action:manipulation check on primary CTAs
const taInfo = await page.evaluate(() => {
  const labels = ['ENTER THE ASSAY LINE','THROW BREAKER','CLEAR','PLAY SAFE']
  return labels.map(l => {
    const b = [...document.querySelectorAll('button')].find(x => x.textContent && x.textContent.includes(l))
    return { label: l, found: !!b, touchAction: b ? getComputedStyle(b).touchAction : null }
  })
})
console.log('touch-action on CTAs', taInfo)
await browser.close()
