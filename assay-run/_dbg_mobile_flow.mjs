import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'shots-dbg-mobile'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const clickText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const b = [...document.querySelectorAll('button, div, span')].find((x) => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
  if (b) { b.click(); return true }
  return false
}, re.source)

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 })
await page.goto(URL, { waitUntil: 'load' }); await wait(500)
await page.keyboard.press('Escape').catch(()=>{})
await page.screenshot({ path: `${OUT}/01-lobby.png` })
console.log('enter dive:', await clickText(page, /ENTER THE DIVE/)); await wait(400)
await page.screenshot({ path: `${OUT}/02-afterenter.png` })
console.log('reef:', await clickText(page, /REEF/)); await wait(300)
await page.screenshot({ path: `${OUT}/03-afterreef.png` })
// board geo + trace 8
const geo = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left:r.left, top:r.top, w:r.width, h:r.height } })
console.log('board geo:', JSON.stringify(geo))
const DIM = 14, TILE = geo.w/DIM
for (let i=0;i<8;i++){ const col=i%DIM,row=Math.floor(i/DIM); await page.mouse.click(geo.left+col*TILE+TILE/2, geo.top+row*TILE+TILE/2); await wait(20) }
await wait(200)
await page.screenshot({ path: `${OUT}/04-traced.png` })
// what CTA text is present + is it enabled?
const cta = await page.evaluate(() => {
  const els = [...document.querySelectorAll('button, div, span')]
  const run = els.find((x) => /RUN THE LINE/i.test((x.textContent||'').trim()))
  const anyRun = els.filter((x) => /RUN THE LINE/i.test((x.textContent||'').trim())).map((x)=>({tag:x.tagName, txt:(x.textContent||'').trim().slice(0,40), disabled:x.disabled, cursor:getComputedStyle(x).cursor, pe:getComputedStyle(x).pointerEvents}))
  return { present: !!run, anyRun }
})
console.log('CTA:', JSON.stringify(cta))
console.log('run click:', await clickText(page, /^RUN THE LINE/)); await wait(200)
await page.screenshot({ path: `${OUT}/05-afterrun.png` })
// poll settle
let settled = null
for (let i=0;i<100;i++){ const t = await page.evaluate(()=>document.body.innerText); if (t.includes('SECURED THE HAUL')||t.includes('RUGGED BY THE DEEP')){ settled = t.includes('SECURED THE HAUL')?'win':'bust'; break } await wait(40) }
console.log('settled:', settled)
await page.screenshot({ path: `${OUT}/06-settled.png` })
await browser.close()
