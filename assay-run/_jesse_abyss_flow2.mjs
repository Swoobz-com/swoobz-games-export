import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const OUT = 'shots-jesse-abyss-0706'
import { mkdirSync } from 'fs'
mkdirSync(OUT, { recursive: true })

const clickText = (page, rs) => page.evaluate((s) => {
  const r = new RegExp(s, 'i')
  const b = [...document.querySelectorAll('button, div, span')].find(x => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
  if (b) { b.click(); return true } return false
}, rs)

const readWin = (page, tag) => page.evaluate((t) => {
  let toWinBlock = ''
  for (const e of document.querySelectorAll('*')) {
    if ((e.textContent||'').trim().startsWith('TO WIN') && e.getBoundingClientRect().width < 300) { toWinBlock = e.textContent.trim().replace(/\s+/g,' '); break }
  }
  // find big teal/gold numbers near center (the TO WIN value)
  const nums = [...document.querySelectorAll('*')].filter(e=>e.children.length===0 && /^[\d.,]+x?$/.test((e.textContent||'').trim()))
    .map(e=>({txt:e.textContent.trim(), fs:getComputedStyle(e).fontSize, color:getComputedStyle(e).color, x:Math.round(e.getBoundingClientRect().x), y:Math.round(e.getBoundingClientRect().y)}))
    .filter(n=>parseFloat(n.fs)>=14 && n.y>90 && n.y<260 && n.x>560 && n.x<760)
  const cta = [...document.querySelectorAll('button')].map(b=>b.textContent.trim()).find(t=>/RUN THE LINE|SECURED|RUGGED|DIVE AGAIN|SAME LINE/i.test(t)) || ''
  return { tag:t, toWinBlock, centerNums:nums, cta }
}, tag)

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null, args: ['--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
await wait(800)
await clickText(page, 'ENTER THE DIVE'); await wait(500)

const geo = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width, h:r.height } })
const TILE = geo.w / 14
const cells = []
for (let row = 3; row <= 12; row++) { const cols = row % 2 ? [3,4,5,6,7,8,9] : [9,8,7,6,5,4,3]; for (const col of cols) cells.push([col, row]) }

let placed = 0
for (const [col, row] of cells) {
  await page.mouse.click(geo.left + col * TILE + TILE / 2, geo.top + row * TILE + TILE / 2)
  placed++
  await wait(70)
  if (placed === 3 || placed === 8 || placed === 12) {
    await wait(250)
    await page.screenshot({ path: `${OUT}/g-plot${placed}.png` })
    console.log(`${placed}POD:`, JSON.stringify(await readWin(page, placed+'pods')))
  }
}
// board crop at 12 for crispness
await page.screenshot({ path: OUT + '/g-boardcrop.png', clip: { x: Math.round(geo.left), y: Math.round(geo.top), width: Math.round(Math.min(geo.w,540)), height: Math.round(Math.min(geo.h,540)) } })

// bump bet 1 -> 25 and re-read armed TO WIN
await clickText(page, '^25$'); await wait(350)
console.log('BET25:', JSON.stringify(await readWin(page,'bet25')))
await page.screenshot({ path: OUT + '/g-bet25.png' })

// switch depth to HADAL and re-read
await clickText(page, 'HADAL'); await wait(350)
console.log('HADAL:', JSON.stringify(await readWin(page,'hadal')))
await page.screenshot({ path: OUT + '/g-hadal.png' })
// back to REEF for a likely win
await clickText(page, 'REEF'); await wait(350)
console.log('REEF:', JSON.stringify(await readWin(page,'reef')))

await clickText(page, '^RUN THE LINE'); await wait(450)
await page.screenshot({ path: OUT + '/g-reveal0.png' })
await wait(1200); await page.screenshot({ path: OUT + '/g-reveal1.png' })
await wait(2500)
console.log('SETTLE:', JSON.stringify(await readWin(page,'settle')))
const bodytxt = await page.evaluate(()=>document.body.innerText.replace(/\s+/g,' ').slice(0,400))
console.log('SETTLE-BODY:', bodytxt)
await page.screenshot({ path: OUT + '/g-settle.png' })

await browser.close()
console.log('done')
