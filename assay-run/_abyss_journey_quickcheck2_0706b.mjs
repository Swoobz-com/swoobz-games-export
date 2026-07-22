import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = ms => new Promise(r => setTimeout(r, ms))
const clickText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const els = [...document.querySelectorAll('button, div, span')]
  const b = els.find(x => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
  if (b) { b.click(); return b.textContent.trim() }
  return null
}, re.source)
const findText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const els = [...document.querySelectorAll('button, div, span')]
  const b = els.find(x => r.test((x.textContent || '').trim()))
  return b ? { text: b.textContent.trim(), disabled: b.disabled === true, tag: b.tagName } : null
}, re.source)
async function boardGeo(page){ return page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width } }) }
async function trace(page, cells){ const geo = await boardGeo(page); const TILE = geo.w/14; for(const [col,row] of cells){ await page.mouse.click(geo.left+col*TILE+TILE/2, geo.top+row*TILE+TILE/2); await wait(30) } }
const line8 = [[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3]]

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'load' })
await page.evaluate(() => { try { window.localStorage.clear() } catch {} })
await page.reload({ waitUntil: 'load' })
await wait(500)
await clickText(page, /ENTER THE DIVE/); await wait(300)
console.log('select REEF:', await clickText(page, /REEF/i))
await wait(150)
await trace(page, line8); await wait(250)
console.log('run key state:', await findText(page, /RUN THE LINE/))
await clickText(page, /^RUN THE LINE/)
let settledText = null
for(let i=0;i<40 && !settledText;i++){
  await wait(120)
  const t = await page.evaluate(() => document.body.innerText)
  if(/SECURED THE HAUL/i.test(t) || /RUGGED BY THE DEEP/i.test(t)) settledText = t
}
console.log('settled:', !!settledText, settledText ? settledText.match(/SECURED THE HAUL|RUGGED BY THE DEEP/)[0] : null)
console.log('dive again click:', await clickText(page, /DIVE AGAIN/))
await wait(400)
console.log('back to canvas/planning:', await page.evaluate(() => !!document.querySelector('canvas')))
await page.close(); await browser.close()
