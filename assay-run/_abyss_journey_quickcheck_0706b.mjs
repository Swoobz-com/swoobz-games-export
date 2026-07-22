import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = ms => new Promise(r => setTimeout(r, ms))
const clickText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const b = [...document.querySelectorAll('button')].find(x => r.test((x.textContent || '').trim()))
  if (b) { const disabled = b.disabled; b.click(); return { found: true, disabled } } return { found: false }
}, re.source)

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'load' })
await page.evaluate(() => { try { window.localStorage.clear() } catch {} })
await page.reload({ waitUntil: 'load' })
await wait(500)
console.log('enter dive:', await clickText(page, /ENTER THE DIVE/))
await wait(400)
const geo = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width } })
const TILE = geo.w / 14
async function tapCell(col, row) { await page.mouse.click(geo.left + col * TILE + TILE / 2, geo.top + row * TILE + TILE / 2); await wait(60) }
for (const [c, r] of [[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3]]) await tapCell(c, r)
await wait(300)
console.log('run the line:', await clickText(page, /RUN THE LINE/))
await wait(1500)
const bodyText1 = await page.evaluate(() => document.body.innerText)
console.log('contains DIVE AGAIN:', /DIVE AGAIN/i.test(bodyText1))
console.log('contains SECURED/RUGGED:', /SECURED|RUGGED/i.test(bodyText1))
console.log('contains RUN THE LINE still:', /RUN THE LINE/i.test(bodyText1))
console.log('dive again click:', await clickText(page, /DIVE AGAIN|ENTER THE DIVE/))
await wait(500)
const bodyText2 = await page.evaluate(() => document.body.innerText)
console.log('after dive-again, has canvas:', await page.evaluate(() => !!document.querySelector('canvas')))
console.log('after dive-again body snippet:', bodyText2.slice(0,300))
await page.close(); await browser.close()
